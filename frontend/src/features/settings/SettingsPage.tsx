import React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  User,
  Palette,
  Sliders,
  Music,
  Key,
  HardDrive,
  Activity,
} from 'lucide-react';
import { ProfileSettingsForm } from './ProfileSettingsForm';
import { BrandSettingsSection } from './BrandSettingsSection';
import { EditDefaultsSection } from './EditDefaultsSection';
import { MusicLibrarySection } from './MusicLibrarySection';
import { ServicesSection } from './ServicesSection';
import { SystemStorageSection } from './SystemStorageSection';
import { SystemCheckSection } from './SystemCheckSection';

type SettingsTab =
  | 'profile'
  | 'brand'
  | 'defaults'
  | 'music'
  | 'services'
  | 'storage'
  | 'system';

export const SettingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as SettingsTab) || 'profile';

  const setTab = (tab: SettingsTab) => {
    setSearchParams({ tab });
  };

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'brand', label: 'Brand', icon: Palette },
    { id: 'defaults', label: 'Edit defaults', icon: Sliders },
    { id: 'music', label: 'Music', icon: Music },
    { id: 'services', label: 'Services', icon: Key },
    { id: 'storage', label: 'Storage and Backup', icon: HardDrive },
    { id: 'system', label: 'System check', icon: Activity },
  ];

  return (
    <div className="p-6 md:p-8 max-w-[920px] mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-[#23262D] pb-4">
        <h1 className="text-xl font-semibold text-[#ECEDEF] tracking-tight">Settings</h1>
      </div>

      {/* Main Settings Layout: Left Tabs + Content */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left vertical tabs */}
        <div className="w-full md:w-52 flex-shrink-0 flex md:flex-col gap-1 border-b md:border-b-0 md:border-r border-[#23262D] pb-3 md:pb-0 md:pr-3 overflow-x-auto">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded transition-colors whitespace-nowrap text-left ${
                  active
                    ? 'bg-[#181A1F] text-[#C8A96A] border border-[#23262D]'
                    : 'text-[#8B909A] hover:text-[#ECEDEF] hover:bg-[#121317] border border-transparent'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 flex-shrink-0 ${
                    active ? 'text-[#C8A96A]' : 'text-[#8B909A]'
                  }`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 min-w-0 w-full">
          {activeTab === 'profile' && <ProfileSettingsForm />}
          {activeTab === 'brand' && <BrandSettingsSection />}
          {activeTab === 'defaults' && <EditDefaultsSection />}
          {activeTab === 'music' && <MusicLibrarySection />}
          {activeTab === 'services' && <ServicesSection />}
          {activeTab === 'storage' && <SystemStorageSection />}
          {activeTab === 'system' && <SystemCheckSection />}
        </div>
      </div>
    </div>
  );
};
