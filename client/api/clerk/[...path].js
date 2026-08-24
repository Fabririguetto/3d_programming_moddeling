export const config = { runtime: 'edge' }

const CLERK_API = 'https://api.clerk.com'
// The JS bundle is version-specific, not instance-specific — dev FAPI serves it fine
const CLERK_JS_CDN = 'https://allowing-opossum-330.clerk.accounts.dev'

export default async function handler(req) {
  const url = new URL(req.url)
  const clerkPath = url.pathname.replace('/api/clerk', '')

  const baseUrl = clerkPath.startsWith('/npm/') ? CLERK_JS_CDN : CLERK_API
  const targetUrl = `${baseUrl}${clerkPath}${url.search}`

  const response = await fetch(targetUrl, {
    method: req.method,
    headers: req.headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
  })

  return new Response(response.body, { status: response.status, headers: response.headers })
}
