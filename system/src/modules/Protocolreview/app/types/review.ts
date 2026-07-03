export type SectionStatus = 'approved' | 'warning' | 'blocked';
export type SectionReviewStatus = 'pending' | 'approved' | 'rejected';
export type FindingSeverity = 'warning' | 'blocker';
export type FindingSource = 'regulatory' | 'system';
export type ReviewRole = 'regulatory' | 'vp' | 'viewer';

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
  data?: any;
}

export interface ReportSection {
  id: string;
  title: string;
  status: SectionStatus;
  /** Review decision made by Regulatory Affairs */
  reviewStatus?: SectionReviewStatus;
  content: string | string[];
  tables?: TableData[];
  figures?: FigureData[];
  warnings?: InlineMarker[];
  blockers?: InlineMarker[];
}

export interface InlineMarker {
  id: string;
  type: FindingSeverity;
  position: number;
  description: string;
}

/** A review decision (approve/reject) on a single protocol section */
export interface SectionReview {
  sectionId: string;
  status: SectionReviewStatus;
  reviewedBy: string;
  reviewedAt: string; // ISO timestamp
  comment?: string;
}

export interface RegulatoryFinding {
  id: string;
  sectionId: string;
  severity: FindingSeverity;
  description: string;
  location: string;
  /** ISO reference e.g. "ISO 14155:2020 § 6.4" */
  reference?: string;
  /** 'regulatory' = manually added by RA role; 'system' = auto-detected from protocol issues */
  source: FindingSource;
  sectionOwner?: string;
  addedBy?: string;
  addedAt?: string;
  acceptedRisk?: boolean;
  acceptedBy?: string;
  acceptedAt?: Date;
  textHighlight?: string;
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
