import React, { useState } from 'react';
import { FileEdit, X } from 'lucide-react';

interface AmendmentModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; reason: string; description: string; affectedProtocolSections: string[] }) => void;
  protocolSections: { id: string; title: string }[];
  createdBy: string;
}

export function AmendmentModal({ open, onClose, onSubmit, protocolSections, createdBy }: AmendmentModalProps) {
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [affectedProtocolSections, setAffectedProtocolSections] = useState<string[]>([]);

  if (!open) return null;

  const toggleSection = (id: string) => {
    setAffectedProtocolSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const isValid = title.trim() && reason.trim() && description.trim() && affectedProtocolSections.length > 0;

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit({ title: title.trim(), reason: reason.trim(), description: description.trim(), affectedProtocolSections });
    setTitle('');
    setReason('');
    setDescription('');
    setAffectedProtocolSections([]);
  };

  const handleClose = () => {
    setTitle('');
    setReason('');
    setDescription('');
    setAffectedProtocolSections([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <FileEdit className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-900 mb-1">Initiate Protocol Amendment</h3>
              <p className="text-xs text-slate-600">Requested by {createdBy}</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Amendment Title <span className="text-rose-700">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Update primary endpoint definition"
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Reason for Amendment <span className="text-rose-700">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Regulatory feedback from competent authority requires endpoint clarification"
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              style={{ minHeight: '70px' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              What Exactly Changes <span className="text-rose-700">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the specific content changes this amendment introduces"
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              style={{ minHeight: '90px' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">
              Affected Protocol Sections <span className="text-rose-700">*</span>
            </label>
            <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded">
              {protocolSections.map((section) => (
                <label key={section.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={affectedProtocolSections.includes(section.id)}
                    onChange={() => toggleSection(section.id)}
                    className="rounded border-slate-300"
                  />
                  <span>{section.title}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-xs text-blue-900 leading-relaxed">
              This amendment will require approval from the Protocol Lead or Clinical Affairs VP before it takes effect. Report authoring will be blocked until the amendment is resolved.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-xs text-slate-700 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className={`px-4 py-2 text-xs rounded transition-colors flex items-center gap-2 ${
              isValid ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <FileEdit className="w-3.5 h-3.5" />
            <span>Submit Amendment</span>
          </button>
        </div>
      </div>
    </div>
  );
}
