export interface ValidationFinding {
  id: string;
  type: 'warning' | 'blocker' | 'info';
  category: 'protocol-consistency' | 'data-consistency' | 'regulatory-requirement' | 'sap-alignment';
  title: string;
  description: string;
  sectionId: string;
  protocolReference?: string;
  sapReference?: string;
  dataReference?: string;
  resolved: boolean;
  resolvedBy?: User;
  resolvedAt?: string;
  resolutionNote?: string;
  // Inline marker properties
  textPosition?: {
    start: number;
    end: number;
    markedText: string;
  };
  relatedSectionId?: string;
  relatedSectionTitle?: string;
  // Additional metadata
  reference?: string;
  raisedBy?: string;
  raisedDate?: string;
  sectionOwner?: string;
  dueDate?: string; // ISO date string
}

export interface SectionApproval {
  id: string;
  sectionId: string;
  approver: User;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
  comment?: string;
}

export interface ProtocolDeviation {
  id: string;
  deviationType: 'major' | 'minor';
  protocolSection: string;
  protocolRequirement: string;
  actualImplementation: string;
  rationale: string;
  impactAssessment: string;
  reportedBy: User;
  reportedAt: string;
  reviewedBy?: User;
  reviewedAt?: string;
  status: 'pending-review' | 'approved' | 'requires-amendment';
}

export interface ReferencedDocument {
  name: string;
  version: string;
  date: string;
  approvalStatus?: string;
}

export interface SectionGuidance {
  requiredElements: {
    reference: string;
    items: string[];
    mustAlignWith?: string;
  };
  commonPitfalls: string[];
  referencedDocuments?: ReferencedDocument[];
}

export interface ProtocolAmendment {
  id: string;
  amendmentNumber: string;
  protocolSection: string;
  changeDescription: string;
  rationale: string;
  impactAssessment: string;
  createdBy: User;
  createdAt: string;
  approvedBy?: User;
  approvedAt?: string;
  status: 'draft' | 'pending-approval' | 'approved';
}

export interface AISuggestion {
  id: string;
  type: 'summary' | 'analysis' | 'caption' | 'placement';
  content: string;
  accepted: boolean;
  sectionId?: string;
}

export interface InsertedAsset {
  id: string;
  assetId: string; // Reference to DataAsset
  insertedAt: string;
  insertedBy: User;
  order: number;
  narrativeText: string;
  aiNarrativeSuggestion?: string;
  narrativeAccepted: boolean;
}

export interface ReportSection {
  id: string;
  title: string;
  helperText: string;
  content: string;
  order: number;
  aiSuggestions?: AISuggestion[];
  validationFindings: ValidationFinding[];
  state: 'draft' | 'under-review' | 'approved' | 'locked';
  roles: SectionRoles;
  comments: SectionComment[];
  aiDraft?: string;
  aiDraftGenerated?: boolean;
  userEdited?: boolean;
  insertedAssets: InsertedAsset[];
  approvals: SectionApproval[];
  linkedSAPSections?: string[];
  linkedProtocolSections?: string[];
  deviations?: ProtocolDeviation[];
  completenessElements?: CompletenessElement[];
  guidance?: SectionGuidance;
  appendices?: Appendix[];
}

export interface SectionRoles {
  contentOwner: User[];
  reviewer: User[];
  requiredApprover: User[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface SectionComment {
  id: string;
  sectionId: string;
  author: User;
  text: string;
  timestamp: string;
  resolved: boolean;
  commentType?: 'general' | 'issue' | 'approval-request';
  regarding?: string;
}

export interface AuditLogEntry {
  id: string;
  sectionId?: string; // Optional section reference
  timestamp: string; // ISO format
  action: string; // Primary action description (e.g., "Section locked for regulatory submission")
  user?: User; // User who performed the action
  role?: string; // Role of the user at time of action
  affected?: string; // What was affected (e.g., "Section 4.1 (entire)")
  description?: string; // Detailed description in italics
  domain?: 'Project' | 'Role' | 'Scope' | 'Requirement' | 'Content' | 'Review' | 'Approval'; // For categorization
}

export interface DataAsset {
  id: string;
  type: 'table' | 'graph' | 'statistical-output';
  name: string;
  description: string;
  thumbnail?: string;
  selected: boolean;
  suggestedSections?: string[];
  source?: 'sap' | 'dataset' | 'statistical-report' | 'other'; // Source file reference
  uploadStatus?: 'uploaded' | 'processing' | 'ready'; // Upload status
}

export interface UploadedFile {
  id: string;
  name: string;
  type: 'sap' | 'dataset' | 'statistical-report' | 'appendix' | 'other';
  uploadDate: string;
  size: string;
}

export interface ProtocolSection {
  id: string;
  title: string;
  content: string;
}

export interface ReportState {
  overallState: 'draft' | 'under-review' | 'approved' | 'locked';
  auditLog: AuditLogEntry[];
}

export interface CompletenessElement {
  id: string;
  title: string;
  isoReference: string; // e.g., "ISO 14155:2020 Section 7.3.1"
  status: 'verified' | 'partially-covered' | 'not-yet-verified';
  verifiedBy?: User;
  verificationDate?: string;
  aiSuggestion?: 'covered' | 'partial' | 'missing';
}

export interface ReportCompletenessStatus {
  elements: CompletenessElement[];
}

export interface Appendix {
  id: string;
  name: string;
  category: 'required' | 'recommended' | 'optional';
  status: 'not-attached' | 'attached';
  description: string;
  fileName?: string;
  uploadDate?: string;
  fileSize?: string;
}