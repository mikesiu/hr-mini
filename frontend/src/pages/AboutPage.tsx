import React from 'react';
import {
  BarChart3, Briefcase, Building2, CalendarCheck, CalendarClock, CalendarDays, CalendarRange,
  ClipboardCheck, Clock, DollarSign, IdCard, Info, LayoutDashboard, ListChecks, Receipt,
  UserCog, UserMinus, Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '../components/admin/AdminParts';
import versionInfo from '../version.json';

const formatDate = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const SYSTEM_INFO: { label: string; value: string }[] = [
  { label: 'Application', value: 'HR Mini' },
  { label: 'Version', value: versionInfo.version },
  { label: 'Release date', value: formatDate(versionInfo.release_date) },
  { label: 'Frontend', value: 'React 18 · Vite · TypeScript' },
  { label: 'UI', value: 'shadcn/ui · Tailwind CSS' },
  { label: 'Backend', value: 'FastAPI · SQLAlchemy' },
];

const MODULES: { group: string; items: { name: string; icon: React.ElementType }[] }[] = [
  { group: 'Overview', items: [{ name: 'Dashboard', icon: LayoutDashboard }] },
  {
    group: 'People & Lifecycle',
    items: [
      { name: 'Employee Information', icon: Users },
      { name: 'Employment Management', icon: Briefcase },
      { name: 'Work Permit', icon: IdCard },
      { name: 'Termination Management', icon: UserMinus },
    ],
  },
  {
    group: 'Time, Pay & Claims',
    items: [
      { name: 'Salary Management', icon: DollarSign },
      { name: 'Leave Dashboard', icon: CalendarCheck },
      { name: 'Work Schedules', icon: CalendarClock },
      { name: 'Attendance', icon: Clock },
      { name: 'Expense Reimbursement', icon: Receipt },
    ],
  },
  {
    group: 'Reports',
    items: [
      { name: 'HR Reports', icon: BarChart3 },
      { name: 'Audit Report', icon: ClipboardCheck },
    ],
  },
  {
    group: 'Administration',
    items: [
      { name: 'Company Management', icon: Building2 },
      { name: 'Payroll Periods', icon: CalendarRange },
      { name: 'Holiday Management', icon: CalendarDays },
      { name: 'User Management', icon: UserCog },
      { name: 'Code Maintenance', icon: ListChecks },
      { name: 'About', icon: Info },
    ],
  },
];

const SectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="overflow-hidden rounded-lg border border-solid border-border bg-card">
    <h2 className="m-0 px-4 py-3 text-sm font-semibold text-foreground">{title}</h2>
    <Separator />
    {children}
  </section>
);

const AboutPage: React.FC = () => (
  <div className="space-y-4 p-6">
    <PageHeader title="About HR Mini" subtitle="Version, system information and module overview" />

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-4 lg:col-span-1">
        <section className="rounded-lg border border-solid border-border bg-card p-4">
          <p className="m-0 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Current version
          </p>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-4xl font-semibold tracking-tight text-foreground tabular-nums">
              {versionInfo.version}
            </span>
            <Badge variant="secondary">Current</Badge>
          </div>
          <p className="m-0 mt-1 text-sm text-muted-foreground">
            Updated {formatDate(versionInfo.release_date)}
          </p>
        </section>

        <SectionCard title="System information">
          <dl className="m-0">
            {SYSTEM_INFO.map((row, i) => (
              <React.Fragment key={row.label}>
                {i > 0 && <Separator />}
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="m-0 text-right font-medium text-foreground">{row.value}</dd>
                </div>
              </React.Fragment>
            ))}
          </dl>
        </SectionCard>
      </div>

      <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
        <SectionCard title="Version history">
          {versionInfo.history.map((release, index) => (
            <React.Fragment key={release.version}>
              {index > 0 && <Separator />}
              <div className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {release.version}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatDate(release.date)}
                  </span>
                  {release.version === versionInfo.version && <Badge>Current</Badge>}
                </div>
                <ul className="m-0 mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
                  {release.changes.map((change) => (
                    <li key={change}>{change}</li>
                  ))}
                </ul>
              </div>
            </React.Fragment>
          ))}
        </SectionCard>

        <SectionCard title="Module overview">
          {MODULES.map((group, i) => (
            <React.Fragment key={group.group}>
              {i > 0 && <Separator />}
              <div className="px-4 py-3">
                <p className="m-0 mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  {group.group}
                </p>
                <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
                  {group.items.map(({ name, icon: Icon }) => (
                    <li key={name} className="flex items-center gap-2 text-sm text-foreground">
                      <Icon className="size-4 text-muted-foreground" /> {name}
                    </li>
                  ))}
                </ul>
              </div>
            </React.Fragment>
          ))}
        </SectionCard>
      </div>
    </div>
  </div>
);

export default AboutPage;
