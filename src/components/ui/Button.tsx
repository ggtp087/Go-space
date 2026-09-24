import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-green-700 text-white hover:bg-green-600 disabled:hover:bg-green-700',
  secondary: 'bg-white border border-green-700 text-green-700 hover:bg-green-50',
  ghost: 'bg-transparent text-slate hover:bg-black/5',
}

export function Button({
  variant = 'primary',
  icon,
  iconPosition = 'right',
  fullWidth = false,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-[9px] px-4 text-[14px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        VARIANT_CLASS[variant]
      } ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {icon && iconPosition === 'left' && icon}
      {children}
      {icon && iconPosition === 'right' && icon}
    </button>
  )
}
