import React, { useRef, useState } from 'react';
import { FileText, Loader2, Trash2, Upload } from 'lucide-react';
import type { ProtocolAttachment } from '@/shared/api/documents';

interface ProtocolAttachmentsSectionProps {
  attachments: ProtocolAttachment[];
  canManage: boolean;
  busy: boolean;
  error: string | null;
  onUpload: (file: File, description: string) => Promise<boolean>;
  onRemove: (attachment: ProtocolAttachment) => Promise<void>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function ProtocolAttachmentsSection({
  attachments,
  canManage,
  busy,
  error,
  onUpload,
  onRemove,
}: ProtocolAttachmentsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState('');

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const uploaded = await onUpload(file, description);
    if (uploaded) setDescription('');
    event.target.value = '';
  };

  return (
    <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Protocol Attachments</h2>
          <p className="mt-1 text-xs text-slate-500">
            These files belong to the whole protocol. Reference them from a section by appendix number.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
        </span>
      </div>

      {error && (
        <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
          {error}
        </div>
      )}

      {attachments.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 px-4 py-6 text-center text-xs text-slate-500">
          No protocol attachments have been uploaded.
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="flex items-start gap-3 rounded border border-slate-200 p-3">
              <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-800">
                  Appendix {attachment.appendixNumber}: {attachment.filename}
                </div>
                {attachment.description && (
                  <p className="mt-0.5 text-xs text-slate-600">{attachment.description}</p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  Uploaded by {attachment.uploaderName} on {formatUploadedAt(attachment.uploadedAt)} · {formatBytes(attachment.sizeBytes)}
                </p>
              </div>
              {canManage && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRemove(attachment)}
                  className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Remove Appendix ${attachment.appendixNumber}`}
                  title="Remove attachment"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3">
          <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="protocol-attachment-description">
            Description (optional)
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="protocol-attachment-description"
              type="text"
              maxLength={2000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={busy}
              placeholder="What this appendix contains"
              className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
              onChange={handleFile}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload file
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            PDF, Word, Excel, image, or text files. Maximum size: 10 MB.
          </p>
        </div>
      )}
    </section>
  );
}
