import { getStore } from '@netlify/blobs'
import type { Context } from '@netlify/functions'

type ArtworkRecord = {
  id: string
  title: string
  author: string
  text: string
  hasImage: boolean
  imageType?: string
  createdAt: string
  status: 'pending' | 'approved'
  submissionId?: string
}

type FormFile = {
  url?: string
  filename?: string
  size?: number
  type?: string
}

type SubmissionPayload = {
  id?: string
  form_name?: string
  created_at?: string
  data?: Record<string, unknown>
}

const MAX_TEXT = 4000
const MAX_TITLE = 120
const MAX_AUTHOR = 80
const MAX_IMAGE_BYTES = 3 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
])

const sanitize = (raw: unknown, max: number): string => {
  if (typeof raw !== 'string') return ''
  const stripped = raw.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
  return stripped.trim().slice(0, max)
}

const newId = (): string => {
  const rand = Math.random().toString(36).slice(2, 10)
  return `${Date.now().toString(36)}-${rand}`
}

const extractImage = (raw: unknown): FormFile | null => {
  if (!raw) return null
  if (typeof raw === 'string') {
    if (raw.startsWith('http')) return { url: raw }
    return null
  }
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    const url = typeof obj.url === 'string' ? obj.url : undefined
    if (!url) return null
    return {
      url,
      filename: typeof obj.filename === 'string' ? obj.filename : undefined,
      size: typeof obj.size === 'number' ? obj.size : undefined,
      type: typeof obj.type === 'string' ? obj.type : undefined,
    }
  }
  return null
}

export default async (req: Request, _context: Context) => {
  let body: { payload?: SubmissionPayload }
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const payload = body.payload
  if (!payload || payload.form_name !== 'artwork') {
    return new Response('Ignored', { status: 200 })
  }

  const data = payload.data ?? {}
  const title = sanitize(data.title, MAX_TITLE)
  const author = sanitize(data.author, MAX_AUTHOR) || 'Anonyme'
  const text = sanitize(data.text, MAX_TEXT)
  const image = extractImage(data.image)

  if (!title) {
    return new Response('Missing title', { status: 400 })
  }
  if (!text && !image) {
    return new Response('Empty submission', { status: 400 })
  }

  const id = newId()
  const record: ArtworkRecord = {
    id,
    title,
    author,
    text,
    hasImage: false,
    createdAt: payload.created_at || new Date().toISOString(),
    status: 'pending',
    submissionId: payload.id,
  }

  const metadataStore = getStore('artworks')
  const imageStore = getStore('artwork-images')

  if (image?.url) {
    try {
      const res = await fetch(image.url)
      if (res.ok) {
        const contentType =
          res.headers.get('content-type')?.split(';')[0]?.trim() ||
          image.type ||
          'application/octet-stream'
        const buffer = await res.arrayBuffer()
        if (
          ALLOWED_IMAGE_TYPES.has(contentType) &&
          buffer.byteLength <= MAX_IMAGE_BYTES
        ) {
          await imageStore.set(id, buffer, {
            metadata: { contentType },
          })
          record.hasImage = true
          record.imageType = contentType
        }
      }
    } catch (err) {
      console.error('Failed to fetch submission image', err)
    }
  }

  await metadataStore.setJSON(id, record)

  return new Response('OK', { status: 200 })
}
