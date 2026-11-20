import React from 'react';
import { Clock, TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SessionWarningDialogProps {
  open: boolean;
  onExtend: () => void;
  onLogout: () => void;
  timeRemaining: number; // in minutes
}

const SessionWarningDialog: React.FC<SessionWarningDialogProps> = ({
  open,
  onExtend,
  onLogout,
  timeRemaining,
}) => {
  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="size-5 text-destructive" aria-hidden="true" />
            Session Expiring Soon
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Clock className="size-4 shrink-0" aria-hidden="true" />
            Would you like to extend your session for another 30 minutes?
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertDescription>
            Your session will expire in {timeRemaining} minute{timeRemaining !== 1 ? 's' : ''}.
            If you don&apos;t respond, you will be logged out automatically.
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button variant="outline" onClick={onLogout}>
            Logout Now
          </Button>
          <Button onClick={onExtend}>Extend Session</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SessionWarningDialog;
