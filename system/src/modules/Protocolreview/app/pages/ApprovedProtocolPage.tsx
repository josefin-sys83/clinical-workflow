import { protocolSections } from '../data/mockProtocolData';
import { CheckCircle2, Calendar, FileText, User } from 'lucide-react';

export default function ApprovedProtocolPage() {
  const approvalDate = new Date().toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const approvalTime = new Date().toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-12 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
                  <CheckCircle2 className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-neutral-900">Protocol Approved</h1>
                  <p className="text-sm text-neutral-600">CIP-2024-MED-0847 CARDIA-SUPPORT-2026</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <button className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:text-neutral-900">
                <FileText className="w-4 h-4" />
                Download PDF
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-900 text-white text-sm font-medium rounded-md hover:bg-blue-950">
                Share Protocol
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Approval Banner */}
      <div className="bg-green-50 border-y border-green-200 px-12 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-green-700" />
                <div>
                  <p className="text-xs text-green-700 font-medium">Approved by</p>
                  <p className="text-sm text-green-900">Dr. Emma Nilsson</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-green-700" />
                <div>
                  <p className="text-xs text-green-700 font-medium">Approval date</p>
                  <p className="text-sm text-green-900">{approvalDate} at {approvalTime}</p>
                </div>
              </div>
            </div>
            <div className="px-3 py-1.5 bg-green-200 text-green-900 text-xs font-medium rounded-full">
              APPROVED
            </div>
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="px-12 py-8">
        <div className="max-w-5xl mx-auto bg-white shadow-sm rounded-lg">
          {/* Document Header */}
          <div className="border-b border-neutral-200 px-16 py-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-neutral-900 mb-4">
                Clinical Investigation Protocol
              </h2>
              <h3 className="text-xl font-semibold text-neutral-800 mb-6">
                A Prospective, Randomized, Multi-Center Clinical Investigation to Evaluate the Safety and Performance of the CARDIA-SUPPORT-2026 Implantable Cardiac Support Device in Patients with Chronic or Advanced Heart Failure
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm">
              <div>
                <p className="text-neutral-600">Protocol ID</p>
                <p className="font-medium text-neutral-900">CIP-2024-MED-0847</p>
              </div>
              <div>
                <p className="text-neutral-600">Version</p>
                <p className="font-medium text-neutral-900">3.0</p>
              </div>
              <div>
                <p className="text-neutral-600">Date</p>
                <p className="font-medium text-neutral-900">2024-11-15</p>
              </div>
              <div>
                <p className="text-neutral-600">Study Phase</p>
                <p className="font-medium text-neutral-900">Pivotal Clinical Investigation (EU MDR Class III)</p>
              </div>
              <div>
                <p className="text-neutral-600">Sponsor</p>
                <p className="font-medium text-neutral-900">CardiaLife Medical Technologies GmbH</p>
              </div>
              <div>
                <p className="text-neutral-600">Principal Investigator</p>
                <p className="font-medium text-neutral-900">Prof. Dr. Johan Lundqvist</p>
              </div>
            </div>
          </div>

          {/* Protocol Sections */}
          <div className="px-16 py-8 space-y-10">
            {protocolSections.map((section, index) => (
              <section key={section.id} className="protocol-section">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4 pb-2 border-b border-neutral-200">
                  {index + 1}. {section.title}
                </h3>
                <div className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
                  {section.content}
                </div>
              </section>
            ))}
          </div>

          {/* Signature Section */}
          <div className="border-t border-neutral-200 px-16 py-8">
            <h3 className="text-lg font-semibold text-neutral-900 mb-6">
              Regulatory Approval Signature
            </h3>
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
                  <CheckCircle2 className="w-6 h-6 text-green-700" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-neutral-900">Dr. Emma Nilsson</p>
                  <p className="text-sm text-neutral-600">Senior Regulatory Affairs Specialist</p>
                  <p className="text-sm text-neutral-600">emma.nilsson@medtech.com</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-neutral-900">{approvalDate}</p>
                  <p className="text-sm text-neutral-600">{approvalTime}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-neutral-300">
                <p className="text-xs text-neutral-600">
                  This protocol has been reviewed and approved in accordance with ISO 14155:2020, EU MDR 2017/745, and internal quality management procedures. All identified risks have been assessed and accepted. This approval is recorded in the audit trail and is valid for protocol execution.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-neutral-200 px-16 py-6 bg-neutral-50">
            <div className="flex items-center justify-between text-xs text-neutral-600">
              <p>Document ID: CIP-2024-MED-0847-v3.0</p>
              <p>Page 1 of 1</p>
              <p>Confidential & Proprietary</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
