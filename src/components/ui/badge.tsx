import * as React from 'react'
import { cn } from '../../lib/utils'

const Badge = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      'inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 shadow-sm',
      className,
    )}
    {...props}
  />
))
Badge.displayName = 'Badge'

export { Badge }
