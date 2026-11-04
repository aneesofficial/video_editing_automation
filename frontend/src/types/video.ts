export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '21:9';

export type VideoResolution = '720p' | '1080p' | '4K';

export type FrameRate = '24fps' | '30fps' | '60fps';

export type EditingStyle = 
  | 'cinematic' 
  | 'viral-fast' 
  | 'documentary' 
  | 'clean-corporate' 
  | 'minimal-vlog';

export interface VideoMetadata {
  name: string;
  sizeBytes: number;
  type: string;
  durationSeconds: number;
  width: number;
  height: number;
  aspectRatio: string;
  lastModified: number;
}

export interface VideoFileState {
  file: File | null;
  objectUrl: string | null;
  metadata: VideoMetadata | null;
  isLoaded: boolean;
  error: string | null;
}

