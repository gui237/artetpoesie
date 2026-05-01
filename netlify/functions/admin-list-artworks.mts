import { getStore } from '@netlify/blobs'
import type { Config, Context } from '@netlify/functions'

type ArtworkStatus = 'pending' | 'approved'

type ArtworkRecord = {
  id: string
  title: string
  author: string
  text: string
  hasImage: boolean
  imageType?: string
  createdAt: string
  status?: ArtworkStatus
}

const checkAuth = (req: Request): boolean => {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  const header = req.headers.get('authorization') || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  if (!match) return false
  return match[1] === expected
}

export default async (req: Request, _context: Context) => {
  if (!process.env.ADMIN_PASSWORD) {
    return Response.json(
      {
        error:
          'La modération n’est pas configurée. Définissez la variable ADMIN_PASSWORD dans Netlify.',
      },
      { status: 503 },
    )
  }
  if (!checkAuth(req)) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Bearer' },
    })
  }

  const store = getStore('artworks')
  const { blobs } = await store.list()

  const records = await Promise.all(
    blobs.map((entry) => store.get(entry.key, { type: 'json' })),
  )

  const artworks = records
    .filter((r): r is ArtworkRecord => r !== null && typeof r === 'object')
    .map((r) => ({ ...r, status: r.status ?? 'approved' }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  return Response.json({ artworks })
}

export const config: Config = {
  path: '/api/admin/artworks',
  method: 'GET',
}
