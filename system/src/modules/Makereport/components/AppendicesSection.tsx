import { Upload, Check, FileText } from 'lucide-react';
import { Appendix } from '../types';

interface AppendicesSectionProps {
  appendices: Appendix[];
  onUploadAppendix: (appendixId: string, file: File) => void;
  canEdit: boolean;
}

export function AppendicesSection({ appendices, onUploadAppendix, canEdit }: AppendicesSectionProps) {
  const requiredAppendices = appendices.filter(a => a.category === 'required');
  const recommendedAppendices = appendices.filter(a => a.category === 'recommended');
  const optionalAppendices = appendices.filter(a => a.category === 'optional');

  const handleFileSelect = (appendixId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUploadAppendix(appendixId, file);
    }
  };

  const renderAppendix = (appendix: Appendix) => {
    const isAttached = appendix.status === 'attached';

    return (
      <div
        key={appendix.id}
        className="border border-[#E5E7EB] rounded bg-white p-4 hover:border-[#D1D5DB] transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <FileText className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4
                  className="text-[#111827]"
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  {appendix.name}
                </h4>
                {isAttached ? (
                  <span
                    className="px-2 py-0.5 rounded flex items-center gap-1"
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      fontFamily: 'system-ui, sans-serif',
                      backgroundColor: '#DCFCE7',
                      color: '#166534',
                    }}
                  >
                    <Check className="w-3 h-3" />
                    Attached
                  </span>
                ) : (
                  <span
                    className="px-2 py-0.5 rounded"
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      fontFamily: 'system-ui, sans-serif',
                      backgroundColor: '#F3F4F6',
                      color: '#6B7280',
                    }}
                  >
                    Not attached
                  </span>
                )}
              </div>
              <p
                className="text-[#6B7280] mb-2"
                style={{
                  fontSize: '13px',
                  fontWeight: 400,
                  lineHeight: '1.5',
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                {appendix.description}
              </p>
              {isAttached && appendix.fileName && (
                <div
                  className="text-[#374151]"
                  style={{
                    fontSize: '12px',
                    fontWeight: 400,
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  <span className="text-[#6B7280]">File:</span> {appendix.fileName}
                  {appendix.fileSize && (
                    <>
                      {' · '}
                      <span className="text-[#6B7280]">{appendix.fileSize}</span>
                    </>
                  )}
                  {appendix.uploadDate && (
                    <>
                      {' · '}
                      <span className="text-[#6B7280]">Uploaded {appendix.uploadDate}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {canEdit && (
            <div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFileSelect(appendix.id, e)}
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                />
                <div
                  className="px-3 py-1.5 border border-[#D1D5DB] text-[#374151] rounded hover:bg-[#F9FAFB] transition-colors flex items-center gap-1.5"
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  <Upload className="w-3.5 h-3.5" />
                  {isAttached ? 'Replace' : 'Upload'}
                </div>
              </label>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Info Notice */}
      <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded">
        <p
          className="text-[#1E40AF]"
          style={{
            fontSize: '13px',
            fontWeight: 400,
            lineHeight: '1.5',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Appendices provide full traceability and supporting evidence for the Clinical Investigation
          Report. All required appendices must be attached before final approval.
        </p>
      </div>

      {/* Required Appendices */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3
            className="text-[#111827]"
            style={{
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            Required Appendices
          </h3>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 500,
              fontFamily: 'system-ui, sans-serif',
              color: '#6B7280',
            }}
          >
            Mandatory
          </span>
        </div>
        <div className="space-y-3">{requiredAppendices.map(renderAppendix)}</div>
      </div>

      {/* Recommended Appendices */}
      {recommendedAppendices.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3
              className="text-[#111827]"
              style={{
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              Recommended Appendices
            </h3>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 500,
                fontFamily: 'system-ui, sans-serif',
                color: '#6B7280',
              }}
            >
              Recommended
            </span>
          </div>
          <div className="space-y-3">{recommendedAppendices.map(renderAppendix)}</div>
        </div>
      )}

      {/* Optional Appendices */}
      {optionalAppendices.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3
              className="text-[#111827]"
              style={{
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              Optional Appendices
            </h3>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 500,
                fontFamily: 'system-ui, sans-serif',
                color: '#6B7280',
              }}
            >
              Optional
            </span>
          </div>
          <div className="space-y-3">{optionalAppendices.map(renderAppendix)}</div>
        </div>
      )}
    </div>
  );
}