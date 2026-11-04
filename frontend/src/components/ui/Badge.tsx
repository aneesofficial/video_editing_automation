import React from 'react';

export type BadgeVariant = 'violet' | 'emerald' | 'amber' | 'rose' | 'neutral' | 'blue';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
}) => {
  const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
    violet: {
      container: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
      dot: 'bg-violet-400',
    },
    emerald: {
      container: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      dot: 'bg-emerald-400',
    },
    amber: {
      container: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
      dot: 'bg-amber-400',
    },
    rose: {
      container: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
      dot: 'bg-rose-400',
    },
    blue: {
      container: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
      dot: 'bg-blue-400',
    },
    neutral: {
      container: 'bg-studio-surface text-studio-muted border-studio-border',
      dot: 'bg-studio-subtle',
    },
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${variantStyles[variant].container} ${sizeStyles[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${variantStyles[variant].dot}`} />}
      {children}
    </span>
  );
};

