import { Users } from 'lucide-react';
import { useState } from 'react';

interface ProjectRole {
  role: string;
  name: string;
}

interface ProjectRolesProps {
  roles: ProjectRole[];
}

export function ProjectRoles({ roles }: ProjectRolesProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-neutral-700 hover:text-neutral-900 transition-colors"
      >
        <Users className="h-4 w-4" />
        Team ({roles.length})
      </button>

      {isExpanded && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsExpanded(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-neutral-200 z-50">
            <div className="p-4 border-b border-neutral-200">
              <h3 className="font-medium text-neutral-900">Project Team</h3>
              <p className="text-sm text-neutral-500 mt-1">
                CIP-2024-MED-0847 CARDIA-SUPPORT-2026
              </p>
            </div>

            <div className="p-4 space-y-3">
              {roles.map((role, index) => (
                <div
                  key={`${role.role}-${index}`}
                  className="flex items-start gap-3 pb-3 border-b border-neutral-100 last:border-0 last:pb-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900">
                      {role.name}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {role.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
