const express = require('express')
const router  = express.Router()
const { v4: uuidv4 } = require('uuid')
const { protect } = require('../middleware/auth')  // ← matches your export

// ── GET /api/rubrics ──
router.get('/', protect, async (req, res) => {
  try {
    const result = await req.db.query(
      `SELECT r.*
       FROM rubrics r
       JOIN workspaces w ON r.workspace_id = w.id
       WHERE w.owner_user_id = $1
       ORDER BY r.created_at DESC`,
      [req.userId]  // ← req.userId not req.user.id
    )
    res.json({ data: result.rows })
  } catch (err) {
    console.error('GET /api/rubrics error:', err)
    res.status(500).json({ error: 'Failed to fetch rubrics' })
  }
})

// ── POST /api/rubrics ──
router.post('/', protect, async (req, res) => {
  const { title, total_marks, criteria_json } = req.body

  if (!title?.trim())         return res.status(400).json({ error: 'Title is required' })
  if (!criteria_json?.length) return res.status(400).json({ error: 'At least one criterion is required' })
  if (!total_marks || total_marks <= 0) return res.status(400).json({ error: 'Total marks must be greater than 0' })

  try {
    const ws = await req.db.query(
      'SELECT id FROM workspaces WHERE owner_user_id = $1 LIMIT 1',
      [req.userId]
    )
    if (!ws.rows.length) return res.status(400).json({ error: 'No workspace found for this user' })

    const result = await req.db.query(
      `INSERT INTO rubrics (id, workspace_id, title, criteria_json, total_marks, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [uuidv4(), ws.rows[0].id, title.trim(), JSON.stringify(criteria_json), total_marks, req.userId]
    )
    res.status(201).json({ data: result.rows[0] })
  } catch (err) {
    console.error('POST /api/rubrics error:', err)
    res.status(500).json({ error: 'Failed to create rubric' })
  }
})

// ── PUT /api/rubrics/:id ──
router.put('/:id', protect, async (req, res) => {
  const { title, total_marks, criteria_json } = req.body

  if (!title?.trim())         return res.status(400).json({ error: 'Title is required' })
  if (!criteria_json?.length) return res.status(400).json({ error: 'At least one criterion is required' })

  try {
    const check = await req.db.query(
      `SELECT r.id FROM rubrics r
       JOIN workspaces w ON r.workspace_id = w.id
       WHERE r.id = $1 AND w.owner_user_id = $2`,
      [req.params.id, req.userId]
    )
    if (!check.rows.length) return res.status(404).json({ error: 'Rubric not found' })

    const result = await req.db.query(
      `UPDATE rubrics
       SET title = $1, criteria_json = $2, total_marks = $3
       WHERE id = $4
       RETURNING *`,
      [title.trim(), JSON.stringify(criteria_json), total_marks, req.params.id]
    )
    res.json({ data: result.rows[0] })
  } catch (err) {
    console.error('PUT /api/rubrics/:id error:', err)
    res.status(500).json({ error: 'Failed to update rubric' })
  }
})

// ── DELETE /api/rubrics/:id ──
router.delete('/:id', protect, async (req, res) => {
  try {
    const check = await req.db.query(
      `SELECT r.id FROM rubrics r
       JOIN workspaces w ON r.workspace_id = w.id
       WHERE r.id = $1 AND w.owner_user_id = $2`,
      [req.params.id, req.userId]
    )
    if (!check.rows.length) return res.status(404).json({ error: 'Rubric not found' })

    await req.db.query('DELETE FROM rubrics WHERE id = $1', [req.params.id])
    res.json({ message: 'Rubric deleted successfully' })
  } catch (err) {
    console.error('DELETE /api/rubrics/:id error:', err)
    res.status(500).json({ error: 'Failed to delete rubric' })
  }
})

module.exports = router