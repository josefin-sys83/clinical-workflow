import React, { useState } from 'react';
import { Building2, Package, Globe } from 'lucide-react';
import { GlobalHeader } from '../global-header';
import { WorkflowSidebar } from '../workflow-sidebar';
import { ProjectData } from '../App';

interface ProjectSetupProps {
  onContinue: () => void;
  projectData: ProjectData;
}

export function ProjectSetup({ onContinue, projectData }: ProjectSetupProps) {
  const [formData, setFormData] = useState({
    projectName: projectData.projectName,
    protocolId: projectData.protocolId,
    version: projectData.version,
    sponsor: projectData.sponsor,
    manufacturer: projectData.sponsor,
    deviceName: projectData.deviceName,
    deviceModel: 'TAVR-CF-2026',
    targetMarkets: ['EU', 'US'],
    studyType: 'Clinical Investigation (Device)'
  });

  const allFieldsFilled = formData.projectName && formData.sponsor && formData.deviceName;

  return (
    <>
      <GlobalHeader
        projectName="New Protocol"
        protocolId="—"
        version="v0.1"
        protocolState="Draft"
        currentUserRole="Project Manager"
      />

      <div className="flex-1 flex overflow-hidden">
        <WorkflowSidebar 
          currentStep="project-setup"
          onNavigate={() => {}}
        />

        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="max-w-4xl mx-auto p-8">
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-slate-900 mb-1">
                Project Setup
              </h1>
              <p className="text-sm text-slate-600">
                Establish project identity and key entities
              </p>
            </div>

            <div className="space-y-6 mb-8">
              {/* Project Identity */}
              <div className="bg-white border border-slate-300 rounded-lg p-6">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">Project Identity</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">
                      Project Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.projectName}
                      onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., CardioFlow TAVR Clinical Investigation"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-2">
                        Protocol ID <span className="text-slate-500">(auto-generated)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.protocolId}
                        disabled
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-slate-50 text-slate-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-2">
                        Version
                      </label>
                      <input
                        type="text"
                        value={formData.version}
                        disabled
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-slate-50 text-slate-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sponsor */}
              <div className="bg-white border border-slate-300 rounded-lg p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Building2 className="w-5 h-5 text-slate-600 mt-0.5" />
                  <div className="flex-1">
                    <h2 className="text-sm font-semibold text-slate-900">Sponsor</h2>
                    <p className="text-xs text-slate-600 mt-1">
                      The sponsor is the legal responsible party for the clinical investigation
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">
                      Sponsor Legal Entity <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.sponsor}
                      onChange={(e) => setFormData({ ...formData, sponsor: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., CardioFlow Medical Technologies GmbH"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">
                      Manufacturer <span className="text-slate-500">(if different from sponsor)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Same as sponsor"
                    />
                  </div>
                </div>
              </div>

              {/* Device */}
              <div className="bg-white border border-slate-300 rounded-lg p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Package className="w-5 h-5 text-slate-600 mt-0.5" />
                  <h2 className="text-sm font-semibold text-slate-900">Device Under Investigation</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">
                      Device Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.deviceName}
                      onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., CardioFlow Transcatheter Aortic Valve System"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">
                      Model / Version
                    </label>
                    <input
                      type="text"
                      value={formData.deviceModel}
                      onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Model TAVR-2026"
                    />
                  </div>
                </div>
              </div>

              {/* Markets & Study Type */}
              <div className="bg-white border border-slate-300 rounded-lg p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Globe className="w-5 h-5 text-slate-600 mt-0.5" />
                  <h2 className="text-sm font-semibold text-slate-900">Target Markets & Study Type</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">
                      Target Regulatory Markets
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.targetMarkets.includes('EU')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, targetMarkets: [...formData.targetMarkets, 'EU'] });
                            } else {
                              setFormData({ ...formData, targetMarkets: formData.targetMarkets.filter(m => m !== 'EU') });
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-xs text-slate-900">EU (MDR)</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.targetMarkets.includes('US')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, targetMarkets: [...formData.targetMarkets, 'US'] });
                            } else {
                              setFormData({ ...formData, targetMarkets: formData.targetMarkets.filter(m => m !== 'US') });
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-xs text-slate-900">US (FDA)</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">
                      Study Type
                    </label>
                    <select
                      value={formData.studyType}
                      onChange={(e) => setFormData({ ...formData, studyType: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option>Clinical Investigation (Device)</option>
                      <option>Feasibility Study</option>
                      <option>Pivotal Study</option>
                      <option>Post-Market Study</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 p-6 bg-white border border-slate-300 rounded-lg">
              <button className="px-5 py-2.5 text-sm font-medium rounded-md transition-colors text-slate-700 hover:bg-slate-100">
                Save Draft
              </button>
              <button
                onClick={onContinue}
                disabled={!allFieldsFilled}
                className="px-5 py-2.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700"
              >
                Continue to Roles
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}