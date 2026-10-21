const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Generate a signed URL for upload
const generatePresignedUrl = async (fileKey, contentType) => {
  const { data, error } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET)
    .createSignedUploadUrl(fileKey, 60 * 60)

  if (error) {
    console.error('Supabase presign error:', JSON.stringify(error, null, 2))
    throw new Error(error.message || JSON.stringify(error))
  }

  return data.signedUrl
}

// Extract storage path from a full Supabase URL
const extractFileKey = (fileUrl) => {
  if (!fileUrl.startsWith('http')) return fileUrl
  const match = fileUrl.match(/\/object\/(?:public|authenticated|sign)\/[^/]+\/([^?]+)/)
  if (!match) throw new Error(`Cannot parse Supabase URL: ${fileUrl}`)
  return decodeURIComponent(match[1])
}

// Download a file from Supabase as Buffer
const getFileBuffer = async (fileUrl) => {
  const fileKey = extractFileKey(fileUrl)
  console.log(`Downloading — bucket: ${process.env.SUPABASE_BUCKET}, key: ${fileKey}`)

  const { data, error } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET)
    .download(fileKey)

  if (error) {
    console.error(`Supabase download error for "${fileKey}":`, JSON.stringify(error, null, 2))
    throw new Error(`Supabase download failed: ${error.message || JSON.stringify(error)}`)
  }

  if (!data) throw new Error(`No data returned from Supabase for file: ${fileKey}`)

  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// Get public URL (only works if bucket is public)
const getPublicUrl = (fileKey) => {
  const { data } = supabase.storage
    .from(process.env.SUPABASE_BUCKET)
    .getPublicUrl(fileKey)
  return data?.publicUrl || null
}

// Get a long-lived signed URL (works for PRIVATE buckets)
// Valid for 10 years — safe to store in DB as file_url
const getSignedUrl = async (fileKey, expiresIn = 60 * 60 * 24 * 365 * 10) => {
  const { data, error } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET)
    .createSignedUrl(fileKey, expiresIn)

  if (error) {
    console.error('Signed URL error:', JSON.stringify(error, null, 2))
    throw new Error(`Failed to create signed URL: ${error.message}`)
  }

  return data.signedUrl
}

module.exports = { supabase, generatePresignedUrl, getFileBuffer, getPublicUrl, getSignedUrl, extractFileKey }