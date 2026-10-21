// server/test-supabase.js
require('dotenv').config()

console.log('=== ENV CHECK ===')
console.log('SUPABASE_URL:', process.env.SUPABASE_URL || '❌ MISSING')
console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ set' : '❌ MISSING')
console.log('SUPABASE_BUCKET:', process.env.SUPABASE_BUCKET || '❌ MISSING')
console.log('=================')

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function test() {
  console.log('\nTesting download of: ayesha.png')
  const { data, error } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET)
    .download('ayesha.png')

  if (error) {
    console.error('❌ Supabase error:', JSON.stringify(error, null, 2))
    console.error('Error message:', error.message)
    console.error('Error status:', error.status)
    console.error('Error statusCode:', error.statusCode)
  } else {
    console.log('✅ File downloaded successfully! Size:', data?.size)
  }
}

test().catch(err => {
  console.error('❌ Unexpected error:', err.message)
  console.error('Full error:', err)
})