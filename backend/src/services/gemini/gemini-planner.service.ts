import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { env, getMaskedApiKey, updateEnvFile } from '../../config/env.js';

export const GeminiSegmentSchema = z.object({
  assetId: z.string(),
  sourceIn: z.number().nonnegative(),
  sourceOut: z.number().positive(),
  speed: z.number().default(1.0),
  transition: z.enum(['cut', 'fade', 'crossfade', 'dissolve', 'wipe']).default('cut'),
  motionEffect: z
    .enum(['none', 'zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'punch_in', 'ken_burns'])
    .default('none'),
  motionEffectTiming: z
    .object({
      start: z.number().default(0),
      end: z.number().default(0),
    })
    .optional(),
  reason: z.string().optional().default(''),
});

export const GeminiCaptionSchema = z.object({
  startTime: z.number().nonnegative(),
  endTime: z.number().positive(),
  text: z.string(),
  style: z.string().default('standard'),
  position: z.string().default('bottom'),
  fontSize: z.string().optional().default('28px'),
  fontColor: z.string().optional().default('#ffffff'),
});

export const GeminiTextOverlaySchema = z.object({
  startTime: z.number().nonnegative(),
  endTime: z.number().positive(),
  text: z.string(),
  position: z.string().default('center'),
});

export const GeminiBRollSegmentSchema = z.object({
  id: z.string().optional(),
  keyword: z.string(),
  startTime: z.number().nonnegative(),
  duration: z.number().positive(),
  reason: z.string().optional().default(''),
  assetId: z.string().optional(),
  filePath: z.string().optional(),
  isPhoto: z.boolean().optional(),
  stockItem: z.any().optional(),
  removed: z.boolean().optional().default(false),
});

export const GeminiEditingPlanSchema = z.object({
  summary: z.string(),
  explanation: z.string(),
  frame: z.object({
    platform: z.string(),
    aspectRatio: z.string(),
    resolution: z.string(),
  }),
  targetDurationSeconds: z.number().positive(),
  segments: z.array(GeminiSegmentSchema).min(1),
  silenceRemoval: z
    .object({
      enabled: z.boolean().default(true),
      removedIntervals: z
        .array(
          z.object({
            start: z.number(),
            end: z.number(),
          })
        )
        .optional()
        .default([]),
    })
    .default({ enabled: true, removedIntervals: [] }),
  captions: z.array(GeminiCaptionSchema).default([]),
  textOverlays: z.array(GeminiTextOverlaySchema).default([]),
  bRollSegments: z.array(GeminiBRollSegmentSchema).optional().default([]),
  audio: z
    .object({
      musicEnabled: z.boolean().default(false),
      mood: z.string().default('upbeat'),
      volume: z.number().default(0.2),
      ducking: z.boolean().default(true),
    })
    .default({ musicEnabled: false, mood: 'upbeat', volume: 0.2, ducking: true }),
});

export type GeminiEditingPlan = z.infer<typeof GeminiEditingPlanSchema>;

export interface MediaAssetAnalysisContext {
  id: string;
  originalName: string;
  filename: string;
  isPhoto: boolean;
  durationSeconds: number;
  width: number;
  height: number;
  storagePath: string;
  previewPath?: string | null;
  scenes?: Array<{ sceneIndex: number; start: number; end: number; duration: number }>;
  transcription?: { fullText: string; segments: Array<{ start: number; end: number; text: string }> };
  silences?: Array<{ start: number; end: number; duration: number }>;
}

export interface PlanGenerationRequest {
  projectId: string;
  projectTitle: string;
  userPrompt: string;
  targetPlatform: string;
  aspectRatio: string;
  resolution: string;
  targetDurationSeconds?: number;
  autoBRoll?: boolean;
  assets: MediaAssetAnalysisContext[];
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

export class GeminiPlannerService {
  private primaryModel = env.GEMINI_MODEL || 'gemini-3.5-flash';
  private fallbackModels = ['gemini-3.1-flash-lite', 'gemini-flash-lite-latest'];

  /**
   * Check online status of Gemini API with current key
   */
  public async checkStatus(): Promise<AIStatusResponse> {
    const key = env.GEMINI_API_KEY?.trim();
    const whisperInfo = {
      whisperModel: env.WHISPER_MODEL || 'base',
      whisperLanguage: env.WHISPER_LANGUAGE || 'auto',
    };

    if (!key) {
      return {
        online: false,
        model: this.primaryModel,
        hasKey: false,
        maskedKey: null,
        visionEnabled: env.GEMINI_VISION_ENABLED,
        ...whisperInfo,
        reason: 'Edit service key is not configured. Please paste your key in Settings.',
      };
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) {
        if (res.status === 400 || res.status === 403) {
          return {
            online: false,
            model: this.primaryModel,
            hasKey: true,
            maskedKey: null,
            visionEnabled: env.GEMINI_VISION_ENABLED,
            ...whisperInfo,
            reason: 'Invalid key. Please verify your edit service key in Settings.',
          };
        }
        if (res.status === 429) {
          return {
            online: true,
            model: this.primaryModel,
            hasKey: true,
            maskedKey: null,
            visionEnabled: env.GEMINI_VISION_ENABLED,
            ...whisperInfo,
            reason: 'Service rate limit reached. Please wait 1-2 minutes.',
          };
        }
        return {
          online: false,
          model: this.primaryModel,
          hasKey: true,
          maskedKey: null,
          visionEnabled: env.GEMINI_VISION_ENABLED,
          ...whisperInfo,
          reason: `Service responded with HTTP status ${res.status}.`,
        };
      }

      return {
        online: true,
        model: this.primaryModel,
        hasKey: true,
        maskedKey: null,
        visionEnabled: env.GEMINI_VISION_ENABLED,
        ...whisperInfo,
        reason: null,
      };
    } catch (err: any) {
      return {
        online: false,
        model: this.primaryModel,
        hasKey: true,
        maskedKey: getMaskedApiKey(key),
        visionEnabled: env.GEMINI_VISION_ENABLED,
        ...whisperInfo,
        reason: err?.name === 'TimeoutError'
          ? 'Connection to Google Gemini timed out. Please check your internet connection.'
          : 'Cannot reach Google Gemini servers. Please check your internet connection.',
      };
    }
  }

  /**
   * Test an API key explicitly and save to backend/.env if valid
   */
  public async testAndSaveKey(apiKey: string): Promise<{ success: boolean; maskedKey?: string; error?: string }> {
    const trimmed = (apiKey || '').trim();
    if (!trimmed) {
      return { success: false, error: 'Please provide a valid key.' };
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${trimmed}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      const data = (await res.json()) as any;

      if (!res.ok) {
        return { success: false, error: 'Invalid key.' };
      }

      // Key is valid - save to backend/.env and update runtime env
      updateEnvFile({ GEMINI_API_KEY: trimmed });

      return {
        success: true,
      };
    } catch (err: any) {
      return {
        success: false,
        error: 'Could not verify service key.',
      };
    }
  }

  /**
   * Update Vision Setting
   */
  public updateAiSettings(options: {
    visionEnabled?: boolean;
    whisperModel?: string;
    whisperLanguage?: string;
  }): void {
    const updates: Record<string, string> = {};
    if (options.visionEnabled !== undefined) {
      updates.GEMINI_VISION_ENABLED = options.visionEnabled ? 'true' : 'false';
    }
    if (options.whisperModel !== undefined) {
      updates.WHISPER_MODEL = options.whisperModel;
    }
    if (options.whisperLanguage !== undefined) {
      updates.WHISPER_LANGUAGE = options.whisperLanguage;
    }
    updateEnvFile(updates);
  }

  public updateVisionSetting(enabled: boolean): void {
    this.updateAiSettings({ visionEnabled: enabled });
  }

  /**
   * Main Gemini AI Planning method
   */
  public async generatePlan(req: PlanGenerationRequest): Promise<GeminiEditingPlan> {
    const { assets, userPrompt, targetPlatform, aspectRatio, resolution, targetDurationSeconds } = req;

    if (!assets || assets.length === 0) {
      throw new Error('Please upload at least one video or photo before generating an edit plan.');
    }

    const key = env.GEMINI_API_KEY?.trim();
    if (!key) {
      throw new Error('Edit service key is not configured. Please paste your key in Settings.');
    }

    // 1. Build prompt for Gemini
    let systemPrompt = `You are Studio Director, an elite autonomous video editor.
The user wants an automated edit of their media assets. You must decide every cut, motion effect, silence removal, caption, and music setting entirely by yourself based on the user's creative prompt and the provided local media analysis (transcription with timestamps, scene cuts from PySceneDetect, and silence intervals).

STRICT RULES:
1. Every segment's assetId MUST exactly match one of the provided asset IDs.
2. For videos: sourceIn and sourceOut must be within [0, asset.durationSeconds], and sourceIn < sourceOut.
3. For photos: set sourceIn to 0, sourceOut to display duration (default 3.0 to 5.0 seconds). Always assign motionEffect = "ken_burns", "zoom_in", or "pan_left".
4. If the user mentions removing silences, or if silent intervals exist, skip or trim those intervals.
5. If speech transcription is present, generate matching captions with accurate timestamps.
6. When prompt asks for punchy/zoom/highlights, assign motionEffect ("zoom_in", "punch_in", "zoom_out", "pan_left") to impactful moments.
7. Return ONLY valid JSON following the schema.`;

    if (req.autoBRoll) {
      systemPrompt += `\n8. AUTO B-ROLL IS REQUESTED: In 'bRollSegments', provide 1 to 3 relevant stock media cutaway suggestions. For each, specify 'keyword' (clear search terms for stock video, e.g. "aerial nature view", "hands typing on keyboard"), 'startTime' (seconds into edit), and 'duration' (between 2.0 and 4.0 seconds).`;
    }

    const userMessageContent = this.buildContextMessage(req);

    // Optional preview frames if vision is ON
    const visionParts = env.GEMINI_VISION_ENABLED ? this.extractPreviewFrames(assets) : [];

    const requestBody: any = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [...visionParts, { text: userMessageContent }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: this.getPlanJsonSchema(),
      },
    };

    // Try primary model first, fallback if unavailable
    const modelsToTry = [this.primaryModel, ...this.fallbackModels];
    let lastError: Error | null = null;
    let rawJsonResponse: any = null;

    for (const model of modelsToTry) {
      let modelSuccess = false;
      const maxRetries = 3;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[GeminiPlanner] Requesting edit plan using ${model} (attempt ${attempt}/${maxRetries}, 60s timeout)...`);
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(60000), // 60s timeout for slow connections
          });

          if (!res.ok) {
            const errData = (await res.json().catch(() => ({}))) as any;
            const errMsg = errData?.error?.message || `HTTP ${res.status}`;
            if (res.status === 429) {
              throw new Error('Service rate limit reached. Please wait 1-2 minutes and try again.');
            }
            if (res.status === 400 || res.status === 403) {
              throw new Error('Invalid key. Please verify your edit service key in Settings.');
            }
            if (res.status === 503 || res.status === 404) {
              console.warn(`[Planner] Service returned ${res.status}. Retrying or falling back...`);
              if (attempt < maxRetries) {
                await new Promise((r) => setTimeout(r, 2000 * attempt));
                continue;
              }
              break;
            }
            throw new Error('Service error occurred while generating edit plan.');
          }

          const data = (await res.json()) as any;
          const candidate = data.candidates?.[0];
          const text = candidate?.content?.parts?.[0]?.text;
          if (!text) {
            throw new Error('Planner service returned an empty response.');
          }

          rawJsonResponse = JSON.parse(text);
          modelSuccess = true;
          break;
        } catch (err: any) {
          lastError = err;
          if (err.message.includes('rate limit') || err.message.includes('Invalid API key')) {
            throw err;
          }
          console.warn(`[GeminiPlanner] Attempt ${attempt} failed: ${err.message}`);
          if (attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, 2000 * attempt));
          }
        }
      }

      if (modelSuccess && rawJsonResponse) {
        break;
      }
    }

    if (!rawJsonResponse) {
      console.warn('[GeminiPlanner] AI call failed or models unavailable, using safe local synthesis:', lastError?.message);
      return this.synthesizeSafeFallbackPlan(req, `AI Automated Edit: ${lastError?.message || 'Generated from local media analysis'}`);
    }

    // Validate and sanitize the plan
    const validated = this.validateAndSanitizePlan(rawJsonResponse, req);
    return validated;
  }

  /**
   * Build text context from user prompt and local analysis
   */
  private buildContextMessage(req: PlanGenerationRequest): string {
    const { userPrompt, targetPlatform, aspectRatio, resolution, targetDurationSeconds, assets } = req;

    const assetsSummary = assets.map((a, idx) => {
      const isPhoto = a.isPhoto;
      const scenes = (a.scenes || []).slice(0, 15).map((s) => ({
        index: s.sceneIndex,
        start: Number(s.start.toFixed(2)),
        end: Number(s.end.toFixed(2)),
        duration: Number(s.duration.toFixed(2)),
      }));

      const silences = (a.silences || []).slice(0, 15).map((sil) => ({
        start: Number(sil.start.toFixed(2)),
        end: Number(sil.end.toFixed(2)),
        duration: Number(sil.duration.toFixed(2)),
      }));

      const transcriptionExcerpt = a.transcription?.fullText
        ? a.transcription.fullText.slice(0, 600)
        : 'No speech detected';

      return {
        assetIndex: idx + 1,
        id: a.id,
        originalName: a.originalName || a.filename,
        type: isPhoto ? 'photo' : 'video',
        durationSeconds: Number(a.durationSeconds.toFixed(2)),
        resolution: `${a.width}x${a.height}`,
        detectedScenesCount: scenes.length,
        detectedScenes: scenes,
        detectedSilencesCount: silences.length,
        detectedSilences: silences,
        transcriptionText: transcriptionExcerpt,
        spokenSegments: (a.transcription?.segments || []).slice(0, 15).map((seg) => ({
          start: Number(seg.start.toFixed(2)),
          end: Number(seg.end.toFixed(2)),
          text: seg.text,
        })),
      };
    });

    return JSON.stringify(
      {
        creativePrompt: userPrompt,
        frameSelection: {
          platform: targetPlatform,
          aspectRatio,
          resolution,
        },
        desiredTotalDurationSeconds: targetDurationSeconds || 'auto (derive from prompt/content)',
        projectMediaAssets: assetsSummary,
      },
      null,
      2
    );
  }

  /**
   * Extract small base64 frames if vision is ON
   */
  private extractPreviewFrames(assets: MediaAssetAnalysisContext[]): Array<{ inlineData: { mimeType: string; data: string } }> {
    const parts: Array<{ inlineData: { mimeType: string; data: string } }> = [];
    try {
      for (const asset of assets.slice(0, 5)) {
        let framePath = '';
        if (asset.previewPath && fs.existsSync(asset.previewPath) && asset.previewPath.endsWith('.jpg')) {
          framePath = asset.previewPath;
        } else if (asset.storagePath && fs.existsSync(asset.storagePath) && asset.isPhoto) {
          framePath = asset.storagePath;
        }

        if (framePath && fs.existsSync(framePath)) {
          const buf = fs.readFileSync(framePath);
          if (buf.length < 500000) {
            // max 500KB per image
            parts.push({
              inlineData: {
                mimeType: 'image/jpeg',
                data: buf.toString('base64'),
              },
            });
          }
        }
      }
    } catch (err) {
      console.warn('[GeminiPlanner] Could not attach preview frames for vision:', err);
    }
    return parts;
  }

  /**
   * Schema definition for Gemini Structured Outputs
   */
  private getPlanJsonSchema(): any {
    return {
      type: 'OBJECT',
      properties: {
        summary: { type: 'STRING', description: 'One-line summary of the edit' },
        explanation: { type: 'STRING', description: 'Simple 2-3 sentence explanation of the edit decisions' },
        frame: {
          type: 'OBJECT',
          properties: {
            platform: { type: 'STRING' },
            aspectRatio: { type: 'STRING' },
            resolution: { type: 'STRING' },
          },
          required: ['platform', 'aspectRatio', 'resolution'],
        },
        targetDurationSeconds: { type: 'NUMBER' },
        segments: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              assetId: { type: 'STRING' },
              sourceIn: { type: 'NUMBER' },
              sourceOut: { type: 'NUMBER' },
              speed: { type: 'NUMBER' },
              transition: { type: 'STRING', enum: ['cut', 'fade', 'crossfade', 'dissolve', 'wipe'] },
              motionEffect: {
                type: 'STRING',
                enum: ['none', 'zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'punch_in', 'ken_burns'],
              },
              reason: { type: 'STRING' },
            },
            required: ['assetId', 'sourceIn', 'sourceOut', 'speed', 'transition', 'motionEffect'],
          },
        },
        silenceRemoval: {
          type: 'OBJECT',
          properties: {
            enabled: { type: 'BOOLEAN' },
          },
          required: ['enabled'],
        },
        captions: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              startTime: { type: 'NUMBER' },
              endTime: { type: 'NUMBER' },
              text: { type: 'STRING' },
              style: { type: 'STRING' },
              position: { type: 'STRING' },
              fontSize: { type: 'STRING' },
              fontColor: { type: 'STRING' },
            },
            required: ['startTime', 'endTime', 'text', 'style', 'position'],
          },
        },
        textOverlays: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              startTime: { type: 'NUMBER' },
              endTime: { type: 'NUMBER' },
              text: { type: 'STRING' },
              position: { type: 'STRING' },
            },
            required: ['startTime', 'endTime', 'text', 'position'],
          },
        },
        bRollSegments: {
          type: 'ARRAY',
          description: 'Auto B-roll stock footage cutaway suggestions',
          items: {
            type: 'OBJECT',
            properties: {
              keyword: { type: 'STRING' },
              startTime: { type: 'NUMBER' },
              duration: { type: 'NUMBER' },
              reason: { type: 'STRING' },
            },
            required: ['keyword', 'startTime', 'duration'],
          },
        },
        audio: {
          type: 'OBJECT',
          properties: {
            musicEnabled: { type: 'BOOLEAN' },
            mood: { type: 'STRING' },
            volume: { type: 'NUMBER' },
            ducking: { type: 'BOOLEAN' },
          },
          required: ['musicEnabled', 'mood', 'volume'],
        },
      },
      required: ['summary', 'explanation', 'frame', 'targetDurationSeconds', 'segments', 'captions', 'audio'],
    };
  }

  /**
   * Validate and sanitize plan so no invalid assetId, negative times, or out-of-bound ranges exist
   */
  public validateAndSanitizePlan(raw: any, req: PlanGenerationRequest): GeminiEditingPlan {
    const assetMap = new Map<string, MediaAssetAnalysisContext>();
    for (const a of req.assets) {
      assetMap.set(a.id, a);
    }

    const rawSegments = Array.isArray(raw?.segments) ? raw.segments : [];
    const validSegments: any[] = [];

    for (const seg of rawSegments) {
      const asset = assetMap.get(seg.assetId);
      if (!asset) continue;

      const isPhoto = asset.isPhoto;
      const maxDur = asset.durationSeconds || (isPhoto ? 5.0 : 10.0);

      let sIn = Number(seg.sourceIn);
      let sOut = Number(seg.sourceOut);

      if (isNaN(sIn) || sIn < 0) sIn = 0;
      if (isNaN(sOut) || sOut <= sIn) sOut = sIn + (isPhoto ? 5.0 : 3.0);

      if (isPhoto) {
        sIn = 0;
        sOut = Math.min(10.0, Math.max(2.0, sOut));
      } else {
        if (sIn >= maxDur) sIn = 0;
        if (sOut > maxDur) sOut = maxDur;
        if (sOut <= sIn + 0.2) sOut = Math.min(maxDur, sIn + 2.0);
      }

      validSegments.push({
        assetId: asset.id,
        sourceIn: Number(sIn.toFixed(2)),
        sourceOut: Number(sOut.toFixed(2)),
        speed: seg.speed && seg.speed > 0 && seg.speed <= 4 ? Number(seg.speed.toFixed(2)) : 1.0,
        transition: ['cut', 'fade', 'crossfade', 'dissolve', 'wipe'].includes(seg.transition)
          ? seg.transition
          : 'cut',
        motionEffect: [
          'none',
          'zoom_in',
          'zoom_out',
          'pan_left',
          'pan_right',
          'punch_in',
          'ken_burns',
        ].includes(seg.motionEffect)
          ? seg.motionEffect
          : isPhoto
          ? 'ken_burns'
          : 'none',
        reason: seg.reason || `${isPhoto ? 'Photo' : 'Video'} clip from ${asset.originalName}`,
      });
    }

    // If no valid segments survived, assemble from assets
    if (validSegments.length === 0) {
      for (const asset of req.assets) {
        const isPhoto = asset.isPhoto;
        const dur = isPhoto ? 5.0 : Math.min(asset.durationSeconds || 5.0, 5.0);
        validSegments.push({
          assetId: asset.id,
          sourceIn: 0,
          sourceOut: Number(dur.toFixed(2)),
          speed: 1.0,
          transition: 'cut',
          motionEffect: isPhoto ? 'ken_burns' : 'none',
          reason: `Primary cut of ${asset.originalName}`,
        });
      }
    }

    const calculatedDuration = validSegments.reduce((acc, s) => acc + (s.sourceOut - s.sourceIn) / s.speed, 0);

    // Sanitize captions
    const captions: any[] = [];
    if (Array.isArray(raw?.captions)) {
      for (const cap of raw.captions) {
        if (cap.text && typeof cap.text === 'string' && cap.text.trim()) {
          const s = Math.max(0, Number(cap.startTime) || 0);
          const e = Math.max(s + 0.3, Number(cap.endTime) || s + 2.0);
          captions.push({
            startTime: Number(s.toFixed(2)),
            endTime: Number(e.toFixed(2)),
            text: cap.text.trim(),
            style: cap.style || 'standard',
            position: cap.position || 'bottom',
            fontSize: cap.fontSize || '28px',
            fontColor: cap.fontColor || '#ffffff',
          });
        }
      }
    }

    return {
      summary: raw?.summary || `Autonomous edit for ${req.targetPlatform}`,
      explanation:
        raw?.explanation ||
        `Arranged ${validSegments.length} segments with dynamic pacing and transitions tailored for ${req.targetPlatform}.`,
      frame: {
        platform: req.targetPlatform,
        aspectRatio: req.aspectRatio,
        resolution: req.resolution,
      },
      targetDurationSeconds: Number(calculatedDuration.toFixed(2)),
      segments: validSegments,
      silenceRemoval: {
        enabled: raw?.silenceRemoval?.enabled ?? true,
        removedIntervals: [],
      },
      captions,
      textOverlays: Array.isArray(raw?.textOverlays) ? raw.textOverlays : [],
      bRollSegments: Array.isArray(raw?.bRollSegments)
        ? raw.bRollSegments.map((br: any, i: number) => ({
            id: br.id || `broll_${Date.now()}_${i}`,
            keyword: String(br.keyword || 'scenic background'),
            startTime: Math.max(0, Number(br.startTime) || 0),
            duration: Math.max(1, Number(br.duration) || 3),
            reason: String(br.reason || ''),
            assetId: br.assetId,
            filePath: br.filePath,
            isPhoto: Boolean(br.isPhoto),
            stockItem: br.stockItem,
            removed: Boolean(br.removed),
          }))
        : [],
      audio: {
        musicEnabled: raw?.audio?.musicEnabled ?? false,
        mood: raw?.audio?.mood || 'upbeat',
        volume: typeof raw?.audio?.volume === 'number' ? raw.audio.volume : 0.2,
        ducking: raw?.audio?.ducking ?? true,
      },
    };
  }

  /**
   * Safe Fallback Plan when API is offline or completely fails
   */
  public synthesizeSafeFallbackPlan(req: PlanGenerationRequest, reason: string): GeminiEditingPlan {
    const segments: any[] = [];
    let accumulatedTime = 0;
    const targetDur = req.targetDurationSeconds && req.targetDurationSeconds > 0 ? req.targetDurationSeconds : 20.0;

    for (const asset of req.assets) {
      if (accumulatedTime >= targetDur) break;

      const isPhoto = asset.isPhoto;
      let clipDur = isPhoto ? 5.0 : Math.min(asset.durationSeconds || 5.0, 5.0);
      if (accumulatedTime + clipDur > targetDur) {
        clipDur = Math.max(1.5, targetDur - accumulatedTime);
      }

      segments.push({
        assetId: asset.id,
        sourceIn: 0,
        sourceOut: Number(clipDur.toFixed(2)),
        speed: 1.0,
        transition: segments.length === 0 ? 'cut' : 'crossfade',
        motionEffect: isPhoto ? 'ken_burns' : segments.length % 2 === 1 ? 'zoom_in' : 'none',
        reason: `Automated montage clip from ${asset.originalName}`,
      });

      accumulatedTime += clipDur;
    }

    // Collect captions from transcriptions
    const captions: any[] = [];
    let cursor = 0;
    for (const seg of segments) {
      const asset = req.assets.find((a) => a.id === seg.assetId);
      if (asset?.transcription?.segments) {
        for (const sub of asset.transcription.segments) {
          if (sub.start >= seg.sourceIn && sub.end <= seg.sourceOut) {
            const relStart = cursor + (sub.start - seg.sourceIn);
            const relEnd = cursor + (sub.end - seg.sourceIn);
            captions.push({
              startTime: Number(relStart.toFixed(2)),
              endTime: Number(relEnd.toFixed(2)),
              text: sub.text,
              style: 'standard',
              position: 'bottom',
              fontSize: '28px',
              fontColor: '#ffffff',
            });
          }
        }
      }
      cursor += seg.sourceOut - seg.sourceIn;
    }

    const bRollSegments: any[] = [];
    if (req.autoBRoll) {
      bRollSegments.push({
        id: `broll_fallback_${Date.now()}`,
        keyword: 'creative business technology',
        startTime: 2.0,
        duration: 3.0,
        reason: 'Auto B-roll cutaway overlay',
      });
    }

    return {
      summary: 'Basic plan (AI was not available)',
      explanation: `Basic plan (AI was not available): ${reason}. All clips are sequenced on track V1 with balanced pacing.`,
      frame: {
        platform: req.targetPlatform,
        aspectRatio: req.aspectRatio,
        resolution: req.resolution,
      },
      targetDurationSeconds: Number(accumulatedTime.toFixed(2)),
      segments,
      silenceRemoval: { enabled: true, removedIntervals: [] },
      captions,
      textOverlays: [],
      bRollSegments,
      audio: {
        musicEnabled: false,
        mood: 'upbeat',
        volume: 0.2,
        ducking: true,
      },
    };
  }
}

export const geminiPlannerService = new GeminiPlannerService();
