export type SectionStatus = 'approved' | 'warning' | 'blocked';

export type FindingSeverity = 'warning' | 'blocker';

export interface TableData {
  id: string;
  caption: string;
  reference: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface FigureData {
  id: string;
  caption: string;
  reference: string;
  type: 'bar-chart' | 'forest-plot' | 'kaplan-meier';
  data?: any; // Chart-specific data
}

export interface ReportSection {
  id: string;
  title: string;
  status: SectionStatus;
  content: string | string[]; // Can be array of paragraphs with table/figure markers
  tables?: TableData[];
  figures?: FigureData[];
  warnings?: InlineMarker[];
  blockers?: InlineMarker[];
}

export interface InlineMarker {
  id: string;
  type: FindingSeverity;
  position: number; // Character position in content
  description: string;
}

export interface RegulatoryFinding {
  id: string;
  sectionId: string;
  severity: FindingSeverity;
  description: string;
  location: string;
  acceptedRisk?: boolean;
  acceptedBy?: string;
  acceptedAt?: Date;
  textHighlight?: string; // Text snippet to highlight in the report
}

export interface ReviewerComment {
  id: string;
  sectionId: string;
  author: string;
  role: string;
  timestamp: Date;
  content: string;
  status: 'open' | 'resolved';
  replies?: ReviewerComment[];
}

export interface AIFinding {
  id: string;
  sectionId: string;
  type: 'missing' | 'inconsistency' | 'conflict';
  description: string;
  dismissed: boolean;
}

export interface AuditEntry {
  id: string;
  domain: 'Project' | 'Role' | 'Scope' | 'Requirement' | 'Content' | 'Review' | 'Approval';
  timestamp: Date;
  action: string;
  userBy: string;
  userEmail: string;
  details?: string;
  newValue?: string;
}