// server/utils/grader.js
// Runs the full grading pipeline INLINE (no background worker) so it works on
// serverless platforms like Vercel. Extracted from the old worker.js.

const db = require('../db/db')
const { getFileBuffer } = require('./supabase')
const { extractText, extractStudentId } = require('./azure')
const { gradeSubmission } = require('./groq')
const { Resend } = require('resend')

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// ─── Similarity Check ─────────────────────────────────────────────────────────
function buildNgrams(text, n = 3) {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean)
  const ngrams = new Set()
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.add(words.slice(i, i + n).join(' '))
  }
  return ngrams
}

function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0
  const intersection = new Set([...setA].filter((x) => setB.has(x)))
  const union = new Set([...setA, ...setB])
  return intersection.size / union.size
}

async function runSimilarityCheck(submissionId, sessionId, cleanedText) {
  try {
    const others = await db.query(
      `SELECT id, cleaned_text FROM submissions
       WHERE session_id = $1 AND id != $2 AND cleaned_text IS NOT NULL`,
      [sessionId, submissionId]
    )

    if (others.rows.length === 0) return

    const currentNgrams = buildNgrams(cleanedText)
    let highestSimilarity = 0
    let mostSimilarId = null

    for (const other of others.rows) {
      const otherNgrams = buildNgrams(other.cleaned_text)
      const similarity = jaccardSimilarity(currentNgrams, otherNgrams)
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity
        mostSimilarId = other.id
      }
    }

    const similarityPercent = Math.round(highestSimilarity * 100)

    if (similarityPercent > 80) {
      await db.query(`UPDATE submissions SET flag_status = $1 WHERE id = $2`, [
        `plagiarism_suspected:${similarityPercent}%_match_with_${mostSimilarId}`,
        submissionId,
      ])
    } else {
      await db.query(`UPDATE submissions SET flag_status = $1 WHERE id = $2`, [null, submissionId])
    }
  } catch (err) {
    console.error('Similarity check error:', err)
  }
}

// ─── Check if session is complete ─────────────────────────────────────────────
async function checkSessionComplete(sessionId) {
  try {
    const result = await db.query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status IN ('review_required', 'completed', 'error')) as finished
       FROM submissions WHERE session_id = $1`,
      [sessionId]
    )

    const { total, finished } = result.rows[0]
    if (parseInt(total) > 0 && parseInt(finished) === parseInt(total)) {
      await db.query(`UPDATE sessions SET status = 'completed' WHERE id = $1`, [sessionId])
      return true
    }
    return false
  } catch (err) {
    console.error('Session completion check error:', err)
    return false
  }
}

// ─── Send email notification ──────────────────────────────────────────────────
async function sendCompletionEmail(sessionId) {
  if (!resend) return
  try {
    const result = await db.query(
      `SELECT s.title, s.total_marks, u.email, u.full_name as name,
              COUNT(sub.id) as total_submissions,
              AVG(COALESCE(sub.final_score, sub.ai_score)) as avg_score,
              MAX(COALESCE(sub.final_score, sub.ai_score)) as highest,
              MIN(COALESCE(sub.final_score, sub.ai_score)) as lowest,
              COUNT(sub.id) FILTER (WHERE sub.flag_status IS NOT NULL) as flagged
       FROM sessions s
       JOIN workspaces w ON s.workspace_id = w.id
       JOIN users u ON w.owner_user_id = u.id
       LEFT JOIN submissions sub ON sub.session_id = s.id
       WHERE s.id = $1
       GROUP BY s.title, s.total_marks, u.email, u.full_name`,
      [sessionId]
    )

    if (result.rows.length === 0) return
    const data = result.rows[0]
    const avgScore = data.avg_score ? Math.round(parseFloat(data.avg_score)) : 0

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: data.email,
      subject: `Session "${data.title}" grading complete`,
      html: `<div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f8fafc;">
        <h2 style="color:#0f172a">Session "${data.title}" grading complete</h2>
        <p>Total submissions: <strong>${data.total_submissions}</strong></p>
        <p>Average score: <strong>${avgScore}</strong></p>
        <p>Highest: <strong>${data.highest ?? 0}</strong> · Lowest: <strong>${data.lowest ?? 0}</strong></p>
        <p>Flagged for review: <strong>${data.flagged ?? 0}</strong></p>
      </div>`,
    })
  } catch (err) {
    console.error('Email send error:', err)
  }
}

// ─── Main grading pipeline ────────────────────────────────────────────────────
async function processGrading(submissionId, sessionId, fileUrl) {
  await db.query(`UPDATE submissions SET status = 'grading' WHERE id = $1`, [submissionId])

  try {
    const fileBuffer = await getFileBuffer(fileUrl)

    const ocrResult = await extractText(fileBuffer)
    if (!ocrResult.success) throw new Error(`OCR failed: ${JSON.stringify(ocrResult)}`)
    const text = ocrResult.text

    const cleanedText = text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,!?;:'"()-]/g, '')
      .trim()

    let studentId
    try {
      studentId = await extractStudentId(text)
    } catch (err) {
      console.error('Student ID extraction failed:', err)
      studentId = null
    }

    await db.query(
      `UPDATE submissions SET ocr_text = $1, cleaned_text = $2, student_id = $3 WHERE id = $4`,
      [text, cleanedText, studentId, submissionId]
    )

    const sessionResult = await db.query(
      `SELECT s.*, r.criteria_json, r.title as rubric_title
       FROM sessions s
       LEFT JOIN rubrics r ON r.id = s.rubric_id
       WHERE s.id = $1`,
      [sessionId]
    )
    const session = sessionResult.rows[0]
    const rubric =
      session?.rubric_text ||
      (session?.criteria_json ? JSON.stringify(session.criteria_json) : null) ||
      'Grade this answer based on accuracy, clarity, and completeness.'
    const totalMarks = session?.total_marks || 100

    const gradingResult = await gradeSubmission(cleanedText, rubric, totalMarks)

    await db.query(
      `UPDATE submissions
       SET ai_score = $1, ai_feedback = $2, final_score = $1,
           status = 'review_required', graded_at = NOW()
       WHERE id = $3`,
      [gradingResult.score, JSON.stringify(gradingResult), submissionId]
    )

    await runSimilarityCheck(submissionId, sessionId, cleanedText)

    const sessionComplete = await checkSessionComplete(sessionId)
    if (sessionComplete) await sendCompletionEmail(sessionId)

    return { success: true, submissionId, score: gradingResult.score }
  } catch (err) {
    console.error(`Grading failed for submission ${submissionId}:`, err.message)
    await db.query(`UPDATE submissions SET status = 'error', error_message = $1 WHERE id = $2`, [
      err.message || JSON.stringify(err),
      submissionId,
    ])
    throw err
  }
}

module.exports = { processGrading }
