import React, { TextareaHTMLAttributes, forwardRef } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  showCount?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, showCount, maxLength, value, className = '', id, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const currentLength = typeof value === 'string' ? value.length : 0;

    return (
      <div className="w-full space-y-1.5">
        <div className="flex justify-between items-center">
          {label && (
            <label htmlFor={textareaId} className="block text-xs font-medium text-studio-muted">
              {label}
            </label>
          )}
          {showCount && maxLength && (
            <span className="text-[11px] font-mono text-studio-subtle">
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
        <textarea
          id={textareaId}
          ref={ref}
          value={value}
          maxLength={maxLength}
          className={`w-full bg-studio-surface border ${
            error ? 'border-rose-500/80 focus:border-rose-500' : 'border-studio-border focus:border-violet-500/80'
          } text-studio-text placeholder-studio-subtle text-sm rounded-lg p-3 transition-colors duration-150 focus:outline-none focus:ring-1 ${
            error ? 'focus:ring-rose-500/30' : 'focus:ring-violet-500/30'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
        {!error && helperText && <p className="text-xs text-studio-subtle mt-1">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

