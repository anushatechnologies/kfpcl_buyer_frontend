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
  Sparkles,
  CreditCard,
  Inbox,
} from 'lucide-react';
import { notificationsApi, type NotificationItem } from '@/api/notifications.api';
import { useAuthStore } from '../store/authStore';
import { useAuthStore as useLegacyAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

/* ─── Helpers ─────────────────────────────────────────────── */
type NotifType = 'order' | 'enquiry' | 'stock' | 'rfq' | 'payment' | 'info';

function classifyNotification(item: NotificationItem): NotifType {
  const text = `${item.type} ${item.referenceType || ''} ${item.title} ${item.body || item.message || ''}`.toLowerCase();
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
  const text = `${item.type} ${item.referenceType || ''} ${item.title} ${item.body || item.message || ''}`.toLowerCase();
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

const typeConfig: Record<NotifType, { bg: string; icon: string; border: string; label: string; dot: string }> = {
  order:   { bg: 'bg-emerald-50',  icon: 'text-emerald-700', border: 'border-emerald-200', label: 'Order',    dot: 'bg-emerald-500' },
  enquiry: { bg: 'bg-purple-50',   icon: 'text-purple-700',  border: 'border-purple-200',  label: 'Enquiry',  dot: 'bg-purple-500' },
  stock:   { bg: 'bg-amber-50',    icon: 'text-amber-700',   border: 'border-amber-200',   label: 'Stock',    dot: 'bg-amber-500' },
  rfq:     { bg: 'bg-[#E6F4F0]',   icon: 'text-[#0A4D3C]',  border: 'border-[#A7D0C6]',   label: 'RFQ Reply', dot: 'bg-[#0A4D3C]' },
  payment: { bg: 'bg-blue-50',     icon: 'text-blue-700',    border: 'border-blue-200',    label: 'Payment',  dot: 'bg-blue-500' },
  info:    { bg: 'bg-slate-50',    icon: 'text-slate-600',   border: 'border-slate-200',   label: 'Info',     dot: 'bg-slate-400' },
};

function NotifTypeIcon({ type, className }: { type: NotifType; className?: string }) {
  switch (type) {
    case 'order':   return <ShoppingCart className={className} />;
    case 'enquiry': return <MessageSquare className={className} />;
    case 'stock':   return <AlertTriangle className={className} />;
    case 'rfq':     return <FileText className={className} />;
    case 'payment': return <CreditCard className={className} />;
    default:        return <Package className={className} />;
  }
}

function formatTime(iso: string): string {
  if (!iso) return 'Recent';
  const trimmed = String(iso).trim();

  // If backend already returns a formatted IST date/time string (e.g. "12 Sep 2026, 11:08 AM" or "11:08 AM")
  if (
    trimmed.includes(' AM') ||
    trimmed.includes(' PM') ||
    /^[0-9]{1,2}\s+[A-Za-z]{3}/.test(trimmed) ||
    /^[A-Za-z]{3}\s+[0-9]{1,2}/.test(trimmed)
  ) {
    return trimmed;
  }

  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return trimmed; // Display returned string directly without conversion

  const timeStr = d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
  const now = new Date();

  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isToday) {
    return `Today, ${timeStr}`;
  }
  if (isYesterday) {
    return `Yesterday, ${timeStr}`;
  }

  const dateStr = d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });

  return `${dateStr}, ${timeStr}`;
}

type Filter = 'all' | 'unread' | 'rfq';

const FILTERS: { id: Filter; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'all',    label: 'All',         icon: Inbox },
  { id: 'unread', label: 'Unread',      icon: Bell },
  { id: 'rfq',    label: 'RFQ Replies', icon: FileText },
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
    const handleUpdate = () => { void fetchAll(true); };
    window.addEventListener('kfpcl:notifications-updated', handleUpdate);
    return () => { window.removeEventListener('kfpcl:notifications-updated', handleUpdate); };
  }, [isAuthenticated, fetchAll]);

  const markOne = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
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
      if (destination.startsWith('http')) window.open(destination, '_blank');
      else navigate(destination);
    }
  };

  const displayed = items.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'rfq') return isRfqReply(n);
    return true;
  });

  const unreadCount = items.filter((n) => !n.read).length;

  /* ── Not authenticated ── */
  if (!isAuthenticated && !loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-16 px-4 bg-[#F8FAFD]">
        <div className="max-w-sm w-full">
          <div className="rounded-[2.5rem] border border-[#E2E8F0] bg-white p-10 text-center shadow-[0_30px_80px_rgba(10,22,40,0.08)]">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-[#0A4D3C] to-[#1B6B54] shadow-lg">
              <Lock className="h-9 w-9 text-white" />
            </div>
            <h2 className="text-2xl font-black text-[#0A1628] tracking-tight">Sign in required</h2>
            <p className="mt-3 text-sm text-[#64748B] leading-relaxed">
              Track order updates, delivery alerts, and supplier RFQ quotation replies in your personal inbox.
            </p>
            <button
              type="button"
              onClick={() => openAuthModal()}
              className="mt-7 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0A4D3C] px-6 py-3.5 text-sm font-bold text-[#D4A853] hover:bg-[#083a2d] transition-all duration-300 shadow-md cursor-pointer"
            >
              <Bell className="h-4 w-4" />
              Sign In to Your Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] bg-[#F8FAFD]">
      {/* ── Hero Header ── */}
      <div className="bg-gradient-to-br from-[#0A4D3C] via-[#0e5f4a] to-[#1B6B54] relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(212,168,83,0.15),transparent_65%)] pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.05),transparent_70%)] pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <Bell className="h-5 w-5 text-[#D4A853]" />
                </div>
                <span className="text-xs font-bold tracking-[0.2em] uppercase text-white/50">Inbox</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Notifications</h1>
              <p className="mt-1.5 text-sm text-white/60">
                {loading
                  ? 'Loading your inbox…'
                  : items.length === 0
                  ? 'Your inbox is clear'
                  : `${items.length} notification${items.length !== 1 ? 's' : ''} · ${unreadCount > 0 ? `${unreadCount} unread` : 'all read'}`}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => fetchAll(true)}
                disabled={refreshing}
                aria-label="Refresh notifications"
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 border border-white/20 text-white/70 hover:bg-white/20 hover:text-white transition-all duration-200 disabled:opacity-40 cursor-pointer"
              >
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin text-[#D4A853]')} />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAll}
                  className="flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-200 px-4 py-2.5 rounded-2xl cursor-pointer"
                >
                  <CheckCheck className="h-3.5 w-3.5 text-[#D4A853]" />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* ── Stat chips ── */}
          {!loading && items.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {[
                { label: 'Total', value: items.length, icon: Inbox },
                { label: 'Unread', value: unreadCount, icon: Bell },
                { label: 'RFQ Replies', value: items.filter(isRfqReply).length, icon: FileText },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-1.5 backdrop-blur-sm"
                >
                  <stat.icon className="h-3.5 w-3.5 text-[#D4A853]" />
                  <span className="text-xs font-semibold text-white/80">{stat.label}</span>
                  <span className="text-xs font-black text-white">{stat.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* ── Filter tabs ── */}
        <div className="flex items-center gap-2 mb-6 bg-white rounded-2xl border border-[#E2E8F0] p-1.5 shadow-sm w-fit">
          {FILTERS.map(({ id, label, icon: Icon }) => {
            const isActive = filter === id;
            const badgeCount = id === 'unread' ? unreadCount : id === 'rfq' ? items.filter(isRfqReply).length : 0;
            return (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={cn(
                  'relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-250 cursor-pointer',
                  isActive
                    ? 'bg-[#0A4D3C] text-white shadow-[0_4px_14px_rgba(10,77,60,0.25)]'
                    : 'text-[#64748B] hover:text-[#0A4D3C] hover:bg-[#F1F5F9]'
                )}
              >
                <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-[#D4A853]' : '')} />
                {label}
                {badgeCount > 0 && (
                  <span className={cn(
                    'inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[9px] font-black',
                    isActive ? 'bg-white/20 text-white' : 'bg-[#E11D48] text-white'
                  )}>
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Notification List ── */}
        <div className="space-y-3">
          {loading ? (
            /* Loading skeleton */
            <div className="rounded-[2rem] border border-[#E2E8F0] bg-white overflow-hidden shadow-sm">
              <div className="flex items-center justify-center gap-3 py-24 text-[#64748B]">
                <Loader2 className="h-7 w-7 animate-spin text-[#0A4D3C]" />
                <span className="text-sm font-semibold">Loading your inbox…</span>
              </div>
            </div>
          ) : displayed.length === 0 ? (
            /* Empty state */
            <div className="rounded-[2rem] border border-dashed border-[#CBD7E6] bg-white p-16 text-center shadow-sm">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F1F5F9] text-[#94A3B8]">
                <BellOff className="h-8 w-8" />
              </div>
              <p className="text-base font-bold text-[#0A1628] mb-2">
                {filter === 'rfq'
                  ? 'No RFQ replies yet'
                  : filter === 'unread'
                  ? 'No unread notifications'
                  : 'Your inbox is clear'}
              </p>
              <p className="text-sm text-[#64748B] max-w-xs mx-auto leading-relaxed">
                {filter === 'rfq'
                  ? 'When a supplier responds or provides a quotation for your RFQ, it will show up here.'
                  : "You're all caught up! New orders, quotations, and alerts will appear here."}
              </p>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#F4F7F5] px-4 py-2 text-xs font-bold text-[#0A4D3C] hover:bg-[#E2EFEA] transition cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Show all notifications
                </button>
              )}
            </div>
          ) : (
            displayed.map((item, index) => {
              const type = classifyNotification(item);
              const cfg = typeConfig[type];
              const rfqReply = isRfqReply(item);
              const hasLink = Boolean(item.targetPath || rfqReply);

              return (
                <div
                  key={item.id}
                  className={cn(
                    'group relative rounded-[1.75rem] border bg-white shadow-[0_4px_20px_rgba(10,22,40,0.04)] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(10,22,40,0.09)] hover:-translate-y-0.5 overflow-hidden',
                    !item.read
                      ? 'border-[#A7D4C4] ring-1 ring-[#0A4D3C]/10'
                      : 'border-[#E8EDF3]'
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  {/* Unread left accent bar */}
                  {!item.read && (
                    <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-gradient-to-b from-[#0A4D3C] to-[#D4A853]" />
                  )}

                  <button
                    type="button"
                    onClick={() => handleClick(item)}
                    className="w-full flex items-start gap-4 px-6 py-5 text-left cursor-pointer"
                  >
                    {/* Type Icon */}
                    <div className={cn(
                      'flex-shrink-0 mt-0.5 h-11 w-11 rounded-2xl flex items-center justify-center border shadow-sm transition-transform duration-200 group-hover:scale-105',
                      cfg.bg, cfg.border
                    )}>
                      <NotifTypeIcon type={type} className={cn('h-5 w-5', cfg.icon)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Top row: title + badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <p className={cn(
                          'text-sm leading-snug flex-1 min-w-0',
                          !item.read ? 'font-black text-[#0A1628]' : 'font-semibold text-[#1E293B]'
                        )}>
                          {item.title}
                        </p>

                        {/* Unread dot */}
                        {!item.read && (
                          <span className={cn('flex-shrink-0 h-2 w-2 rounded-full', cfg.dot)} />
                        )}

                        {/* RFQ Reply badge */}
                        {rfqReply && (
                          <span className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#E6F4F0] text-[#0A4D3C] text-[10px] font-extrabold border border-[#0A4D3C]/20">
                            <FileText className="h-3 w-3" />
                            Supplier Reply
                          </span>
                        )}

                        {/* Type pill */}
                        <span className={cn(
                          'flex-shrink-0 text-[10px] font-bold px-2.5 py-0.5 rounded-lg border',
                          cfg.bg, cfg.icon, cfg.border
                        )}>
                          {cfg.label}
                        </span>
                      </div>

                      {/* Body text */}
                      <p className="text-xs text-[#64748B] leading-relaxed line-clamp-2 mb-2 font-medium">
                        {item.body}
                      </p>

                      {/* Footer: time + CTA */}
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <span className="text-[11px] text-[#94A3B8] flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {formatTime(item.createdAt)}
                        </span>
                        {hasLink && (
                          <span className={cn(
                            'text-[11px] font-bold flex items-center gap-1 transition-all duration-200',
                            rfqReply ? 'text-[#0A4D3C]' : 'text-[#64748B]',
                            'group-hover:gap-2'
                          )}>
                            {rfqReply ? 'View Quotation' : 'View details'}
                            <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Read indicator overlay (top-right) */}
                  {item.read && (
                    <div className="absolute top-4 right-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <CheckCircle2 className="h-4 w-4 text-[#94A3B8]" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer summary ── */}
        {!loading && items.length > 0 && (
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[#94A3B8]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>
              Showing <strong className="text-[#64748B]">{displayed.length}</strong> of{' '}
              <strong className="text-[#64748B]">{items.length}</strong> notifications
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
