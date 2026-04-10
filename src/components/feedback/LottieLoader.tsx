import { useLottie } from 'lottie-react'
import { loaderAnimation } from '../../assets/lottie/loaderAnimation'
import { cn } from '../../lib/utils'

export function LottieLoader({
  className,
  size = 88,
  'aria-label': ariaLabel = 'Loading',
}: {
  className?: string
  size?: number
  'aria-label'?: string
}) {
  const { View } = useLottie(
    {
      animationData: loaderAnimation,
      loop: true,
      className: cn('shrink-0 h-full w-full', className),
      role: 'img',
      'aria-label': ariaLabel,
    },
    { width: size, height: size },
  )
  return View
}
