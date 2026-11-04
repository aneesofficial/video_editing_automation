import React, { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'surface' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-studio-surface border-studio-border',
    surface: 'bg-studio-card border-studio-borderLight',
    glass: 'bg-studio-surface/80 backdrop-blur-md border-studio-border',
  };

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6 md:p-8',
  };

  return (
    <div
      className={`rounded-xl border ${variantStyles[variant]} ${paddingStyles[padding]} shadow-studio ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

