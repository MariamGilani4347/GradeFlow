
const { verifyAccessToken } = require('../utils/jwt')

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Token missing.' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = verifyAccessToken(token)
    req.userId = decoded.userId
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized. Token invalid or expired.' })
  }
}

module.exports = { protect }