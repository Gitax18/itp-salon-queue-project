const express = require('express')
const cors = require('cors')
const rules = require('./queueRules')

const app = express()
const PORT = process.env.PORT || 4000

// Set CORS_ORIGIN (e.g. the Vercel URL) in production; open in local dev.
app.use(cors({ origin: process.env.CORS_ORIGIN || true }))
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

// Settings, services, barbers, queue summary, and estimated wait per barber choice.
app.get('/api/public', (_req, res) => {
  res.json(rules.publicView())
})

// Join the queue. An active spot on the same phone is returned instead of a duplicate.
app.post('/api/join', (req, res) => {
  const result = rules.join(req.body)
  if (result.error) {
    const status = result.error === 'closed' ? 403 : 400
    return res.status(status).json({ error: result.error })
  }
  res.status(result.existing ? 200 : 201).json({ spot: rules.spotView(result.spot), existing: result.existing })
})

// Find an active spot by phone number (Home: "I already joined").
app.get('/api/lookup', (req, res) => {
  const phone = String(req.query.phone || '')
  const spot = rules.findActiveByPhone(phone)
  if (!spot) return res.status(404).json({ error: 'not_found' })
  res.json({ id: spot.id })
})

app.get('/api/spots/:id', (req, res) => {
  const c = rules.findCustomer(req.params.id)
  if (!c) return res.status(404).json({ error: 'not_found' })
  res.json(rules.spotView(c))
})

app.post('/api/spots/:id/cancel', (req, res) => {
  const result = rules.cancel(req.params.id)
  if (result.error) return res.status(result.error === 'not_found' ? 404 : 409).json({ error: result.error })
  res.json(rules.spotView(result.spot))
})

// ---------- staff routes (PIN required: header x-staff-pin) ----------

function requirePin(req, res, next) {
  if (!rules.checkPin(req.get('x-staff-pin'))) return res.status(401).json({ error: 'bad_pin' })
  next()
}

app.post('/api/staff/check', (req, res) => {
  if (!rules.checkPin(req.body?.pin)) return res.status(401).json({ error: 'bad_pin' })
  res.json({ ok: true })
})

app.use('/api/reception', requirePin)

app.get('/api/reception', (_req, res) => {
  res.json(rules.receptionView())
})

app.post('/api/reception/call-next/:barberId', (req, res) => {
  const result = rules.callNext(req.params.barberId)
  if (result.error) return res.status(result.error === 'not_found' ? 404 : 409).json({ error: result.error })
  res.json({ id: result.spot.id })
})

app.post('/api/reception/no-show/:id', (req, res) => {
  const result = rules.noShow(req.params.id)
  if (result.error) return res.status(result.error === 'not_found' ? 404 : 409).json({ error: result.error })
  res.json({ id: result.spot.id })
})

app.post('/api/reception/cancel/:id', (req, res) => {
  const result = rules.cancel(req.params.id)
  if (result.error) return res.status(result.error === 'not_found' ? 404 : 409).json({ error: result.error })
  res.json({ id: result.spot.id })
})

// Walk-in: same as Join, but allowed even when online joining is closed.
app.post('/api/reception/walk-in', (req, res) => {
  const result = rules.join(req.body, { walkIn: true })
  if (result.error) return res.status(400).json({ error: result.error })
  res.status(result.existing ? 200 : 201).json({ spot: rules.spotView(result.spot), existing: result.existing })
})

// Barber screen (PIN required)
app.use('/api/barber', requirePin)

app.get('/api/barber/:id', (req, res) => {
  const view = rules.barberView(req.params.id)
  if (!view) return res.status(404).json({ error: 'not_found' })
  res.json(view)
})

function barberAction(fn) {
  return (req, res) => {
    const result = fn(req)
    if (result.error) return res.status(result.error === 'not_found' ? 404 : 409).json({ error: result.error })
    res.json(rules.barberView(req.params.id))
  }
}
app.post('/api/barber/:id/start', barberAction((req) => rules.barberStart(req.params.id)))
app.post('/api/barber/:id/done', barberAction((req) => rules.barberDone(req.params.id)))
app.post('/api/barber/:id/break', barberAction((req) => rules.setBreak(req.params.id, req.body?.onBreak)))

// Waiting-area TV feed (public; tokens and barber names only)
app.get('/api/display', (_req, res) => {
  res.json(rules.displayView())
})

app.listen(PORT, () => {
  console.log(`Salon queue server listening on port ${PORT}`)
})
