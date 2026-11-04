import { EditingPreferences } from './ai';
import { VideoMetadata } from './video';

export type ProjectStatus = 'draft' | 'ready' | 'processing' | 'completed';

export interface Project {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
  videoMetadata?: VideoMetadata | null;
  rawPrompt: string;
  tags: string[];
  preferences: EditingPreferences;
  thumbnailUrl?: string;
  durationSeconds?: number;
}

