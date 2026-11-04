import React from 'react';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function Tabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className = '',
  size = 'md',
}: TabsProps<T>) {
  const sizeClasses = size === 'sm' ? 'text-xs py-1 px-2.5 gap-1.5' : 'text-sm py-1.5 px-3.5 gap-2';

  return (
    <div className={`flex items-center gap-1 bg-studio-surface p-1 rounded-lg border border-studio-border ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center font-medium rounded-md transition-all duration-150 ${sizeClasses} ${
              isActive
                ? 'bg-studio-card text-white shadow-studio-sm border border-studio-borderLight'
                : 'text-studio-muted hover:text-studio-text hover:bg-studio-card/50 border border-transparent'
            }`}
          >
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-violet-500/20 text-violet-300' : 'bg-studio-border text-studio-muted'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

