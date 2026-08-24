export const config = { runtime: 'edge' }

export default async function handler(req) {
  const url = new URL(req.url)
  const clerkPath = url.pathname.replace('/api/clerk', '')
  const targetUrl = `https://api.clerk.com${clerkPath}${url.search}`

  const response = await fetch(targetUrl, {
    method: req.method,
    headers: req.headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
  })

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  })
}
