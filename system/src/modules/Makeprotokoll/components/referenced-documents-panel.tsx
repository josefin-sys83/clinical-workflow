import React, { useState } from 'react';
import { FileText, ExternalLink, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';

interface ReferencedDocument {
  id: string;
  title: string;
  type: 'risk-management' | 'clinical-evaluation' | 'investigators-brochure' | 'ifu' | 'sap' | 'pms' | 'other';
  version: string;
  date: string;
  status: 'approved' | 'draft' | 'not-available';
  sections?: string[];
}

interface ReferencedDocumentsPanelProps {
  documents: ReferencedDocument[];
  sectionId?: string;
}

export function ReferencedDocumentsPanel({ documents, sectionId }: ReferencedDocumentsPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'risk-management': 'Risk Management File (ISO 14971)',
      'clinical-evaluation': 'Clinical Evaluation Report',
      'investigators-brochure': "Investigator's Brochure",
      'ifu': 'IFU / Intended Use',
      'sap': 'Statistical Analysis Plan',
      'pms': 'PMS/PMCF Plan',
      'other': 'Supporting Document'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </span>
        );
      case 'draft':
        return (
          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">
            Draft
          </span>
        );
      case 'not-available':
        return (
          <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Not Available
          </span>
        );
    }
  };

  const filteredDocs = sectionId 
    ? documents.filter(doc => doc.sections?.includes(sectionId))
    : documents;

  return (
    <div className="border border-slate-300 rounded bg-slate-50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-600" />
          <span className="text-sm font-medium text-slate-900">
            Referenced Documents
          </span>
          {sectionId && (
            <span className="text-xs text-slate-500">
              ({filteredDocs.length} referenced)
            </span>
          )}
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-slate-500 transition-transform ${expanded ? '' : '-rotate-90'}`}
        />
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <div className="text-xs text-slate-600 mb-2">
            Supporting documents referenced in protocol consistency checks
          </div>

          {filteredDocs.length === 0 ? (
            <div className="text-xs text-slate-500 italic p-2">
              No documents referenced for this section
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDocs.map((doc) => (
                <div 
                  key={doc.id}
                  className="p-2 bg-white border border-slate-200 rounded text-xs"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 mb-0.5">
                        {doc.title}
                      </div>
                      <div className="text-slate-600">
                        {getDocumentTypeLabel(doc.type)}
                      </div>
                    </div>
                    {getStatusBadge(doc.status)}
                  </div>
                  
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                    <div className="text-slate-500">
                      Version {doc.version} • {doc.date}
                    </div>
                    <button className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      View
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900">
            <strong>Note:</strong> Referenced documents support traceability and consistency checks. 
            Protocol content must remain self-contained per regulatory requirements.
          </div>
        </div>
      )}
    </div>
  );
}
