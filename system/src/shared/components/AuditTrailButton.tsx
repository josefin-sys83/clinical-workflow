import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { AuditTrailModal } from '@/shared/components/AuditTrailModal';
import { useNavigate, useParams } from 'react-router-dom';

export function AuditTrailButton() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { projectId } = useParams();
  return (
    <>
      <Button variant="outline" onClick={() => projectId ? setOpen(true) : navigate('/audit')}>
        Audit trail
      </Button>
      {projectId && <AuditTrailModal open={open} onOpenChange={setOpen} />}
    </>
  );
}
