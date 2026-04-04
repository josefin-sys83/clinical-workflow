import React from 'react';
import { Shield, Edit, Eye, Check } from 'lucide-react';

interface Role {
  role: string;
  name: string;
  responsibility: string;
  hasApprovalRights: boolean;
  color: string;
}

const roles: Role[] = [
  {
    role: 'Project Manager',
    name: 'Dr. Sarah Chen',
    responsibility: 'Final approval & protocol locking',
    hasApprovalRights: true,
    color: 'bg-blue-600'
  },
  {
    role: 'Medical Writer',
    name: 'Emma Rodriguez',
    responsibility: 'Protocol content drafting',
    hasApprovalRights: false,
    color: 'bg-purple-600'
  },
  {
    role: 'Biostatistician',
    name: 'Dr. Michael Zhang',
    responsibility: 'Statistical validation',
    hasApprovalRights: true,
    color: 'bg-green-600'
  },
  {
    role: 'Regulatory Affairs',
    name: 'Anna Schmidt',
    responsibility: 'Compliance approval',
    hasApprovalRights: true,
    color: 'bg-amber-600'
  },
  {
    role: 'Clinical Operations',
    name: 'James Miller',
    responsibility: 'Procedures & feasibility',
    hasApprovalRights: false,
    color: 'bg-teal-600'
  },
  {
    role: 'Safety Officer',
    name: 'Dr. Lisa Patel',
    responsibility: 'Risk & safety oversight',
    hasApprovalRights: true,
    color: 'bg-red-600'
  },
  {
    role: 'QA',
    name: 'Robert Johnson',
    responsibility: 'Data integrity & audit',
    hasApprovalRights: true,
    color: 'bg-indigo-600'
  }
];

export function RolesTable() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Roles & Responsibilities</h3>
        <span className="text-xs text-slate-600">{roles.length} active</span>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {roles.map((role, index) => (
          <div
            key={index}
            className="p-3 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 ${role.color} rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0`}>
                {role.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{role.role}</div>
                    <div className="text-xs text-slate-600">{role.name}</div>
                  </div>
                  {role.hasApprovalRights && (
                    <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" title="Has approval rights" />
                  )}
                </div>
                <div className="text-xs text-slate-700 mt-1.5">
                  {role.responsibility}
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  {role.hasApprovalRights ? (
                    <div className="flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Can approve</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1">
                        <Edit className="w-3 h-3" />
                        <span>Can edit</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>Can review</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-900">
          Multiple users work in parallel. All actions are logged and timestamped for audit compliance.
        </p>
      </div>
    </div>
  );
}
