const Groq = require('groq-sdk')
require('dotenv').config()

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

const gradeSubmission = async (ocrText, rubric, totalMarks = 100) => {
  const prompt = `You are an expert teacher and examiner. Grade the following student answer based on the rubric provided.

RUBRIC:
${rubric}

STUDENT ANSWER:
${ocrText}

Please provide:
1. A numerical score out of ${totalMarks} (maximum score is ${totalMarks}, minimum is 0)
2. Detailed feedback explaining the score
3. Specific strengths in the answer
4. Areas for improvement

IMPORTANT: The score MUST be a number between 0 and ${totalMarks}. Do NOT score out of 100.

Respond in this exact JSON format:
{
  "score": <number between 0 and ${totalMarks}>,
  "feedback": "<detailed feedback>",
  "strengths": "<what the student did well>",
  "improvements": "<what needs improvement>"
}`

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.3,
    max_tokens: 1024,
  })

  const response = completion.choices[0].message.content

  // Parse JSON response
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Invalid AI response format')

  const result = JSON.parse(jsonMatch[0])

  if (typeof result.score !== 'number') throw new Error('Invalid score in AI response')

  // Clamp score to valid range just in case AI ignores instructions
  result.score = Math.min(Math.max(Math.round(result.score), 0), totalMarks)

  return result
}

module.exports = { gradeSubmission }