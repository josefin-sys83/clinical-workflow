import { FileText } from 'lucide-react';
import { useState } from 'react';
import { SignatureModal } from './SignatureModal';
import { Info, X, FileDown, Lock } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface CIRSection {
  number: string;
  title: string;
  content: string[];
  subsections?: CIRSection[];
}

const cirData: CIRSection[] = [
  {
    number: "1",
    title: "Administrative Information",
    content: [
      "This Clinical Investigation Report summarizes the results of the clinical investigation conducted in accordance with the approved Clinical Investigation Protocol (CIP-2024-MED-0847).",
      "The clinical investigation was sponsored by CardiaFlow Medical Technologies GmbH and conducted at investigational sites within the European Union. The study was performed in compliance with ISO 14155:2020, Regulation (EU) 2017/745 (EU MDR), and applicable national regulations.",
      "Study start date: [Date]",
      "Study end date: [Date]",
      "Study status: Completed as planned."
    ]
  },
  {
    number: "2",
    title: "Study Overview",
    content: [
      "The objective of this clinical investigation was to evaluate the safety and performance of the Implantable Cardiac Support Device in adult patients with chronic or advanced heart failure where conventional medical therapy was insufficient.",
      "The study was designed as a prospective, multi-center clinical investigation conducted under Article 62 of the EU MDR. The investigation was performed according to the approved protocol and associated study documents.",
      "This report presents the final analysis of safety and performance outcomes generated during the conduct of the clinical investigation."
    ]
  },
  {
    number: "3",
    title: "Investigational Device Description",
    content: [
      "The Implantable Cardiac Support Device is a fully implantable medical device intended to provide long-term cardiovascular support in patients with chronic or advanced heart failure.",
      "The device was used in accordance with its intended clinical use, the approved Clinical Investigation Protocol, and the Instructions for Use. No deviations related to device configuration or intended use were identified during the study."
    ]
  },
  {
    number: "4",
    title: "Study Objectives and Endpoints",
    content: [],
    subsections: [
      {
        number: "4.1",
        title: "Primary Objective",
        content: [
          "To demonstrate the safety and performance of the Implantable Cardiac Support Device in providing long-term cardiovascular support in patients with chronic or advanced heart failure."
        ]
      },
      {
        number: "4.2",
        title: "Secondary Objectives",
        content: [
          "Secondary objectives included evaluation of procedural success, clinical outcomes, quality of life, device durability, and long-term reliability."
        ]
      },
      {
        number: "4.3",
        title: "Primary Endpoint",
        content: [
          "The primary endpoint was the composite rate of all-cause mortality and major adverse cardiovascular events at 12 months post-implantation."
        ]
      },
      {
        number: "4.4",
        title: "Secondary Endpoints",
        content: [
          "Secondary endpoints included functional status, hemodynamic improvement, quality of life outcomes, hospitalization rates, and device-related complications."
        ]
      }
    ]
  },
  {
    number: "5",
    title: "Study Design and Conduct",
    content: [
      "The clinical investigation was conducted as a prospective, multi-center study at specialized investigational sites within the European Union.",
      "Eligible subjects underwent screening, baseline assessment, device implantation, and structured follow-up visits as defined in the protocol. Independent core laboratories and a Data Safety Monitoring Board (DSMB) supported blinded data review and ongoing safety oversight.",
      "The study was conducted in accordance with the approved protocol without substantial deviations affecting study integrity."
    ]
  },
  {
    number: "6",
    title: "Subject Disposition and Accountability",
    content: [
      "A total of [N] subjects were screened for participation in the clinical investigation.",
      "Screened: [N]",
      "Enrolled: [N]",
      "Implanted: [N]",
      "Completed primary follow-up: [N]",
      "Withdrawn or discontinued: [N]",
      "Reasons for subject discontinuation included [e.g. adverse events, withdrawal of consent, loss to follow-up]."
    ]
  },
  {
    number: "7",
    title: "Baseline Demographics and Clinical Characteristics",
    content: [
      "Baseline demographic and clinical characteristics were consistent with the intended target population for the Implantable Cardiac Support Device.",
      "Subjects presented with advanced heart failure despite optimal medical therapy. Baseline characteristics including age, sex, NYHA classification, and left ventricular ejection fraction are summarized in Table [X]."
    ]
  },
  {
    number: "8",
    title: "Study Procedures and Compliance",
    content: [
      "All study procedures were performed in accordance with the protocol and Good Clinical Practice principles.",
      "Visit adherence was high across investigational sites. Assessments conducted outside predefined visit windows were documented and handled in accordance with the Statistical Analysis Plan.",
      "Protocol deviations were documented, assessed for impact, and classified as minor or major. No deviations were identified that compromised subject safety or data integrity.",
      "No major protocol deviations were identified that impacted subject safety or the scientific validity of the study results."
    ]
  },
  {
    number: "9",
    title: "Safety Results",
    content: [],
    subsections: [
      {
        number: "9.1",
        title: "Adverse Events",
        content: [
          "All adverse events were collected, documented, and evaluated throughout the clinical investigation.",
          "A total of [N] adverse events were reported. Device-related and procedure-related adverse events were analyzed separately."
        ]
      },
      {
        number: "9.2",
        title: "Serious Adverse Events",
        content: [
          "Serious adverse events were reported in accordance with ISO 14155 and EU MDR requirements. All serious adverse events were reviewed by the DSMB.",
          "The DSMB concluded that no safety concerns were identified that warranted study suspension or termination."
        ]
      },
      {
        number: "9.3",
        title: "Deaths",
        content: [
          "A total of 4 deaths occurred during the study period. Causes of death were adjudicated and assessed for relationship to device or procedure.",
          "No unexpected safety signals were identified."
        ]
      }
    ]
  },
  {
    number: "10",
    title: "Performance and Effectiveness Results",
    content: [
      "The Implantable Cardiac Support Device demonstrated performance consistent with the study objectives."
    ],
    subsections: [
      {
        number: "10.1",
        title: "Primary Endpoint Results",
        content: [
          "The primary endpoint at 12 months post-implantation was achieved in [X]% of subjects."
        ]
      },
      {
        number: "10.2",
        title: "Secondary Endpoint Results",
        content: [
          "Improvements were observed in functional status, hemodynamic parameters, and quality of life measures as assessed by validated instruments.",
          "Detailed results are presented in Tables [X–Y]."
        ]
      }
    ]
  },
  {
    number: "11",
    title: "Statistical Analysis Results",
    content: [
      "Statistical analyses were performed in accordance with the pre-specified Statistical Analysis Plan.",
      "Primary and secondary endpoints were analyzed using appropriate statistical methods. Missing data and protocol deviations were handled as defined in the SAP.",
      "The study achieved adequate statistical power to support interpretation of safety and performance outcomes."
    ]
  },
  {
    number: "12",
    title: "Benefit–Risk Evaluation",
    content: [
      "The clinical investigation demonstrated that the Implantable Cardiac Support Device provides meaningful clinical benefit to patients with chronic or advanced heart failure.",
      "Observed clinical benefits, including improved functional capacity and hemodynamic stability, were considered to outweigh the identified risks when the device was used as intended.",
      "The overall benefit–risk profile of the device is considered favorable."
    ]
  },
  {
    number: "13",
    title: "Discussion",
    content: [
      "The results of this clinical investigation support the safety and performance of the Implantable Cardiac Support Device in the intended patient population.",
      "Findings were consistent with the study objectives and aligned with the anticipated clinical benefits described in the Clinical Investigation Protocol."
    ]
  },
  {
    number: "14",
    title: "Study Limitations",
    content: [
      "Study limitations include sample size considerations, duration of follow-up, and the inherent limitations of a multi-center clinical investigation.",
      "These limitations were considered when interpreting the study results."
    ]
  },
  {
    number: "15",
    title: "Conclusions",
    content: [
      "Based on the results of this clinical investigation, the Implantable Cardiac Support Device demonstrated acceptable safety and performance in patients with chronic or advanced heart failure.",
      "The clinical evidence generated supports conformity with applicable EU MDR requirements."
    ]
  },
  {
    number: "16",
    title: "Compliance Statement",
    content: [
      "This clinical investigation was conducted in compliance with ISO 14155:2020, Regulation (EU) 2017/745 (EU MDR), the approved Clinical Investigation Protocol, and applicable ethical and regulatory requirements.",
      "Ethics committees were informed of study completion in accordance with applicable national requirements."
    ]
  },
  {
    number: "17",
    title: "References",
    content: [
      "[List as applicable]"
    ]
  },
  {
    number: "18",
    title: "Appendices",
    content: [
      "Approved Clinical Investigation Protocol",
      "Statistical Analysis Plan",
      "Protocol Deviations Listing",
      "Adverse Event Listings",
      "DSMB Summaries",
      "Ethics Committee Approvals"
    ]
  }
];

export function ClinicalInvestigationReport() {
  const [signatures, setSignatures] = useState<{
    investigator?: { name: string; date: string; signature: string };
    sponsor?: { name: string; date: string; signature: string };
  }>({});
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signingAs, setSigningAs] = useState<'investigator' | 'sponsor' | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

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

  const handleExportPDF = async () => {
    if (!signatures.investigator || !signatures.sponsor) return;

    try {
      // Show loading state
      const loadingMessage = document.createElement('div');
      loadingMessage.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 32px 48px;
        border-radius: 12px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        text-align: center;
        font-family: Inter, system-ui, sans-serif;
      `;
      loadingMessage.innerHTML = `
        <div style="font-size: 16px; font-weight: 600; color: #1a1a1a; margin-bottom: 8px;">
          Generating PDF...
        </div>
        <div style="font-size: 14px; color: #64748b;">
          Please wait while we prepare your Clinical Investigation Report
        </div>
      `;
      document.body.appendChild(loadingMessage);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pages = document.querySelectorAll('.protocol-page');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        
        // Capture the page as canvas
        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(imgData);
        const ratio = Math.min(pageWidth / imgProps.width, pageHeight / imgProps.height);
        const imgWidth = imgProps.width * ratio;
        const imgHeight = imgProps.height * ratio;

        // Center the image on the page
        const x = (pageWidth - imgWidth) / 2;
        const y = 0;

        if (i > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      }

      // Add metadata
      pdf.setProperties({
        title: 'Clinical Investigation Report - CIP-2024-MED-0847',
        subject: 'CARDIA-SUPPORT-2026 Clinical Investigation Report',
        author: 'CardiaFlow Medical Technologies GmbH',
        keywords: 'Clinical Investigation, EU MDR, Cardiac Device',
        creator: 'CardiaFlow Regulatory Platform'
      });

      // Save the PDF
      pdf.save('ClinicalInvestigationReport_CIP-2024-MED-0847_v1.0.pdf');

      // Remove loading message
      document.body.removeChild(loadingMessage);

      // Show success message
      const successMessage = document.createElement('div');
      successMessage.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        background: #d1fae5;
        color: #065f46;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        font-family: Inter, system-ui, sans-serif;
        font-size: 14px;
        font-weight: 500;
      `;
      successMessage.textContent = '✓ PDF exported successfully';
      document.body.appendChild(successMessage);

      setTimeout(() => {
        document.body.removeChild(successMessage);
      }, 3000);

    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const isReportApproved = signatures.investigator && signatures.sponsor;
  const approvalDate = isReportApproved 
    ? signatures.sponsor.date 
    : null;

  const renderSection = (section: CIRSection) => {
    return (
      <div key={section.number} className="protocol-section">
        <h2>{section.number}. {section.title}</h2>
        {section.content.map((paragraph, idx) => (
          <p key={idx} className="protocol-text">{paragraph}</p>
        ))}
        
        {/* Add tables and charts for specific sections */}
        {section.number === "6" && (
          <div style={{ marginTop: '24px', marginBottom: '24px' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#1a1a1a' }}>
              Table 1. Subject Disposition and Accountability
            </p>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              border: '1px solid #e5e7eb',
              fontSize: '13px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>N</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>%</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>Screened</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>156</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>100.0</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>Enrolled</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>142</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>91.0</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>Device Implanted</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>138</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>88.5</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>Completed 12-month Follow-up</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>132</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>84.6</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>Withdrawn / Discontinued</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>6</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>3.8</td>
                </tr>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>Deaths</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>4</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>2.6</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {section.number === "7" && (
          <div style={{ marginTop: '24px', marginBottom: '24px' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#1a1a1a' }}>
              Table 2. Baseline Demographics and Clinical Characteristics (N=138)
            </p>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              border: '1px solid #e5e7eb',
              fontSize: '13px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Characteristic</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>Age, years (mean ± SD)</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>62.4 ± 8.7</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>Male, n (%)</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>98 (71.0%)</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>BMI, kg/m² (mean ± SD)</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>27.2 ± 4.1</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', fontWeight: 500 }}>NYHA Class, n (%)</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}></td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 12px', paddingLeft: '24px', borderBottom: '1px solid #f3f4f6' }}>Class II</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>12 (8.7%)</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 12px', paddingLeft: '24px', borderBottom: '1px solid #f3f4f6' }}>Class III</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>96 (69.6%)</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 12px', paddingLeft: '24px', borderBottom: '1px solid #f3f4f6' }}>Class IV</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>30 (21.7%)</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>LVEF, % (mean ± SD)</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>28.6 ± 6.4</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>Ischemic cardiomyopathy, n (%)</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>82 (59.4%)</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 12px' }}>Prior cardiac surgery, n (%)</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>45 (32.6%)</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {section.subsections && section.subsections.map(subsection => (
          <div key={subsection.number} className="subsection">
            <h3>{subsection.number} {subsection.title}</h3>
            {subsection.content.map((paragraph, idx) => (
              <p key={idx} className="protocol-text">{paragraph}</p>
            ))}
            
            {/* Add Adverse Events Table */}
            {subsection.number === "9.1" && (
              <div style={{ marginTop: '24px', marginBottom: '24px' }}>
                <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#1a1a1a' }}>
                  Table 3. Summary of Adverse Events
                </p>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  border: '1px solid #e5e7eb',
                  fontSize: '13px'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Event Category</th>
                      <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Events (n)</th>
                      <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Subjects (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>All Adverse Events</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>347</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>118 (85.5%)</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>Device-Related AE</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>42</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>38 (27.5%)</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>Procedure-Related AE</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>28</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>26 (18.8%)</td>
                    </tr>
                    <tr style={{ backgroundColor: '#f3f4f6' }}>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>Serious Adverse Events</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>36</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>32 (23.2%)</td>
                    </tr>
                    <tr style={{ backgroundColor: '#f3f4f6' }}>
                      <td style={{ padding: '10px 12px' }}>Device-Related SAE</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>8</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>8 (5.8%)</td>
                    </tr>
                  </tbody>
                </table>
                
                {/* Bar Chart for AE Distribution */}
                <div style={{ marginTop: '32px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: '#1a1a1a' }}>
                    Figure 1. Distribution of Adverse Events by System Organ Class
                  </p>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      { category: 'Cardiac', events: 89 },
                      { category: 'Infections', events: 54 },
                      { category: 'Vascular', events: 42 },
                      { category: 'Respiratory', events: 38 },
                      { category: 'Renal', events: 31 },
                      { category: 'GI', events: 28 },
                      { category: 'Other', events: 65 }
                    ]} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} label={{ value: 'Number of Events', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                      <Tooltip />
                      <Bar dataKey="events" fill="#6b7280" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Add Primary Endpoint Chart */}
            {subsection.number === "10.1" && (
              <div style={{ marginTop: '24px', marginBottom: '24px' }}>
                <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: '#1a1a1a' }}>
                  Figure 2. Kaplan-Meier Curve: Freedom from Primary Endpoint (Death or MACE)
                </p>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={[
                    { month: 0, survival: 100 },
                    { month: 1, survival: 98.5 },
                    { month: 2, survival: 97.1 },
                    { month: 3, survival: 95.6 },
                    { month: 6, survival: 92.8 },
                    { month: 9, survival: 90.2 },
                    { month: 12, survival: 87.7 }
                  ]} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Months Post-Implantation', position: 'insideBottom', offset: -5, style: { fontSize: 12 } }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      domain={[80, 100]}
                      label={{ value: 'Event-Free Survival (%)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                    />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line 
                      type="stepAfter" 
                      dataKey="survival" 
                      stroke="#374151" 
                      strokeWidth={2.5}
                      dot={{ fill: '#374151', r: 4 }}
                      name="Freedom from Death/MACE"
                    />
                  </LineChart>
                </ResponsiveContainer>
                
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '12px', fontStyle: 'italic' }}>
                  Primary endpoint (composite of all-cause mortality and major adverse cardiovascular events) at 12 months: 87.7% event-free survival (95% CI: 82.1–93.3%)
                </p>
              </div>
            )}

            {/* Add Secondary Endpoints Table */}
            {subsection.number === "10.2" && (
              <div style={{ marginTop: '24px', marginBottom: '24px' }}>
                <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#1a1a1a' }}>
                  Table 4. Secondary Endpoint Results at 12 Months
                </p>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  border: '1px solid #e5e7eb',
                  fontSize: '13px'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Endpoint</th>
                      <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Baseline</th>
                      <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>12 Months</th>
                      <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>p-value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>6-Minute Walk Distance (m)</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>248 ± 67</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>362 ± 84</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>&lt;0.001</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>LVEF (%)</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>28.6 ± 6.4</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>38.2 ± 7.1</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>&lt;0.001</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>NT-proBNP (pg/mL)</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>4,280 ± 2,145</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>1,840 ± 986</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>&lt;0.001</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>KCCQ Overall Score</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>42.3 ± 12.8</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>68.7 ± 15.2</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>&lt;0.001</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 12px' }}>HF Hospitalizations (per patient-year)</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>2.8 ± 1.4</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>0.6 ± 0.8</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>&lt;0.001</td>
                    </tr>
                  </tbody>
                </table>
                
                {/* Bar Chart for Functional Improvement */}
                <div style={{ marginTop: '32px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: '#1a1a1a' }}>
                    Figure 3. NYHA Functional Class Distribution: Baseline vs. 12 Months
                  </p>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      { class: 'NYHA I', baseline: 0, month12: 18 },
                      { class: 'NYHA II', baseline: 12, month12: 76 },
                      { class: 'NYHA III', baseline: 96, month12: 34 },
                      { class: 'NYHA IV', baseline: 30, month12: 4 }
                    ]} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="class" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} label={{ value: 'Number of Subjects', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="baseline" fill="#9ca3af" name="Baseline" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="month12" fill="#4b5563" name="12 Months" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* Top Navigation Menu */}
      <nav style={{
        backgroundColor: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 48px',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'center'
      }}>
        <div style={{
          display: 'flex',
          gap: '32px',
          alignItems: 'center',
          height: '56px'
        }}>
          <a href="#" style={{ fontSize: '14px', color: '#94a3b8', textDecoration: 'none', fontWeight: 400 }}>
            Project setup
          </a>
          <a href="#" style={{ fontSize: '14px', color: '#94a3b8', textDecoration: 'none', fontWeight: 400 }}>
            Protocol authoring
          </a>
          <a href="#" style={{ fontSize: '14px', color: '#94a3b8', textDecoration: 'none', fontWeight: 400 }}>
            Protocol review
          </a>
          <a href="#" style={{ fontSize: '14px', color: '#94a3b8', textDecoration: 'none', fontWeight: 400 }}>
            Protocol approval
          </a>
          <a href="#" style={{ fontSize: '14px', color: '#94a3b8', textDecoration: 'none', fontWeight: 400 }}>
            Report authoring
          </a>
          <a href="#" style={{ fontSize: '14px', color: '#94a3b8', textDecoration: 'none', fontWeight: 400 }}>
            Report review
          </a>
          <a href="#" style={{ fontSize: '18.2px', color: '#0f172a', textDecoration: 'none', fontWeight: 600 }}>
            Report approval
          </a>
        </div>
      </nav>

      <div className="app-container" style={{ marginTop: '56px' }}>
        {/* Sidebar - Help Panel */}
        {showSidebar && (
          <aside className="help-sidebar" style={{ top: '56px', height: 'calc(100vh - 56px)' }}>
            <div className="sidebar-header">
              <Info size={20} />
              <h3>Final Clinical Investigation Report for Regulatory Submission</h3>
            </div>
            
            <div className="sidebar-content">
              <p className="sidebar-intro">
                This is the final, print-ready version of the Clinical Investigation Report (CIR). 
                Following review and e-signature by the Coordinating Investigator and Sponsor Representative, 
                export this document as a PDF for submission to:
              </p>
              
              <div className="sidebar-list">
                <div className="sidebar-item">
                  <strong>Competent Authorities</strong>
                  <span>(e.g., national regulatory agencies) as part of EU MDR post-investigation reporting</span>
                </div>
                
                <div className="sidebar-item">
                  <strong>Notified Bodies</strong>
                  <span>for inclusion in the Technical Documentation and Clinical Evaluation</span>
                </div>
                
                <div className="sidebar-item">
                  <strong>Ethics Committees / IRBs</strong>
                  <span>as required for study closure and final reporting</span>
                </div>
                
                <div className="sidebar-item">
                  <strong>Sponsor Records and Trial Master File (TMF)</strong>
                  <span>as the official record of study results</span>
                </div>
                
                <div className="sidebar-item">
                  <strong>Investigational Sites</strong>
                  <span>for inclusion in the Investigator Site File (ISF)</span>
                </div>
              </div>
              
              <p className="sidebar-note">
                Ensure that all analyses are finalized, all sections are complete, and both required signatures are applied before final export.
              </p>
            </div>
          </aside>
        )}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header Above Document */}
          <div style={{ 
            backgroundColor: '#e5e7eb',
            padding: '48px',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <div style={{
              border: '1px solid #d1d5db',
              borderRadius: '0',
              padding: '32px 48px',
              backgroundColor: '#ffffff',
              textAlign: 'center',
              maxWidth: '800px',
              width: '100%'
            }}>
              <h1 style={{ 
                fontSize: '20pt', 
                fontWeight: 600, 
                color: '#1f2937', 
                margin: '0 0 8px 0',
                letterSpacing: '-0.01em',
                lineHeight: 1.3
              }}>
                Final Report Document for Regulatory Submission
              </h1>
              <p style={{ 
                fontSize: '12pt', 
                color: '#6b7280', 
                margin: 0,
                fontWeight: 400,
                lineHeight: 1.5
              }}>
                Final, read-only report document prepared for regulatory submission
              </p>
            </div>
          </div>

          <div className="document-area" style={{ marginTop: 0 }}>
            <div className="protocol-document">
              {/* Title Page */}
              <div className="protocol-page">
                <div className="title-page">
                  <h1 className="document-title">
                    Clinical Investigation Report for the Implantable Cardiac Support Device
                  </h1>

                  <div className="title-metadata">
                    <p><strong>Study Title:</strong> Clinical Investigation Report for the Implantable Cardiac Support Device</p>
                    <p><strong>Short Title:</strong> CARDIA-SUPPORT-2026</p>
                    <p><strong>Protocol ID:</strong> CIP-2024-MED-0847</p>
                    <p><strong>Protocol Version:</strong> Version 1.3</p>
                    <p><strong>Report Version:</strong> Version 1.0</p>
                    <p><strong>Report Date:</strong> [DD Month YYYY]</p>
                    <p><strong>Sponsor:</strong> CardiaFlow Medical Technologies GmbH<br />Technologiepark 15, 80992 München, Germany</p>
                    <p><strong>Coordinating Investigator:</strong> Dr. Helena Schmit<br />University Heart Center Hamburg</p>
                  </div>
                </div>

                <div className="page-number">Page 1</div>
              </div>

              {/* Content Pages */}
              <div className="protocol-page">
                {cirData.slice(0, 3).map(section => renderSection(section))}
                <div className="page-number">Page 2</div>
              </div>

              <div className="protocol-page">
                {cirData.slice(3, 5).map(section => renderSection(section))}
                <div className="page-number">Page 3</div>
              </div>

              <div className="protocol-page">
                {cirData.slice(5, 8).map(section => renderSection(section))}
                <div className="page-number">Page 4</div>
              </div>

              <div className="protocol-page">
                {cirData.slice(8, 10).map(section => renderSection(section))}
                <div className="page-number">Page 5</div>
              </div>

              <div className="protocol-page">
                {cirData.slice(10, 14).map(section => renderSection(section))}
                <div className="page-number">Page 6</div>
              </div>

              <div className="protocol-page">
                {cirData.slice(14, 18).map(section => renderSection(section))}

                {/* Report Approval Status */}
                {isReportApproved && (
                  <div className="protocol-status-header" style={{ marginTop: '48px' }}>
                    <div className="status-primary">✓ Report Approved and Signed</div>
                    <div className="status-secondary">
                      This Clinical Investigation Report has been reviewed and electronically signed by all required parties
                    </div>
                    <div className="approval-metadata">
                      <span>Approval Date: {approvalDate}</span>
                      <span>Report Version: 1.0</span>
                    </div>
                  </div>
                )}

                {/* Signature Section */}
                <div className="signature-block">
                  <h2 style={{ marginBottom: '32px' }}>Report Approval Signatures</h2>
                  
                  <div style={{ display: 'flex', gap: '32px', marginBottom: '48px' }}>
                    {/* Coordinating Investigator Signature */}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                        Coordinating Principal Investigator
                      </p>
                      <p style={{ fontSize: '15px', fontWeight: 500, color: '#1a1a1a', marginBottom: '16px' }}>
                        Dr. Helena Schmit<br />
                        <span style={{ fontSize: '13px', fontWeight: 400, color: '#64748b' }}>University Heart Center Hamburg</span>
                      </p>
                      
                      {signatures.investigator ? (
                        <div>
                          <div style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '16px',
                            backgroundColor: '#f9fafb',
                            marginBottom: '8px'
                          }}>
                            <img 
                              src={signatures.investigator.signature} 
                              alt="Investigator Signature" 
                              style={{ width: '100%', maxWidth: '200px', height: 'auto' }}
                            />
                          </div>
                          <p style={{ fontSize: '13px', color: '#16a34a', fontWeight: 500, margin: 0 }}>
                            ✓ Signed by {signatures.investigator.name} on {signatures.investigator.date}
                          </p>
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleSign('investigator')}
                          style={{
                            padding: '10px 20px',
                            backgroundColor: '#fff',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: 400,
                            color: '#1a1a1a',
                            cursor: 'pointer',
                            width: '100%',
                            textAlign: 'center'
                          }}
                        >
                          Click to Sign
                        </button>
                      )}
                    </div>

                    {/* Sponsor Representative Signature */}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                        Sponsor Representative
                      </p>
                      <p style={{ fontSize: '15px', fontWeight: 500, color: '#1a1a1a', marginBottom: '16px' }}>
                        CardiaFlow Medical Technologies GmbH<br />
                        <span style={{ fontSize: '13px', fontWeight: 400, color: '#64748b' }}>Clinical Affairs Director</span>
                      </p>
                      
                      {signatures.sponsor ? (
                        <div>
                          <div style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '16px',
                            backgroundColor: '#f9fafb',
                            marginBottom: '8px'
                          }}>
                            <img 
                              src={signatures.sponsor.signature} 
                              alt="Sponsor Signature" 
                              style={{ width: '100%', maxWidth: '200px', height: 'auto' }}
                            />
                          </div>
                          <p style={{ fontSize: '13px', color: '#16a34a', fontWeight: 500, margin: 0 }}>
                            ✓ Signed by {signatures.sponsor.name} on {signatures.sponsor.date}
                          </p>
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleSign('sponsor')}
                          style={{
                            padding: '10px 20px',
                            backgroundColor: '#fff',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: 400,
                            color: '#1a1a1a',
                            cursor: 'pointer',
                            width: '100%',
                            textAlign: 'center'
                          }}
                        >
                          Click to Sign
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="page-number">Page 7</div>
              </div>

              {/* Footer Line */}
              <div className="document-footer-line">
                Clinical Investigation Report | CIP-2024-MED-0847 | Report Version 1.0 | 22 February 2026 | CardiaFlow Medical Technologies GmbH | Confidential
              </div>

              {/* Report Finalization Panel */}
              <div style={{ 
                padding: '48px', 
                backgroundColor: '#fff', 
                borderTop: '1px solid #e5e7eb',
                marginTop: '48px'
              }}>
                <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px', color: '#1a1a1a' }}>
                  Report Finalization
                </h2>

                {/* Info Banner */}
                <div style={{
                  padding: '20px 24px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  marginBottom: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <p style={{ color: '#475569', fontSize: '14px', margin: 0 }}>
                    Discovered an error? You can still make changes before finalizing.
                  </p>
                  <button style={{
                    padding: '8px 16px',
                    backgroundColor: '#fff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#475569',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Info size={16} />
                    Request Changes
                  </button>
                </div>

                {/* Signature Status */}
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#1a1a1a' }}>
                  Signature Status
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                  {/* Coordinating Principal Investigator */}
                  <div style={{
                    padding: '20px 24px',
                    backgroundColor: signatures.investigator ? '#fff' : '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 4px 0' }}>
                        Coordinating Principal Investigator
                      </p>
                      <p style={{ fontSize: '15px', fontWeight: 500, color: '#1a1a1a', margin: 0 }}>
                        {signatures.investigator ? signatures.investigator.name : 'Dr. Helena Schmit'}
                      </p>
                    </div>
                    <div style={{
                      padding: '6px 16px',
                      backgroundColor: signatures.investigator ? '#dbeafe' : '#f3f4f6',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: signatures.investigator ? '#1e40af' : '#6b7280'
                    }}>
                      {signatures.investigator ? 'Signed' : 'Pending'}
                    </div>
                  </div>

                  {/* Sponsor Representative */}
                  <div style={{
                    padding: '20px 24px',
                    backgroundColor: signatures.sponsor ? '#fff' : '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 4px 0' }}>
                        Sponsor Representative
                      </p>
                      <p style={{ fontSize: '15px', fontWeight: 500, color: '#1a1a1a', margin: 0 }}>
                        {signatures.sponsor ? signatures.sponsor.name : 'Dr. Sarah Chen'}
                      </p>
                    </div>
                    <div style={{
                      padding: '6px 16px',
                      backgroundColor: signatures.sponsor ? '#dbeafe' : '#f3f4f6',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: signatures.sponsor ? '#1e40af' : '#6b7280'
                    }}>
                      {signatures.sponsor ? 'Signed' : 'Pending'}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={isReportApproved ? handleExportPDF : undefined}
                    style={{
                      padding: '12px 20px',
                      backgroundColor: '#fff',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: isReportApproved ? '#000000' : '#4b5563',
                      cursor: isReportApproved ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      justifyContent: 'center'
                    }}
                    disabled={!isReportApproved}
                  >
                    <Lock size={16} />
                    Export Locked PDF
                  </button>
                </div>

                <p style={{ 
                  fontSize: '13px', 
                  color: '#64748b', 
                  textAlign: 'right',
                  margin: 0
                }}>
                  Report generation is available only after report approval and signature completion.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Signature Modal */}
        {showSignatureModal && signingAs && (
          <SignatureModal
            role={signingAs === 'investigator' ? 'Coordinating Investigator' : 'Sponsor Representative'}
            onComplete={handleSignatureComplete}
            onCancel={() => {
              setShowSignatureModal(false);
              setSigningAs(null);
            }}
          />
        )}
      </div>
    </div>
  );
}