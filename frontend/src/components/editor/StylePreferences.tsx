import React from 'react';
import {
  Monitor,
  Smartphone,
  Square,
  RectangleVertical,
  Maximize2,
  SlidersHorizontal,
  Volume2,
  Subtitles,
  Sparkles,
  Scissors,
} from 'lucide-react';
import { useWorkspace } from '../../store/WorkspaceContext';
import { ASPECT_RATIOS, RESOLUTIONS, FRAME_RATES, EDITING_STYLES } from '../../utils/constants';
import { Slider } from '../ui/Slider';
import { AspectRatio } from '../../types/video';

export const StylePreferences: React.FC = () => {
  const {
    aspectRatio,
    setAspectRatio,
    resolution,
    setResolution,
    frameRate,
    setFrameRate,
    style,
    setStyle,
    pacingDensity,
    setPacingDensity,
    cutSilences,
    setCutSilences,
    generateCaptions,
    setGenerateCaptions,
    autoColorGrade,
    setAutoColorGrade,
    addBackgroundMusic,
    setAddBackgroundMusic,
    musicMood,
    setMusicMood,
  } = useWorkspace();

  const getAspectIcon = (id: AspectRatio) => {
    switch (id) {
      case '16:9': return <Monitor className="w-4 h-4" />;
      case '9:16': return <Smartphone className="w-4 h-4" />;
      case '1:1': return <Square className="w-4 h-4" />;
      case '4:5': return <RectangleVertical className="w-4 h-4" />;
      case '21:9': return <Maximize2 className="w-4 h-4" />;
    }
  };

  const pacingLabels: Record<number, string> = {
    1: 'Relaxed (Minimal cuts, broad pauses)',
    2: 'Narrative (Smooth cinematic breathing room)',
    3: 'Standard (Clean dialogue trimming)',
    4: 'Dynamic (Brisk pacing, energetic)',
    5: 'Aggressive (Jump-cut heavy, zero dead air)',
  };

  return (
    <div className="bg-studio-surface border border-studio-border rounded-xl p-5 space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-violet-600/10 text-violet-400 border border-violet-500/20">
          <SlidersHorizontal className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-studio-text">Editing & Format Preferences</h3>
          <p className="text-xs text-studio-muted">
            Configure composition targets, pacing density, and automated processing pipelines.
          </p>
        </div>
      </div>

      {/* 1. Target Aspect Ratio */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-studio-muted">
          Target Aspect Ratio
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {ASPECT_RATIOS.map((item) => {
            const isSelected = aspectRatio === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setAspectRatio(item.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${
                  isSelected
                    ? 'bg-violet-600/15 border-violet-500 text-white shadow-studio-sm'
                    : 'bg-studio-card border-studio-border hover:border-studio-borderLight text-studio-muted hover:text-studio-text'
                }`}
              >
                <div className={`mb-1.5 ${isSelected ? 'text-violet-400' : 'text-studio-subtle'}`}>
                  {getAspectIcon(item.id)}
                </div>
                <span className="text-xs font-semibold">{item.label}</span>
                <span className="text-[10px] text-studio-subtle truncate max-w-[90px] mt-0.5">
                  {item.sublabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Output Resolution & Frame Rate */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-studio-muted">
            Master Resolution
          </label>
          <div className="grid grid-cols-3 gap-2">
            {RESOLUTIONS.map((res) => {
              const isSelected = resolution === res.id;
              return (
                <button
                  key={res.id}
                  type="button"
                  onClick={() => setResolution(res.id)}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-medium transition-all text-center ${
                    isSelected
                      ? 'bg-violet-600/15 border-violet-500 text-violet-300'
                      : 'bg-studio-card border-studio-border text-studio-muted hover:text-studio-text hover:border-studio-borderLight'
                  }`}
                >
                  {res.id}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-studio-muted">
            Output Frame Rate
          </label>
          <div className="grid grid-cols-3 gap-2">
            {FRAME_RATES.map((fr) => {
              const isSelected = frameRate === fr.id;
              return (
                <button
                  key={fr.id}
                  type="button"
                  onClick={() => setFrameRate(fr.id)}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-medium transition-all text-center ${
                    isSelected
                      ? 'bg-violet-600/15 border-violet-500 text-violet-300'
                      : 'bg-studio-card border-studio-border text-studio-muted hover:text-studio-text hover:border-studio-borderLight'
                  }`}
                >
                  {fr.id}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Editing Style Presets */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-studio-muted">
          Creative Editing Style
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {EDITING_STYLES.map((st) => {
            const isSelected = style === st.id;
            return (
              <div
                key={st.id}
                onClick={() => {
                  setStyle(st.id);
                  setPacingDensity(st.defaultPacing);
                }}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-violet-600/10 border-violet-500 shadow-studio-sm'
                    : 'bg-studio-card border-studio-border hover:border-studio-borderLight'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-studio-text'}`}>
                    {st.label}
                  </span>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-violet-400"></span>
                  )}
                </div>
                <p className="text-[11px] text-studio-muted leading-relaxed line-clamp-2">
                  {st.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Cut Pacing Density Slider */}
      <div className="pt-2">
        <Slider
          label="Cut Rhythm & Pacing Density"
          min={1}
          max={5}
          step={1}
          value={pacingDensity}
          onChange={setPacingDensity}
          valueDisplay={`Level ${pacingDensity} / 5`}
          helperText={pacingLabels[pacingDensity]}
        />
      </div>

      {/* 5. Automated Modules Toggles */}
      <div className="space-y-2 pt-2 border-t border-studio-border/60">
        <label className="block text-xs font-medium text-studio-muted">
          Automated Processing Modules
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-3 p-3 rounded-lg bg-studio-card border border-studio-border cursor-pointer hover:border-studio-borderLight transition-colors">
            <input
              type="checkbox"
              checked={cutSilences}
              onChange={(e) => setCutSilences(e.target.checked)}
              className="w-4 h-4 rounded text-violet-600 bg-studio-surface border-studio-border focus:ring-violet-500"
            />
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-studio-muted" />
              <div>
                <span className="block text-xs font-semibold text-studio-text">Silence Trimming</span>
                <span className="text-[11px] text-studio-muted">Detects & trims audio gaps &gt; 0.4s</span>
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg bg-studio-card border border-studio-border cursor-pointer hover:border-studio-borderLight transition-colors">
            <input
              type="checkbox"
              checked={generateCaptions}
              onChange={(e) => setGenerateCaptions(e.target.checked)}
              className="w-4 h-4 rounded text-violet-600 bg-studio-surface border-studio-border focus:ring-violet-500"
            />
            <div className="flex items-center gap-2">
              <Subtitles className="w-4 h-4 text-studio-muted" />
              <div>
                <span className="block text-xs font-semibold text-studio-text">AI Word Captions</span>
                <span className="text-[11px] text-studio-muted">Speech transcription & highlight burn-in</span>
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg bg-studio-card border border-studio-border cursor-pointer hover:border-studio-borderLight transition-colors">
            <input
              type="checkbox"
              checked={autoColorGrade}
              onChange={(e) => setAutoColorGrade(e.target.checked)}
              className="w-4 h-4 rounded text-violet-600 bg-studio-surface border-studio-border focus:ring-violet-500"
            />
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-studio-muted" />
              <div>
                <span className="block text-xs font-semibold text-studio-text">Neural Color Grading</span>
                <span className="text-[11px] text-studio-muted">Automated contrast & tone balancing</span>
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg bg-studio-card border border-studio-border cursor-pointer hover:border-studio-borderLight transition-colors">
            <input
              type="checkbox"
              checked={addBackgroundMusic}
              onChange={(e) => setAddBackgroundMusic(e.target.checked)}
              className="w-4 h-4 rounded text-violet-600 bg-studio-surface border-studio-border focus:ring-violet-500"
            />
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-studio-muted" />
              <div>
                <span className="block text-xs font-semibold text-studio-text">Background Music Track</span>
                <span className="text-[11px] text-studio-muted">Auto-ducking soundtrack bed</span>
              </div>
            </div>
          </label>
        </div>

        {addBackgroundMusic && (
          <div className="p-3 bg-studio-card rounded-lg border border-studio-border space-y-1.5 mt-2">
            <span className="text-xs font-medium text-studio-muted">Music Mood Bed</span>
            <div className="grid grid-cols-4 gap-2">
              {(['chill', 'upbeat', 'cinematic', 'corporate'] as const).map((mood) => (
                <button
                  key={mood}
                  type="button"
                  onClick={() => setMusicMood(mood)}
                  className={`py-1.5 px-2 rounded text-xs capitalize transition-colors ${
                    musicMood === mood
                      ? 'bg-violet-600/20 text-violet-300 border border-violet-500/40 font-medium'
                      : 'bg-studio-surface text-studio-muted hover:text-studio-text'
                  }`}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
