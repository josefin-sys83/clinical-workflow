import React, { useState } from 'react';
import { Package, CheckCircle, AlertCircle, Clock, FileText, Download } from 'lucide-react';

interface eTMFItem {
  id: string;
  name: string;
  description: string;
  status: 'Ready' | 'Missing' | 'Filed';
  category: string;
  lastUpdated?: string;
}

interface eTMFPackagePanelProps {
  protocolName: string;
  versionId: string;
  lastActivity?: string;
}

export function eTMFPackagePanel({ protocolName, versionId, lastActivity }: eTMFPackagePanelProps) {
  const [selectedDestination, setSelectedDestination] = useState('veeva-vault');
  const [items, setItems] = useState<eTMFItem[]>([
    {
      id: 'protocol-pdf',
      name: 'Clinical Investigation Plan (PDF)',
      description: 'Final approved protocol document with all sections',
      status: 'Ready',
      category: 'Core Protocol Documents',
      lastUpdated: 'Feb 8, 2026 at 14:23 CET'
    },
    {
      id: 'protocol-docx',
      name: 'Clinical Investigation Plan (DOCX)',
      description: 'Editable protocol document for authority submissions',
      status: 'Ready',
      category: 'Core Protocol Documents',
      lastUpdated: 'Feb 8, 2026 at 14:23 CET'
    },
    {
      id: 'synopsis',
      name: 'Protocol Synopsis',
      description: 'Approved synopsis from Gate 3',
      status: 'Ready',
      category: 'Core Protocol Documents',
      lastUpdated: 'Feb 1, 2026 at 09:15 CET'
    },
    {
      id: 'approval-log',
      name: 'Section Approval Log',
      description: 'Complete log of all section approvals with timestamps',
      status: 'Ready',
      category: 'Quality & Approvals',
      lastUpdated: 'Feb 8, 2026 at 14:20 CET'
    },
    {
      id: 'audit-summary',
      name: 'Audit Trail Summary',
      description: 'Complete audit trail of all protocol edits and reviews',
      status: 'Ready',
      category: 'Quality & Approvals',
      lastUpdated: 'Feb 8, 2026 at 14:22 CET'
    },
    {
      id: 'deviation-log',
      name: 'Justified Deviations Log',
      description: 'Log of all justified deviations from Synopsis with rationale',
      status: 'Missing',
      category: 'Quality & Approvals',
    },
    {
      id: 'amendment-history',
      name: 'Amendment History',
      description: 'Version control history and amendment documentation',
      status: 'Ready',
      category: 'Version Control',
      lastUpdated: 'Feb 8, 2026 at 14:21 CET'
    },
    {
      id: 'signature-log',
      name: 'Electronic Signature Log',
      description: 'Complete signature records for all approvals',
      status: 'Missing',
      category: 'Quality & Approvals',
    }
  ]);

  const destinations = [
    { id: 'veeva-vault', name: 'Veeva Vault eTMF', icon: '📦' },
    { id: 'docuvault', name: 'DocuVault TMF', icon: '📁' },
    { id: 'local-export', name: 'Local Export', icon: '💾' }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Ready':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Missing':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'Filed':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ready':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'Missing':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'Filed':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, eTMFItem[]>);

  const readyCount = items.filter(i => i.status === 'Ready').length;
  const missingCount = items.filter(i => i.status === 'Missing').length;
  const filedCount = items.filter(i => i.status === 'Filed').length;
  const hasBlockers = missingCount > 0;

  const handleGeneratePack = () => {
    console.log('Generate eTMF Filing Pack for:', selectedDestination);
    alert(`eTMF Filing Pack generated for ${destinations.find(d => d.id === selectedDestination)?.name}\n\nAll actions are audit-logged with full traceability.`);
  };

  return (
    <div className="bg-white border border-slate-300 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center">
              <Package className="w-4 h-4 text-blue-700" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">eTMF Package</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Prepare regulatory filing package for Trial Master File
              </p>
            </div>
          </div>
          {lastActivity && (
            <div className="text-xs text-slate-500">
              <span className="text-slate-400">Last activity:</span> {lastActivity}
            </div>
          )}
        </div>

        {/* Status Summary */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-slate-700">{readyCount} Ready</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-slate-700">{missingCount} Missing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            <span className="text-slate-700">{filedCount} Filed</span>
          </div>
        </div>
      </div>

      {/* Destination Selector */}
      <div className="px-5 py-4 bg-white border-b border-slate-200">
        <label className="block text-xs font-medium text-slate-700 uppercase tracking-wide mb-2">
          eTMF System Destination
        </label>
        <div className="grid grid-cols-3 gap-2">
          {destinations.map((dest) => (
            <button
              key={dest.id}
              onClick={() => setSelectedDestination(dest.id)}
              className={`px-3 py-2.5 text-sm border rounded-lg transition-all ${
                selectedDestination === dest.id
                  ? 'border-blue-500 bg-blue-50 text-blue-900 font-medium'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
              }`}
            >
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-lg">{dest.icon}</span>
                <span className="text-xs leading-tight text-center">{dest.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Document Checklist */}
      <div className="px-5 py-4">
        <div className="text-xs font-medium text-slate-700 uppercase tracking-wide mb-3">
          Filing Package Contents
        </div>

        <div className="space-y-5">
          {Object.entries(groupedItems).map(([category, categoryItems]) => (
            <div key={category}>
              <div className="text-xs font-medium text-slate-600 mb-2">{category}</div>
              <div className="space-y-2">
                {categoryItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                  >
                    <div className="mt-0.5">{getStatusIcon(item.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h4 className="text-sm font-medium text-slate-900">{item.name}</h4>
                        <span className={`px-2 py-0.5 text-xs font-medium border rounded whitespace-nowrap ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-1.5">
                        {item.description}
                      </p>
                      {item.lastUpdated && (
                        <div className="text-xs text-slate-500">
                          <span className="text-slate-400">Updated:</span> {item.lastUpdated}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 py-4 bg-slate-50 border-t border-slate-200">
        {hasBlockers && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-red-900 mb-0.5">
                  Cannot generate filing pack
                </div>
                <p className="text-xs text-red-800">
                  {missingCount} required {missingCount === 1 ? 'document is' : 'documents are'} missing. Complete all items before generating eTMF pack.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-600">
            All filing actions are audit-logged with full traceability
          </p>
          <button
            onClick={handleGeneratePack}
            disabled={hasBlockers}
            className={`px-5 py-2.5 text-sm rounded-md font-medium transition-colors ${
              hasBlockers
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Generate eTMF Filing Pack
          </button>
        </div>
      </div>
    </div>
  );
}
