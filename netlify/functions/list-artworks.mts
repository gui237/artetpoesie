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

export default async (_req: Request, _context: Context) => {
  const store = getStore('artworks')
  const { blobs } = await store.list()

  const records = await Promise.all(
    blobs.map((entry) => store.get(entry.key, { type: 'json' })),
  )

  const artworks = records
    .filter((r): r is ArtworkRecord => r !== null && typeof r === 'object')
    .filter((r) => (r.status ?? 'approved') === 'approved')
    .map(({ status: _status, ...rest }) => rest)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  return Response.json({ artworks })
}

export const config: Config = {
  path: '/api/artworks',
  method: 'GET',
}
