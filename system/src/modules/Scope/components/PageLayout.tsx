import { ReactNode } from "react";
import { AuditTrail, AuditEntry } from "./AuditTrail";

interface PageLayoutProps {
  children: ReactNode;
  auditEntries: AuditEntry[];
  auditTitle?: string;
}

/**
 * PageLayout - Wrapper component that provides consistent layout with audit trail
 * Use this component to wrap all page content to ensure audit trail is available
 */
export function PageLayout({ children, auditEntries, auditTitle }: PageLayoutProps) {
  return (
    <div className="relative flex-1 overflow-auto">
      {/* Audit Trail - Fixed position in top right */}
      <div className="absolute top-4 right-6 z-10">
        <AuditTrail entries={auditEntries} title={auditTitle} />
      </div>

      {/* Page Content */}
      {children}
    </div>
  );
}