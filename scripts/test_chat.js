// Simple test script to POST to /api/chat and print the SSE response as text
const fetch = global.fetch || require('node-fetch')

async function run() {
  const res = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Research Apple', sessionId: 'test-session' }),
  })

  const text = await res.text()
  console.log('Response length:', text.length)
  console.log(text.slice(0, 2000))
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
