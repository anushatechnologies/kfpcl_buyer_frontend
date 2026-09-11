import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  ArrowRight,
  Bell,
  CheckCheck,
  Clock,
  CreditCard,
  FileText,
  LoaderCircle,
  LogOut,
  MapPin,
  Menu,
  Package,
  Search,
  ShoppingBag,
  Truck,
  User,
  UserRound,
  X,
} from "lucide-react";
import { CART_BUMP_EVENT } from "../lib/cartAnimation";
import { openCartDrawer } from "./CartDrawer";
import { APP_COPY } from "../lib/config";
import { getRecentSearches, saveRecentSearch } from "../lib/customerExperience";
import { formatCurrency, getProductHref } from "../lib/storefrontUtils";
import { getProductSuggestions, getWalletBalance } from "../data/storefrontData";
import { useAuthStore } from "../store/authStore";
import { useAuthStore as useLegacyAuthStore } from "@/store/authStore";
import { useCartStore } from "../store/cartStore";
import { useLocationStore } from "../store/locationStore";
import { notificationsApi } from "@/api/notifications.api";
import type { ProductSuggestion } from "../types/storefront";

export interface AppNotification {
  id: string;
  type: "order" | "rfq" | "stock" | "payment" | "info";
  title: string;
  body: string;
  /** Raw ISO 8601 timestamp from the backend (e.g. "2025-09-11T09:30:00Z") */
  createdAt: string;
  read: boolean;
  targetPath?: string;
}

/** Returns the exact real time and date formatted for the user's local timezone (e.g., "Today, 10:45 AM" or "11 Sep, 10:45 AM"). */
function formatNotifTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";

  const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
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

  const dateStr = d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });

  return `${dateStr}, ${timeStr}`;
}

export function Navbar() {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const accountRef = useRef<HTMLDivElement>(null);
  const mobileAccountRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const mobileNotifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLElement>(null);

  const productCount = useCartStore((state) => state.getProductCount());
  const subtotal = useCartStore((state) => state.getSubtotal());
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const legacyUser = useLegacyAuthStore((state) => state.user);
  const legacyIsAuthenticated = useLegacyAuthStore((state) => state.isAuthenticated);
  const openAuthModal = useAuthStore((state) => state.openAuthModal);
  const logout = useAuthStore((state) => state.logout);

  const isAuthenticated = Boolean(session || (legacyIsAuthenticated && legacyUser));

  const customerLocation = useLocationStore((state) => state.location);
  const isResolvingLocation = useLocationStore((state) => state.isResolving);
  const requestCurrentLocation = useLocationStore((state) => state.requestCurrentLocation);

  const [query, setQuery] = useState("");
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [rfqReplyPopup, setRfqReplyPopup] = useState<AppNotification | null>(null);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [cartAnimationToken, setCartAnimationToken] = useState(0);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const customerMobile = session?.phoneNumber || profile?.phoneNumber || legacyUser?.phone || "";
  const customerDisplayName =
    (profile?.name || session?.name || legacyUser?.name || "").trim() ||
    (customerMobile ? `User ${customerMobile.slice(-4)}` : "Customer");
  const customerMeta = (profile?.email || session?.email || legacyUser?.email || customerMobile || "").trim();
  const customerInitial = (customerDisplayName.charAt(0) || "U").toUpperCase();

  const handleSignOut = async () => {
    setShowAccountMenu(false);
    setShowMobileNav(false);
    setShowNotifMenu(false);
    await logout();
    useLegacyAuthStore.getState().clearAuth();
    if (typeof window !== "undefined") {
      localStorage.removeItem("kfpcl_token");
      localStorage.removeItem("kfpcl.customer.session");
    }
  };

  const activeQueryFromUrl = useMemo(
    () => new URLSearchParams(routerLocation.search).get("q") || "",
    [routerLocation.search],
  );

  useEffect(() => {
    if (routerLocation.pathname === "/shop" && activeQueryFromUrl) {
      setQuery(activeQueryFromUrl);
      return;
    }

    setQuery("");
  }, [activeQueryFromUrl, routerLocation.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        accountRef.current &&
        !accountRef.current.contains(target) &&
        (!mobileAccountRef.current || !mobileAccountRef.current.contains(target))
      ) {
        setShowAccountMenu(false);
      }
      if (
        notifRef.current &&
        !notifRef.current.contains(target) &&
        (!mobileNotifRef.current || !mobileNotifRef.current.contains(target))
      ) {
        setShowNotifMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(target)) {
        setShowSearchSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setShowMobileNav(false);
    setShowAccountMenu(false);
    setShowNotifMenu(false);
    setShowSearchSuggestions(false);
    setSuggestions([]);
  }, [routerLocation.pathname, routerLocation.search]);

  // Load real notifications from backend API
  const loadNotifications = useCallback(async () => {
    try {
      const res = await notificationsApi.getNotifications(0, 20);
      const mapped: AppNotification[] = (res.content || []).map((item) => {
        const text = `${item.type} ${item.title} ${item.body}`.toLowerCase();
        let type: AppNotification["type"] = "info";
        if (text.includes("order")) type = "order";
        else if (text.includes("rfq") || text.includes("quote") || text.includes("supplier replied")) type = "rfq";
        else if (text.includes("stock") || text.includes("product")) type = "stock";
        else if (text.includes("pay") || text.includes("settle")) type = "payment";

        return {
          id: item.id,
          type,
          title: item.title,
          body: item.body,
          createdAt: item.createdAt || "",
          read: item.read,
          targetPath: item.targetPath,
        };
      });

      setNotifications(mapped);

      // Check for supplier replies to buyer's RFQ to show popup
      const unreadRfqReplies = mapped.filter(
        (n) => !n.read && (n.type === "rfq" || n.title.toLowerCase().includes("supplier replied"))
      );

      if (unreadRfqReplies.length > 0) {
        let shownPopups: string[] = [];
        try {
          shownPopups = JSON.parse(localStorage.getItem("kfpcl_shown_rfq_popups") || "[]");
        } catch {
          shownPopups = [];
        }

        const newReply = unreadRfqReplies.find((n) => !shownPopups.includes(n.id));
        if (newReply) {
          setRfqReplyPopup(newReply);
          toast.success("Supplier replied to your RFQ.", {
            description: newReply.body || newReply.title,
            duration: 8000,
            action: {
              label: "View Reply",
              onClick: () => {
                navigate("/notifications");
              },
            },
          });

          try {
            localStorage.setItem(
              "kfpcl_shown_rfq_popups",
              JSON.stringify([...shownPopups, newReply.id].slice(-100))
            );
          } catch {}
        }
      }
    } catch (err) {
      console.warn("Failed to load notifications", err);
    }
  }, [navigate]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setRfqReplyPopup(null);
      return;
    }

    void loadNotifications();
    const interval = window.setInterval(loadNotifications, 30000);
    const handleUpdate = () => {
      void loadNotifications();
    };
    window.addEventListener("kfpcl:notifications-updated", handleUpdate);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("kfpcl:notifications-updated", handleUpdate);
    };
  }, [isAuthenticated, loadNotifications]);

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setRfqReplyPopup(null);
    notificationsApi.markAllAsRead().catch(() => {});
  };

  const handleNotificationClick = (notif: AppNotification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    if (rfqReplyPopup?.id === notif.id) {
      setRfqReplyPopup(null);
    }
    notificationsApi.markAsRead(notif.id).catch(() => {});
    setShowNotifMenu(false);
    if (notif.targetPath) {
      navigate(notif.targetPath);
    } else {
      navigate("/notifications");
    }
  };

  useEffect(() => {
    const keyword = query.trim();

    if (!showSearchSuggestions) return;
    if (!keyword) {
      setSuggestions([]);
      setIsSearchingSuggestions(false);
      return;
    }

    let isMounted = true;
    setIsSearchingSuggestions(true);

    const timeout = window.setTimeout(() => {
      getProductSuggestions(keyword)
        .then((nextSuggestions) => {
          if (isMounted) {
            setSuggestions(nextSuggestions);
          }
        })
        .catch(() => {
          if (isMounted) {
            setSuggestions([]);
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsSearchingSuggestions(false);
          }
        });
    }, 180);

    return () => {
      isMounted = false;
      window.clearTimeout(timeout);
    };
  }, [query, showSearchSuggestions]);

  useEffect(() => {
    const handleCartBump = () => {
      setCartAnimationToken((current) => current + 1);
    };

    window.addEventListener(CART_BUMP_EVENT, handleCartBump);
    return () => window.removeEventListener(CART_BUMP_EVENT, handleCartBump);
  }, []);

  useEffect(() => {
    if (!session?.accessToken || !session.customerId) {
      setWalletBalance(null);
      return;
    }

    if (session.accessToken.startsWith("demo-")) {
      setWalletBalance(session.walletBalance ?? 0);
      return;
    }

    let isMounted = true;
    getWalletBalance(session.customerId)
      .then((balance) => {
        if (isMounted) {
          setWalletBalance(balance);
        }
      })
      .catch(() => {
        if (isMounted) {
          setWalletBalance(session.walletBalance ?? null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [session?.accessToken, session?.customerId, session?.walletBalance]);

  const handleSearchSubmit = (nextKeyword?: string) => {
    const keyword = (nextKeyword ?? query).trim();
    setShowSearchSuggestions(false);
    setSuggestions([]);
    if (!keyword) {
      navigate("/shop");
      return;
    }
    saveRecentSearch(keyword);
    setRecentSearches(getRecentSearches());
    navigate(`/shop?q=${encodeURIComponent(keyword)}`);
  };

  const handleSuggestionSelect = (suggestion: ProductSuggestion) => {
    setQuery(suggestion.name);
    setShowSearchSuggestions(false);
    navigate(getProductHref({ id: suggestion.id, name: suggestion.name }));
  };

  const links = useMemo(
    () => [
      { to: "/", label: "Home" },
      { to: "/shop", label: "Catalog" },
      { to: "/rfq", label: "RFQ" },
      { to: "/about", label: "About" },
      { to: "/contact", label: "Support" },
    ],
    [],
  );

  const isActiveLink = (path: string) =>
    path === "/"
      ? routerLocation.pathname === path
      : routerLocation.pathname === path || routerLocation.pathname.startsWith(`${path}/`);

  const locationLabel = customerLocation.shortLabel || `${APP_COPY.defaultCity}, ${APP_COPY.defaultState}`;
  const trimmedQuery = query.trim();
  const trendingSearches = ["milk", "bread", "rice", "fruits", "snacks", "oil"];
  const showSuggestionPanel = showSearchSuggestions && (trimmedQuery.length > 0 || isSearchingSuggestions || recentSearches.length > 0);

  const suggestionsDropdownInner = (
    <div className="flex flex-col bg-white">

      {!trimmedQuery && recentSearches.length > 0 ? (
        <div className="border-b border-[#EEF2F7] bg-white px-4 py-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B7B94]">
            Recent searches
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {recentSearches.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => {
                  setQuery(item);
                  handleSearchSubmit(item);
                }}
                className="rounded-full border border-[#E2E8F0] bg-[#F8FAFD] px-3 py-2 text-xs font-semibold text-[#0A1628]"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!trimmedQuery ? (
        <div className="border-b border-[#EEF2F7] bg-white px-4 py-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B7B94]">
            Trending searches
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {trendingSearches.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => {
                  setQuery(item);
                  handleSearchSubmit(item);
                }}
                className="rounded-full bg-[#E6F4F0] px-3 py-2 text-xs font-semibold text-[#0A4D3C] hover:bg-[#D4EAE3] transition-colors"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {isSearchingSuggestions ? (
        <div className="flex items-center gap-2 bg-white px-4 py-5 text-sm text-[#6B7B94]">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Looking for matching products...
        </div>
      ) : suggestions.length > 0 ? (
        <div className="max-h-[440px] space-y-2 overflow-y-auto bg-white p-2.5">
          {suggestions.map((suggestion) => (
            <button
              type="button"
              key={suggestion.id}
              onClick={() => handleSuggestionSelect(suggestion)}
              className="group grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-[1.35rem] border border-[#E2E8F0] bg-white p-3 text-left shadow-[0_5px_16px_rgba(10,22,40,0.03)] transition duration-200 hover:-translate-y-0.5 hover:border-[#0A4D3C]/30 hover:shadow-[0_12px_24px_rgba(10,22,40,0.08)] sm:grid-cols-[auto_minmax(0,1fr)_auto]"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border border-[#EEF2F7] bg-[#F0F7F5]">
                {suggestion.imageUrl ? (
                  <img src={suggestion.imageUrl} alt={suggestion.name} className="h-full w-full object-cover transition duration-200 group-hover:scale-105" />
                ) : (
                  <Search className="h-4 w-4 text-[#6B7B94]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-bold text-[#0A1628]">{suggestion.name}</div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.11em]">
                  {suggestion.variantName ? (
                    <span className="rounded-full border border-[#E2E8F0] bg-[#F0F3F8] px-2.5 py-1 text-[#3A4D6B]">
                      {suggestion.variantName}
                    </span>
                  ) : null}
                  <span className={`rounded-full px-2.5 py-1 ${suggestion.isInStock ? "bg-[#E6F4F0] text-[#0A4D3C]" : "bg-[#FEF2F2] text-[#DC2626]"}`}>
                    {suggestion.isInStock ? "In stock" : "Out of stock"}
                  </span>
                </div>
                <div className="mt-1.5 truncate text-[11px] uppercase tracking-[0.12em] text-[#94A3B8]">
                  {[suggestion.categoryName, suggestion.subCategoryName].filter(Boolean).join(" › ")}
                </div>
              </div>
              <div className="col-span-2 flex items-center justify-between rounded-xl bg-[#F8FAFD] px-3 py-2 sm:col-span-1 sm:min-w-[132px] sm:flex-col sm:items-end sm:bg-transparent sm:px-2 sm:py-0 sm:text-right">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7B94]">Pack price</div>
                <div className="flex items-baseline gap-2 sm:mt-1 sm:justify-end">
                  <span className="text-lg font-extrabold text-[#0A1628]">{formatCurrency(suggestion.price)}</span>
                  {suggestion.originalPrice > suggestion.price ? (
                    <span className="text-xs text-[#94A3B8] line-through">{formatCurrency(suggestion.originalPrice)}</span>
                  ) : null}
                </div>
                {suggestion.discountPercent > 0 ? (
                  <span className="mt-1 rounded-full bg-[#FEF7E8] px-2 py-0.5 text-[10px] font-bold text-[#B8860B]">
                    {suggestion.discountPercent}% OFF
                  </span>
                ) : null}
              </div>
            </button>
          ))}

          <button
            type="button"
            onClick={() => handleSearchSubmit()}
            className="mt-2 flex w-full items-center justify-center rounded-[1.35rem] border border-[#E2E8F0] bg-[#F8FAFD] px-4 py-3 text-sm font-semibold text-[#0A4D3C] transition hover:bg-[#E6F4F0]"
          >
            See all results for "{trimmedQuery}"
          </button>
        </div>
      ) : trimmedQuery ? (
        <div className="bg-white px-4 py-5 text-sm text-[#6B7B94]">
          No instant matches yet. Smart search will still check spellings and local keywords for "{trimmedQuery}".
        </div>
      ) : null}
    </div>
  );

  const notificationDropdownContent = (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3 bg-[#F8FAFC]/90 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[#0A4D3C]" />
          <span className="text-sm font-bold text-[#0A1628]">Notifications</span>
          {unreadCount > 0 && (
            <span className="inline-flex h-5 items-center justify-center rounded-full bg-[#0A4D3C] px-2 text-[11px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0A4D3C] hover:text-[#083a2d] transition-colors cursor-pointer"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-[#F1F5F9]">
        {notifications.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Bell className="mx-auto h-8 w-8 text-[#94A3B8] opacity-50 mb-2" />
            <p className="text-xs font-medium text-[#64748B]">No notifications yet</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const iconConfig = {
              order: { bg: "bg-emerald-50", text: "text-emerald-600", Icon: ShoppingBag },
              rfq: { bg: "bg-blue-50", text: "text-blue-600", Icon: FileText },
              stock: { bg: "bg-amber-50", text: "text-amber-600", Icon: Package },
              payment: { bg: "bg-green-50", text: "text-green-600", Icon: CreditCard },
              info: { bg: "bg-purple-50", text: "text-purple-600", Icon: Bell },
            }[notif.type] || { bg: "bg-slate-50", text: "text-slate-600", Icon: Bell };

            const IconComponent = iconConfig.Icon;

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  notif.read ? "bg-white hover:bg-[#F8FAFC]" : "bg-[#F0FDF4]/60 hover:bg-[#F0FDF4]"
                }`}
              >
                <div className={`flex-shrink-0 mt-0.5 h-8 w-8 rounded-full flex items-center justify-center ${iconConfig.bg} ${iconConfig.text}`}>
                  <IconComponent className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <p className={`text-xs leading-tight truncate ${notif.read ? "font-semibold text-[#1E293B]" : "font-bold text-[#0F172A]"}`}>
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span className="flex-shrink-0 h-2 w-2 rounded-full bg-[#0A4D3C]" />
                    )}
                  </div>
                  <p className="text-[11px] text-[#64748B] leading-relaxed line-clamp-2">
                    {notif.body}
                  </p>
                  {notif.createdAt && (
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-[#94A3B8]">
                      <Clock className="h-2.5 w-2.5" />
                      {formatNotifTime(notif.createdAt)}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#E2E8F0] p-2.5 bg-[#F8FAFC]/80 text-center rounded-b-2xl">
        <button
          type="button"
          onClick={() => {
            setShowNotifMenu(false);
            navigate("/notifications");
          }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A4D3C] hover:text-[#083a2d] transition-colors py-1 cursor-pointer"
        >
          View all in Notifications
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );

  const accountDropdownContent = (
    <div className="flex flex-col">
      {/* Top Header Card: Name & Mobile */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-[linear-gradient(180deg,#FAFBFD,#F0F3F8)] p-3.5 mb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0A4D3C] text-sm font-bold text-white shadow-sm">
            {customerInitial}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-sans text-sm font-bold text-[#0A1628]">{customerDisplayName}</h3>
            <p className="truncate text-xs text-[#6B7B94] font-medium">{customerMobile || customerMeta || "Verified Account"}</p>
          </div>
        </div>
      </div>

      {/* Menu Options: My Profile, Sign Out */}
      <div className="flex flex-col gap-1">
        <Link
          to="/account?tab=profile"
          onClick={() => setShowAccountMenu(false)}
          className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#0A1628] transition hover:bg-[#F0F7F4] hover:text-[#0A4D3C]"
        >
          <User className="h-4 w-4 text-[#0A4D3C]" />
          <span>My Profile</span>
        </Link>

        <div className="my-1 border-t border-[#EEF2F7]" />

        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 text-left cursor-pointer"
        >
          <LogOut className="h-4 w-4 text-red-600" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <header ref={searchRef} className="sticky top-0 z-40 border-b border-[#E2E8F0]/70 bg-white/90 backdrop-blur-2xl transition-colors duration-300">
      <div className="app-shell !py-3">
        <div className="flex flex-col gap-3">
          <div className="relative z-20 flex items-center justify-between gap-4">
            
            {/* Left section: Logo, Name, Compact Location for desktop */}
            <div className="flex shrink-0 items-center gap-2 sm:gap-3 min-w-0">
              <Link to="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
                <img
                  src="/images/image-logo.png"
                  alt={APP_COPY.brand}
                  className="h-9 w-9 rounded-xl border border-[#E2E8F0]/80 bg-white object-cover shadow-sm sm:h-11 sm:w-11 flex-shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-sans text-base sm:text-lg md:text-xl font-extrabold tracking-tight text-[#0A1628] leading-tight truncate">
                    {APP_COPY.brand}
                  </div>
                  <div className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-[#6B7B94] leading-none truncate">
                    Everyday Fresh
                  </div>
                </div>
              </Link>
            </div>

            {/* Desktop Search Bar (Center Row 1) */}
            <div className="relative hidden lg:block flex-1 min-w-[260px] max-w-[500px] xl:max-w-[660px] 2xl:max-w-[800px]">
              <div
                className={`flex items-center rounded-full border bg-white px-4 py-2 shadow-[0_1px_2px_rgba(10,22,40,0.02)] transition-all duration-300 ${
                  showSearchSuggestions
                    ? "border-[#0A4D3C] ring-2 ring-[#0A4D3C]/5"
                    : "border-[#E2E8F0] hover:border-[#CBD5E1]"
                }`}
              >
                <Search className="mr-2.5 h-4 w-4 text-[#94A3B8] shrink-0" />
                <input
                  type="text"
                  value={query}
                  onFocus={() => setShowSearchSuggestions(true)}
                  onClick={() => setRecentSearches(getRecentSearches())}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setShowSearchSuggestions(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleSearchSubmit();
                    }
                    if (event.key === "Escape") {
                      setShowSearchSuggestions(false);
                    }
                  }}
                  placeholder="Search milk, rice, snacks..."
                  className="w-full bg-transparent text-xs sm:text-sm text-[#1A2332] outline-none placeholder:text-[#94A3B8]"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => handleSearchSubmit()}
                    className="ml-1.5 inline-flex shrink-0 items-center justify-center rounded-full bg-[#0A4D3C]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0A4D3C] hover:bg-[#0A4D3C]/20"
                  >
                    Go
                  </button>
                )}
              </div>

              {/* Suggestions Panel for Desktop */}
              <AnimatePresence>
                {showSearchSuggestions && showSuggestionPanel ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_12px_30px_rgba(10,22,40,0.08)]"
                  >
                    {suggestionsDropdownInner}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Desktop Actions & Nav Links (Right Row 1) */}
            <div className="hidden items-center gap-4 lg:flex shrink-0">
              <nav className="flex items-center gap-4">
                {links.slice(0, 3).map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`text-xs font-bold uppercase tracking-wider transition-colors duration-200 ${
                      isActiveLink(link.to) ? "text-[#0A4D3C]" : "text-[#3A4D6B] hover:text-[#0A4D3C]"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="h-4 w-px bg-[#E2E8F0]" />

              {/* Desktop Notification Bell */}
              <div ref={notifRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifMenu((val) => !val);
                    setShowAccountMenu(false);
                  }}
                  aria-label="Notifications"
                  title="Notifications"
                  className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#D1DDD8] bg-[#F0F7F4] text-[#0A4D3C] shadow-xs hover:border-[#0A4D3C] hover:bg-[#E2F0EA] transition-all duration-200 focus:outline-none cursor-pointer"
                >
                  <Bell className="h-4 w-4 text-[#0A4D3C]" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E11D48] px-1 text-[10px] font-bold text-white shadow-xs ring-2 ring-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifMenu ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 top-[calc(100%+0.65rem)] z-[60] w-80 sm:w-96 rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_20px_45px_rgba(10,22,40,0.15)] overflow-hidden"
                    >
                      {notificationDropdownContent}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              {/* User Account / Sign in */}
              <div ref={accountRef} className="relative">
                {isAuthenticated ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAccountMenu((value) => !value);
                        setShowNotifMenu(false);
                      }}
                      aria-label="User account menu"
                      title={customerDisplayName}
                      className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#D1DDD8] bg-[#F0F7F4] text-[#0A4D3C] shadow-xs hover:border-[#0A4D3C] hover:bg-[#E2F0EA] transition-all duration-200 focus:outline-none cursor-pointer"
                    >
                      <UserRound className="h-5 w-5 text-[#0A4D3C]" />
                    </button>

                    <AnimatePresence>
                      {showAccountMenu ? (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 top-[calc(100%+0.65rem)] z-[60] w-64 rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-[0_20px_45px_rgba(10,22,40,0.15)]"
                        >
                          {accountDropdownContent}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={openAuthModal}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3A4D6B] hover:text-[#0A4D3C] transition-colors duration-200 cursor-pointer"
                  >
                    <UserRound className="h-4 w-4 text-[#0A4D3C]" />
                    Sign in
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Actions: Notifications & Menu trigger */}
            <div className="flex items-center gap-2 lg:hidden">
              {/* Mobile Notification Bell */}
              <div ref={mobileNotifRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifMenu((val) => !val);
                    setShowMobileNav(false);
                  }}
                  aria-label="Notifications"
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0A1628] shadow-xs hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                >
                  <Bell className="h-4 w-4 text-[#0A4D3C]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E11D48] px-1 text-[9px] font-bold text-white shadow-xs ring-2 ring-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifMenu ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="fixed inset-x-2.5 top-16 z-[70] max-w-[calc(100vw-1.25rem)] mx-auto rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_20px_50px_rgba(10,22,40,0.22)] overflow-hidden sm:absolute sm:inset-auto sm:right-0 sm:top-[calc(100%+0.65rem)] sm:w-88"
                    >
                      {notificationDropdownContent}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              {/* Mobile Menu Hamburger */}
              <button
                type="button"
                onClick={() => {
                  setShowMobileNav((value) => !value);
                  setShowNotifMenu(false);
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0A1628]"
              >
                {showMobileNav ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>

          </div>

          {/* Mobile Search and Location Area (Only on Mobile & Tablet) */}
          <div className="flex flex-col gap-2 lg:hidden w-full">
            <div className="relative w-full">
              <div
                className={`flex items-center rounded-full border bg-white px-4 py-2 sm:py-2.5 shadow-[0_1px_2px_rgba(10,22,40,0.02)] transition-all duration-300 w-full ${
                  showSearchSuggestions
                    ? "border-[#0A4D3C] ring-2 ring-[#0A4D3C]/5"
                    : "border-[#E2E8F0]"
                }`}
              >
                <Search className="mr-2.5 h-4 w-4 text-[#94A3B8] flex-shrink-0" />
                <input
                  type="text"
                  value={query}
                  onFocus={() => setShowSearchSuggestions(true)}
                  onClick={() => setRecentSearches(getRecentSearches())}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setShowSearchSuggestions(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleSearchSubmit();
                    }
                    if (event.key === "Escape") {
                      setShowSearchSuggestions(false);
                    }
                  }}
                  placeholder="Search milk, rice, snacks..."
                  className="w-full min-w-0 bg-transparent text-xs sm:text-sm text-[#1A2332] outline-none placeholder:text-[#94A3B8]"
                />
                <button
                  type="button"
                  onClick={() => handleSearchSubmit()}
                  className="flex-shrink-0 inline-flex items-center justify-center rounded-full bg-[#0A4D3C]/10 px-3 py-1 sm:px-3.5 sm:py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#0A4D3C] hover:bg-[#0A4D3C]/20"
                >
                  Go
                </button>
              </div>

              {/* Suggestions Panel for Mobile */}
              <AnimatePresence>
                {showSearchSuggestions && showSuggestionPanel ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-[1.8rem] border border-[#E2E8F0] bg-white shadow-[0_12px_30px_rgba(10,22,40,0.08)]"
                  >
                    {suggestionsDropdownInner}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Mobile Location Selector */}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => void requestCurrentLocation()}
                className="inline-flex min-w-0 flex-1 items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3.5 py-2 text-left shadow-sm"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E6F4F0] text-[#0A4D3C]">
                  {isResolvingLocation ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0">
                  <div className="text-[8px] uppercase tracking-[0.18em] text-[#6B7B94] leading-none">Deliver to</div>
                  <div className="truncate text-xs font-semibold text-[#0A1628]">{locationLabel}</div>
                </div>
              </button>

              {isAuthenticated ? (
                <div ref={mobileAccountRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAccountMenu((value) => !value);
                      setShowNotifMenu(false);
                    }}
                    aria-label="User account menu"
                    title={customerDisplayName}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D1DDD8] bg-[#F0F7F4] text-[#0A4D3C] shadow-xs cursor-pointer"
                  >
                    <UserRound className="h-5 w-5 text-[#0A4D3C]" />
                  </button>

                  <AnimatePresence>
                    {showAccountMenu ? (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute right-0 top-[calc(100%+0.5rem)] z-[60] w-64 rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-xl"
                      >
                        {accountDropdownContent}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openAuthModal}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-[#E2E8F0] bg-white px-4 text-xs font-bold text-[#0A1628] cursor-pointer"
                >
                  Sign in
                </button>
              )}
            </div>
          </div>

          {/* Mobile Side Navigation Menu (Hamburger menu links) */}
          <AnimatePresence>
            {showMobileNav ? (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="grid gap-2 rounded-[1.8rem] border border-[#E2E8F0] bg-white/90 p-4 lg:hidden"
              >
                {links.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      isActiveLink(link.to)
                        ? "bg-[#0A4D3C] text-white"
                        : "bg-[#F8FAFD] text-[#3A4D6B] hover:bg-[#EEF2F7]"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}

                {isAuthenticated ? (
                  <>
                    <div className="rounded-2xl border border-[#E2E8F0] bg-[linear-gradient(180deg,#FAFBFD,#F0F3F8)] p-3 mb-1">
                      <p className="text-sm font-bold text-[#0A1628]">{customerDisplayName}</p>
                      <p className="text-xs text-[#6B7B94] font-medium">{customerMobile || customerMeta || "Verified Account"}</p>
                    </div>
                    <Link
                      to="/account?tab=profile"
                      onClick={() => setShowMobileNav(false)}
                      className="flex items-center gap-2.5 rounded-2xl bg-[#F8FAFD] px-4 py-3 text-sm font-semibold text-[#3A4D6B] hover:bg-[#EEF2F7]"
                    >
                      <User className="h-4 w-4 text-[#0A4D3C]" />
                      My Profile
                    </Link>
                    <Link
                      to="/account?tab=orders"
                      onClick={() => setShowMobileNav(false)}
                      className="flex items-center gap-2.5 rounded-2xl bg-[#F8FAFD] px-4 py-3 text-sm font-semibold text-[#3A4D6B] hover:bg-[#EEF2F7]"
                    >
                      <ShoppingBag className="h-4 w-4 text-[#0A4D3C]" />
                      My Orders
                    </Link>
                    <Link
                      to="/account?tab=rfqs"
                      onClick={() => setShowMobileNav(false)}
                      className="flex items-center gap-2.5 rounded-2xl bg-[#F8FAFD] px-4 py-3 text-sm font-semibold text-[#3A4D6B] hover:bg-[#EEF2F7]"
                    >
                      <FileText className="h-4 w-4 text-[#0A4D3C]" />
                      My RFQs
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 text-red-600 px-4 py-3 text-left text-sm font-semibold hover:bg-red-100 cursor-pointer"
                    >
                      <LogOut className="h-4 w-4 text-red-600" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileNav(false);
                      openAuthModal();
                    }}
                    className="flex items-center justify-center rounded-2xl bg-[#0A4D3C] text-white px-4 py-3 text-sm font-bold cursor-pointer"
                  >
                    Sign in
                  </button>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Supplier RFQ Reply Popup Alert */}
      <AnimatePresence>
        {rfqReplyPopup ? (
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.95 }}
            className="fixed top-20 right-4 z-[9999] w-[90vw] max-w-sm rounded-2xl border-2 border-[#0A4D3C] bg-white p-4 shadow-[0_25px_60px_rgba(10,22,40,0.25)] backdrop-blur-md"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E6F4F0] text-[#0A4D3C]">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="inline-flex items-center rounded-md bg-[#E6F4F0] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#0A4D3C]">
                    RFQ Reply
                  </span>
                  <button
                    type="button"
                    onClick={() => setRfqReplyPopup(null)}
                    className="rounded-full p-1 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <h4 className="text-xs font-bold text-[#0A1628] mt-1.5">
                  Supplier replied to your RFQ.
                </h4>
                <p className="text-[11px] text-[#64748B] leading-relaxed line-clamp-2 mt-1">
                  {rfqReplyPopup.body}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRfqReplyPopup(null);
                      handleNotificationClick(rfqReplyPopup);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#0A4D3C] px-3 py-1.5 text-xs font-bold text-[#D4A853] shadow-xs hover:bg-[#083a2d] transition-colors"
                  >
                    View in Notifications
                    <ArrowRight className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRfqReplyPopup(null)}
                    className="rounded-xl px-2.5 py-1.5 text-xs font-medium text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
