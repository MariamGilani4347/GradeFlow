// v2 — student_id fix loaded
console.log("sessionController v2 loaded — student_id fix active")
const db = require('../db/db')
const { processGrading } = require('../utils/grader')

// ── Helper: get best student label ────────────────────────────────────────────
const getStudentLabel = (row, index) => {
  if (row.student_id && row.student_id.trim()) return row.student_id.trim()
  if (row.file_name) return row.file_name.replace(/\.[^/.]+$/, '') // strip extension
  return `Submission ${index + 1}`
}

// POST /sessions
const createSession = async (req, res) => {
  const { title, rubric_text, total_marks } = req.body
  if (!title) return res.status(400).json({ error: 'Title is required.' })
  try {
    const workspaceResult = await db.query(
      'SELECT id FROM workspaces WHERE owner_user_id = $1 LIMIT 1',
      [req.userId]
    )
    if (workspaceResult.rows.length === 0)
      return res.status(404).json({ error: 'Workspace not found.' })

    const workspace_id = workspaceResult.rows[0].id
    const result = await db.query(
      `INSERT INTO sessions (workspace_id, created_by, title, status, rubric_text, total_marks)
       VALUES ($1, $2, $3, 'draft', $4, $5) RETURNING *`,
      [workspace_id, req.userId, title, rubric_text || null, total_marks || 100]
    )
    res.status(201).json({ data: result.rows[0] })
  } catch (err) {
    console.error('Create session error:', err.message)
    res.status(500).json({ error: 'Failed to create session.' })
  }
}

// GET /sessions
const getSessions = async (req, res) => {
  try {
    const workspaceResult = await db.query(
      'SELECT id FROM workspaces WHERE owner_user_id = $1 LIMIT 1',
      [req.userId]
    )
    if (workspaceResult.rows.length === 0)
      return res.status(404).json({ error: 'Workspace not found.' })

    const workspace_id = workspaceResult.rows[0].id
    const result = await db.query(
      `SELECT s.*, COUNT(sub.id) as submission_count
       FROM sessions s
       LEFT JOIN submissions sub ON sub.session_id = s.id
       WHERE s.workspace_id = $1
       GROUP BY s.id
       ORDER BY s.created_at DESC`,
      [workspace_id]
    )
    res.json({ data: result.rows })
  } catch (err) {
    console.error('Get sessions error:', err.message)
    res.status(500).json({ error: 'Failed to fetch sessions.' })
  }
}

// GET /sessions/:id
const getSessionById = async (req, res) => {
  try {
    const sessionResult = await db.query(
      'SELECT * FROM sessions WHERE id = $1 AND created_by = $2',
      [req.params.id, req.userId]
    )
    if (sessionResult.rows.length === 0)
      return res.status(404).json({ error: 'Session not found.' })

    const submissions = await db.query(
      'SELECT * FROM submissions WHERE session_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    )
    res.json({ data: { session: sessionResult.rows[0], submissions: submissions.rows } })
  } catch (err) {
    console.error('Get session error:', err.message)
    res.status(500).json({ error: 'Failed to fetch session.' })
  }
}

// POST /sessions/:id/submissions
const createSubmission = async (req, res) => {
  const { file_url, file_key, file_name } = req.body
  if (!file_url || !file_name)
    return res.status(400).json({ error: 'file_url and file_name are required.' })

  try {
    const sessionResult = await db.query(
      'SELECT * FROM sessions WHERE id = $1 AND created_by = $2',
      [req.params.id, req.userId]
    )
    if (sessionResult.rows.length === 0)
      return res.status(404).json({ error: 'Session not found.' })

    const result = await db.query(
      `INSERT INTO submissions (session_id, file_url, file_name, status)
       VALUES ($1, $2, $3, 'queued') RETURNING *`,
      [req.params.id, file_url, file_name]
    )
    const submission = result.rows[0]
    await processGrading(submission.id, req.params.id, submission.file_url)
    const updated = await db.query('SELECT * FROM submissions WHERE id = $1', [submission.id])
    res.status(201).json({ data: updated.rows[0] })
  } catch (err) {
    console.error('Create submission error:', err.message)
    res.status(500).json({ error: 'Failed to create submission.' })
  }
}

// DELETE /submissions/:id
const deleteSubmission = async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM submissions WHERE id = $1 RETURNING *`,
      [req.params.id]
    )
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Submission not found.' })
    res.json({ message: 'Submission deleted successfully.' })
  } catch (err) {
    console.error('Delete submission error:', err.message)
    res.status(500).json({ error: 'Failed to delete submission.' })
  }
}

// PATCH /submissions/:id/override — now also saves student_id
const overrideSubmission = async (req, res) => {
  const { final_score, override_reason, student_id } = req.body
  try {
    const fields = [
      `final_score = $1`,
      `override_reason = $2`,
      `status = 'completed'`,
    ]
    const values = [final_score, override_reason]

    if (student_id !== undefined) {
      fields.push(`student_id = $${values.length + 1}`)
      values.push(student_id.trim() || null)
    }

    values.push(req.params.id)
    const result = await db.query(
      `UPDATE submissions SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    )
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Submission not found.' })
    res.json({ data: result.rows[0] })
  } catch (err) {
    console.error('Override error:', err.message)
    res.status(500).json({ error: 'Failed to override submission.' })
  }
}

// GET /sessions/:id/report
const getSessionReport = async (req, res) => {
  try {
    const session = await db.query(`SELECT * FROM sessions WHERE id = $1`, [req.params.id])
    const submissions = await db.query(
      `SELECT * FROM submissions WHERE session_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    )
    const rows = submissions.rows
    const scores = rows
      .map(s => s.final_score ?? s.ai_score)
      .filter(s => s !== null && s !== undefined && !isNaN(s))
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    const highest = scores.length ? Math.max(...scores) : 0
    const lowest  = scores.length ? Math.min(...scores) : 0
    const graded  = rows.filter(s => s.status === 'completed' || s.status === 'review_required').length
    res.json({ session: session.rows[0], submissions: rows, summary: { total: rows.length, graded, avg, highest, lowest } })
  } catch (err) {
    console.error('Report error:', err.message)
    res.status(500).json({ error: 'Failed to fetch report.' })
  }
}

// GET /sessions/:id/export-csv — uses student_id > file_name > fallback
const exportSessionCSV = async (req, res) => {
  try {
    const sessionRes = await db.query(`SELECT * FROM sessions WHERE id = $1`, [req.params.id])
    const session = sessionRes.rows[0]

    const result = await db.query(
      `SELECT student_id, file_name,
              COALESCE(final_score, ai_score) as score,
              ai_feedback, status, created_at, override_reason
       FROM submissions
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [req.params.id]
    )

    const rows = result.rows
    const header = 'Student ID,Score,Status,Feedback,Strengths,Improvements,Override Reason,Submitted At\n'

    const csv = rows.map((r, i) => {
      const studentId = getStudentLabel(r, i)
      let feedback = '', strengths = '', improvements = ''
      try {
        const fb = typeof r.ai_feedback === 'string' ? JSON.parse(r.ai_feedback) : r.ai_feedback
        feedback     = (fb?.feedback     || '').replace(/"/g, '""')
        strengths    = (fb?.strengths    || '').replace(/"/g, '""')
        improvements = (fb?.improvements || '').replace(/"/g, '""')
      } catch {}
      return `"${studentId.replace(/"/g, '""')}",${r.score ?? ''},` +
        `"${r.status}","${feedback}","${strengths}","${improvements}",` +
        `"${(r.override_reason || '').replace(/"/g, '""')}","${new Date(r.created_at).toLocaleString()}"`
    }).join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${session?.title || 'session'}-report.csv"`)
    res.send(header + csv)
  } catch (err) {
    console.error('CSV Export error:', err.message)
    res.status(500).json({ error: 'Failed to export CSV.' })
  }
}

// GET /sessions/:id/export-pdf — uses student_id > file_name > fallback
const exportSessionPDF = async (req, res) => {
  try {
    const sessionRes = await db.query(`SELECT * FROM sessions WHERE id = $1`, [req.params.id])
    const session = sessionRes.rows[0]
    if (!session) return res.status(404).json({ error: 'Session not found.' })

    const subsRes = await db.query(
      `SELECT * FROM submissions WHERE session_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    )
    const submissions = subsRes.rows

    // ── FIX: filter out null/NaN scores so average is correct ──
    const scores = submissions
      .map(s => s.final_score ?? s.ai_score)
      .filter(s => s !== null && s !== undefined && !isNaN(Number(s)))
      .map(Number)

    const avg     = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 'N/A'
    const highest = scores.length ? Math.max(...scores) : 'N/A'
    const lowest  = scores.length ? Math.min(...scores) : 'N/A'
    const total   = session.total_marks || 100

    const tableRows = submissions.map((s, i) => {
      // ── FIX: use getStudentLabel so OCR student_id shows, not file_name ──
      const studentId = getStudentLabel(s, i)
      let feedback = ''
      try {
        const fb = typeof s.ai_feedback === 'string' ? JSON.parse(s.ai_feedback) : s.ai_feedback
        feedback = fb?.feedback || ''
      } catch {}
      const score = s.final_score ?? s.ai_score
      const pct   = score !== null && score !== undefined ? Math.round((Number(score) / total) * 100) : null
      const color = pct === null ? '#94a3b8' : pct >= 70 ? '#16a34a' : pct >= 40 ? '#f59e0b' : '#ef4444'
      return `
        <tr>
          <td>${i + 1}</td>
          <td>
            <strong>${studentId}</strong>
            ${s.override_reason ? '<br><small style="color:#8b5cf6">Override applied</small>' : ''}
          </td>
          <td style="color:${color}; font-weight:700">${score !== null && score !== undefined ? `${score}/${total}` : '—'}</td>
          <td><span class="badge ${s.status === 'completed' || s.status === 'review_required' ? 'green' : 'yellow'}">${s.status?.replace('_', ' ') || '—'}</span></td>
          <td>${s.flag_status ? '<span class="badge red">⚠ Flagged</span>' : '<span class="badge green">Clean</span>'}</td>
          <td class="feedback">${feedback.slice(0, 120)}${feedback.length > 120 ? '...' : ''}</td>
        </tr>`
    }).join('')

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; background: #fff; color: #0f172a; padding: 40px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #f1f5f9; }
        .logo { font-size: 13px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
        .title { font-size: 26px; font-weight: 800; color: #0f172a; margin: 6px 0 4px; }
        .subtitle { font-size: 13px; color: #94a3b8; }
        .date { font-size: 12px; color: #94a3b8; text-align: right; }
        .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
        .card { background: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #f1f5f9; }
        .card-value { font-size: 28px; font-weight: 800; margin-bottom: 4px; }
        .card-label { font-size: 12px; color: #64748b; }
        .avg { color: #6366f1; } .high { color: #16a34a; } .low { color: #ef4444; } .tot { color: #0ea5e9; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #0f172a; color: #fff; padding: 12px 14px; text-align: left; font-size: 12px; font-weight: 600; }
        td { padding: 11px 14px; font-size: 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
        tr:nth-child(even) td { background: #f8fafc; }
        .badge { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
        .badge.green { background: #dcfce7; color: #16a34a; }
        .badge.yellow { background: #fef9c3; color: #f59e0b; }
        .badge.red { background: #fee2e2; color: #ef4444; }
        .feedback { color: #475569; max-width: 200px; line-height: 1.5; }
        .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #cbd5e1; padding-top: 16px; border-top: 1px solid #f1f5f9; }
        .section-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">GradeFlow · Session Report</div>
          <div class="title">${session.title}</div>
          <div class="subtitle">Total Marks: ${total} · ${submissions.length} Submissions</div>
        </div>
        <div class="date">Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>
      <div class="cards">
        <div class="card"><div class="card-value avg">${avg === 'N/A' ? 'N/A' : `${avg}/${total}`}</div><div class="card-label">Class Average</div></div>
        <div class="card"><div class="card-value high">${highest === 'N/A' ? 'N/A' : `${highest}/${total}`}</div><div class="card-label">Highest Score</div></div>
        <div class="card"><div class="card-value low">${lowest === 'N/A' ? 'N/A' : `${lowest}/${total}`}</div><div class="card-label">Lowest Score</div></div>
        <div class="card"><div class="card-value tot">${submissions.length}</div><div class="card-label">Total Submissions</div></div>
      </div>
      <div class="section-title">Submissions Breakdown</div>
      <table>
        <thead>
          <tr>
            <th>#</th><th>Student ID</th><th>Score</th><th>Status</th><th>Plagiarism</th><th>AI Feedback</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
      <div class="footer">GradeFlow · Automated Grading Platform · Confidential</div>
    </body>
    </html>`

    // Launch Chromium — use @sparticuz/chromium on Vercel, local puppeteer in dev
    const isServerless = process.env.NODE_ENV === 'production' || process.env.VERCEL
    let browser
    if (isServerless) {
      const chromium = require('@sparticuz/chromium')
      const puppeteerCore = require('puppeteer-core')
      browser = await puppeteerCore.launch({
        args: [...chromium.args, '--no-sandbox'],
        executablePath: await chromium.executablePath(),
        headless: true,
      })
    } else {
      const puppeteer = require('puppeteer')
      browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
    }

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
      printBackground: true
    })
    await browser.close()

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${session.title}-report.pdf"`)
    res.send(pdfBuffer)
  } catch (err) {
    console.error('PDF export error:', err.message)
    res.status(500).json({ error: 'Failed to generate PDF.' })
  }
}

// GET /sessions/dashboard-stats
const getDashboardStats = async (req, res) => {
  try {
    const workspaceResult = await db.query(
      'SELECT id FROM workspaces WHERE owner_user_id = $1 LIMIT 1',
      [req.userId]
    )
    const workspace_id = workspaceResult.rows[0]?.id
    if (!workspace_id) return res.json({ data: { sessions: 0, submissions: 0, graded: 0, avgScore: 0 } })

    const [sessionsRes, submissionsRes, gradedRes, avgRes] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM sessions WHERE workspace_id = $1`, [workspace_id]),
      db.query(`SELECT COUNT(*) FROM submissions s JOIN sessions se ON s.session_id = se.id WHERE se.workspace_id = $1`, [workspace_id]),
      db.query(`SELECT COUNT(*) FROM submissions s JOIN sessions se ON s.session_id = se.id WHERE se.workspace_id = $1 AND s.status IN ('completed','review_required')`, [workspace_id]),
      db.query(`SELECT AVG(COALESCE(s.final_score, s.ai_score)) as avg FROM submissions s JOIN sessions se ON s.session_id = se.id WHERE se.workspace_id = $1 AND s.ai_score IS NOT NULL`, [workspace_id]),
    ])

    res.json({
      data: {
        sessions:    parseInt(sessionsRes.rows[0].count),
        submissions: parseInt(submissionsRes.rows[0].count),
        graded:      parseInt(gradedRes.rows[0].count),
        avgScore:    Math.round(parseFloat(avgRes.rows[0].avg) || 0),
      }
    })
  } catch (err) {
    console.error('Dashboard stats error:', err.message)
    res.status(500).json({ error: 'Failed to fetch stats.' })
  }
}

// GET /sessions/analytics
const getAnalytics = async (req, res) => {
  try {
    const workspaceResult = await db.query(
      'SELECT id FROM workspaces WHERE owner_user_id = $1 LIMIT 1',
      [req.userId]
    )
    const workspace_id = workspaceResult.rows[0]?.id
    if (!workspace_id) return res.json({ data: {} })

    const [sessionsOverTime, scoreDistribution, statusBreakdown, avgPerSession] = await Promise.all([
      db.query(
        `SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as count
         FROM sessions WHERE workspace_id = $1
         GROUP BY DATE_TRUNC('day', created_at) ORDER BY date ASC LIMIT 30`,
        [workspace_id]
      ),
      db.query(
        `SELECT
           SUM(CASE WHEN COALESCE(s.final_score, s.ai_score) >= 80 THEN 1 ELSE 0 END) as excellent,
           SUM(CASE WHEN COALESCE(s.final_score, s.ai_score) >= 60 AND COALESCE(s.final_score, s.ai_score) < 80 THEN 1 ELSE 0 END) as good,
           SUM(CASE WHEN COALESCE(s.final_score, s.ai_score) >= 40 AND COALESCE(s.final_score, s.ai_score) < 60 THEN 1 ELSE 0 END) as average,
           SUM(CASE WHEN COALESCE(s.final_score, s.ai_score) < 40 AND COALESCE(s.final_score, s.ai_score) IS NOT NULL THEN 1 ELSE 0 END) as poor
         FROM submissions s JOIN sessions se ON s.session_id = se.id WHERE se.workspace_id = $1`,
        [workspace_id]
      ),
      db.query(
        `SELECT sub.status, COUNT(*) as count FROM submissions sub
         JOIN sessions se ON sub.session_id = se.id
         WHERE se.workspace_id = $1 GROUP BY sub.status`,
        [workspace_id]
      ),
      db.query(
        `SELECT se.title, ROUND(AVG(COALESCE(s.final_score, s.ai_score))) as avg_score, COUNT(s.id) as total
         FROM sessions se LEFT JOIN submissions s ON s.session_id = se.id
         WHERE se.workspace_id = $1 AND s.ai_score IS NOT NULL
         GROUP BY se.id, se.title ORDER BY se.created_at DESC LIMIT 6`,
        [workspace_id]
      ),
    ])

    res.json({
      data: {
        sessionsOverTime:  sessionsOverTime.rows,
        scoreDistribution: scoreDistribution.rows[0],
        statusBreakdown:   statusBreakdown.rows,
        avgPerSession:     avgPerSession.rows.reverse(),
      }
    })
  } catch (err) {
    console.error('Analytics error:', err.message)
    res.status(500).json({ error: 'Failed to fetch analytics.' })
  }
}

// GET /sessions/:id/analytics
const getSessionAnalytics = async (req, res) => {
  const { id } = req.params
  try {
    const marksRes = await db.query(`SELECT total_marks FROM sessions WHERE id = $1`, [id])
    const marks = marksRes.rows[0]?.total_marks || 100

    const [statsRes, rangesRes, bandsRes] = await Promise.all([
      db.query(
        `SELECT
           COUNT(*) as total,
           ROUND(AVG(COALESCE(final_score, ai_score))) as avg_score,
           MAX(COALESCE(final_score, ai_score)) as highest,
           MIN(COALESCE(final_score, ai_score)) as lowest,
           COUNT(CASE WHEN flag_status IS NOT NULL THEN 1 END) as flagged,
           COUNT(CASE WHEN override_reason IS NOT NULL THEN 1 END) as overridden,
           COUNT(CASE WHEN (COALESCE(final_score, ai_score)::float / $2) >= 0.5 THEN 1 END) as passed,
           COUNT(CASE WHEN (COALESCE(final_score, ai_score)::float / $2) < 0.5 THEN 1 END) as failed
         FROM submissions WHERE session_id = $1 AND ai_score IS NOT NULL`,
        [id, marks]
      ),
      db.query(
        `SELECT
           COUNT(CASE WHEN (COALESCE(final_score, ai_score)::float / $2) * 100 BETWEEN 0  AND 20  THEN 1 END) as "0-20",
           COUNT(CASE WHEN (COALESCE(final_score, ai_score)::float / $2) * 100 BETWEEN 21 AND 40  THEN 1 END) as "21-40",
           COUNT(CASE WHEN (COALESCE(final_score, ai_score)::float / $2) * 100 BETWEEN 41 AND 60  THEN 1 END) as "41-60",
           COUNT(CASE WHEN (COALESCE(final_score, ai_score)::float / $2) * 100 BETWEEN 61 AND 80  THEN 1 END) as "61-80",
           COUNT(CASE WHEN (COALESCE(final_score, ai_score)::float / $2) * 100 BETWEEN 81 AND 100 THEN 1 END) as "81-100"
         FROM submissions WHERE session_id = $1 AND ai_score IS NOT NULL`,
        [id, marks]
      ),
      db.query(
        `SELECT
           COUNT(CASE WHEN (COALESCE(final_score, ai_score)::float / $2) * 100 >= 80              THEN 1 END) as "A",
           COUNT(CASE WHEN (COALESCE(final_score, ai_score)::float / $2) * 100 BETWEEN 60 AND 79.99 THEN 1 END) as "B",
           COUNT(CASE WHEN (COALESCE(final_score, ai_score)::float / $2) * 100 BETWEEN 40 AND 59.99 THEN 1 END) as "C",
           COUNT(CASE WHEN (COALESCE(final_score, ai_score)::float / $2) * 100 BETWEEN 20 AND 39.99 THEN 1 END) as "D",
           COUNT(CASE WHEN (COALESCE(final_score, ai_score)::float / $2) * 100 < 20               THEN 1 END) as "F"
         FROM submissions WHERE session_id = $1 AND ai_score IS NOT NULL`,
        [id, marks]
      ),
    ])

    const stats = statsRes.rows[0]
    res.json({
      data: {
        totalSubmissions: parseInt(stats.total)      || 0,
        avgScore:         parseInt(stats.avg_score)  || 0,
        highest:          parseInt(stats.highest)    || 0,
        lowest:           parseInt(stats.lowest)     || 0,
        flagged:          parseInt(stats.flagged)    || 0,
        overridden:       parseInt(stats.overridden) || 0,
        passed:           parseInt(stats.passed)     || 0,
        failed:           parseInt(stats.failed)     || 0,
        scoreRanges: {
          '0-20':   parseInt(rangesRes.rows[0]['0-20'])   || 0,
          '21-40':  parseInt(rangesRes.rows[0]['21-40'])  || 0,
          '41-60':  parseInt(rangesRes.rows[0]['41-60'])  || 0,
          '61-80':  parseInt(rangesRes.rows[0]['61-80'])  || 0,
          '81-100': parseInt(rangesRes.rows[0]['81-100']) || 0,
        },
        gradeBands: {
          A: parseInt(bandsRes.rows[0]['A']) || 0,
          B: parseInt(bandsRes.rows[0]['B']) || 0,
          C: parseInt(bandsRes.rows[0]['C']) || 0,
          D: parseInt(bandsRes.rows[0]['D']) || 0,
          F: parseInt(bandsRes.rows[0]['F']) || 0,
        }
      }
    })
  } catch (err) {
    console.error('Session analytics error:', err.message)
    res.status(500).json({ error: 'Failed to fetch session analytics.' })
  }
}

// DELETE /sessions/:id
const deleteSession = async (req, res) => {
  try {
    await db.query('DELETE FROM submissions WHERE session_id = $1', [req.params.id])
    const result = await db.query(
      'DELETE FROM sessions WHERE id = $1 AND created_by = $2 RETURNING *',
      [req.params.id, req.userId]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Session not found.' })
    res.json({ message: 'Session deleted successfully.' })
  } catch (err) {
    console.error('Delete session error:', err.message)
    res.status(500).json({ error: 'Failed to delete session.' })
  }
}

module.exports = {
  createSession,
  getSessions,
  getSessionById,
  createSubmission,
  deleteSubmission,
  overrideSubmission,
  getSessionReport,
  exportSessionCSV,
  exportSessionPDF,
  getDashboardStats,
  getAnalytics,
  getSessionAnalytics,
  deleteSession,
}