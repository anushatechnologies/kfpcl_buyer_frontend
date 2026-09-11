import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { FileText, LogIn } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useAuthStore as useLegacyAuthStore } from "@/store/authStore";
import { BuyerRFQDashboard } from "../components/BuyerRFQDashboard";

export function RFQPage() {
  const session = useAuthStore((state) => state.session);
  const openAuthModal = useAuthStore((state) => state.openAuthModal);
  const hydrateFromStorage = useAuthStore((state) => state.hydrateFromStorage);
  const legacyIsAuthenticated = useLegacyAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  const isAuthenticated = Boolean(
    session?.accessToken ||
    legacyIsAuthenticated ||
    (typeof window !== "undefined" && (localStorage.getItem("accessToken") || localStorage.getItem("kfpcl_token")))
  );

  const didOpenModal = useRef(false);

  // Automatically trigger the sign-in modal on mount if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !didOpenModal.current) {
      didOpenModal.current = true;
      openAuthModal();
    }
  }, [isAuthenticated, openAuthModal]);

  return (
    <div className="app-shell max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {!isAuthenticated ? (
        <div className="rounded-[2.4rem] border border-[#E2E8F0] bg-white p-8 sm:p-14 text-center max-w-xl mx-auto shadow-[0_20px_50px_rgba(10,22,40,0.04)]">
          <div className="h-20 w-20 rounded-3xl bg-[#F4F7F5] text-[#0A4D3C] flex items-center justify-center mx-auto mb-5 border border-[#E2E8F0] shadow-sm">
            <FileText className="h-10 w-10 text-[#0A4D3C]" />
          </div>
          <h2 className="text-2xl font-bold font-sans text-[#0A1628] mb-2">
            Sign In to View Your RFQs
          </h2>
          <p className="text-sm text-[#6B7B94] mb-8 max-w-md mx-auto leading-relaxed">
            Your submitted Requests for Quotation and supplier quotations are securely linked to your buyer account. Please sign in to view your inquiries.
          </p>
          <button
            type="button"
            onClick={openAuthModal}
            className="inline-flex items-center gap-2 rounded-full bg-[#0A4D3C] hover:bg-[#D4A853] hover:text-[#0A4D3C] px-8 py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-300 cursor-pointer"
          >
            <LogIn className="h-4 w-4" />
            Sign In with OTP
          </button>
          <p className="text-xs text-[#6B7B94] mt-5">
            Don&apos;t have an account yet?{" "}
            <Link to="/register" className="font-bold text-[#0A4D3C] hover:underline">
              Register here
            </Link>
          </p>
        </div>
      ) : (
        <BuyerRFQDashboard />
      )}
    </div>
  );
}
