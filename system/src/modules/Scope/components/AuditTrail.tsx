import { useState } from "react";
import { History, X, Download } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { cn } from "./ui/utils";

export interface AuditEntry {
  id: string;
  domain: "Project" | "Role" | "Scope" | "Requirement" | "Content" | "Review" | "Approval";
  timestamp: string;
  action: string;
  userBy: string;
  userEmail: string;
  details?: string;
  newValue?: string;
}

interface AuditTrailProps {
  entries: AuditEntry[];
  title?: string;
}

export function AuditTrail({ entries, title = "Audit log" }: AuditTrailProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const filteredEntries = filterCategory === "all" 
    ? entries 
    : entries.filter(entry => entry.domain === filterCategory);

  const handleExport = () => {
    const csv = [
      ["Timestamp", "User", "Action", "Domain", "Details", "New Value"],
      ...filteredEntries.map(entry => [
        entry.timestamp,
        entry.userBy,
        entry.action,
        entry.domain,
        entry.details || "",
        entry.newValue || ""
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getDomainColor = (domain: AuditEntry["domain"]) => {
    const colors = {
      'Project': 'bg-blue-50 text-blue-700 border-blue-200',
      'Role': 'bg-green-50 text-green-700 border-green-200',
      'Scope': 'bg-purple-50 text-purple-700 border-purple-200',
      'Requirement': 'bg-orange-50 text-orange-700 border-orange-200',
      'Content': 'bg-teal-50 text-teal-700 border-teal-200',
      'Review': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'Approval': 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
    return colors[domain] || 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}`;
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <History className="size-4" />
        <span>{title}</span>
      </button>
    );
  }

  return (
    <div 
      className="fixed top-0 right-0 h-full flex flex-col"
      style={{ 
        width: "360px", 
        backgroundColor: "#FFFFFF", 
        borderLeft: "1px solid #E5E7EB",
        borderRadius: "0px",
        boxShadow: "none",
        zIndex: 50
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between"
        style={{ padding: "16px" }}
      >
        <div className="flex items-center gap-2">
          <h3 
            style={{ 
              fontSize: "16px", 
              fontWeight: 600, 
              color: "#111827" 
            }}
          >
            {title}
          </h3>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 500,
              color: "#374151",
              backgroundColor: "#F3F4F6",
              borderRadius: "999px",
              padding: "2px 8px"
            }}
          >
            {filteredEntries.length}
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            width: "16px",
            height: "16px",
            color: "#6B7280",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <X style={{ width: "16px", height: "16px" }} />
        </button>
      </div>

      {/* Controls */}
      <div style={{ padding: "0 16px 16px 16px" }}>
        <div style={{ marginBottom: "8px" }}>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger 
              style={{ 
                height: "36px",
                backgroundColor: "#FFFFFF",
                border: "1px solid #D1D5DB",
                borderRadius: "6px",
                fontSize: "14px",
                color: "#111827"
              }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All domains</SelectItem>
              <SelectItem value="Project">Project</SelectItem>
              <SelectItem value="Role">Role</SelectItem>
              <SelectItem value="Scope">Scope</SelectItem>
              <SelectItem value="Requirement">Requirement</SelectItem>
              <SelectItem value="Content">Content</SelectItem>
              <SelectItem value="Review">Review</SelectItem>
              <SelectItem value="Approval">Approval</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <button
          onClick={handleExport}
          style={{
            width: "100%",
            height: "36px",
            backgroundColor: "#FFFFFF",
            border: "1px solid #D1D5DB",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: 500,
            color: "#111827",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px"
          }}
        >
          <Download style={{ width: "14px", height: "14px" }} />
          Export to CSV
        </button>
      </div>

      {/* Entries List */}
      <div 
        className="flex-1 overflow-auto"
        style={{ padding: "0 16px 16px 16px" }}
      >
        {filteredEntries.length === 0 ? (
          <div 
            className="text-center py-8"
            style={{ fontSize: "14px", color: "#6B7280" }}
          >
            No audit entries found
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="p-3 border border-slate-200 rounded bg-white">
                {/* Top Row: Domain Pill + Timestamp */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs ${getDomainColor(entry.domain)} px-2 py-0.5 rounded border`}>
                    {entry.domain}
                  </span>
                  <span className="text-xs text-slate-500">{formatTimestamp(entry.timestamp)}</span>
                </div>

                {/* Primary Action Title */}
                <div className="text-sm text-slate-900 mb-1.5 leading-relaxed">
                  {entry.action}
                </div>

                {/* Attribution Line */}
                <div className="text-xs text-slate-500">
                  by {entry.userBy} ({entry.userEmail})
                </div>

                {/* Details Line (Optional) */}
                {entry.details && (
                  <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {entry.details}
                  </div>
                )}

                {/* New Value Line (Optional) */}
                {entry.newValue && (
                  <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                    New: {entry.newValue}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}