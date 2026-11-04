export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime', // .mov
  'video/x-msvideo', // .avi
  'video/x-matroska', // .mkv
  'video/ogg',
];

export const MAX_VIDEO_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

/**
 * Validates a video file for local browser playback & client workspace processing
 */
export function validateVideoFile(file: File): FileValidationResult {
  if (!file) {
    return { isValid: false, error: 'No file provided.' };
  }

  // Type check (allow if mime type matches or extension matches)
  const ext = file.name.split('.').pop()?.toLowerCase();
  const validExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'ogv'];
  
  const hasValidType = ACCEPTED_VIDEO_TYPES.includes(file.type);
  const hasValidExt = ext ? validExtensions.includes(ext) : false;

  if (!hasValidType && !hasValidExt) {
    return {
      isValid: false,
      error: `Unsupported file format (${file.type || ext}). Please upload an MP4, WebM, or MOV video file.`,
    };
  }

  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    return {
      isValid: false,
      error: `File size exceeds the 2 GB client workspace limit. Please compress or select a smaller raw clip.`,
    };
  }

  return { isValid: true };
}

