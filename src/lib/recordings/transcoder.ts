// ---------------------------------------------------------------------------
// Audio Processing - Transcoding, peak generation, and snippet extraction
// ---------------------------------------------------------------------------
// Uses ffmpeg/ffprobe via child_process.spawn for audio operations.
// All operations are non-blocking and stream-based where possible.

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TranscodeResult {
  /** Output file path */
  outputPath: string;
  /** Duration in seconds */
  duration: number;
  /** Output file size in bytes */
  fileSize: number;
}

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] [Transcoder] ${message}`);
}

// ---------------------------------------------------------------------------
// transcodeToOpus - WAV to Opus transcoding via ffmpeg
// ---------------------------------------------------------------------------

/**
 * Transcode a WAV file to Opus format in an OGG container.
 * Uses ffmpeg with mono channel, 24kbps bitrate, and 48kHz sample rate
 * optimized for voice telephony recordings.
 *
 * @param inputPath - Path to the input WAV file
 * @param outputPath - Path for the output OGG/Opus file
 * @returns Transcode result with path, duration, and file size
 */
export async function transcodeToOpus(
  inputPath: string,
  outputPath: string
): Promise<TranscodeResult> {
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });

  return new Promise<TranscodeResult>((resolve, reject) => {
    const args = [
      '-i', inputPath,
      '-c:a', 'libopus',
      '-b:a', '24k',
      '-ar', '48000',
      '-ac', '1',
      '-y', // Overwrite output file
      outputPath,
    ];

    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn ffmpeg: ${err.message}`));
    });

    proc.on('close', async (code) => {
      if (code !== 0) {
        log(`ffmpeg transcode failed (code ${code}): ${stderr.slice(-500)}`);
        reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-200)}`));
        return;
      }

      try {
        const stat = await fs.stat(outputPath);
        const duration = await getAudioDuration(outputPath);

        log(`Transcoded ${path.basename(inputPath)} -> ${path.basename(outputPath)} ` +
            `(${duration.toFixed(1)}s, ${(stat.size / 1024).toFixed(0)} KB)`);

        resolve({
          outputPath,
          duration,
          fileSize: stat.size,
        });
      } catch (err) {
        reject(new Error(
          `Transcode succeeded but failed to read output: ${err instanceof Error ? err.message : err}`
        ));
      }
    });
  });
}

// ---------------------------------------------------------------------------
// generatePeaks - Waveform peak generation for wavesurfer.js
// ---------------------------------------------------------------------------

/**
 * Generate waveform peaks from an audio file for visualization with wavesurfer.js.
 * Extracts raw PCM samples via ffmpeg, downsamples to the requested number of
 * points using RMS (root mean square) calculation, and normalizes to 0-1 range.
 *
 * @param audioPath - Path to the audio file (any format ffmpeg supports)
 * @param numPeaks - Number of waveform points to generate (default 800)
 * @returns Array of normalized peak values (0-1)
 */
export async function generatePeaks(
  audioPath: string,
  numPeaks: number = 800
): Promise<number[]> {
  return new Promise<number[]>((resolve, reject) => {
    // Extract raw PCM samples: signed 16-bit little-endian, mono, 8kHz
    // We use a low sample rate to reduce the amount of data we need to process
    const args = [
      '-i', audioPath,
      '-f', 's16le',  // Signed 16-bit little-endian PCM
      '-ac', '1',     // Mono
      '-ar', '8000',  // 8kHz sample rate (sufficient for peak generation)
      '-',            // Output to stdout
    ];

    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    const chunks: Buffer[] = [];
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      chunks.push(data);
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn ffmpeg for peak generation: ${err.message}`));
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        log(`ffmpeg peak generation failed (code ${code}): ${stderr.slice(-500)}`);
        reject(new Error(`ffmpeg exited with code ${code}`));
        return;
      }

      try {
        const pcmData = Buffer.concat(chunks);

        // Convert to Int16 samples
        const sampleCount = Math.floor(pcmData.length / 2);
        if (sampleCount === 0) {
          resolve(new Array(numPeaks).fill(0));
          return;
        }

        const samples = new Int16Array(sampleCount);
        for (let i = 0; i < sampleCount; i++) {
          samples[i] = pcmData.readInt16LE(i * 2);
        }

        // Calculate RMS for each window
        const samplesPerPeak = Math.max(1, Math.floor(sampleCount / numPeaks));
        const peaks: number[] = [];

        for (let i = 0; i < numPeaks; i++) {
          const start = i * samplesPerPeak;
          const end = Math.min(start + samplesPerPeak, sampleCount);

          if (start >= sampleCount) {
            peaks.push(0);
            continue;
          }

          let sumSquares = 0;
          for (let j = start; j < end; j++) {
            const normalized = samples[j] / 32768; // Normalize Int16 to -1..1
            sumSquares += normalized * normalized;
          }

          const rms = Math.sqrt(sumSquares / (end - start));
          peaks.push(rms);
        }

        // Normalize peaks to 0-1 range
        const maxPeak = Math.max(...peaks, 0.001); // Avoid division by zero
        const normalizedPeaks = peaks.map((p) => Math.min(1, p / maxPeak));

        log(`Generated ${normalizedPeaks.length} waveform peaks for ${path.basename(audioPath)}`);
        resolve(normalizedPeaks);
      } catch (err) {
        reject(new Error(
          `Failed to process PCM data: ${err instanceof Error ? err.message : err}`
        ));
      }
    });
  });
}

// ---------------------------------------------------------------------------
// getAudioDuration - Get duration in seconds via ffprobe
// ---------------------------------------------------------------------------

/**
 * Get the duration of an audio file in seconds using ffprobe.
 *
 * @param filePath - Path to the audio file
 * @returns Duration in seconds
 */
export async function getAudioDuration(filePath: string): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const args = [
      '-v', 'quiet',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ];

    const proc = spawn('ffprobe', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn ffprobe: ${err.message}`));
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exited with code ${code}: ${stderr.slice(-200)}`));
        return;
      }

      const duration = parseFloat(stdout.trim());
      if (isNaN(duration)) {
        reject(new Error(`ffprobe returned invalid duration: "${stdout.trim()}"`));
        return;
      }

      resolve(duration);
    });
  });
}

// ---------------------------------------------------------------------------
// createSnippet - Extract a segment of audio
// ---------------------------------------------------------------------------

/**
 * Extract a segment of an audio file between two timestamps.
 * Uses stream copy for speed when the container format supports it.
 *
 * @param inputPath - Path to the source audio file
 * @param startMs - Start time in milliseconds
 * @param endMs - End time in milliseconds
 * @param outputPath - Path for the output snippet file
 * @returns The output file path
 */
export async function createSnippet(
  inputPath: string,
  startMs: number,
  endMs: number,
  outputPath: string
): Promise<string> {
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });

  const startSec = (startMs / 1000).toFixed(3);
  const endSec = (endMs / 1000).toFixed(3);

  return new Promise<string>((resolve, reject) => {
    const args = [
      '-i', inputPath,
      '-ss', startSec,
      '-to', endSec,
      '-c', 'copy',
      '-y',
      outputPath,
    ];

    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn ffmpeg for snippet: ${err.message}`));
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        log(`ffmpeg snippet failed (code ${code}): ${stderr.slice(-500)}`);
        reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-200)}`));
        return;
      }

      log(`Created snippet ${path.basename(outputPath)} ` +
          `(${startMs}ms - ${endMs}ms from ${path.basename(inputPath)})`);
      resolve(outputPath);
    });
  });
}
