import { AspectRatio, EditingStyle, FrameRate, VideoResolution } from './video';

export interface EditingPreferences {
  aspectRatio: AspectRatio;
  resolution: VideoResolution;
  frameRate: FrameRate;
  style: EditingStyle;
  pacingDensity: number; // 1 to 5 (1: relaxed, 3: dynamic, 5: high energy / jump cut)
  cutSilences: boolean;
  generateCaptions: boolean;
  autoColorGrade: boolean;
  addBackgroundMusic: boolean;
  musicMood: 'upbeat' | 'chill' | 'cinematic' | 'corporate' | 'none';
}

export interface AIPromptPayload {
  projectId: string;
  userPrompt: string;
  preferences: EditingPreferences;
  sourceVideoName: string;
  sourceDurationSeconds: number;
  sourceResolution: {
    width: number;
    height: number;
  };
  clientTimestamp: string;
}

export interface AIJobStatus {
  jobId: string;
  status: 'offline' | 'queued' | 'analyzing' | 'cutting' | 'rendering' | 'completed' | 'failed';
  progressPercentage: number;
  currentStepMessage: string;
  error?: string;
}

