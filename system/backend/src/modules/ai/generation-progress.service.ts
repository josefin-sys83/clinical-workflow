import { Injectable } from '@nestjs/common';

interface ProgressEntry {
  completed: number;
  total: number;
  currentLabel: string | null;
  updatedAt: number;
}

// In-memory only: progress is purely advisory UI feedback for a single long-running
// generation call, not durable state. Losing it on a server restart just means the
// client falls back to the generic "still working" message, which is fine.
@Injectable()
export class GenerationProgressService {
  private readonly entries = new Map<string, ProgressEntry>();

  start(key: string, total: number): void {
    this.entries.set(key, { completed: 0, total, currentLabel: null, updatedAt: Date.now() });
  }

  increment(key: string, label: string): void {
    const entry = this.entries.get(key);
    if (!entry) return;
    entry.completed += 1;
    entry.currentLabel = label;
    entry.updatedAt = Date.now();
  }

  get(key: string): ProgressEntry | null {
    return this.entries.get(key) ?? null;
  }

  clear(key: string): void {
    this.entries.delete(key);
  }
}
