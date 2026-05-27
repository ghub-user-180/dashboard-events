import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { urls } = (await request.json()) as { urls: string[] }

  const results = await Promise.allSettled(
    urls.map(async (url: string) => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 6000)
      try {
        const res = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          redirect: 'follow',
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EventDashboard/1.0)' },
        })
        clearTimeout(timer)
        return { url, ok: res.ok, statusCode: res.status }
      } catch {
        clearTimeout(timer)
        return { url, ok: false, statusCode: 0 }
      }
    })
  )

  return NextResponse.json({
    results: results.map((r) =>
      r.status === 'fulfilled' ? r.value : { url: '', ok: false, statusCode: 0 }
    ),
    checkedAt: new Date().toISOString(),
  })
}
