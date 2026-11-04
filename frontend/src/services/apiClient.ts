import { AIPromptPayload, AIJobStatus } from '../types/ai';

export interface BackendHealthResponse {
  connected: boolean;
  status: 'healthy' | 'offline' | 'unreachable';
  message: string;
  latencyMs?: number;
  engineVersion?: string;
}

export interface BackendProject {
  id: string;
  title: string;
  description?: string;
  status: string;
  targetPlatform: string;
  aspectRatio: string;
  resolution: string;
  durationSeconds?: number;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
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
  exportedFiles?: Array<{
    id: string;
    filename: string;
    publicUrl: string;
    fileSizeBytes: number;
    duration: number;
  }>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
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
   * Projects CRUD
   */
  async listProjects(): Promise<BackendProject[]> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects`);
    if (!res.ok) throw new Error(`Failed to list projects: ${res.statusText}`);
    const json = await res.json();
    return json.data;
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
    targetPlatform?: string;
    aspectRatio?: string;
    resolution?: string;
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

  /**
   * Video Upload (Multipart)
   */
  async uploadVideo(projectId: string, file: File): Promise<{ id: string; filename: string }> {
    const formData = new FormData();
    formData.append('projectId', projectId);
    formData.append('file', file);

    const res = await fetch(`${this.baseUrl}/api/v1/uploads?projectId=${projectId}`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error(`Failed to upload media file: ${res.statusText}`);
    const json = await res.json();
    return json.data;
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
  async createRenderJob(projectId: string, resolution = '1080p'): Promise<{ jobId: string }> {
    const res = await fetch(`${this.baseUrl}/api/v1/rendering/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, resolution }),
    });

    if (!res.ok) throw new Error(`Render job request failed: ${res.statusText}`);
    const json = await res.json();
    return { jobId: json.data.jobId };
  }

  async getRenderJob(jobId: string): Promise<RenderJobResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/rendering/jobs/${jobId}`);
    if (!res.ok) throw new Error(`Failed to fetch render job: ${res.statusText}`);
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

  async getJobStatus(jobId: string): Promise<AIJobStatus> {
    const res = await fetch(`${this.baseUrl}/api/v1/jobs/${jobId}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch job status: ${res.statusText}`);
    }
    return res.json();
  }
}

export const apiClient = new ApiClient();
