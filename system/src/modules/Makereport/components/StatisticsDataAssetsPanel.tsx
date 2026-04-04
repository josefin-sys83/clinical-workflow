import { Database, FileText, Table2, BarChart3, FileSpreadsheet, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { DataAsset, UploadedFile, ReportSection } from '../types';
import { useState } from 'react';

interface StatisticsDataAssetsPanelProps {
  dataAssets: DataAsset[];
  uploadedFiles: UploadedFile[];
  sections: ReportSection[];
  onNavigateToSection: (sectionId: string) => void;
}

export function StatisticsDataAssetsPanel({
  dataAssets,
  uploadedFiles,
  sections,
  onNavigateToSection,
}: StatisticsDataAssetsPanelProps) {
  const [expandedUploadedFiles, setExpandedUploadedFiles] = useState(true);
  const [expandedDataAssets, setExpandedDataAssets] = useState(true);
  const [expandedSectionsWithoutAssets, setExpandedSectionsWithoutAssets] = useState(true);

  // Get the icon for asset type
  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'table':
        return <Table2 className="w-3.5 h-3.5" />;
      case 'graph':
        return <BarChart3 className="w-3.5 h-3.5" />;
      case 'statistical-output':
        return <FileSpreadsheet className="w-3.5 h-3.5" />;
      default:
        return <FileSpreadsheet className="w-3.5 h-3.5" />;
    }
  };

  // Get file type icon
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'sap':
        return <FileText className="w-3.5 h-3.5" />;
      case 'dataset':
        return <Database className="w-3.5 h-3.5" />;
      default:
        return <FileText className="w-3.5 h-3.5" />;
    }
  };

  // Get file type label
  const getFileTypeLabel = (type: string): string => {
    switch (type) {
      case 'sap':
        return 'SAP';
      case 'dataset':
        return 'Dataset';
      case 'statistical-report':
        return 'Statistical Report';
      case 'appendix':
        return 'Appendix';
      default:
        return 'Other';
    }
  };

  // Check if an asset is referenced in any section
  const isAssetReferenced = (assetId: string): { referenced: boolean; sections: ReportSection[] } => {
    const referencingSections = sections.filter(section =>
      section.insertedAssets.some(inserted => inserted.assetId === assetId)
    );
    return {
      referenced: referencingSections.length > 0,
      sections: referencingSections,
    };
  };

  // Get sections that lack required statistical support
  const getSectionsWithoutStatisticalSupport = (): ReportSection[] => {
    // Sections that typically require statistical support (results, analysis sections)
    const sectionsRequiringSupport = sections.filter(section => {
      const requiresData = 
        section.title.toLowerCase().includes('result') ||
        section.title.toLowerCase().includes('performance') ||
        section.title.toLowerCase().includes('analysis') ||
        section.title.toLowerCase().includes('efficacy') ||
        section.title.toLowerCase().includes('safety') ||
        section.title.toLowerCase().includes('baseline') ||
        section.title.toLowerCase().includes('disposition');
      
      const hasInsertedAssets = section.insertedAssets.length > 0;
      
      return requiresData && !hasInsertedAssets;
    });

    return sectionsRequiringSupport;
  };

  const sectionsWithoutSupport = getSectionsWithoutStatisticalSupport();

  return (
    <div className="flex flex-col h-full">
      {/* Panel Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[#E5E7EB]">
        <h3 
          className="text-[#111827]"
          style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}
        >
          Statistics & Data Assets
        </h3>
        <p 
          className="text-[#6B7280] mt-0.5"
          style={{ fontSize: '11px', lineHeight: '1.4', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}
        >
          Statistical files, tables, figures, and analysis outputs
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Sections Without Statistical Support */}
        {sectionsWithoutSupport.length > 0 && (
          <div className="border-b border-[#E5E7EB]">
            <button
              onClick={() => setExpandedSectionsWithoutAssets(!expandedSectionsWithoutAssets)}
              className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span 
                  className="text-[#92400E]"
                  style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}
                >
                  Requires Data Support ({sectionsWithoutSupport.length})
                </span>
              </div>
              {expandedSectionsWithoutAssets ? (
                <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-[#6B7280]" />
              )}
            </button>
            
            {expandedSectionsWithoutAssets && (
              <div className="px-4 pb-3">
                {sectionsWithoutSupport.map(section => (
                  <button
                    key={section.id}
                    onClick={() => onNavigateToSection(section.id)}
                    className="w-full text-left p-2 rounded hover:bg-[#FFFBEB] border border-[#FEF3C7] bg-[#FFFBEB] mb-2 transition-colors"
                  >
                    <div 
                      className="text-[#92400E] mb-0.5"
                      style={{ fontSize: '11px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}
                    >
                      {section.title}
                    </div>
                    <div 
                      className="text-[#B45309]"
                      style={{ fontSize: '10px', lineHeight: '1.3', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}
                    >
                      No statistical assets referenced
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Uploaded Files Section */}
        <div className="border-b border-[#E5E7EB]">
          <button
            onClick={() => setExpandedUploadedFiles(!expandedUploadedFiles)}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span 
                className="text-[#111827]"
                style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}
              >
                Uploaded Files ({uploadedFiles.length})
              </span>
            </div>
            {expandedUploadedFiles ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[#6B7280]" />
            )}
          </button>
          
          {expandedUploadedFiles && (
            <div className="px-4 pb-3 space-y-2">
              {uploadedFiles.map(file => (
                <div
                  key={file.id}
                  className="p-2.5 rounded border border-[#E5E7EB] bg-white"
                >
                  <div className="flex items-start gap-2 mb-1.5">
                    <div className="flex-shrink-0 text-[#6B7280] mt-0.5">
                      {getFileIcon(file.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div 
                        className="text-[#111827] break-words"
                        style={{ fontSize: '11px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                      >
                        {file.name}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-5">
                    <span 
                      className="px-1.5 py-0.5 bg-[#F3F4F6] text-[#374151] rounded"
                      style={{ fontSize: '9px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                    >
                      {getFileTypeLabel(file.type)}
                    </span>
                    <span 
                      className="text-[#9CA3AF]"
                      style={{ fontSize: '9px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}
                    >
                      {file.size}
                    </span>
                  </div>
                  
                  <div 
                    className="text-[#6B7280] ml-5 mt-1"
                    style={{ fontSize: '9px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}
                  >
                    Uploaded {new Date(file.uploadDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Data Assets Section */}
        <div>
          <button
            onClick={() => setExpandedDataAssets(!expandedDataAssets)}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-[#6B7280]" />
              <span 
                className="text-[#111827]"
                style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}
              >
                Data Assets ({dataAssets.length})
              </span>
            </div>
            {expandedDataAssets ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[#6B7280]" />
            )}
          </button>
          
          {expandedDataAssets && (
            <div className="px-4 pb-3 space-y-2">
              {dataAssets.map(asset => {
                const { referenced, sections: referencingSections } = isAssetReferenced(asset.id);
                
                return (
                  <div
                    key={asset.id}
                    className={`p-2.5 rounded border transition-colors ${
                      referenced 
                        ? 'border-[#D1FAE5] bg-[#F0FDF4]' 
                        : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-1.5">
                      <div className={`flex-shrink-0 mt-0.5 ${referenced ? 'text-[#10B981]' : 'text-[#6B7280]'}`}>
                        {getAssetIcon(asset.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div 
                          className="text-[#111827] break-words"
                          style={{ fontSize: '11px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                        >
                          {asset.name}
                        </div>
                        {asset.description && (
                          <div 
                            className="text-[#6B7280] mt-0.5 break-words"
                            style={{ fontSize: '10px', lineHeight: '1.3', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}
                          >
                            {asset.description}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-5">
                      {/* Source and Upload Status */}
                      <div className="flex items-center gap-2 mb-1">
                        {asset.source && (
                          <span 
                            className="px-1.5 py-0.5 bg-[#F3F4F6] text-[#374151] rounded"
                            style={{ fontSize: '9px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                          >
                            {asset.source.toUpperCase()}
                          </span>
                        )}
                        {asset.uploadStatus && (
                          <span 
                            className={`px-1.5 py-0.5 rounded ${
                              asset.uploadStatus === 'ready' 
                                ? 'bg-[#D1FAE5] text-[#065F46]'
                                : asset.uploadStatus === 'processing'
                                ? 'bg-[#FEF3C7] text-[#92400E]'
                                : 'bg-[#E0E7FF] text-[#3730A3]'
                            }`}
                            style={{ fontSize: '9px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                          >
                            {asset.uploadStatus === 'ready' ? 'Ready' : asset.uploadStatus === 'processing' ? 'Processing' : 'Uploaded'}
                          </span>
                        )}
                      </div>
                      
                      {/* Asset ID */}
                      <div 
                        className="text-[#9CA3AF] mb-1"
                        style={{ fontSize: '9px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}
                      >
                        ID: {asset.id}
                      </div>
                      
                      {/* Reference Status */}
                      {referenced ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                            <span 
                              className="text-[#065F46]"
                              style={{ fontSize: '10px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                            >
                              Referenced in report
                            </span>
                          </div>
                          {referencingSections.map(section => (
                            <button
                              key={section.id}
                              onClick={() => onNavigateToSection(section.id)}
                              className="w-full text-left px-2 py-1 rounded bg-white border border-[#D1FAE5] hover:bg-[#ECFDF5] transition-colors"
                            >
                              <div 
                                className="text-[#065F46]"
                                style={{ fontSize: '10px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                              >
                                → {section.title}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div 
                            className="w-3 h-3 rounded-full border border-[#D1D5DB]"
                            style={{ backgroundColor: '#F9FAFB' }}
                          />
                          <span 
                            className="text-[#6B7280]"
                            style={{ fontSize: '10px', fontWeight: 400, fontFamily: 'system-ui, sans-serif' }}
                          >
                            Not referenced
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}