const path = require('path')
const app = require(path.join(__dirname, '..', 'server', 'index.js'))

module.exports = (req, res) => {
  req.url = req.url.replace(/^\/api/, '') || '/'
  return app(req, res)
}
