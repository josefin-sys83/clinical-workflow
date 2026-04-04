import React, { useState } from 'react';
import { FileText, ChevronDown, ExternalLink } from 'lucide-react';

interface AISourceReferenceProps {
  sources: {
    type: 'synopsis' | 'intended-use' | 'objectives' | 'regulatory' | 'metadata';
    title: string;
    section?: string;
    lastUpdated: string;
  }[];
  generatedDate: string;
  aiVersion: string;
}

export function AISourceReference({ sources, generatedDate, aiVersion }: AISourceReferenceProps) {
  const [expanded, setExpanded] = useState(false);

  const getSourceIcon = (type: string) => {
    return <FileText className="w-3 h-3" />;
  };

  const getSourceColor = (type: string) => {
    switch (type) {
      case 'synopsis':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'intended-use':
        return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'objectives':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'regulatory':
        return 'text-slate-700 bg-slate-50 border-slate-200';
      case 'metadata':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="border border-blue-200 rounded bg-blue-50/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 text-left hover:bg-blue-100/50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-600 text-white rounded flex items-center justify-center text-xs font-bold">
              AI
            </div>
            <div>
              <div className="text-xs font-medium text-blue-900">
                AI-generated initial draft
              </div>
              <div className="text-xs text-blue-700">
                Based on {sources.length} approved source{sources.length > 1 ? 's' : ''} • {generatedDate}
              </div>
            </div>
          </div>
          <ChevronDown 
            className={`w-4 h-4 text-blue-600 transition-transform ${expanded ? '' : '-rotate-90'}`}
          />
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          <div className="p-3 bg-white border border-blue-200 rounded">
            <div className="text-xs font-medium text-slate-900 mb-2">Source Documents</div>
            <div className="space-y-2">
              {sources.map((source, idx) => (
                <div 
                  key={idx}
                  className={`flex items-start gap-2 p-2 rounded border ${getSourceColor(source.type)}`}
                >
                  {getSourceIcon(source.type)}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium">
                      {source.title}
                    </div>
                    {source.section && (
                      <div className="text-xs opacity-75">
                        {source.section}
                      </div>
                    )}
                    <div className="text-xs opacity-60 mt-1">
                      Last updated: {source.lastUpdated}
                    </div>
                  </div>
                  <button className="text-xs hover:underline flex items-center gap-1">
                    View
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-white border border-blue-200 rounded">
            <div className="text-xs font-medium text-slate-900 mb-2">Generation Details</div>
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>AI Model:</span>
                <span className="font-mono text-slate-900">{aiVersion}</span>
              </div>
              <div className="flex justify-between">
                <span>Generated:</span>
                <span className="text-slate-900">{generatedDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-amber-700 font-medium">Awaiting human review</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded">
            <div className="text-xs text-amber-900">
              <strong>Important:</strong> AI-generated content is a starting point only. 
              Review carefully, verify against source documents, and edit as needed. 
              You assume full responsibility for all protocol content after review.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
