import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  requestNotificationPermission, 
  getNotificationPermission,
  areNotificationsSupported 
} from '@/utils/pushNotifications';
import toast from 'react-hot-toast';

export default function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(areNotificationsSupported());
    setPermission(getNotificationPermission());
  }, []);

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    
    if (result === 'granted') {
      toast.success('Browser notifications enabled! You\'ll receive alerts even when the tab is closed.');
    } else if (result === 'denied') {
      toast.error('Notification permission denied. Please enable it in your browser settings.');
    }
  };

  if (!isSupported || permission === 'granted') {
    return null;
  }

  return (
    <motion.div 
      className="bg-surface border border-border rounded-xl p-4 mb-6"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-warning/20 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        </div>
        
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-text-primary mb-1">
            Browser Notifications
          </h3>
          
          {permission === 'denied' ? (
            <div>
              <p className="text-sm text-error mb-2">
                Blocked - Browser notifications are disabled.
              </p>
              <p className="text-xs text-text-tertiary">
                To enable: Click the lock icon in your address bar → Site settings → Notifications → Allow
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-text-secondary mb-3">
                Get real-time alerts for sales, low stock, and important updates - even when this tab is closed.
              </p>
              <button
                onClick={handleEnableNotifications}
                className="px-4 py-2 bg-accent-primary hover:bg-accent-primary-hover text-white rounded-lg text-sm font-medium transition-colors"
              >
                Enable Notifications
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
