# Vacation Anniversary-Based Filtering Fix (Hybrid Approach)

## 🎯 Critical Issue Fixed

### Problem
Vacation "Taken" was being filtered by **calendar year** (Jan 1 - Dec 31) instead of **anniversary year**, which is incorrect because vacation entitlements are based on the employee's anniversary date, not the calendar year.

### Additional UX Issue Discovered
When using pure anniversary-based filtering, vacations taken in calendar year 2026 but within the "2025 anniversary period" (e.g., June 2026 vacation in a July 2025-July 2026 period) would not appear when selecting year 2026, causing user confusion.

### Example of the Problem
For an employee with anniversary date **February 20**:

**Before Fix (WRONG):**
- Selecting year "2025" showed vacation taken from Jan 1, 2025 - Dec 31, 2025
- This is incorrect because vacation period is Feb 20, 2025 - Feb 19, 2026

**After Fix (CORRECT):**
- Selecting year "2025" shows vacation taken from Feb 20, 2025 - Feb 19, 2026
- This matches the actual vacation anniversary period

## 🔧 Solution Implemented: Hybrid Approach

### Why Hybrid?
We use a **split approach** to balance technical accuracy with user experience:

1. **Statistics (Entitlement/Taken/Balance):** Use anniversary period (technically correct)
2. **Leave History Table:** Show vacation in BOTH anniversary period AND calendar year (user-friendly)

This means:
- Stats always reflect the correct anniversary period calculations
- Users can find their vacations in either the anniversary year OR the calendar year they were taken

### Example:
**Employee:** Anniversary July 13  
**Vacation taken:** June 22-29, 2026 (6 days)

- **Year 2025 (Anniversary: July 13, 2025 - July 12, 2026):**
  - Stats: Counts 6 days taken ✅
  - Table: Shows June 2026 vacation ✅

- **Year 2026 (Anniversary: July 13, 2026 - July 12, 2027):**
  - Stats: Counts 0 days taken ✅ (vacation belongs to previous period)
  - Table: Shows June 2026 vacation ✅ (for user convenience - taken in calendar year 2026)

### 1. New Helper Function: `getAnniversaryPeriodForYear(year)`

Calculates the anniversary period for any given year based on hire/seniority date:

```typescript
const getAnniversaryPeriodForYear = (year: number): { start: Date, end: Date } | null => {
  // Gets hire/seniority date
  // Calculates anniversary date for the selected year
  // Returns period: anniversary date to day before next anniversary
}
```

**Example:** 
- Hire date: February 20, 2021
- Year 2024: Feb 20, 2024 - Feb 19, 2025
- Year 2025: Feb 20, 2025 - Feb 19, 2026
- Year 2026: Feb 20, 2026 - Feb 19, 2027

### 2. Updated `isLeaveInSelectedYear()` Function (For Stats)

Used for statistics calculation - filters vacation by anniversary period only:

```typescript
// For vacation: ALWAYS use anniversary period (not calendar year)
if (category === 'vacation') {
  const anniversaryPeriod = getAnniversaryPeriodForYear(year);
  if (anniversaryPeriod) {
    return leaveStartDate <= anniversaryPeriod.end && leaveEndDate >= anniversaryPeriod.start;
  }
}
```

### 3. New `isLeaveInTableForYear()` Function (For Table Display)

Used for table filtering - shows vacation in BOTH anniversary period AND calendar year:

```typescript
// For vacation: HYBRID - show in both anniversary period AND calendar year
if (category === 'vacation') {
  const anniversaryPeriod = getAnniversaryPeriodForYear(year);
  
  if (anniversaryPeriod) {
    // Check if leave overlaps with anniversary period
    const inAnniversaryPeriod = leaveStartDate <= anniversaryPeriod.end && leaveEndDate >= anniversaryPeriod.start;
    
    // Also check if leave overlaps with calendar year
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);
    const inCalendarYear = leaveStartDate <= yearEnd && leaveEndDate >= yearStart;
    
    // Show if in EITHER period
    return inAnniversaryPeriod || inCalendarYear;
  }
}
```

### 3. Updated Vacation Anniversary Period Display

The vacation card now shows the anniversary period **for the selected year**:

```
Vacation Anniversary Period 2025:
Earned: 2/20/2025
Expires: 2/19/2026
```

When you switch years, this display updates to show that year's anniversary period.

## 📊 Key Differences: Vacation vs Sick Leave

| Aspect | Vacation Leave | Sick Leave |
|--------|---------------|------------|
| **Based On** | Anniversary Year | Calendar Year |
| **Period** | Anniversary to Anniversary | Jan 1 - Dec 31 |
| **Example** | Feb 20, 2025 - Feb 19, 2026 | Jan 1, 2025 - Dec 31, 2025 |
| **Year Selector** | Shows anniversary period | Shows calendar year |

## 🧪 Testing Scenarios

### Scenario 1: Employee with March Anniversary

**Employee:** Nestor Dumaol (PR31), Anniversary: Feb 20

**Vacation taken:**
- 10 days in April 2025
- This falls in the 2025 anniversary period (Feb 20, 2025 - Feb 19, 2026)

**Expected Results:**
- Select Year **2025**: Shows 10.0 days taken
- Select Year **2026**: Shows 0.0 days taken (new period starts Feb 20, 2026)

### Scenario 2: Vacation in Calendar Year But Different Anniversary Period

**Vacation taken:** June 22-29, 2026 (6 days)
**Anniversary:** July 13

This vacation falls within the **2025 anniversary period** (July 13, 2025 - July 12, 2026) but was taken in calendar year 2026.

**Expected Results with Hybrid Approach:**
- Select Year **2025**: 
  - Stats: Shows 6.0 days taken ✅ (belongs to this anniversary period)
  - Table: Shows June 2026 vacation ✅
- Select Year **2026**: 
  - Stats: Shows 0.0 days taken ✅ (doesn't belong to this anniversary period)
  - Table: Shows June 2026 vacation ✅ (for convenience - taken in calendar year 2026)

### Scenario 3: Understanding Calendar vs Anniversary

**Calendar Year 2025:**
- Jan 1, 2025 - Dec 31, 2025

**Anniversary Year 2025** (if anniversary is Feb 20):
- Feb 20, 2025 - Feb 19, 2026

**Key Point:** When viewing "Year 2025" for vacation, you see the anniversary period that **starts** in 2025, which extends into 2026.

## ✅ What's Now Fixed

1. ✅ Vacation "Taken" correctly filters by anniversary period, not calendar year
2. ✅ Vacation Anniversary Period display updates based on selected year
3. ✅ Historical vacation data (2024, 2025) shows correct taken amounts
4. ✅ Vacation spanning year boundaries counted in correct anniversary period
5. ✅ Balance calculation reflects correct taken amount for anniversary period

## 🔄 Comparison with Backend Logic

This frontend implementation now matches the backend's `vacation_earned_window()` function in `backend/services/leave_service.py`:

```python
def vacation_earned_window(hire_date: date, as_of: date) -> Tuple[date, date]:
    # Find the most recent anniversary
    # Vacation earned at anniversary can be used for 12 months after
    vacation_earned_date = current_anniversary
    vacation_expiry_date = current_anniversary.replace(year=current_anniversary.year + 1)
    return vacation_earned_date, vacation_expiry_date
```

## 📝 Important Notes

1. **Sick Leave remains calendar-based:** Jan 1 - Dec 31 (correct per BC ESA)
2. **Other Leave types remain calendar-based:** Jan 1 - Dec 31
3. **Only Vacation uses anniversary periods:** Because vacation entitlement is earned at anniversary
4. **No backend changes required:** All logic implemented in frontend

## 🎯 User Impact

Users will now see **accurate vacation usage** that aligns with:
- BC Employment Standards Act requirements
- Company vacation policies based on anniversary dates
- Backend vacation entitlement calculations
- Actual vacation periods employees use to plan their time off

## 🚀 Ready to Test

Frontend compiled successfully. Test at:
- **Local:** http://localhost:3001
- **Network:** http://192.168.1.84:3001

**Quick Test Steps:**
1. Select an employee (e.g., Nestor Dumaol PR31)
2. Note their anniversary date from the Vacation Anniversary Period display
3. Switch between years (2024, 2025, 2026)
4. Observe that:
   - Anniversary period updates for each year
   - Vacation "Taken" shows correct amount for that anniversary period
   - Period spans across calendar year boundary
