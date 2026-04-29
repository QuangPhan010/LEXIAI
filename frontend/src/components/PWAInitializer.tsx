'use client';

import { useEffect } from 'react';
import { NotificationService } from '@/lib/notifications';

export default function PWAUpdater() {
  useEffect(() => {
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator && window.workbox !== undefined) {
      // The PWA plugin handles registration, we just need to ensure it's there
    }

    // Schedule daily reminders
    const timer = setTimeout(() => {
      NotificationService.scheduleDailyReminder();
    }, 5000); // Check after 5 seconds of load

    return () => clearTimeout(timer);
  }, []);

  return null;
}
