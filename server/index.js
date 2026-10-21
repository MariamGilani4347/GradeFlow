const express = require('express')
const cors    = require('cors')
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') })

const pool = require('./db/db')  // ← import your pool

const authRoutes       = require('./routes/auth')
const { sessionRouter, submissionRouter } = require('./routes/sessions')
const adminRoutes      = require('./routes/admin')
const rubricRoutes     = require('./routes/Rubrics')  // ← capital R matches your filename

const app  = express()
const PORT = process.env.PORT || 3001


app.use(cors())
app.use(express.json())

// ── Attach DB pool to every request ──
app.use((req, res, next) => {
  req.db = pool
  next()
})

// Routes
app.use('/auth',        authRoutes)
app.use('/sessions',    sessionRouter)
app.use('/submissions', submissionRouter)
app.use('/admin',       adminRoutes)
app.use('/rubrics', rubricRoutes)

app.get('/', (req, res) => res.json({ message: 'Teacher Assessment CRM API is running' }))

app.use((req, res) => res.status(404).json({ error: 'Route not found.' }))

module.exports = app

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}