import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Alert,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  People,
  Work,
  Event,
  AttachMoney,
  Assignment,
  Receipt,
  Business,
  Person,
  Assessment,
  BarChart,
  Dashboard as DashboardIcon,
  CalendarToday,
  PersonRemove,
  Schedule,
  AccessTime,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useCompanyFilter } from '../contexts/CompanyFilterContext';
import CompanyFilter from './CompanyFilter';
import SessionManager from './SessionManager';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 240;

interface AppLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', permission: '', section: 'Overview' },
  { text: 'Payroll Periods', icon: <CalendarToday />, path: '/payroll-periods', permission: 'company:view', section: 'Overview' },
  { text: 'Employee Information', icon: <People />, path: '/employees', permission: 'employee:view', section: 'Operations' },
  { text: 'Employment Management', icon: <Work />, path: '/employment', permission: 'employment:view', section: 'Operations' },
  { text: 'Salary Management', icon: <AttachMoney />, path: '/salary', permission: 'salary_history:view', section: 'Operations' },
  { text: 'Leave Dashboard', icon: <Event />, path: '/leaves', permission: 'leave:manage', section: 'Operations' },
  { text: 'Work Schedules', icon: <Schedule />, path: '/work-schedules', permission: 'schedule:view', section: 'Operations' },
  { text: 'Attendance', icon: <AccessTime />, path: '/attendance', permission: 'attendance:view', section: 'Operations' },
  { text: 'Work Permit Management', icon: <Assignment />, path: '/work-permits', permission: 'work_permit:manage', section: 'Operations' },
  { text: 'Expense Reimbursement', icon: <Receipt />, path: '/expenses', permission: 'expense:manage', section: 'Operations' },
  { text: 'Termination Management', icon: <PersonRemove />, path: '/terminations', permission: 'termination:view', section: 'Operations' },
  { text: 'HR Reports', icon: <BarChart />, path: '/reports', permission: 'report:view', section: 'Reports & Analytics' },
  { text: 'Company Management', icon: <Business />, path: '/companies', permission: 'company:manage', section: 'System Management' },
  { text: 'Holiday Management', icon: <CalendarToday />, path: '/holidays', permission: 'holiday:view', section: 'System Management' },
  { text: 'User Management', icon: <Person />, path: '/users', permission: 'user:view', section: 'System Management' },
  { text: 'Audit Report', icon: <Assessment />, path: '/audit', permission: 'audit:view', section: 'System Management' },
];

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  const { user, logout, hasPermission } = useAuth();
  const { selectedCompanyId, setSelectedCompanyId, selectedCompany } = useCompanyFilter();
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
  };

  const handleChangePassword = () => {
    navigate('/change-password');
    handleClose();
  };

  // Filter menu items based on permissions
  const accessibleItems = menuItems.filter(item => !item.permission || hasPermission(item.permission));
  
  // Group items by section
  const groupedItems = accessibleItems.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, typeof menuItems>);

  const drawer = (
    <div>
      <Toolbar
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          minHeight: '64px !important',
        }}
      >
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
          HR Mini
        </Typography>
      </Toolbar>
      
      {/* Company Filter */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          🏢 Company Filter
        </Typography>
        <CompanyFilter
          value={selectedCompanyId}
          onChange={setSelectedCompanyId}
          showAllOption={true}
          label="Filter by Company"
          size="small"
        />
        {selectedCompany && (
          <Box sx={{ mt: 1.5 }}>
            <Alert severity="info" icon={<Business />} sx={{ py: 0.5 }}>
              <Typography variant="caption">
                <strong>Selected:</strong> {selectedCompany.legal_name}
                {selectedCompany.trade_name && ` (${selectedCompany.trade_name})`}
              </Typography>
            </Alert>
          </Box>
        )}
        {!selectedCompanyId && (
          <Box sx={{ mt: 1.5 }}>
            <Alert severity="success" sx={{ py: 0.5 }}>
              <Typography variant="caption">
                <strong>All Companies</strong> - Showing data from all companies
              </Typography>
            </Alert>
          </Box>
        )}
      </Box>
      
      {/* Navigation Menu */}
      {Object.entries(groupedItems).map(([section, items]) => (
        <div key={section}>
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {section}
            </Typography>
          </Box>
          <List sx={{ py: 0.5 }}>
            {items.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => navigate(item.path)}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: location.pathname === item.path ? 'primary.main' : 'text.secondary' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.9375rem',
                      fontWeight: location.pathname === item.path ? 500 : 400,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </div>
      ))}
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' }, color: 'text.primary' }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            HR Management System
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ mr: 2, color: 'text.secondary', fontWeight: 500 }}>
              {user?.display_name || user?.username}
            </Typography>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              sx={{ color: 'text.primary' }}
            >
              <AccountCircle />
            </IconButton>
        <Menu
          id="menu-appbar"
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={Boolean(anchorEl)}
          onClose={handleClose}
        >
          <MenuItem onClick={handleChangePassword}>Change My Password</MenuItem>
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          backgroundColor: 'background.default',
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        <SessionManager>
          {children}
        </SessionManager>
      </Box>
    </Box>
  );
};
