const axios = require('axios')
const Groq = require('groq-sdk')

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// ─── Extract Text via Azure Read REST API ─────────────────────────────────────
async function extractText(fileBuffer) {
  try {
    const endpoint = process.env.AZURE_CV_ENDPOINT.replace(/\/$/, '')
    const key = process.env.AZURE_CV_KEY
    const url = `${endpoint}/vision/v3.2/read/analyze`

    // Step 1 — Submit image to Azure
    const submitRes = await axios.post(url, fileBuffer, {
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/octet-stream'
      }
    })

    // Step 2 — Get operation URL from response headers
    const operationUrl = submitRes.headers['operation-location']
    if (!operationUrl) {
      return { success: false, text: '', confidence: 0, error: 'No operation-location in response' }
    }

    console.log('Azure OCR submitted, polling for result...')

    // Step 3 — Poll until done
    let result
    let attempts = 0
    while (attempts < 30) {
      await new Promise(r => setTimeout(r, 1500))
      const pollRes = await axios.get(operationUrl, {
        headers: { 'Ocp-Apim-Subscription-Key': key }
      })
      result = pollRes.data
      if (result.status === 'succeeded' || result.status === 'failed') break
      attempts++
    }

    if (result.status === 'succeeded') {
      let fullText = ''
      const confidences = []

      for (const page of result.analyzeResult.readResults) {
        for (const line of page.lines) {
          fullText += line.text + '\n'
          for (const word of line.words) {
            if (word.confidence !== undefined) {
              confidences.push(word.confidence)
            }
          }
        }
      }

      const avgConfidence = confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : 0

      console.log(`Azure OCR succeeded. ${fullText.split(/\s+/).filter(Boolean).length} words extracted.`)

      return {
        success: true,
        text: fullText.trim(),
        confidence: Math.round(avgConfidence * 100),
        wordCount: fullText.split(/\s+/).filter(Boolean).length
      }
    }

    return { success: false, text: '', confidence: 0, error: `OCR failed with status: ${result.status}` }

  } catch (err) {
    console.error('Azure CV REST error:', err.response?.data || err.message)
    return { success: false, text: '', confidence: 0, error: err.message }
  }
}

// ─── Extract Student ID via Groq ──────────────────────────────────────────────
async function extractStudentId(text) {
  try {
    const prompt = `Look at this text extracted from the TOP of a student's answer paper.
Find and extract the Student ID or Roll Number.
It could be in any format — numbers only, letters+numbers, roll number, etc.
Look for labels like: "Student ID", "Roll No", "ID", "Roll Number", "Reg No", "Registration"

TEXT:
${text.slice(0, 500)}

Reply with ONLY the student ID value. Nothing else.
If you cannot find any student ID, reply with: NOT_FOUND`

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1
    })

    const result = response.choices[0].message.content.trim()
    return result === 'NOT_FOUND' ? null : result

  } catch (err) {
    console.error('Student ID extraction error:', err.message)
    return null
  }
}

module.exports = { extractText, extractStudentId }