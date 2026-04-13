import { api } from './api'

export function formatUploadBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024)
    return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export type UploadProgressPayload = {
  percent: number
  loaded: number
  total: number
}

/** Parallel direct PUTs to S3 (presigned per part). Tune if clients are very slow. */
const MPU_PUT_CONCURRENCY = 4

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (true) {
      const i = next++
      if (i >= items.length) break
      results[i] = await fn(items[i]!, i)
    }
  }
  const n = Math.min(limit, Math.max(1, items.length))
  await Promise.all(Array.from({ length: n }, () => worker()))
  return results
}

/**
 * Multipart upload: each part is PUT directly to S3 using a presigned URL (no large body through your API/nginx).
 * Small JSON calls only: init, presign per part, register ETags, complete.
 */
export async function uploadCourseMediaMultipart(
  file: File,
  kind: string,
  onProgress: (p: UploadProgressPayload) => void,
): Promise<{ mediaId: string }> {
  let sessionId: string | null = null
  try {
    const { data: init } = await api.post<{
      sessionId: string
      mediaId: string
      partSize: number
      totalParts: number
    }>('media/multipart/init', {
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      kind,
      totalSize: file.size,
    })
    sessionId = init.sessionId
    const { partSize, totalParts } = init

    const partSpecs = Array.from({ length: totalParts }, (_, idx) => {
      const p = idx + 1
      const start = (p - 1) * partSize
      const end = Math.min(start + partSize, file.size)
      return { partNumber: p, blob: file.slice(start, end) }
    })

    let uploaded = 0
    const partsMeta = await mapWithConcurrency(
      partSpecs,
      MPU_PUT_CONCURRENCY,
      async ({ partNumber, blob }) => {
        const { data: presigned } = await api.get<{ url: string }>(
          `media/multipart/${init.sessionId}/presign/${partNumber}`,
        )
        const res = await fetch(presigned.url, {
          method: 'PUT',
          body: blob,
        })
        if (!res.ok) {
          const hint = await res.text().catch(() => '')
          throw new Error(
            hint ||
              `Upload part ${partNumber} failed (${res.status}). Check S3 bucket CORS: allow PUT from your LMS origin.`,
          )
        }
        const etag = res.headers.get('ETag') ?? res.headers.get('etag')
        if (!etag) {
          throw new Error(
            `Part ${partNumber}: S3 did not expose ETag. Add <ExposeHeader>ETag</ExposeHeader> (and AllowHeader for content-type if needed) to the bucket CORS configuration.`,
          )
        }
        uploaded += blob.size
        onProgress({
          percent: Math.min(99, Math.round((uploaded / file.size) * 100)),
          loaded: uploaded,
          total: file.size,
        })
        return { partNumber, etag }
      },
    )

    await api.post(`media/multipart/${init.sessionId}/register-parts`, {
      parts: partsMeta,
    })

    await api.post(`media/multipart/${init.sessionId}/complete`, {})
    onProgress({ percent: 100, loaded: file.size, total: file.size })
    return { mediaId: init.mediaId }
  } catch (e) {
    if (sessionId) {
      await api.post(`media/multipart/${sessionId}/abort`, {}).catch(() => {})
    }
    throw e
  }
}
