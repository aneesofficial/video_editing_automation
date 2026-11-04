import { analysisWorker } from './analysis.worker.js';
import { transcriptionWorker } from './transcription.worker.js';
import { aiDirectorWorker } from './ai-director.worker.js';
import { renderWorker } from './render.worker.js';

export function startWorkers() {
  console.log('[Workers] Initializing background task workers...');

  analysisWorker.on('completed', (job) => {
    console.log(`[Queue:media-analysis] Job ${job.id} completed.`);
  });
  analysisWorker.on('failed', (job, err) => {
    console.error(`[Queue:media-analysis] Job ${job?.id} failed:`, err);
  });

  transcriptionWorker.on('completed', (job) => {
    console.log(`[Queue:media-transcription] Job ${job.id} completed.`);
  });
  transcriptionWorker.on('failed', (job, err) => {
    console.error(`[Queue:media-transcription] Job ${job?.id} failed:`, err);
  });

  aiDirectorWorker.on('completed', (job) => {
    console.log(`[Queue:ai-director] Job ${job.id} completed.`);
  });
  aiDirectorWorker.on('failed', (job, err) => {
    console.error(`[Queue:ai-director] Job ${job?.id} failed:`, err);
  });

  renderWorker.on('completed', (job) => {
    console.log(`[Queue:video-rendering] Job ${job.id} completed.`);
  });
  renderWorker.on('failed', (job, err) => {
    console.error(`[Queue:video-rendering] Job ${job?.id} failed:`, err);
  });

  console.log('[Workers] All background workers active and listening for jobs.');
}

if (process.argv[1] && process.argv[1].endsWith('workers/index.ts')) {
  startWorkers();
}

