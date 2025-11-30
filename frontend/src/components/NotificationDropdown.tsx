import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import api from '@/utils/api';
import toast from 'react-hot-toast';
import { requestNotificationPermission, showLocalNotification, getNotificationPermission } from '@/utils/pushNotifications';

interface Notification {
  _id: string;
  type: 'low_stock' | 'sale' | 'purchase' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const prevUnreadCountRef = useRef<number>(0);

  // Fetch notifications
  const { data: notificationsData, error, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications?limit=10');
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 0, // Always consider data stale to force refetch
    retry: 2, // Retry failed requests
  });

  const notifications: Notification[] = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unreadCount || 0;

  // Check notification permission on mount
  useEffect(() => {
    setNotificationPermission(getNotificationPermission());
  }, []);

  // Show browser notification for new unread notifications
  useEffect(() => {
    if (notifications.length > 0 && unreadCount > prevUnreadCountRef.current && prevUnreadCountRef.current > 0) {
      // New notification arrived
      const latestNotification = notifications[0];
      if (!latestNotification.isRead && notificationPermission === 'granted') {
        showLocalNotification(latestNotification.title, {
          body: latestNotification.message,
          tag: latestNotification._id,
          data: { url: latestNotification.link || '/' },
        });
      }
    }
    prevUnreadCountRef.current = unreadCount;
  }, [notifications, unreadCount, notificationPermission]);

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.put(`/notifications/${id}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await api.put('/notifications/read-all');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification._id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'low_stock':
        return (
          <div className="w-8 h-8 bg-warning/20 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      case 'sale':
        return (
          <div className="w-8 h-8 bg-success/20 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'purchase':
        return (
          <div className="w-8 h-8 bg-info/20 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-accent-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-text-secondary hover:text-text-primary transition-colors p-2 rounded-lg hover:bg-surface-hover"
        title="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <motion.div
              className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-16 sm:top-auto mt-0 sm:mt-2 w-auto sm:w-96 max-w-md bg-surface border border-border rounded-xl shadow-metallic overflow-hidden z-20"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* Header */}
              <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsReadMutation.mutate()}
                    className="text-xs text-accent-primary hover:text-accent-primary-hover transition-colors whitespace-nowrap"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification list */}
              <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto custom-scrollbar">
                {isLoading ? (
                  <div className="p-6 sm:p-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary"></div>
                    <p className="text-sm text-text-secondary mt-2">Loading notifications...</p>
                  </div>
                ) : error ? (
                  <div className="p-6 sm:p-8 text-center">
                    <svg className="w-12 h-12 text-error mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-error">Failed to load notifications</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-6 sm:p-8 text-center">
                    <svg className="w-12 h-12 text-text-tertiary mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-sm text-text-secondary">No notifications</p>
                  </div>
                ) : (
                  notifications.map((notification, index) => (
                    <motion.button
                      key={notification._id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full p-3 sm:p-4 flex gap-2 sm:gap-3 hover:bg-surface-hover transition-colors text-left ${
                        !notification.isRead ? 'bg-accent-primary/5' : ''
                      } ${index !== notifications.length - 1 ? 'border-b border-border' : ''}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs sm:text-sm font-medium text-text-primary line-clamp-1">
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-accent-primary rounded-full flex-shrink-0 mt-1 sm:mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-text-secondary line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-[10px] sm:text-xs text-text-tertiary mt-1">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                    </motion.button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
