from models.base import SessionLocal
from models.attendance import Attendance
from datetime import date, timedelta

session = SessionLocal()
holiday_date = date(2025, 12, 25)
end_date = holiday_date - timedelta(days=1)
start_date = end_date - timedelta(days=29)

records = session.query(Attendance).filter(
    Attendance.employee_id == 'TPR09',
    Attendance.date >= start_date,
    Attendance.date <= end_date
).order_by(Attendance.date).all()

total = 0
count = 0
print(f'30-day period: {start_date} to {end_date}')
print('Date       | Check-in | Check-out | Regular | Effective')
print('-' * 65)

for r in records:
    check_in = str(r.check_in) if r.check_in else "None"
    check_out = str(r.check_out) if r.check_out else "None"
    effective = r.get_effective_regular_hours()
    
    print(f'{r.date} | {check_in:8} | {check_out:8} | {r.regular_hours:7.2f} | {effective:7.2f}')
    
    # Count days based on check-in/check-out OR effective hours
    if r.check_in or effective > 0:
        total += effective
        count += 1

print(f'\nTotal hours: {total:.2f}, Days: {count}, Average: {total/count if count > 0 else 0:.4f}')
print(f'Rounded to 0.25: {round((total/count) / 0.25) * 0.25 if count > 0 else 0:.2f}')

session.close()

