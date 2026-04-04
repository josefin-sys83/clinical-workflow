import { protocolData } from './protocol-data';
import { SignatureModal } from './SignatureModal';
import { useState } from 'react';
import { FileText, Info, X, ArrowRight, ChevronRight, Lock } from 'lucide-react';
import { ClinicalInvestigationReport } from './ClinicalInvestigationReport';

export function ProtocolDocument() {
  const [signatures, setSignatures] = useState<{
    investigator?: { name: string; date: string; signature: string };
    sponsor?: { name: string; date: string; signature: string };
  }>({});
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signingAs, setSigningAs] = useState<'investigator' | 'sponsor' | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showCIR, setShowCIR] = useState(false);

  const handleSign = (role: 'investigator' | 'sponsor') => {
    setSigningAs(role);
    setShowSignatureModal(true);
  };

  const handleSignatureComplete = (signatureData: { name: string; date: string; signature: string }) => {
    if (signingAs) {
      setSignatures(prev => ({
        ...prev,
        [signingAs]: signatureData
      }));
    }
    setShowSignatureModal(false);
    setSigningAs(null);
  };

  const handleProceedToCIR = () => {
    if (signatures.investigator && signatures.sponsor) {
      setShowCIR(true);
    }
  };

  const handleAddLockedPDF = () => {
    // This would handle adding a locked PDF
    // For now, we'll just show an alert
    alert('Adding Locked PDF...');
  };

  const isProtocolApproved = signatures.investigator && signatures.sponsor;
  const approvalDate = isProtocolApproved 
    ? signatures.sponsor.date 
    : null;

  const handleReturnToReview = () => {
    // This would navigate back to the review mode
    // For now, we'll just show an alert
    alert('Returning to Protocol Review Mode...');
  };

  if (showCIR) {
    return <ClinicalInvestigationReport />;
  }

  return (
    <div className="app-container">
      {/* Workflow Menu */}
      <nav className="workflow-menu">
        <div className="workflow-menu-content">
          <span className="workflow-step completed">Project setup</span>
          <ChevronRight size={14} className="workflow-chevron" />
          <span className="workflow-step completed">Protocol authoring</span>
          <ChevronRight size={14} className="workflow-chevron" />
          <span className="workflow-step completed">Protocol review</span>
          <ChevronRight size={14} className="workflow-chevron" />
          <span className="workflow-step active">Protocol approval</span>
          <ChevronRight size={14} className="workflow-chevron" />
          <span className="workflow-step">Report authoring</span>
          <ChevronRight size={14} className="workflow-chevron" />
          <span className="workflow-step">Report review</span>
          <ChevronRight size={14} className="workflow-chevron" />
          <span className="workflow-step">Report approval</span>
        </div>
      </nav>

      {/* Sidebar - Help Panel */}
      {showSidebar && (
        <aside className="help-sidebar">
          <div className="sidebar-header">
            <Info size={20} />
            <h3>Final Protocol Document for Regulatory Submission</h3>
          </div>
          
          <div className="sidebar-content">
            <p className="sidebar-intro">
              This is the final, print-ready version of your Clinical Investigation Protocol. After review and e-signature by the Coordinating Investigator and Sponsor Representative, export this document as PDF for submission to:
            </p>
            
            <div className="sidebar-list">
              <div className="sidebar-item">
                <strong>Ethics Committees / IRBs</strong>
                <span>for approval before study initiation</span>
              </div>
              
              <div className="sidebar-item">
                <strong>Competent Authorities</strong>
                <span>(e.g., national regulatory agencies) as part of your EU MDR submission</span>
              </div>
              
              <div className="sidebar-item">
                <strong>Clinical Trial Registries</strong>
                <span>(e.g., EU Clinical Trials Register, ClinicalTrials.gov)</span>
              </div>
              
              <div className="sidebar-item">
                <strong>Investigational Sites</strong>
                <span>for inclusion in the Investigator Site File</span>
              </div>
            </div>
            
            <p className="sidebar-note">
              Ensure all sections are complete and both required signatures are applied before final export.
            </p>
          </div>
        </aside>
      )}

      {/* Main Document Area */}
      <div className="document-area">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          {/* Document Header - Always Visible - Outside document pages */}
          <div style={{ width: '210mm', marginBottom: '32px' }}>
            <div className="document-header">
              <h1 className="document-header-title">Approved Clinical Investigation Protocol</h1>
              <p className="document-header-subtitle">Final, read-only protocol document prepared for regulatory submission</p>
            </div>
          </div>

          <div className="protocol-document">
            {/* Page 1: Title Page */}
            <div className="protocol-page">
              {/* Status Header - Document Approval Status */}
              {isProtocolApproved && (
                <div className="protocol-status-header">
                  <div className="status-primary">Approved Clinical Investigation Protocol</div>
                  <div className="status-secondary">Read-only snapshot generated after final sign-off</div>
                  {approvalDate && (
                    <div className="approval-metadata">
                      <span>Protocol {protocolData.protocolNumber}</span>
                      <span>Version {protocolData.version}</span>
                      <span>Approved: {approvalDate}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Title Page */}
              <section className="title-page">
                <h1 className="document-title">{protocolData.title}</h1>
                <div className="title-metadata">
                  <p><strong>Short Title:</strong> {protocolData.synopsis.studyTitle}</p>
                  <p><strong>Protocol Number:</strong> {protocolData.protocolNumber}</p>
                  <p><strong>Version:</strong> {protocolData.version}</p>
                  <p><strong>Date:</strong> {protocolData.date}</p>
                  <p><strong>EudraCT Number:</strong> 2026-000547-19 (pending)</p>
                  <p><strong>Sponsor:</strong> {protocolData.sponsor}</p>
                  <p><strong>Coordinating Investigator:</strong> {protocolData.principalInvestigator}</p>
                </div>
              </section>
              <div className="page-number">Page 1</div>
            </div>

            {/* Page 2: Protocol Synopsis */}
            <div className="protocol-page">
              <section className="protocol-section">
                <h2>Protocol Synopsis</h2>
                <div className="synopsis-table">
                  <div className="synopsis-row">
                    <div className="synopsis-label">Short Title</div>
                    <div className="synopsis-value">{protocolData.synopsis.studyTitle}</div>
                  </div>
                  <div className="synopsis-row">
                    <div className="synopsis-label">Study Phase</div>
                    <div className="synopsis-value">{protocolData.synopsis.phase}</div>
                  </div>
                  <div className="synopsis-row">
                    <div className="synopsis-label">Study Design</div>
                    <div className="synopsis-value">{protocolData.synopsis.design}</div>
                  </div>
                  <div className="synopsis-row">
                    <div className="synopsis-label">Study Population</div>
                    <div className="synopsis-value">{protocolData.synopsis.population}</div>
                  </div>
                  <div className="synopsis-row">
                    <div className="synopsis-label">Sample Size</div>
                    <div className="synopsis-value">{protocolData.synopsis.sampleSize}</div>
                  </div>
                  <div className="synopsis-row">
                    <div className="synopsis-label">Study Duration</div>
                    <div className="synopsis-value">{protocolData.synopsis.duration}</div>
                  </div>
                  <div className="synopsis-row">
                    <div className="synopsis-label">Primary Objective</div>
                    <div className="synopsis-value">{protocolData.synopsis.primaryObjective}</div>
                  </div>
                  <div className="synopsis-row">
                    <div className="synopsis-label">Primary Endpoint</div>
                    <div className="synopsis-value">{protocolData.synopsis.primaryEndpoint}</div>
                  </div>
                </div>
              </section>
              <div className="page-number">Page 2</div>
            </div>

            {/* Page 3: Table of Contents */}
            <div className="protocol-page">
              <section className="protocol-section">
                <h2>Table of Contents</h2>
                <div className="toc">
                  {protocolData.tableOfContents.map((item, index) => (
                    <div key={index} className="toc-item" style={{ paddingLeft: `${item.level * 20}px` }}>
                      <span className="toc-number">{item.number}</span>
                      <span className="toc-title">{item.title}</span>
                      <span className="toc-page">{item.page}</span>
                    </div>
                  ))}
                </div>
              </section>
              <div className="page-number">Page 3</div>
            </div>

            {/* Protocol Sections - Each section on its own page */}
            {protocolData.sections.map((section, index) => (
              <div key={index} className="protocol-page">
                <section className="protocol-section">
                  <h2>{section.number} {section.title}</h2>
                  
                  {section.content.map((paragraph, pIndex) => (
                    <p key={pIndex} className="protocol-text">{paragraph}</p>
                  ))}

                  {section.subsections && section.subsections.map((subsection, subIndex) => (
                    <div key={subIndex} className="subsection">
                      <h3>{subsection.number} {subsection.title}</h3>
                      {subsection.content.map((paragraph, pIndex) => (
                        <p key={pIndex} className="protocol-text">{paragraph}</p>
                      ))}
                      
                      {subsection.list && (
                        <ul className="protocol-list">
                          {subsection.list.map((item, itemIndex) => (
                            <li key={itemIndex}>{item}</li>
                          ))}
                        </ul>
                      )}

                      {subsection.content2 && subsection.content2.map((paragraph, pIndex) => (
                        <p key={`c2-${pIndex}`} className="protocol-text">{paragraph}</p>
                      ))}

                      {subsection.list2 && (
                        <ul className="protocol-list">
                          {subsection.list2.map((item, itemIndex) => (
                            <li key={`l2-${itemIndex}`}>{item}</li>
                          ))}
                        </ul>
                      )}

                      {subsection.content3 && subsection.content3.map((paragraph, pIndex) => (
                        <p key={`c3-${pIndex}`} className="protocol-text">{paragraph}</p>
                      ))}

                      {subsection.table && (
                        <div className="protocol-table">
                          <table>
                            <thead>
                              <tr>
                                {subsection.table.headers.map((header, hIndex) => (
                                  <th key={hIndex}>{header}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {subsection.table.rows.map((row, rIndex) => (
                                <tr key={rIndex}>
                                  {row.map((cell, cIndex) => (
                                    <td key={cIndex}>{cell}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </section>
                <div className="page-number">Page {index + 4}</div>
              </div>
            ))}

            {/* Signature Page */}
            <div className="protocol-page">
              <section className="protocol-section">
                <h2>Signatures</h2>
                <div className="signature-block">
                  <p className="protocol-text">
                    I have read this protocol and agree to conduct the clinical investigation as outlined herein and in accordance
                    with ISO 14155:2020, EU MDR, applicable regulatory requirements, and Good Clinical Practice principles.
                  </p>
                  
                  <div className="signature-lines">
                    <div className="signature-line">
                      {signatures.investigator ? (
                        <>
                          <div className="signature-image-container">
                            <img src={signatures.investigator.signature} alt="Signature" className="signature-image" />
                          </div>
                          <p>{signatures.investigator.name}</p>
                        </>
                      ) : (
                        <>
                          <div className="line">
                            <button onClick={() => handleSign('investigator')} className="sign-button">
                              Click to Sign
                            </button>
                          </div>
                        </>
                      )}
                      <p>Coordinating Investigator Signature</p>
                      <p className="signature-name">Prof. Dr. Andreas Müller, MD, PhD</p>
                    </div>
                    <div className="signature-line">
                      <div className="line">
                        {signatures.investigator && (
                          <p className="signature-date">{signatures.investigator.date}</p>
                        )}
                      </div>
                      <p>Date</p>
                    </div>
                  </div>

                  <div className="signature-lines">
                    <div className="signature-line">
                      {signatures.sponsor ? (
                        <>
                          <div className="signature-image-container">
                            <img src={signatures.sponsor.signature} alt="Signature" className="signature-image" />
                          </div>
                          <p>{signatures.sponsor.name}</p>
                        </>
                      ) : (
                        <>
                          <div className="line">
                            <button onClick={() => handleSign('sponsor')} className="sign-button">
                              Click to Sign
                            </button>
                          </div>
                        </>
                      )}
                      <p>Sponsor Representative Signature</p>
                      <p className="signature-name">Dr. Helena Schmidt, VP Clinical Affairs</p>
                    </div>
                    <div className="signature-line">
                      <div className="line">
                        {signatures.sponsor && (
                          <p className="signature-date">{signatures.sponsor.date}</p>
                        )}
                      </div>
                      <p>Date</p>
                    </div>
                  </div>
                </div>
              </section>
              <div className="page-number">Page {protocolData.sections.length + 4}</div>
            </div>

            {/* Footer and Bottom Action outside pages */}
            <div className="document-footer-line">
              This document was system-generated and locked on {approvalDate || new Date().toLocaleDateString('en-GB', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
              })}.
            </div>

            {/* Bottom Action */}
            <div className="bottom-action">
              <div className="bottom-action-full">
                {/* Protocol Finalization Section */}
                <div className="finalization-section">
                  <h3 className="finalization-title">Protocol Finalization</h3>
                  
                  {/* Return to Review Info Box */}
                  <div className="review-info-box">
                    <p className="review-info-text">
                      Discovered an error? You can still make changes before finalizing.
                    </p>
                    <button onClick={handleReturnToReview} className="request-changes-button">
                      <Info size={16} />
                      Request Changes
                    </button>
                  </div>

                  {/* Signature Status */}
                  <div className="signature-status-section">
                    <h4 className="signature-status-title">Signature Status</h4>
                    
                    <div className="signature-status-cards">
                      <div className="signature-status-card">
                        <div className="signature-status-info">
                          <div className="signature-status-label">Coordinating Principal Investigator</div>
                          <div className="signature-status-name">Prof. Dr. med. Hans Müller</div>
                        </div>
                        <div className={`signature-status-badge ${signatures.investigator ? 'signature-complete' : 'signature-pending'}`}>
                          {signatures.investigator ? 'Signed' : 'Pending required signatures'}
                        </div>
                      </div>

                      <div className="signature-status-card">
                        <div className="signature-status-info">
                          <div className="signature-status-label">Sponsor Representative</div>
                          <div className="signature-status-name">Dr. Anna Schmidt</div>
                        </div>
                        <div className={`signature-status-badge ${signatures.sponsor ? 'signature-complete' : 'signature-pending'}`}>
                          {signatures.sponsor ? 'Signed' : 'Pending required signatures'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Proceed Button */}
                <div className="proceed-section">
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button 
                      onClick={handleAddLockedPDF}
                      className="add-pdf-button"
                    >
                      <Lock size={16} />
                      Export Locked PDF
                    </button>
                    <button 
                      onClick={handleProceedToCIR} 
                      className={`proceed-button-large ${!isProtocolApproved ? 'proceed-button-disabled' : ''}`}
                      disabled={!isProtocolApproved}
                    >
                      Proceed to Clinical Investigation Report
                      <ArrowRight size={18} />
                    </button>
                  </div>
                  {!isProtocolApproved && (
                    <p className="action-helper-text">
                      Report generation is available only after protocol approval and signature completion.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Modal */}
      {showSignatureModal && signingAs && (
        <SignatureModal
          role={signingAs}
          onComplete={handleSignatureComplete}
          onCancel={() => {
            setShowSignatureModal(false);
            setSigningAs(null);
          }}
        />
      )}
    </div>
  );
}