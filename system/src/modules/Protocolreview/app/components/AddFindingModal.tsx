import { useState } from 'react';
import { X, AlertCircle, AlertTriangle } from 'lucide-react';
import type { ReportSection, FindingSeverity } from '../types/review';

interface AddFindingModalProps {
  isOpen: boolean;
  sections: ReportSection[];
  defaultSectionId?: string;
  addedBy: string;
  onClose: () => void;
  onSubmit: (finding: {
    sectionId: string;
    severity: FindingSeverity;
    description: string;
    location: string;
    reference: string;
  }) => void;
}

export function AddFindingModal({
  isOpen,
  sections,
  defaultSectionId,
  addedBy,
  onClose,
  onSubmit,
}: AddFindingModalProps) {
  const [severity, setSeverity] = useState<FindingSeverity>('warning');
  const [sectionId, setSectionId] = useState(defaultSectionId || sections[0]?.id || '');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [reference, setReference] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !sectionId) return;
    onSubmit({
      sectionId,
      severity,
      description: description.trim(),
      location: location.trim() || sections.find((s) => s.id === sectionId)?.title || '',
      reference: reference.trim(),
    });
    setDescription('');
    setLocation('');
    setReference('');
    setSeverity('warning');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="text-base font-semibold text-neutral-900">Add Regulatory Finding</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 rounded transition-colors"
          >
            <X className="h-4 w-4 text-neutral-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Severity */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-2">Severity</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSeverity('warning')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                  severity === 'warning'
                    ? 'bg-yellow-50 border-yellow-400 text-yellow-800'
                    : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Warning
              </button>
              <button
                type="button"
                onClick={() => setSeverity('blocker')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                  severity === 'blocker'
                    ? 'bg-rose-50 border-red-400 text-rose-800'
                    : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <AlertCircle className="h-3.5 w-3.5" />
                Blocker
              </button>
            </div>
          </div>

          {/* Affected Section */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              Affected Section
            </label>
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {sections.map((s, i) => (
                <option key={s.id} value={s.id}>
                  {i + 1}. {s.title}
                </option>
              ))}
            </select>
          </div>

          {/* Subsection / Location */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              Subsection / Location{' '}
              <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Inclusion Criteria, Primary Endpoint"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              Finding Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              placeholder="Describe the regulatory finding clearly and specifically…"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Regulatory Reference */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              Regulatory Reference{' '}
              <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. ISO 14155:2020 § 6.2.2, EU MDR 2017/745 Article 62"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <p className="text-xs text-neutral-400">
            Adding as{' '}
            <span className="font-medium text-neutral-600">{addedBy}</span> · Regulatory Affairs
          </p>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-md border border-neutral-300 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!description.trim()}
              className="flex-1 px-4 py-2.5 rounded-md bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Add Finding
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
