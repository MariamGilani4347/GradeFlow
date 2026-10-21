// server/routes/admin.js
const db = require('../db/db')
const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const {
  getAdminStats, getUsers, getAllSessions, deleteUser, updateUserPlan
} = require('../controllers/adminController')
const { processGrading } = require('../utils/grader')

const verifyAdmin = (req, res, next) => {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ message: 'No token provided' })
  const token = auth.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.ADMIN_SECRET || 'supersecretadminjwt')
    req.admin = decoded
    next()
  } catch {
    return res.status(403).json({ message: 'Invalid or expired token' })
  }
}

router.use((req, res, next) => {
  console.log(`ADMIN ROUTE HIT: ${req.method} ${req.path}`)
  next()
})

router.post('/login', (req, res) => {
  const { username, password } = req.body
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'
  const ADMIN_SECRET   = process.env.ADMIN_SECRET   || 'supersecretadminjwt'
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD)
    return res.status(401).json({ message: 'Invalid admin credentials' })
  const token = jwt.sign({ username, role: 'admin' }, ADMIN_SECRET, { expiresIn: '8h' })
  return res.json({ token, message: 'Login successful' })
})

// ── Stats & Users ──────────────────────────────────────────────────────────
router.get('/stats', verifyAdmin, getAdminStats)
router.get('/users', verifyAdmin, getUsers)
router.put('/users/:id/plan', verifyAdmin, updateUserPlan)

router.get('/users/:userId/sessions', verifyAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, u.full_name AS teacher_name, u.email AS teacher_email,
              COUNT(sub.id) AS submission_count
       FROM sessions s
       JOIN workspaces w ON s.workspace_id = w.id
       JOIN users u ON w.owner_user_id = u.id
       LEFT JOIN submissions sub ON sub.session_id = s.id
       WHERE w.owner_user_id = $1
       GROUP BY s.id, u.full_name, u.email
       ORDER BY s.created_at DESC`,
      [req.params.userId]
    )
    res.json({ data: result.rows })
  } catch (err) {
    console.error('Get user sessions error:', err.message)
    res.status(500).json({ error: 'Failed to fetch user sessions.' })
  }
})

// Delete user — cascade: submissions → sessions → workspaces → user
router.delete('/users/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params
  try {
    await db.query(`
      DELETE FROM submissions
      WHERE session_id IN (
        SELECT s.id FROM sessions s
        JOIN workspaces w ON s.workspace_id = w.id
        WHERE w.owner_user_id = $1
      )`, [id])
    await db.query(`
      DELETE FROM sessions
      WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_user_id = $1)`, [id])
    await db.query(`DELETE FROM workspaces WHERE owner_user_id = $1`, [id])
    const result = await db.query(`DELETE FROM users WHERE id = $1 RETURNING id`, [id])
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found.' })
    res.json({ message: 'User and all their data deleted successfully.' })
  } catch (err) {
    console.error('Delete user error:', err.message)
    res.status(500).json({ error: `Failed to delete user: ${err.message}` })
  }
})

// ── Sessions ───────────────────────────────────────────────────────────────
router.get('/sessions', verifyAdmin, getAllSessions)

router.get('/sessions/:sessionId', verifyAdmin, async (req, res) => {
  try {
    const sessionRes = await db.query(
      `SELECT s.*, u.full_name AS teacher_name, u.email AS teacher_email
       FROM sessions s
       JOIN workspaces w ON s.workspace_id = w.id
       JOIN users u ON w.owner_user_id = u.id
       WHERE s.id = $1`, [req.params.sessionId]
    )
    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Session not found.' })
    const subsRes = await db.query(
      `SELECT * FROM submissions WHERE session_id = $1 ORDER BY created_at DESC`,
      [req.params.sessionId]
    )
    res.json({ data: { session: sessionRes.rows[0], submissions: subsRes.rows } })
  } catch (err) {
    console.error('Get session detail error:', err.message)
    res.status(500).json({ error: 'Failed to fetch session.' })
  }
})

// Reprocess ALL submissions in a session — reset DB + grade each inline (Vercel-native)
router.post('/sessions/:sessionId/reprocess', verifyAdmin, async (req, res) => {
  const { sessionId } = req.params
  try {
    const subsRes = await db.query(
      `SELECT id, file_url FROM submissions WHERE session_id = $1`, [sessionId]
    )
    if (subsRes.rows.length === 0)
      return res.status(404).json({ error: 'No submissions found for this session.' })

    await db.query(
      `UPDATE submissions
       SET status = 'queued',
           ai_score = NULL, ai_feedback = NULL, final_score = NULL,
           flag_status = NULL, override_reason = NULL,
           ocr_text = NULL, cleaned_text = NULL,
           error_message = NULL, graded_at = NULL
       WHERE session_id = $1`, [sessionId]
    )
    await db.query(`UPDATE sessions SET status = 'grading' WHERE id = $1`, [sessionId])

    let processed = 0
    for (const sub of subsRes.rows) {
      try {
        await processGrading(sub.id, sessionId, sub.file_url)
        processed++
      } catch (gErr) {
        console.error(`Failed to grade submission ${sub.id}:`, gErr.message)
      }
    }

    res.json({ message: `Reprocessed ${processed} of ${subsRes.rows.length} submissions.`, count: processed })
  } catch (err) {
    console.error('Session reprocess error:', err.message)
    res.status(500).json({ error: `Failed to reprocess session: ${err.message}` })
  }
})

// Delete session — cascade: submissions → session
router.delete('/sessions/:sessionId', verifyAdmin, async (req, res) => {
  const { sessionId } = req.params
  try {
    await db.query(`DELETE FROM submissions WHERE session_id = $1`, [sessionId])
    const result = await db.query(`DELETE FROM sessions WHERE id = $1 RETURNING id`, [sessionId])
    if (result.rowCount === 0) return res.status(404).json({ error: 'Session not found.' })
    res.json({ message: 'Session and all submissions deleted.' })
  } catch (err) {
    console.error('Delete session error:', err.message)
    res.status(500).json({ error: `Failed to delete session: ${err.message}` })
  }
})

// ── Submissions ────────────────────────────────────────────────────────────

// Reprocess single submission — reset DB + re-queue job
router.post('/submissions/:submissionId/reprocess', verifyAdmin, async (req, res) => {
  const { submissionId } = req.params
  try {
    const subRes = await db.query(
      `SELECT id, session_id, file_url FROM submissions WHERE id = $1`, [submissionId]
    )
    if (subRes.rows.length === 0) return res.status(404).json({ error: 'Submission not found.' })
    const sub = subRes.rows[0]

    // Reset — preserve student_id, file_name, file_url
    await db.query(
      `UPDATE submissions
       SET status = 'queued',
           ai_score = NULL, ai_feedback = NULL, final_score = NULL,
           flag_status = NULL, override_reason = NULL,
           ocr_text = NULL, cleaned_text = NULL,
           error_message = NULL, graded_at = NULL
       WHERE id = $1`, [submissionId]
    )

    await processGrading(sub.id, sub.session_id, sub.file_url)
    res.json({ message: 'Submission reprocessed.' })
  } catch (err) {
    console.error('Submission reprocess error:', err.message)
    res.status(500).json({ error: `Failed to reprocess submission: ${err.message}` })
  }
})

// Delete single submission
router.delete('/submissions/:submissionId', verifyAdmin, async (req, res) => {
  const { submissionId } = req.params
  try {
    const result = await db.query(
      `DELETE FROM submissions WHERE id = $1 RETURNING id`, [submissionId]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Submission not found.' })
    res.json({ message: 'Submission deleted.' })
  } catch (err) {
    console.error('Delete submission error:', err.message)
    res.status(500).json({ error: `Failed to delete submission: ${err.message}` })
  }
})

// ── Grading status (replaces old BullMQ queue monitoring) ──────────────────────
router.get('/queue/stats', verifyAdmin, async (req, res) => {
  try {
    const result = await db.query(`SELECT status, COUNT(*) as count FROM submissions GROUP BY status`)
    const stats = { queued: 0, grading: 0, review_required: 0, completed: 0, error: 0 }
    for (const row of result.rows) stats[row.status] = parseInt(row.count)
    res.json({ data: stats })
  } catch (err) {
    console.error('Queue stats error:', err.message)
    res.status(500).json({ error: 'Failed to fetch grading stats.' })
  }
})

router.get('/queue/failed', verifyAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, session_id, file_url, error_message, created_at
       FROM submissions WHERE status = 'error' ORDER BY created_at DESC LIMIT 50`
    )
    res.json({ data: result.rows })
  } catch (err) {
    console.error('Failed submissions error:', err.message)
    res.status(500).json({ error: 'Failed to fetch failed submissions.' })
  }
})

router.post('/queue/failed/retry-all', verifyAdmin, async (req, res) => {
  try {
    const result = await db.query(`SELECT id, session_id, file_url FROM submissions WHERE status = 'error'`)
    let retried = 0
    for (const sub of result.rows) {
      try {
        await processGrading(sub.id, sub.session_id, sub.file_url)
        retried++
      } catch (gErr) {
        console.error(`Retry failed for ${sub.id}:`, gErr.message)
      }
    }
    res.json({ message: `${retried} submission(s) reprocessed.` })
  } catch (err) {
    console.error('Retry all error:', err.message)
    res.status(500).json({ error: 'Failed to retry submissions.' })
  }
})

router.post('/queue/failed/:jobId/retry', verifyAdmin, async (req, res) => {
  try {
    const sub = await db.query(`SELECT id, session_id, file_url FROM submissions WHERE id = $1`, [req.params.jobId])
    if (sub.rows.length === 0) return res.status(404).json({ error: 'Submission not found.' })
    await processGrading(sub.rows[0].id, sub.rows[0].session_id, sub.rows[0].file_url)
    res.json({ message: `Submission ${req.params.jobId} reprocessed.` })
  } catch (err) {
    console.error('Retry submission error:', err.message)
    res.status(500).json({ error: 'Failed to retry submission.' })
  }
})

router.delete('/queue/failed', verifyAdmin, async (req, res) => {
  try {
    await db.query(`UPDATE submissions SET status = 'queued', error_message = NULL WHERE status = 'error'`)
    res.json({ message: 'All failed submissions cleared.' })
  } catch (err) {
    console.error('Clear error error:', err.message)
    res.status(500).json({ error: 'Failed to clear failed submissions.' })
  }
})

router.delete('/queue/failed/:jobId', verifyAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE submissions SET status = 'queued', error_message = NULL WHERE id = $1 RETURNING id`,
      [req.params.jobId]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Submission not found.' })
    res.json({ message: `Submission ${req.params.jobId} reset to queued.` })
  } catch (err) {
    console.error('Reset submission error:', err.message)
    res.status(500).json({ error: 'Failed to reset submission.' })
  }
})

module.exports = router