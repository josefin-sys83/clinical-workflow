import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { getMe } from '@/shared/api/me';
import {
  getAddendum,
  updateAddendum,
  startAddendumReview,
  approveAddendumReview,
  signAddendum,
  lockAddendum,
  uploadAddendumFile,
  listAddendumFiles,
  type AddendumRecord,
  type AddendumFile,
} from '@/shared/api/documents';

function StatusBadge({ status }: { status: AddendumRecord['status'] }) {
  const variant =
    status === 'locked' ? 'default' : status === 'signed' ? 'secondary' : status === 'approved' ? 'secondary' : 'outline';
  return <Badge variant={variant}>{status}</Badge>;
}

export default function AddendumPage() {
  const { projectId, docType, addendumId } = useParams();
  const navigate = useNavigate();
  const [me, setMe] = useState<{ roles: string[] } | null>(null);

  const [data, setData] = useState<AddendumRecord | null>(null);
  const [files, setFiles] = useState<AddendumFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const roles = me?.roles ?? [];
  const isAdmin = roles.includes('admin');
  const canAuthor = isAdmin || roles.includes('author');
  const canReview = isAdmin || roles.includes('reviewer');
  const canApprove = isAdmin || roles.includes('approver');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [changeReason, setChangeReason] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const m = await getMe();
        setMe({ roles: (m as any)?.roles ?? [] });
      } catch {
        setMe({ roles: [] });
      }
    })();
  }, []);

  async function refresh() {
    if (!projectId || !docType || !addendumId) return;
    const a = await getAddendum({ projectId, docType: docType as any, addendumId });
    setData(a);
    setTitle(a.title);
    setDescription(a.description ?? '');
    setChangeReason(a.changeReason);

    try {
      const f = await listAddendumFiles({ projectId, docType: docType as any, addendumId });
      setFiles(f);
    } catch {
      setFiles(a.files ?? []);
    }
  }

  useEffect(() => {
    (async () => {
      if (!projectId || !docType || !addendumId) return;
      setLoading(true);
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, docType, addendumId]);

  const canEditDraft = useMemo(() => canAuthor && data?.status === 'draft', [canAuthor, data?.status]);

  if (!projectId || !docType || !addendumId) {
    return <div className="p-6">Missing route params.</div>;
  }

  if (loading) {
    return <div className="p-6">Loading addendum…</div>;
  }

  if (!data) {
    return <div className="p-6">Addendum not found.</div>;
  }

  const downloadUrl = data.signedArtifactId
    ? `/api/projects/${projectId}/documents/artifacts/${data.signedArtifactId}`
    : null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
          <div className="text-sm font-semibold">
            {docType === 'protocol' ? 'Protocol' : 'Report'} Addendum {data.letter}
          </div>
          <StatusBadge status={data.status} />
          <div className="flex-1" />
          {downloadUrl && (
            <a href={downloadUrl}>
              <Button variant="outline">Download PDF</Button>
            </a>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">Title</div>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEditDraft} />
            </div>

            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">Change reason</div>
              <Input value={changeReason} onChange={(e) => setChangeReason(e.target.value)} disabled={!canEditDraft} />
            </div>

            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">Description</div>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEditDraft} />
            </div>

            {canEditDraft && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      const updated = await updateAddendum({
                        projectId,
                        docType: docType as any,
                        addendumId,
                        title,
                        description,
                        changeReason,
                      });
                      setData(updated);
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  {saving ? 'Saving…' : 'Save'}
                </Button>

                <Button
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      const res = await startAddendumReview({ projectId, docType: docType as any, addendumId });
                      setData(res);
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Start review
                </Button>
              </div>
            )}

            {data.status === 'in_review' && canReview && (
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    setSaving(true);
                    try {
                      const res = await approveAddendumReview({
                        projectId,
                        docType: docType as any,
                        addendumId,
                        approve: true,
                      });
                      setData(res);
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Approve (Reviewer)
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    setSaving(true);
                    try {
                      const res = await approveAddendumReview({
                        projectId,
                        docType: docType as any,
                        addendumId,
                        approve: false,
                      });
                      setData(res);
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Reject (Back to draft)
                </Button>
              </div>
            )}

            {data.status === 'approved' && canApprove && (
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    setSaving(true);
                    try {
                      const res = await signAddendum({ projectId, docType: docType as any, addendumId });
                      setData(res);
                      await refresh();
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Sign & generate PDF
                </Button>
              </div>
            )}

            {data.status === 'signed' && canApprove && (
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    setSaving(true);
                    try {
                      const res = await lockAddendum({ projectId, docType: docType as any, addendumId });
                      setData(res);
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Lock addendum
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {canEditDraft && (
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setSaving(true);
                    try {
                      const res = await uploadAddendumFile({ projectId, docType: docType as any, addendumId, file: f });
                      setFiles(res);
                    } finally {
                      setSaving(false);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
            )}

            {files.length === 0 ? (
              <div className="text-sm text-muted-foreground">No files uploaded.</div>
            ) : (
              <ul className="text-sm space-y-1">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3">
                    <span>{f.filename}</span>
                    <span className="text-xs text-muted-foreground">{new Date(f.uploadedAt).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="text-xs text-muted-foreground">
          Release artifact: <span className="font-mono">{data.releaseArtifactId}</span>
        </div>
      </div>
    </div>
  );
}
