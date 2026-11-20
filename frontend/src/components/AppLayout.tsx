import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  DollarSign,
  IdCard,
  Info,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Receipt,
  UserCog,
  UserMinus,
  Users,
  Briefcase,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import versionInfo from '../version.json';
import { useAuth } from '../contexts/AuthContext';
import { useCompanyFilter } from '../contexts/CompanyFilterContext';
import SessionManager from './SessionManager';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  text: string;
  icon: LucideIcon;
  path: string;
  permission: string;
}

interface NavGroupConfig {
  id: string;
  label: string;
  /** Overview is always visible; other groups can be collapsed */
  collapsible: boolean;
  /** Initial open state (a group containing the active route is always opened) */
  defaultOpen: boolean;
  items: NavItem[];
}

// All 18 routes, paths, permissions and icons are unchanged from the previous nav array.
const navGroups: NavGroupConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    collapsible: false,
    defaultOpen: true,
    items: [
      { text: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', permission: '' },
    ],
  },
  {
    id: 'people',
    label: 'People & Lifecycle',
    collapsible: true,
    defaultOpen: false,
    items: [
      { text: 'Employee Information', icon: Users, path: '/employees', permission: 'employee:view' },
      { text: 'Employment Management', icon: Briefcase, path: '/employment', permission: 'employment:view' },
      { text: 'Work Permit', icon: IdCard, path: '/work-permits', permission: 'work_permit:manage' },
      { text: 'Termination Management', icon: UserMinus, path: '/terminations', permission: 'termination:view' },
    ],
  },
  {
    id: 'time-pay',
    label: 'Time, Pay & Claims',
    collapsible: true,
    defaultOpen: false,
    items: [
      { text: 'Salary Management', icon: DollarSign, path: '/salary', permission: 'salary_history:view' },
      { text: 'Leave Dashboard', icon: CalendarCheck, path: '/leaves', permission: 'leave:manage' },
      { text: 'Work Schedules', icon: CalendarClock, path: '/work-schedules', permission: 'schedule:view' },
      { text: 'Attendance', icon: Clock, path: '/attendance', permission: 'attendance:view' },
      { text: 'Expense Reimbursement', icon: Receipt, path: '/expenses', permission: 'expense:manage' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    collapsible: true,
    defaultOpen: false,
    items: [
      { text: 'HR Reports', icon: BarChart3, path: '/reports', permission: 'report:view' },
      { text: 'Audit Report', icon: ClipboardCheck, path: '/audit', permission: 'audit:view' },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    collapsible: true,
    defaultOpen: false,
    items: [
      { text: 'Company Management', icon: Building2, path: '/companies', permission: 'company:manage' },
      { text: 'Payroll Periods', icon: CalendarRange, path: '/payroll-periods', permission: 'company:view' },
      { text: 'Holiday Management', icon: CalendarDays, path: '/holidays', permission: 'holiday:view' },
      { text: 'User Management', icon: UserCog, path: '/users', permission: 'user:view' },
      { text: 'Code Maintenance', icon: ListChecks, path: '/codes', permission: 'code:manage' },
      { text: 'About', icon: Info, path: '/about', permission: '' },
    ],
  },
];

const ALL_COMPANIES = 'all';

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// shadcn's SidebarProvider persists its state in the `sidebar_state` cookie; restore it on load.
const readSidebarOpen = (): boolean => {
  const match = document.cookie.match(/(?:^|; )sidebar_state=([^;]*)/);
  return match ? match[1] === 'true' : true;
};

interface NavGroupSectionProps {
  group: NavGroupConfig;
  pathname: string;
}

const NavGroupSection: React.FC<NavGroupSectionProps> = ({ group, pathname }) => {
  const { state, isMobile } = useSidebar();
  const hasActiveChild = group.items.some((item) => item.path === pathname);
  const [open, setOpen] = useState(group.defaultOpen || hasActiveChild);

  // Navigating to a route inside a collapsed group opens that group
  useEffect(() => {
    if (hasActiveChild) setOpen(true);
  }, [hasActiveChild]);

  // In the 56px icon rail there are no group headings, so every item must stay reachable
  const iconRail = state === 'collapsed' && !isMobile;

  const menu = (
    <SidebarMenu>
      {group.items.map((item) => {
        const active = pathname === item.path;
        const Icon = item.icon;
        return (
          <SidebarMenuItem key={item.path}>
            <SidebarMenuButton asChild isActive={active} tooltip={item.text}>
              <Link to={item.path} aria-current={active ? 'page' : undefined}>
                <Icon />
                <span>{item.text}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  if (!group.collapsible) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
        <SidebarGroupContent>{menu}</SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <Collapsible open={iconRail || open} onOpenChange={setOpen} className="group/collapsible">
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger
            tabIndex={iconRail ? -1 : 0}
            className="w-full cursor-pointer border-0 bg-transparent text-left [font-family:inherit] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {group.label}
            <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>{menu}</SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
};

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, logout, hasPermission } = useAuth();
  const { selectedCompanyId, setSelectedCompanyId, selectedCompany, companies, loading: companiesLoading } = useCompanyFilter();
  const navigate = useNavigate();
  const location = useLocation();
  const [defaultOpen] = useState(readSidebarOpen);

  const displayName = user?.display_name || user?.username || '';

  const handleLogout = () => {
    logout();
  };

  const handleChangePassword = () => {
    navigate('/change-password');
  };

  // Filter menu items based on permissions; hide groups that end up empty
  const accessibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || hasPermission(item.permission)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex h-10 items-center gap-2 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-xs font-bold tracking-tight text-sidebar-primary-foreground"
              aria-hidden="true"
            >
              HR
            </div>
            <div className="flex min-w-0 items-center gap-2 group-data-[collapsible=icon]:hidden">
              <span className="truncate text-base font-semibold tracking-tight text-sidebar-foreground">
                HR Mini
              </span>
              <button
                type="button"
                onClick={() => navigate('/about')}
                aria-label={`Version ${versionInfo.version} - open About`}
                className="cursor-pointer rounded-full border-0 bg-transparent p-0 outline-none focus-visible:ring-[3px] focus-visible:ring-sidebar-ring/50"
              >
                <Badge variant="secondary" className="font-normal text-muted-foreground">
                  v{versionInfo.version}
                </Badge>
              </button>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {accessibleGroups.map((group) => (
            <NavGroupSection key={group.id} group={group} pathname={location.pathname} />
          ))}
        </SidebarContent>

        <SidebarFooter>
          <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            <Building2 className="size-3.5 shrink-0" />
            <span className="truncate">
              {selectedCompany ? selectedCompany.legal_name : 'All Companies'}
            </span>
          </div>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0">
        {/* Slim top bar */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-0 border-solid border-b border-border bg-background px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <SidebarTrigger className="-ml-1 shrink-0" />
            <Separator orientation="vertical" className="mx-1 h-6" />

            {/* Global company filter */}
            {companiesLoading ? (
              <Skeleton className="h-8 w-full max-w-56" />
            ) : (
              <Select
                value={selectedCompanyId ?? ALL_COMPANIES}
                onValueChange={(value) => setSelectedCompanyId(value === ALL_COMPANIES ? null : value)}
              >
                <SelectTrigger
                  size="sm"
                  className="w-full max-w-56 min-w-0 bg-background"
                  aria-label="Filter by company"
                >
                  <Building2 />
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_COMPANIES}>All Companies</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.legal_name || company.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 shrink-0 gap-2 px-2" aria-label="Account menu">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary text-xs font-medium text-primary-foreground">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[12rem] truncate text-sm font-medium text-foreground sm:inline">
                  {displayName}
                </span>
                <ChevronDown className="hidden text-muted-foreground sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="truncate text-sm font-medium text-foreground">{displayName}</span>
                {user?.username && user.username !== displayName && (
                  <span className="truncate text-xs font-normal text-muted-foreground">{user.username}</span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleChangePassword}>
                <KeyRound />
                Change My Password
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/about')}>
                <Info />
                About
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
                <LogOut />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <div className={cn('w-full flex-1 bg-muted/40 p-4 sm:p-6')}>
          <SessionManager>
            {children}
          </SessionManager>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};
