const db = require('../db/db')

const getAdminStats = async (req, res) => {
  try {
    const [usersRes, sessionsRes, submissionsRes, gradedRes, avgRes, flaggedRes] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM users`),
      db.query(`SELECT COUNT(*) FROM sessions`),
      db.query(`SELECT COUNT(*) FROM submissions`),
      db.query(`SELECT COUNT(*) FROM submissions WHERE status IN ('completed', 'review_required')`),
      db.query(`SELECT AVG(COALESCE(final_score, ai_score)) as avg FROM submissions WHERE ai_score IS NOT NULL`),
      db.query(`SELECT COUNT(*) FROM submissions WHERE flag_status IS NOT NULL`),
    ])
    res.json({
      data: {
        totalUsers:       parseInt(usersRes.rows[0].count),
        totalSessions:    parseInt(sessionsRes.rows[0].count),
        totalSubmissions: parseInt(submissionsRes.rows[0].count),
        graded:           parseInt(gradedRes.rows[0].count),
        avgScore:         Math.round(parseFloat(avgRes.rows[0].avg) || 0),
        flagged:          parseInt(flaggedRes.rows[0].count),
      }
    })
  } catch (err) {
    console.error('Admin stats error:', err.message)
    res.status(500).json({ error: `Failed to fetch admin stats: ${err.message}` })
  }
}

const getUsers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.full_name, u.email, u.plan, u.is_email_verified,
              u.created_at, COUNT(s.id) as session_count
       FROM users u
       LEFT JOIN workspaces w ON w.owner_user_id = u.id
       LEFT JOIN sessions s ON s.workspace_id = w.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    )
    res.json({ data: result.rows })
  } catch (err) {
    console.error('Get users error:', err.message)
    res.status(500).json({ error: `Failed to fetch users: ${err.message}` })
  }
}

const getAllSessions = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, u.full_name as teacher_name, u.email as teacher_email,
              COUNT(sub.id) as submission_count
       FROM sessions s
       JOIN workspaces w ON s.workspace_id = w.id
       JOIN users u ON w.owner_user_id = u.id
       LEFT JOIN submissions sub ON sub.session_id = s.id
       GROUP BY s.id, u.full_name, u.email
       ORDER BY s.created_at DESC
       LIMIT 50`
    )
    res.json({ data: result.rows })
  } catch (err) {
    console.error('Get all sessions error:', err.message)
    res.status(500).json({ error: `Failed to fetch sessions: ${err.message}` })
  }
}

const deleteUser = async (req, res) => {
  const { id } = req.params
  try {
    // 1. Delete submissions under this user's sessions
    await db.query(`
      DELETE FROM submissions
      WHERE session_id IN (
        SELECT s.id FROM sessions s
        JOIN workspaces w ON s.workspace_id = w.id
        WHERE w.owner_user_id = $1
      )`, [id])

    // 2. Delete sessions
    await db.query(`
      DELETE FROM sessions
      WHERE workspace_id IN (
        SELECT id FROM workspaces WHERE owner_user_id = $1
      )`, [id])

    // 3. Delete workspaces
    await db.query(`DELETE FROM workspaces WHERE owner_user_id = $1`, [id])

    // 4. Clean up auth tables — silently skip if table doesn't exist
    const authCleanup = [
      // Tables confirmed in your schema
      `DELETE FROM notifications WHERE user_id = $1`,
      `DELETE FROM audit_logs WHERE user_id = $1`,
      `DELETE FROM rubrics WHERE created_by = $1`,
      // Auth tables — skip if not present
      `DELETE FROM refresh_tokens WHERE user_id = $1`,
      `DELETE FROM email_verifications WHERE user_id = $1`,
      `DELETE FROM password_resets WHERE user_id = $1`,
      `DELETE FROM email_verification_tokens WHERE user_id = $1`,
      `DELETE FROM tokens WHERE user_id = $1`,
    ]
    for (const q of authCleanup) {
      try { await db.query(q, [id]) } catch (_) {}
    }

    // 5. Delete user
    const result = await db.query(`DELETE FROM users WHERE id = $1 RETURNING id`, [id])
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found.' })

    res.json({ message: 'User deleted successfully.' })
  } catch (err) {
    console.error('Delete user error:', err.message)
    res.status(500).json({ error: `Failed to delete user: ${err.message}` })
  }
}

const updateUserPlan = async (req, res) => {
  const { plan } = req.body
  try {
    const result = await db.query(
      `UPDATE users SET plan = $1 WHERE id = $2 RETURNING *`,
      [plan, req.params.id]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found.' })
    res.json({ data: result.rows[0] })
  } catch (err) {
    console.error('Update plan error:', err.message)
    res.status(500).json({ error: `Failed to update plan: ${err.message}` })
  }
}

module.exports = { getAdminStats, getUsers, getAllSessions, deleteUser, updateUserPlan }