import { AIPromptPayload, AIJobStatus } from '../types/ai';
import { Client, ProjectVersion } from '../types/project';

export interface BackendHealthResponse {
  connected: boolean;
  status: 'healthy' | 'offline' | 'unreachable';
  message: string;
  latencyMs?: number;
  engineVersion?: string;
}

export interface AIStatusResponse {
  online: boolean;
  model: string;
  hasKey: boolean;
  maskedKey: string | null;
  visionEnabled: boolean;
  whisperModel?: string;
  whisperLanguage?: string;
  reason?: string | null;
}

export interface BrandKitConfig {
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  watermarkPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  watermarkOpacity: number;
  watermarkSizePercent: number;
  logoFilename?: string | null;
  logoPath?: string | null;
  logoUrl?: string | null;
  updatedAt: string;
}

export interface MusicTrack {
  id: string;
  filename: string;
  title: string;
  artist?: string;
  moods: string[];
  durationSeconds: number;
  fileSizeBytes: number;
  mimeType: string;
  licenseSource?: string;
  url: string;
  createdAt: string;
}

export type StockMediaType = 'video' | 'photo';
export type StockSource = 'pexels' | 'pixabay' | 'all';
export type StockOrientation = 'landscape' | 'portrait' | 'square' | 'all';

export interface StockItem {
  id: string;
  source: 'pexels' | 'pixabay';
  type: StockMediaType;
  title: string;
  thumbnailUrl: string;
  previewVideoUrl?: string;
  downloadUrl: string;
  width: number;
  height: number;
  durationSeconds?: number;
  creatorName: string;
  creatorUrl: string;
  pageUrl: string;
  licenseUrl: string;
}

export interface StockLicenseMeta {
  source: 'Pexels' | 'Pixabay';
  pageUrl: string;
  creatorName: string;
  creatorUrl?: string;
  licenseUrl: string;
  licenseName: string;
  importedAt: string;
  stockId: string;
  mediaType: StockMediaType;
  originalTitle?: string;
}

export interface StockStatusResponse {
  pexels: { hasKey: boolean; maskedKey: string | null; configured: boolean };
  pixabay: { hasKey: boolean; maskedKey: string | null; configured: boolean };
}

export interface StockSearchResponse {
  items: StockItem[];
  page: number;
  perPage: number;
  totalHits: number;
  source: string;
  hasPexelsKey: boolean;
  hasPixabayKey: boolean;
  rateLimitWarning?: string | null;
  cached?: boolean;
}

export interface RenderOverrideOptions {
  captions?: boolean;
  captionStyle?: 'viral' | 'clean' | 'minimal';
  music?: boolean;
  musicMood?: string;
  useBrandKit?: boolean;
  silenceRemoval?: boolean;
  bRollEnabled?: boolean;
  excludedBRollIds?: string[];
}

export interface GeminiPlanSegment {
  assetId: string;
  sourceIn: number;
  sourceOut: number;
  speed?: number;
  transition: 'cut' | 'fade' | 'crossfade' | 'dissolve' | 'wipe';
  motionEffect: 'none' | 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | 'punch_in' | 'ken_burns';
  motionEffectTiming?: {
    start: number;
    end: number;
  };
  reason?: string;
}

export interface GeminiPlanCaption {
  startTime: number;
  endTime: number;
  text: string;
  style?: string;
  position?: string;
  fontSize?: string;
  fontColor?: string;
}

export interface GeminiPlanTextOverlay {
  startTime: number;
  endTime: number;
  text: string;
  position?: string;
}

export interface GeminiBRollSegment {
  id?: string;
  keyword: string;
  startTime: number;
  duration: number;
  reason?: string;
  assetId?: string;
  filePath?: string;
  isPhoto?: boolean;
  stockItem?: StockItem;
  removed?: boolean;
}

export interface GeminiEditingPlan {
  summary: string;
  explanation: string;
  frame: {
    platform: string;
    aspectRatio: string;
    resolution: string;
  };
  targetDurationSeconds: number;
  segments: GeminiPlanSegment[];
  silenceRemoval?: {
    enabled: boolean;
    removedIntervals?: Array<{ start: number; end: number }>;
  };
  captions?: GeminiPlanCaption[];
  textOverlays?: GeminiPlanTextOverlay[];
  bRollSegments?: GeminiBRollSegment[];
  audio?: {
    musicEnabled: boolean;
    mood: string;
    volume: number;
    ducking: boolean;
  };
}

export interface ProjectPlanItem {
  id: string;
  version: string;
  summary: string;
  explanation: string;
  targetDurationSeconds: number;
  createdAt: string;
  prompt?: string;
  selectedScenes: GeminiPlanSegment[];
  captions: GeminiPlanCaption[];
  audio: any;
  plan: GeminiEditingPlan;
}

export interface PhotoAnalysisData {
  width: number;
  height: number;
  aspect_ratio: number;
  brightness: number;
  contrast: number;
  blur_score: number;
  face_count: number;
  faces?: Array<{ x: number; y: number; width: number; height: number }>;
  saliency_center?: { x: number; y: number };
}

export interface PhotoPlan {
  summary: string;
  explanation: string;
  frame: {
    platform: string;
    aspectRatio: string;
    width: number;
    height: number;
  };
  smart_crop?: {
    enabled?: boolean;
    aspect_ratio?: string;
    keep_subject?: boolean;
    focus_point?: [number, number];
  };
  auto_levels?: boolean;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  sharpness?: number;
  denoise?: boolean;
  filter?: 'none' | 'warm' | 'cool' | 'vintage' | 'black_and_white' | 'cinematic' | 'vivid';
  background?: {
    mode: 'keep' | 'remove' | 'solid' | 'gradient' | 'blur' | 'custom';
    color?: string;
    color2?: string;
    custom_image_path?: string;
    blur_radius?: number;
  };
  vignette?: boolean;
  text_overlay?: {
    text: string;
    position?: 'top' | 'center' | 'bottom';
    font_size?: number;
    color?: string;
  } | null;
  brand_logo?: {
    enabled: boolean;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    opacity?: number;
    size_percent?: number;
  } | null;
  output_format?: 'jpg' | 'png' | 'webp';
  output_quality?: number;
}

export interface PhotoEditResult {
  version: string;
  filename: string;
  filePath: string;
  fileUrl: string;
  width: number;
  height: number;
  format: string;
  fileSizeBytes: number;
  operations: string[];
  plan: PhotoPlan;
  createdAt: string;
}

export interface PhotoVersionSummary {
  version: string;
  folderPath: string;
  createdAt: string;
  fileCount: number;
  files: Array<{
    filename: string;
    filePath: string;
    fileUrl: string;
    width: number;
    height: number;
    fileSizeBytes: number;
  }>;
}

export interface BackendProject {
  id: string;
  title: string;
  description?: string;
  status: string;
  clientId?: string | null;
  client?: Client | null;
  clientName?: string;
  targetPlatform: string;
  aspectRatio: string;
  resolution: string;
  durationSeconds?: number;
  thumbnailUrl?: string;
  rawPrompt?: string;
  tags?: string[];
  preferences?: any;
  createdAt: string;
  updatedAt: string;
  versions?: ProjectVersion[];
  _count?: {
    mediaAssets?: number;
    versions?: number;
    exportedFiles?: number;
  };
  mediaAssets?: Array<{
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    fileSizeBytes: number;
    durationSeconds?: number;
    width?: number;
    height?: number;
    fps?: number;
    status: string;
    storagePath?: string;
    publicUrl?: string;
    previewUrl?: string | null;
    previewStatus?: 'preparing' | 'ready' | 'error' | 'skipped';
    previewError?: string | null;
    isPhoto?: boolean;
    thumbnailUrl?: string | null;
    createdAt?: string;
    updatedAt?: string;
    metadata?: {
      format: string;
      duration: number;
      bitrate?: number;
      videoCodec?: string;
      audioCodec?: string;
      width: number;
      height: number;
      aspectRatio: string;
      frameRate: number;
    };
    scenes?: Array<{
      sceneIndex: number;
      startTime: number;
      endTime: number;
      duration: number;
      cutType: string;
    }>;
    transcription?: {
      language: string;
      fullText: string;
      wordCount: number;
      segments: Array<{
        startTime: number;
        endTime: number;
        text: string;
      }>;
    };
  }>;
  timelineTracks?: Array<{
    id: string;
    name: string;
    trackType: string;
    trackIndex: number;
    clips: Array<{
      id: string;
      trackId: string;
      mediaAssetId?: string;
      name: string;
      startTime: number;
      duration: number;
      sourceIn: number;
      sourceOut: number;
      speed: number;
      clipOrder: number;
    }>;
    captions: Array<{
      id: string;
      startTime: number;
      endTime: number;
      text: string;
    }>;
  }>;
  exportedFiles?: Array<{
    id: string;
    filename: string;
    publicUrl: string;
    fileSizeBytes: number;
    duration: number;
    resolution: string;
    createdAt: string;
  }>;
}

export interface RenderJobResponse {
  id: string;
  projectId: string;
  jobType: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progressPercent: number;
  currentStage: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  details?: {
    etaSeconds?: number;
    speed?: string;
    currentSeconds?: number;
    totalSeconds?: number;
  };
  jobEvents?: Array<{
    id: string;
    stage: string;
    progress: number;
    message: string;
    timestamp: string;
  }>;
  exportedFiles?: Array<{
    id: string;
    filename: string;
    publicUrl: string;
    fileSizeBytes: number;
    duration: number;
    resolution?: string;
    versionTag?: string;
    createdAt?: string;
  }>;
}

export interface HardwareEncoderInfo {
  encoder: string;
  isHardwareAccelerated: boolean;
  description: string;
}

class ApiClient {
  public baseUrl: string;

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  constructor() {
    this.baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
  }

  /**
   * Health Check
   */
  async checkHealth(): Promise<BackendHealthResponse> {
    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - startTime);

      if (response.ok) {
        const data = await response.json();
        return {
          connected: true,
          status: 'healthy',
          message: data.service || 'NovaCut Engine Online',
          latencyMs,
          engineVersion: data.version || 'v1.0.0',
        };
      }

      return {
        connected: false,
        status: 'unreachable',
        message: `Backend returned status ${response.status}`,
        latencyMs,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown connection error';
      return {
        connected: false,
        status: 'offline',
        message: `Backend offline (${this.baseUrl}): ${message}. Ensure backend is running.`,
      };
    }
  }

  /**
   * Clients CRUD
   */
  async listClients(): Promise<Client[]> {
    const res = await fetch(`${this.baseUrl}/api/v1/clients`);
    if (!res.ok) throw new Error(`Failed to list clients: ${res.statusText}`);
    const json = await res.json();
    return json.data || [];
  }

  /**
   * Projects CRUD
   */
  async listProjects(params?: { clientId?: string; search?: string }): Promise<BackendProject[]> {
    const query = new URLSearchParams();
    if (params?.clientId) query.set('clientId', params.clientId);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';

    const res = await fetch(`${this.baseUrl}/api/v1/projects${qs}`);
    if (!res.ok) throw new Error(`Failed to list projects: ${res.statusText}`);
    const json = await res.json();
    return json.data || [];
  }

  async getProject(id: string): Promise<BackendProject> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects/${id}`);
    if (!res.ok) throw new Error(`Failed to get project: ${res.statusText}`);
    const json = await res.json();
    return json.data;
  }

  async createProject(data: {
    title: string;
    description?: string;
    clientId?: string | null;
    clientName?: string;
    targetPlatform?: string;
    aspectRatio?: string;
    resolution?: string;
    rawPrompt?: string;
    tags?: string[];
    preferences?: any;
  }): Promise<BackendProject> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to create project: ${res.statusText}`);
    const json = await res.json();
    return json.data;
  }

  async updateProject(id: string, data: Partial<BackendProject>): Promise<BackendProject> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to update project: ${res.statusText}`);
    const json = await res.json();
    return json.data;
  }

  async deleteProject(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to delete project: ${res.statusText}`);
  }

  async listVersions(projectId: string): Promise<ProjectVersion[]> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects/${projectId}/versions`);
    if (!res.ok) throw new Error(`Failed to list versions: ${res.statusText}`);
    const json = await res.json();
    return json.data || [];
  }

  /**
   * Universal Media Upload (Multipart) with real-time progress tracking
   */
  uploadMediaFile(
    projectId: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<{
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    fileSizeBytes: number;
    storagePath: string;
    publicUrl: string;
    previewUrl?: string | null;
    previewStatus?: string;
    isPhoto?: boolean;
    thumbnailUrl?: string | null;
    status: string;
  }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.baseUrl}/api/v1/uploads?projectId=${projectId}`);

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response.data);
          } catch {
            reject(new Error('Invalid response from server'));
          }
        } else {
          try {
            const errorJson = JSON.parse(xhr.responseText);
            reject(new Error(errorJson.error || `Upload failed: ${xhr.statusText}`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error occurred during upload. Check backend server connection.'));
      xhr.ontimeout = () => reject(new Error('Upload timed out'));

      const formData = new FormData();
      formData.append('projectId', projectId);
      formData.append('file', file);
      xhr.send(formData);
    });
  }

  async uploadVideo(projectId: string, file: File) {
    return this.uploadMediaFile(projectId, file);
  }

  /**
   * AI Director
   */
  async submitAIEditingJob(payload: AIPromptPayload): Promise<{ jobId: string }> {
    const res = await fetch(`${this.baseUrl}/api/v1/ai-director/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: payload.projectId || 'default',
        userPrompt: payload.userPrompt,
        editingStyle: payload.preferences?.style || 'dynamic',
        targetDuration: payload.preferences?.pacingDensity ? 30 : undefined,
        removeSilences: payload.preferences?.cutSilences ?? true,
        autoColorGrade: payload.preferences?.autoColorGrade ?? false,
        autoDenoise: false,
        captionStyle: payload.preferences?.generateCaptions ? 'standard' : 'none',
      }),
    });

    if (!res.ok) throw new Error(`AI Job submission failed: ${res.statusText}`);
    const json = await res.json();
    return { jobId: json.data?.instructionId || '' };
  }

  async getInstructionStatus(id: string) {
    const res = await fetch(`${this.baseUrl}/api/v1/ai-director/instructions/${id}`);
    if (!res.ok) throw new Error(`Failed to get instruction: ${res.statusText}`);
    return res.json();
  }

  async getProjectPlan(projectId: string) {
    const res = await fetch(`${this.baseUrl}/api/v1/ai-director/projects/${projectId}/plan`);
    if (!res.ok) return null;
    return res.json();
  }

  /**
   * Rendering
   */
  async createRenderJob(
    projectId: string,
    options?: {
      mode?: 'draft' | 'final';
      planVersion?: string;
      resolution?: string;
      format?: string;
      options?: RenderOverrideOptions;
    } | string
  ): Promise<{ jobId: string; mode?: string; message?: string }> {
    const payload =
      typeof options === 'string'
        ? { projectId, resolution: options, mode: 'draft' }
        : { projectId, mode: 'draft', ...(options || {}) };

    const res = await fetch(`${this.baseUrl}/api/v1/rendering/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Render job request failed: ${res.statusText}`);
    }
    const json = await res.json();
    return json.data;
  }

  async getRenderJob(jobId: string): Promise<RenderJobResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/rendering/jobs/${jobId}`);
    if (!res.ok) throw new Error(`Failed to fetch render job: ${res.statusText}`);
    const json = await res.json();
    return json.data;
  }

  async cancelRenderJob(jobId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${this.baseUrl}/api/v1/rendering/jobs/${jobId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`Failed to cancel render job: ${res.statusText}`);
    return res.json();
  }

  async getHardwareEncoder(): Promise<HardwareEncoderInfo> {
    const res = await fetch(`${this.baseUrl}/api/v1/rendering/hardware-encoder`);
    if (!res.ok) throw new Error(`Failed to fetch hardware encoder: ${res.statusText}`);
    const json = await res.json();
    return json.data;
  }

  async getProjectExports(projectId: string) {
    const res = await fetch(`${this.baseUrl}/api/v1/rendering/projects/${projectId}/exports`);
    if (!res.ok) throw new Error(`Failed to fetch exports: ${res.statusText}`);
    return res.json();
  }

  getExportDownloadUrl(exportId: string): string {
    return `${this.baseUrl}/api/v1/rendering/exports/${exportId}/download`;
  }

  getVideoFileUrl(publicUrlOrPath: string): string {
    if (publicUrlOrPath.startsWith('http://') || publicUrlOrPath.startsWith('https://')) {
      return publicUrlOrPath;
    }
    return `${this.baseUrl}${publicUrlOrPath.startsWith('/') ? '' : '/'}${publicUrlOrPath}`;
  }

  async getJobStatus(jobId: string): Promise<AIJobStatus> {
    const res = await fetch(`${this.baseUrl}/api/v1/jobs/${jobId}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch job status: ${res.statusText}`);
    }
    return res.json();
  }

  async getMediaAsset(id: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/v1/media/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch media asset: ${res.statusText}`);
    const json = await res.json();
    return json.data;
  }

  async generateMediaPreview(id: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/v1/media/${id}/preview`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to generate preview: ${res.statusText}`);
    return res.json();
  }

  async deleteMediaAsset(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/v1/media/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete media asset: ${res.statusText}`);
  }

  async reorderProjectMedia(projectId: string, mediaOrder: string[]): Promise<any> {
    const project = await this.getProject(projectId);
    const existingPrefs = project.preferences || {};
    return this.updateProject(projectId, {
      preferences: {
        ...existingPrefs,
        mediaOrder,
      },
    });
  }

  async generateAllPreviews(projectId?: string): Promise<any> {
    const url = projectId
      ? `${this.baseUrl}/api/v1/media/generate-previews?projectId=${projectId}`
      : `${this.baseUrl}/api/v1/media/generate-previews`;
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to generate previews: ${res.statusText}`);
    return res.json();
  }

  // --- Gemini AI Planner Methods ---

  async getAiStatus(): Promise<AIStatusResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/ai/status`);
    if (!res.ok) {
      throw new Error(`Failed to fetch AI status: ${res.statusText}`);
    }
    const json = await res.json();
    return json.data;
  }

  async saveAiKey(apiKey: string): Promise<{ success: boolean; maskedKey?: string; error?: string }> {
    const res = await fetch(`${this.baseUrl}/api/v1/ai/key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to save Gemini API key');
    }
    return json;
  }

  async updateAiSettings(
    options: boolean | { visionEnabled?: boolean; whisperModel?: string; whisperLanguage?: string }
  ): Promise<AIStatusResponse> {
    const payload = typeof options === 'boolean' ? { visionEnabled: options } : options;
    const res = await fetch(`${this.baseUrl}/api/v1/ai/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update AI settings');
    }
    return json.data;
  }

  // --- Step 5B Brand Kit Methods ---

  async getBrandKit(): Promise<BrandKitConfig> {
    const res = await fetch(`${this.baseUrl}/api/v1/brand`);
    if (!res.ok) throw new Error(`Failed to fetch brand kit: ${res.statusText}`);
    const json = await res.json();
    return json.data;
  }

  async updateBrandKit(data: Partial<BrandKitConfig>): Promise<BrandKitConfig> {
    const res = await fetch(`${this.baseUrl}/api/v1/brand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update brand kit');
    }
    return json.data;
  }

  async uploadBrandLogo(file: File): Promise<{ logoUrl: string; brandKit: BrandKitConfig }> {
    const formData = new FormData();
    formData.append('logo', file);
    const res = await fetch(`${this.baseUrl}/api/v1/brand/logo`, {
      method: 'POST',
      body: formData,
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to upload brand logo');
    }
    return json.data;
  }

  // --- Step 5B Music Library Methods ---

  async listMusicTracks(mood?: string): Promise<MusicTrack[]> {
    const url = mood ? `${this.baseUrl}/api/v1/music?mood=${encodeURIComponent(mood)}` : `${this.baseUrl}/api/v1/music`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to list music tracks: ${res.statusText}`);
    const json = await res.json();
    return json.data || [];
  }

  async uploadMusicTrack(
    file: File,
    meta?: { title?: string; moods?: string[]; licenseSource?: string }
  ): Promise<MusicTrack> {
    const formData = new FormData();
    formData.append('file', file);
    if (meta?.title) formData.append('title', meta.title);
    if (meta?.moods) formData.append('moods', JSON.stringify(meta.moods));
    if (meta?.licenseSource) formData.append('licenseSource', meta.licenseSource);

    const res = await fetch(`${this.baseUrl}/api/v1/music`, {
      method: 'POST',
      body: formData,
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to upload music track');
    }
    return json.data;
  }

  async updateMusicTrack(
    id: string,
    data: { title?: string; moods?: string[]; licenseSource?: string }
  ): Promise<MusicTrack> {
    const res = await fetch(`${this.baseUrl}/api/v1/music/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update music track');
    }
    return json.data;
  }

  async deleteMusicTrack(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/v1/music/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to delete music track: ${res.statusText}`);
  }

  async generateAiPlan(
    projectId: string,
    payload: {
      userPrompt: string;
      targetPlatform?: string;
      aspectRatio?: string;
      resolution?: string;
      targetDurationSeconds?: number;
      autoBRoll?: boolean;
    }
  ): Promise<{ success: boolean; data: { plan: GeminiEditingPlan; planId: string; version: string; filePath: string } }> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects/${projectId}/ai-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to generate AI plan');
    }
    return json;
  }

  async listProjectPlans(projectId: string): Promise<ProjectPlanItem[]> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects/${projectId}/plans`);
    if (!res.ok) {
      throw new Error(`Failed to list project plans: ${res.statusText}`);
    }
    const json = await res.json();
    return json.data || [];
  }

  async getProjectPlanById(projectId: string, planId: string): Promise<ProjectPlanItem> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects/${projectId}/plans/${planId}`);
    if (!res.ok) {
      throw new Error(`Failed to get plan: ${res.statusText}`);
    }
    const json = await res.json();
    return json.data;
  }

  // --- Step 7: Photo Editing Endpoints ---

  async generatePhotoPlan(
    projectId: string,
    data: { assetId: string; userPrompt?: string; frame?: string }
  ): Promise<{
    plan: PhotoPlan;
    analysis: PhotoAnalysisData;
    asset: { id: string; originalName: string; previewUrl: string };
  }> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects/${projectId}/photo/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to generate photo plan');
    }
    return json.data;
  }

  async executePhotoEdit(
    projectId: string,
    data: {
      assetId: string;
      plan: PhotoPlan;
      targetFormat?: 'jpg' | 'png' | 'webp';
      customBackgroundPath?: string;
    }
  ): Promise<PhotoEditResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects/${projectId}/photo/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to execute photo edit');
    }
    return json.data;
  }

  async executeBatchPhotoEdit(
    projectId: string,
    data: {
      assetIds: string[];
      plan: PhotoPlan;
      targetFormat?: 'jpg' | 'png' | 'webp';
    }
  ): Promise<{ count: number; results: PhotoEditResult[] }> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects/${projectId}/photo/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to execute batch photo edit');
    }
    return json.data;
  }

  async getPhotoVersions(projectId: string): Promise<PhotoVersionSummary[]> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects/${projectId}/photo/versions`);
    if (!res.ok) {
      throw new Error(`Failed to list photo versions: ${res.statusText}`);
    }
    const json = await res.json();
    return json.data || [];
  }

  async usePhotoInVideo(
    projectId: string,
    data: { editedPhotoPath: string; originalName: string }
  ): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects/${projectId}/photo/use-in-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to import photo into video project');
    }
    return json.data;
  }

  getPhotoDownloadZipUrl(projectId: string, version: string = 'photo_v1'): string {
    return `${this.baseUrl}/api/v1/projects/${projectId}/photo/download-zip?version=${encodeURIComponent(version)}`;
  }

  // --- Step 8: Stock Media Endpoints ---

  async getStockStatus(): Promise<StockStatusResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/stock/status`);
    if (!res.ok) throw new Error(`Failed to get stock status: ${res.statusText}`);
    const json = await res.json();
    return json.data;
  }

  async testStockKey(provider: 'pexels' | 'pixabay', key: string): Promise<{ valid: boolean; error?: string }> {
    const res = await fetch(`${this.baseUrl}/api/v1/stock/test-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, key }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || `Failed to test ${provider} key`);
    }
    return json.data;
  }

  async saveStockKeys(keys: { pexelsKey?: string; pixabayKey?: string }): Promise<{
    pexels: { valid: boolean; error?: string; maskedKey: string | null };
    pixabay: { valid: boolean; error?: string; maskedKey: string | null };
  }> {
    const res = await fetch(`${this.baseUrl}/api/v1/stock/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(keys),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to save stock API keys');
    }
    return json.data;
  }

  async searchStock(options: {
    q: string;
    type?: StockMediaType;
    orientation?: StockOrientation;
    source?: StockSource;
    page?: number;
    perPage?: number;
  }): Promise<StockSearchResponse> {
    const params = new URLSearchParams();
    params.set('q', options.q);
    if (options.type) params.set('type', options.type);
    if (options.orientation) params.set('orientation', options.orientation);
    if (options.source) params.set('source', options.source);
    if (options.page) params.set('page', String(options.page));
    if (options.perPage) params.set('perPage', String(options.perPage));

    const res = await fetch(`${this.baseUrl}/api/v1/stock/search?${params.toString()}`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Stock search failed');
    }
    return json.data;
  }

  async importStockMedia(
    projectId: string,
    stockItem: StockItem
  ): Promise<{ asset: any; license: StockLicenseMeta }> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects/${projectId}/stock/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stockItem }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to import stock media');
    }
    return json.data;
  }

  async getAssetLicense(assetId: string): Promise<StockLicenseMeta | null> {
    const res = await fetch(`${this.baseUrl}/api/v1/media/${assetId}/license`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  }
}

export const apiClient = new ApiClient();
