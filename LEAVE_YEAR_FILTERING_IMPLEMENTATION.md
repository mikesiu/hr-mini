# Leave Year Filtering Implementation

## Summary

Successfully implemented year-based filtering for leave statistics and history to fix the issue where sick leave "Taken" days were accumulating across multiple years (showing 6.0 days in 2026 instead of 1.0 day).

## Changes Made

### 1. Added Year Selector UI Component
**File:** `frontend/src/pages/LeavePage.tsx`

- Added a year selector dropdown in the Employee Info Header
- Positioned next to employee information for easy access
- Shows years from current year - 2 to current year + 1 (e.g., 2024-2027)
- Defaults to current year (2026)

### 2. Added State Management
**File:** `frontend/src/pages/LeavePage.tsx`

```typescript
const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
```

### 3. Implemented Date Filtering Logic
**File:** `frontend/src/pages/LeavePage.tsx`

Added helper functions:

**`getAnniversaryPeriodForYear(year)`:**
- Calculates the anniversary period for any given year
- Uses hire_date or seniority_start_date to determine anniversary
- Returns start and end dates for that year's anniversary period
- Example: Anniversary March 15 → Year 2025 = March 15, 2025 to March 14, 2026

**`isLeaveInSelectedYear(leave, year, category)`:**
- Filters sick leave by calendar year (Jan 1 - Dec 31)
- **Filters vacation by anniversary period for the selected year** (NOT calendar year)
- Filters other leave types by calendar year
- Handles leaves that span across year boundaries

### 4. Updated Statistics Calculation
**File:** `frontend/src/pages/LeavePage.tsx`

Modified `getCategoryStats()` function to:
- Filter leaves by selected year before calculating "taken" and "unpaid" counts
- Only count leaves that fall within the selected year period
- **Balance Calculation Logic:**
  - **Current Year (2026):** Use balance from backend API (accurate with carry-over, pro-rating, etc.)
  - **Historical Years (2025, 2024):** Calculate balance = `entitlement - taken` for that specific year
  - This ensures historical balance reflects what was remaining in that year, not current balance

### 5. Updated Leave History Table
**File:** `frontend/src/pages/LeavePage.tsx`

Modified `filteredLeaves` to:
- Filter by both category AND selected year
- Show only records from the selected year in the table
- Allow users to view and edit historical records by switching years

### 6. Added Vacation Anniversary Period Display
**File:** `frontend/src/pages/LeavePage.tsx`

Added vacation anniversary information to Vacation card:
- Displays "Vacation Anniversary Period" section
- Shows "Earned" date (when vacation was earned at anniversary)
- Shows "Expires" date (12 months after earned date)
- Helps users understand their vacation entitlement window
- Only appears for vacation category when dates are available

## Testing Instructions

### Test Case 1: View Current Year (2026) - Default View
1. Navigate to Leave Management page
2. Select employee "Raul Alarde" (PR55)
3. Verify year selector shows "2026" (default)
4. Check Sick Leave card:
   - **Expected:** Taken: 1.0 day, Entitlement: 5.0 days, Balance: 4.0 days, Usage: 20%
   - **Previous Bug:** Taken: 6.0 days, Usage: 120%
5. Verify Leave History table shows only 2026 records (1 record: 1/5/2026)

### Test Case 2: View Historical Year (2025)
1. With same employee selected (PR55)
2. Change year selector to "2025"
3. Check Sick Leave card:
   - **Expected:** Taken: 5.0 days, Entitlement: 5.0 days, Balance: 4.0 days (current), Usage: 100%
4. Verify Leave History table shows only 2025 records (3 records visible)
5. Users can now edit or correct 2025 records in this view

### Test Case 3: Switch Between Years
1. Switch year selector between 2025 and 2026
2. Verify statistics update immediately
3. Verify table shows only records from selected year
4. Verify vacation and other leave types also filter correctly

### Test Case 4: Add New Leave Record
1. Select year 2026
2. Click "Add Leave" button
3. Add a new sick leave record for 2026
4. Verify it appears in the table and updates statistics
5. Switch to 2025 - verify new record doesn't appear
6. Switch back to 2026 - verify record is still there

### Test Case 5: Edit Historical Record
1. Select year 2025
2. Find a leave record from 2025
3. Click edit icon
4. Make changes and save
5. Verify changes are reflected in 2025 view
6. Switch to 2026 - verify 2026 stats remain unchanged

## Technical Details

### Year Filtering Logic

**Sick Leave & Others:**
- Uses calendar year (Jan 1 - Dec 31 of selected year)
- Matches backend `calendar_year_window()` function

**Vacation (Anniversary-Based):**
- **IMPORTANT:** Vacation uses anniversary periods, NOT calendar year
- Calculates anniversary period for selected year based on hire/seniority date
- Example: If anniversary is March 15
  - Year 2024: March 15, 2024 to March 14, 2025
  - Year 2025: March 15, 2025 to March 14, 2026
- Works for both current and historical years
- Matches backend `vacation_earned_window()` function

**Overlap Detection:**
- Leaves spanning year boundaries are included if they overlap with the selected year
- Example: A leave from Dec 30, 2025 to Jan 5, 2026 appears in both 2025 and 2026 views

### Data Flow

```
User Selects Year → Update selectedYear State
                 ↓
         Filter Leave Records
                 ↓
    ┌────────────┴────────────┐
    ↓                         ↓
Calculate Stats          Update Table
(getCategoryStats)       (filteredLeaves)
    ↓                         ↓
Display Stats Cards      Display Filtered Table
```

### Important Notes

1. **Entitlement:** Always shows current year values from backend API (based on current years of service)
2. **Taken Days:** Filtered by selected year (shows what was used in that specific year)
3. **Balance Calculation:**
   - **Current Year:** Uses API balance (accounts for carry-over, pro-rating, etc.)
   - **Historical Years:** Calculated as `entitlement - taken` for that year
4. **No Backend Changes:** All filtering happens in frontend, backend API unchanged
5. **Backward Compatible:** Existing functionality preserved, only adds year filtering

## Benefits

✅ **Accurate Statistics:** Year-specific stats match backend calculations  
✅ **Historical Audit:** Review and audit past leave data by year  
✅ **Clear Separation:** No confusion from multi-year aggregated data  
✅ **Data Integrity:** Edit historical records without affecting current year  
✅ **User Friendly:** Simple dropdown to switch between years  
✅ **Transparent Information:** Vacation anniversary period clearly displayed for reference  

## Files Modified

- `frontend/src/pages/LeavePage.tsx` - Main implementation file

## Deployment Notes

- No database migrations required
- No backend changes required
- Frontend-only change - just rebuild and deploy frontend
- No breaking changes to existing functionality
