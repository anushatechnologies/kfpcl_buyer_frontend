'use client';

import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  ShoppingCart,
  Bell,
  Menu,
  X,
  ChevronDown,
  Globe,
  Package,
  FileText,
  MessageCircle,
  LayoutDashboard,
  LogIn,
  UserPlus,
  User,
  LogOut,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { notificationsApi, type NotificationItem } from '@/api/notifications.api';
import ProductSearchSuggestions from '@/components/ProductSearchSuggestions';


/* ─── NOTIFICATION DATA ─────────────────────────────────────── */
interface Notification {
  id: string;
  type: 'order' | 'enquiry' | 'stock' | 'rfq' | 'payment';
  title: string;
  body: string;
  time: string;
  read: boolean;
  icon: 'ShoppingCart' | 'MessageSquare' | 'AlertTriangle' | 'FileText' | 'CheckCircle2';
  targetPath?: string;
  eventType?: string;
}

// No mock notifications — all data comes from the real backend API

const NotifIcon = ({ name, className }: { name: Notification['icon']; className?: string }) => {
  switch (name) {
    case 'ShoppingCart': return <ShoppingCart className={className} />;
    case 'MessageSquare': return <MessageSquare className={className} />;
    case 'AlertTriangle': return <AlertTriangle className={className} />;
    case 'FileText': return <FileText className={className} />;
    case 'CheckCircle2': return <CheckCircle2 className={className} />;
    default: return <Bell className={className} />;
  }
};

const notifIconColor: Record<Notification['type'], string> = {
  order: 'text-emerald-600 bg-emerald-50',
  enquiry: 'text-purple-600 bg-purple-50',
  stock: 'text-amber-600 bg-amber-50',
  rfq: 'text-blue-600 bg-blue-50',
  payment: 'text-green-600 bg-green-50',
};

const mapNotification = (item: NotificationItem): Notification => {
  const text = `${item.type} ${item.title} ${item.body}`.toLowerCase();
  const type: Notification['type'] = text.includes('order')
    ? 'order'
    : text.includes('enquir') || text.includes('inquir')
    ? 'enquiry'
    : text.includes('stock')
    ? 'stock'
    : text.includes('payment')
    ? 'payment'
    : 'rfq';

  const icon: Notification['icon'] = type === 'order'
    ? 'ShoppingCart'
    : type === 'enquiry'
    ? 'MessageSquare'
    : type === 'stock'
    ? 'AlertTriangle'
    : type === 'payment'
    ? 'CheckCircle2'
    : 'FileText';

  return {
    id: item.id,
    type,
    title: item.title,
    body: item.body,
    time: (() => {
      if (!item.createdAt) return 'Recent';
      const raw = String(item.createdAt).trim();
      if (raw.includes(' AM') || raw.includes(' PM') || /^[0-9]{1,2}:[0-9]{2}/.test(raw)) {
        return raw;
      }
      const d = new Date(raw);
      if (isNaN(d.getTime())) return raw;
      return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      });
    })(),
    read: item.read,
    icon,
    targetPath: item.targetPath,
    eventType: item.type,
  };
};

const isRfqReplyNotification = (notification: Notification) => {
  const text = `${notification.eventType} ${notification.title} ${notification.body}`.toLowerCase();
  return (
    (text.includes('rfq') && (text.includes('repl') || text.includes('response') || text.includes('quote'))) ||
    text.includes('quotation') ||
    text.includes('new quote')
  );
};

/* ─────────────────────────────────────────────────────────────── */

const SELLER_LINKS = [
  { label: 'Dashboard', href: '/seller/dashboard', icon: LayoutDashboard },
  { label: 'My Products', href: '/seller/products', icon: Package },
  { label: 'RFQs', href: '/seller/rfqs', icon: FileText },
  { label: 'Orders', href: '/seller/orders', icon: ShoppingCart },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Notification state
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [rfqReplyAlert, setRfqReplyAlert] = useState<Notification | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const cartItems = useCartStore((s) => s.items);
  const itemCount = cartItems.length;

  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const isSeller = user?.role === 'seller';
  const [serverUnreadCount, setServerUnreadCount] = useState<number | null>(null);
  const unreadCount = serverUnreadCount !== null ? serverUnreadCount : notifications.filter((n) => !n.read).length;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const loadNotifications = useCallback(async () => {
    const [response, countRes] = await Promise.all([
      notificationsApi.getNotifications(0, 10),
      notificationsApi.getUnreadCount().catch(() => null),
    ]);
    if (typeof countRes === 'number') {
      setServerUnreadCount(countRes);
    }
    const items = response.content.map(mapNotification);
    setNotifications(items);

    if (user?.role !== 'buyer') return;

    const storageKey = `kfpcl_shown_rfq_reply_notifications_${user.id}`;
    let shownIds: string[] = [];
    try {
      shownIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch {
      shownIds = [];
    }

    const replyNotification = items.find(
      (item) => !shownIds.includes(item.id) && isRfqReplyNotification(item)
    );

    if (replyNotification) {
      setRfqReplyAlert(replyNotification);
      try {
        localStorage.setItem(storageKey, JSON.stringify([...shownIds, replyNotification.id].slice(-100)));
      } catch {
        // The inbox remains usable even if browser storage is unavailable.
      }
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setRfqReplyAlert(null);
      return;
    }

    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 30000);
    return () => window.clearInterval(intervalId);
  }, [isAuthenticated, loadNotifications]);

  // Close notification dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

  const handleLogout = () => {
    clearAuth();
    setProfileDropdown(false);
    router.push('/');
  };

  const handleSellClick = () => {
    if (isAuthenticated && isSeller) {
      router.push('/supplier/dashboard');
    } else {
      setIsSellModalOpen(true);
    }
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    setIsSearchFocused(false);
    router.push(query ? `/products?search=${encodeURIComponent(query)}` : '/products');
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setServerUnreadCount(0);
    notificationsApi.markAllAsRead().catch(() => {});
  };

  const markOneRead = (id: string, targetPath?: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setServerUnreadCount((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    notificationsApi.markAsRead(id).catch(() => {});
    if (targetPath?.startsWith('/')) {
      setNotifOpen(false);
      router.push(targetPath);
    }
  };


  return (
    <header className="sticky top-0 z-50 w-full bg-white shadow-sm border-b border-dark-200">
      {/* ── DESKTOP HEADER ── */}
      <div className="hidden lg:block">
        {/* Top Tier: Logo, Search, Actions */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-8 h-20">
            <Link href="/" className="flex-shrink-0 flex items-center gap-3 group">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <div className="flex flex-col justify-center">
                <span className="block text-base font-bold font-display text-dark-900 leading-tight">
                  Karthikeya Farmer Producer
                </span>
                <span className="block text-xs font-semibold text-brand-700 leading-tight">
                  Company Limited
                </span>
              </div>
            </Link>





            {/* Center: Large Modern Search Bar */}
            <div className="flex-1 max-w-2xl">
              <form className="relative flex w-full" onSubmit={handleSearch}>
                <input
                  type="text"
                  placeholder="Search products, suppliers, or categories..."
                  className="w-full h-11 pl-5 pr-12 text-sm rounded-l-lg border-y border-l border-dark-200 bg-dark-50 text-dark-900 placeholder-dark-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => window.setTimeout(() => setIsSearchFocused(false), 120)}
                />
                <button type="submit" aria-label="Search products" className="h-11 px-5 rounded-r-lg bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center transition-colors">
                  <Search className="h-5 w-5" />
                </button>
                {isSearchFocused && searchQuery.trim() && (
                  <ProductSearchSuggestions
                    query={searchQuery}
                    onSelect={() => setIsSearchFocused(false)}
                  />
                )}
              </form>
            </div>

            {/* Right: Actions & Auth */}
            <div className="flex items-center gap-4 flex-shrink-0">
              {/* RFQ Nav Link — buyers only */}
              {isClient && isAuthenticated && user?.role === 'buyer' && (
                <Link
                  href="/rfq"
                  className={cn(
                    'text-sm font-semibold transition-colors flex items-center gap-1.5 px-2',
                    pathname === '/rfq'
                      ? 'text-brand-700 underline underline-offset-[6px] decoration-2 decoration-brand-600'
                      : 'text-dark-700 hover:text-brand-700'
                  )}
                >
                  <FileText className="h-4 w-4" />
                  RFQ
                </Link>
              )}

              <button
                onClick={handleSellClick}
                className="text-sm font-semibold text-brand-700 hover:text-brand-800 transition-colors flex items-center gap-1.5 px-2 cursor-pointer focus:outline-none bg-transparent border-0"
              >
                <Building2 className="h-4 w-4" />
                Sell on KFPCL
              </button>

              <div className="h-6 w-px bg-dark-200"></div>

              <div className="flex items-center gap-1">
                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setNotifOpen((v) => !v)}
                    className="relative p-2 rounded-full text-dark-600 hover:text-dark-900 hover:bg-dark-50 transition-colors cursor-pointer"
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent-500 border border-white" />
                    )}
                  </button>

                  {/* Notification Dropdown */}
                  {notifOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-dark-100 bg-white shadow-xl overflow-hidden animate-slide-down z-50">
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-100 bg-dark-50/60">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4 text-dark-600" />
                          <span className="text-sm font-bold text-dark-900">Notifications</span>
                          {unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center h-4 px-1.5 rounded-full bg-brand-600 text-[10px] font-bold text-white">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllRead}
                            className="text-[10px] font-semibold text-brand-600 hover:text-brand-700 transition-colors cursor-pointer"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      {/* Notification List */}
                      <div className="max-h-80 overflow-y-auto divide-y divide-dark-50">
                        {notifications.length === 0 ? (
                          <p className="px-4 py-8 text-center text-xs text-dark-400">
                            No notifications yet.
                          </p>
                        ) : notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => markOneRead(notif.id, notif.targetPath)}
                            className={cn(
                              'flex gap-3 px-4 py-3 cursor-pointer transition-colors',
                              notif.read ? 'bg-white hover:bg-dark-50/50' : 'bg-brand-50/40 hover:bg-brand-50'
                            )}
                          >
                            <div className={cn('flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mt-0.5', notifIconColor[notif.type])}>
                              <NotifIcon name={notif.icon} className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <p className={cn('text-xs font-semibold text-dark-900 leading-tight truncate', !notif.read && 'font-bold')}>
                                  {notif.title}
                                </p>
                                {!notif.read && (
                                  <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-brand-500" />
                                )}
                              </div>
                              <p className="text-[11px] text-dark-500 leading-relaxed line-clamp-2">{notif.body}</p>
                              <p className="text-[10px] text-dark-400 mt-1 flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                {notif.time}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Footer */}
                      <div className="px-4 py-2.5 border-t border-dark-100 text-center">
                        <button
                          onClick={() => {
                            setNotifOpen(false);
                            router.push('/notifications');
                          }}
                          className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 transition-colors cursor-pointer"
                        >
                          View all notifications
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cart */}
                <Link
                  href="/cart"
                  className="relative p-2 rounded-full text-dark-600 hover:text-dark-900 hover:bg-dark-50 transition-colors"
                  aria-label="Shopping cart"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {itemCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white shadow-sm">
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                  )}
                </Link>
              </div>

              {/* Auth */}
              {isClient && isAuthenticated && user ? (
                <div className="relative ml-2">
                  <button
                    onClick={() => setProfileDropdown((v) => !v)}
                    aria-label="User account menu"
                    title={user.name}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-dark-200 hover:border-brand-300 hover:bg-brand-50 text-brand-700 transition-colors cursor-pointer"
                  >
                    <User className="h-5 w-5 text-brand-700" />
                  </button>

                  {profileDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-dark-100 bg-white shadow-xl py-2 animate-slide-down">
                      <div className="px-4 py-2 border-b border-dark-50 mb-1">
                        <p className="text-sm font-semibold text-dark-900 truncate">{user.name}</p>
                        <p className="text-xs text-dark-500 truncate">{user.phone}</p>
                      </div>
                      <Link
                        href="/profile"
                        onClick={() => setProfileDropdown(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-dark-700 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                      >
                        <User className="h-4 w-4" />
                        My Profile &amp; Account
                      </Link>
                      {user.role === 'buyer' ? (
                        <>
                          <Link
                            href="/orders"
                            onClick={() => setProfileDropdown(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-dark-700 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                          >
                            <ShoppingCart className="h-4 w-4" />
                            My Orders
                          </Link>
                        </>
                      ) : (
                        <Link
                          href="/supplier/dashboard"
                          onClick={() => setProfileDropdown(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-dark-700 hover:bg-brand-50 hover:text-brand-700 transition-colors font-medium text-brand-700"
                        >
                          <LayoutDashboard className="h-4 w-4" />
                          Supplier Dashboard
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : isClient ? (
                <div className="flex items-center gap-3 ml-2">
                  <Link
                    href="/login"
                    className={cn(
                      'text-sm font-semibold transition-colors',
                      pathname === '/login'
                        ? 'text-brand-700 underline underline-offset-[6px] decoration-2 decoration-brand-600'
                        : 'text-dark-700 hover:text-brand-700'
                    )}
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className={cn(
                      'text-sm font-semibold transition-colors',
                      pathname === '/register'
                        ? 'text-brand-700 underline underline-offset-[6px] decoration-2 decoration-brand-600'
                        : 'text-dark-700 hover:text-brand-700'
                    )}
                  >
                    Register
                  </Link>
                </div>
              ) : (
                <div className="h-10 w-32 bg-dark-50 rounded-lg animate-pulse ml-2" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE HEADER ── */}
      <div className="lg:hidden">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          {/* Logo (Mobile) */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-2 group min-w-0">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-600 to-brand-700 flex items-center justify-center shadow-sm flex-shrink-0">
              <Globe className="h-4 w-4 text-white" />
            </div>
            <div className="hidden sm:flex flex-col justify-center min-w-0">
              <span className="block text-xs font-bold font-display text-dark-900 leading-tight truncate">
                Karthikeya Farmer Producer
              </span>
              <span className="block text-[10px] font-semibold text-brand-700 leading-none">
                Company Limited
              </span>
            </div>
          </Link>


          {/* Right Mobile Actions — flex-shrink-0 ensures icons are never hidden or clipped */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => router.push('/products')}
              aria-label="Search products"
              className="p-2 text-dark-600 hover:bg-dark-50 rounded-full transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>
            {/* Notification Bell — always visible, navigates to /notifications on mobile */}
            <button
              type="button"
              onClick={() => router.push('/notifications')}
              aria-label="Notifications"
              className="relative p-2 text-dark-600 hover:bg-dark-50 rounded-full transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-red-500 text-[9px] font-black text-white leading-none z-10">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <Link
              href="/cart"
              className="relative p-2 text-dark-600 hover:bg-dark-50 rounded-full transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute top-0.5 right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white shadow-sm z-10">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>
            <button
              className="p-2 text-dark-900 hover:bg-dark-50 rounded-lg transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── MOBILE MENU ── */}
      {mobileOpen && (
        <div className="lg:hidden absolute top-16 left-0 w-full h-[calc(100vh-4rem)] bg-white border-t border-dark-100 overflow-y-auto animate-fade-in shadow-xl z-50">
          <div className="p-4 space-y-2">
            {/* Seller Action */}
            <button
              onClick={() => {
                setMobileOpen(false);
                handleSellClick();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors mb-4 cursor-pointer text-left focus:outline-none border-0"
            >
              <Building2 className="h-5 w-5" />
              Sell on KFPCL
            </button>

            {/* Auth Actions */}
            {!isAuthenticated ? (
              <div className="flex flex-col gap-3">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border text-base font-semibold transition-colors',
                    pathname === '/login'
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-dark-200 text-dark-800 hover:bg-dark-50'
                  )}
                >
                  <LogIn className="h-5 w-5" />
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border text-base font-semibold transition-colors',
                    pathname === '/register'
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-dark-200 text-dark-800 hover:bg-dark-50'
                  )}
                >
                  <UserPlus className="h-5 w-5" />
                  Register
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {user?.role && user.role !== 'buyer' && (
                  <Link
                    href="/supplier/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-brand-600 bg-brand-50 text-base font-semibold text-brand-700 hover:bg-brand-100 transition-colors"
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    Supplier Dashboard
                  </Link>
                )}
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-dark-200 text-base font-semibold text-dark-800 hover:bg-dark-50 transition-colors"
                >
                  <User className="h-5 w-5" />
                  My Profile &amp; Account
                </Link>
                {user?.role === 'buyer' && (
                  <>
                    <Link
                      href="/orders"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-dark-200 text-base font-semibold text-dark-800 hover:bg-dark-50 transition-colors"
                    >
                      <ShoppingCart className="h-5 w-5" />
                      My Orders
                    </Link>
                    <Link
                      href="/rfq"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-brand-200 bg-brand-50 text-base font-semibold text-brand-700 hover:bg-brand-100 transition-colors"
                    >
                      <FileText className="h-5 w-5" />
                      My RFQs
                    </Link>
                  </>
                )}
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-red-200 text-base font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── REGISTER AS SUPPLIER MODAL ── */}
      {rfqReplyAlert && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-dark-900/60 p-4 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rfq-reply-alert-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-dark-200 bg-white p-6 shadow-2xl animate-scale-up">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <Bell className="h-6 w-6" />
            </div>
            <h2 id="rfq-reply-alert-title" className="text-center text-lg font-bold font-display text-dark-900">
              Admin/Supplier replied to your RFQ.
            </h2>
            {rfqReplyAlert.body && (
              <p className="mt-2 text-center text-sm leading-relaxed text-dark-600">
                {rfqReplyAlert.body}
              </p>
            )}
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setRfqReplyAlert(null)}
                className="btn-secondary text-xs"
              >
                Later
              </button>
              <button
                type="button"
                onClick={() => {
                  markOneRead(rfqReplyAlert.id);
                  setRfqReplyAlert(null);
                  router.push(rfqReplyAlert.targetPath || '/rfq');
                }}
                className="btn-primary text-xs"
              >
                View RFQ
              </button>
            </div>
          </div>
        </div>
      )}

      {isSellModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-dark-200 overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-dark-100 bg-[#f8fafc]">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-brand-600" />
                <h3 className="font-bold text-dark-900 text-sm">Register as a Supplier</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSellModalOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-dark-100 text-dark-400 hover:text-dark-700 flex items-center justify-center transition-colors focus:outline-none border-0 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-dark-600 leading-relaxed">
                Connect with verified global buyers, respond to agricultural RFQs, and scale your commodity exports. Register a supplier account to list products on the Karthikeya Farmer Producer Company Limited marketplace.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSellModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-dark-600 hover:bg-dark-100 border border-dark-200 transition-colors focus:outline-none cursor-pointer"
                >
                  Cancel
                </button>
                <Link
                  href="/register?role=seller"
                  onClick={() => setIsSellModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-colors focus:outline-none text-center"
                >
                  Register Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
