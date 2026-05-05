import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, FileText, Upload, Lock, Sparkles, AlertCircle } from 'lucide-react';
import { WorkflowBreadcrumb } from './WorkflowBreadcrumb';
import { useNavigate, useParams } from 'react-router-dom';


interface ReadinessItem {
  id: string;
  label: string;
  status: 'complete' | 'needs-review' | 'missing';
  reason?: string;
}

type SynopsisStatus = 'not-started' | 'in-progress' | 'completed';

interface WorkflowStep {
  id: string;
  label: string;
  status: 'completed' | 'active' | 'locked';
  path?: string;
}

export function SynopsisPage() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [aiReviewComplete, setAiReviewComplete] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [synopsisStatus, setSynopsisStatus] = useState<SynopsisStatus>('not-started');

  const [readinessChecklist, setReadinessChecklist] = useState<ReadinessItem[]>([
    { id: '1', label: 'Synopsis document uploaded', status: 'missing' },
    { id: '2', label: 'Study rationale defined', status: 'missing' },
    { id: '3', label: 'Study objectives stated', status: 'missing' },
    { id: '4', label: 'Target population described', status: 'missing' },
    { id: '5', label: 'Study design identified', status: 'missing' },
    { id: '6', label: 'Primary endpoint(s) defined', status: 'missing' },
    { id: '7', label: 'High-level methodology described', status: 'missing' },
    { id: '8', label: 'Study scope defined', status: 'missing' },
    { id: '9', label: 'Key assumptions documented', status: 'missing' },
    { id: '10', label: 'Regulatory context stated', status: 'missing' },
    { id: '11', label: 'Intended use context aligned', status: 'missing' },
    { id: '12', label: 'High-level feasibility considerations present', status: 'missing' },
    { id: '13', label: 'No obvious feasibility blockers identified', status: 'missing' },
    { id: '14', label: 'Internal consistency verified', status: 'missing' },
    { id: '15', label: 'Key sections identifiable for downstream use', status: 'missing' },
  ]);

  const maxStep = parseInt(localStorage.getItem(`maxStep_${projectId}`) || '0');
  const apiBase = '';

  useEffect(() => {
    if (!projectId) return;
    fetch(`${apiBase}/api/projects/${projectId}`)
      .then(r => r.json())
      .then(project => {
        if (project.data?.synopsis) {
          const s = project.data.synopsis;
          if (s.uploadedFileName) setUploadedFileName(s.uploadedFileName);
          if (s.readinessChecklist) setReadinessChecklist(s.readinessChecklist);
          if (s.aiReviewComplete) setAiReviewComplete(s.aiReviewComplete);
          if (s.synopsisStatus) setSynopsisStatus(s.synopsisStatus);
        }
      })
      .catch(() => {});
  }, [projectId]);

  const saveToBackend = async (data: any) => {
    try {
      await fetch(`${apiBase}/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { synopsis: data } }),
      });
    } catch (e) {
      console.error('Failed to save synopsis', e);
    }
  };

  const phase1Steps: WorkflowStep[] = [
    { id: '1', label: 'Setup', status: 'completed', path: `/projects/${projectId}/workflow/project-setup` },
    { id: '2', label: 'Synopsis', status: 'active', path: `/projects/${projectId}/workflow/synopsis` },
    { id: '3', label: 'Scope & Intended Use', status: (maxStep >= 3 || synopsisStatus === 'completed') ? 'completed' : 'locked', path: `/projects/${projectId}/workflow/scope` },
  ];

  const auditEntries: AuditEntry[] = [];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setUploadedFileName(file.name);
    setIsAnalyzing(true);
    setAnalysisError(null);

    // Upload file to backend for storage
    const formData = new FormData();
    formData.append('file', file);
    try {
      await fetch(`${apiBase}/api/projects/${projectId}/synopsis-file`, {
        method: 'POST',
        body: formData,
      });
    } catch (e) {
      console.error('Failed to upload file', e);
    }

    // Analyze with AI
    try {
      const analyzeForm = new FormData();
      analyzeForm.append('file', file);
      const response = await fetch(`${apiBase}/api/projects/${projectId}/analyze-synopsis`, {
        method: 'POST',
        body: analyzeForm,
      });

      if (!response.ok) throw new Error('Analysis failed');

      const results = await response.json();
      const updatedChecklist = readinessChecklist.map(item => {
        const result = results.find((r: any) => r.id === item.id);
        return result
          ? { ...item, status: result.status as 'complete' | 'missing', reason: result.reason }
          : item;
      });
      // Mark item 1 as complete since file is uploaded
      updatedChecklist[0] = { ...updatedChecklist[0], status: 'complete', reason: 'Document uploaded successfully' };

      setReadinessChecklist(updatedChecklist);
      setAiReviewComplete(true);
      await saveToBackend({ uploadedFileName: file.name, readinessChecklist: updatedChecklist, aiReviewComplete: true, synopsisStatus });
    } catch (e) {
      setAnalysisError('AI analysis failed. Please try again.');
      console.error('Analysis error:', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const allChecked = readinessChecklist.every(item => item.status === 'complete');

  const handleCompleteSynopsis = async () => {
    if (allChecked) {
      setSynopsisStatus('completed');
      if (maxStep < 3) localStorage.setItem(`maxStep_${projectId}`, '3');
      await saveToBackend({ uploadedFileName, readinessChecklist, aiReviewComplete, synopsisStatus: 'completed' });
      navigate(`/projects/${projectId}/workflow/scope`);
    } else {
      alert('Please complete all readiness checklist items before proceeding.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-80 bg-white border-r border-slate-200 flex-shrink-0 overflow-y-auto flex flex-col">
        <div className="p-6 flex-1">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Workflow Steps</h2>
          <nav className="space-y-4">
            <div>
              <div className="mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Project setup</span>
              </div>
              <div className="space-y-1">
                {phase1Steps.map((step, index) => (
                  <div
                    key={step.id}
                    onClick={() => step.status !== 'locked' && step.path && navigate(step.path)}
                    className={`flex items-center gap-3 transition-colors ${
                      step.status === 'active'
                        ? 'bg-blue-50 border border-blue-200 rounded-lg p-3'
                        : step.status === 'completed'
                        ? 'px-3 py-2 rounded-md text-slate-700 hover:bg-slate-50 cursor-pointer'
                        : 'px-3 py-2 rounded-md text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {step.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                      {step.status === 'active' && (
                        <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium">
                          {index + 1}
                        </div>
                      )}
                      {step.status === 'locked' && <Lock className="w-5 h-5 text-slate-300" />}
                    </div>
                    <span className={`text-sm ${step.status === 'active' ? 'font-medium text-blue-900' : ''}`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </nav>
        </div>
        <div className="bg-slate-50 border-t border-slate-200 p-4">
          <div className="text-xs text-slate-600">
            <div className="font-medium mb-1">System Information</div>
            <div>Version 2.4.1</div>
            <div>Last updated: Jan 24, 2026</div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <WorkflowBreadcrumb currentStep="project-setup" />
              
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="space-y-6">
              <section className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-2">Synopsis Document</h2>
                <p className="text-sm text-slate-500 mb-6">Upload your synopsis document. Our AI will analyze it and check each readiness criterion automatically.</p>
                {!uploadedFile && !uploadedFileName ? (
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-700 mb-1">Upload Synopsis Document</p>
                    <p className="text-xs text-slate-500 mb-4">PDF or DOCX format • Max 10 MB</p>
                    <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors">
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                      <input type="file" accept=".pdf,.docx,.doc" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-md">
                      <FileText className="w-5 h-5 text-slate-600" />
                      <div className="flex-1">
                        <p
                          className="text-sm font-medium text-blue-600 hover:underline cursor-pointer"
                          onClick={() => window.open(`${apiBase}/api/projects/${projectId}/synopsis-file`, '_blank')}
                        >
                          {uploadedFile?.name || uploadedFileName}
                        </p>
                        <p className="text-xs text-slate-500">Click to open file</p>
                      </div>
                      {isAnalyzing ? (
                        <div className="flex items-center gap-2 text-blue-600">
                          <Sparkles className="w-4 h-4 animate-pulse" />
                          <span className="text-xs font-medium">AI analyzing...</span>
                        </div>
                      ) : aiReviewComplete ? (
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      ) : null}
                    </div>
                    {analysisError && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 rounded-md text-red-600 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {analysisError}
                      </div>
                    )}
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer transition-colors">
                      <Upload className="w-4 h-4" />
                      Replace file
                      <input type="file" accept=".pdf,.docx,.doc" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                )}
              </section>

              <section className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Readiness & Dependencies</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {aiReviewComplete
                        ? `${readinessChecklist.filter(i => i.status === 'complete').length} of ${readinessChecklist.length} criteria met`
                        : 'Upload a document to start AI analysis'}
                    </p>
                  </div>
                  {isAnalyzing && (
                    <div className="flex items-center gap-2 text-blue-600 text-sm">
                      <Sparkles className="w-4 h-4 animate-pulse" />
                      Analyzing with AI...
                    </div>
                  )}
                </div>
                <div className="space-y-3 mb-4">
                  {readinessChecklist.map((item) => (
                    <div key={item.id} className={`flex items-start gap-3 p-4 rounded-lg border ${
                      item.status === 'complete' ? 'border-blue-100 bg-blue-50' : 'border-slate-200 bg-slate-50'
                    }`}>
                      <div className="flex-shrink-0 mt-0.5">
                        {item.status === 'complete' ? (
                          <CheckCircle2 className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-700">{item.label}</span>
                        {item.reason && (
                          <p className="text-xs text-slate-500 mt-0.5">{item.reason}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-semibold text-slate-900 mb-1">Ready to proceed?</h4>
                    <p className="text-sm text-slate-500">
                      {allChecked ? 'All criteria met — you can proceed to Scope.' : `${readinessChecklist.filter(i => i.status === 'missing').length} criteria still missing.`}
                    </p>
                  </div>
                  <button
                    onClick={handleCompleteSynopsis}
                    disabled={!allChecked}
                    className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ml-4 ${
                      allChecked ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Complete Synopsis
                  </button>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}