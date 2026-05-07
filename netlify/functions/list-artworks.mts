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

const featuredPoems: ArtworkRecord[] = [
  {
    id: 'featured-feuilles-sur-le-silence',
    title: 'Feuilles sur le silence',
    author: 'Art & Poésie',
    text: 'Les mots tombent\ncomme des feuilles\nsur le silence.',
    hasImage: false,
    createdAt: '2026-05-06T00:00:00.000Z',
    status: 'approved',
  },
  {
    id: 'featured-chambre-ouverte',
    title: 'Chambre ouverte',
    author: 'Art & Poésie',
    text:
      'Chaque poème est une chambre ouverte\nsur l’invisible,\nune lumière qui attend\nque la voix entre.',
    hasImage: false,
    createdAt: '2026-05-05T00:00:00.000Z',
    status: 'approved',
  },
  {
    id: 'featured-l-ame-revelee',
    title: 'L’âme révélée',
    author: 'Art & Poésie',
    text:
      'L’art révèle\nce que l’âme\nne sait pas encore dire.',
    hasImage: false,
    createdAt: '2026-05-04T00:00:00.000Z',
    status: 'approved',
  },
]

export default async (_req: Request, _context: Context) => {
  const store = getStore('artworks')
  const { blobs } = await store.list()

  const records = await Promise.all(
    blobs.map((entry) => store.get(entry.key, { type: 'json' })),
  )

  const artworks = records
    .filter((r): r is ArtworkRecord => r !== null && typeof r === 'object')
    .filter((r) => (r.status ?? 'approved') === 'approved')
    .concat(featuredPoems)
    .map(({ status: _status, ...rest }) => rest)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  return Response.json({ artworks })
}

export const config: Config = {
  path: '/api/artworks',
  method: 'GET',
}
