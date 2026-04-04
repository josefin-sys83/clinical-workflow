import { Ban, XCircle, AlertTriangle, ChevronRight, Download } from 'lucide-react';
import { ReportSection, ValidationFinding, User } from '../types';
import { useState } from 'react';

interface QualitySystemPanelProps {
  currentSection: string;
  sections: ReportSection[];
  onNavigateToSection: (sectionId: string) => void;
  currentUser: User;
  onVerifyElement: (elementId: string) => void;
}

export function QualitySystemPanel({
  currentSection,
  sections,
  onNavigateToSection,
  currentUser,
  onVerifyElement,
}: QualitySystemPanelProps) {
  const [activeTab, setActiveTab] = useState<'my-issues' | 'all-issues'>('my-issues');

  // Collect all validation findings across all sections
  const allFindings: (ValidationFinding & { sectionTitle: string; sectionId: string; sectionNumber: string })[] = [];
  sections.forEach((sec, index) => {
    if (sec.validationFindings) {
      sec.validationFindings.forEach(finding => {
        allFindings.push({
          ...finding,
          sectionTitle: sec.title,
          sectionId: sec.id,
          sectionNumber: (index + 1).toString(),
        });
      });
    }
  });

  // Filter based on active tab
  const myIssues = allFindings.filter(f => !f.resolved); // In real app, filter by current user's responsibility
  const displayedIssues = activeTab === 'my-issues' ? myIssues : allFindings.filter(f => !f.resolved);

  const getSeverityConfig = (type: string) => {
    switch (type) {
      case 'blocker':
        return {
          label: 'Blocker',
          bgColor: '#FEF2F2',
          borderColor: '#DC2626',
          labelColor: '#DC2626',
          titleColor: '#1E1B4B',
          descColor: '#4B5563',
          navigateColor: '#DC2626',
        };
      case 'warning':
        return {
          label: 'Warning',
          bgColor: '#FFFBEB',
          borderColor: '#F59E0B',
          labelColor: '#F59E0B',
          titleColor: '#1E1B4B',
          descColor: '#4B5563',
          navigateColor: '#F59E0B',
        };
      default:
        return {
          label: 'Warning',
          bgColor: '#FFFBEB',
          borderColor: '#F59E0B',
          labelColor: '#F59E0B',
          titleColor: '#1E1B4B',
          descColor: '#4B5563',
          navigateColor: '#F59E0B',
        };
    }
  };

  const calculateDaysRemaining = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return '1 day';
    return `${diffDays} days`;
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-3">
        <h2 className="text-[#111827] mb-1" style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
          Issues & Consistency
        </h2>
        <p className="text-[#6B7280]" style={{ fontSize: '11px', fontWeight: 400, fontFamily: 'system-ui, sans-serif' }}>
          System-detected inconsistencies and review flags
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('my-issues')}
          className={`flex-1 px-3 py-2 rounded transition-colors ${
            activeTab === 'my-issues'
              ? 'bg-white border border-[#E5E7EB] text-[#111827]'
              : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#F3F4F6]'
          }`}
          style={{ fontSize: '12px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
        >
          My issues ({myIssues.length})
        </button>
        <button
          onClick={() => setActiveTab('all-issues')}
          className={`flex-1 px-3 py-2 rounded transition-colors ${
            activeTab === 'all-issues'
              ? 'bg-white border border-[#E5E7EB] text-[#111827]'
              : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#F3F4F6]'
          }`}
          style={{ fontSize: '12px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
        >
          All issues ({allFindings.filter(f => !f.resolved).length})
        </button>
      </div>

      {/* Issues List */}
      <div className="space-y-3">
        {displayedIssues.length > 0 ? (
          displayedIssues.map((finding) => {
            const config = getSeverityConfig(finding.type);
            
            return (
              <button
                key={finding.id}
                onClick={() => onNavigateToSection(finding.sectionId)}
                className="w-full text-left p-4 rounded transition-colors cursor-pointer"
                style={{
                  backgroundColor: config.bgColor,
                  borderLeft: `4px solid ${config.borderColor}`,
                  border: `1px solid ${config.borderColor}`,
                  borderLeftWidth: '4px',
                }}
              >
                {/* Severity Label */}
                <div className="mb-2" style={{ color: config.labelColor, fontSize: '12px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
                  {config.label}
                </div>

                {/* Title */}
                <div className="mb-2" style={{ color: config.titleColor, fontSize: '14px', fontWeight: 500, fontFamily: 'system-ui, sans-serif', lineHeight: '1.4' }}>
                  {finding.title}
                </div>

                {/* Description */}
                <div className="mb-3" style={{ color: config.descColor, fontSize: '13px', fontWeight: 400, fontFamily: 'system-ui, sans-serif', lineHeight: '1.5' }}>
                  {finding.description}
                </div>

                {/* Metadata Section */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex justify-between items-center">
                    <span style={{ color: '#6B7280', fontSize: '12px', fontFamily: 'system-ui, sans-serif' }}>Affected section</span>
                    <span style={{ color: '#111827', fontSize: '12px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}>{finding.sectionNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span style={{ color: '#6B7280', fontSize: '12px', fontFamily: 'system-ui, sans-serif' }}>Section owner</span>
                    <span style={{ color: '#111827', fontSize: '12px', fontFamily: 'system-ui, sans-serif' }}>{finding.sectionOwner || 'Dr. Marcus Rivera'}</span>
                  </div>
                  {finding.dueDate && (
                    <div className="flex justify-between items-center">
                      <span style={{ color: '#6B7280', fontSize: '12px', fontFamily: 'system-ui, sans-serif' }}>Due in</span>
                      <span style={{ color: '#111827', fontSize: '12px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}>
                        {calculateDaysRemaining(finding.dueDate)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Navigate Link */}
                <div className="flex items-center gap-1" style={{ color: config.navigateColor, fontSize: '13px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}>
                  Navigate to Section {finding.sectionNumber}
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })
        ) : (
          <div className="text-center py-6 text-[#9CA3AF]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif' }}>
            No issues detected
          </div>
        )}
      </div>

      {/* Export Readiness */}
      <div className="mt-6">
        <button 
          className="w-full flex items-center justify-between p-3 bg-white border border-[#E5E7EB] rounded hover:bg-[#F9FAFB] transition-colors"
          onClick={() => {/* Navigate to export readiness details */}}
        >
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-gray-700" />
            <div>
              <div className="text-[#111827]" style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}>
                Export Readiness
              </div>
              <div className="text-[#6B7280]" style={{ fontSize: '11px', fontWeight: 400, fontFamily: 'system-ui, sans-serif' }}>
                3/6 checks passed
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        </button>
      </div>
    </div>
  );
}