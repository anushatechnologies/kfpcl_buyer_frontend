import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowRight, Gift, LoaderCircle, Minus, Plus, ShieldCheck, ShoppingBag, Sparkles, TicketPercent, Trash2, Truck } from "lucide-react";
import { buildFreeItemOfferPreview, getOfferLabel } from "../lib/freeItemOffers";
import { buildCartWarnings, getBestCoupon } from "../lib/customerExperience";
import { calculateCheckoutFeeBreakdown, formatCurrency, getProductHref } from "../lib/storefrontUtils";
import { getActiveCoupons, getActiveFreeItemOffers, getCheckoutSettings } from "../data/storefrontData";
import { useCartStore } from "../store/cartStore";
import type { CheckoutSettings, Coupon, FreeItemOffer } from "../types/storefront";

const defaultCheckoutSettings: CheckoutSettings = {
  deliveryCharge: 0,
  platformFee: 0,
  handlingCharge: 0,
  smallCartFee: 0,
  smallCartThreshold: 0,
  onlinePaymentEnabled: true,
  cashOnDeliveryEnabled: true,
};

const formatCouponHeadline = (coupon: Coupon) => {
  if (coupon.discountType === "PERCENTAGE") {
    const cap = coupon.maxDiscountAmount ? ` up to ${formatCurrency(coupon.maxDiscountAmount)}` : "";
    return `${coupon.discountValue}% off${cap}`;
  }
  return `${formatCurrency(coupon.discountValue)} off`;
};

interface QuantityFeedback {
  delta: 1 | -1;
  token: number;
}

export function Cart() {
  const cart = useCartStore((state) => state.cart);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const productCount = useCartStore((state) => state.getProductCount());
  const subtotal = useCartStore((state) => state.getSubtotal());
  const savings = useCartStore((state) => state.getSavings());

  const [settings, setSettings] = useState<CheckoutSettings>(defaultCheckoutSettings);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [activeCoupons, setActiveCoupons] = useState<Coupon[]>([]);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(true);
  const [activeFreeItemOffers, setActiveFreeItemOffers] = useState<FreeItemOffer[]>([]);
  const [isLoadingFreeItemOffers, setIsLoadingFreeItemOffers] = useState(true);
  const [quantityFeedbacks, setQuantityFeedbacks] = useState<Record<number, QuantityFeedback>>({});
  const feedbackTimersRef = useRef<Record<number, number>>({});

  useEffect(() => {
    return () => {
      Object.values(feedbackTimersRef.current).forEach((timer) => window.clearTimeout(timer));
      feedbackTimersRef.current = {};
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    getCheckoutSettings()
      .then((nextSettings) => {
        if (isMounted) {
          setSettings(nextSettings);
        }
      })
      .catch(() => {
        // Keep fallback settings.
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingSettings(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    getActiveCoupons()
      .then((nextCoupons) => {
        if (isMounted) {
          setActiveCoupons(nextCoupons);
        }
      })
      .catch(() => {
        if (isMounted) {
          setActiveCoupons([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingCoupons(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    getActiveFreeItemOffers()
      .then((nextOffers) => {
        if (isMounted) {
          setActiveFreeItemOffers(nextOffers);
        }
      })
      .catch(() => {
        if (isMounted) {
          setActiveFreeItemOffers([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingFreeItemOffers(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const feeBreakdown = useMemo(() => {
    return calculateCheckoutFeeBreakdown(subtotal, settings);
  }, [settings, subtotal]);

  const freeItemOfferPreviews = useMemo(() => {
    return activeFreeItemOffers
      .map((offer) => buildFreeItemOfferPreview(offer, cart))
      .sort((left, right) => {
        if (left.unlockedFreeQuantity !== right.unlockedFreeQuantity) {
          return right.unlockedFreeQuantity - left.unlockedFreeQuantity;
        }
        return left.missingQuantity - right.missingQuantity;
      });
  }, [activeFreeItemOffers, cart]);

  const unlockedFreeItems = useMemo(
    () => freeItemOfferPreviews.reduce((total, preview) => total + preview.unlockedFreeQuantity, 0),
    [freeItemOfferPreviews],
  );
  const cartWarnings = useMemo(() => buildCartWarnings(cart), [cart]);
  const bestCoupon = useMemo(() => getBestCoupon(activeCoupons, subtotal), [activeCoupons, subtotal]);

  const triggerQuantityFeedback = (variantId: number, delta: 1 | -1) => {
    const token = Date.now() + Math.random();
    const existingTimer = feedbackTimersRef.current[variantId];
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    setQuantityFeedbacks((current) => ({
      ...current,
      [variantId]: { delta, token },
    }));

    feedbackTimersRef.current[variantId] = window.setTimeout(() => {
      setQuantityFeedbacks((current) => {
        if (current[variantId]?.token !== token) {
          return current;
        }

        const next = { ...current };
        delete next[variantId];
        return next;
      });

      delete feedbackTimersRef.current[variantId];
    }, 820);
  };

  const handleIncrease = (variantId: number, quantity: number) => {
    setQuantity(variantId, quantity + 1);
    triggerQuantityFeedback(variantId, 1);
  };

  const handleDecrease = (variantId: number, quantity: number) => {
    setQuantity(variantId, quantity - 1);

    if (quantity > 1) {
      triggerQuantityFeedback(variantId, -1);
    }
  };

  if (!cart.length) {
    return (
      <div className="app-shell-narrow text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#EBF0FF]">
          <ShoppingBag className="h-10 w-10 text-[#1E5AFA]" />
        </div>
        <h1 className="page-title mt-6">Your cart is waiting</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#6B7B94]">
          Add a few fresh picks to review delivery charges, savings, and checkout-ready totals.
        </p>
        <Link
          to="/shop"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#0A1628] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(10,22,40,0.22)]"
        >
          Start shopping
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="page-title">View cart</h1>
          <p className="mt-2 text-sm text-[#6B7B94]">
            Review your selected products, adjust quantities, and continue with a cleaner checkout summary.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full bg-[#EBF0FF] px-4 py-2 text-sm font-semibold text-[#1E5AFA]">
            {productCount} product{productCount === 1 ? "" : "s"}
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white/85 px-4 py-2 text-sm font-semibold text-[#3A4D6B]"
          >
            Continue shopping
          </Link>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.16fr_0.84fr]">
        <section className="space-y-4">
          {cartWarnings.length > 0 ? (
            <div className="rounded-[2rem] border border-[#F0DDB1] bg-[#FEF7E8] p-5 shadow-[0_18px_42px_rgba(10,22,40,0.06)]">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#B8860B] shadow-[0_10px_20px_rgba(10,22,40,0.04)]">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-sans font-bold text-3xl text-[#0A1628]">Smart cart check</h2>
                  <p className="mt-1 text-sm leading-6 text-[#6B7B94]">
                    Stock can change while customers are browsing. Fix warnings here before checkout.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                {cartWarnings.map((warning) => (
                  <div
                    key={`${warning.variantId}-${warning.title}`}
                    className={`rounded-[1.35rem] border px-4 py-3 ${
                      warning.tone === "danger" ? "border-[#F5D5D0] bg-[#FEF2F2]" : "border-[#F0DDB1] bg-white"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-semibold text-[#0A1628]">{warning.title}</div>
                        <div className="mt-1 text-sm text-[#6B7B94]">{warning.message}</div>
                      </div>
                      {warning.action === "adjust" ? (
                        <button
                          type="button"
                          onClick={() => setQuantity(warning.variantId, warning.quantity || 1)}
                          className="inline-flex items-center justify-center rounded-full bg-[#0A1628] px-4 py-2 text-sm font-semibold text-white"
                        >
                          Adjust qty
                        </button>
                      ) : warning.action === "remove" ? (
                        <button
                          type="button"
                          onClick={() => removeItem(warning.variantId)}
                          className="inline-flex items-center justify-center rounded-full border border-[#F5D5D0] px-4 py-2 text-sm font-semibold text-[#DC2626]"
                        >
                          Remove item
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {cart.map((item) => {
            const feedback = quantityFeedbacks[item.variantId];
            const quantityMotionKey = `${item.variantId}-${item.quantity}`;
            const stock = Number(item.stock);
            const availableStock = Number.isFinite(stock) ? Math.max(0, stock) : undefined;
            const canIncrease = availableStock === undefined || item.quantity < availableStock;

            return (
               <motion.article
                key={item.variantId}
                layout
                animate={
                  feedback
                    ? {
                        scale: [1, 1.01, 1],
                        y: [0, -3, 0],
                      }
                    : { scale: 1, y: 0 }
                }
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-[2rem] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,253,0.98))] p-5 shadow-[0_18px_42px_rgba(10,22,40,0.06)]"
              >
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Link to={getProductHref({ id: item.productId, name: item.name })} className="sm:w-[148px]">
                    <div className="flex h-36 w-full items-center justify-center rounded-[1.4rem] bg-[radial-gradient(circle_at_top,#F0F3F8,#EEF2F7_72%)] p-3">
                      <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain" />
                    </div>
                  </Link>

                  <div className="flex flex-1 flex-col justify-between gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-[#6B7B94]">
                          {item.categoryName || "Everyday essentials"}
                        </div>
                        <Link to={getProductHref({ id: item.productId, name: item.name })}>
                          <h2 className="mt-1 font-sans font-bold text-3xl text-[#0A1628]">{item.name}</h2>
                        </Link>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-extrabold text-[#0A1628]">{formatCurrency(item.unitPrice)}</div>
                        {item.originalPrice && item.originalPrice > item.unitPrice ? (
                          <div className="text-sm text-[#94A3B8] line-through">{formatCurrency(item.originalPrice)}</div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="relative flex items-center gap-3 rounded-full bg-[#0A1628] px-3 py-2 text-white shadow-[0_18px_32px_rgba(10,22,40,0.22)]">
                        <AnimatePresence>
                          {feedback ? (
                            <motion.div
                              key={feedback.token}
                              initial={{ opacity: 0, y: 12, scale: 0.7 }}
                              animate={{ opacity: [0, 1, 1, 0], y: [12, -6, -14, -24], scale: [0.7, 1.08, 1, 0.94] }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
                              className={`pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-[0_10px_18px_rgba(10,22,40,0.16)] ${
                                feedback.delta > 0
                                  ? "bg-[#D4A853] text-[#0A1628]"
                                  : "bg-white text-[#0A1628]"
                              }`}
                            >
                              {feedback.delta > 0 ? "+1 added" : "-1"}
                            </motion.div>
                          ) : null}
                        </AnimatePresence>

                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDecrease(item.variantId, item.quantity)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/18"
                        >
                          {item.quantity === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                        </motion.button>

                        <div className="min-w-[2.4rem] text-center text-lg font-semibold">
                          <AnimatePresence initial={false} mode="popLayout">
                            <motion.div
                              key={quantityMotionKey}
                              initial={{
                                opacity: 0,
                                y: feedback?.delta === -1 ? -8 : 8,
                                scale: 0.82,
                              }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{
                                opacity: 0,
                                y: feedback?.delta === -1 ? 8 : -8,
                                scale: 0.82,
                              }}
                              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                            >
                              {item.quantity}
                            </motion.div>
                          </AnimatePresence>
                        </div>

                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.9 }}
                          animate={feedback?.delta === 1 ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                          onClick={() => handleIncrease(item.variantId, item.quantity)}
                          disabled={!canIncrease}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#D4A853] text-[#0A1628] transition hover:bg-[#E0B96A] disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/45"
                        >
                          <Plus className="h-4 w-4" />
                        </motion.button>
                      </div>

                      <div className="text-right">
                        <div className="text-xs uppercase tracking-[0.18em] text-[#6B7B94]">Line total</div>
                        <div className="mt-1 text-xl font-semibold text-[#0A1628]">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </div>
                        {availableStock !== undefined && item.quantity >= availableStock ? (
                          <div className="mt-1 text-xs font-semibold text-[#B8860B]">Max stock selected</div>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.variantId)}
                        className="rounded-full border border-[#E2E8F0] px-4 py-2 text-sm font-semibold text-[#DC2626] transition hover:bg-[#FEF2F2]"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })}

          <div className="rounded-[2rem] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,253,0.98))] p-5 shadow-[0_18px_42px_rgba(10,22,40,0.06)] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#EBF0FF] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1E5AFA]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Special offers
                </div>
                <h2 className="mt-4 font-sans font-bold text-3xl text-[#0A1628]">Buy more, unlock free items</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7B94]">
                  Buy-and-get offers appear here before checkout, so you can see free-item rewards while you shop.
                </p>
              </div>
              {unlockedFreeItems > 0 ? (
                <div className="rounded-full bg-[#0A1628] px-4 py-2 text-sm font-semibold text-white">
                  {unlockedFreeItems} free item{unlockedFreeItems === 1 ? "" : "s"} unlocked
                </div>
              ) : null}
            </div>

            {isLoadingFreeItemOffers ? (
              <div className="mt-5 flex items-center gap-2 text-sm text-[#1E5AFA]">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading active free-item offers...
              </div>
            ) : freeItemOfferPreviews.length > 0 ? (
              <div className="mt-5 space-y-4">
                {freeItemOfferPreviews.slice(0, 3).map((preview) => {
                  const qualifyingLabel = getOfferLabel(preview.offer, "qualifying");
                  const freeLabel = getOfferLabel(preview.offer, "free");
                  const previewImage = preview.offer.freeProductImage || preview.offer.qualifyingProductImage || "";
                  const isUnlocked = preview.unlockedFreeQuantity > 0;

                  return (
                    <div
                      key={preview.offer.id}
                      className={`rounded-[1.6rem] border p-4 shadow-[0_14px_28px_rgba(10,22,40,0.04)] ${
                        isUnlocked ? "border-[#EEF2F7] bg-[#F8FAFD]" : "border-[#E2E8F0] bg-white"
                      }`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[1.4rem] bg-[radial-gradient(circle_at_top,#F0F3F8,#EEF2F7_72%)] p-3">
                          {previewImage ? (
                            <img
                              src={previewImage}
                              alt={freeLabel}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <Gift className="h-8 w-8 text-[#1E5AFA]" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-[#0A1628]">
                                {preview.offer.name || `Buy ${preview.qualifyingQuantity}, get ${preview.freeQuantity} free`}
                              </div>
                              <div className="mt-1 text-sm text-[#1E5AFA]">
                                Buy {preview.qualifyingQuantity} x {qualifyingLabel}
                              </div>
                            </div>
                            <div
                              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                                isUnlocked
                                  ? "bg-[#0A1628] text-white"
                                  : "bg-[#FEF7E8] text-[#B8860B]"
                              }`}
                            >
                              {isUnlocked ? `Unlocked ${preview.unlockedFreeQuantity} free` : `Add ${preview.missingQuantity} more`}
                            </div>
                          </div>

                          <p className="mt-3 text-sm leading-6 text-[#6B7B94]">
                            Get {preview.freeQuantity} x {freeLabel} free
                            {preview.offer.description ? `.` : " when the qualifying quantity is reached."}
                          </p>
                          {preview.offer.description ? (
                            <p className="mt-1 text-sm leading-6 text-[#6B7B94]">{preview.offer.description}</p>
                          ) : null}

                          <div className="mt-4">
                            <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7B94]">
                              <span>Cart progress</span>
                              <span>
                                {preview.matchingQuantity}/{preview.qualifyingQuantity}
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-[#E2E8F0]">
                              <div
                                className={`h-full rounded-full ${
                                  isUnlocked ? "bg-[#1E5AFA]" : "bg-[#D4A853]"
                                }`}
                                style={{ width: `${preview.progressPercent}%` }}
                              />
                            </div>
                          </div>

                          <div className="mt-4 text-sm font-medium text-[#1E5AFA]">
                            {isUnlocked
                              ? `${preview.unlockedFreeQuantity} free ${freeLabel} will be included with your order at checkout.`
                              : `Add ${preview.missingQuantity} more ${qualifyingLabel} to unlock this offer.`}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-[1.5rem] border border-dashed border-[#E2E8F0] bg-white px-4 py-4 text-sm text-[#6B7B94]">
                No active free-item offers are available right now.
              </div>
            )}
          </div>
        </section>

        <aside className="xl:sticky xl:top-28 xl:self-start">
          <div className="rounded-[2.2rem] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,253,0.98))] p-6 shadow-[0_25px_60px_rgba(10,22,40,0.08)]">
            <h2 className="section-title">Order summary</h2>
            <p className="mt-2 text-sm text-[#6B7B94]">
              Delivery charges, savings, and coupon-ready totals are organized here before you move into checkout.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-3">
              <div className="rounded-[1.5rem] border border-[#E2E8F0] bg-white px-4 py-4 shadow-[0_12px_24px_rgba(10,22,40,0.04)]">
                <Truck className="h-5 w-5 text-[#1E5AFA]" />
                <div className="mt-3 text-xs uppercase tracking-[0.18em] text-[#6B7B94]">Delivery</div>
                <div className="mt-1 text-lg font-semibold text-[#0A1628]">
                  {feeBreakdown.deliveryCharge > 0 ? formatCurrency(feeBreakdown.deliveryCharge) : "Included"}
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-[#E2E8F0] bg-white px-4 py-4 shadow-[0_12px_24px_rgba(10,22,40,0.04)]">
                <TicketPercent className="h-5 w-5 text-[#DC2626]" />
                <div className="mt-3 text-xs uppercase tracking-[0.18em] text-[#6B7B94]">Savings</div>
                <div className="mt-1 text-lg font-semibold text-[#0A1628]">
                  {savings > 0 ? formatCurrency(savings) : "No discount yet"}
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-[#E2E8F0] bg-white px-4 py-4 shadow-[0_12px_24px_rgba(10,22,40,0.04)]">
                <ShieldCheck className="h-5 w-5 text-[#1E5AFA]" />
                <div className="mt-3 text-xs uppercase tracking-[0.18em] text-[#6B7B94]">Checkout</div>
                <div className="mt-1 text-lg font-semibold text-[#0A1628]">
                  {isLoadingSettings ? "Syncing" : "Ready"}
                </div>
              </div>
            </div>

            {isLoadingSettings ? (
              <div className="mt-6 flex items-center gap-2 text-sm text-[#1E5AFA]">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading checkout fees...
              </div>
            ) : (
              <div className="mt-6 space-y-3 text-sm text-[#6B7B94]">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#0A1628]">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Delivery charge</span>
                  <span className="font-semibold text-[#0A1628]">{formatCurrency(feeBreakdown.deliveryCharge)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Platform fee</span>
                  <span className="font-semibold text-[#0A1628]">{formatCurrency(feeBreakdown.platformFee)}</span>
                </div>
                {feeBreakdown.handlingCharge > 0 ? (
                  <div className="flex items-center justify-between">
                    <span>Handling</span>
                    <span className="font-semibold text-[#0A1628]">{formatCurrency(feeBreakdown.handlingCharge)}</span>
                  </div>
                ) : null}
                {feeBreakdown.smallCartFee > 0 ? (
                  <div className="flex items-center justify-between">
                    <span>Small cart fee</span>
                    <span className="font-semibold text-[#0A1628]">{formatCurrency(feeBreakdown.smallCartFee)}</span>
                  </div>
                ) : null}
                {savings > 0 ? (
                  <div className="flex items-center justify-between text-[#1E5AFA]">
                    <span>Your savings</span>
                    <span className="font-semibold">- {formatCurrency(savings)}</span>
                  </div>
                ) : null}
              </div>
            )}

            {feeBreakdown.remainingForFreeDelivery > 0 ? (
              <div className="mt-5 rounded-[1.5rem] border border-[#F0DDB1] bg-[#FEF7E8] px-4 py-3 text-sm text-[#B8860B]">
                Add {formatCurrency(feeBreakdown.remainingForFreeDelivery)} more to unlock free delivery and avoid the small-cart fee.
              </div>
            ) : null}

            {feeBreakdown.freeDeliveryThreshold > 0 ? (
              <div className="mt-4 rounded-[1.5rem] border border-[#E2E8F0] bg-[#F8FAFD] px-4 py-3 text-sm text-[#6B7B94]">
                Delivery becomes free from {formatCurrency(feeBreakdown.freeDeliveryThreshold)}, and all order fees stay clear before payment.
              </div>
            ) : null}

            <div className="mt-6 border-t border-[#E2E8F0] pt-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6B7B94]">Estimated total</span>
                <span className="font-sans font-bold text-4xl text-[#0A1628]">{formatCurrency(feeBreakdown.total)}</span>
              </div>
            </div>

            <div className="mt-6 rounded-[1.6rem] border border-[#E2E8F0] bg-[#F8FAFD] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-[0_12px_20px_rgba(10,22,40,0.05)]">
                  <TicketPercent className="h-5 w-5 text-[#1E5AFA]" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-[#0A1628]">Active coupons</div>
                  <p className="mt-1 text-sm leading-6 text-[#6B7B94]">
                    Visible here now, and any selected code will be carried into checkout.
                  </p>
                </div>
              </div>

              {isLoadingCoupons ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-[#1E5AFA]">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Loading active coupons...
                </div>
              ) : activeCoupons.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {bestCoupon ? (
                    <div className="rounded-[1.4rem] border border-[#EEF2F7] bg-[#F8FAFD] p-4 shadow-[0_12px_24px_rgba(10,22,40,0.04)]">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1E5AFA]">Best coupon</div>
                      <div className="mt-2 flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-[#0A1628]">{bestCoupon.coupon.code}</div>
                          <div className="mt-1 text-sm text-[#1E5AFA]">
                            Save {formatCurrency(bestCoupon.discount)} on this cart
                          </div>
                        </div>
                        <Link
                          to={`/checkout?coupon=${encodeURIComponent(bestCoupon.coupon.code)}`}
                          className="rounded-full bg-[#0A1628] px-4 py-2 text-sm font-semibold text-white"
                        >
                          Apply
                        </Link>
                      </div>
                    </div>
                  ) : null}
                  {activeCoupons.slice(0, 3).map((coupon) => (
                    <div
                      key={coupon.id}
                      className="rounded-[1.4rem] border border-[#E2E8F0] bg-white p-4 shadow-[0_12px_24px_rgba(10,22,40,0.04)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-[#0A1628]">{coupon.code}</div>
                          <div className="mt-1 text-sm text-[#1E5AFA]">{formatCouponHeadline(coupon)}</div>
                        </div>
                        <div className="rounded-full bg-[#EBF0FF] px-3 py-1 text-xs font-semibold text-[#1E5AFA]">
                          Min {formatCurrency(coupon.minCartValue || 0)}
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[#6B7B94]">
                        {coupon.description || "Save more on fruits, staples, and everyday orders."}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs uppercase tracking-[0.16em] text-[#6B7B94]">
                          {coupon.firstTimeUserOnly ? "First order only" : "Available now"}
                        </div>
                        <Link
                          to={`/checkout?coupon=${encodeURIComponent(coupon.code)}`}
                          className="inline-flex items-center justify-center rounded-full bg-[#0A1628] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1A2D4A]"
                        >
                          Use in checkout
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-[1.4rem] border border-dashed border-[#E2E8F0] bg-white px-4 py-4 text-sm text-[#6B7B94]">
                  No active coupons are available right now.
                </div>
              )}
            </div>

            <Link
              to="/checkout"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1E5AFA] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(30,90,250,0.24)] transition hover:bg-[#1548D4]"
            >
              Proceed to checkout
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

