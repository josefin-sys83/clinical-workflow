import PdfProtocolApp from '@/modules/Pdfprotokoll/App';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { transitionWorkflow } from '@/shared/services/workflowService';
import { createProjectAuditEvent } from '@/shared/services/auditService';
import {
  finalizeDocument,
  verifyDocumentArtifact,
  signArtifact,
  verifySignatureChain,
  listAddendums,
  createAddendum,
  type AddendumRecord,
  type FinalizeResponse,
  type VerifyResponse,
  type SignatureRecord,
  type VerifyChainResponse,
} from '@/shared/api/documents';
import { Button } from '@/app/components/ui/button';

export default function PdfProtocol() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [addendums, setAddendums] = useState<AddendumRecord[]>([]);
  const [showCreateAddendum, setShowCreateAddendum] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newReason, setNewReason] = useState('');
  const [finalized, setFinalized] = useState<FinalizeResponse | null>(null);
  const [verification, setVerification] = useState<VerifyResponse | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState<SignatureRecord | null>(null);

  const [verifyingChain, setVerifyingChain] = useState(false);
  const [chain, setChain] = useState<VerifyChainResponse | null>(null);

  useEffect(() => {
    (async () => {
      if (!projectId) return;
      try {
        await transitionWorkflow({ projectId, stepId: 'protocol-pdf', to: 'finalized', note: 'Viewed Protocol PDF' });
      } catch {
        // Keep UI usable even if transition is not allowed.
      }

      await createProjectAuditEvent({ projectId, domain: 'protocol', stepId: 'protocol-pdf', type: 'viewed', summary: 'Viewed Protocol PDF' });
    })();
  }, [projectId]);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-4 py-3 flex items-center gap-3">
        <div className="text-sm font-semibold">Protocol export</div>
        <div className="flex-1" />
        <Button
          variant="outline"
          disabled={!projectId || finalizing}
          onClick={async () => {
            if (!projectId) return;
            setFinalizing(true);
            try {
              const res = await finalizeDocument({ projectId, docType: 'protocol', note: 'Finalize Protocol export' });
              setFinalized(res);
              setVerification(null);
              setSigned(null);
              setChain(null);
              try {
                const ads = await listAddendums({ projectId, docType: 'protocol', releaseArtifactId: res.artifactId });
                setAddendums(ads);
              } catch {
                setAddendums([]);
              }
            } finally {
              setFinalizing(false);
            }
          }}
        >
          {finalizing ? 'Finalizing…' : 'Finalize export'}
        </Button>

        <Button
          variant="outline"
          disabled={!projectId || !finalized?.artifactId || verifying}
          onClick={async () => {
            if (!projectId || !finalized?.artifactId) return;
            setVerifying(true);
            try {
              const v = await verifyDocumentArtifact({ projectId, artifactId: finalized.artifactId });
              setVerification(v);
            } finally {
              setVerifying(false);
            }
          }}
        >
          {verifying ? 'Verifying…' : 'Verify hash'}
        </Button>

        <Button
          variant="outline"
          disabled={!projectId || !finalized?.artifactId || signing}
          onClick={async () => {
            if (!projectId || !finalized?.artifactId) return;
            setSigning(true);
            try {
              const s = await signArtifact({ projectId, artifactId: finalized.artifactId });
              setSigned(s);
              setChain(null);
              try {
                const ads = await listAddendums({ projectId, docType: 'protocol', releaseArtifactId: res.artifactId });
                setAddendums(ads);
              } catch {
                setAddendums([]);
              }
            } finally {
              setSigning(false);
            }
          }}
        >
          {signing ? 'Signing…' : 'Sign artifact'}
        </Button>

        <Button
          variant="outline"
          disabled={!projectId || !finalized?.artifactId || verifyingChain}
          onClick={async () => {
            if (!projectId || !finalized?.artifactId) return;
            setVerifyingChain(true);
            try {
              const c = await verifySignatureChain({ projectId, artifactId: finalized.artifactId });
              setChain(c);
            } finally {
              setVerifyingChain(false);
            }
          }}
        >
          {verifyingChain ? 'Checking…' : 'Verify chain'}
        </Button>
      </div>

      {finalized ? (
        <div className="px-4 py-3 text-sm">
          <div className="font-medium">Immutable artifact created</div>
          <div className="text-muted-foreground">SHA-256: {finalized.sha256}</div>
          {finalized.finalizedBy?.userId ? (
            <div className="text-muted-foreground">
              Finalized by: {finalized.finalizedBy.userId}
              {finalized.finalizedBy.roles?.length ? ` (${finalized.finalizedBy.roles.join(', ')})` : ''}
            </div>
          ) : null}
          <a className="text-blue-600 hover:underline" href={finalized.downloadUrl}>
            Download artifact
          </a>

          {verification ? (
            <div className="mt-2">
              <div className={verification.match ? 'text-green-600' : 'text-red-600'}>
                Hash verification: {verification.match ? 'MATCH' : 'MISMATCH'}
              </div>
              {!verification.match ? (
                <div className="text-muted-foreground">
                  Stored: {verification.sha256Stored}
                  <br />
                  Computed: {verification.sha256Computed}
                </div>
              ) : null}
            </div>
          ) : null}

          {signed ? (
            <div className="mt-2">
              <div className="text-green-600">Signed: {signed.signatureId}</div>
              <div className="text-muted-foreground">
                By: {signed.signedBy.userId}
                {signed.signedBy.roles?.length ? ` (${signed.signedBy.roles.join(', ')})` : ''}
                <br />
                Key: {signed.keyId.slice(0, 12)}… ({signed.algorithm})
              </div>
            </div>
          ) : null}

          {chain ? (
            <div className="mt-2">
              <div className={chain.artifact.match ? 'text-green-600' : 'text-red-600'}>
                Chain artifact hash: {chain.artifact.match ? 'MATCH' : 'MISMATCH'}
              </div>
              <div className="mt-1">
                <div className="font-medium">Signatures</div>
                {chain.signatures.length ? (
                  <ul className="list-disc ml-5 text-muted-foreground">
                    {chain.signatures.map((s) => (
                      <li key={s.signatureId}>
                        {s.match ? '✅' : '❌'} {s.signedBy.userId} ({(s.signedBy.roles || []).join(', ') || 'no roles'}) · {s.keyId.slice(0, 12)}…
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-muted-foreground">No signatures found.</div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <PdfProtocolApp />
    </div>
  );
}
