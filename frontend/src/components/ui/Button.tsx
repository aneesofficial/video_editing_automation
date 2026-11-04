import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className = '',
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  disabled,
  leftIcon,
  rightIcon,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg select-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50';

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      'bg-violet-600 hover:bg-violet-500 text-white shadow-studio-sm active:bg-violet-700 border border-violet-500/50',
    secondary:
      'bg-studio-card hover:bg-studio-cardHover text-studio-text border border-studio-border hover:border-studio-borderLight shadow-studio-sm active:bg-studio-surface',
    outline:
      'bg-transparent hover:bg-studio-card hover:text-white text-studio-muted border border-studio-border active:bg-studio-surface',
    ghost:
      'bg-transparent hover:bg-studio-cardHover text-studio-muted hover:text-studio-text active:bg-studio-surface',
    danger:
      'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 active:bg-rose-500/30',
  };

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5 min-h-[30px]',
    md: 'text-sm px-3.5 py-2 gap-2 min-h-[38px]',
    lg: 'text-base px-5 py-2.5 gap-2.5 min-h-[44px]',
    icon: 'p-2 w-9 h-9 flex items-center justify-center',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
      )}
      {children && <span>{children}</span>}
      {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </button>
  );
};

