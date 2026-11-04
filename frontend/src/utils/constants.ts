import { AspectRatio, EditingStyle, FrameRate, VideoResolution } from '../types/video';

export const ASPECT_RATIOS: Array<{
  id: AspectRatio;
  label: string;
  sublabel: string;
  iconName: string;
  widthRatio: number;
  heightRatio: number;
}> = [
  { id: '16:9', label: '16:9', sublabel: 'YouTube & Landscape', iconName: 'Monitor', widthRatio: 16, heightRatio: 9 },
  { id: '9:16', label: '9:16', sublabel: 'Shorts, Reels, TikTok', iconName: 'Smartphone', widthRatio: 9, heightRatio: 16 },
  { id: '1:1', label: '1:1', sublabel: 'Square Feed', iconName: 'Square', widthRatio: 1, heightRatio: 1 },
  { id: '4:5', label: '4:5', sublabel: 'Social Portrait', iconName: 'RectangleVertical', widthRatio: 4, heightRatio: 5 },
  { id: '21:9', label: '21:9', sublabel: 'Cinematic Anamorphic', iconName: 'Maximize2', widthRatio: 21, heightRatio: 9 },
];

export const RESOLUTIONS: Array<{
  id: VideoResolution;
  label: string;
  description: string;
}> = [
  { id: '1080p', label: '1080p Full HD', description: 'Recommended for general web & social' },
  { id: '4K', label: '4K Ultra HD', description: 'Master quality for broadcast & YouTube' },
  { id: '720p', label: '720p HD', description: 'Lightweight & fast turnaround' },
];

export const FRAME_RATES: Array<{
  id: FrameRate;
  label: string;
}> = [
  { id: '24fps', label: '24 fps (Film Cinematic)' },
  { id: '30fps', label: '30 fps (Web Standard)' },
  { id: '60fps', label: '60 fps (High Motion)' },
];

export const EDITING_STYLES: Array<{
  id: EditingStyle;
  label: string;
  description: string;
  defaultPacing: number;
}> = [
  {
    id: 'viral-fast',
    label: 'Fast-Paced Viral',
    description: 'Aggressive jump-cuts, animated subtitles, dynamic zooms on key moments',
    defaultPacing: 5,
  },
  {
    id: 'cinematic',
    label: 'Cinematic Narrative',
    description: 'Smooth rhythm, letterbox framing, graded color balance, and ambient sound',
    defaultPacing: 2,
  },
  {
    id: 'documentary',
    label: 'Documentary Story',
    description: 'Thoughtful pauses, lower-third tags, seamless dialogue smoothing',
    defaultPacing: 3,
  },
  {
    id: 'clean-corporate',
    label: 'Executive & Corporate',
    description: 'Polished cuts, formal captions, crisp audio normalization',
    defaultPacing: 2,
  },
  {
    id: 'minimal-vlog',
    label: 'Natural / Minimal Vlog',
    description: 'Subtle silence trimming, organic pacing preserving natural speech cadence',
    defaultPacing: 3,
  },
];

export const QUICK_PROMPT_TAGS: string[] = [
  'Cut all awkward silences > 0.4s',
  'Auto-generate animated captions',
  'Dynamic punch-in zoom on punchlines',
  'Remove filler words ("um", "uh", "like")',
  'Add subtle cinematic color grading',
  'Normalize speech dialogue to -14 LUFS',
  'Split into 60s viral highlights',
  'Add lower-third speaker title',
];

export interface VideoTemplate {
  id: string;
  title: string;
  category: 'Social' | 'Narrative' | 'Business' | 'Podcast';
  aspectRatio: AspectRatio;
  resolution: VideoResolution;
  style: EditingStyle;
  pacingDensity: number;
  durationTarget: string;
  description: string;
  promptBoilerplate: string;
  tags: string[];
}

export const VIDEO_TEMPLATES: VideoTemplate[] = [
  {
    id: 'tpl-shorts-viral',
    title: 'Viral Shorts & Reels Jump-Cut',
    category: 'Social',
    aspectRatio: '9:16',
    resolution: '1080p',
    style: 'viral-fast',
    pacingDensity: 5,
    durationTarget: '30-60 sec',
    description: 'Optimized for TikTok, Instagram Reels, and YouTube Shorts with rapid speech pacing and highlighted captions.',
    promptBoilerplate: 'Trim all pauses longer than 0.3 seconds. Add bold yellow & white animated captions in the lower third. Execute a 1.15x punch zoom whenever high emotion is detected. Keep total clip under 60 seconds.',
    tags: ['Shorts', 'Reels', 'Jump Cuts', 'Captions'],
  },
  {
    id: 'tpl-tech-explainer',
    title: 'Tech Review & Product Explainer',
    category: 'Business',
    aspectRatio: '16:9',
    resolution: '4K',
    style: 'clean-corporate',
    pacingDensity: 3,
    durationTarget: '3-8 min',
    description: 'Crisp, articulate narrative pacing with chapter segmentations, subtle lower thirds, and clear speech.',
    promptBoilerplate: 'Clean up audio artifacts and level speech. Remove hesitations and repetition. Keep transitions subtle with 0.2s crossfades between major discussion points.',
    tags: ['YouTube', 'Explainer', 'Corporate', '4K'],
  },
  {
    id: 'tpl-podcast-highlights',
    title: 'Podcast Dialogue Clip',
    category: 'Podcast',
    aspectRatio: '9:16',
    resolution: '1080p',
    style: 'viral-fast',
    pacingDensity: 4,
    durationTarget: '45-90 sec',
    description: 'Auto-frame the active speaker, generate karaoke-style word highlighting, and create high-engagement snippets.',
    promptBoilerplate: 'Identify the most insightful punchline or argument in this clip. Cut the setup to under 15 seconds, followed by the climax. Apply word-by-word synced subtitle captions.',
    tags: ['Podcast', 'Highlights', 'Vertical', 'Audio-Focus'],
  },
  {
    id: 'tpl-cinematic-travel',
    title: 'Cinematic Travel & Vlog',
    category: 'Narrative',
    aspectRatio: '16:9',
    resolution: '4K',
    style: 'cinematic',
    pacingDensity: 2,
    durationTarget: '2-5 min',
    description: 'Deliberate cadence with soft speed ramps, atmospheric color balance, and letterboxed aesthetic.',
    promptBoilerplate: 'Apply cinematic letterbox framing (2.39:1 look). Enhance dynamic range with deep contrast and warm highlights. Sync shot transitions to downbeats of background audio.',
    tags: ['Cinematic', 'Travel', 'Color Grade', 'Atmospheric'],
  },
  {
    id: 'tpl-webinar-digest',
    title: 'Webinar & Keynote Summary',
    category: 'Business',
    aspectRatio: '16:9',
    resolution: '1080p',
    style: 'clean-corporate',
    pacingDensity: 3,
    durationTarget: '5-10 min',
    description: 'Condense long-form presentation into high-value takeaways with corporate styling and bullet callouts.',
    promptBoilerplate: 'Extract key presentation statements while eliminating slides dead time and speech stumbling. Ensure professional audio mastering.',
    tags: ['Webinar', 'Digest', 'Keynote', 'Summary'],
  },
];

