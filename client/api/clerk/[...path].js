export const config = { runtime: 'edge' }

const CLERK_API = 'https://api.clerk.com'
// jsDelivr mirrors npm exactly: /npm/@clerk/clerk-js@6/dist/clerk.browser.js works as-is
const CLERK_JS_CDN = 'https://cdn.jsdelivr.net'

export default async function handler(req) {
  const url = new URL(req.url)
  const clerkPath = url.pathname.replace('/api/clerk', '')

  const baseUrl = clerkPath.startsWith('/npm/') ? CLERK_JS_CDN : CLERK_API
  const targetUrl = `${baseUrl}${clerkPath}${url.search}`

  const response = await fetch(targetUrl, {
    method: req.method,
    headers: req.headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
    redirect: 'follow',
  })

  return new Response(response.body, { status: response.status, headers: response.headers })
}
