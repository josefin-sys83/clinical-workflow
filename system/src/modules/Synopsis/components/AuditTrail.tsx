import { useState } from 'react';
import { History, X, Download, Filter, ChevronDown } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from './ui/sheet';

export interface AuditEntry {
  id: string;
  timestamp: Date;
  user: string;
  action: string;
  category: 'document' | 'review' | 'approval' | 'edit' | 'status' | 'access' | 'system' | 'role' | 'requirement' | 'scope';
  details: string;
  section?: string;
  impact?: 'low' | 'medium' | 'high';
  newValue?: string;
}

interface AuditTrailProps {
  entries: AuditEntry[];
  pageTitle: string;
}

export function AuditTrail({ entries, pageTitle }: AuditTrailProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const categories = ['all', 'document', 'review', 'approval', 'edit', 'status', 'access', 'system', 'role', 'requirement', 'scope'];

  const filteredEntries = entries.filter(entry => {
    const categoryMatch = filterCategory === 'all' || entry.category === filterCategory;
    return categoryMatch;
  });

  const formatTimestamp = (date: Date) => {
    return date.toISOString().slice(0, 16).replace('T', ' ');
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'role': return 'bg-[#ECFDF5] text-[#047857]';
      case 'requirement': return 'bg-[#FDF2F8] text-[#9D174D]';
      case 'scope': return 'bg-[#EFF6FF] text-[#1D4ED8]';
      case 'system': return 'bg-[#F3F4F6] text-[#374151]';
      case 'document': return 'bg-[#EFF6FF] text-[#1D4ED8]';
      case 'review': return 'bg-[#F3F4F6] text-[#374151]';
      case 'approval': return 'bg-[#ECFDF5] text-[#047857]';
      case 'edit': return 'bg-[#FDF2F8] text-[#9D174D]';
      case 'status': return 'bg-[#F3F4F6] text-[#374151]';
      case 'access': return 'bg-[#FDF2F8] text-[#9D174D]';
      default: return 'bg-[#F3F4F6] text-[#374151]';
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Action', 'Category', 'Details', 'Section', 'Impact'],
      ...filteredEntries.map(entry => [
        entry.timestamp.toISOString(),
        entry.user,
        entry.action,
        entry.category,
        entry.details,
        entry.section || '',
        entry.impact || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-log-${pageTitle.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
      >
        <History className="w-4 h-4" />
        <span className="font-medium">Audit log</span>
      </button>

      {/* Right Side Panel */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side="right" 
          className="w-[360px] max-w-[360px] p-0 flex flex-col bg-white border-l border-[#E5E7EB] rounded-none shadow-none"
        >
          <SheetTitle className="sr-only">Audit log for {pageTitle}</SheetTitle>
          <SheetDescription className="sr-only">
            View and filter audit trail entries for {pageTitle}
          </SheetDescription>
          
          {/* Header */}
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[#111827]">Audit log</h2>
              {entries.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-[#F3F4F6] text-[#374151] rounded-full">
                  {entries.length}
                </span>
              )}
            </div>
          </div>

          {/* Controls Section */}
          <div className="px-4 mb-4 space-y-2">
            {/* Category filter dropdown */}
            <div className="relative">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full h-9 px-3 text-sm text-[#111827] bg-white border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="all">All categories</option>
                {categories.filter(c => c !== 'all').map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Export to CSV button */}
            <button
              onClick={handleExport}
              className="w-full h-9 flex items-center justify-center gap-2 px-3 text-sm font-medium text-[#111827] bg-white border border-[#D1D5DB] rounded-md hover:bg-[#F9FAFB] transition-colors"
            >
              <Download className="w-4 h-4" />
              Export to CSV
            </button>
          </div>

          {/* Entries List */}
          <div className="flex-1 overflow-y-auto px-4">
            {filteredEntries.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-[#D1D5DB] mx-auto mb-3" />
                <p className="text-sm text-[#6B7280]">No audit entries found</p>
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {filteredEntries.map((entry) => (
                  <div key={entry.id} className="bg-white border border-[#E5E7EB] rounded-lg p-3">
                    {/* Category pill and timestamp */}
                    <div className="flex items-start justify-between mb-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(entry.category)}`}>
                        {entry.category}
                      </span>
                      <span className="text-xs text-[#6B7280]">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    </div>

                    {/* Action title */}
                    <h3 className="text-sm font-semibold text-[#111827] mb-1">
                      {entry.action}
                    </h3>

                    {/* Details (secondary description) */}
                    <p className="text-[13px] text-[#374151] mb-1">
                      {entry.details}
                    </p>

                    {/* New value if present */}
                    {entry.newValue && (
                      <p className="text-[13px] text-[#111827]">
                        <span className="font-medium">New:</span> {entry.newValue}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}