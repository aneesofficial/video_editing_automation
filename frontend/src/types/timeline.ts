export type TrackType = 'video' | 'b-roll' | 'audio-dialogue' | 'audio-music' | 'captions';

export interface TimelineClip {
  id: string;
  trackId: string;
  title: string;
  startTime: number; // in seconds
  duration: number;  // in seconds
  sourceStartTime: number;
  sourceDuration: number;
  color?: string;
  type: TrackType;
  volume?: number;
  isMuted?: boolean;
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: TrackType;
  isMuted: boolean;
  isLocked: boolean;
  isVisible: boolean;
  clips: TimelineClip[];
}

