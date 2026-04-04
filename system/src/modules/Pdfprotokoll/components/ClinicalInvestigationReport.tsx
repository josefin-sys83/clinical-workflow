import { ArrowLeft } from 'lucide-react';

export function ClinicalInvestigationReport() {
  return (
    <div className="cir-container">
      <div className="cir-content">
        <div className="cir-header">
          <h1>Clinical Investigation Report</h1>
          <p className="cir-subtitle">CARDIA-FLOW-2026</p>
        </div>
        
        <div className="cir-body">
          <p className="cir-description">
            The Clinical Investigation Report (CIR) documents the results, analysis, and conclusions 
            of the CardiaFlow Transcatheter Aortic Valve System clinical investigation.
          </p>
          
          <div className="cir-placeholder">
            <p>Clinical Investigation Report authoring interface will be displayed here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
