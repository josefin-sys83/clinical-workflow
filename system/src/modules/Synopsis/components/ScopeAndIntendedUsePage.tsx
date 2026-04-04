import { useState } from 'react';
import { CheckCircle2, Circle, Lock, FileText, Target } from 'lucide-react';
import { WorkflowBreadcrumb } from './WorkflowBreadcrumb';
import { useNavigate } from 'react-router-dom';
import { AuditTrail, AuditEntry } from './AuditTrail';

interface WorkflowStep {
  id: string;
  label: string;
  status: 'completed' | 'active' | 'locked';
  description?: string;
  substeps?: WorkflowStep[];
}

export function ScopeAndIntendedUsePage() {
  const navigate = useNavigate();

  // Phase 1: Study & Protocol Setup
  const phase1Steps: WorkflowStep[] = [
    { id: '1', label: 'Setup', status: 'completed' },
    { id: '2', label: 'Synopsis', status: 'completed' },
    { id: '3', label: 'Scope & Intended Use', status: 'active' }
  ];

  // Audit Trail Entries
  const auditEntries: AuditEntry[] = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 1000 * 60 * 10),
      user: 'Dr. Sarah Chen',
      action: 'Scope & Intended Use page accessed',
      category: 'access',
      details: 'User navigated to Scope & Intended Use step after completing Synopsis',
      impact: 'low'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 1000 * 60 * 8),
      user: 'System',
      action: 'Gate validation passed',
      category: 'system',
      details: 'Synopsis completion verified. User granted access to Scope & Intended Use section.',
      impact: 'medium'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Sidebar - Step Navigation */}
      <aside className="w-80 bg-white border-r border-slate-200 flex-shrink-0 overflow-y-auto flex flex-col">
        <div className="p-6 flex-1">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Workflow Steps</h2>
          <nav className="space-y-4">
            {/* Phase 1: Study & Protocol Setup */}
            <div>
              <div className="mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Project setup</span>
              </div>
              <div className="space-y-1">
                {phase1Steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                      step.status === 'active'
                        ? 'bg-blue-50 text-blue-700'
                        : step.status === 'completed'
                        ? 'text-slate-700 hover:bg-slate-50 cursor-pointer'
                        : 'text-slate-400'
                    }`}
                    onClick={() => {
                      if (step.status === 'completed' && step.id === '2') {
                        navigate('/');
                      }
                    }}
                  >
                    <div className="flex-shrink-0">
                      {step.status === 'completed' && (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      )}
                      {step.status === 'active' && (
                        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium">
                          {index + 1}
                        </div>
                      )}
                      {step.status === 'locked' && (
                        <Lock className="w-5 h-5 text-slate-300" />
                      )}
                    </div>
                    <span className={`text-sm ${step.status === 'active' ? 'font-medium' : ''}`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </nav>
        </div>
        
        {/* System Information */}
        <div className="bg-slate-50 border-t border-slate-200 p-4">
          <div className="text-xs text-slate-600">
            <div className="font-medium mb-1">System Information</div>
            <div>Version 2.4.1</div>
            <div>Last updated: Jan 24, 2026</div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header with Breadcrumb */}
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <WorkflowBreadcrumb currentStep="project-setup" />
              <AuditTrail entries={auditEntries} pageTitle="Scope & Intended Use" />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="mb-6">
              <p className="text-slate-600">
                Define the scope and intended use of the medical device or intervention being studied.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-8">
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                  <Target className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Scope & Intended Use</h2>
                <p className="text-slate-600 text-center max-w-md">
                  This section is currently under development. Content will be available soon.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}