"""
Time rounding utility for attendance check-in and check-out times.
Implements the specified rounding rules:
- :09 - :23 → :15
- :24 - :38 → :30
- :39 - :53 → :45
- :54 - :08 → next hour :00
"""
from datetime import time, datetime, timedelta

def round_time(time_obj: time) -> time:
    """
    Round a time object according to the specified rules.
    Sets seconds to 00 in rounded times.
    
    Rounding rules:
    - :09 - :23 → :15
    - :24 - :38 → :30
    - :39 - :53 → :45
    - :54 - :59 → next hour (:00)
    - :00 - :08 → current hour (:00)
    
    Args:
        time_obj: datetime.time object to round
        
    Returns:
        Rounded datetime.time object (seconds always set to 00)
    """
    if time_obj is None:
        return None
    
    minute = time_obj.minute
    hour = time_obj.hour
    
    if minute >= 9 and minute <= 23:
        # Round to :15
        rounded_minute = 15
        rounded_hour = hour
    elif minute >= 24 and minute <= 38:
        # Round to :30
        rounded_minute = 30
        rounded_hour = hour
    elif minute >= 39 and minute <= 53:
        # Round to :45
        rounded_minute = 45
        rounded_hour = hour
    elif minute >= 54:
        # Round to next hour (:00)
        rounded_minute = 0
        rounded_hour = (hour + 1) % 24
    elif minute <= 8:
        # Round to current hour (:00)
        rounded_minute = 0
        rounded_hour = hour
    else:
        # Should not happen, but keep original if it does
        rounded_minute = minute
        rounded_hour = hour
    
    # Always set seconds and microseconds to 0
    return time(hour=rounded_hour, minute=rounded_minute, second=0, microsecond=0)


def round_datetime(dt_obj: datetime) -> datetime:
    """
    Round a datetime object according to the specified rules.
    
    Args:
        dt_obj: datetime object to round
        
    Returns:
        Rounded datetime object
    """
    if dt_obj is None:
        return None
    
    rounded_time = round_time(dt_obj.time())
    return datetime.combine(dt_obj.date(), rounded_time)


def round_check_in(time_obj: time) -> time:
    """
    Round check-in time using the standard rounding rules.
    Sets seconds to 00 in rounded times.
    
    Rounding rules:
    - :09 - :23 → :15
    - :24 - :38 → :30
    - :39 - :53 → :45
    - :54 - :08 → next hour :00
    
    Examples:
    - 15:09 to 15:23 → 15:15
    - 15:24 to 15:38 → 15:30
    - 15:39 to 15:53 → 15:45
    - 15:54 to 16:08 → 16:00
    
    Args:
        time_obj: datetime.time object to round
        
    Returns:
        Rounded datetime.time object (seconds always set to 00)
    """
    if time_obj is None:
        return None
    
    minute = time_obj.minute
    hour = time_obj.hour
    
    if minute >= 9 and minute <= 23:
        # Round to :15
        rounded_minute = 15
        rounded_hour = hour
    elif minute >= 24 and minute <= 38:
        # Round to :30
        rounded_minute = 30
        rounded_hour = hour
    elif minute >= 39 and minute <= 53:
        # Round to :45
        rounded_minute = 45
        rounded_hour = hour
    elif minute >= 54:
        # Round to next hour :00
        rounded_minute = 0
        rounded_hour = (hour + 1) % 24
    elif minute <= 8:
        # Round to current hour :00 (or next hour if we're at :00)
        # For :00-:08, round to :00 of current hour
        rounded_minute = 0
        rounded_hour = hour
    else:
        # Should not happen, but keep original if it does
        rounded_minute = minute
        rounded_hour = hour
    
    # Always set seconds and microseconds to 0
    return time(hour=rounded_hour, minute=rounded_minute, second=0, microsecond=0)


def round_check_out(time_obj: time) -> time:
    """
    Round check-out time using the standard rounding rules.
    Sets seconds to 00 in rounded times.
    
    Rounding rules:
    - :09 - :23 → :15
    - :24 - :38 → :30
    - :39 - :53 → :45
    - :54 - :08 → next hour :00
    
    Examples:
    - 15:09 to 15:23 → 15:15
    - 15:24 to 15:38 → 15:30
    - 15:39 to 15:53 → 15:45
    - 15:54 to 16:08 → 16:00
    
    Args:
        time_obj: datetime.time object to round
        
    Returns:
        Rounded datetime.time object (seconds always set to 00)
    """
    if time_obj is None:
        return None
    
    minute = time_obj.minute
    hour = time_obj.hour
    
    if minute >= 9 and minute <= 23:
        # Round to :15
        rounded_minute = 15
        rounded_hour = hour
    elif minute >= 24 and minute <= 38:
        # Round to :30
        rounded_minute = 30
        rounded_hour = hour
    elif minute >= 39 and minute <= 53:
        # Round to :45
        rounded_minute = 45
        rounded_hour = hour
    elif minute >= 54:
        # Round to next hour :00
        rounded_minute = 0
        rounded_hour = (hour + 1) % 24
    elif minute <= 8:
        # Round to current hour :00 (or next hour if we're at :00)
        # For :00-:08, round to :00 of current hour
        rounded_minute = 0
        rounded_hour = hour
    else:
        # Should not happen, but keep original if it does
        rounded_minute = minute
        rounded_hour = hour
    
    # Always set seconds and microseconds to 0
    return time(hour=rounded_hour, minute=rounded_minute, second=0, microsecond=0)


def round_time_string(time_str: str) -> str:
    """
    Round a time string (HH:MM:SS or HH:MM) according to the specified rules.
    
    Args:
        time_str: Time string in format "HH:MM:SS" or "HH:MM"
        
    Returns:
        Rounded time string in format "HH:MM"
    """
    if not time_str or time_str.strip() in ['-', '']:
        return None
    
    try:
        # Parse time string
        parts = time_str.strip().split(':')
        hour = int(parts[0])
        minute = int(parts[1])
        time_obj = time(hour=hour, minute=minute)
        
        # Round it
        rounded = round_time(time_obj)
        return rounded.strftime("%H:%M")
    except (ValueError, IndexError):
        # If parsing fails, return original or None
        return None

