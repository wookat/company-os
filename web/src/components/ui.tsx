import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { useApp } from '@/lib/store'

export const buttonVariants = cva(
  'btn-press inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-brand-500 text-white hover:bg-brand-600',
        rose: 'bg-rose-500 text-white hover:bg-rose-600',
        outline: 'bg-white border border-black/10 text-ink-2 hover:bg-page',
        ghost: 'text-ink-2 hover:bg-black/5',
        soft: 'bg-brand-50 text-brand-600 hover:bg-brand-100',
        roseSoft: 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100',
      },
      size: {
        lg: 'h-12 px-6 rounded-xl text-[15px]',
        md: 'h-11 px-5 rounded-xl text-sm',
        sm: 'min-h-[36px] px-4 py-1.5 rounded-xl text-xs',
        chip: 'min-h-[32px] px-3 py-1.5 rounded-full text-xs font-medium',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
)
Button.displayName = 'Button'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-white rounded-2xl border border-black/5 shadow-card', className)}
      {...props}
    />
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-sm placeholder:text-ink-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export function Chip({
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={cn(
        'btn-press min-h-[32px] px-3 py-1.5 rounded-full text-xs whitespace-nowrap',
        active ? 'bg-brand-50 text-brand-600 font-medium' : 'bg-black/5 text-ink-2 hover:bg-black/10',
        className
      )}
      {...props}
    />
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-xl', className)} />
}

export function PageSkeleton() {
  return (
    <div className="space-y-4 py-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-24" />
    </div>
  )
}

export function Ring({
  pct,
  color,
  size = 128,
  stroke = 10,
  children,
}: {
  pct: number
  color: string
  size?: number
  stroke?: number
  children?: React.ReactNode
}) {
  const R = 52
  const C = 2 * Math.PI * R
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="-rotate-90" width={size} height={size}>
        <circle cx="60" cy="60" r={R} fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - Math.max(pct, 3) / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

export function ToastHost() {
  const { toasts } = useApp()
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] space-y-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'fade-in rounded-xl px-4 py-3 text-sm text-white shadow-lg text-center',
            t.ok ? 'bg-ok-600' : 'bg-ink/90'
          )}
        >
          {t.msg}
          {t.action ? (
            <button
              onClick={() => {
                location.hash = t.action!.hash
              }}
              className="pointer-events-auto ml-2 inline-flex min-h-[32px] items-center rounded-full bg-white/20 px-3 py-0.5 font-semibold underline-offset-2 hover:bg-white/30"
            >
              {t.action.label}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  )
}

export function ConfirmHost() {
  const { confirmReq } = useApp()
  if (!confirmReq) return null
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/40 p-4">
      <Card className="fade-in w-full max-w-sm p-5">
        <p className="text-sm leading-6">{confirmReq.msg}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => confirmReq.resolve(false)}>
            {confirmReq.cancelText}
          </Button>
          <Button size="sm" onClick={() => confirmReq.resolve(true)}>
            {confirmReq.okText}
          </Button>
        </div>
      </Card>
    </div>
  )
}
