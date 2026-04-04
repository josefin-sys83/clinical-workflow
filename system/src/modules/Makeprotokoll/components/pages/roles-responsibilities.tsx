import React, { useState } from 'react';
import { UserPlus, Mail, Check, X } from 'lucide-react';
import { GlobalHeader } from '../global-header';
import { WorkflowSidebar } from '../workflow-sidebar';

interface RolesResponsibilitiesProps {
  onContinue: () => void;
  onBack: () => void;
}

interface TeamMember {
  id: string;
  role: string;
  name: string;
  email: string;
  mandatory: boolean;
  assignedSections: string[];
  inviteStatus: 'Pending' | 'Sent' | 'Accepted';
}

export function RolesResponsibilities({ onContinue, onBack }: RolesResponsibilitiesProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      id: '1',
      role: 'Project Manager',
      name: 'Anna Schneider',
      email: 'anna.schneider@cardioflow.com',
      mandatory: true,
      assignedSections: ['All sections'],
      inviteStatus: 'Accepted'
    },
    {
      id: '2',
      role: 'Medical Writer',
      name: 'Dr. Emma Weber',
      email: 'emma.weber@cardioflow.com',
      mandatory: true,
      assignedSections: ['4.1-4.7'],
      inviteStatus: 'Accepted'
    },
    {
      id: '3',
      role: 'Regulatory Affairs',
      name: 'Lisa Schmidt',
      email: 'lisa.schmidt@cardioflow.com',
      mandatory: true,
      assignedSections: ['4.3, 4.8'],
      inviteStatus: 'Accepted'
    },
    {
      id: '4',
      role: 'Clinical Operations',
      name: 'Dr. Michael Berg',
      email: 'michael.berg@cardioflow.com',
      mandatory: false,
      assignedSections: ['4.6, 4.7'],
      inviteStatus: 'Sent'
    },
    {
      id: '5',
      role: 'Biostatistician',
      name: 'Sarah Hoffman',
      email: 'sarah.hoffman@cardioflow.com',
      mandatory: false,
      assignedSections: ['4.5'],
      inviteStatus: 'Pending'
    },
    {
      id: '6',
      role: 'Data Protection',
      name: 'Thomas Müller',
      email: 'thomas.mueller@cardioflow.com',
      mandatory: false,
      assignedSections: ['4.8'],
      inviteStatus: 'Accepted'
    }
  ]);

  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  const roleDescriptions: { [key: string]: string } = {
    'Project Manager': 'Overall accountability for protocol completion, approval workflows, and regulatory compliance. Can complete any section and approve final protocol lock.',
    'Medical Writer': 'Primary author of protocol content. Responsible for drafting, editing, and maintaining clinical and scientific sections per ISO 14155 requirements.',
    'Regulatory Affairs': 'Ensures protocol compliance with EU MDR, ISO 14155, and applicable regulations. Required approval for device description and data handling sections.',
    'Clinical Operations': 'Provides input on study feasibility, site requirements, and operational procedures. Reviews study design and population criteria.',
    'Biostatistician': 'Optional role for CIP. Reviews endpoints, sample size justification, and statistical analysis approach.',
    'Data Protection': 'Ensures GDPR compliance and data privacy requirements are met throughout protocol and study execution.'
  };

  const hasProjectManager = teamMembers.some(m => m.role === 'Project Manager' && m.inviteStatus === 'Accepted');

  const getInviteStatusBadge = (status: string) => {
    switch (status) {
      case 'Accepted':
        return <span className="flex items-center gap-1 text-green-700"><Check className="w-3 h-3" /> Accepted</span>;
      case 'Sent':
        return <span className="flex items-center gap-1 text-blue-700"><Mail className="w-3 h-3" /> Sent</span>;
      case 'Pending':
        return <span className="text-slate-500">Pending</span>;
      default:
        return null;
    }
  };

  return (
    <>
      <GlobalHeader
        projectName="CardioFlow TAVR Clinical Investigation"
        protocolId="CF-TAVR-2026-EU-001"
        version="v0.1"
        protocolState="Draft"
        currentUserRole="Project Manager"
      />

      <div className="flex-1 flex overflow-hidden">
        <WorkflowSidebar 
          currentStep="roles-responsibilities"
          onNavigate={() => {}}
        />

        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="max-w-5xl mx-auto p-8">
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-slate-900 mb-1">
                Roles & Responsibilities
              </h1>
              <p className="text-sm text-slate-600">
                Assign team members and define responsibility structure
              </p>
            </div>

            {!hasProjectManager && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-lg">
                <div className="text-sm font-medium text-amber-900">
                  Project Manager must be assigned before continuing
                </div>
              </div>
            )}

            {/* Team Table */}
            <div className="bg-white border border-slate-300 rounded-lg overflow-hidden mb-6">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-300">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Role</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Mandatory</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Assigned Sections</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Invite Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {teamMembers.map((member) => (
                    <React.Fragment key={member.id}>
                      <tr className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpandedRole(expandedRole === member.role ? null : member.role)}
                            className="text-slate-900 font-medium hover:text-blue-600 text-left"
                          >
                            {member.role}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{member.name}</td>
                        <td className="px-4 py-3 text-slate-600">{member.email}</td>
                        <td className="px-4 py-3">
                          {member.mandatory ? (
                            <span className="text-red-600 font-medium">Yes</span>
                          ) : (
                            <span className="text-slate-500">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{member.assignedSections.join(', ')}</td>
                        <td className="px-4 py-3 text-xs">
                          {getInviteStatusBadge(member.inviteStatus)}
                        </td>
                      </tr>
                      {expandedRole === member.role && (
                        <tr>
                          <td colSpan={6} className="px-4 py-3 bg-blue-50 border-t border-slate-200">
                            <div className="text-xs text-slate-700">
                              <span className="font-medium">Responsibility:</span> {roleDescriptions[member.role]}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="mb-6 flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors">
                <UserPlus className="w-4 h-4" />
                Add Person
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded-md hover:bg-blue-100 transition-colors">
                <Mail className="w-4 h-4" />
                Send Invites
              </button>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 p-6 bg-white border border-slate-300 rounded-lg">
              <button
                onClick={onBack}
                className="px-5 py-2.5 text-sm font-medium rounded-md transition-colors text-slate-700 hover:bg-slate-100"
              >
                Back
              </button>
              <button
                onClick={onContinue}
                disabled={!hasProjectManager}
                className="px-5 py-2.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700"
              >
                Continue to Synopsis
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
