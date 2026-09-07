import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link } from "react-router";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { formatCurrency, getProductHref } from "../lib/storefrontUtils";
import { useCartStore } from "../store/cartStore";

export const OPEN_CART_DRAWER_EVENT = "kfpcl:open-cart-drawer";

export function openCartDrawer() {
  window.dispatchEvent(new Event(OPEN_CART_DRAWER_EVENT));
}

export function CartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const cart = useCartStore((state) => state.cart);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const subtotal = useCartStore((state) => state.getSubtotal());
  const hasOutOfStockItems = cart.some((item) => {
    const s = Number(item.stock);
    return Number.isFinite(s) && s <= 0;
  });

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener(OPEN_CART_DRAWER_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_CART_DRAWER_EVENT, handleOpen);
  }, []);

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.button
            type="button"
            aria-label="Close cart preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-[70] hidden bg-[#0A4D3C]/15 backdrop-blur-[4px] lg:block"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-0 right-0 top-0 z-[80] flex w-full flex-col border-l border-gray-150/40 bg-[#FAF9F6] shadow-2xl sm:w-[min(28rem,100vw)]"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-5 shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4A853]">Basket Overview</div>
                <h2 className="font-serif font-black text-2xl text-[#0A4D3C] tracking-tight mt-0.5">Your Basket</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-[#0A4D3C] hover:bg-[#0A4D3C] hover:text-white transition-all shadow-sm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              {cart.length ? (
                <div className="space-y-4">
                  {cart.map((item) => {
                    const stock = Number(item.stock);
                    const isOutOfStock = Number.isFinite(stock) && stock <= 0;
                    const canIncrease = !isOutOfStock && (!Number.isFinite(stock) || item.quantity < stock);
                    return (
                      <div
                        key={item.variantId}
                        className={`group relative flex gap-4 rounded-3xl border bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.01)] transition-all duration-300 hover:border-[#D4A853]/35 hover:shadow-[0_8px_30px_rgba(0,0,0,0.035)] ${
                          isOutOfStock ? "border-red-200 bg-red-50/20" : "border-gray-150/50"
                        }`}
                      >
                        {/* Top-Right Absolute Remove Button */}
                        <button
                          type="button"
                          onClick={() => removeItem(item.variantId)}
                          className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>

                        {/* Left: Product Image */}
                        <Link to={getProductHref({ id: item.productId, name: item.name })} onClick={() => setIsOpen(false)} className="shrink-0">
                          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#FAF8F5] border border-gray-100 p-2 shadow-inner group-hover:scale-[1.02] transition-transform duration-300">
                            <img src={item.imageUrl} alt={item.name} className="h-[90%] w-[90%] object-contain mix-blend-multiply" />
                          </div>
                        </Link>

                        {/* Right: Info details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between pr-4">
                          <div>
                            <h4 className="truncate text-[13.5px] font-extrabold text-gray-800 tracking-tight hover:text-[#0A4D3C] transition-colors leading-tight">
                              {item.name}
                            </h4>
                            <div className="mt-1 text-[9px] font-extrabold uppercase tracking-widest text-[#D4A853] bg-[#0A4D3C]/5 border border-[#D4A853]/15 px-2 py-0.5 rounded w-fit">
                              {item.variantName}
                            </div>
                          </div>

                          {isOutOfStock ? (
                            <div className="mt-2 rounded-lg bg-red-50 border border-red-100 px-2.5 py-0.5 text-center text-[9px] font-black uppercase tracking-wider text-red-600">
                              Out of stock
                            </div>
                          ) : (
                            <div className="mt-2.5 flex items-center justify-between gap-2">
                              <span className="text-sm font-black text-[#0A4D3C]">{formatCurrency(item.unitPrice)}</span>
                              
                              {/* Quantity Controller Pill (Compact) */}
                              <div className="flex items-center gap-2 rounded-lg bg-[#0A4D3C] px-1.5 py-0.5 text-white border border-[#D4A853]/20">
                                <button
                                  type="button"
                                  onClick={() => setQuantity(item.variantId, item.quantity - 1)}
                                  className="flex h-6 w-6 items-center justify-center rounded hover:bg-white/10 text-white transition-colors"
                                >
                                  {item.quantity === 1 ? <Trash2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                                </button>
                                <span className="min-w-[16px] text-center text-xs font-black text-white">{item.quantity}</span>
                                <button
                                  type="button"
                                  disabled={!canIncrease}
                                  onClick={() => setQuantity(item.variantId, item.quantity + 1)}
                                  className="flex h-6 w-6 items-center justify-center rounded bg-[#D4A853] text-[#0A4D3C] hover:bg-[#D4A853]/90 disabled:bg-white/10 disabled:text-white/30 transition-colors"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
                  <div className="mx-auto h-14 w-14 rounded-full bg-[#0A4D3C]/5 flex items-center justify-center text-[#D4A853]">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                  <div className="mt-5 text-sm font-black text-[#0A4D3C] uppercase tracking-wider">Your cart is empty</div>
                  <p className="mt-2 text-xs text-[#7C9A90] font-semibold leading-relaxed">Add items to your basket and they will appear here instantly.</p>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-gray-150/40 bg-white p-6 shadow-[0_-4px_20px_rgba(0,0,0,0.015)]">
              {/* Delivery Policy info block */}
              {cart.length ? (
                <div className="bg-[#FAF8F5] border border-gray-150/40 rounded-2xl p-3.5 space-y-1.5 mb-4">
                  <div className="flex justify-between items-center text-[10px] font-black text-[#0A4D3C]">
                    <span className="uppercase tracking-wider flex items-center gap-1">🚚 Delivery Policy</span>
                    <span className="text-[#D4A853]">FREE</span>
                  </div>
                  <p className="text-[11px] font-semibold text-gray-500 leading-normal">
                    Your order qualifies for **Free Standard Delivery** across Hyderabad!
                  </p>
                </div>
              ) : null}

              <div className="mb-5 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#7C9A90]">Subtotal</span>
                <span className="font-sans font-black text-2xl text-[#0A4D3C]">{formatCurrency(subtotal)}</span>
              </div>
              {hasOutOfStockItems && (
                <p className="mb-4 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-center text-xs font-medium text-red-600">
                  Remove out-of-stock items before checking out.
                </p>
              )}
              <Link
                to={cart.length && !hasOutOfStockItems ? "/checkout" : "/shop"}
                onClick={() => setIsOpen(false)}
                className={`group/checkout inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-4 text-xs font-black uppercase tracking-wider text-white transition-all ${
                  hasOutOfStockItems
                    ? "pointer-events-none bg-gray-300 text-gray-500"
                    : "bg-[#0A4D3C] hover:bg-[#D4A853] hover:text-[#0A4D3C] shadow-[0_8px_30px_rgba(10,77,60,0.12)] hover:shadow-[0_8px_30px_rgba(212,168,83,0.22)] active:scale-[0.98]"
                }`}
                aria-disabled={hasOutOfStockItems}
              >
                {cart.length && !hasOutOfStockItems ? "Proceed to Checkout" : cart.length ? "Remove out-of-stock items" : "Explore Products"}
                <ArrowRight className="h-3.5 w-3.5 group-hover/checkout:translate-x-1 transition-transform" />
              </Link>
              
              {/* Trust security indicators */}
              <div className="mt-4 text-center text-[9px] text-gray-400 font-bold flex items-center justify-center gap-1.5 leading-none">
                <span>🔒 Secure Checkout</span>
                <span>•</span>
                <span>💳 Cards & UPI</span>
                <span>•</span>
                <span>🔄 Easy Returns</span>
              </div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
