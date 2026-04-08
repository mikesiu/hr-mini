import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Tooltip,
  useTheme,
} from '@mui/material';
import { format, startOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';

interface PayrollEvent {
  date: string;
  company_id: string;
  company_name: string;
  event_type: 'payroll' | 'cra' | 'union' | 'holiday' | 'probation';
  description: string;
}

interface PayrollCalendarProps {
  month: Date;
  events: PayrollEvent[];
  onDateClick?: (date: Date, events: PayrollEvent[]) => void;
}

const PayrollCalendar: React.FC<PayrollCalendarProps> = ({ month, events, onDateClick }) => {
  const theme = useTheme();
  
  // Get the first day of the month
  const monthStart = startOfMonth(month);
  
  // Get the first day of the week for the month start (to show previous month's days)
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  
  // Get all days to display (including previous/next month days for complete weeks)
  const calendarDays = eachDayOfInterval({ 
    start: startDate, 
    end: new Date(startDate.getTime() + 6 * 7 * 24 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000) 
  });
  
  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    // Parse date string in local timezone to avoid timezone shift issues
    const [year, month, day] = event.date.split('-').map(Number);
    const eventDate = new Date(year, month - 1, day); // month is 0-indexed
    const dateKey = format(eventDate, 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, PayrollEvent[]>);
  
  // Get color for event type
  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'payroll':
        return theme.palette.primary.main;
      case 'cra':
        return theme.palette.warning.main;
      case 'union':
        return theme.palette.success.main;
      case 'holiday':
        return '#9c27b0'; // Purple color for better distinction from blue payroll
      case 'probation':
        return theme.palette.info.main; // Cyan/blue color for probation reminders
      default:
        return theme.palette.grey[500];
    }
  };

  // Get background color for event type
  const getEventBackgroundColor = (eventType: string) => {
    switch (eventType) {
      case 'payroll':
        return theme.palette.primary.light;
      case 'cra':
        return theme.palette.warning.light;
      case 'union':
        return theme.palette.success.light;
      case 'holiday':
        return '#e1bee7'; // Light purple background
      case 'probation':
        return theme.palette.info.light; // Light cyan/blue background
      default:
        return theme.palette.grey[200];
    }
  };
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" align="center" gutterBottom>
        {format(month, 'MMMM yyyy')}
      </Typography>
      
      {/* Day headers */}
      <Grid container spacing={0}>
        {dayNames.map((day) => (
          <Grid 
            item 
            xs={12/7} // Fixed width: 12/7 = ~1.714 (equal width for 7 days)
            key={day} 
            sx={{ 
              textAlign: 'center', 
              py: 1,
              width: '14.285%', // Fixed width: 100% / 7 days
              maxWidth: '14.285%', // Ensure it doesn't expand
              boxSizing: 'border-box', // Include border in width calculation
            }}
          >
            <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">
              {day}
            </Typography>
          </Grid>
        ))}
      </Grid>
      
      {/* Calendar days */}
      <Grid container spacing={0}>
        {calendarDays.map((day, index) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDate[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, month);
          const isToday = isSameDay(day, new Date());
          
          return (
            <Grid 
              item 
              xs={12/7} // Fixed width: 12/7 = ~1.714 (equal width for 7 days)
              key={index}
              sx={{ 
                minHeight: 100,
                width: '14.285%', // Fixed width: 100% / 7 days
                maxWidth: '14.285%', // Ensure it doesn't expand
                border: `1px solid ${theme.palette.divider}`,
                borderRight: index % 7 === 6 ? `1px solid ${theme.palette.divider}` : 'none',
                borderBottom: index < 35 ? `1px solid ${theme.palette.divider}` : 'none',
                p: 0.5,
                cursor: dayEvents.length > 0 ? 'pointer' : 'default',
                backgroundColor: isToday ? theme.palette.action.hover : 'transparent',
                opacity: isCurrentMonth ? 1 : 0.3,
                overflow: 'hidden', // Prevent content from expanding the cell
                boxSizing: 'border-box', // Include border in width calculation
              }}
              onClick={() => dayEvents.length > 0 && onDateClick?.(day, dayEvents)}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Day number */}
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: isToday ? 'bold' : 'normal',
                    color: isToday ? theme.palette.primary.main : 'inherit',
                    mb: 0.5,
                  }}
                >
                  {format(day, 'd')}
                </Typography>
                
                {/* Events */}
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                  {dayEvents.slice(0, 3).map((event, eventIndex) => (
                    <Tooltip 
                      key={eventIndex}
                      title={`${event.description} - ${event.company_name}`}
                      placement="top"
                    >
                      <Chip
                        label={event.event_type === 'holiday' ? 'HOLIDAY' : event.event_type.toUpperCase()}
                        size="small"
                        sx={{
                          fontSize: '0.6rem',
                          height: 14,
                          backgroundColor: getEventBackgroundColor(event.event_type),
                          color: getEventColor(event.event_type),
                          fontWeight: 'bold',
                          mb: 0.25,
                          display: 'block',
                          width: '100%',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          '& .MuiChip-label': {
                            px: 0.25,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          },
                        }}
                      />
                    </Tooltip>
                  ))}
                  
                  {dayEvents.length > 3 && (
                    <Typography variant="caption" color="text.secondary">
                      +{dayEvents.length - 3} more
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );
};

export default PayrollCalendar;
