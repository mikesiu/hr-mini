import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const AuditPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Audit Report
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Audit report module - Coming soon!
        </Typography>
      </Paper>
    </Box>
  );
};

export default AuditPage;
