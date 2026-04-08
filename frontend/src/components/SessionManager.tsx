import React from 'react';
import { useSessionManager } from '../hooks/useSessionManager';
import SessionWarningDialog from './SessionWarningDialog';

interface SessionManagerProps {
  children: React.ReactNode;
}

const SessionManager: React.FC<SessionManagerProps> = ({ children }) => {
  const { timeRemaining, showWarning, extendSession, logout } = useSessionManager();

  return (
    <>
      {children}
      <SessionWarningDialog
        open={showWarning}
        onExtend={extendSession}
        onLogout={logout}
        timeRemaining={timeRemaining}
      />
    </>
  );
};

export default SessionManager;
