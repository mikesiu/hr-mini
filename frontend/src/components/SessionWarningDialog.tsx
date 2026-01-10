import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

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
    <Dialog
      open={open}
      disableEscapeKeyDown
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <WarningIcon color="warning" />
        <Typography variant="h6" component="div">
          Session Expiring Soon
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 2 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Your session will expire in {timeRemaining} minute{timeRemaining !== 1 ? 's' : ''}.
        </Alert>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <TimeIcon color="action" />
          <Typography variant="body1">
            Would you like to extend your session for another 30 minutes?
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary">
          If you don't respond, you will be automatically logged out when your session expires.
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button
          onClick={onLogout}
          variant="outlined"
          color="inherit"
          sx={{ minWidth: 100 }}
        >
          Logout Now
        </Button>
        <Button
          onClick={onExtend}
          variant="contained"
          color="primary"
          sx={{ minWidth: 100 }}
        >
          Extend Session
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionWarningDialog;
