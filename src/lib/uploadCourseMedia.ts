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

/**
 * Chunked upload to the API (S3 multipart on the server). No client-side file size cap.
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

    for (let p = 1; p <= totalParts; p++) {
      const start = (p - 1) * partSize
      const end = Math.min(start + partSize, file.size)
      const chunk = file.slice(start, end)
      const form = new FormData()
      form.append('chunk', chunk, `part-${p}`)
      await api.post(
        `media/multipart/${init.sessionId}/part/${p}`,
        form,
      )
      onProgress({
        percent: Math.min(100, Math.round((end / file.size) * 100)),
        loaded: end,
        total: file.size,
      })
    }

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
