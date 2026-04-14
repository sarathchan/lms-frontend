import { memo, useMemo } from 'react'
import { useLottie } from 'lottie-react'
import { loginEducationAnimation } from '../../assets/lottie/loginEducationAnimation'
import { cn } from '../../lib/utils'

type LoginHeroLottieProps = {
  className?: string
  /** Smaller render size for embedding above a form in one card */
  compact?: boolean
  'aria-label'?: string
}

function LoginHeroLottieInner({
  className,
  compact,
  'aria-label': ariaLabel = 'Animation: student learning online at a desk',
}: LoginHeroLottieProps) {
  const dim = useMemo(
    () =>
      compact
        ? { width: 320, height: 320 }
        : { width: 600, height: 600 },
    [compact],
  )

  const lottieOptions = useMemo(
    () => ({
      animationData: loginEducationAnimation,
      loop: true,
      autoplay: true,
      className: 'h-auto w-full max-w-full',
      role: 'img' as const,
      'aria-label': ariaLabel,
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet' as const,
        progressiveLoad: true,
      },
    }),
    [ariaLabel],
  )

  const { View } = useLottie(lottieOptions, dim)

  return (
    <div
      className={cn(
        'relative mx-auto w-full select-none [&_svg]:h-auto [&_svg]:w-full',
        compact
          ? 'max-w-[min(100%,240px)]'
          : 'max-w-[min(100%,440px)]',
        className,
      )}
    >
      {View}
    </div>
  )
}

export const LoginHeroLottie = memo(LoginHeroLottieInner)
