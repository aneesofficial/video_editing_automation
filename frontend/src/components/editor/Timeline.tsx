import React, { useRef, useState, MouseEvent } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Scissors,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Trash2,
  Layers,
} from 'lucide-react';
import { useWorkspace } from '../../store/WorkspaceContext';
import { formatTimecode, formatSimpleDuration } from '../../utils/formatters';
import { TimelineClip, TimelineTrack } from '../../types/timeline';

export const Timeline: React.FC = () => {
  const {
    currentTime,
    duration,
    timelineTracks,
    timelineZoom,
    setTimelineZoom,
    seek,
    splitClipAtPlayhead,
    deleteClip,
    videoMetadata,
  } = useWorkspace();

  const timelineContainerRef = useRef<HTMLDivElement | null>(null);
  const [, setIsScrubbing] = useState(false);

  const [trackStates, setTrackStates] = useState<Record<string, { muted: boolean; locked: boolean; hidden: boolean }>>({
    'track-v1': { muted: false, locked: false, hidden: false },
    'track-v2': { muted: false, locked: false, hidden: false },
    'track-a1': { muted: false, locked: false, hidden: false },
    'track-a2': { muted: false, locked: false, hidden: false },
    'track-txt': { muted: false, locked: false, hidden: false },
  });

  const toggleTrackMute = (trackId: string) => {
    setTrackStates((prev) => ({
      ...prev,
      [trackId]: { ...prev[trackId], muted: !prev[trackId]?.muted },
    }));
  };

  const toggleTrackLock = (trackId: string) => {
    setTrackStates((prev) => ({
      ...prev,
      [trackId]: { ...prev[trackId], locked: !prev[trackId]?.locked },
    }));
  };

  const toggleTrackVisibility = (trackId: string) => {
    setTrackStates((prev) => ({
      ...prev,
      [trackId]: { ...prev[trackId], hidden: !prev[trackId]?.hidden },
    }));
  };

  const handleZoomIn = () => setTimelineZoom(Math.min(timelineZoom * 1.5, 4));
  const handleZoomOut = () => setTimelineZoom(Math.max(timelineZoom / 1.5, 0.75));
  const handleZoomReset = () => setTimelineZoom(1);

  const effectiveDuration = duration > 0 ? duration : 60;
  const basePixelsPerSecond = 18 * timelineZoom;
  const totalTimelineWidth = Math.max(800, effectiveDuration * basePixelsPerSecond);

  const calculateTimeFromClientX = (clientX: number): number => {
    if (!timelineContainerRef.current) return 0;
    const rect = timelineContainerRef.current.getBoundingClientRect();
    const scrollLeft = timelineContainerRef.current.scrollLeft;
    const clickX = clientX - rect.left + scrollLeft;
    const time = (clickX / totalTimelineWidth) * effectiveDuration;
    return Math.max(0, Math.min(time, duration || effectiveDuration));
  };

  const handleTimelineMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    setIsScrubbing(true);
    const newTime = calculateTimeFromClientX(e.clientX);
    seek(newTime);

    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const scrubTime = calculateTimeFromClientX(moveEvent.clientX);
      seek(scrubTime);
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const tickIntervalSeconds = timelineZoom > 2 ? 1 : timelineZoom > 1.2 ? 2 : 5;
  const tickCount = Math.ceil(effectiveDuration / tickIntervalSeconds);
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => i * tickIntervalSeconds);

  const playheadPixelPosition = (currentTime / effectiveDuration) * totalTimelineWidth;

  return (
    <div className="bg-studio-surface border border-studio-border rounded-xl overflow-hidden shadow-studio flex flex-col">
      {/* Toolbar */}
      <div className="h-11 px-4 bg-studio-card border-b border-studio-border flex items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-semibold text-studio-text">Multi-Track Sequence Timeline</span>
          {videoMetadata && (
            <span className="text-[11px] font-mono text-studio-muted hidden sm:inline">
              [{formatSimpleDuration(duration)}]
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={splitClipAtPlayhead}
            disabled={!videoMetadata}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-studio-surface border border-studio-border hover:border-violet-500/50 hover:text-white text-studio-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Split Clip at Playhead Position (S)"
          >
            <Scissors className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden sm:inline">Split</span>
          </button>

          <div className="h-4 w-px bg-studio-border mx-1" />

          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded hover:bg-studio-surface text-studio-muted hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="text-[11px] font-mono text-studio-subtle px-1">
            {Math.round(timelineZoom * 100)}%
          </span>

          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded hover:bg-studio-surface text-studio-muted hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleZoomReset}
            className="p-1.5 rounded hover:bg-studio-surface text-studio-muted hover:text-white"
            title="Fit to Screen"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Timeline Workspace Body */}
      <div className="flex flex-1 min-h-[220px] overflow-hidden">
        {/* Track Headers Column */}
        <div className="w-44 flex-shrink-0 bg-studio-card/80 border-r border-studio-border flex flex-col z-10 select-none">
          <div className="h-7 border-b border-studio-border px-3 flex items-center text-[10px] uppercase font-mono text-studio-subtle tracking-wider bg-studio-card">
            Tracks
          </div>

          {timelineTracks.map((track: TimelineTrack) => {
            const state = trackStates[track.id] || { muted: false, locked: false, hidden: false };
            return (
              <div
                key={track.id}
                className="h-12 border-b border-studio-border/60 px-3 flex items-center justify-between group hover:bg-studio-surface/50 transition-colors"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-semibold text-studio-muted group-hover:text-studio-text truncate">
                    {track.name}
                  </span>
                </div>

                <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                  {track.type.startsWith('audio') ? (
                    <button
                      onClick={() => toggleTrackMute(track.id)}
                      className="p-1 text-studio-subtle hover:text-violet-400"
                      title={state.muted ? 'Unmute Track' : 'Mute Track'}
                    >
                      {state.muted ? <VolumeX className="w-3 h-3 text-rose-400" /> : <Volume2 className="w-3 h-3" />}
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleTrackVisibility(track.id)}
                      className="p-1 text-studio-subtle hover:text-violet-400"
                      title={state.hidden ? 'Show Track' : 'Hide Track'}
                    >
                      {state.hidden ? <EyeOff className="w-3 h-3 text-amber-400" /> : <Eye className="w-3 h-3" />}
                    </button>
                  )}

                  <button
                    onClick={() => toggleTrackLock(track.id)}
                    className="p-1 text-studio-subtle hover:text-violet-400"
                    title={state.locked ? 'Unlock Track' : 'Lock Track'}
                  >
                    {state.locked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable Tracks Canvas */}
        <div
          ref={timelineContainerRef}
          onMouseDown={handleTimelineMouseDown}
          className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#0b0c10] select-none cursor-pointer"
        >
          <div style={{ width: `${totalTimelineWidth}px` }} className="relative min-h-full">
            {/* Timecode Ruler */}
            <div className="h-7 bg-studio-surface border-b border-studio-border relative flex items-center">
              {ticks.map((tickSec) => {
                const tickX = (tickSec / effectiveDuration) * totalTimelineWidth;
                return (
                  <div
                    key={tickSec}
                    className="absolute top-0 bottom-0 flex flex-col justify-end"
                    style={{ left: `${tickX}px` }}
                  >
                    <div className="h-2 w-px bg-studio-borderLight" />
                    <span className="text-[9px] font-mono text-studio-subtle -translate-x-1/2 select-none pointer-events-none pb-0.5">
                      {formatSimpleDuration(tickSec)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 z-30 pointer-events-none transition-all duration-75"
              style={{ left: `${playheadPixelPosition}px` }}
            >
              <div className="w-3 h-3.5 bg-violet-500 rounded-b-sm -translate-x-1/2 flex items-center justify-center shadow-lg">
                <div className="w-1 h-1 bg-white rounded-full"></div>
              </div>
              <div className="w-[1.5px] h-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.8)] -translate-x-1/2" />
            </div>

            {/* Track Lanes */}
            {timelineTracks.map((track: TimelineTrack) => {
              const state = trackStates[track.id] || { muted: false, locked: false, hidden: false };
              return (
                <div
                  key={track.id}
                  className={`h-12 border-b border-studio-border/30 relative flex items-center px-1 ${
                    state.hidden ? 'opacity-30' : ''
                  }`}
                >
                  {track.clips.map((clip: TimelineClip) => {
                    const clipLeft = (clip.startTime / effectiveDuration) * totalTimelineWidth;
                    const clipWidth = Math.max(12, (clip.duration / effectiveDuration) * totalTimelineWidth);

                    return (
                      <div
                        key={clip.id}
                        className="absolute h-9 rounded-md bg-violet-600/30 border border-violet-500/50 hover:border-violet-400 p-1.5 flex items-center justify-between overflow-hidden shadow-studio-sm cursor-grab active:cursor-grabbing group/clip"
                        style={{
                          left: `${clipLeft}px`,
                          width: `${clipWidth}px`,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[11px] font-medium text-violet-200 truncate">
                            {clip.title}
                          </span>
                          <span className="text-[9px] font-mono text-violet-300/80">
                            {formatSimpleDuration(clip.duration)}
                          </span>
                        </div>

                        <div className="absolute inset-0 pointer-events-none opacity-20 flex items-center justify-around px-2">
                          {Array.from({ length: 16 }).map((_, idx) => (
                            <div
                              key={idx}
                              className="w-0.5 bg-violet-300 rounded-full"
                              style={{ height: `${20 + ((idx * 17) % 65)}%` }}
                            />
                          ))}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteClip(clip.id);
                          }}
                          className="opacity-0 group-hover/clip:opacity-100 p-0.5 hover:text-rose-400 text-violet-300 transition-opacity z-10"
                          title="Remove clip segment"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}

                  {track.clips.length === 0 && (
                    <div className="text-[10px] text-studio-subtle italic px-4 select-none pointer-events-none">
                      {track.type === 'video'
                        ? 'Raw video will appear here once loaded'
                        : track.type === 'captions'
                        ? 'AI subtitles generated after processing'
                        : 'Awaiting AI pipeline generation'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-8 px-4 bg-studio-surface border-t border-studio-border flex items-center justify-between text-[11px] text-studio-muted font-mono">
        <div>
          <span>Playhead: </span>
          <span className="text-violet-400">{formatTimecode(currentTime)}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Clips: {timelineTracks.reduce((acc: number, t: TimelineTrack) => acc + t.clips.length, 0)}</span>
          <span>Snapping: ON</span>
          <span>Timeline Rate: 30.00 fps</span>
        </div>
      </div>
    </div>
  );
};
