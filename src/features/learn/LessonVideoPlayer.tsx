import { useEffect, useState, type RefObject, type VideoHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

type LessonVideoPlayerProps = {
  videoRef: RefObject<HTMLVideoElement | null>
  src: string
  mimeType?: string | null
  /** Resume position in seconds (native progressive + range requests). */
  resumeAtSec?: number
} & Omit<VideoHTMLAttributes<HTMLVideoElement>, 'src' | 'ref'>

/**
 * Native MP4/WebM playback (CloudFront/S3 with Range requests). Includes lightweight buffering UI.
 */
export function LessonVideoPlayer({
  videoRef,
  src,
  mimeType,
  resumeAtSec = 0,
  onLoadStart,
  onWaiting,
  onPlaying,
  onCanPlay,
  ...videoProps
}: LessonVideoPlayerProps) {
  const [loading, setLoading] = useState(!!src)

  useEffect(() => {
    setLoading(!!src)
  }, [src])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return
    const onMeta = () => {
      if (resumeAtSec > 0 && video.duration && resumeAtSec < video.duration) {
        video.currentTime = resumeAtSec
      }
    }
    video.addEventListener('loadedmetadata', onMeta, { once: true })
    return () => video.removeEventListener('loadedmetadata', onMeta)
  }, [src, resumeAtSec, videoRef])

  const type =
    mimeType && mimeType.includes('/')
      ? mimeType
      : 'video/mp4'

  return (
    <div className="relative">
      <video
        ref={videoRef}
        key={src}
        preload="metadata"
        playsInline
        onLoadStart={(e) => {
          setLoading(true)
          onLoadStart?.(e)
        }}
        onWaiting={(e) => {
          setLoading(true)
          onWaiting?.(e)
        }}
        onPlaying={(e) => {
          setLoading(false)
          onPlaying?.(e)
        }}
        onCanPlay={(e) => {
          setLoading(false)
          onCanPlay?.(e)
        }}
        {...videoProps}
      >
        {src ? <source src={src} type={type} /> : null}
      </video>
      {loading && src && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35"
          aria-hidden
        >
          <Loader2 className="h-10 w-10 animate-spin text-white/90" />
        </div>
      )}
    </div>
  )
}
