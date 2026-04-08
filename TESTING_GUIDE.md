# Leave Year Filtering - Testing Guide

## Quick Test Steps

### 🎯 Main Test: Fix for Raul Alarde (PR55)

**Before the Fix:**
- Sick Leave Taken: 6.0 days (incorrect - summing 2025 + 2026)
- Usage: 120% (incorrect)

**After the Fix:**

#### Step 1: View 2026 (Current Year)
1. Open Leave Management page
2. Search and select employee: **Raul Alarde (PR55)**
3. Verify the year selector shows: **2026** (default)
4. Look at the **Sick Leave** card:

```
Expected Results:
✓ Entitlement: 5.0 days
✓ Taken: 1.0 day        ← FIXED! (was 6.0)
✓ Balance: 4.0 days
✓ Usage: 20%            ← FIXED! (was 120%)
✓ Progress bar: 20% filled (light purple)
```

5. Look at **Leave History** table:
   - Should show only **1 record** from 2026 (dated 1/5/2026)

#### Step 2: View 2025 (Historical Year)
1. Click the **Year** dropdown (top right of employee card)
2. Select: **2025**
3. Look at the **Sick Leave** card:

```
Expected Results:
✓ Entitlement: 5.0 days (current year entitlement)
✓ Taken: 5.0 days       ← Shows 2025 usage
✓ Balance: 0.0 days     ← FIXED! (was showing 5.0, now correctly shows 0.0 for 2025)
✓ Usage: 100%           ← 2025 was fully used
✓ Progress bar: 100% filled (purple)
```

4. Look at **Leave History** table:
   - Should show **3 records** from 2025:
     - 1/5/2026 - 1/5/2026 (1 day)
     - 11/14/2025 - 11/14/2025 (1 day) - Unpaid Sick Leave
     - 11/13/2025 - 11/13/2025 (1 day)
     - 8/21/2025 - 8/22/2025 (2 days)

#### Step 3: Switch Back to 2026
1. Change year dropdown back to: **2026**
2. Verify stats return to 2026 values (1.0 day taken, 20%)
3. Verify table shows only 2026 record

---

## Additional Test Cases

### Test Case: Vacation Leave with Anniversary Period (Hybrid Approach)
1. Select an employee with vacation records (e.g., Jacobson, Michelle TPR08)
2. Look at the **Vacation** card
3. Verify you can see the "Vacation Anniversary Period" section showing:
   - Period for selected year (e.g., "Vacation Anniversary Period 2025:")
   - Earned: [Anniversary date for that year]
   - Expires: [Anniversary date + 12 months]
4. Switch between years (2025, 2026)
5. **IMPORTANT:** Verify anniversary period updates to show the correct period for each year

**Testing the Hybrid Behavior:**

For **Jacobson, Michelle (TPR08)** with anniversary **July 13**:
- Vacation taken: June 22-29, 2026 (6 days) + August 19, 2025 (1 day) + more

**Year 2025 View:**
- **Anniversary Period:** July 13, 2024 - July 12, 2025
- ✅ Stats show taken days from this period
- ✅ Table shows vacations from July 2024 - July 2025 period
- **Note:** Most of calendar year 2025 (Jan-Jul) falls in this anniversary period

**Year 2026 View:**
- **Anniversary Period:** July 13, 2025 - July 12, 2026 
- ✅ Stats show "Taken: 11.0" (includes BOTH June 2026 AND August 2025 vacations)
- ✅ Table shows both vacations (June 2026 + August 2025)
- ✅ Anniversary period shows: July 13, 2025 - July 12, 2026
- **Note:** Most of calendar year 2026 (Jan-Jul, 193 days) falls in this anniversary period

**Year 2027 View (if tested later):**
- **Anniversary Period:** July 13, 2026 - July 12, 2027
- ✅ Stats show "Taken: 0.0" (new period, resets after July 13, 2026)
- ✅ Table shows vacations from this new period only
- **Note:** Most of calendar year 2027 falls in this anniversary period

**Key Understanding:** 
- When selecting "Year 2026", you see the anniversary period that covers **most** of calendar year 2026
- For July 13 anniversary, that's July 13, 2025 - July 12, 2026 (193 days in 2026)
- Vacation doesn't reset until after July 13, 2026

### Test Case: Other Leave Types
1. Select an employee with other leave types (bereavement, etc.)
2. Switch between years
3. Verify stats filter by calendar year

### Test Case: Edit Historical Record
1. Select year 2025
2. Click edit icon on a 2025 record
3. Modify the record (e.g., change reason)
4. Save changes
5. Verify changes appear in 2025 view
6. Switch to 2026 - verify 2026 stats unchanged

### Test Case: Add New Record
1. Select year 2026
2. Click "Add Leave" button
3. Add a new sick leave for 2026
4. Verify it appears in 2026 view and updates stats
5. Switch to 2025 - verify new record doesn't appear
6. Switch back to 2026 - verify record is there

---

## Visual Reference

### Year Selector Location
```
┌─────────────────────────────────────────────────────────┐
│  Employee Info Card                                     │
│  ┌────────┐  Raul Alarde                    ┌────────┐ │
│  │   👤   │  ID: PR55 • Active              │ Year ▼ │ │
│  └────────┘  2.2 years employed             │  2026  │ │
│                                              └────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Statistics Cards Layout
```
┌──────────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   🏖️ Vacation        │  │   🏥 Sick Leave  │  │   ⋯ Other Leave │
│                      │  │                  │  │                  │
│ Entitlement: 10.0    │  │ Entitlement: 5.0 │  │ Days Taken: 0.0  │
│ Taken: 0.0           │  │ Taken: 1.0 ✓     │  │                  │
│ Balance: 10.0        │  │ Balance: 4.0     │  │                  │
│ [▓░░░░░░░░] 0%       │  │ [▓▓░░░░░░░] 20%✓ │  │                  │
│ Unpaid: 0.0 days     │  │ Unpaid: 1.0 days │  │                  │
│ ┌──────────────────┐ │  │                  │  │                  │
│ │ Anniversary Period│ │  │                  │  │                  │
│ │ Earned: 3/15/2024│ │  │                  │  │                  │
│ │ Expires: 3/14/2025│ │  │                  │  │                  │
│ └──────────────────┘ │  │                  │  │                  │
└──────────────────────┘  └──────────────────┘  └──────────────────┘
       ↑ NEW!                    ↑ FIXED!
```

---

## Troubleshooting

### Issue: Year selector not showing
- **Solution:** Refresh the page, make sure frontend compiled successfully

### Issue: Stats not updating when changing year
- **Solution:** Check browser console for errors, try selecting a different employee

### Issue: Old data still showing
- **Solution:** Clear browser cache and refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Issue: Leave records not filtering
- **Solution:** Verify the leave records have valid start_date and end_date fields

---

## Success Criteria

✅ Year selector appears in employee info card  
✅ Default year is current year (2026)  
✅ Sick leave "Taken" shows 1.0 day for PR55 in 2026 (not 6.0)  
✅ Usage percentage shows 20% for PR55 in 2026 (not 120%)  
✅ Leave history table filters by selected year  
✅ Switching years updates both stats and table  
✅ Can edit historical records by selecting previous year  
✅ All leave categories (vacation, sick, others) filter correctly  
✅ Vacation card displays anniversary period (Earned/Expires dates)  

---

## Browser Access

- **Local:** http://localhost:3001
- **Network:** http://192.168.1.75:3001

---

## Notes

- Frontend is already running and compiled successfully
- Backend is running on port 8001
- No backend changes were made
- All filtering happens client-side in the frontend
- Changes are backward compatible with existing data
