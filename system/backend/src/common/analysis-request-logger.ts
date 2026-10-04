import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const analysisLogFile = resolve(process.env.ANALYZE_SECTION_LOG_FILE ?? 'logs/analyze-section.log');
const generationLogFile = resolve(process.env.GENERATE_PROTOCOL_LOG_FILE ?? 'logs/generate-protocol.log');

async function appendRequest(logFile: string, entry: Record<string, unknown>): Promise<void> {
  await mkdir(dirname(logFile), { recursive: true });
  await appendFile(logFile, `${JSON.stringify({ timestamp: new Date().toISOString(), ...entry })}\n`, 'utf8');
}

export function logAnalyzeSectionRequest(entry: Record<string, unknown>): Promise<void> {
  return appendRequest(analysisLogFile, entry);
}

export function logGenerateProtocolRequest(entry: Record<string, unknown>): Promise<void> {
  return appendRequest(generationLogFile, entry);
}
