import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { brandKitSchema, BrandKitFormValues } from './brandSchemas';
import { Palette, Upload, Check, Trash2, Eye, ShieldCheck, HardDrive } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Slider } from '../../components/ui/Slider';
import { apiClient, BrandKitConfig } from '../../services/apiClient';

const DEFAULT_BRAND_KIT: BrandKitFormValues = {
  brandName: '',
  primaryColor: '#8b5cf6',
  secondaryColor: '#f1f3f9',
  fontFamily: 'Inter',
  watermarkPosition: 'bottom-right',
  watermarkOpacity: 80,
};

export const BrandAssetsPage: React.FC = () => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [watermarkSize, setWatermarkSize] = useState<number>(15);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BrandKitFormValues>({
    resolver: zodResolver(brandKitSchema),
    defaultValues: DEFAULT_BRAND_KIT,
  });

  const watchedValues = watch();

  // Load from backend API on mount
  useEffect(() => {
    const loadBrandKit = async () => {
      try {
        const kit = await apiClient.getBrandKit();
        const fetchedBrand = kit.brandName === 'Nova Studio Productions' ? '' : (kit.brandName || '');
        reset({
          brandName: fetchedBrand,
          primaryColor: kit.primaryColor || DEFAULT_BRAND_KIT.primaryColor,
          secondaryColor: kit.secondaryColor || DEFAULT_BRAND_KIT.secondaryColor,
          fontFamily: (kit.fontFamily as any) || DEFAULT_BRAND_KIT.fontFamily,
          watermarkPosition: kit.watermarkPosition || DEFAULT_BRAND_KIT.watermarkPosition,
          watermarkOpacity: kit.watermarkOpacity || DEFAULT_BRAND_KIT.watermarkOpacity,
        });
        if (kit.logoUrl) {
          setLogoUrl(apiClient.getVideoFileUrl(kit.logoUrl));
        }
        if (kit.watermarkSizePercent) {
          setWatermarkSize(kit.watermarkSizePercent);
        }
      } catch (err) {
        console.warn('Could not load brand kit from backend API:', err);
      }
    };
    loadBrandKit();
  }, [reset]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingLogo(true);
      try {
        const res = await apiClient.uploadBrandLogo(file);
        setLogoUrl(apiClient.getVideoFileUrl(res.logoUrl));
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      } catch (err: any) {
        alert('Failed to upload logo: ' + err.message);
      } finally {
        setIsUploadingLogo(false);
      }
    }
  };

  const handleRemoveLogo = async () => {
    setLogoUrl(null);
    try {
      await apiClient.updateBrandKit({
        logoFilename: null,
        logoPath: null,
        logoUrl: null,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      alert('Failed to remove logo: ' + err.message);
    }
  };

  const onSubmit = async (data: BrandKitFormValues) => {
    setIsSaving(true);
    try {
      await apiClient.updateBrandKit({
        ...data,
        watermarkSizePercent: watermarkSize,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      alert('Failed to save brand kit: ' + err.message);
    } finally {
      setIsSaving(false);
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
            Configure visual identities, watermarks, and typography applied across automated video exports. Saved directly to backend storage.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          isLoading={isSaving}
          onClick={handleSubmit(onSubmit)}
          leftIcon={savedSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : undefined}
        >
          {savedSuccess ? 'Brand Kit Saved' : 'Save Brand Kit'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Form Controls */}
        <form onSubmit={handleSubmit(onSubmit)} className="bg-studio-surface border border-studio-border rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-studio-text">Core Visual Identity</h3>
            <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5" />
              backend/storage/brand/
            </span>
          </div>

          <Input
            label="Organization / Channel Name"
            placeholder="Your Studio / Brand Name"
            {...register('brandName')}
            error={errors.brandName?.message}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-studio-muted">
                Primary Brand Accent (Captions & Titles)
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
              Logo Watermark Graphic (PNG with Transparency)
            </label>

            {logoUrl ? (
              <div className="flex items-center justify-between p-3 bg-studio-card border border-studio-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded bg-black/60 border border-studio-border p-1 flex items-center justify-center">
                    <img src={logoUrl} alt="Watermark" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-studio-text">Active Watermark</span>
                    <span className="text-[11px] text-emerald-400 font-mono block">Saved in backend/storage/brand/</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveLogo}
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
                  disabled={isUploadingLogo}
                  className="hidden"
                />
                <Upload className="w-6 h-6 text-violet-400 mb-2" />
                <span className="text-xs font-semibold text-studio-text">
                  {isUploadingLogo ? 'Uploading to backend storage...' : 'Upload Watermark Graphic'}
                </span>
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

          {/* Watermark Opacity Slider */}
          <div className="space-y-2 pt-2 border-t border-studio-border">
            <div className="flex justify-between items-center text-xs font-medium">
              <span className="text-studio-muted">Watermark Opacity</span>
              <span className="text-studio-text font-mono">{watchedValues.watermarkOpacity}%</span>
            </div>
            <Slider
              min={10}
              max={100}
              step={5}
              value={watchedValues.watermarkOpacity}
              onChange={(val) => setValue('watermarkOpacity', val)}
            />
          </div>

          {/* Watermark Size Slider */}
          <div className="space-y-2 pt-2 border-t border-studio-border">
            <div className="flex justify-between items-center text-xs font-medium">
              <span className="text-studio-muted">Watermark Size (% of frame width)</span>
              <span className="text-studio-text font-mono">{watermarkSize}%</span>
            </div>
            <Slider
              min={5}
              max={35}
              step={1}
              value={watermarkSize}
              onChange={(val) => setWatermarkSize(val)}
            />
          </div>
        </form>

        {/* Live Preview Monitor */}
        <div className="bg-studio-surface border border-studio-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-studio-text">Composite Mockup Preview</h3>
          </div>

          <div className="relative aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-studio-border flex items-center justify-center">
            {/* Background mockup graphic */}
            <div className="absolute inset-0 bg-gradient-to-tr from-neutral-950 via-neutral-900 to-neutral-800 opacity-90" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center z-10">
              <span className="text-xs font-bold uppercase tracking-widest text-white/50">
                Automated Export Canvas
              </span>
              <p
                style={{ color: watchedValues.primaryColor, fontFamily: watchedValues.fontFamily }}
                className="text-lg font-black tracking-tight"
              >
                {watchedValues.brandName || 'Your Brand'}
              </p>
              <div
                style={{ backgroundColor: watchedValues.primaryColor }}
                className="px-3 py-1 rounded text-white text-xs font-bold shadow-md"
              >
                Highlighted Caption Word
              </div>
            </div>

            {/* Simulated Watermark Overlay */}
            {logoUrl && (
              <div
                style={{
                  opacity: watchedValues.watermarkOpacity / 100,
                  width: `${watermarkSize * 1.5}%`,
                }}
                className={`absolute p-4 z-20 pointer-events-none transition-all ${
                  watchedValues.watermarkPosition === 'top-left'
                    ? 'top-0 left-0'
                    : watchedValues.watermarkPosition === 'top-right'
                    ? 'top-0 right-0'
                    : watchedValues.watermarkPosition === 'bottom-left'
                    ? 'bottom-0 left-0'
                    : 'bottom-0 right-0'
                }`}
              >
                <img src={logoUrl} alt="Watermark overlay" className="max-w-full h-auto drop-shadow-md object-contain" />
              </div>
            )}
          </div>

          <div className="p-3 bg-studio-card border border-studio-border rounded-lg space-y-1.5 text-xs text-studio-muted">
            <div className="flex items-center justify-between text-white font-medium">
              <span>Safe-Zone Margins</span>
              <span className="text-emerald-400 font-mono">Libass + FFmpeg</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              When rendering, watermarks and captions automatically obey TikTok and Instagram Reels safe-margin boundaries (minimum 240px bottom margin for 9:16 vertical videos).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
