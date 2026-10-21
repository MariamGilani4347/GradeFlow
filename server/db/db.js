const { Pool } = require('pg')
require('dotenv').config()

// Use SSL for cloud Postgres. On Vercel (NODE_ENV=production) it's always required.
const useSsl =
  process.env.NODE_ENV === 'production' ||
  /supabase|neon|sslmode=require|amazonaws/.test(process.env.DATABASE_URL || '')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  max: process.env.NODE_ENV === 'production' ? 1 : 10,
})

pool.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.message)
  } else {
    console.log('Connected to PostgreSQL successfully')
  }
})

module.exports = pool