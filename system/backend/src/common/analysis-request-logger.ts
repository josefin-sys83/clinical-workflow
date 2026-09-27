import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const logFile = resolve(process.env.ANALYZE_SECTION_LOG_FILE ?? 'logs/analyze-section.log');

export async function logAnalyzeSectionRequest(entry: Record<string, unknown>): Promise<void> {
  await mkdir(dirname(logFile), { recursive: true });
  await appendFile(logFile, `${JSON.stringify({ timestamp: new Date().toISOString(), ...entry })}\n`, 'utf8');
}
