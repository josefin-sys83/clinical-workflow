import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { ReportSection, DataAsset, UploadedFile, User, ProtocolDeviation, ProtocolAmendment, ReportCompletenessStatus, CompletenessElement } from '../types';
import { ReportNavigation } from '../components/ReportNavigation';
import { WorkflowProgressIndicator } from '../components/WorkflowProgressIndicator';
import { ReportContent } from '../components/ReportContent';
import { RightSidebar } from '../components/RightSidebar';
import { Button } from '@/shared/ui/button';
import { DeviationsModal } from '../components/DeviationsModal';
import { ProtocolAmendmentModal } from '../components/ProtocolAmendmentModal';
import { ProtocolAmendmentsList } from '../components/ProtocolAmendmentsList';
import { AmendmentModal } from '../../Makeprotokoll/components/AmendmentModal';

import { initialReportSections, mockProtocolSections, mockUsers, mockCompletenessStatus } from '../data/mockData';
import { validateReportContent } from '../services/validationService';
import { generateAssetNarrative } from '../services/narrativeService';
import { InsertedAsset } from '../types';
import { Clock } from 'lucide-react';
import { MilestoneBanner } from '@/shared/components/MilestoneBanner';
import { useProtocolStatus } from '@/shared/hooks/useProtocolStatus';
import { ProtocolFinalizedBanner } from '@/shared/components/ProtocolFinalizedBanner';
import { getToken } from '@/shared/auth/token';

function userFromRole(rawRoles: any[], roleTitle: string): User {
  const role = rawRoles.find((r: any) => r.title === roleTitle);
  const person = role?.assignedTo?.[0];
  if (!person) return { id: roleTitle, name: 'Unassigned', email: '', role: roleTitle };
  return { id: person.email || person.name, name: person.name, email: person.email || '', role: roleTitle };
}

export function ReportWorkspace() {
  const { projectId } = useParams();
  const { protocolFinalized, latestAmendment: statusLatestAmendment } = useProtocolStatus(projectId);
  const apiBase = '';

  const [projectData, setProjectData] = useState<any>(null);
  const [scope, setScope] = useState<any>(null);
  const [rawRoles, setRawRoles] = useState<any[]>([]);
  const [sessionUser, setSessionUser] = useState<{ id: string; name: string; email: string | null } | null>(null);
  const [apiSectionDefs, setApiSectionDefs] = useState<Array<{ id: string; title: string; number: number }>>([]);
  const [targetMarkets, setTargetMarkets] = useState<string[]>([]);

  // Starts empty (not the mock scaffold) so no fabricated section content, owner,
  // or reviewer names are ever shown, even briefly, before the real fetch resolves.
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [dataAssets, setDataAssets] = useState<DataAsset[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [currentSection, setCurrentSection] = useState<string>('');
  const [scrollTrigger, setScrollTrigger] = useState(0);

  const navigateToSection = (sectionId: string) => {
    setCurrentSection(sectionId);
    setScrollTrigger(n => n + 1);
  };
  const [showDeviations, setShowDeviations] = useState(false);
  const [showAmendmentModal, setShowAmendmentModal] = useState(false);
  const [showAmendmentsList, setShowAmendmentsList] = useState(false);
  const [amendments, setAmendments] = useState<ProtocolAmendment[]>([]);
  const [completenessStatus, setCompletenessStatus] = useState<ReportCompletenessStatus>(mockCompletenessStatus);
  const [sectionAiIssues, setSectionAiIssues] = useState<Record<string, any[]>>({});
  const [analysisVersion, setAnalysisVersion] = useState(0);
  const [savedWontFixIssues, setSavedWontFixIssues] = useState<Record<string, string[]>>({});
  const [wontFixCrossConsistencyIds, setWontFixCrossConsistencyIds] = useState<string[]>([]);

  // Protocol amendments fetched from the backend (distinct from the local `amendments`
  // mock state above, which tracks a separate UI-only amendment flow).
  const [protocolAmendments, setProtocolAmendments] = useState<any[]>([]);
  const [protocolSectionsForAmendment, setProtocolSectionsForAmendment] = useState<{ id: string; title: string }[]>([]);
  const [crossConsistencyIssues, setCrossConsistencyIssues] = useState<any[]>([]);
  const [checkingConsistency, setCheckingConsistency] = useState(false);

  const runCrossConsistencyCheck = async () => {
    if (!projectId || checkingConsistency) return;
    setCheckingConsistency(true);
    try {
      const res = await fetch(apiBase + '/api/projects/' + projectId + '/check-cross-consistency', {
        method: 'POST',
      });
      const data = await res.json();
      setCrossConsistencyIssues(data.issues || []);
    } catch (e) {
      console.error('Cross-consistency check failed', e);
    } finally {
      setCheckingConsistency(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;
    fetch(apiBase + '/api/projects/' + projectId + '/amendments')
      .then(r => r.json())
      .then(data => setProtocolAmendments(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [projectId]);

  // Real authenticated identity, used to determine which sections/issues are
  // actually "mine" — independent of the project's role assignments below.
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then((u: { id: string; name: string; email: string | null } | null) => { if (u) setSessionUser(u); })
      .catch(() => {});
  }, []);

  const pendingProtocolAmendments = protocolAmendments.filter(
    (a: any) => a.status !== 'finalized' && a.status !== 'rejected',
  );
  const isReportBlocked = pendingProtocolAmendments.length > 0;

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      fetch(apiBase + '/api/projects/' + projectId).then(r => r.json()),
      fetch(apiBase + '/api/projects/' + projectId + '/report-sections').then(r => r.json()).catch(() => null),
    ]).then(([p, sectionMeta]) => {
      setProjectData({
        ...(p.data?.projectData || {}),
        projectName: p.name,
        deviceCategory: p.deviceCategory,
        targetMarkets: p.targetMarkets || [],
      });
      if (p.data?.scope) setScope(p.data.scope);
      const newRoles: any[] = p.roles || [];
      if (newRoles.length > 0) setRawRoles(newRoles);

      const owner = userFromRole(newRoles, 'Medical Writer');
      const reviewer = userFromRole(newRoles, 'Protocol Lead');
      const approver = userFromRole(newRoles, 'Clinical Affairs VP');

      const projectUploadedFiles: UploadedFile[] = p.data?.report?.uploadedFiles || p.data?.uploadedFiles || [];
      setUploadedFiles(projectUploadedFiles);

      const projectDataAssets: DataAsset[] = p.data?.report?.dataAssets || p.data?.dataAssets || [];
      if (projectDataAssets.length > 0) setDataAssets(projectDataAssets);

      // Store API section defs and target markets for sidebar badges
      const apiDefs: Array<{ id: string; title: string; number: number }> =
        sectionMeta?.sections || p.data?.report?.sectionDefs || [];
      if (apiDefs.length > 0) setApiSectionDefs(apiDefs);
      setTargetMarkets(sectionMeta?.targetMarkets || p.targetMarkets || []);

      if (p.data?.protocol?.sections) {
        setProtocolSectionsForAmendment(p.data.protocol.sections.map((s: any) => ({ id: s.id, title: s.title })));
      }

      const savedSections = p.data?.report?.sections;

      // Collect wont-fix suppressions from any saved section
      const wontFixMap: Record<string, string[]> = {};
      if (savedSections && typeof savedSections === 'object' && !Array.isArray(savedSections)) {
        Object.entries(savedSections as Record<string, any>).forEach(([id, data]) => {
          if (Array.isArray((data as any)?.wontFixIssues)) wontFixMap[id] = (data as any).wontFixIssues;
        });
      }
      if (Array.isArray(savedSections)) {
        savedSections.forEach((sec: any) => {
          if (sec.id && sec.wontFixIssues) {
            wontFixMap[sec.id] = sec.wontFixIssues;
          }
        });
      }
      if (Object.keys(wontFixMap).length > 0) setSavedWontFixIssues(wontFixMap);

      // Cross-consistency dismissals are project-level (span Protocol + Report), so
      // they're stored on `report` directly rather than under an individual section.
      if (Array.isArray(p.data?.report?.wontFixCrossConsistencyIssues)) {
        setWontFixCrossConsistencyIds(p.data.report.wontFixCrossConsistencyIssues);
      }

      // The cross-consistency check hits the AI and its wording isn't fully
      // deterministic between calls, which can make a "Won't fix" dismissal (keyed
      // on the finding's text) lapse if it re-runs on every page load. So: use the
      // cached result from the last run if one exists, and only invoke the AI check
      // automatically the very first time (never run before for this project).
      const hasCachedCrossConsistency = Array.isArray(p.data?.report?.crossConsistencyIssues);
      if (hasCachedCrossConsistency) {
        setCrossConsistencyIssues(p.data.report.crossConsistencyIssues);
      }

      // Restore persisted AI issues — same persistence pattern as completenessElements,
      // so a reload shows last-known issues immediately instead of 0 until re-analysis completes.
      const issuesMap: Record<string, any[]> = {};
      if (savedSections && typeof savedSections === 'object' && !Array.isArray(savedSections)) {
        Object.entries(savedSections as Record<string, any>).forEach(([id, data]) => {
          if (Array.isArray((data as any)?.issues)) issuesMap[id] = (data as any).issues;
        });
      }
      if (Array.isArray(savedSections)) {
        savedSections.forEach((sec: any) => {
          if (sec.id && Array.isArray(sec.issues)) issuesMap[sec.id] = sec.issues;
        });
      }
      if (Object.keys(issuesMap).length > 0) setSectionAiIssues(issuesMap);

      // Determine the ordered section list to render
      const templateList = apiDefs.length > 0 ? apiDefs : initialReportSections.map(s => ({ id: s.id, title: s.title, number: s.order }));
      const templateIds = new Set(templateList.map(t => t.id));

      const roles = { contentOwner: [owner], reviewer: [reviewer], requiredApprover: [approver] };

      const buildSection = (def: { id: string; title: string; number: number }): ReportSection => {
        const scaffold = initialReportSections.find(s => s.id === def.id);
        const saved = savedSections && !Array.isArray(savedSections)
          ? (savedSections as Record<string, any>)[def.id]
          : null;
        // Use scaffold only when it corresponds to this section (title match guards against repurposed IDs)
        if (scaffold && scaffold.title === def.title) {
          // Scaffold's own state/approvals/completenessElements are demo placeholder
          // values, never real per-project data — a fresh section always starts as
          // draft with no approvals and no completeness evidence, until `saved`
          // (real persisted data) overrides them.
          return {
            ...scaffold,
            state: 'draft',
            completenessElements: [],
            ...(saved ?? {}),
            title: def.title,
            order: def.number,
            roles,
          };
        }
        // Dynamic section with no scaffold — build minimal object
        return {
          id: def.id,
          title: def.title,
          helperText: '',
          content: saved?.content || '',
          order: def.number,
          state: (saved?.state as any) || 'draft',
          roles,
          comments: [],
          validationFindings: [],
          aiDraftGenerated: false,
          userEdited: false,
          insertedAssets: [],
          completenessElements: [],
          linkedSAPSections: [],
          linkedProtocolSections: [],
          guidance: {
            requiredElements: { reference: '', items: [], mustAlignWith: '' },
            commonPitfalls: [],
            referencedDocuments: [],
          },
        } as any;
      };

      const finalSections: ReportSection[] =
        Array.isArray(savedSections) && savedSections.length > 0
          ? savedSections
              // Full section array already in DB — filter to templateList IDs to drop stale/repurposed sections
              .filter((section: ReportSection) => templateIds.has(section.id))
              .map((section: ReportSection) => {
                const scaffold = initialReportSections.find((s: any) => s.id === section.id);
                return {
                  ...(scaffold ?? {}),
                  ...section,
                  roles,
                  comments: section.comments ?? [],
                  insertedAssets: section.insertedAssets ?? [],
                  validationFindings: section.validationFindings ?? [],
                  completenessElements: section.completenessElements?.length ? section.completenessElements : (scaffold?.completenessElements ?? []),
                  guidance: section.guidance ?? getGuidanceForSection(section.id),
                };
              })
          : templateList.map(buildSection);

      setSections(finalSections);
      setCurrentSection(prev => prev || finalSections[0]?.id || '');
      setSectionsLoading(false);

      if (!hasCachedCrossConsistency) runCrossConsistencyCheck();
    }).catch(() => {
      setSectionsLoading(false);
    });
  }, [projectId]);

  // Re-run AI analysis on all sections when the Shell Refresh button is clicked —
  // also re-runs the cross-consistency check, since that's the explicit user action
  // meant to regenerate AI findings (as opposed to every incidental page load).
  useEffect(() => {
    const handler = () => {
      setAnalysisVersion(v => v + 1);
      runCrossConsistencyCheck();
    };
    window.addEventListener('report:refresh-analysis', handler);
    return () => window.removeEventListener('report:refresh-analysis', handler);
  }, []);

  // Persist section state fields to the backend so they survive page reload.
  // Merges `partialData` into the existing section object for the given sectionId.
  const saveReportSectionState = async (sectionId: string, partialData: Record<string, any>) => {
    if (!projectId) return;
    try {
      await fetch(`${apiBase}/api/projects/${projectId}/report/sections`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: { [sectionId]: partialData } }),
      }).then(async (response) => {
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(errorBody?.message || `Report section save failed (${response.status})`);
        }
      });
    } catch (error) {
      console.error('Report section state save failed', error);
    }
  };

  // Persist won't-fix suppressions to the backend so they survive page reload.
  // Also updates the shared state (not just each panel's own local copy) since
  // the save is a full overwrite, not an append — otherwise the Report content
  // view and the Quality System panel could clobber each other's suppressions.
  const handleWontFixSave = async (sectionId: string, descriptions: string[]) => {
    setSavedWontFixIssues(prev => ({ ...prev, [sectionId]: descriptions }));
    await saveReportSectionState(sectionId, { wontFixIssues: descriptions });
  };

  // Cross-consistency findings aren't tied to one report section, so their
  // dismissals are saved directly on `report` (a sibling of `report.sections`)
  // instead of going through saveReportSectionState.
  const handleCrossConsistencyWontFixSave = async (ids: string[]) => {
    setWontFixCrossConsistencyIds(ids);
    if (!projectId) return;
    try {
      await fetch(apiBase + '/api/projects/' + projectId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { report: { wontFixCrossConsistencyIssues: ids } } }),
      });
    } catch {
      // silently fail — state already applied in memory
    }
  };

  // Mock protocol deviations
  const [deviations, setDeviations] = useState<ProtocolDeviation[]>([
    {
      id: 'dev-1',
      deviationType: 'major',
      protocolSection: 'Section 6.2 - Follow-up Schedule',
      protocolRequirement: '6-month follow-up visit required for all subjects',
      actualImplementation: '4-month follow-up conducted due to site availability constraints',
      rationale: 'Primary endpoint data collection completed at 3 months. Extended follow-up period reduced to 4 months to accommodate site scheduling constraints while maintaining data integrity.',
      impactAssessment: 'No impact on primary endpoint analysis. Secondary safety endpoints unaffected as critical safety data collected within first 90 days per protocol. Statistical power maintained at 95% confidence level.',
      reportedBy: mockUsers[0],
      reportedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending-review',
    },
    {
      id: 'dev-2',
      deviationType: 'minor',
      protocolSection: 'Section 7.4 - Blood Sample Volume',
      protocolRequirement: '10ml blood sample per visit',
      actualImplementation: '8ml blood sample collected in 3 cases',
      rationale: 'Subjects with difficult venous access. Reduced volume deemed sufficient for all planned assays per laboratory protocol.',
      impactAssessment: 'Minimal impact. All required biomarker assays successfully performed. No effect on study conclusions or statistical analysis.',
      reportedBy: mockUsers[1],
      reportedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      reviewedBy: mockUsers[2],
      reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'approved',
    },
  ]);

  // Match on the real logged-in user's email so ownership checks (e.g. "My issues")
  // reflect who is actually signed in, not just whoever the project happens to
  // list as Medical Writer. Falls back to the role-lookup stub only pre-SSO.
  const currentUser: User = useMemo(() => {
    if (sessionUser) {
      return {
        id: sessionUser.email || sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email || '',
      };
    }
    return userFromRole(rawRoles, 'Medical Writer');
  }, [sessionUser, rawRoles]);

  const [generatingSectionId, setGeneratingSectionId] = useState<string | null>(null);
  // Guards against duplicate concurrent generation requests for the same section
  // (e.g. React StrictMode's double-invoked effect in dev).
  const aiDraftRequestedRef = useRef<Set<string>>(new Set());

  // Auto-generate an AI draft (real backend AI call) when a section is opened
  // for the first time and has no content yet.
  useEffect(() => {
    const section = sections.find(s => s.id === currentSection);
    if (!section || section.aiDraftGenerated || section.content || section.userEdited) return;
    if (aiDraftRequestedRef.current.has(section.id)) return;
    aiDraftRequestedRef.current.add(section.id);

    setGeneratingSectionId(section.id);
    fetch(apiBase + '/api/projects/' + projectId + '/generate-report-section', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectionId: section.id, sectionTitle: section.title, sectionNumber: section.order }),
    })
      .then(async r => {
        const body = await r.json().catch(() => null);
        if (!r.ok) throw new Error(body?.message || `AI draft generation failed (HTTP ${r.status})`);
        return body as { sectionId: string; content: string };
      })
      .then(result => {
        if (!result?.content) return;
        setSections(prev => prev.map(s =>
          s.id === section.id ? { ...s, aiDraft: result.content, aiDraftGenerated: true } : s
        ));
      })
      .catch(err => {
        console.error('AI draft generation failed', err);
        setSections(prev => prev.map(s => s.id === section.id ? { ...s, aiDraftGenerated: true } : s));
      })
      .finally(() => {
        setGeneratingSectionId(current => (current === section.id ? null : current));
      });
  }, [currentSection, sections, projectId]);

  const handleSectionUpdate = (sectionId: string, content: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    // Update content
    const updatedSection = { ...section, content, userEdited: true, aiDraft: undefined };

    // Run validation
    const validationFindings = validateReportContent(
      updatedSection,
      mockProtocolSections,
      dataAssets,
      uploadedFiles,
      sections
    );

    setSections(sections.map(s => 
      s.id === sectionId 
        ? { ...s, content, userEdited: true, aiDraft: undefined, validationFindings }
        : s
    ));
    
    saveReportSectionState(sectionId, { content, userEdited: true });
  };

  // Persists real AI-derived completeness evidence — mirrors Protocol's
  // analyzeSectionWithAI, which merges requiredElements into persisted state
  // instead of leaving completenessElements stale/empty/fabricated.
  const handleSectionCompletenessChange = (sectionId: string, elements: CompletenessElement[]) => {
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, completenessElements: elements } : s));
    saveReportSectionState(sectionId, { completenessElements: elements });
  };

  // Persists AI issues — mirrors Protocol's pattern of saving issues alongside the
  // section data so they survive a reload instead of reading back as empty until
  // the next analysis run completes.
  const handleSectionAiIssuesChange = (sectionId: string, issues: any[]) => {
    setSectionAiIssues(prev => ({ ...prev, [sectionId]: issues }));
    saveReportSectionState(sectionId, { issues });
  };

  const handleAcceptAIDraft = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (section?.aiDraft) {
      const acceptedContent = section.aiDraft;
      setSections(sections.map(s =>
        s.id === sectionId
          ? { ...s, content: s.aiDraft || '', aiDraft: undefined, userEdited: true }
          : s
      ));
      saveReportSectionState(sectionId, { content: acceptedContent, userEdited: true });
    }
  };

  const handleDismissAIDraft = (sectionId: string) => {
    setSections(sections.map(s =>
      s.id === sectionId ? { ...s, aiDraft: undefined } : s
    ));
    // The AI draft was already persisted as `content` server-side when generated
    // (generate-report-section writes it immediately) — clear it so a dismissed
    // draft doesn't silently reappear as real content on the next page load.
    saveReportSectionState(sectionId, { content: '' });
  };

  const handleAssetToggle = (assetId: string) => {
    setDataAssets(dataAssets.map(asset => 
      asset.id === assetId ? { ...asset, selected: !asset.selected } : asset
    ));
    
    const asset = dataAssets.find(a => a.id === assetId);
    if (asset) {
    }
  };

  const handleAddComment = (sectionId: string, text: string, commentType?: 'general' | 'issue' | 'approval-request', regarding?: string) => {
    const newComment: SectionComment = {
      id: `comment-${Date.now()}`,
      sectionId,
      author: currentUser,
      text,
      timestamp: new Date().toISOString(),
      resolved: false,
      commentType: commentType || 'general',
      regarding,
    };
    
    setSections(sections.map(s => 
      s.id === sectionId ? { ...s, comments: [...s.comments, newComment] } : s
    ));
    
  };

  const handleInsertAsset = (sectionId: string, assetId: string) => {
    const section = sections.find(s => s.id === sectionId);
    const asset = dataAssets.find(a => a.id === assetId);
    
    if (!section || !asset) return;

    // Generate AI narrative suggestion
    const aiNarrative = generateAssetNarrative(asset, section);

    // Create inserted asset
    const insertedAsset: InsertedAsset = {
      id: `inserted-${Date.now()}`,
      assetId,
      insertedAt: new Date().toISOString(),
      insertedBy: currentUser,
      order: section.insertedAssets.length,
      narrativeText: '',
      aiNarrativeSuggestion: aiNarrative,
      narrativeAccepted: false,
    };

    // Add to section
    setSections(sections.map(s =>
      s.id === sectionId
        ? { ...s, insertedAssets: [...s.insertedAssets, insertedAsset] }
        : s
    ));


    // Run validation after insertion
    const updatedSection = { 
      ...section, 
      insertedAssets: [...section.insertedAssets, insertedAsset] 
    };
    const validationFindings = validateReportContent(
      updatedSection,
      mockProtocolSections,
      dataAssets,
      uploadedFiles,
      sections
    );

    setSections(sections.map(s =>
      s.id === sectionId
        ? { ...s, validationFindings }
        : s
    ));
  };

  const handleRemoveAsset = (sectionId: string, insertedAssetId: string) => {
    const section = sections.find(s => s.id === sectionId);
    const insertedAsset = section?.insertedAssets.find(a => a.id === insertedAssetId);
    const asset = dataAssets.find(a => a.id === insertedAsset?.assetId);
    
    if (!section || !insertedAsset || !asset) return;

    // Remove from section
    setSections(sections.map(s =>
      s.id === sectionId
        ? { ...s, insertedAssets: s.insertedAssets.filter(a => a.id !== insertedAssetId) }
        : s
    ));


    // Run validation after removal
    const updatedSection = {
      ...section,
      insertedAssets: section.insertedAssets.filter(a => a.id !== insertedAssetId)
    };
    const validationFindings = validateReportContent(
      updatedSection,
      mockProtocolSections,
      dataAssets,
      uploadedFiles,
      sections
    );

    setSections(sections.map(s =>
      s.id === sectionId
        ? { ...s, validationFindings }
        : s
    ));
  };

  const handleAcceptNarrative = (sectionId: string, insertedAssetId: string) => {
    setSections(sections.map(s =>
      s.id === sectionId
        ? {
            ...s,
            insertedAssets: s.insertedAssets.map(a =>
              a.id === insertedAssetId
                ? { ...a, narrativeText: a.aiNarrativeSuggestion || '', narrativeAccepted: true, aiNarrativeSuggestion: undefined }
                : a
            )
          }
        : s
    ));

  };

  const handleEditNarrative = (sectionId: string, insertedAssetId: string, text: string) => {
    setSections(sections.map(s =>
      s.id === sectionId
        ? {
            ...s,
            insertedAssets: s.insertedAssets.map(a =>
              a.id === insertedAssetId
                ? { ...a, narrativeText: text, narrativeAccepted: true, aiNarrativeSuggestion: undefined }
                : a
            )
          }
        : s
    ));

  };

  const getSectionStatus = (section: ReportSection): 'complete' | 'in-progress' | 'empty' => {
    // A section is complete only if it has been approved
    if (section.state === 'approved' || section.state === 'locked') {
      return 'complete';
    }
    
    // Check if section has content
    const hasContent = section.content && section.content.trim().length > 0;
    const hasInsertedAssets = section.insertedAssets && section.insertedAssets.length > 0;
    
    // Section is in-progress if it has some content or assets but not approved
    if (hasContent || hasInsertedAssets) {
      return 'in-progress';
    }
    
    return 'empty';
  };

  // Calculate overall status
  const completeSections = sections.filter(s => getSectionStatus(s) === 'complete').length;
  const totalSections = sections.length;
  const allSectionsComplete = completeSections === totalSections;

  // Check for unresolved blockers
  const hasUnresolvedBlockers = sections.some(section =>
    section.validationFindings?.some(f => f.type === 'blocker' && !f.resolved)
  );

  // Check for pending deviations
  const hasPendingDeviations = deviations.some(d => d.status === 'pending-review');

  // Check for unapproved sections
  const hasUnapprovedSections = sections.some(section =>
    section.state !== 'approved' && section.state !== 'locked'
  );

  // Assembly blockers list
  const assemblyBlockers: string[] = [];
  if (!allSectionsComplete) assemblyBlockers.push(`${completeSections}/${totalSections} sections complete`);
  if (hasUnresolvedBlockers) assemblyBlockers.push('Regulatory blockers');
  if (hasPendingDeviations) assemblyBlockers.push('Pending deviation reviews');
  if (hasUnapprovedSections) assemblyBlockers.push('Sections pending approval');

  // "Assemble Final Report" is disabled unless:
  // - Protocol is Approved & Locked (already true in this workspace)
  // - All report sections are Complete
  // - All sections are Approved
  // - No blockers remain
  // - All deviations are reviewed and approved
  const canAssembleReport = allSectionsComplete && !hasUnresolvedBlockers && !hasPendingDeviations && !hasUnapprovedSections;
  const hasIssues = !allSectionsComplete || hasUnresolvedBlockers || hasPendingDeviations;

  const handleApproveSection = (sectionId: string, comment?: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    setSections(sections.map(s =>
      s.id === sectionId
        ? { ...s, state: 'approved' as const }
        : s
    ));

    // Persist so approval survives page reload
    saveReportSectionState(sectionId, { state: 'approved', content: section.content || section.aiDraft || '' });

  };

  const handleReviewDeviation = (deviationId: string, status: 'approved' | 'requires-amendment', comment: string) => {
    setDeviations(deviations.map(d =>
      d.id === deviationId
        ? { ...d, status, reviewedBy: currentUser, reviewedAt: new Date().toISOString() }
        : d
    ));

  };

  const handleMarkSectionReady = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    // Change status from draft to under-review
    setSections(sections.map(s =>
      s.id === sectionId
        ? { ...s, state: 'under-review' as const }
        : s
    ));

    // Persist so ready-state survives page reload
    saveReportSectionState(sectionId, { state: 'under-review' });

  };

  const handleMoveSectionToDraft = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    // Change status from under-review back to draft
    setSections(sections.map(s =>
      s.id === sectionId
        ? { ...s, state: 'draft' as const }
        : s
    ));

    // Persist so draft-state survives page reload
    saveReportSectionState(sectionId, { state: 'draft' });

  };

  const handleEditSection = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    // Only Content Owners can edit
    if (!section.roles.contentOwner.some(u => u.id === currentUser.id)) {
      return;
    }

    // Change status to draft (unlocks the section for editing)
    setSections(sections.map(s =>
      s.id === sectionId
        ? { ...s, state: 'draft' as const }
        : s
    ));

    // Persist so unlocked-state survives page reload
    saveReportSectionState(sectionId, { state: 'draft' });

  };

  const handleCreateAmendment = (amendment: Omit<ProtocolAmendment, 'id' | 'createdAt' | 'createdBy'>) => {
    const newAmendment: ProtocolAmendment = {
      ...amendment,
      id: `amendment-${Date.now()}`,
      createdAt: new Date().toISOString(),
      createdBy: currentUser,
    };

    setAmendments([...amendments, newAmendment]);

  };

  const handleVerifyCompletenessElement = (elementId: string) => {
    setCompletenessStatus({
      ...completenessStatus,
      elements: completenessStatus.elements.map(el =>
        el.id === elementId
          ? {
              ...el,
              status: 'verified' as const,
              verifiedBy: currentUser,
              verificationDate: new Date().toISOString(),
            }
          : el
      ),
    });

    const element = completenessStatus.elements.find(el => el.id === elementId);
    if (element) {
    }
  };

  const getGuidanceForSection = (sectionId: string) => {
    const isEU = targetMarkets.includes('EU');
    const isUS = targetMarkets.includes('US');
    const isSaMD = ['samd', 'SaMD', 'ai-ml', 'simd'].includes(projectData?.deviceCategory || scope?.deviceCategory || '');

    const isUK = targetMarkets.includes('UK');
    const isJapan = targetMarkets.includes('Japan');
    const isChina = targetMarkets.includes('China');
    const isCanada = targetMarkets.includes('Canada');
    const isAustralia = targetMarkets.includes('Australia');

    const marketRefs: string[] = [];
    if (isEU) marketRefs.push('EU MDR 2017/745');
    if (isUS) marketRefs.push('FDA 21 CFR Part 812');
    if (isUK) marketRefs.push('UK MDR 2002 (MHRA)');
    if (isJapan) marketRefs.push('PMDA MHLW');
    if (isChina) marketRefs.push('NMPA');
    if (isCanada) marketRefs.push('Health Canada MDR');
    if (isAustralia) marketRefs.push('TGA');
    const marketNote = marketRefs.length > 0 ? marketRefs.join(' + ') : 'Applicable regulations';

    const samdNote = isSaMD ? ' IMDRF SaMD N41 and IEC 62304 apply.' : '';

    const scaffold = initialReportSections.find(s => s.id === sectionId);
    if (scaffold?.guidance) return scaffold.guidance;

    if (sectionId === 'section-eu-compliance') {
      return {
        requiredElements: {
          reference: 'EU MDR 2017/745 Annex XV',
          items: ['Compliance with EU MDR Annex XV', 'Notified Body details', 'EUDAMED registration', 'Ethics committee approvals', 'Data protection per GDPR', ...(isUK ? ['UK CA notification per UK MDR 2002', 'UKCA marking requirements'] : [])],
          mustAlignWith: 'EU MDR 2017/745 Article 61 and Annex XV',
        },
        commonPitfalls: ['Missing Notified Body identification', 'No GDPR Article 32 reference', 'Missing CIV notification reference'],
        referencedDocuments: [{ name: 'EU MDR 2017/745', version: 'Current', date: '' }],
      };
    }
    if (sectionId === 'section-us-ide') {
      return {
        requiredElements: {
          reference: 'FDA 21 CFR Part 812',
          items: ['IDE classification (NSR/SR)', 'IRB approvals at all US sites', '21 CFR Part 812 compliance statement', 'De Novo pathway description', 'FDA reporting compliance', ...(isCanada ? ['Health Canada device licence application'] : []), ...(isAustralia ? ['TGA conformity assessment'] : []), ...(isJapan ? ['PMDA shonin application requirements'] : []), ...(isChina ? ['NMPA registration requirements'] : [])],
          mustAlignWith: 'FDA 21 CFR Part 812 and De Novo guidance',
        },
        commonPitfalls: ['Missing NSR/SR determination', 'No IRB approval reference', 'Missing 21 CFR Part 812.150 reporting'],
        referencedDocuments: [{ name: '21 CFR Part 812', version: 'Current', date: '' }],
      };
    }
    return scaffold?.guidance ?? { requiredElements: { reference: marketNote + samdNote, items: [], mustAlignWith: '' }, commonPitfalls: [], referencedDocuments: [] };
  };

  if (sectionsLoading) {
    return (
      <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
        <MilestoneBanner projectId={projectId!} currentStepId="report-make" />
        <div className="flex-1 flex items-center justify-center gap-3 text-slate-500">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-sm">Loading report…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      <MilestoneBanner projectId={projectId!} currentStepId="report-make" />
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Report Sections */}
        <ReportNavigation
          sections={sections}
          currentSection={currentSection}
          onSectionChange={setCurrentSection}
          getSectionStatus={getSectionStatus}
          apiSectionDefs={apiSectionDefs}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {isReportBlocked && (
            <div className="mx-8 mt-6 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
              <div className="w-5 h-5 text-rose-700 flex-shrink-0 mt-0.5">⚠</div>
              <div>
                <p className="font-medium text-rose-800">Report authoring is blocked</p>
                <p className="text-sm text-rose-700 mt-1">
                  {pendingProtocolAmendments.length} protocol amendment{pendingProtocolAmendments.length > 1 ? 's are' : ' is'} pending approval or rejection before report authoring can continue.
                </p>
                <p className="text-sm text-rose-700 mt-1 font-medium">
                  Go to Make Protocol to approve or reject: {pendingProtocolAmendments.map((a: any) => `Amendment ${a.number}: ${a.title}`).join(', ')}
                </p>
              </div>
            </div>
          )}


          {protocolFinalized && (
            <div className="mx-6 mt-4">
              <ProtocolFinalizedBanner
                projectId={projectId!}
                latestAmendment={statusLatestAmendment}
              />
            </div>
          )}

          {/* Workflow Progress Indicator */}
          <WorkflowProgressIndicator currentStep="report-authoring" />

          <div className="flex-1 flex overflow-hidden">
          <ReportContent
            sections={sections}
            currentSection={currentSection}
            onSectionUpdate={handleSectionUpdate}
            dataAssets={dataAssets}
            onAssetToggle={handleAssetToggle}
            currentUser={currentUser}
            projectData={projectData}
            onAddComment={handleAddComment}
            onAcceptAIDraft={handleAcceptAIDraft}
            onDismissAIDraft={handleDismissAIDraft}
            generatingSectionId={generatingSectionId}
            onInsertAsset={handleInsertAsset}
            onRemoveAsset={handleRemoveAsset}
            onAcceptNarrative={handleAcceptNarrative}
            onEditNarrative={handleEditNarrative}
            onResolveComment={(sectionId, commentId) => {
              setSections(sections.map(s =>
                s.id === sectionId
                  ? {
                      ...s,
                      comments: s.comments.map(c =>
                        c.id === commentId ? { ...c, resolved: true } : c
                      )
                    }
                  : s
              ));
              
            }}
            onApproveSection={handleApproveSection}
            onMarkSectionReady={handleMarkSectionReady}
            onMoveSectionToDraft={handleMoveSectionToDraft}
            onEditSection={handleEditSection}
            canAssembleReport={canAssembleReport}
            assemblyBlockers={assemblyBlockers}
            completenessStatus={completenessStatus}
            onVerifyCompletenessElement={handleVerifyCompletenessElement}
            sectionAiIssues={sectionAiIssues}
            onSectionAiIssuesChange={handleSectionAiIssuesChange}
            onSectionCompletenessChange={handleSectionCompletenessChange}
            forceAnalyzeVersion={analysisVersion}
            savedWontFixIssues={savedWontFixIssues}
            onWontFixSave={handleWontFixSave}
            isReportBlocked={isReportBlocked}
            onInitiateAmendment={() => setShowAmendmentModal(true)}
            scrollTrigger={scrollTrigger}
          />

          {/* Right: Stacked Panels - Quality System + Data Assets */}
          <RightSidebar
            currentSection={currentSection}
            sections={sections}
            onNavigateToSection={navigateToSection}
            currentUser={currentUser}
            onVerifyElement={handleVerifyCompletenessElement}
            dataAssets={dataAssets}
            uploadedFiles={uploadedFiles}
            sectionAiIssues={sectionAiIssues}
            crossConsistencyIssues={crossConsistencyIssues}
            savedWontFixIssues={savedWontFixIssues}
            wontFixCrossConsistencyIds={wontFixCrossConsistencyIds}
            onSectionAiIssuesChange={handleSectionAiIssuesChange}
            onWontFixSave={handleWontFixSave}
            onCrossConsistencyWontFixSave={handleCrossConsistencyWontFixSave}
          />
          </div>
        </div>
      </div>

      <AmendmentModal
        open={showAmendmentModal}
        onClose={() => setShowAmendmentModal(false)}
        onSubmit={async (data) => {
          const base = '';
          await fetch(base + '/api/projects/' + projectId + '/amendments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, createdBy: 'Report Author' }),
          });
          setShowAmendmentModal(false);
          // Refresh amendments
          fetch(base + '/api/projects/' + projectId + '/amendments')
            .then(r => r.json())
            .then(d => setProtocolAmendments(Array.isArray(d) ? d : []))
            .catch(() => {});
        }}
        protocolSections={protocolSectionsForAmendment}
        createdBy="Report Author"
      />


    </div>
  );
}
