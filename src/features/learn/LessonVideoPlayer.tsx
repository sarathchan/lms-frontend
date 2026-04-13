import { useEffect, type RefObject, type VideoHTMLAttributes } from 'react'

export function isHlsSource(src: string, mimeType?: string | null) {
  const m = (mimeType ?? '').toLowerCase()
  if (
    m.includes('mpegurl') ||
    m.includes('m3u8') ||
    m.includes('application/vnd.apple.mpegurl')
  ) {
    return true
  }
  try {
    const path = new URL(src, window.location.href).pathname.toLowerCase()
    return path.endsWith('.m3u8')
  } catch {
    return src.toLowerCase().includes('.m3u8')
  }
}

type LessonVideoPlayerProps = {
  videoRef: RefObject<HTMLVideoElement | null>
  src: string
  mimeType?: string | null
} & Omit<VideoHTMLAttributes<HTMLVideoElement>, 'src' | 'ref'>

/**
 * MP4/WebM: native progressive streaming (Range requests).
 * HLS (.m3u8): loads `hls.js` on demand for adaptive streaming (Chrome/Firefox).
 */
export function LessonVideoPlayer({
  videoRef,
  src,
  mimeType,
  ...videoProps
}: LessonVideoPlayerProps) {
  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    const hlsMode = isHlsSource(src, mimeType)

    if (!hlsMode) {
      video.src = src
      return () => {
        video.removeAttribute('src')
        video.load()
      }
    }

    let cancelled = false
    const hlsRef: { current: import('hls.js').default | null } = { current: null }

    void import('hls.js').then(({ default: Hls }) => {
      if (cancelled || videoRef.current !== video) return
      if (Hls.isSupported()) {
        const instance = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          startFragPrefetch: true,
          maxBufferLength: 30,
          maxMaxBufferLength: 120,
        })
        hlsRef.current = instance
        instance.loadSource(src)
        instance.attachMedia(video)
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src
      }
    })

    return () => {
      cancelled = true
      hlsRef.current?.destroy()
      hlsRef.current = null
      video.removeAttribute('src')
      video.load()
    }
  }, [src, mimeType, videoRef])

  return <video ref={videoRef} {...videoProps} />
}
