const fs = require('fs')
const path = require('path')
require('dotenv').config()
const db = require('./db/db')

// ── Diagnostics: make build failures obvious in Vercel logs ──
const dbUrl = process.env.DATABASE_URL || ''
if (!dbUrl) {
  console.error('\n❌ DATABASE_URL is NOT set. Migrations cannot run.')
  console.error('   Set DATABASE_URL in Vercel → Settings → Environment Variables, then redeploy.\n')
  process.exit(1)
}
const masked = dbUrl.replace(/:([^:@/]+)@/, ':****@')
console.log(`DATABASE_URL present: ${masked.slice(0, 24)}… (length ${dbUrl.length})`)

async function runMigrations() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS migrations_log (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      ran_at TIMESTAMPTZ DEFAULT now()
    )
  `)

  const migrationsDir = path.join(__dirname, 'migrations')
  const files = fs.readdirSync(migrationsDir).sort()

  for (const file of files) {
    const alreadyRan = await db.query(
      'SELECT id FROM migrations_log WHERE filename = $1',
      [file]
    )

    if (alreadyRan.rows.length > 0) {
      console.log(`Skipping (already ran): ${file}`)
      continue
    }

    const filePath = path.join(migrationsDir, file)
    const sql = fs.readFileSync(filePath, 'utf8')
    console.log(`Running migration: ${file}`)
    await db.query(sql)
    await db.query('INSERT INTO migrations_log (filename) VALUES ($1)', [file])
    console.log(`✓ Done: ${file}`)
  }

  console.log('All migrations completed!')
  await db.end()
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
