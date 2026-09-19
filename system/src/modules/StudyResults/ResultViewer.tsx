import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
import type { StudyResult } from '@/shared/api/results';
import { ResultContent } from './ResultContent';
import { buttonClass } from './ResultEditor';

export function ResultViewer({ result }: { result: StudyResult }) {
  const [actualSize, setActualSize] = useState(false);
  return (
    <div className="space-y-2">
      <ResultContent content={result.content} />
      {result.type === 'figure' && !result.content.image && (
        <p className="text-xs text-slate-500">
          This figure contains data or a specification. An author can attach its
          PNG/JPEG image using Edit result.
        </p>
      )}
      <Dialog onOpenChange={() => setActualSize(false)}>
        <DialogTrigger asChild>
          <button className={buttonClass}>View full size</button>
        </DialogTrigger>
        <DialogContent className="flex h-[92vh] w-[96vw] max-w-none flex-col sm:max-w-none">
          <DialogTitle className="pr-6">{result.title}</DialogTitle>
          <DialogDescription>
            {result.sourceFilename}
            {result.sourceLocation ? ` · ${result.sourceLocation}` : ''}
          </DialogDescription>
          {!!result.content.image && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={actualSize}
                onChange={(event) => setActualSize(event.target.checked)}
              />
              Show image at original size
            </label>
          )}
          <div
            className="min-h-0 flex-1 overflow-auto"
            tabIndex={0}
            aria-label="Full-size result content"
          >
            <ResultContent
              content={result.content}
              expanded
              actualImageSize={actualSize}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
