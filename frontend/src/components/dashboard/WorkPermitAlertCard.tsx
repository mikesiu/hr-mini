import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { Assignment as AssignmentIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { workPermitAPI } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

interface ExpiringPermit {
  id: number;
  employee_id: string;
  permit_type: string;
  expiry_date: string;
  employee?: {
    full_name?: string;
  } | null;
}

const getDaysUntilExpiry = (expiryDate: string): number => {
  if (!expiryDate) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let expiry: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
    const [year, month, day] = expiryDate.split('-').map(Number);
    expiry = new Date(year, month - 1, day);
  } else {
    expiry = new Date(expiryDate);
    if (Number.isNaN(expiry.getTime())) return 0;
    expiry = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  }

  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const WorkPermitAlertCard: React.FC = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [permits, setPermits] = useState<ExpiringPermit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canView = hasPermission('work_permit:manage');

  const loadExpiring = useCallback(async () => {
    if (!canView) return;

    try {
      setLoading(true);
      setError(null);
      const response = await workPermitAPI.getExpiring(30);
      setPermits(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      // Hide quietly on permission issues; show soft error otherwise
      if (err.response?.status === 403 || err.response?.status === 401) {
        setPermits([]);
        return;
      }
      console.error('Error loading expiring work permits:', err);
      setError(err.response?.data?.detail || 'Unable to load work permit alerts');
      setPermits([]);
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    loadExpiring();
  }, [loadExpiring]);

  if (!canView) {
    return null;
  }

  const expiredCount = permits.filter((p) => getDaysUntilExpiry(p.expiry_date) < 0).length;
  const soonCount = permits.length - expiredCount;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssignmentIcon color="warning" />
            <Typography variant="h6">Work Permit Alerts</Typography>
          </Box>
          <Button size="small" onClick={() => navigate('/work-permits')}>
            Open Work Permits
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">
              Checking expiring permits...
            </Typography>
          </Box>
        ) : error ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={loadExpiring}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        ) : permits.length === 0 ? (
          <Alert severity="success">
            No active work permits expiring in the next 30 days.
          </Alert>
        ) : (
          <>
            <Alert severity="warning" sx={{ mb: 1.5 }}>
              {permits.length} work permit(s) need attention
              {expiredCount > 0 ? ` (${expiredCount} expired, ${soonCount} expiring soon)` : ''}.
              Terminated staff are excluded.
            </Alert>

            <List dense disablePadding>
              {permits.slice(0, 8).map((permit, index) => {
                const days = getDaysUntilExpiry(permit.expiry_date);
                const name = permit.employee?.full_name || 'Unknown employee';
                return (
                  <React.Fragment key={permit.id}>
                    {index > 0 && <Divider component="li" />}
                    <ListItem
                      secondaryAction={
                        <Chip
                          size="small"
                          color={days < 0 ? 'error' : days <= 7 ? 'warning' : 'default'}
                          label={days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days}d left`}
                        />
                      }
                    >
                      <ListItemText
                        primary={`[${permit.employee_id}] ${name}`}
                        secondary={`${permit.permit_type} · expires ${permit.expiry_date}`}
                      />
                    </ListItem>
                  </React.Fragment>
                );
              })}
            </List>

            {permits.length > 8 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                +{permits.length - 8} more — view full list in Work Permit Management → System Alerts
              </Typography>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkPermitAlertCard;
