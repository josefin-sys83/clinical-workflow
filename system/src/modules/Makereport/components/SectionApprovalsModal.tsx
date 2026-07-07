import { useState } from 'react';

interface SectionApprovalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionNumber: string;
  sectionTitle: string;
  requiredApproverName?: string;
  reviewerName?: string;
  onApprove: (comment: string) => Promise<void> | void;
}

export function SectionApprovalsModal({
  isOpen,
  onClose,
  sectionNumber,
  sectionTitle,
  requiredApproverName,
  reviewerName,
  onApprove,
}: SectionApprovalsModalProps) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  return (
    <div style={{position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999}}>
      <div style={{backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', width: '100%', maxWidth: '28rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem'}}>
          <div style={{width: '1.25rem', height: '1.25rem', borderRadius: '50%', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 style={{margin: 0, fontSize: '1rem', fontWeight: 600, color: '#0f172a'}}>Approve Section</h2>
        </div>
        <p style={{margin: '0 0 0.5rem', fontSize: '0.75rem', color: '#64748b'}}>
          Section {sectionNumber}: <strong>{sectionTitle}</strong>
        </p>
        {(requiredApproverName || reviewerName) && (
          <p style={{margin: '0 0 0.5rem', fontSize: '0.75rem', color: '#64748b'}}>
            {requiredApproverName && <>Required Approver: <strong>{requiredApproverName}</strong></>}
            {requiredApproverName && reviewerName && ' · '}
            {reviewerName && <>Reviewer: <strong>{reviewerName}</strong></>}
          </p>
        )}
        <p style={{margin: '0 0 1rem', fontSize: '0.75rem', color: '#64748b'}}>
          Approving marks this section as reviewed and compliant. Add an optional comment.
        </p>
        <textarea
          autoFocus
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Optional approval comment (e.g. Reviewed against ISO 14155:2020 §6.3, content verified)"
          style={{width: '100%', minHeight: '80px', fontSize: '0.875rem', lineHeight: '1.6', padding: '0.625rem', border: '1.5px solid #cbd5e1', borderRadius: '0.375rem', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box'}}
        />
        <div style={{display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end'}}>
          <button
            disabled={loading}
            onClick={() => { onClose(); setComment(''); }}
            style={{padding: '0.5rem 1rem', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem'}}
          >
            Cancel
          </button>
          <button
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try { await onApprove(comment.trim()); }
              finally { setLoading(false); setComment(''); onClose(); }
            }}
            style={{padding: '0.5rem 1rem', backgroundColor: loading ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 500}}
          >
            {loading ? 'Approving…' : 'Approve Section'}
          </button>
        </div>
      </div>
    </div>
  );
}
