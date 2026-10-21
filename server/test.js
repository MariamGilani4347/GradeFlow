const fetch = require('node-fetch')

const BASE = 'http://localhost:3001'

async function test() {
  // Step 1 - Login
  console.log('1. Logging in...')
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@gmail.com', password: 'Test@1234' })
  })
  const { data } = await loginRes.json()
  const token = data.access_token
  console.log('✅ Logged in. Token:', token.slice(0, 20) + '...')

  // Step 2 - Create Session
  console.log('\n2. Creating session...')
  const sessionRes = await fetch(`${BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ title: 'OCR Test Session' })
  })
  const sessionData = await sessionRes.json()
  const sessionId = sessionData.data.id
  console.log('✅ Session created. ID:', sessionId)

  // Step 3 - Create Submission
  console.log('\n3. Creating submission...')
  const subRes = await fetch(`${BASE}/sessions/${sessionId}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      file_url: 'https://pwuhneoelpbuxjeadyeb.supabase.co/storage/v1/object/public/submissions/test.png',
      file_key: 'test-session/test.png',
      file_name: 'test.png'
    })
  })
  const subData = await subRes.json()
  console.log('✅ Submission created:', subData)
}

test().catch(console.error)