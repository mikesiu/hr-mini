import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Chip,
  useTheme,
} from '@mui/material';
import {
  People as PeopleIcon,
  Work as WorkIcon,
  Event as EventIcon,
  AttachMoney as MoneyIcon,
  Assignment as AssignmentIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { ReportType } from '../../types/reports';

interface ReportSelectorProps {
  reportTypes: ReportType[];
  onSelectReport: (reportType: string) => void;
  selectedReportType?: string;
}

const reportIcons: Record<string, React.ReactElement> = {
  employee_directory: <PeopleIcon />,
  employment_history: <WorkIcon />,
  leave_balance: <EventIcon />,
  salary_analysis: <MoneyIcon />,
  work_permit_status: <AssignmentIcon />,
  comprehensive_overview: <AssessmentIcon />,
};

const reportColors: Record<string, string> = {
  employee_directory: '#1976d2',
  employment_history: '#388e3c',
  leave_balance: '#f57c00',
  salary_analysis: '#7b1fa2',
  work_permit_status: '#d32f2f',
  comprehensive_overview: '#455a64',
};

export const ReportSelector: React.FC<ReportSelectorProps> = ({
  reportTypes,
  onSelectReport,
  selectedReportType,
}) => {
  const theme = useTheme();

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        📊 HR Reports
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Generate comprehensive reports across all HR operations with flexible filtering options.
      </Typography>

      <Grid container spacing={3}>
        {reportTypes.map((report) => {
          const isSelected = selectedReportType === report.type;
          const icon = reportIcons[report.type] || <AssessmentIcon />;
          const color = reportColors[report.type] || theme.palette.primary.main;

          return (
            <Grid item xs={12} sm={6} md={4} key={report.type}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  border: isSelected ? `2px solid ${color}` : '1px solid transparent',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: theme.shadows[3],
                    border: `2px solid ${color}`,
                  },
                }}
                onClick={() => onSelectReport(report.type)}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mb: 2,
                      color: color,
                    }}
                  >
                    {icon}
                    <Typography variant="h6" sx={{ ml: 1, fontWeight: 'bold' }}>
                      {report.name}
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {report.description}
                  </Typography>

                  <Chip
                    label={report.type.replace('_', ' ').toUpperCase()}
                    size="small"
                    sx={{
                      backgroundColor: color,
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  />
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    variant={isSelected ? 'contained' : 'outlined'}
                    sx={{
                      backgroundColor: isSelected ? color : 'transparent',
                      borderColor: color,
                      color: isSelected ? 'white' : color,
                      '&:hover': {
                        backgroundColor: color,
                        color: 'white',
                      },
                    }}
                    fullWidth
                  >
                    {isSelected ? 'Selected' : 'Select Report'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};
