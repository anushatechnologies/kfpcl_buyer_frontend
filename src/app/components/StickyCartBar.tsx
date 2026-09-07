import { Link, useLocation } from "react-router";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { formatCurrency } from "../lib/storefrontUtils";
import { useCartStore } from "../store/cartStore";

export function StickyCartBar() {
  const routeLocation = useLocation();
  const totalItems = useCartStore((state) => state.getTotalItems());
  const productCount = useCartStore((state) => state.getProductCount());
  const subtotal = useCartStore((state) => state.getSubtotal());

  if (!totalItems || routeLocation.pathname === "/cart" || routeLocation.pathname === "/checkout") {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:hidden">
      <Link
        to="/cart"
        data-cart-target="true"
        className="flex items-center justify-between gap-3 rounded-[1.35rem] border border-white/20 bg-[#0A1628] px-4 py-3 text-white shadow-[0_18px_38px_rgba(10,22,40,0.32)]"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/12">
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#D4A853] px-1 text-[11px] font-bold text-[#0A1628]">
              {productCount}
            </span>
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">
              {totalItems} item{totalItems === 1 ? "" : "s"} in cart
            </div>
            <div className="mt-0.5 text-xs text-white/65">{formatCurrency(subtotal)}</div>
          </div>
        </div>
        <div className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#D4A853] px-3 py-2 text-xs font-semibold text-[#0A1628]">
          View
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </Link>
    </div>
  );
}
