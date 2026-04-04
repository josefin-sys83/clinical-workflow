import React, { useState } from 'react';
import { CheckCircle, AlertCircle, Clock, Package, FileCheck, Download, ArrowLeft } from 'lucide-react';
import { GlobalHeader } from '../global-header';
import { WorkflowSidebar } from '../workflow-sidebar';
import { ProjectData } from '../App';

interface SubmissionPreparationProps {
  onBackToProtocol: () => void;
  projectData: ProjectData;
}

export function SubmissionPreparation({ onBackToProtocol, projectData }: SubmissionPreparationProps) {
  const [selectedExport, setSelectedExport] = useState('eu-mdr');

  const etmfItems = [
    { id: '1', name: 'Clinical Investigation Plan (PDF)', status: 'Ready', category: 'Protocol' },
    { id: '2', name: 'Synopsis', status: 'Ready', category: 'Protocol' },
    { id: '3', name: 'Approval Signatures', status: 'Ready', category: 'Approval' },
    { id: '4', name: 'Audit Trail Summary', status: 'Ready', category: 'Audit' },
    { id: '5', name: 'Amendment History', status: 'Filed', category: 'Versioning' },
    { id: '6', name: 'Deviation Log', status: 'Missing', category: 'Monitoring' }
  ];

  const signOffChain = [
    { role: 'Medical Writer', name: 'Dr. Emma Weber', status: 'Signed', timestamp: 'Feb 8, 2026 14:30' },
    { role: 'Regulatory Affairs', name: 'Lisa Schmidt', status: 'Signed', timestamp: 'Feb 8, 2026 15:15' },
    { role: 'Clinical Operations', name: 'Dr. Michael Berg', status: 'Signed', timestamp: 'Feb 8, 2026 16:00' },
    { role: 'Project Lead', name: 'Anna Schneider', status: 'Signed', timestamp: 'Feb 8, 2026 16:45' }
  ];

  const exportProfiles = [
    { id: 'eu-mdr', label: 'EU (MDR / ISO 14155)', validation: 'Pass' },
    { id: 'us-fda', label: 'US (FDA IDE / 21 CFR 812)', validation: 'Warn' },
    { id: 'sponsor', label: 'Sponsor Template', validation: 'Pass' }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Ready':
      case 'Filed':
      case 'Pass':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Warn':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      case 'Missing':
      case 'Block':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'Signed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Pending':
        return <Clock className="w-4 h-4 text-slate-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const hasMissingItems = etmfItems.some(item => item.status === 'Missing');

  return (
    <>
      <GlobalHeader
        projectName={projectData.projectName}
        protocolId={projectData.protocolId}
        version={projectData.version}
        protocolState="Locked"
        currentUserRole="Medical Writer"
      />

      <div className="flex-1 flex overflow-hidden">
        <WorkflowSidebar 
          currentStep="submission-preparation"
          onNavigate={() => {}}
        />

        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="max-w-5xl mx-auto p-8">
            {/* Header with Back Button */}
            <div className="mb-6">
              <button
                onClick={onBackToProtocol}
                className="flex items-center gap-2 mb-4 text-sm text-slate-700 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Protocol
              </button>
              <h1 className="text-xl font-semibold text-slate-900 mb-1">
                Submission Preparation
              </h1>
              <p className="text-sm text-slate-600">
                eTMF packaging, final sign-off, and authority-specific exports
              </p>
            </div>

            {/* Three-panel layout */}
            <div className="grid grid-cols-1 gap-6 mb-8">
              {/* 1. eTMF Package */}
              <div className="bg-white border border-slate-300 rounded-lg">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-slate-600" />
                    <h2 className="text-sm font-semibold text-slate-900">eTMF Package</h2>
                  </div>
                  {hasMissingItems && (
                    <span className="text-xs text-red-600 font-medium">Action Required</span>
                  )}
                </div>
                <div className="p-6">
                  <div className="space-y-2 mb-4">
                    {etmfItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(item.status)}
                          <div>
                            <div className="text-xs font-medium text-slate-900">{item.name}</div>
                            <div className="text-xs text-slate-600">{item.category}</div>
                          </div>
                        </div>
                        <span className={`text-xs font-medium ${
                          item.status === 'Ready' || item.status === 'Filed' 
                            ? 'text-green-700' 
                            : item.status === 'Missing'
                            ? 'text-red-700'
                            : 'text-slate-600'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    disabled={hasMissingItems}
                    className="w-full px-4 py-2.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Generate eTMF Filing Pack
                  </button>
                </div>
              </div>

              {/* 2. Final Sign-off */}
              <div className="bg-white border border-slate-300 rounded-lg">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
                  <FileCheck className="w-5 h-5 text-slate-600" />
                  <h2 className="text-sm font-semibold text-slate-900">Final Sign-off</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3 mb-4">
                    {signOffChain.map((sign, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 rounded">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(sign.status)}
                          <div>
                            <div className="text-xs font-medium text-slate-900">{sign.role}</div>
                            <div className="text-xs text-slate-600">{sign.name}</div>
                          </div>
                        </div>
                        <div className="text-xs text-slate-600">{sign.timestamp}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded">
                    All signatures collected and audit-logged
                  </div>
                </div>
              </div>

              {/* 3. Authority-specific Exports */}
              <div className="bg-white border border-slate-300 rounded-lg">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
                  <Download className="w-5 h-5 text-slate-600" />
                  <h2 className="text-sm font-semibold text-slate-900">Authority-specific Exports</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3 mb-4">
                    {exportProfiles.map((profile) => (
                      <button
                        key={profile.id}
                        onClick={() => setSelectedExport(profile.id)}
                        className={`w-full flex items-center justify-between p-3 border rounded transition-colors ${
                          selectedExport === profile.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            checked={selectedExport === profile.id}
                            onChange={() => {}}
                            className="w-4 h-4"
                          />
                          <div className="text-xs font-medium text-slate-900 text-left">
                            {profile.label}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(profile.validation)}
                          <span className={`text-xs font-medium ${
                            profile.validation === 'Pass' 
                              ? 'text-green-700' 
                              : 'text-amber-700'
                          }`}>
                            {profile.validation}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {exportProfiles.find(p => p.id === selectedExport)?.validation === 'Warn' && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded text-xs text-amber-800">
                      Warning: US FDA export requires additional sections per 21 CFR 812
                    </div>
                  )}
                  <button className="w-full px-4 py-2.5 text-sm font-medium rounded-md transition-colors bg-slate-700 text-white hover:bg-slate-800">
                    Generate Submission Export
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}