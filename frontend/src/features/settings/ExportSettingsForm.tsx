import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { exportFormSchema, ExportFormValues } from './settingsSchemas';
import { useSettings } from '../../store/SettingsContext';
import { Button } from '../../components/ui/Button';
import { Check } from 'lucide-react';

export const ExportSettingsForm: React.FC = () => {
  const { settings, updateExportDefaults } = useSettings();
  const [saveSuccess, setSaveSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ExportFormValues>({
    resolver: zodResolver(exportFormSchema),
    defaultValues: {
      format: settings.exportDefaults.format,
      resolution: settings.exportDefaults.resolution,
      frameRate: settings.exportDefaults.frameRate,
      codec: settings.exportDefaults.codec,
      audioBitrate: settings.exportDefaults.audioBitrate,
      hardwareAcceleration: settings.exportDefaults.hardwareAcceleration,
    },
  });

  const onSubmit = (data: ExportFormValues) => {
    updateExportDefaults(data);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-studio-muted">Container Format</label>
          <select
            {...register('format')}
            className="w-full bg-studio-card border border-studio-border text-studio-text text-sm rounded-lg px-3 py-2 focus:outline-none"
          >
            <option value="mp4">MP4 (.mp4)</option>
            <option value="webm">WebM (.webm)</option>
            <option value="mov">QuickTime MOV (.mov)</option>
          </select>
          {errors.format && <p className="text-xs text-rose-400">{errors.format.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-studio-muted">Master Resolution</label>
          <select
            {...register('resolution')}
            className="w-full bg-studio-card border border-studio-border text-studio-text text-sm rounded-lg px-3 py-2 focus:outline-none"
          >
            <option value="1080p">1080p Full HD</option>
            <option value="4K">4K Ultra HD</option>
            <option value="720p">720p HD</option>
          </select>
          {errors.resolution && <p className="text-xs text-rose-400">{errors.resolution.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-studio-muted">Video Codec</label>
          <select
            {...register('codec')}
            className="w-full bg-studio-card border border-studio-border text-studio-text text-sm rounded-lg px-3 py-2 focus:outline-none"
          >
            <option value="h264">H.264 / AVC</option>
            <option value="hevc">HEVC / H.265</option>
            <option value="prores">Apple ProRes 422</option>
          </select>
          {errors.codec && <p className="text-xs text-rose-400">{errors.codec.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-studio-muted">Default Frame Rate</label>
          <select
            {...register('frameRate')}
            className="w-full bg-studio-card border border-studio-border text-studio-text text-sm rounded-lg px-3 py-2 focus:outline-none"
          >
            <option value="24fps">24 fps (Cinematic)</option>
            <option value="30fps">30 fps (Web Standard)</option>
            <option value="60fps">60 fps (High Motion)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-studio-muted">Audio Sample Bitrate</label>
          <select
            {...register('audioBitrate')}
            className="w-full bg-studio-card border border-studio-border text-studio-text text-sm rounded-lg px-3 py-2 focus:outline-none"
          >
            <option value="128k">128 kbps (Standard)</option>
            <option value="192k">192 kbps (Studio Quality)</option>
            <option value="320k">320 kbps (Audiophile Master)</option>
          </select>
        </div>
      </div>

      <div className="pt-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            {...register('hardwareAcceleration')}
            className="w-4 h-4 rounded text-violet-600 bg-studio-surface border-studio-border"
          />
          <div>
            <span className="text-xs font-semibold text-studio-text block">GPU Hardware Acceleration</span>
            <span className="text-[11px] text-studio-muted">
              Pass NVENC / VideoToolbox acceleration flags to backend export renderers.
            </span>
          </div>
        </label>
      </div>

      <div className="flex items-center justify-end pt-3 border-t border-studio-border">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!isDirty && !saveSuccess}
          leftIcon={saveSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : undefined}
        >
          {saveSuccess ? 'Export Presets Saved' : 'Save Presets'}
        </Button>
      </div>
    </form>
  );
};

