import React, { useEffect } from 'react';
import { CircleCheck, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppToastProps {
  message: string | null;
  variant: 'error' | 'success';
  onClose: () => void;
  autoHideMs?: number;
}

/**
 * Transient message (replaces the MUI Snackbar). Rendered above dialog overlays
 * (z-[100]) so save/delete errors stay visible while a dialog is open.
 */
const AppToast: React.FC<AppToastProps> = ({
  message,
  variant,
  onClose,
  autoHideMs = 6000,
}) => {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onClose, autoHideMs);
    return () => window.clearTimeout(timer);
  }, [message, onClose, autoHideMs]);

  if (!message) return null;

  const Icon = variant === 'error' ? TriangleAlert : CircleCheck;

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto fixed bottom-4 left-1/2 z-[100] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-start gap-2.5 rounded-lg border border-solid bg-popover px-4 py-3 text-sm text-popover-foreground shadow-lg',
        variant === 'error' ? 'border-destructive/50' : 'border-event-union/50',
      )}
    >
      <Icon
        className={cn(
          'mt-0.5 size-4 shrink-0',
          variant === 'error' ? 'text-destructive' : 'text-event-union',
        )}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 break-words">{message}</span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <X className="size-4" />
      </button>
    </div>
  );
};

export default AppToast;
