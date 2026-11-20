export interface WorkSchedule {
  id: number;
  company_id: string;
  name: string;
  mon_start?: string;
  mon_end?: string;
  tue_start?: string;
  tue_end?: string;
  wed_start?: string;
  wed_end?: string;
  thu_start?: string;
  thu_end?: string;
  fri_start?: string;
  fri_end?: string;
  sat_start?: string;
  sat_end?: string;
  sun_start?: string;
  sun_end?: string;
  is_active: boolean;
}

export interface EmployeeOption {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
}

export interface EmployeeAssignment {
  id: number;
  employee_id: string;
  employee_name?: string;
  employee_status?: string;
  schedule_id: number;
  effective_date: string;
  end_date?: string;
}

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const formatTime = (timeStr?: string) => {
  if (!timeStr) return '-';
  return timeStr.substring(0, 5); // HH:MM
};

export const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    // Extract YYYY-MM-DD from the string first to avoid timezone issues
    const dateMatch = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      const [year, month, day] = dateMatch[1].split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

export const isActiveAssignment = (assignment: EmployeeAssignment) => {
  if ((assignment.employee_status || '').toLowerCase() === 'terminated') return false;
  if (!assignment.end_date) return true;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return assignment.end_date.slice(0, 10) >= todayKey;
};

const toMinutes = (time: string): number | null => {
  const m = time.match(/^(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/** Working days and total weekly hours, from days that have both a start and an end. */
export const getWeeklySummary = (schedule: WorkSchedule) => {
  let days = 0;
  let minutes = 0;
  for (const day of DAYS) {
    const start = schedule[`${day}_start`];
    const end = schedule[`${day}_end`];
    if (!start || !end) continue;
    const s = toMinutes(start);
    const e = toMinutes(end);
    if (s === null || e === null) continue;
    days += 1;
    minutes += e >= s ? e - s : e + 24 * 60 - s; // overnight shifts wrap past midnight
  }
  const hours = minutes / 60;
  return { days, hours: Number.isInteger(hours) ? String(hours) : hours.toFixed(1) };
};
