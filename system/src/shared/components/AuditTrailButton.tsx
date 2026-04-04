import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { AuditTrailModal } from '@/shared/components/AuditTrailModal';

export function AuditTrailButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Audit trail
      </Button>
      <AuditTrailModal open={open} onOpenChange={setOpen} />
    </>
  );
}
