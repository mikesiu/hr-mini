import type { Attendance } from './attendanceTypes';

const pick = (override: number | null | undefined, base: number | null | undefined) =>
  override !== null && override !== undefined ? override : (base ?? 0.0);

export const hasValue = (v: number | null | undefined): v is number => v !== null && v !== undefined;

/** Effective hours for one row: manual override when present, otherwise calculated. */
export const getEffectiveHours = (a: Attendance) => ({
  regular: pick(a.override_regular_hours, a.regular_hours),
  ot: pick(a.override_ot_hours, a.ot_hours),
  weekendOT: pick(a.override_weekend_ot_hours, a.weekend_ot_hours),
  statHoliday: pick(a.override_stat_holiday_hours, a.stat_holiday_hours),
});

export const sumEffectiveHours = (rows: Attendance[]) => {
  const total = { regular: 0, ot: 0, weekendOT: 0, statHoliday: 0 };
  rows.forEach((a) => {
    const e = getEffectiveHours(a);
    total.regular += e.regular;
    total.ot += e.ot;
    total.weekendOT += e.weekendOT;
    total.statHoliday += e.statHoliday;
  });
  return total;
};

export const ALL_VALUE = '__all__';

export const emptyManualEntry = (id = '1') => ({
  id,
  date: '',
  check_in: '',
  check_out: '',
  regular_hours: '',
  ot_hours: '',
  weekend_ot_hours: '',
  stat_holiday_hours: '',
});

export type ManualEntry = ReturnType<typeof emptyManualEntry>;
export type ManualEntryField = Exclude<keyof ManualEntry, 'id'>;
