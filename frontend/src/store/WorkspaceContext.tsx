import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { AspectRatio, EditingStyle, FrameRate, VideoMetadata, VideoResolution } from '../types/video';
import { EditingPreferences } from '../types/ai';
import { TimelineClip, TimelineTrack } from '../types/timeline';
import { Project } from '../types/project';
import { validateVideoFile } from '../utils/validators';

interface WorkspaceContextType {
  // Video State
  videoFile: File | null;
  videoUrl: string | null;
  videoMetadata: VideoMetadata | null;
  isLoadingMedia: boolean;
  mediaError: string | null;

  // Playback State
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  
  // Player Controls
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  stepFrame: (frames: number) => void;
  setVolume: (val: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;
  registerVideoElement: (el: HTMLVideoElement | null) => void;

  // Media Actions
  loadVideoFile: (file: File) => Promise<boolean>;
  loadSampleVideo: () => void;
  clearVideo: () => void;

  // Editing Preferences & Prompt
  prompt: string;
  setPrompt: (text: string) => void;
  promptTags: string[];
  addPromptTag: (tag: string) => void;
  removePromptTag: (tag: string) => void;
  togglePromptTag: (tag: string) => void;
  
  aspectRatio: AspectRatio;
  setAspectRatio: (ar: AspectRatio) => void;
  resolution: VideoResolution;
  setResolution: (res: VideoResolution) => void;
  frameRate: FrameRate;
  setFrameRate: (fr: FrameRate) => void;
  style: EditingStyle;
  setStyle: (style: EditingStyle) => void;
  pacingDensity: number;
  setPacingDensity: (val: number) => void;

  cutSilences: boolean;
  setCutSilences: (val: boolean) => void;
  generateCaptions: boolean;
  setGenerateCaptions: (val: boolean) => void;
  autoColorGrade: boolean;
  setAutoColorGrade: (val: boolean) => void;
  addBackgroundMusic: boolean;
  setAddBackgroundMusic: (val: boolean) => void;
  musicMood: 'upbeat' | 'chill' | 'cinematic' | 'corporate' | 'none';
  setMusicMood: (mood: 'upbeat' | 'chill' | 'cinematic' | 'corporate' | 'none') => void;

  // Timeline State
  timelineTracks: TimelineTrack[];
  setTimelineTracks: React.Dispatch<React.SetStateAction<TimelineTrack[]>>;
  timelineZoom: number;
  setTimelineZoom: (zoom: number) => void;
  splitClipAtPlayhead: () => void;
  deleteClip: (clipId: string) => void;
  applyAIEditingPlan: (plan: {
    summary: string;
    clips: Array<{ sourceIn: number; sourceOut: number; speed?: number }>;
    captions?: Array<{ startTime: number; endTime: number; text: string }>;
  }) => void;

  // Project persistence
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
  projectTitle: string;
  setProjectTitle: (title: string) => void;
  isDirty: boolean;
  getPreferencesSnapshot: () => EditingPreferences;
  loadProjectData: (project: Project) => void;
  resetWorkspace: () => void;

  // Inspector modal
  isPayloadModalOpen: boolean;
  setIsPayloadModalOpen: (open: boolean) => void;
}

const DEFAULT_TRACKS: TimelineTrack[] = [
  { id: 'track-v1', name: 'V1 • Primary Video', type: 'video', isMuted: false, isLocked: false, isVisible: true, clips: [] },
  { id: 'track-v2', name: 'V2 • B-Roll & Visuals', type: 'b-roll', isMuted: false, isLocked: false, isVisible: true, clips: [] },
  { id: 'track-a1', name: 'A1 • Dialogue Audio', type: 'audio-dialogue', isMuted: false, isLocked: false, isVisible: true, clips: [] },
  { id: 'track-a2', name: 'A2 • Music & Sound FX', type: 'audio-music', isMuted: false, isLocked: false, isVisible: true, clips: [] },
  { id: 'track-txt', name: 'TXT • AI Captions', type: 'captions', isMuted: false, isLocked: false, isVisible: true, clips: [] },
];

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Playback state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // Prompt and Preferences
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState('Untitled Project');
  const [isDirty, setIsDirty] = useState(false);

  const [prompt, setPromptState] = useState('');
  const [promptTags, setPromptTags] = useState<string[]>([
    'Cut all awkward silences > 0.4s',
    'Auto-generate animated captions',
  ]);
  const [aspectRatio, setAspectRatioState] = useState<AspectRatio>('16:9');
  const [resolution, setResolutionState] = useState<VideoResolution>('1080p');
  const [frameRate, setFrameRateState] = useState<FrameRate>('30fps');
  const [style, setStyleState] = useState<EditingStyle>('viral-fast');
  const [pacingDensity, setPacingDensityState] = useState<number>(4);

  const [cutSilences, setCutSilencesState] = useState(true);
  const [generateCaptions, setGenerateCaptionsState] = useState(true);
  const [autoColorGrade, setAutoColorGradeState] = useState(false);
  const [addBackgroundMusic, setAddBackgroundMusicState] = useState(false);
  const [musicMood, setMusicMoodState] = useState<'upbeat' | 'chill' | 'cinematic' | 'corporate' | 'none'>('chill');

  // Timeline
  const [timelineTracks, setTimelineTracks] = useState<TimelineTrack[]>(DEFAULT_TRACKS);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [isPayloadModalOpen, setIsPayloadModalOpen] = useState(false);

  const setPrompt = (val: string) => {
    setPromptState(val);
    setIsDirty(true);
  };

  const setAspectRatio = (ar: AspectRatio) => {
    setAspectRatioState(ar);
    setIsDirty(true);
  };

  const setResolution = (res: VideoResolution) => {
    setResolutionState(res);
    setIsDirty(true);
  };

  const setFrameRate = (fr: FrameRate) => {
    setFrameRateState(fr);
    setIsDirty(true);
  };

  const setStyle = (s: EditingStyle) => {
    setStyleState(s);
    setIsDirty(true);
  };

  const setPacingDensity = (val: number) => {
    setPacingDensityState(val);
    setIsDirty(true);
  };

  const setCutSilences = (val: boolean) => {
    setCutSilencesState(val);
    setIsDirty(true);
  };

  const setGenerateCaptions = (val: boolean) => {
    setGenerateCaptionsState(val);
    setIsDirty(true);
  };

  const setAutoColorGrade = (val: boolean) => {
    setAutoColorGradeState(val);
    setIsDirty(true);
  };

  const setAddBackgroundMusic = (val: boolean) => {
    setAddBackgroundMusicState(val);
    setIsDirty(true);
  };

  const setMusicMood = (mood: 'upbeat' | 'chill' | 'cinematic' | 'corporate' | 'none') => {
    setMusicMoodState(mood);
    setIsDirty(true);
  };

  const addPromptTag = (tag: string) => {
    if (!promptTags.includes(tag)) {
      setPromptTags((prev) => [...prev, tag]);
      setIsDirty(true);
    }
  };

  const removePromptTag = (tag: string) => {
    setPromptTags((prev) => prev.filter((t) => t !== tag));
    setIsDirty(true);
  };

  const togglePromptTag = (tag: string) => {
    if (promptTags.includes(tag)) {
      removePromptTag(tag);
    } else {
      addPromptTag(tag);
    }
  };

  const registerVideoElement = useCallback((el: HTMLVideoElement | null) => {
    videoElementRef.current = el;
    if (el) {
      el.volume = isMuted ? 0 : volume;
      el.playbackRate = playbackRate;
    }
  }, [volume, isMuted, playbackRate]);

  // Video element event sync
  useEffect(() => {
    const el = videoElementRef.current;
    if (!el) return;

    const handleTimeUpdate = () => setCurrentTime(el.currentTime);
    const handleDurationChange = () => setDuration(el.duration || 0);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    el.addEventListener('timeupdate', handleTimeUpdate);
    el.addEventListener('durationchange', handleDurationChange);
    el.addEventListener('play', handlePlay);
    el.addEventListener('pause', handlePause);
    el.addEventListener('ended', handleEnded);

    return () => {
      el.removeEventListener('timeupdate', handleTimeUpdate);
      el.removeEventListener('durationchange', handleDurationChange);
      el.removeEventListener('play', handlePlay);
      el.removeEventListener('pause', handlePause);
      el.removeEventListener('ended', handleEnded);
    };
  }, [videoUrl]);

  const play = () => {
    videoElementRef.current?.play().catch((e) => console.warn('Play interrupted:', e));
  };

  const pause = () => {
    videoElementRef.current?.pause();
  };

  const togglePlay = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const seek = (seconds: number) => {
    const clamped = Math.max(0, Math.min(seconds, duration));
    if (videoElementRef.current) {
      videoElementRef.current.currentTime = clamped;
    }
    setCurrentTime(clamped);
  };

  const stepFrame = (deltaFrames: number) => {
    const fps = 30;
    const newTime = currentTime + deltaFrames / fps;
    seek(newTime);
  };

  const setVolume = (val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    if (videoElementRef.current) {
      videoElementRef.current.volume = isMuted ? 0 : clamped;
    }
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoElementRef.current) {
      videoElementRef.current.volume = nextMuted ? 0 : volume;
    }
  };

  const setPlaybackRate = (rate: number) => {
    setPlaybackRateState(rate);
    if (videoElementRef.current) {
      videoElementRef.current.playbackRate = rate;
    }
  };

  // Helper to construct timeline tracks once video metadata is extracted
  const initTimelineTracksForVideo = (fileName: string, totalDuration: number) => {
    const primaryClip: TimelineClip = {
      id: `clip_${Date.now()}`,
      trackId: 'track-v1',
      title: fileName,
      startTime: 0,
      duration: totalDuration,
      sourceStartTime: 0,
      sourceDuration: totalDuration,
      type: 'video',
      color: '#8b5cf6',
    };

    setTimelineTracks([
      { id: 'track-v1', name: 'V1 • Primary Video', type: 'video', isMuted: false, isLocked: false, isVisible: true, clips: [primaryClip] },
      { id: 'track-v2', name: 'V2 • B-Roll & Visuals', type: 'b-roll', isMuted: false, isLocked: false, isVisible: true, clips: [] },
      { id: 'track-a1', name: 'A1 • Dialogue Audio', type: 'audio-dialogue', isMuted: false, isLocked: false, isVisible: true, clips: [] },
      { id: 'track-a2', name: 'A2 • Music & Sound FX', type: 'audio-music', isMuted: false, isLocked: false, isVisible: true, clips: [] },
      { id: 'track-txt', name: 'TXT • AI Captions', type: 'captions', isMuted: false, isLocked: false, isVisible: true, clips: [] },
    ]);
  };

  const loadVideoFile = async (file: File): Promise<boolean> => {
    setIsLoadingMedia(true);
    setMediaError(null);

    const validation = validateVideoFile(file);
    if (!validation.isValid) {
      setMediaError(validation.error || 'Invalid video file.');
      setIsLoadingMedia(false);
      return false;
    }

    try {
      // Clean up previous URL
      if (videoUrl && !videoUrl.startsWith('data:')) {
        URL.revokeObjectURL(videoUrl);
      }

      const objectUrl = URL.createObjectURL(file);
      setVideoFile(file);
      setVideoUrl(objectUrl);

      // Probe video metadata using temporary video element
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = objectUrl;

      await new Promise<void>((resolve, reject) => {
        tempVideo.onloadedmetadata = () => resolve();
        tempVideo.onerror = () => reject(new Error('Browser failed to parse video metadata. Format may be unsupported.'));
      });

      const videoDuration = tempVideo.duration || 0;
      const width = tempVideo.videoWidth || 1920;
      const height = tempVideo.videoHeight || 1080;
      const ratio = `${width}:${height}`;

      const meta: VideoMetadata = {
        name: file.name,
        sizeBytes: file.size,
        type: file.type || 'video/mp4',
        durationSeconds: videoDuration,
        width,
        height,
        aspectRatio: ratio,
        lastModified: file.lastModified,
      };

      setVideoMetadata(meta);
      setDuration(videoDuration);
      setCurrentTime(0);
      initTimelineTracksForVideo(file.name, videoDuration);

      if (projectTitle === 'Untitled Project') {
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        setProjectTitle(baseName);
      }

      setIsLoadingMedia(false);
      setIsDirty(true);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to read video file';
      setMediaError(msg);
      setIsLoadingMedia(false);
      return false;
    }
  };

  /**
   * Load sample video using browser-supported sample clip
   */
  const loadSampleVideo = () => {
    setIsLoadingMedia(true);
    setMediaError(null);

    // Reliable sample video (open source Big Buck Bunny snippet / standard test mp4)
    const sampleUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    
    setVideoFile(null);
    setVideoUrl(sampleUrl);

    const meta: VideoMetadata = {
      name: 'Sample_Tech_Keynote.mp4',
      sizeBytes: 15 * 1024 * 1024,
      type: 'video/mp4',
      durationSeconds: 15,
      width: 1920,
      height: 1080,
      aspectRatio: '16:9',
      lastModified: Date.now(),
    };

    setVideoMetadata(meta);
    setDuration(15);
    setCurrentTime(0);
    initTimelineTracksForVideo('Sample_Tech_Keynote.mp4', 15);
    setProjectTitle('Sample Demo Cut');
    setIsLoadingMedia(false);
    setIsDirty(true);
  };

  const clearVideo = () => {
    if (videoUrl && !videoUrl.startsWith('data:') && !videoUrl.startsWith('http')) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoFile(null);
    setVideoUrl(null);
    setVideoMetadata(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setTimelineTracks(DEFAULT_TRACKS);
  };

  const splitClipAtPlayhead = () => {
    const playhead = currentTime;
    setTimelineTracks((prev) =>
      prev.map((track) => {
        if (track.type !== 'video') return track;
        const newClips: TimelineClip[] = [];

        track.clips.forEach((clip) => {
          const clipStart = clip.startTime;
          const clipEnd = clip.startTime + clip.duration;

          // If playhead falls strictly inside this clip
          if (playhead > clipStart + 0.1 && playhead < clipEnd - 0.1) {
            const firstPartDuration = playhead - clipStart;
            const secondPartDuration = clipEnd - playhead;

            const clipPart1: TimelineClip = {
              ...clip,
              id: `${clip.id}_pt1`,
              duration: firstPartDuration,
              sourceDuration: firstPartDuration,
            };

            const clipPart2: TimelineClip = {
              ...clip,
              id: `${clip.id}_pt2`,
              startTime: playhead,
              duration: secondPartDuration,
              sourceStartTime: clip.sourceStartTime + firstPartDuration,
              sourceDuration: secondPartDuration,
            };

            newClips.push(clipPart1, clipPart2);
          } else {
            newClips.push(clip);
          }
        });

        return { ...track, clips: newClips };
      })
    );
    setIsDirty(true);
  };

  const deleteClip = (clipId: string) => {
    setTimelineTracks((prev) =>
      prev.map((track) => ({
        ...track,
        clips: track.clips.filter((c) => c.id !== clipId),
      }))
    );
    setIsDirty(true);
  };

  const getPreferencesSnapshot = (): EditingPreferences => ({
    aspectRatio,
    resolution,
    frameRate,
    style,
    pacingDensity,
    cutSilences,
    generateCaptions,
    autoColorGrade,
    addBackgroundMusic,
    musicMood,
  });

  const loadProjectData = (project: Project) => {
    setCurrentProjectId(project.id);
    setProjectTitle(project.title);
    setPrompt(project.rawPrompt);
    setPromptTags(project.tags || []);
    if (project.preferences) {
      setAspectRatioState(project.preferences.aspectRatio);
      setResolutionState(project.preferences.resolution);
      setFrameRateState(project.preferences.frameRate);
      setStyleState(project.preferences.style);
      setPacingDensityState(project.preferences.pacingDensity);
      setCutSilencesState(project.preferences.cutSilences);
      setGenerateCaptionsState(project.preferences.generateCaptions);
      setAutoColorGradeState(project.preferences.autoColorGrade);
      setAddBackgroundMusicState(project.preferences.addBackgroundMusic);
      setMusicMoodState(project.preferences.musicMood);
    }
    if (project.videoMetadata) {
      setVideoMetadata(project.videoMetadata);
      setDuration(project.videoMetadata.durationSeconds);
      initTimelineTracksForVideo(project.videoMetadata.name, project.videoMetadata.durationSeconds);
    }
    setIsDirty(false);
  };

  const resetWorkspace = () => {
    clearVideo();
    setCurrentProjectId(null);
    setProjectTitle('Untitled Project');
    setPrompt('');
    setPromptTags(['Cut all awkward silences > 0.4s', 'Auto-generate animated captions']);
    setAspectRatioState('16:9');
    setResolutionState('1080p');
    setFrameRateState('30fps');
    setStyleState('viral-fast');
    setPacingDensityState(4);
    setCutSilencesState(true);
    setGenerateCaptionsState(true);
    setAutoColorGradeState(false);
    setAddBackgroundMusicState(false);
    setMusicMoodState('chill');
    setTimelineTracks(DEFAULT_TRACKS);
    setIsDirty(false);
  };

  const applyAIEditingPlan = (plan: {
    summary: string;
    clips: Array<{ sourceIn: number; sourceOut: number; speed?: number }>;
    captions?: Array<{ startTime: number; endTime: number; text: string }>;
  }) => {
    let cursor = 0;
    const videoClips: TimelineClip[] = plan.clips.map((c, i) => {
      const clipDuration = (c.sourceOut - c.sourceIn) / (c.speed || 1.0);
      const clip: TimelineClip = {
        id: `ai-clip-${i}-${Date.now()}`,
        trackId: 'track-v1',
        title: `Scene ${i + 1} (${c.sourceIn.toFixed(1)}s - ${c.sourceOut.toFixed(1)}s)`,
        startTime: cursor,
        duration: clipDuration,
        sourceStartTime: c.sourceIn,
        sourceDuration: c.sourceOut - c.sourceIn,
        type: 'video',
        color: '#8b5cf6',
      };
      cursor += clipDuration;
      return clip;
    });

    const captionClips: TimelineClip[] = (plan.captions || []).map((cap, i) => ({
      id: `ai-cap-${i}-${Date.now()}`,
      trackId: 'track-txt',
      title: cap.text,
      startTime: cap.startTime,
      duration: Math.max(0.5, cap.endTime - cap.startTime),
      sourceStartTime: cap.startTime,
      sourceDuration: Math.max(0.5, cap.endTime - cap.startTime),
      type: 'captions',
      color: '#10b981',
    }));

    setTimelineTracks((prev) =>
      prev.map((track) => {
        if (track.id === 'track-v1' || track.type === 'video') {
          return { ...track, clips: videoClips };
        }
        if (track.id === 'track-txt' || track.type === 'captions') {
          return { ...track, clips: captionClips };
        }
        return track;
      })
    );

    if (cursor > 0) {
      setDuration(cursor);
    }
    setIsDirty(true);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        videoFile,
        videoUrl,
        videoMetadata,
        isLoadingMedia,
        mediaError,
        currentTime,
        duration,
        isPlaying,
        volume,
        isMuted,
        playbackRate,
        play,
        pause,
        togglePlay,
        seek,
        stepFrame,
        setVolume,
        toggleMute,
        setPlaybackRate,
        registerVideoElement,
        loadVideoFile,
        loadSampleVideo,
        clearVideo,
        prompt,
        setPrompt,
        promptTags,
        addPromptTag,
        removePromptTag,
        togglePromptTag,
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
        timelineTracks,
        setTimelineTracks,
        timelineZoom,
        setTimelineZoom,
        splitClipAtPlayhead,
        deleteClip,
        applyAIEditingPlan,
        currentProjectId,
        setCurrentProjectId,
        projectTitle,
        setProjectTitle,
        isDirty,
        getPreferencesSnapshot,
        loadProjectData,
        resetWorkspace,
        isPayloadModalOpen,
        setIsPayloadModalOpen,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

