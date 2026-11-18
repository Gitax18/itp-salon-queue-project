const express = require('express')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 4000

// Set CORS_ORIGIN (e.g. the Vercel URL) in production; open in local dev.
app.use(cors({ origin: process.env.CORS_ORIGIN || true }))
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Salon queue server listening on port ${PORT}`)
})
