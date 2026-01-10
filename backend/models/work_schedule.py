# app/models/work_schedule.py
from sqlalchemy import Column, String, Time, Boolean, Integer, ForeignKey
from models.base import Base

class WorkSchedule(Base):
    __tablename__ = "work_schedules"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(String(50), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)  # e.g., "Standard 9-5", "Shift A"
    
    # Monday
    mon_start = Column(Time, nullable=True)
    mon_end = Column(Time, nullable=True)
    
    # Tuesday
    tue_start = Column(Time, nullable=True)
    tue_end = Column(Time, nullable=True)
    
    # Wednesday
    wed_start = Column(Time, nullable=True)
    wed_end = Column(Time, nullable=True)
    
    # Thursday
    thu_start = Column(Time, nullable=True)
    thu_end = Column(Time, nullable=True)
    
    # Friday
    fri_start = Column(Time, nullable=True)
    fri_end = Column(Time, nullable=True)
    
    # Saturday
    sat_start = Column(Time, nullable=True)
    sat_end = Column(Time, nullable=True)
    
    # Sunday
    sun_start = Column(Time, nullable=True)
    sun_end = Column(Time, nullable=True)
    
    is_active = Column(Boolean, default=True)
    
    def get_day_times(self, day_of_week: int):
        """
        Get start and end times for a specific day of week.
        day_of_week: 0=Monday, 1=Tuesday, ..., 6=Sunday
        Returns: (start_time, end_time) tuple or (None, None) if not scheduled
        """
        day_map = {
            0: (self.mon_start, self.mon_end),  # Monday
            1: (self.tue_start, self.tue_end),  # Tuesday
            2: (self.wed_start, self.wed_end),  # Wednesday
            3: (self.thu_start, self.thu_end),  # Thursday
            4: (self.fri_start, self.fri_end),  # Friday
            5: (self.sat_start, self.sat_end),  # Saturday
            6: (self.sun_start, self.sun_end),  # Sunday
        }
        return day_map.get(day_of_week, (None, None))

