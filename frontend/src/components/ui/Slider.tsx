import React from 'react';

export interface SliderProps {
  label?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  valueDisplay?: string | number;
  helperText?: string;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  valueDisplay,
  helperText,
  className = '',
}) => {
  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      <div className="flex justify-between items-center text-xs">
        {label && <span className="font-medium text-studio-muted">{label}</span>}
        <span className="font-mono text-violet-400 font-semibold">{valueDisplay ?? value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-studio-surface rounded-lg appearance-none cursor-pointer border border-studio-border focus:outline-none"
      />
      {helperText && <p className="text-[11px] text-studio-subtle">{helperText}</p>}
    </div>
  );
};

