import { getStore } from '@netlify/blobs'
import type { Config, Context } from '@netlify/functions'

export default async (_req: Request, context: Context) => {
  const id = context.params.id
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) {
    return new Response('Invalid id', { status: 400 })
  }

  const store = getStore('artwork-images')
  const result = await store.getWithMetadata(id, { type: 'arrayBuffer' })

  if (!result || !result.data) {
    return new Response('Not found', { status: 404 })
  }

  const contentType =
    (result.metadata?.contentType as string | undefined) ||
    'application/octet-stream'

  return new Response(result.data, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
    },
  })
}

export const config: Config = {
  path: '/api/artworks/:id/image',
  method: 'GET',
}
