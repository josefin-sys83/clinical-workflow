import { User } from '../types';
import { QualitySystemPanel } from './QualitySystemPanel';
import { StatisticsDataAssetsPanel } from './StatisticsDataAssetsPanel';
import { DataAsset, UploadedFile, ReportSection } from '../types';

interface RightSidebarProps {
  currentSection: string;
  sections: ReportSection[];
  onNavigateToSection: (sectionId: string) => void;
  currentUser: User;
  onVerifyElement: (elementId: string) => void;
  dataAssets: DataAsset[];
  uploadedFiles: UploadedFile[];
  sectionAiIssues: Record<string, any[]>;
  crossConsistencyIssues?: any[];
  savedWontFixIssues?: Record<string, string[]>;
  wontFixCrossConsistencyIds?: string[];
  onSectionAiIssuesChange: (sectionId: string, issues: any[]) => void;
  onWontFixSave?: (sectionId: string, descriptions: string[]) => void;
  onCrossConsistencyWontFixSave?: (ids: string[]) => void;
}

export function RightSidebar({
  currentSection,
  sections,
  onNavigateToSection,
  currentUser,
  onVerifyElement,
  dataAssets,
  uploadedFiles,
  sectionAiIssues,
  crossConsistencyIssues,
  savedWontFixIssues,
  wontFixCrossConsistencyIds,
  onSectionAiIssuesChange,
  onWontFixSave,
  onCrossConsistencyWontFixSave,
}: RightSidebarProps) {
  return (
    <div className="w-80 flex flex-col overflow-hidden border-l border-slate-200 bg-white">
      {/* Quality System Panel - Top */}
      <div className="flex-shrink-0 border-b border-slate-200 overflow-y-auto max-h-[50vh]">
        <QualitySystemPanel
          currentSection={currentSection}
          sections={sections}
          onNavigateToSection={onNavigateToSection}
          currentUser={currentUser}
          onVerifyElement={onVerifyElement}
          sectionAiIssues={sectionAiIssues}
          crossConsistencyIssues={crossConsistencyIssues}
          savedWontFixIssues={savedWontFixIssues}
          wontFixCrossConsistencyIds={wontFixCrossConsistencyIds}
          onSectionAiIssuesChange={onSectionAiIssuesChange}
          onWontFixSave={onWontFixSave}
          onCrossConsistencyWontFixSave={onCrossConsistencyWontFixSave}
        />
      </div>

      {/* Statistics & Data Assets Panel - Bottom */}
      <div className="flex-1 overflow-y-auto">
        <StatisticsDataAssetsPanel
          dataAssets={dataAssets}
          uploadedFiles={uploadedFiles}
          sections={sections}
          onNavigateToSection={onNavigateToSection}
        />
      </div>
    </div>
  );
}
