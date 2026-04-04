import React, { useState } from 'react';
import { Lock, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { GlobalHeader } from '../global-header';
import { WorkflowSidebar } from '../workflow-sidebar';
import { RightPanel } from '../right-panel';
import { ProjectData } from '../App';

interface SynopsisProps {
  onContinue: () => void;
  onBack: () => void;
  projectData: ProjectData;
}

interface SynopsisSection {
  id: string;
  title: string;
  content: string;
  guidance: string[];
  isExpanded: boolean;
  isComplete: boolean;
}

export function Synopsis({ onContinue, onBack, projectData }: SynopsisProps) {
  const [isLocked, setIsLocked] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  
  const [sections, setSections] = useState<SynopsisSection[]>([
    {
      id: 's1',
      title: 'Background & Rationale',
      content: 'Severe aortic stenosis affects 3-5% of adults over 75 years. Current TAVR devices show limitations in paravalvular leak rates (8-12%) and permanent pacemaker requirement (15-20%). The CardioFlow system addresses these limitations through novel dual-seal mechanism and adaptive frame geometry.',
      guidance: [
        'Clinical problem and unmet medical need',
        'Current treatment landscape and limitations',
        'Device innovation rationale'
      ],
      isExpanded: true,
      isComplete: true
    },
    {
      id: 's2',
      title: 'Purpose / Objective',
      content: 'To evaluate the technical success, safety, and performance of the CardioFlow TAVR system in patients with severe symptomatic aortic stenosis in a first-in-human feasibility study.',
      guidance: [
        'Clear statement of study purpose',
        'Primary study question',
        'Intended patient population (high-level)'
      ],
      isExpanded: false,
      isComplete: true
    },
    {
      id: 's3',
      title: 'Study Design Overview',
      content: 'Prospective, single-arm, multicenter feasibility study. 45 patients enrolled across 3 EU clinical sites. Follow-up duration: 12 months post-procedure.',
      guidance: [
        'Study type and design (single-arm, controlled, etc.)',
        'Number of sites and approximate sample size',
        'Follow-up duration'
      ],
      isExpanded: false,
      isComplete: true
    },
    {
      id: 's4',
      title: 'Population',
      content: 'Patients ≥65 years with severe symptomatic aortic stenosis (AVA <1.0 cm²), deemed suitable for TAVR by multidisciplinary Heart Team. Exclusion: prior aortic valve replacement, life expectancy <12 months.',
      guidance: [
        'Key inclusion criteria (age, diagnosis)',
        'Key exclusion criteria',
        'Population characteristics'
      ],
      isExpanded: false,
      isComplete: true
    },
    {
      id: 's5',
      title: 'Sample Size',
      content: '45 patients. Sample size based on feasibility study design to assess technical success and collect preliminary safety data for pivotal trial planning.',
      guidance: [
        'Planned enrollment number',
        'Justification (feasibility vs. powered for hypothesis)',
        'Any interim analysis planned'
      ],
      isExpanded: false,
      isComplete: true
    },
    {
      id: 's6',
      title: 'Primary/Secondary Endpoints',
      content: 'Primary: Technical success at 30 days (successful deployment, correct positioning, freedom from emergency surgery). Secondary: All-cause mortality, stroke, MI, major vascular complications, new pacemaker, paravalvular leak ≥moderate at 30 days, 6 months, 12 months (VARC-3 criteria).',
      guidance: [
        'Primary endpoint clearly defined',
        'Key secondary endpoints',
        'Timing of assessments'
      ],
      isExpanded: false,
      isComplete: false
    },
    {
      id: 's7',
      title: 'Timeline Overview',
      content: 'Enrollment period: 6 months. Follow-up: 12 months post-procedure. Total study duration: approximately 18 months.',
      guidance: [
        'Enrollment period',
        'Follow-up duration',
        'Estimated study completion'
      ],
      isExpanded: false,
      isComplete: true
    }
  ]);

  const toggleSection = (id: string) => {
    setSections(sections.map(s =>
      s.id === id ? { ...s, isExpanded: !s.isExpanded } : s
    ));
  };

  const allSectionsComplete = sections.every(s => s.isComplete);

  return (
    <>
      <GlobalHeader
        projectName={projectData.projectName}
        protocolId={projectData.protocolId}
        version={projectData.version}
        protocolState={isLocked ? 'Locked' : 'Draft'}
        currentUserRole="Medical Writer"
      />

      <div className="flex-1 flex overflow-hidden">
        <WorkflowSidebar 
          currentStep="synopsis"
          onNavigate={() => {}}
        />

        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="max-w-5xl mx-auto p-8">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-slate-900 mb-1">
                Synopsis
              </h1>
              <p className="text-sm text-slate-600">
                Study foundation and consistency gate for downstream protocol development
              </p>
            </div>

            {/* Locked Notice */}
            {isLocked && (
              <div className="mb-6 p-4 bg-green-50 border border-green-300 rounded-lg">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-green-900 mb-1">
                      Synopsis Locked
                    </div>
                    <div className="text-xs text-green-800">
                      Changes to synopsis will trigger conflict detection in downstream protocol sections.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Incomplete Warning */}
            {!allSectionsComplete && !isLocked && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-amber-900 mb-1">
                      Incomplete Sections
                    </div>
                    <div className="text-xs text-amber-800">
                      All synopsis sections must be complete before approval.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Synopsis Sections */}
            <div className="space-y-4 mb-8">
              {sections.map((section) => (
                <div key={section.id} className="bg-white border border-slate-300 rounded-lg overflow-hidden">
                  {/* Section Header */}
                  <button
                    onClick={() => !isLocked && toggleSection(section.id)}
                    disabled={isLocked}
                    className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left disabled:hover:bg-white"
                  >
                    <div className="flex-shrink-0">
                      {section.isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-900">
                        {section.title}
                      </div>
                    </div>
                    {section.isComplete ? (
                      <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                        Complete
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        Draft
                      </span>
                    )}
                  </button>

                  {/* Section Content */}
                  {section.isExpanded && !isLocked && (
                    <div className="border-t border-slate-200 p-6 space-y-4">
                      {/* Guidance */}
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-sm font-semibold text-blue-900 mb-2">
                          What this section must include
                        </div>
                        <ul className="text-xs text-blue-800 space-y-1">
                          {section.guidance.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-blue-600 mt-0.5">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Content */}
                      <div>
                        <textarea
                          className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={4}
                          defaultValue={section.content}
                        />
                      </div>

                      <div className="text-xs text-slate-600">
                        Changes are auto-saved and audit-logged
                      </div>
                    </div>
                  )}

                  {/* Locked Content Preview */}
                  {section.isExpanded && isLocked && (
                    <div className="border-t border-slate-200 p-6">
                      <div className="text-sm text-slate-700 leading-relaxed">
                        {section.content}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 p-6 bg-white border border-slate-300 rounded-lg">
              <button
                onClick={onBack}
                className="px-5 py-2.5 text-sm font-medium rounded-md transition-colors text-slate-700 hover:bg-slate-100"
              >
                Back
              </button>
              {!isLocked ? (
                <>
                  <button
                    disabled={!allSectionsComplete}
                    className="px-5 py-2.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Submit for Review
                  </button>
                  <button
                    onClick={() => {
                      if (allSectionsComplete) {
                        setIsLocked(true);
                      }
                    }}
                    disabled={!allSectionsComplete}
                    className="px-5 py-2.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-slate-700 text-white hover:bg-slate-800"
                  >
                    Approve Synopsis
                  </button>
                </>
              ) : (
                <button
                  onClick={onContinue}
                  className="px-5 py-2.5 text-sm font-medium rounded-md transition-colors bg-blue-600 text-white hover:bg-blue-700"
                >
                  Continue to Protocol Development
                </button>
              )}
            </div>
          </div>
        </main>

        <RightPanel 
          isCollapsed={rightPanelCollapsed}
          onToggleCollapse={() => setRightPanelCollapsed(!rightPanelCollapsed)}
        />
      </div>
    </>
  );
}