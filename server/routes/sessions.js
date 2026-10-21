const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/auth')
const { generatePresignedUrl } = require('../utils/supabase')
const { v4: uuidv4 } = require('uuid')
const db = require('../db/db')
const { processGrading } = require('../utils/grader')
const {
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
  deleteSession
} = require('../controllers/sessionController')

// ── Static routes MUST come before /:id dynamic routes ──
router.get('/analytics', protect, getAnalytics)
router.get('/dashboard-stats', protect, getDashboardStats)

// Session CRUD
router.post('/', protect, createSession)
router.get('/', protect, getSessions)
router.get('/:id', protect, getSessionById)
router.get('/:id/analytics', protect, getSessionAnalytics)
router.post('/:id/submissions', protect, createSubmission)
router.get('/:id/report', protect, getSessionReport)
router.get('/:id/export-csv', protect, exportSessionCSV)
router.get('/:id/export-pdf', protect, exportSessionPDF)

// ── Reprocess a single submission ──────────────────────────────────────────
router.post('/:id/submissions/:subId/reprocess', protect, async (req, res) => {
  const { id, subId } = req.params
  try {
    const subRes = await db.query(
      'SELECT * FROM submissions WHERE id = $1 AND session_id = $2',
      [subId, id]
    )
    if (subRes.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found.' })
    }
    const sub = subRes.rows[0]

    // Reset AI results — preserve student_id, file_name, file_url
    await db.query(
      `UPDATE submissions
       SET status        = 'queued',
           ai_score      = NULL,
           ai_feedback   = NULL,
           final_score   = NULL,
           flag_status   = NULL,
           override_reason = NULL,
           ocr_text      = NULL,
           cleaned_text  = NULL,
           error_message = NULL,
           graded_at     = NULL
       WHERE id = $1`,
      [subId]
    )

    // Re-run grading synchronously (Vercel-native, no background worker)
    await processGrading(subId, id, sub.file_url)

    res.json({ message: 'Reprocessing started.' })
  } catch (err) {
    console.error('Reprocess error:', err.message)
    res.status(500).json({ error: 'Failed to reprocess submission.' })
  }
})

// ── Presign upload URL ─────────────────────────────────────────────────────
router.post('/:id/presign', protect, async (req, res) => {
  const { file_name, content_type } = req.body
  if (!file_name || !content_type) {
    return res.status(400).json({ error: 'file_name and content_type are required.' })
  }
  try {
    const fileKey = `${req.params.id}/${uuidv4()}-${file_name}`
    const uploadUrl = await generatePresignedUrl(fileKey, content_type)
    const fileUrl = fileKey
    res.json({ data: { upload_url: uploadUrl, file_key: fileKey, file_url: fileUrl } })
  } catch (err) {
    console.error('Presign error:', err.message)
    res.status(500).json({ error: 'Failed to generate upload URL.' })
  }
})

// ── Delete session ─────────────────────────────────────────────────────────
router.delete('/:id', protect, deleteSession)

// ── Submission routes ──────────────────────────────────────────────────────
const submissionRouter = express.Router()
submissionRouter.delete('/:id', protect, deleteSubmission)

// Override — also saves student_id if provided
submissionRouter.patch('/:id/override', protect, async (req, res) => {
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
      values.push(student_id)
    }

    values.push(req.params.id)
    const result = await db.query(
      `UPDATE submissions SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Submission not found.' })
    res.json({ data: result.rows[0] })
  } catch (err) {
    console.error('Override error:', err.message)
    res.status(500).json({ error: 'Failed to override submission.' })
  }
})

module.exports = { sessionRouter: router, submissionRouter }