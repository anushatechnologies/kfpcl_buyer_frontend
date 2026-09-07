import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  Bell,
  BellOff,
  CheckCheck,
  ChevronRight,
  FileText,
  ShoppingCart,
  AlertTriangle,
  MessageSquare,
  CheckCircle2,
  Package,
  Clock,
  RefreshCw,
  Loader2,
  Lock,
} from 'lucide-react';
import { notificationsApi, type NotificationItem } from '@/api/notifications.api';
import { useAuthStore } from '../store/authStore';
import { useAuthStore as useLegacyAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

/* ─── Helpers ─────────────────────────────────────────────── */
type NotifType = 'order' | 'enquiry' | 'stock' | 'rfq' | 'payment' | 'info';

function classifyNotification(item: NotificationItem): NotifType {
  const text = `${item.type} ${item.title} ${item.body}`.toLowerCase();
  if (text.includes('order')) return 'order';
  if (text.includes('enquir') || text.includes('inquir')) return 'enquiry';
  if (text.includes('stock')) return 'stock';
  if (text.includes('payment')) return 'payment';
  if (
    text.includes('rfq') ||
    text.includes('quote') ||
    text.includes('quotation') ||
    text.includes('supplier replied')
  )
    return 'rfq';
  return 'info';
}

function isRfqReply(item: NotificationItem): boolean {
  const text = `${item.type} ${item.title} ${item.body}`.toLowerCase();
  return (
    text.includes('supplier replied') ||
    (text.includes('rfq') &&
      (text.includes('repl') ||
        text.includes('response') ||
        text.includes('quote') ||
        text.includes('quotation'))) ||
    text.includes('quotation') ||
    text.includes('new quote')
  );
}

const typeColor: Record<NotifType, string> = {
  order: 'bg-emerald-100 text-emerald-800',
  enquiry: 'bg-purple-100 text-purple-800',
  stock: 'bg-amber-100 text-amber-800',
  rfq: 'bg-[#E6F4F0] text-[#0A4D3C]',
  payment: 'bg-emerald-100 text-emerald-800',
  info: 'bg-slate-100 text-slate-700',
};

const typeLabel: Record<NotifType, string> = {
  order: 'Order',
  enquiry: 'Enquiry',
  stock: 'Stock',
  rfq: 'RFQ Reply',
  payment: 'Payment',
  info: 'Info',
};

function NotifTypeIcon({
  type,
  className,
}: {
  type: NotifType;
  className?: string;
}) {
  switch (type) {
    case 'order':
      return <ShoppingCart className={className} />;
    case 'enquiry':
      return <MessageSquare className={className} />;
    case 'stock':
      return <AlertTriangle className={className} />;
    case 'rfq':
      return <FileText className={className} />;
    case 'payment':
      return <CheckCircle2 className={className} />;
    default:
      return <Package className={className} />;
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Recent';
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

type Filter = 'all' | 'unread' | 'rfq';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'rfq', label: 'RFQ Replies' },
];

/* ─── Component ─────────────────────────────────────────────── */
export function Notifications() {
  const navigate = useNavigate();
  const session = useAuthStore((state) => state.session);
  const openAuthModal = useAuthStore((state) => state.openAuthModal);
  const legacyIsAuthenticated = useLegacyAuthStore((state) => state.isAuthenticated);
  const isAuthenticated = Boolean(session?.accessToken || legacyIsAuthenticated);

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const all = await notificationsApi.getAllNotifications();
      // Sort: unread first, then newest first
      all.sort((a, b) => {
        if (a.read !== b.read) return a.read ? 1 : -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setItems(all);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      void fetchAll();
    } else {
      setLoading(false);
      setItems([]);
    }

    const handleUpdate = () => {
      void fetchAll(true);
    };
    window.addEventListener('kfpcl:notifications-updated', handleUpdate);
    return () => {
      window.removeEventListener('kfpcl:notifications-updated', handleUpdate);
    };
  }, [isAuthenticated, fetchAll]);

  const markOne = async (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    await notificationsApi.markAsRead(id);
  };

  const markAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await notificationsApi.markAllAsRead();
  };

  const handleClick = async (item: NotificationItem) => {
    if (!item.read) await markOne(item.id);
    const destination = item.targetPath || (isRfqReply(item) ? '/account?tab=rfqs' : undefined);
    if (destination) {
      if (destination.startsWith('http')) {
        window.open(destination, '_blank');
      } else {
        navigate(destination);
      }
    }
  };

  /* Filtered list */
  const displayed = items.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'rfq') return isRfqReply(n);
    return true;
  });

  const unreadCount = items.filter((n) => !n.read).length;

  if (!isAuthenticated && !loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-16 px-4">
        <div className="max-w-md w-full rounded-3xl border border-[#E2E8F0] bg-white p-8 text-center shadow-lg">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E6F4F0] text-[#0A4D3C] mb-4 shadow-sm">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-[#0A1628]">Sign in to view notifications</h2>
          <p className="text-xs text-[#64748B] mt-2 mb-6 leading-relaxed">
            Track order updates, delivery alerts, and supplier RFQ quotation replies directly in your account inbox.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A4D3C] px-5 py-3 text-xs font-bold text-[#D4A853] hover:bg-[#083a2d] transition-colors shadow-sm cursor-pointer"
          >
            Sign In to Your Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] bg-[#F8FAFD] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-[#0A1628] flex items-center gap-2.5">
              <Bell className="h-6 w-6 text-[#0A4D3C]" />
              Notifications
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center h-5 px-2 rounded-full bg-[#E11D48] text-[11px] font-bold text-white shadow-xs">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-xs text-[#64748B] mt-1">
              {items.length === 0 && !loading
                ? 'Your notification inbox is clear'
                : `${items.length} notification${items.length !== 1 ? 's' : ''} total`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAll(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#0A1628] hover:bg-[#F1F5F9] transition-colors disabled:opacity-40 shadow-xs cursor-pointer"
              title="Refresh notifications"
              aria-label="Refresh notifications"
            >
              <RefreshCw
                className={cn('h-4 w-4', refreshing && 'animate-spin text-[#0A4D3C]')}
              />
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAll}
                className="flex items-center gap-1.5 text-xs font-bold text-[#0A4D3C] hover:text-[#083a2d] transition-colors px-3 py-2 rounded-xl border border-[#D1DDD8] bg-[#F0F7F4] hover:bg-[#E2F0EA] cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex items-center gap-2 mb-4">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer',
                filter === id
                  ? 'bg-[#0A4D3C] text-white border-[#0A4D3C] shadow-sm'
                  : 'bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#0A4D3C] hover:text-[#0A4D3C]'
              )}
            >
              {label}
              {id === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-[#E11D48] text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── List ── */}
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-24 text-[#64748B]">
              <Loader2 className="h-6 w-6 animate-spin text-[#0A4D3C]" />
              <span className="text-sm font-semibold">Loading notifications…</span>
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F5F9] text-[#94A3B8] mb-3">
                <BellOff className="h-7 w-7" />
              </div>
              <p className="text-sm font-bold text-[#0A1628] mb-1">
                {filter === 'rfq'
                  ? 'No RFQ replies yet'
                  : filter === 'unread'
                  ? 'No unread notifications'
                  : 'No notifications yet'}
              </p>
              <p className="text-xs text-[#64748B] max-w-sm">
                {filter === 'rfq'
                  ? 'When a supplier responds or provides a quotation for your RFQ, it will appear here.'
                  : "You're all caught up! New orders, quotations, and alerts will appear here."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#F1F5F9]">
              {displayed.map((item) => {
                const type = classifyNotification(item);
                const rfqReply = isRfqReply(item);

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleClick(item)}
                      className={cn(
                        'w-full flex items-start gap-4 px-6 py-4.5 text-left transition-colors cursor-pointer group',
                        item.read
                          ? 'bg-white hover:bg-[#F8FAFC]'
                          : 'bg-[#F0FDF4]/70 hover:bg-[#F0FDF4]'
                      )}
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          'flex-shrink-0 h-10 w-10 rounded-2xl flex items-center justify-center mt-0.5 shadow-xs',
                          typeColor[type]
                        )}
                      >
                        <NotifTypeIcon type={type} className="h-5 w-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p
                            className={cn(
                              'text-sm leading-tight',
                              !item.read ? 'font-black text-[#0A1628]' : 'font-semibold text-[#1E293B]'
                            )}
                          >
                            {item.title}
                          </p>

                          {/* Unread dot */}
                          {!item.read && (
                            <span className="flex-shrink-0 h-2 w-2 rounded-full bg-[#0A4D3C]" />
                          )}

                          {/* RFQ Reply badge */}
                          {rfqReply && (
                            <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#E6F4F0] text-[#0A4D3C] text-[10px] font-extrabold border border-[#0A4D3C]/20">
                              <FileText className="h-3 w-3" />
                              Supplier Reply
                            </span>
                          )}

                          {/* Type pill */}
                          <span
                            className={cn(
                              'flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg',
                              typeColor[type]
                            )}
                          >
                            {typeLabel[type]}
                          </span>
                        </div>

                        <p className="text-xs text-[#64748B] leading-relaxed line-clamp-2 mb-1.5 font-medium">
                          {item.body}
                        </p>

                        <p className="text-[11px] text-[#94A3B8] flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {formatTime(item.createdAt)}
                          <span className="ml-3 text-[#0A4D3C] font-bold group-hover:underline">
                            {rfqReply ? 'View Quotation Details →' : 'View details →'}
                          </span>
                        </p>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="flex-shrink-0 h-5 w-5 text-[#CBD5E1] mt-2 group-hover:text-[#0A4D3C] group-hover:translate-x-0.5 transition-all" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Footer note ── */}
        {!loading && items.length > 0 && (
          <p className="text-center text-xs text-dark-400 mt-4">
            Showing {displayed.length} of {items.length} notifications
          </p>
        )}
      </div>
    </div>
  );
}
