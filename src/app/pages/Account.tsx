import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  LoaderCircle,
  LocateFixed,
  MapPin,
  PackageCheck,
  Phone,
  RefreshCcw,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
  Truck,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { APP_COPY } from "../lib/config";
import { downloadInvoicePdf } from "../lib/customerExperience";
import { formatPaymentMethodLabel } from "../lib/storefrontUtils";
import {
  deleteAddress,
  getAddresses,
  getDeliveryRatingStatus,
  getOrderTracking,
  getOrders,
  getProductById,
  getWalletBalance,
  getWalletHistory,
  requestRefund,
  saveAddress,
  submitDeliveryRating,
} from "../data/storefrontData";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";
import { BuyerRFQDashboard } from "../components/BuyerRFQDashboard";
import type { Address, OrderTracking, PlacedOrder, Product, Variant } from "../types/storefront";

type AccountTab = "overview" | "orders" | "rfqs" | "addresses" | "tracking";

const accountTabs: AccountTab[] = ["overview", "orders", "rfqs", "addresses", "tracking"];

const toTitleCase = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const normalizeOrderStatus = (value?: string) => (value || "PENDING").trim().toUpperCase().replace(/[\s-]+/g, "_");

const isTrackableStatus = (value?: string) => {
  const status = normalizeOrderStatus(value);
  return !["DELIVERED", "CANCELLED", "STORE_REJECTED", "REJECTED"].includes(status);
};

const formatOrderDate = (value?: string) => {
  if (!value) return "Recently updated";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently updated";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatTrackingUpdate = (value?: string) => {
  if (!value) return "Waiting for the next delivery update";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Waiting for the next delivery update";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatAddressSummary = (address?: Address | PlacedOrder["address"] | null) =>
  [
    address?.flatNumber,
    address?.addressLine1,
    address?.addressLine2,
    address?.landmark,
    address?.city,
    address?.state,
    address?.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

const statusTone = (value?: string) => {
  const status = normalizeOrderStatus(value);

  if (["DELIVERED", "COMPLETED"].includes(status)) {
    return {
      label: "Delivered",
      className: "border-[#C2E0D4] bg-[#F2F8F5] text-[#0A4D3C]",
    };
  }

  if (["CANCELLED", "STORE_REJECTED", "REJECTED"].includes(status)) {
    return {
      label: status === "STORE_REJECTED" ? "Store rejected" : "Cancelled",
      className: "border-[#F5D5D0] bg-[#FEF2F2] text-[#DC2626]",
    };
  }

  if (["OUT_FOR_DELIVERY", "EN_ROUTE_TO_CUSTOMER"].includes(status)) {
    return {
      label: "Out for delivery",
      className: "border-[#F0E6D2] bg-[#FCF8F0] text-[#D4A853]",
    };
  }

  if (["RIDER_ASSIGNED", "ASSIGNED", "BROADCASTED_TO_RIDERS", "REACHED_STORE", "EN_ROUTE_TO_STORE", "PICKED_UP", "PICKUP_OTP_VERIFIED"].includes(status)) {
    return {
      label: "Rider assigned",
      className: "border-[#F0E6D2] bg-[#FCF8F0] text-[#D4A853]",
    };
  }

  if (["STORE_ACCEPTED", "ACCEPTED", "CONFIRMED", "PROCESSING", "PACKED", "READY", "PICKUP_OTP_GENERATED", "STORE_NOTIFIED"].includes(status)) {
    return {
      label: "Store confirmed",
      className: "border-[#E5ECE9] bg-[#F4F7F5] text-[#0A4D3C]",
    };
  }

  return {
    label: toTitleCase(status),
    className: "border-[#E2E8F0] bg-[#F8FAFD] text-[#6B7B94]",
  };
};

const getTrackingStepIndex = (value?: string) => {
  const status = normalizeOrderStatus(value);

  if (["DELIVERED", "COMPLETED"].includes(status)) return 4;
  if (["OUT_FOR_DELIVERY", "EN_ROUTE_TO_CUSTOMER"].includes(status)) return 3;
  if (["RIDER_ASSIGNED", "ASSIGNED", "BROADCASTED_TO_RIDERS", "REACHED_STORE", "EN_ROUTE_TO_STORE", "PICKED_UP", "PICKUP_OTP_VERIFIED"].includes(status)) return 2;
  if (["STORE_ACCEPTED", "ACCEPTED", "CONFIRMED", "PROCESSING", "PACKED", "READY", "PICKUP_OTP_GENERATED", "STORE_NOTIFIED"].includes(status)) return 1;
  return 0;
};

const buildFallbackVariant = (item: PlacedOrder["items"][number]): Variant => ({
  id: item.variantId,
  name: item.variantName || "Standard pack",
  price: item.unitPrice,
  stock: 999,
  isActive: true,
});

const buildFallbackProduct = (item: PlacedOrder["items"][number]): Product => {
  const fallbackVariant = buildFallbackVariant(item);

  return {
    id: item.productId,
    name: item.productName,
    description: "",
    isActive: true,
    isTrending: false,
    bestSeller: false,
    displayOrder: 0,
    imageUrl: item.imageUrl || "",
    videoUrl: null,
    categoryId: null,
    categoryName: "",
    subCategoryId: null,
    subCategoryName: "",
    storeId: null,
    storeName: item.storeName || "",
    images: item.imageUrl ? [{ id: -1, imageUrl: item.imageUrl }] : [],
    variants: [fallbackVariant],
    minPrice: item.unitPrice,
    maxPrice: item.unitPrice,
    primaryVariant: fallbackVariant,
    discountPercent: 0,
    hasDiscount: false,
    isInStock: true,
  };
};

export function Account() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const openAuthModal = useAuthStore((state) => state.openAuthModal);
  const addItem = useCartStore((state) => state.addItem);

  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [tracking, setTracking] = useState<OrderTracking | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletHistory, setWalletHistory] = useState<Array<{ id?: number; amount: number; type?: string; description?: string; createdAt?: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [reorderingOrderId, setReorderingOrderId] = useState<number | null>(null);
  const [refundOrderId, setRefundOrderId] = useState<number | null>(null);
  const [ratingOrderId, setRatingOrderId] = useState<number | null>(null);
  const [ratingModal, setRatingModal] = useState<PlacedOrder | null>(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [deletingAddressId, setDeletingAddressId] = useState<number | null>(null);
  const [defaultingAddressId, setDefaultingAddressId] = useState<number | null>(null);

  const activeTab = useMemo<AccountTab>(() => {
    const tab = searchParams.get("tab");
    return accountTabs.includes(tab as AccountTab) ? (tab as AccountTab) : "overview";
  }, [searchParams]);

  const selectedTrackingOrderId = Number(searchParams.get("order") || "");
  const customerName = profile?.name || session?.name || "Customer";

  const updateSearch = (nextValues: Partial<Record<"tab" | "order", string | null>>) => {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(nextValues).forEach(([key, value]) => {
      if (value) {
        nextParams.set(key, value);
      } else {
        nextParams.delete(key);
      }
    });

    setSearchParams(nextParams, { replace: true });
  };

  const loadCustomerData = async (silent = false) => {
    if (!session?.accessToken) {
      setOrders([]);
      setAddresses([]);
      setTracking(null);
      setWalletBalance(null);
      setWalletHistory([]);
      setIsLoading(false);
      return;
    }

    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const [nextOrders, nextAddresses, nextWalletBalance, nextWalletHistory] = await Promise.all([
        getOrders(),
        getAddresses(),
        session.customerId ? getWalletBalance(session.customerId).catch(() => null) : Promise.resolve(null),
        session.customerId ? getWalletHistory(session.customerId).catch(() => []) : Promise.resolve([]),
      ]);

      setOrders(
        [...nextOrders].sort(
          (left, right) =>
            new Date(right.placedAt || right.createdAt || 0).getTime() -
            new Date(left.placedAt || left.createdAt || 0).getTime(),
        ),
      );
      setAddresses(
        [...nextAddresses].sort((left, right) => Number(Boolean(right.isDefault)) - Number(Boolean(left.isDefault))),
      );
      setWalletBalance(nextWalletBalance);
      setWalletHistory(nextWalletHistory);
    } catch (error: any) {
      toast.error(error?.message || "Unable to load your account right now.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!session?.accessToken) {
      navigate("/", { replace: true });
    } else {
      void loadCustomerData();
    }
  }, [session?.accessToken, navigate]);

  const activeOrders = useMemo(
    () => orders.filter((order) => isTrackableStatus(order.status || order.orderStatus)),
    [orders],
  );

  const defaultAddress = useMemo(
    () => addresses.find((address) => address.isDefault) || addresses[0] || null,
    [addresses],
  );

  const selectedTrackingOrder = useMemo(
    () => orders.find((order) => order.id === selectedTrackingOrderId) || activeOrders[0] || orders[0] || null,
    [activeOrders, orders, selectedTrackingOrderId],
  );

  useEffect(() => {
    if (activeTab !== "tracking" || !selectedTrackingOrder?.orderNumber || !session?.accessToken) {
      setTracking(null);
      setIsTrackingLoading(false);
      return;
    }

    let isMounted = true;

    const loadTracking = async (silent = false) => {
      if (!silent) {
        setIsTrackingLoading(true);
      }

      try {
        const nextTracking = await getOrderTracking(selectedTrackingOrder.orderNumber);
        if (isMounted) {
          setTracking(nextTracking);
        }
      } catch {
        if (isMounted) {
          setTracking(null);
        }
      } finally {
        if (isMounted) {
          setIsTrackingLoading(false);
        }
      }
    };

    void loadTracking();

    if (!isTrackableStatus(selectedTrackingOrder.status || selectedTrackingOrder.orderStatus)) {
      return () => {
        isMounted = false;
      };
    }

    const interval = window.setInterval(() => {
      void loadTracking(true);
      void loadCustomerData(true);
    }, 12000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [activeTab, selectedTrackingOrder?.orderNumber, selectedTrackingOrder?.status, session?.accessToken]);

  const handleReorder = async (order: PlacedOrder) => {
    const reorderableItems = order.items.filter((item) => !item.freeItem);

    if (!reorderableItems.length) {
      toast.error("No reorderable items were found in this order.");
      return;
    }

    setReorderingOrderId(order.id);

    try {
      const products = await Promise.all(
        reorderableItems.map(async (item) => {
          try {
            const product = await getProductById(item.productId);
            const variant = product.variants.find((candidate) => candidate.id === item.variantId) || product.primaryVariant;

            return {
              product,
              variant: variant || buildFallbackVariant(item),
              quantity: item.quantity,
            };
          } catch {
            const fallbackProduct = buildFallbackProduct(item);
            return {
              product: fallbackProduct,
              variant: fallbackProduct.primaryVariant,
              quantity: item.quantity,
            };
          }
        }),
      );

      products.forEach((entry) => {
        addItem(entry.product, entry.variant, entry.quantity);
      });

      toast.success(`${reorderableItems.length} item${reorderableItems.length === 1 ? "" : "s"} added back to your cart.`);
      navigate("/cart");
    } catch (error: any) {
      toast.error(error?.message || "Unable to add these items back to the cart.");
    } finally {
      setReorderingOrderId(null);
    }
  };

  const handleDownloadInvoice = async (order: PlacedOrder) => {
    await downloadInvoicePdf(order);
  };

  const handleRefundRequest = async (order: PlacedOrder) => {
    const confirmed = window.confirm("Send a refund/return request for this order?");
    if (!confirmed) return;

    setRefundOrderId(order.id);
    try {
      await requestRefund({
        orderId: order.id,
        reason: "Customer requested return/refund from website account page",
      });
      toast.success("Refund request sent.");
      void loadCustomerData(true);
    } catch (error: any) {
      toast.error(error?.message || "Unable to request refund for this order.");
    } finally {
      setRefundOrderId(null);
    }
  };

  const handleRateDelivery = (order: PlacedOrder) => {
    setRatingModal(order);
    setRatingStars(5);
    setRatingFeedback("");
  };

  const handleSubmitDeliveryRating = async () => {
    if (!ratingModal) return;
    setRatingOrderId(ratingModal.id);
    try {
      const status = await getDeliveryRatingStatus(ratingModal.orderNumber).catch(() => null);
      if (status && status.canRate === false) {
        toast.error(status.alreadyRated ? "You already rated this delivery." : "Delivery can be rated after it is delivered.");
        setRatingModal(null);
        return;
      }
      await submitDeliveryRating(ratingModal.orderNumber, { rating: ratingStars, feedback: ratingFeedback.trim() });
      toast.success("Thanks, delivery rating submitted.");
      setRatingModal(null);
      void loadCustomerData(true);
    } catch (error: any) {
      toast.error(error?.message || "Unable to submit delivery rating.");
    } finally {
      setRatingOrderId(null);
    }
  };

  const handleDeleteAddress = async (address: Address) => {
    const confirmed = window.confirm("Remove this address from your account?");
    if (!confirmed) return;

    setDeletingAddressId(address.id);

    try {
      await deleteAddress(address.id);
      const nextAddresses = await getAddresses();
      setAddresses(nextAddresses);
      toast.success("Address removed.");
    } catch (error: any) {
      toast.error(error?.message || "Unable to remove this address.");
    } finally {
      setDeletingAddressId(null);
    }
  };

  const handleMakeDefault = async (address: Address) => {
    setDefaultingAddressId(address.id);

    try {
      const savedAddress = await saveAddress(
        {
          addressType: address.addressType,
          flatNumber: address.flatNumber,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2,
          landmark: address.landmark,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          latitude: address.latitude,
          longitude: address.longitude,
          isDefault: true,
          contactName: address.contactName,
          contactPhone: address.contactPhone,
        },
        address.id,
      );

      setAddresses((current) =>
        current
          .map((entry) => ({ ...entry, isDefault: entry.id === savedAddress.id }))
          .sort((left, right) => Number(Boolean(right.isDefault)) - Number(Boolean(left.isDefault))),
      );
      toast.success("Default address updated.");
    } catch (error: any) {
      toast.error(error?.message || "Unable to update the default address.");
    } finally {
      setDefaultingAddressId(null);
    }
  };

  const trackingStatus = tracking?.status || selectedTrackingOrder?.status || selectedTrackingOrder?.orderStatus;
  const trackingStepIndex = getTrackingStepIndex(trackingStatus);
  const selectedTrackingTone = statusTone(trackingStatus);
  const liveTrackingPhone = tracking?.deliveryPersonPhone || selectedTrackingOrder?.deliveryPersonPhone || "";
  const liveTrackingName = tracking?.deliveryPersonName || selectedTrackingOrder?.deliveryPersonName || "";

  const statCards = [
    {
      label: "Orders placed",
      value: String(orders.length),
      helper: orders.length ? `${orders.filter((order) => normalizeOrderStatus(order.status || order.orderStatus) === "DELIVERED").length} completed deliveries` : "Your order history will appear here",
      icon: ShoppingBag,
    },
    {
      label: "Saved addresses",
      value: String(addresses.length),
      helper: defaultAddress ? `Default: ${defaultAddress.addressType || "Home"}` : "Add one at checkout",
      icon: MapPin,
    },
    {
      label: "Active deliveries",
      value: String(activeOrders.length),
      helper: activeOrders.length ? `${activeOrders[0].orderNumber} is moving through fulfilment` : "Nothing in transit right now",
      icon: Truck,
    },
    {
      label: "Wallet",
      value: walletBalance == null ? "Syncing" : `Rs ${walletBalance.toLocaleString("en-IN")}`,
      helper: walletHistory[0]?.description || "Refund credits and wallet payments appear here",
      icon: CreditCard,
    },
  ];

  const renderOverview = () => (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <section className="rounded-[2.2rem] border border-[#E5ECE9] bg-gradient-to-br from-[#0A4D3C] to-[#1B5D4C] p-6 text-white shadow-[0_20px_50px_rgba(10,77,60,0.12)] relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 bg-[radial-gradient(circle_at_center,rgba(212,168,83,0.15),transparent_60%)] pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-white/60">Wallet</div>
              <h2 className="mt-2 font-sans font-bold text-3xl text-[#D4A853]">
                {walletBalance == null ? "Syncing balance" : `Rs ${walletBalance.toLocaleString("en-IN")}`}
              </h2>
            </div>
            <CreditCard className="h-6 w-6 text-[#D4A853]" />
          </div>
          <p className="relative z-10 mt-3 text-sm leading-6 text-white/80">
            Refund credits and wallet activity are shown from the backend wallet ledger.
          </p>
          {walletHistory.length > 0 ? (
            <div className="relative z-10 mt-5 space-y-3">
              {walletHistory.slice(0, 3).map((entry, index) => (
                <div
                  key={entry.id || `${entry.createdAt}-${index}`}
                  className="flex items-start justify-between gap-3 rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div>
                    <div className="font-semibold text-white">{entry.description || entry.type || "Wallet transaction"}</div>
                    {entry.createdAt ? <div className="mt-1 text-xs text-white/60">{formatOrderDate(entry.createdAt)}</div> : null}
                  </div>
                  <div className="font-semibold text-[#D4A853]">Rs {entry.amount.toLocaleString("en-IN")}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="relative z-10 mt-5 rounded-[1.5rem] border border-dashed border-white/20 bg-white/5 px-4 py-4 text-sm text-white/70">
              No wallet transactions yet.
            </div>
          )}
        </section>

        <section className="rounded-[2.2rem] border border-[#E2E8F0]/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(244,247,252,0.99))] p-6 shadow-[0_25px_60px_rgba(20,38,25,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[#6B7B94]">Recent orders</div>
              <h2 className="mt-2 font-sans font-bold text-3xl text-[#0A1628]">Pick up where you left off</h2>
            </div>
            <ShoppingBag className="h-6 w-6 text-[#0A4D3C]" />
          </div>

          {orders.length ? (
            <div className="mt-6 space-y-4">
              {orders.slice(0, 3).map((order) => {
                const tone = statusTone(order.status || order.orderStatus);

                return (
                  <div
                    key={order.id}
                    className="rounded-[1.6rem] border border-[#E5ECE9] bg-white p-4 shadow-[0_14px_32px_rgba(10,77,60,0.03)] hover:border-[#0A4D3C]/20 transition-all duration-300"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-[#0A1628]">{order.orderNumber}</div>
                        <div className="mt-1 text-sm text-[#6B7B94]">{formatOrderDate(order.placedAt || order.createdAt)}</div>
                      </div>
                      <div className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${tone.className}`}>
                        {tone.label}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {order.items.slice(0, 4).map((item) => (
                        <div
                          key={`${order.id}-${item.variantId}-${item.productName}`}
                          className="flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-[#F4F7F5] px-3 py-2 text-xs text-[#6B7B94]"
                        >
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.productName} className="h-7 w-7 rounded-full object-cover" />
                          ) : (
                            <ShoppingBag className="h-4 w-4 text-[#6B7B94]" />
                          )}
                          <span className="max-w-[180px] truncate">{item.productName}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm text-[#6B7B94]">
                        {order.items.length} item{order.items.length === 1 ? "" : "s"} • {formatPaymentMethodLabel(order.paymentMethod)}
                      </div>
                      <div className="font-semibold text-[#0A1628]">Rs {order.grandTotal.toLocaleString("en-IN")}</div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void handleReorder(order)}
                        disabled={reorderingOrderId === order.id}
                        className="inline-flex items-center gap-2 rounded-full bg-[#0A4D3C] hover:bg-[#D4A853] hover:text-[#0A4D3C] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(10,77,60,0.12)] disabled:cursor-not-allowed disabled:opacity-70 transition-all duration-300"
                      >
                        {reorderingOrderId === order.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                        Order again
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSearch({ tab: "tracking", order: String(order.id) })}
                        className="inline-flex items-center gap-2 rounded-full border border-[#0A4D3C] px-4 py-2.5 text-sm font-semibold text-[#0A4D3C] hover:bg-[#0A4D3C] hover:text-white transition-all duration-300"
                      >
                        <Truck className="h-4 w-4" />
                        Track this order
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.8rem] border border-dashed border-[#E2E8F0] bg-[#F4F7F5] px-5 py-6 text-sm text-[#6B7B94]">
              Your previous orders will appear here after the first checkout.
            </div>
          )}
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-[2.2rem] border border-[#E2E8F0]/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(244,247,252,0.99))] p-6 shadow-[0_25px_60px_rgba(20,38,25,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[#6B7B94]">Saved addresses</div>
              <h2 className="mt-2 font-sans font-bold text-3xl text-[#0A1628]">Delivery details at a glance</h2>
            </div>
            <LocateFixed className="h-6 w-6 text-[#0A4D3C]" />
          </div>

          {defaultAddress ? (
            <div className="mt-6 rounded-[1.8rem] border border-[#0A4D3C]/10 bg-[#F4F7F5] p-5 shadow-[0_10px_30px_rgba(10,77,60,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7B94]">Default address</div>
                <div className="rounded-full bg-white border border-[#0A4D3C]/20 px-3 py-1 text-xs font-semibold text-[#0A4D3C]">
                  {defaultAddress.addressType || "Home"}
                </div>
              </div>
              <div className="mt-3 text-lg font-semibold text-[#0A1628]">
                {defaultAddress.contactName || customerName}
              </div>
              <p className="mt-2 text-sm leading-6 text-[#6B7B94]">{formatAddressSummary(defaultAddress)}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => updateSearch({ tab: "addresses" })}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#0A4D3C] border border-[#E2E8F0] hover:bg-[#0A4D3C] hover:text-white hover:border-[#0A4D3C] transition-all duration-300"
                >
                  Manage addresses
                  <ArrowRight className="h-4 w-4" />
                </button>
                <Link
                  to="/checkout"
                  className="inline-flex items-center gap-2 rounded-full border border-[#0A4D3C] px-4 py-2.5 text-sm font-semibold text-[#0A4D3C] hover:bg-[#0A4D3C] hover:text-white transition-all duration-300"
                >
                  Go to checkout
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-[1.8rem] border border-dashed border-[#E2E8F0] bg-[#F4F7F5] px-5 py-6 text-sm text-[#6B7B94]">
              Save an address during checkout and it will stay available for future orders.
            </div>
          )}

          <div className="mt-5 rounded-[1.8rem] border border-[#E2E8F0] bg-white p-5">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-[#0A4D3C]" />
              <div>
                <div className="font-semibold text-[#0A1628]">Delivery control centre</div>
                <div className="mt-1 text-sm text-[#6B7B94]">
                  {activeOrders.length
                    ? `${activeOrders.length} order${activeOrders.length === 1 ? "" : "s"} currently moving through fulfilment.`
                    : "No live deliveries right now, but tracking will appear here the moment your next order is confirmed."}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => updateSearch({ tab: "tracking", order: activeOrders[0] ? String(activeOrders[0].id) : null })}
                className="inline-flex items-center gap-2 rounded-full bg-[#0A4D3C] hover:bg-[#D4A853] hover:text-[#0A4D3C] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-300"
              >
                Track delivery
              </button>
              <button
                type="button"
                onClick={() => updateSearch({ tab: "rfqs" })}
                className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15 transition duration-300"
              >
                Manage RFQs
              </button>
              <button
                type="button"
                onClick={() => updateSearch({ tab: "orders" })}
                className="inline-flex items-center gap-2 rounded-full border border-[#0A4D3C] px-4 py-2.5 text-sm font-semibold text-[#0A4D3C] hover:bg-[#0A4D3C] hover:text-white transition-all duration-300"
              >
                Open order history
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );

  const renderOrders = () => (
    <section className="rounded-[2.2rem] border border-[#E2E8F0]/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(244,247,252,0.99))] p-6 shadow-[0_25px_60px_rgba(20,38,25,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[#6B7B94]">Previous orders</div>
          <h2 className="mt-2 font-sans font-bold text-3xl text-[#0A1628]">Every basket you have placed</h2>
        </div>
        <button
          type="button"
          onClick={() => void loadCustomerData(true)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 rounded-full border border-[#0A4D3C]/20 px-4 py-2.5 text-sm font-semibold text-[#0A4D3C] hover:bg-[#F4F7F5] disabled:cursor-not-allowed disabled:opacity-70 transition-all duration-300"
        >
          {isRefreshing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Refresh
        </button>
      </div>

      {orders.length ? (
        <div className="mt-6 space-y-5">
          {orders.map((order) => {
            const tone = statusTone(order.status || order.orderStatus);
            const hasTracking = isTrackableStatus(order.status || order.orderStatus);

            return (
              <article
                key={order.id}
                className="rounded-[1.9rem] border border-[#E5ECE9] bg-white p-5 shadow-[0_16px_36px_rgba(10,77,60,0.03)] hover:border-[#0A4D3C]/20 transition-all duration-300"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-[#6B7B94]">Order number</div>
                    <h3 className="mt-2 font-sans font-bold text-3xl text-[#0A1628]">{order.orderNumber}</h3>
                    <div className="mt-2 text-sm text-[#6B7B94]">{formatOrderDate(order.placedAt || order.createdAt)}</div>
                  </div>

                  <div className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${tone.className}`}>
                    {tone.label}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {order.items.slice(0, 5).map((item) => (
                        <div
                          key={`${order.id}-${item.variantId}-${item.productName}`}
                          className="flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-[#F4F7F5] px-3 py-2 text-sm text-[#6B7B94]"
                        >
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.productName} className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <ShoppingBag className="h-4 w-4 text-[#6B7B94]" />
                          )}
                          <span className="max-w-[180px] truncate">{item.productName}</span>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-[1.4rem] border border-[#E2E8F0] bg-[#F4F7F5] p-4">
                        <div className="text-xs uppercase tracking-[0.16em] text-[#6B7B94]">Amount</div>
                        <div className="mt-2 text-xl font-semibold text-[#0A1628]">Rs {order.grandTotal.toLocaleString("en-IN")}</div>
                      </div>
                      <div className="rounded-[1.4rem] border border-[#E2E8F0] bg-[#F4F7F5] p-4">
                        <div className="text-xs uppercase tracking-[0.16em] text-[#6B7B94]">Items</div>
                        <div className="mt-2 text-xl font-semibold text-[#0A1628]">{order.items.length}</div>
                      </div>
                      <div className="rounded-[1.4rem] border border-[#E2E8F0] bg-[#F4F7F5] p-4">
                        <div className="text-xs uppercase tracking-[0.16em] text-[#6B7B94]">Payment</div>
                        <div className="mt-2 text-xl font-semibold text-[#0A1628]">{formatPaymentMethodLabel(order.paymentMethod)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.6rem] border border-[#E2E8F0] bg-[#F8FAFD] p-5">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#6B7B94]">Delivery summary</div>
                    <div className="mt-3 text-sm leading-6 text-[#6B7B94]">
                      {formatAddressSummary(order.address) || "Address details were not attached to this order."}
                    </div>
                    {order.storeGroups?.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {order.storeGroups.map((group) => (
                          <div
                            key={`${order.id}-${group.storeName}`}
                            className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7B94]"
                          >
                            {group.storeName}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void handleReorder(order)}
                        disabled={reorderingOrderId === order.id}
                        className="inline-flex items-center gap-2 rounded-full bg-[#0A4D3C] hover:bg-[#D4A853] hover:text-[#0A4D3C] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70 transition-all duration-300 shadow-[0_4px_12px_rgba(10,77,60,0.15)]"
                      >
                        {reorderingOrderId === order.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                        Order again
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSearch({ tab: "tracking", order: String(order.id) })}
                        className="inline-flex items-center gap-2 rounded-full border border-[#0A4D3C] px-4 py-2.5 text-sm font-semibold text-[#0A4D3C] hover:bg-[#0A4D3C] hover:text-white transition-all duration-300"
                      >
                        <Truck className="h-4 w-4" />
                        {hasTracking ? "Track order" : "View order status"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadInvoice(order)}
                        className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] px-4 py-2.5 text-sm font-semibold text-[#6B7B94] hover:text-[#1A2332] hover:bg-[#F8FAFD] transition-all duration-300"
                      >
                        <Download className="h-4 w-4" />
                        Invoice
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRefundRequest(order)}
                        disabled={refundOrderId === order.id}
                        className="inline-flex items-center gap-2 rounded-full border border-[#F5D5D0] px-4 py-2.5 text-sm font-semibold text-[#DC2626] disabled:cursor-not-allowed disabled:opacity-70 transition-all duration-300"
                      >
                        {refundOrderId === order.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                        Return/refund
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRateDelivery(order)}
                        disabled={ratingOrderId === order.id}
                        className="inline-flex items-center gap-2 rounded-full border border-[#D4A853] px-4 py-2.5 text-sm font-semibold text-[#D4A853] hover:bg-[#D4A853] hover:text-white disabled:cursor-not-allowed disabled:opacity-70 transition-all duration-300"
                      >
                        {ratingOrderId === order.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                        Rate delivery
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-[1.8rem] border border-dashed border-[#E2E8F0] bg-[#F4F7F5] px-5 py-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-[0_10px_24px_rgba(23,42,28,0.08)]">
            <ShoppingBag className="h-6 w-6 text-[#0A4D3C]" />
          </div>
          <h3 className="mt-4 font-sans font-bold text-3xl text-[#0A1628]">No orders yet</h3>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#6B7B94]">
            Start shopping and your complete order history, tracking updates, and reorder shortcuts will appear here.
          </p>
          <Link
            to="/shop"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0A4D3C] hover:bg-[#D4A853] hover:text-[#0A4D3C] px-5 py-3 text-sm font-semibold text-white transition-all duration-300"
          >
            Explore products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );

  const renderAddresses = () => (
    <section className="rounded-[2.2rem] border border-[#E2E8F0]/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(244,247,252,0.99))] p-6 shadow-[0_25px_60px_rgba(20,38,25,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[#6B7B94]">Saved addresses</div>
          <h2 className="mt-2 font-sans font-bold text-3xl text-[#0A1628]">Manage every delivery destination</h2>
        </div>
        <Link
          to="/checkout"
          className="inline-flex items-center gap-2 rounded-full bg-[#0A4D3C] hover:bg-[#D4A853] hover:text-[#0A4D3C] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-300"
        >
          Add new address
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {addresses.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <article
              key={address.id}
              className={`rounded-[1.9rem] border p-5 shadow-[0_16px_36px_rgba(10,77,60,0.03)] transition-all duration-300 ${
                address.isDefault
                  ? "border-[#0A4D3C]/20 bg-[linear-gradient(180deg,#F4F7F5,#F4F7F5)]"
                  : "border-[#E2E8F0] bg-white hover:border-[#0A4D3C]/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[#6B7B94]">Address type</div>
                  <div className="mt-2 font-sans font-bold text-3xl text-[#0A1628]">
                    {toTitleCase(address.addressType || "HOME")}
                  </div>
                </div>
                {address.isDefault ? (
                  <div className="rounded-full border border-[#0A4D3C]/20 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#0A4D3C]">
                    Default
                  </div>
                ) : null}
              </div>

              <p className="mt-4 text-sm leading-7 text-[#6B7B94]">{formatAddressSummary(address)}</p>

              {(address.contactName || address.contactPhone) ? (
                <div className="mt-4 rounded-[1.3rem] border border-[#E2E8F0] bg-white/80 px-4 py-3 text-sm text-[#6B7B94]">
                  {address.contactName ? <div>{address.contactName}</div> : null}
                  {address.contactPhone ? <div className="mt-1">{address.contactPhone}</div> : null}
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                {!address.isDefault ? (
                  <button
                    type="button"
                    onClick={() => void handleMakeDefault(address)}
                    disabled={defaultingAddressId === address.id}
                    className="inline-flex items-center gap-2 rounded-full bg-[#0A4D3C] hover:bg-[#D4A853] hover:text-[#0A4D3C] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70 transition-all duration-300"
                  >
                    {defaultingAddressId === address.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Make default
                  </button>
                ) : (
                  <Link
                    to="/checkout"
                    className="inline-flex items-center gap-2 rounded-full bg-[#0A4D3C] hover:bg-[#D4A853] hover:text-[#0A4D3C] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-300"
                  >
                    Use in checkout
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => void handleDeleteAddress(address)}
                  disabled={deletingAddressId === address.id}
                  className="inline-flex items-center gap-2 rounded-full border border-[#F5D5D0] px-4 py-2.5 text-sm font-semibold text-[#DC2626] disabled:cursor-not-allowed disabled:opacity-70 transition-all duration-300"
                >
                  {deletingAddressId === address.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-[1.8rem] border border-dashed border-[#E2E8F0] bg-[#F4F7F5] px-5 py-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-[0_10px_24px_rgba(23,42,28,0.08)]">
            <MapPin className="h-6 w-6 text-[#0A4D3C]" />
          </div>
          <h3 className="mt-4 font-sans font-bold text-3xl text-[#0A1628]">No saved addresses yet</h3>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#6B7B94]">
            Add one during checkout and it will stay ready for future grocery deliveries.
          </p>
        </div>
      )}
    </section>
  );

  const renderTracking = () => (
    <section className="space-y-6">
      <div className="rounded-[2.2rem] border border-[#E2E8F0]/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(244,247,252,0.99))] p-6 shadow-[0_25px_60px_rgba(20,38,25,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[#6B7B94]">Delivery tracking</div>
            <h2 className="mt-2 font-sans font-bold text-3xl text-[#0A1628]">Follow every order milestone</h2>
          </div>
          <button
            type="button"
            onClick={() => void loadCustomerData(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-full border border-[#0A4D3C]/20 px-4 py-2.5 text-sm font-semibold text-[#0A4D3C] hover:bg-[#F4F7F5] disabled:cursor-not-allowed disabled:opacity-70 transition-all duration-300"
          >
            {isRefreshing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Refresh orders
          </button>
        </div>

        {orders.length ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {orders.slice(0, 8).map((order) => {
              const tone = statusTone(order.status || order.orderStatus);

              return (
                <button
                  type="button"
                  key={order.id}
                  onClick={() => updateSearch({ tab: "tracking", order: String(order.id) })}
                  className={`rounded-[1.4rem] border px-4 py-3 text-left transition duration-300 ${
                    selectedTrackingOrder?.id === order.id
                      ? "border-[#0A4D3C] bg-[#F4F7F5] shadow-[0_10px_30px_rgba(10,77,60,0.06)]"
                      : "border-[#E2E8F0] bg-white hover:border-[#0A4D3C]/20"
                  }`}
                >
                  <div className="font-semibold text-[#0A1628]">{order.orderNumber}</div>
                  <div className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${tone.className}`}>
                    {tone.label}
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {selectedTrackingOrder ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-[2.4rem] border border-white/65 bg-[linear-gradient(135deg,#0A4D3C,#1B5D4C,#D4A853)] p-6 text-white shadow-[0_30px_80px_rgba(10,77,60,0.15)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/78">
                    <Sparkles className="h-3.5 w-3.5 text-[#D4A853]" />
                    Delivery centre
                  </div>
                  <h3 className="mt-5 font-sans font-bold text-4xl">{selectedTrackingOrder.orderNumber}</h3>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-white/82">
                    {tracking?.message || "We are syncing the latest fulfilment updates for this order."}
                  </p>
                </div>

                <div className="rounded-full border border-white/16 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                  {selectedTrackingTone.label}
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-[1.5rem] border border-white/14 bg-white/10 p-4 backdrop-blur">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/60">Last update</div>
                  <div className="mt-2 text-lg font-semibold text-white">{formatTrackingUpdate(tracking?.updatedAt)}</div>
                </div>
                <div className="rounded-[1.5rem] border border-white/14 bg-white/10 p-4 backdrop-blur">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/60">Rider sync</div>
                  <div className="mt-2 text-lg font-semibold text-white">{tracking?.isLive ? "Live location active" : "Status-only tracking"}</div>
                </div>
                <div className="rounded-[1.5rem] border border-white/14 bg-white/10 p-4 backdrop-blur">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/60">Estimated delivery</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {selectedTrackingOrder.estimatedDeliveryTime
                      ? formatOrderDate(selectedTrackingOrder.estimatedDeliveryTime)
                      : "Awaiting rider assignment"}
                  </div>
                </div>
              </div>
            </motion.section>

            <section className="rounded-[2.2rem] border border-[#E2E8F0]/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(244,247,252,0.99))] p-6 shadow-[0_25px_60px_rgba(20,38,25,0.08)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[#6B7B94]">Progress timeline</div>
                  <h3 className="mt-2 font-sans font-bold text-3xl text-[#0A1628]">From checkout to doorstep</h3>
                </div>
                {isTrackingLoading ? <LoaderCircle className="h-5 w-5 animate-spin text-[#0A4D3C]" /> : <Clock3 className="h-5 w-5 text-[#0A4D3C]" />}
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-5">
                {[
                  { label: "Placed", detail: "Order captured" },
                  { label: "Confirmed", detail: "Store accepted" },
                  { label: "Assigned", detail: "Rider linked" },
                  { label: "On the way", detail: "Heading to you" },
                  { label: "Delivered", detail: "Completed" },
                ].map((step, index) => {
                  const isComplete = index < trackingStepIndex;
                  const isCurrent = index === trackingStepIndex;

                  return (
                    <div
                      key={step.label}
                      className={`rounded-[1.5rem] border p-4 transition-all duration-300 ${
                        isCurrent
                          ? "border-[#0A4D3C]/10 bg-[#F4F7F5] shadow-[0_10px_25px_rgba(10,77,60,0.04)]"
                          : isComplete
                            ? "border-[#E2E8F0] bg-[#F8FAFD]"
                            : "border-[#E2E8F0] bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-300 ${
                            isCurrent || isComplete ? "bg-[#0A4D3C] text-white" : "bg-[#EAEFEB] text-[#6B7B94]"
                          }`}
                        >
                          {isComplete ? <CheckCircle2 className="h-4 w-4" /> : <PackageCheck className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="font-semibold text-[#0A1628]">{step.label}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.14em] text-[#6B7B94]">{step.detail}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[2.2rem] border border-[#E2E8F0]/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(244,247,252,0.99))] p-6 shadow-[0_25px_60px_rgba(20,38,25,0.08)]">
              <div className="text-xs uppercase tracking-[0.18em] text-[#6B7B94]">Delivery details</div>
              <h3 className="mt-2 font-sans font-bold text-3xl text-[#0A1628]">Rider, payment, and address</h3>

              <div className="mt-6 space-y-4">
                <div className="rounded-[1.5rem] border border-[#0A4D3C]/10 bg-[#F4F7F5] p-4">
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-[#0A4D3C]" />
                    <div>
                      <div className="font-semibold text-[#0A1628]">{liveTrackingName || "Delivery partner pending"}</div>
                      <div className="mt-1 text-sm text-[#6B7B94]">
                        {liveTrackingPhone || "Phone details will appear once a rider is assigned."}
                      </div>
                    </div>
                  </div>
                  {liveTrackingPhone ? (
                    <a
                      href={`tel:${liveTrackingPhone}`}
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0A4D3C] hover:bg-[#D4A853] hover:text-[#0A4D3C] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(10,77,60,0.1)] transition-all duration-300"
                    >
                      <Phone className="h-4 w-4" />
                      Call rider
                    </a>
                  ) : null}
                </div>

                <div className="rounded-[1.5rem] border border-[#E2E8F0] bg-white p-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-[#0A4D3C]" />
                    <div>
                      <div className="font-semibold text-[#0A1628]">Delivery address</div>
                      <div className="mt-1 text-sm text-[#6B7B94]">
                        {formatAddressSummary(selectedTrackingOrder.address) || APP_COPY.headquarters}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-[#E2E8F0] bg-white p-4">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-[#D4A853]" />
                    <div>
                      <div className="font-semibold text-[#0A1628]">Payment status</div>
                      <div className="mt-1 text-sm text-[#6B7B94]">
                        {formatPaymentMethodLabel(selectedTrackingOrder.paymentMethod)} • {selectedTrackingOrder.paymentStatus || "Pending confirmation"}
                      </div>
                    </div>
                  </div>
                </div>

                {(tracking?.lat != null && tracking?.lng != null) ? (
                  <div className="rounded-[1.5rem] border border-[#E2E8F0] bg-[#F4F7F5] p-4 text-sm text-[#6B7B94]">
                    Live rider coordinates: {tracking.lat.toFixed(5)}, {tracking.lng.toFixed(5)}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-[2.2rem] border border-[#E2E8F0]/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(244,247,252,0.99))] p-6 shadow-[0_25px_60px_rgba(20,38,25,0.08)]">
              <div className="text-xs uppercase tracking-[0.18em] text-[#6B7B94]">Items in this order</div>
              <h3 className="mt-2 font-sans font-bold text-3xl text-[#0A1628]">What is being delivered</h3>

              <div className="mt-6 space-y-3">
                {selectedTrackingOrder.items.map((item) => (
                  <div key={`${selectedTrackingOrder.id}-${item.variantId}-${item.productName}`} className="flex items-center gap-3 rounded-[1.3rem] border border-[#E5ECE9] bg-white p-3 hover:border-[#0A4D3C]/20 transition-all duration-300">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.productName} className="h-14 w-14 rounded-2xl object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4F7F5]">
                        <ShoppingBag className="h-5 w-5 text-[#6B7B94]" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-[#0A1628]">{item.productName}</div>
                      <div className="mt-1 text-sm text-[#6B7B94]">
                        {item.variantName || "Standard pack"} • Qty {item.quantity}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-[#0A1628]">Rs {(item.totalPrice || item.unitPrice * item.quantity).toLocaleString("en-IN")}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleReorder(selectedTrackingOrder)}
                  disabled={reorderingOrderId === selectedTrackingOrder.id}
                  className="inline-flex items-center gap-2 rounded-full bg-[#0A4D3C] hover:bg-[#D4A853] hover:text-[#0A4D3C] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70 shadow-[0_4px_12px_rgba(10,77,60,0.1)] transition-all duration-300"
                >
                  {reorderingOrderId === selectedTrackingOrder.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  Order again
                </button>
                <Link
                  to="/cart"
                  className="inline-flex items-center gap-2 rounded-full border border-[#0A4D3C] px-4 py-2.5 text-sm font-semibold text-[#0A4D3C] hover:bg-[#0A4D3C] hover:text-white transition-all duration-300"
                >
                  Open cart
                  <ExternalLink className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => handleDownloadInvoice(selectedTrackingOrder)}
                  className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] px-4 py-2.5 text-sm font-semibold text-[#6B7B94] hover:text-[#1A2332] hover:bg-[#F8FAFD] transition-all duration-300"
                >
                  <Download className="h-4 w-4" />
                  Invoice
                </button>
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="rounded-[2.2rem] border border-dashed border-[#E2E8F0] bg-[#F4F7F5] px-5 py-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-[0_10px_24px_rgba(23,42,28,0.08)]">
            <Truck className="h-6 w-6 text-[#0A4D3C]" />
          </div>
          <h3 className="mt-4 font-sans font-bold text-3xl text-[#0A1628]">No orders available to track</h3>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#6B7B94]">
            Once you place an order, this panel will show store confirmation, rider assignment, and doorstep updates.
          </p>
        </div>
      )}
    </section>
  );

  if (!session?.accessToken) {
    return (
      <div className="app-shell-narrow">
        <section className="relative overflow-hidden rounded-[2.8rem] border border-white/10 bg-[#0A4D3C] px-6 py-10 text-white shadow-[0_30px_70px_rgba(10,77,60,0.15)] sm:px-10">
          {/* Abstract premium backgrounds */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(212,168,83,0.18),transparent_50%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.06),transparent_40%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[length:24px_24px] pointer-events-none" />

          <div className="relative z-10 grid gap-8 xl:grid-cols-[1.1fr_0.9fr] xl:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-[#D4A853] backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-[#D4A853]" />
                Customer account
              </div>
              <h1 className="mt-5 font-sans font-bold text-[clamp(2.4rem,6vw,4.5rem)] leading-[1.02]">See previous orders, saved addresses, and live delivery updates in one place.</h1>
              <p className="mt-5 max-w-2xl text-sm leading-8 text-white/82">
                Sign in with your mobile OTP to unlock order history, one-click reorder, saved address management, and delivery tracking from the website.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={openAuthModal}
                  className="inline-flex items-center gap-2 rounded-full bg-[#D4A853] text-[#0A4D3C] hover:bg-[#c39742] hover:text-[#0A4D3C] px-5 py-3 text-sm font-semibold shadow-md hover:scale-102 transition-all duration-300 font-bold"
                >
                  Sign in with OTP
                </button>
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15 transition duration-300"
                >
                  Continue shopping
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Previous orders",
                  description: "Revisit every basket and add the same items back to cart in one step.",
                  icon: ShoppingBag,
                },
                {
                  title: "Saved addresses",
                  description: "Keep home, work, and alternate delivery addresses ready for checkout.",
                  icon: MapPin,
                },
                {
                  title: "Delivery tracking",
                  description: "Follow fulfilment status, rider assignment, and latest delivery movement.",
                  icon: Truck,
                },
                {
                  title: "Order confidence",
                  description: "Review payment method, totals, and destination without hunting across screens.",
                  icon: PackageCheck,
                },
              ].map((feature) => (
                <div key={feature.title} className="group/card rounded-[1.8rem] border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/16 hover:-translate-y-0.5 shadow-md">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 transition-all duration-300 group-hover/card:scale-108 group-hover/card:bg-white/15">
                    <feature.icon className="h-5 w-5 text-[#D4A853]" />
                  </div>
                  <div className="mt-4 font-sans font-bold text-xl text-white group-hover/card:text-[#D4A853] transition-colors">{feature.title}</div>
                  <p className="mt-2.5 text-xs sm:text-sm leading-6 text-white/70">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.8rem] border border-white/10 bg-[#0A4D3C] px-6 py-10 text-white shadow-[0_30px_70px_rgba(10,77,60,0.15)] sm:px-10"
      >
        {/* Abstract premium backgrounds */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(212,168,83,0.18),transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.06),transparent_40%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[length:24px_24px] pointer-events-none" />

        <div className="relative z-10 grid gap-8 xl:grid-cols-[1.08fr_0.92fr] xl:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-[#D4A853] backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-[#D4A853]" />
              Account hub
            </div>
            <h1 className="mt-5 font-sans font-bold text-[clamp(2.4rem,6vw,4.4rem)] leading-[1.02]">Welcome back, {customerName}.</h1>
            <p className="mt-5 max-w-2xl text-sm leading-8 text-white/82">
              Your order history, saved delivery addresses, and live tracking updates now sit together in one advanced customer view.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => updateSearch({ tab: "orders" })}
                className="inline-flex items-center gap-2 rounded-full bg-[#D4A853] text-[#0A4D3C] hover:bg-[#c39742] hover:text-[#0A4D3C] px-5 py-3 text-sm font-semibold shadow-md hover:scale-102 transition-all duration-300 font-bold"
              >
                Open orders
              </button>
              <button
                type="button"
                onClick={() => updateSearch({ tab: "tracking", order: activeOrders[0] ? String(activeOrders[0].id) : null })}
                className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15 transition duration-300"
              >
                Track delivery
              </button>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2">
            {statCards.map((card) => (
              <div key={card.label} className="group/card rounded-[1.8rem] border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/16 hover:-translate-y-0.5 shadow-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 transition-all duration-300 group-hover/card:scale-108 group-hover/card:bg-white/15">
                  <card.icon className="h-5 w-5 text-[#D4A853]" />
                </div>
                <div className="mt-4 text-xs uppercase tracking-[0.18em] text-white/50">{card.label}</div>
                <div className="mt-2 font-sans font-bold text-3xl sm:text-4xl text-white group-hover/card:text-[#D4A853] transition-colors">{card.value}</div>
                <div className="mt-2.5 text-xs sm:text-sm leading-6 text-white/70">{card.helper}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <div className="touch-scroll-row mt-8 flex gap-3 overflow-x-auto rounded-[2rem] border border-[#E2E8F0]/80 bg-white/80 p-3 shadow-[0_18px_40px_rgba(10,22,40,0.03)] backdrop-blur-md">
        {[
          { value: "overview", label: "Overview", icon: Sparkles },
          { value: "orders", label: "Orders", icon: ShoppingBag },
          { value: "rfqs", label: "My RFQs", icon: FileText },
          { value: "addresses", label: "Addresses", icon: MapPin },
          { value: "tracking", label: "Tracking", icon: Truck },
        ].map((tab) => (
          <button
            type="button"
            key={tab.value}
            onClick={() => updateSearch({ tab: tab.value, order: tab.value === "tracking" && selectedTrackingOrder ? String(selectedTrackingOrder.id) : tab.value === "tracking" ? null : searchParams.get("order") })}
            className={`inline-flex shrink-0 snap-start items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all duration-300 ${
              activeTab === tab.value
                ? "bg-[#0A4D3C] text-white shadow-[0_8px_20px_rgba(10,77,60,0.15)] hover:scale-102"
                : "text-[#3A4D6B] hover:bg-[#EAEFEB] hover:text-[#0A4D3C]"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {isLoading ? (
          <div className="rounded-[2.2rem] border border-[#E2E8F0]/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(244,247,252,0.99))] px-6 py-14 text-center shadow-[0_25px_60px_rgba(20,38,25,0.08)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F4F7F5]">
              <LoaderCircle className="h-6 w-6 animate-spin text-[#0A4D3C]" />
            </div>
            <h2 className="mt-5 font-sans font-bold text-3xl text-[#0A1628]">Loading your account</h2>
            <p className="mt-3 text-sm leading-7 text-[#6B7B94]">
              Pulling previous orders, saved addresses, and the latest delivery information.
            </p>
          </div>
        ) : activeTab === "overview" ? (
          renderOverview()
        ) : activeTab === "orders" ? (
          renderOrders()
        ) : activeTab === "rfqs" ? (
          <BuyerRFQDashboard />
        ) : activeTab === "addresses" ? (
          renderAddresses()
        ) : (
          renderTracking()
        )}
      </div>

      {/* Inline Delivery Rating Modal */}
      {ratingModal ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0A1628]/60 p-4 backdrop-blur-md"
          onMouseDown={() => setRatingModal(null)}
        >
          <div
            className="relative w-full max-w-md rounded-[2rem] border border-white/50 bg-white shadow-[0_32px_90px_rgba(10,22,40,0.22)] p-8"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F2F8F5] text-[#0A4D3C]">
                <Star className="h-6 w-6 fill-current text-[#D4A853]" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7C9A90]">Delivery feedback</p>
                <h2 className="font-sans font-bold text-xl text-[#0A1628]">Rate your delivery</h2>
              </div>
            </div>

            <p className="text-sm text-[#6B7B94] mb-5">
              Order <span className="font-semibold text-[#0A1628]">{ratingModal.orderNumber}</span>
            </p>

            {/* Star selector */}
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#0A4D3C] mb-3">Your rating</p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingStars(star)}
                    className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                      star <= ratingStars
                        ? "border-[#D4A853] bg-[#FEF7E8] text-[#D4A853] scale-110"
                        : "border-[#E2E8F0] bg-white text-[#CBD5E1] hover:border-[#D4A853] hover:text-[#D4A853]"
                    }`}
                  >
                    <Star className={`h-5 w-5 ${star <= ratingStars ? "fill-current" : "fill-none"}`} />
                  </button>
                ))}
                <span className="ml-2 text-sm font-bold text-[#0A4D3C]">{ratingStars} star{ratingStars !== 1 ? "s" : ""}</span>
              </div>
            </div>

            {/* Feedback textarea */}
            <div className="mb-6">
              <label className="text-xs font-bold uppercase tracking-wider text-[#0A4D3C] block mb-2">
                Feedback <span className="text-[#94A3B8] font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={ratingFeedback}
                onChange={(e) => setRatingFeedback(e.target.value)}
                placeholder="How was the delivery experience? (speed, packaging, rider behaviour...)"
                className="w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFD] px-4 py-3 text-sm text-[#0A1628] outline-none focus:border-[#0A4D3C] focus:bg-white placeholder:text-[#94A3B8] resize-none transition"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRatingModal(null)}
                className="flex-1 rounded-2xl border border-[#E2E8F0] px-4 py-3 text-sm font-semibold text-[#3A4D6B] transition hover:bg-[#F8FAFD]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSubmitDeliveryRating()}
                disabled={ratingOrderId === ratingModal.id}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0A4D3C] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#D4A853] hover:text-[#0A4D3C] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {ratingOrderId === ratingModal.id ? (
                  <><LoaderCircle className="h-4 w-4 animate-spin" /> Submitting</>
                ) : (
                  <><Star className="h-4 w-4" /> Submit Rating</>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


