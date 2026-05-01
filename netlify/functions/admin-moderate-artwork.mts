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

export default async (req: Request, context: Context) => {
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

  const id = context.params.id
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) {
    return Response.json({ error: 'Identifiant invalide.' }, { status: 400 })
  }

  let body: { action?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const action = body.action
  if (action !== 'approve' && action !== 'reject') {
    return Response.json(
      { error: 'Action invalide. Utilisez "approve" ou "reject".' },
      { status: 400 },
    )
  }

  const metadataStore = getStore('artworks')
  const imageStore = getStore('artwork-images')

  const record = (await metadataStore.get(id, { type: 'json' })) as
    | ArtworkRecord
    | null

  if (!record) {
    return Response.json({ error: 'Œuvre introuvable.' }, { status: 404 })
  }

  if (action === 'approve') {
    const updated: ArtworkRecord = { ...record, status: 'approved' }
    await metadataStore.setJSON(id, updated)
    return Response.json({ ok: true, artwork: updated })
  }

  await metadataStore.delete(id)
  if (record.hasImage) {
    await imageStore.delete(id)
  }
  return Response.json({ ok: true, deleted: id })
}

export const config: Config = {
  path: '/api/admin/artworks/:id',
  method: 'POST',
}
