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
}

export function RightSidebar({
  currentSection,
  sections,
  onNavigateToSection,
  currentUser,
  onVerifyElement,
  dataAssets,
  uploadedFiles,
}: RightSidebarProps) {
  return (
    <div className="w-[320px] flex flex-col overflow-hidden border-l border-[#E5E7EB] bg-white">
      {/* Quality System Panel - Top */}
      <div className="flex-shrink-0 border-b border-[#E5E7EB] overflow-y-auto max-h-[50vh]">
        <QualitySystemPanel
          currentSection={currentSection}
          sections={sections}
          onNavigateToSection={onNavigateToSection}
          currentUser={currentUser}
          onVerifyElement={onVerifyElement}
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
