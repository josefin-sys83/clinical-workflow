export type UserRole =
  | 'Project Manager'
  | 'Protocol Lead'
  | 'Regulatory Affairs'
  | 'Quality Assurance'
  | 'Statistician'
  | 'Clinical Lead';

// NOTE: These values vary across the prototype modules.
// We keep a permissive union so the UI can be data-driven while the domain is still stabilizing.
export type ProjectPhase =
  | 'Setup'
  | 'Protocol'
  | 'Review'
  | 'Report'
  | 'Finalized'
  | 'Protocol authoring'
  | 'Protocol review'
  | 'Report approval'
  | string;

export type ProjectStatus = 'On track' | 'Delay' | 'Complete' | string;

export type ActionType =
  | 'Review'
  | 'Approve'
  | 'Edit'
  | 'Sign'
  | 'Upload'
  | 'Comment'
  | 'Input needed'
  | 'Input Needed'
  | 'Blocker'
  | string;

export interface BlockerItem {
  id: string;
  description: string;
}

export interface WarningItem {
  id: string;
  description: string;
}

export interface Project {
  id: string;
  name: string;
  deviceName: string;
  myRole: UserRole[];
  phase: ProjectPhase;
  status: ProjectStatus;
  blockers: number;
  warnings: number;
  blockerItems?: BlockerItem[];
  warningItems?: WarningItem[];
  primaryAction: string;
  riskDescription?: string;
}

export interface OpenItem {
  id: string;
  projectId: string;
  projectName: string;
  document: string;
  section?: string;
  description?: string;
  myRole: UserRole;
  action: ActionType;
  dueDate?: string;
  priority: 'High' | 'Medium' | 'Low';
  link: string;
}
