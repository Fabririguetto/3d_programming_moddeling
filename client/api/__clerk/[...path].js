export const config = { runtime: 'edge' }

const CLERK_FAPI = 'https://clerk.3d-programming-moddeling.vercel.app'

export default async function handler(req) {
  const url = new URL(req.url)
  const clerkPath = url.pathname.replace('/api/__clerk', '')
  const targetUrl = `${CLERK_FAPI}${clerkPath}${url.search}`

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
