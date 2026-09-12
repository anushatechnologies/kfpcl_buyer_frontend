'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  ChevronLeft,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { notificationsApi, NotificationItem } from '@/api/notifications.api';
import { formatDate } from '@/lib/utils';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    const items = await notificationsApi.getAllNotifications();
    setNotifications(items);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markRead = async (notification: NotificationItem) => {
    if (!notification.read) {
      setNotifications((items) =>
        items.map((item) =>
          item.id === notification.id ? { ...item, read: true } : item
        )
      );
      await notificationsApi.markAsRead(notification.id);
    }

    if (notification.targetPath?.startsWith('/')) {
      router.push(notification.targetPath);
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter((notification) => !notification.read);
    if (unread.length === 0) return;

    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
    await notificationsApi.markAllAsRead();
  };

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <main className="section animate-fade-in max-w-4xl">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-dark-500 transition-colors hover:text-brand-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </button>

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-dark-100 bg-dark-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display text-dark-900">Notifications</h1>
              <p className="text-xs text-dark-500">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'You are all caught up'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadNotifications}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dark-200 bg-white px-3 py-2 text-xs font-semibold text-dark-600 transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-xl bg-dark-100" />
            ))}
          </div>
        ) : notifications.length > 0 ? (
          <div className="divide-y divide-dark-100">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => markRead(notification)}
                className={`flex w-full gap-3 px-5 py-4 text-left transition-colors ${
                  notification.read ? 'bg-white hover:bg-dark-50' : 'bg-brand-50/50 hover:bg-brand-50'
                }`}
              >
                <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${notification.read ? 'bg-dark-200' : 'bg-brand-500'}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <span className={`text-sm text-dark-900 ${notification.read ? 'font-semibold' : 'font-bold'}`}>
                      {notification.title}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-dark-400">
                      <Clock className="h-3 w-3" />
                      {formatDate(notification.createdAt)}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-dark-600">{notification.body}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-5 py-16 text-center">
            <Bell className="mx-auto mb-3 h-9 w-9 text-dark-300" />
            <h2 className="font-semibold text-dark-800">No notifications yet</h2>
            <p className="mt-1 text-sm text-dark-500">New RFQ, order, and enquiry updates will appear here.</p>
          </div>
        )}
      </div>
    </main>
  );
}
