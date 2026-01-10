import { useState, useEffect, useCallback, useRef } from 'react';
import { authAPI } from '../api/client';

interface SessionManager {
  timeRemaining: number;
  showWarning: boolean;
  extendSession: () => Promise<void>;
  logout: () => void;
  resetTimer: () => void;
}

export const useSessionManager = (): SessionManager => {
  const [timeRemaining, setTimeRemaining] = useState(30); // minutes
  const [showWarning, setShowWarning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef(false);
  const lastResetTimeRef = useRef<number>(0);
  const lastTokenRefreshRef = useRef<number>(Date.now()); // Track last backend token refresh
  const isExtendingRef = useRef(false); // Prevent concurrent extend calls
  const THROTTLE_MS = 60000; // Only reset timer once per minute max
  const TOKEN_REFRESH_INTERVAL_MS = 600000; // Refresh backend token every 10 minutes of activity

  const logout = useCallback(() => {
    // Clear timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Clear localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    
    // Redirect to login
    window.location.href = '/login';
  }, []);

  const resetTimer = useCallback(() => {
    setTimeRemaining(30);
    setShowWarning(false);
    warningShownRef.current = false;
    lastResetTimeRef.current = Date.now();
    
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Start new timer
    intervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1;
        
        // Show warning at 5 minutes remaining (25 minutes elapsed)
        if (newTime === 5 && !warningShownRef.current) {
          setShowWarning(true);
          warningShownRef.current = true;
        }
        
        // Auto logout at 0 minutes
        if (newTime <= 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          logout();
          return 0;
        }
        
        return newTime;
      });
    }, 60000); // Update every minute
  }, [logout]);

  const extendSession = useCallback(async () => {
    try {
      const response = await authAPI.extendSession();
      const { access_token } = response.data;
      
      // Update token in localStorage
      localStorage.setItem('access_token', access_token);
      
      // Update last token refresh time
      lastTokenRefreshRef.current = Date.now();
      
      // Reset timer (this will also update lastResetTimeRef)
      resetTimer();
      
      console.log('Session extended successfully');
    } catch (error) {
      console.error('Failed to extend session:', error);
      // If extension fails, logout
      logout();
    }
  }, [resetTimer, logout]);

  // Auto-extend session on backend (throttled to every 10 minutes)
  const autoExtendSession = useCallback(async () => {
    // Prevent concurrent calls
    if (isExtendingRef.current) return;
    
    const now = Date.now();
    // Only extend if it's been more than 10 minutes since last token refresh
    if (now - lastTokenRefreshRef.current > TOKEN_REFRESH_INTERVAL_MS) {
      isExtendingRef.current = true;
      try {
        const response = await authAPI.extendSession();
        const { access_token } = response.data;
        
        // Update token in localStorage
        localStorage.setItem('access_token', access_token);
        lastTokenRefreshRef.current = now;
        
        console.log('Session auto-extended on activity');
      } catch (error) {
        console.error('Failed to auto-extend session:', error);
        // Don't logout on auto-extend failure - let the regular flow handle it
      } finally {
        isExtendingRef.current = false;
      }
    }
  }, []);

  // Throttled activity handler - resets frontend timer and auto-extends backend session
  const handleActivity = useCallback(() => {
    const now = Date.now();
    
    // Reset frontend timer (throttled to once per minute)
    if (now - lastResetTimeRef.current > THROTTLE_MS) {
      lastResetTimeRef.current = now;
      resetTimer();
    }
    
    // Auto-extend backend session (throttled to every 10 minutes)
    autoExtendSession();
  }, [resetTimer, autoExtendSession]);

  // Initialize timer on mount
  useEffect(() => {
    resetTimer();
    
    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [resetTimer]);

  // Set up activity detection event listeners
  useEffect(() => {
    const events = ['keydown', 'click', 'scroll'];
    // Use passive listener for scroll event to improve performance
    const passiveEvents = ['scroll'];
    
    events.forEach(event => {
      const options = passiveEvents.includes(event) 
        ? { passive: true, capture: false } 
        : { capture: false };
      window.addEventListener(event, handleActivity, options);
    });
    
    // Cleanup event listeners on unmount
    return () => {
      events.forEach(event => {
        const options = passiveEvents.includes(event) 
          ? { passive: true, capture: false } 
          : { capture: false };
        window.removeEventListener(event, handleActivity, options);
      });
    };
  }, [handleActivity]);

  return {
    timeRemaining,
    showWarning,
    extendSession,
    logout,
    resetTimer,
  };
};
