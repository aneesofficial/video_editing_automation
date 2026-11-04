import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { brandKitSchema, BrandKitFormValues } from './brandSchemas';
import { Palette, Upload, Check, Trash2, Eye } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Slider } from '../../components/ui/Slider';

interface BrandKitState extends BrandKitFormValues {
  logoDataUrl: string | null;
}

const BRAND_STORAGE_KEY = 'novacut_brand_kit_v1';

const DEFAULT_BRAND_KIT: BrandKitState = {
  brandName: 'Nova Studio Productions',
  primaryColor: '#8b5cf6',
  secondaryColor: '#f1f3f9',
  fontFamily: 'Inter',
  watermarkPosition: 'bottom-right',
  watermarkOpacity: 80,
  logoDataUrl: null,
};

export const BrandAssetsPage: React.FC = () => {
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(() => {
    try {
      const data = localStorage.getItem(BRAND_STORAGE_KEY);
      return data ? JSON.parse(data).logoDataUrl : null;
    } catch {
      return null;
    }
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BrandKitFormValues>({
    resolver: zodResolver(brandKitSchema),
    defaultValues: (() => {
      try {
        const data = localStorage.getItem(BRAND_STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          return {
            brandName: parsed.brandName || DEFAULT_BRAND_KIT.brandName,
            primaryColor: parsed.primaryColor || DEFAULT_BRAND_KIT.primaryColor,
            secondaryColor: parsed.secondaryColor || DEFAULT_BRAND_KIT.secondaryColor,
            fontFamily: parsed.fontFamily || DEFAULT_BRAND_KIT.fontFamily,
            watermarkPosition: parsed.watermarkPosition || DEFAULT_BRAND_KIT.watermarkPosition,
            watermarkOpacity: parsed.watermarkOpacity || DEFAULT_BRAND_KIT.watermarkOpacity,
          };
        }
      } catch {
        // fallback
      }
      return DEFAULT_BRAND_KIT;
    })(),
  });

  const watchedValues = watch();

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setLogoDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: BrandKitFormValues) => {
    try {
      const combined: BrandKitState = {
        ...data,
        logoDataUrl,
      };
      localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify(combined));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (e) {
      console.error('Failed to save brand kit:', e);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-studio-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-violet-400" />
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Brand Assets & Styling Kit
            </h2>
          </div>
          <p className="text-xs text-studio-muted mt-1">
            Configure visual identities, watermarks, and typography applied across automated video exports.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleSubmit(onSubmit)}
          leftIcon={savedSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : undefined}
        >
          {savedSuccess ? 'Brand Kit Saved' : 'Save Brand Kit'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Form Controls */}
        <form onSubmit={handleSubmit(onSubmit)} className="bg-studio-surface border border-studio-border rounded-xl p-5 space-y-5">
          <h3 className="text-sm font-semibold text-studio-text">Core Visual Identity</h3>

          <Input
            label="Organization / Channel Name"
            {...register('brandName')}
            error={errors.brandName?.message}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-studio-muted">
                Primary Brand Accent
              </label>
              <div className="flex items-center gap-2 bg-studio-card border border-studio-border rounded-lg p-2">
                <input
                  type="color"
                  value={watchedValues.primaryColor}
                  onChange={(e) => setValue('primaryColor', e.target.value)}
                  className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                />
                <span className="font-mono text-xs text-studio-text">{watchedValues.primaryColor}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-studio-muted">
                Secondary Accent
              </label>
              <div className="flex items-center gap-2 bg-studio-card border border-studio-border rounded-lg p-2">
                <input
                  type="color"
                  value={watchedValues.secondaryColor}
                  onChange={(e) => setValue('secondaryColor', e.target.value)}
                  className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                />
                <span className="font-mono text-xs text-studio-text">{watchedValues.secondaryColor}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-studio-muted">
              Subtitle & Typography
            </label>
            <select
              {...register('fontFamily')}
              className="w-full bg-studio-card border border-studio-border text-studio-text text-sm rounded-lg px-3 py-2 focus:outline-none"
            >
              <option value="Inter">Inter (Clean Modern Sans)</option>
              <option value="Roboto">Roboto (Geometric Neutral)</option>
              <option value="Montserrat">Montserrat (Bold Punchy)</option>
              <option value="Oswald">Oswald (Condensed Impact)</option>
              <option value="Bebas Neue">Bebas Neue (Viral Headline)</option>
            </select>
          </div>

          {/* Logo Watermark File Upload */}
          <div className="space-y-2 pt-2 border-t border-studio-border">
            <label className="block text-xs font-medium text-studio-muted">
              Logo Watermark Graphic (PNG with Alpha)
            </label>

            {logoDataUrl ? (
              <div className="flex items-center justify-between p-3 bg-studio-card border border-studio-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded bg-black/60 border border-studio-border p-1 flex items-center justify-center">
                    <img src={logoDataUrl} alt="Watermark" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-studio-text">Active Watermark</span>
                    <span className="text-[11px] text-studio-subtle block">PNG Alpha Channel Loaded</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setLogoDataUrl(null)}
                  className="text-rose-400 hover:text-rose-300"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-studio-border hover:border-violet-500/50 rounded-xl cursor-pointer bg-studio-card/50 transition-colors">
                <input
                  type="file"
                  accept="image/png,image/svg+xml,image/jpeg"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Upload className="w-6 h-6 text-violet-400 mb-2" />
                <span className="text-xs font-semibold text-studio-text">Upload Watermark Graphic</span>
                <span className="text-[11px] text-studio-subtle mt-0.5">PNG or SVG with transparent background</span>
              </label>
            )}
          </div>

          {/* Watermark Placement Corner */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-studio-muted">
              Watermark Placement Corner
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'top-left', label: 'Top Left' },
                  { id: 'top-right', label: 'Top Right' },
                  { id: 'bottom-left', label: 'Bottom Left' },
                  { id: 'bottom-right', label: 'Bottom Right' },
                ] as const
              ).map((pos) => (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() => setValue('watermarkPosition', pos.id)}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                    watchedValues.watermarkPosition === pos.id
                      ? 'bg-violet-600/15 border-violet-500 text-violet-300'
                      : 'bg-studio-card border-studio-border text-studio-muted hover:text-studio-text'
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          <Slider
            label="Watermark Opacity"
            min={10}
            max={100}
            step={5}
            value={watchedValues.watermarkOpacity || 80}
            onChange={(val) => setValue('watermarkOpacity', val)}
            valueDisplay={`${watchedValues.watermarkOpacity || 80}%`}
          />
        </form>

        {/* Live Canvas Preview */}
        <div className="bg-studio-surface border border-studio-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-studio-text">Live Brand Composite Preview</h3>
          </div>

          <div className="relative aspect-video w-full bg-[#0b0c10] border border-studio-border rounded-lg overflow-hidden flex items-center justify-center p-6 shadow-inner">
            <div className="absolute inset-0 bg-gradient-to-tr from-zinc-950 via-zinc-900 to-zinc-950 opacity-90" />

            <div className="relative z-10 text-center max-w-sm">
              <span
                style={{ fontFamily: watchedValues.fontFamily, color: watchedValues.secondaryColor }}
                className="text-sm md:text-base font-bold drop-shadow-md"
              >
                "AI-driven automated video production delivers unmatched velocity."
              </span>
              <div
                style={{ backgroundColor: watchedValues.primaryColor }}
                className="h-1 w-12 mx-auto rounded-full mt-2"
              />
            </div>

            {logoDataUrl ? (
              <img
                src={logoDataUrl}
                alt="Brand Watermark"
                className={`absolute w-12 h-12 object-contain pointer-events-none transition-all ${
                  watchedValues.watermarkPosition === 'top-left' ? 'top-3 left-3' : ''
                } ${watchedValues.watermarkPosition === 'top-right' ? 'top-3 right-3' : ''} ${
                  watchedValues.watermarkPosition === 'bottom-left' ? 'bottom-3 left-3' : ''
                } ${watchedValues.watermarkPosition === 'bottom-right' ? 'bottom-3 right-3' : ''}`}
                style={{ opacity: (watchedValues.watermarkOpacity || 80) / 100 }}
              />
            ) : (
              <div
                className={`absolute pointer-events-none px-2 py-1 rounded bg-black/60 border border-white/10 font-mono text-[10px] text-white/80 ${
                  watchedValues.watermarkPosition === 'top-left' ? 'top-3 left-3' : ''
                } ${watchedValues.watermarkPosition === 'top-right' ? 'top-3 right-3' : ''} ${
                  watchedValues.watermarkPosition === 'bottom-left' ? 'bottom-3 left-3' : ''
                } ${watchedValues.watermarkPosition === 'bottom-right' ? 'bottom-3 right-3' : ''}`}
                style={{ opacity: (watchedValues.watermarkOpacity || 80) / 100 }}
              >
                {watchedValues.brandName}
              </div>
            )}
          </div>

          <div className="p-4 bg-studio-card border border-studio-border rounded-lg space-y-1 text-xs text-studio-muted">
            <span className="font-semibold text-studio-text block">Local Asset Persistence:</span>
            <p>
              Brand presets and graphic logos remain loaded in your browser environment and automatically format generated caption burned-ins and timeline overlays.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

