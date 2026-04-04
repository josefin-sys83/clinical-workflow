import { X, Table2, BarChart3, FileSpreadsheet, Check } from 'lucide-react';
import { DataAsset, UploadedFile } from '../types';

interface AssetSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataAssets: DataAsset[];
  uploadedFiles: UploadedFile[];
  sectionId: string;
  onInsertAsset: (assetId: string) => void;
}

export function AssetSelectorModal({
  isOpen,
  onClose,
  dataAssets,
  uploadedFiles,
  sectionId,
  onInsertAsset,
}: AssetSelectorModalProps) {
  if (!isOpen) return null;

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'table':
        return <Table2 className="w-4 h-4" />;
      case 'graph':
        return <BarChart3 className="w-4 h-4" />;
      case 'statistical-output':
        return <FileSpreadsheet className="w-4 h-4" />;
      default:
        return <FileSpreadsheet className="w-4 h-4" />;
    }
  };

  const getAssetSource = (asset: DataAsset): string => {
    // Based on uploaded files, determine source
    const sapFile = uploadedFiles.find(f => f.type === 'sap');
    const datasetFile = uploadedFiles.find(f => f.type === 'dataset');
    
    if (asset.type === 'statistical-output') {
      return sapFile ? sapFile.name : 'Statistical Analysis Plan';
    }
    return datasetFile ? datasetFile.name : 'Clinical Dataset';
  };

  const tables = dataAssets.filter(a => a.type === 'table');
  const figures = dataAssets.filter(a => a.type === 'graph');
  const statisticalOutputs = dataAssets.filter(a => a.type === 'statistical-output');

  const handleInsert = (assetId: string) => {
    onInsertAsset(assetId);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded border border-[#E5E7EB] w-[600px] max-h-[600px] flex flex-col shadow-lg">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <h3 className="text-[#111827]" style={{ fontSize: '15px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}>
            Insert Data Asset
          </h3>
          <button
            onClick={onClose}
            className="text-[#6B7280] hover:text-[#374151] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Tables */}
          {tables.length > 0 && (
            <div className="mb-6">
              <div className="text-[#6B7280] mb-3" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'system-ui, sans-serif' }}>
                Tables
              </div>
              <div className="space-y-2">
                {tables.map(asset => {
                  const isSuggested = asset.suggestedSections?.includes(sectionId);
                  return (
                    <button
                      key={asset.id}
                      onClick={() => handleInsert(asset.id)}
                      className={`w-full text-left p-3 rounded border transition-colors ${
                        isSuggested 
                          ? 'border-[#DBEAFE] bg-[#EFF6FF] hover:bg-[#DBEAFE]' 
                          : 'border-[#E5E7EB] bg-white hover:bg-[#F9FAFB]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 ${isSuggested ? 'text-[#2563EB]' : 'text-[#6B7280]'}`}>
                          {getAssetIcon(asset.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="text-[#111827]" style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}>
                              {asset.name}
                            </div>
                            {isSuggested && (
                              <span className="px-1.5 py-0.5 bg-[#2563EB] text-white rounded" style={{ fontSize: '10px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}>
                                Suggested
                              </span>
                            )}
                          </div>
                          {asset.description && (
                            <div className="text-[#6B7280] mb-1" style={{ fontSize: '12px', lineHeight: '1.4', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                              {asset.description}
                            </div>
                          )}
                          <div className="text-[#9CA3AF]" style={{ fontSize: '11px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                            Source: {getAssetSource(asset)}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Figures */}
          {figures.length > 0 && (
            <div className="mb-6">
              <div className="text-[#6B7280] mb-3" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'system-ui, sans-serif' }}>
                Figures
              </div>
              <div className="space-y-2">
                {figures.map(asset => {
                  const isSuggested = asset.suggestedSections?.includes(sectionId);
                  return (
                    <button
                      key={asset.id}
                      onClick={() => handleInsert(asset.id)}
                      className={`w-full text-left p-3 rounded border transition-colors ${
                        isSuggested 
                          ? 'border-[#DBEAFE] bg-[#EFF6FF] hover:bg-[#DBEAFE]' 
                          : 'border-[#E5E7EB] bg-white hover:bg-[#F9FAFB]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 ${isSuggested ? 'text-[#2563EB]' : 'text-[#6B7280]'}`}>
                          {getAssetIcon(asset.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="text-[#111827]" style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}>
                              {asset.name}
                            </div>
                            {isSuggested && (
                              <span className="px-1.5 py-0.5 bg-[#2563EB] text-white rounded" style={{ fontSize: '10px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}>
                                Suggested
                              </span>
                            )}
                          </div>
                          {asset.description && (
                            <div className="text-[#6B7280] mb-1" style={{ fontSize: '12px', lineHeight: '1.4', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                              {asset.description}
                            </div>
                          )}
                          <div className="text-[#9CA3AF]" style={{ fontSize: '11px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                            Source: {getAssetSource(asset)}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Statistical Outputs */}
          {statisticalOutputs.length > 0 && (
            <div className="mb-4">
              <div className="text-[#6B7280] mb-3" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'system-ui, sans-serif' }}>
                Statistical Outputs
              </div>
              <div className="space-y-2">
                {statisticalOutputs.map(asset => {
                  const isSuggested = asset.suggestedSections?.includes(sectionId);
                  return (
                    <button
                      key={asset.id}
                      onClick={() => handleInsert(asset.id)}
                      className={`w-full text-left p-3 rounded border transition-colors ${
                        isSuggested 
                          ? 'border-[#DBEAFE] bg-[#EFF6FF] hover:bg-[#DBEAFE]' 
                          : 'border-[#E5E7EB] bg-white hover:bg-[#F9FAFB]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 ${isSuggested ? 'text-[#2563EB]' : 'text-[#6B7280]'}`}>
                          {getAssetIcon(asset.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="text-[#111827]" style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}>
                              {asset.name}
                            </div>
                            {isSuggested && (
                              <span className="px-1.5 py-0.5 bg-[#2563EB] text-white rounded" style={{ fontSize: '10px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}>
                                Suggested
                              </span>
                            )}
                          </div>
                          {asset.description && (
                            <div className="text-[#6B7280] mb-1" style={{ fontSize: '12px', lineHeight: '1.4', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                              {asset.description}
                            </div>
                          )}
                          <div className="text-[#9CA3AF]" style={{ fontSize: '11px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                            Source: {getAssetSource(asset)}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {dataAssets.length === 0 && (
            <div className="text-center py-8 text-[#9CA3AF]" style={{ fontSize: '13px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
              No data assets available. Upload datasets or statistical outputs to begin.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#E5E7EB] bg-[#F9FAFB]">
          <div className="text-[#6B7280] text-center" style={{ fontSize: '11px', lineHeight: '1.5', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
            Select an asset to insert into this section
          </div>
        </div>
      </div>
    </div>
  );
}
