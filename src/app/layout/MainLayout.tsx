import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { AuthModal } from "../components/AuthModal";
import { CallModal } from "../components/CallModal";
import { CartDrawer } from "../components/CartDrawer";
import { CartFlyToIcon } from "../components/CartFlyToIcon";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { StickyCartBar } from "../components/StickyCartBar";
import { getCustomerProfile } from "../data/storefrontData";
import { useAuthStore } from "../store/authStore";
import { useLocationStore } from "../store/locationStore";

export function MainLayout() {
  const routeLocation = useLocation();
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const hydrateFromStorage = useAuthStore((state) => state.hydrateFromStorage);
  const hydrateLocation = useLocationStore((state) => state.hydrateFromStorage);
  const requestCurrentLocation = useLocationStore((state) => state.requestCurrentLocation);
  const location = useLocationStore((state) => state.location);
  const isLocationHydrated = useLocationStore((state) => state.isHydrated);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    hydrateLocation();
  }, [hydrateLocation]);

  useEffect(() => {
    if (!isLocationHydrated) return;
    if (location.source === "device") return;
    if (location.permission === "denied" || location.permission === "unsupported") return;
    void requestCurrentLocation();
  }, [isLocationHydrated, location.permission, location.source, requestCurrentLocation]);

  useEffect(() => {
    if (!session?.accessToken || profile?.id === session.customerId) return;

    if (session.accessToken.startsWith("demo-")) {
      updateProfile({
        id: session.customerId || 1,
        name: session.name || "Customer",
        phoneNumber: session.phoneNumber || "",
        email: session.email || "",
        walletBalance: session.walletBalance || 0,
        isActive: true,
      });
      return;
    }

    let isMounted = true;

    getCustomerProfile()
      .then((nextProfile) => {
        if (isMounted) {
          updateProfile(nextProfile);
        }
      })
      .catch(() => {
        // Silent failure keeps public browsing available.
      });

    return () => {
      isMounted = false;
    };
  }, [profile?.id, session?.accessToken, session?.customerId, session?.name, session?.phoneNumber, session?.email, session?.walletBalance, updateProfile]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [routeLocation.pathname, routeLocation.search]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#EEF2F9_0,#F8FAFD_28%,#F5F7FB_100%)] text-[#1A2332]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(30,90,250,0.06),transparent_28%),radial-gradient(circle_at_80%_12%,rgba(212,168,83,0.07),transparent_20%)]" />
      <Navbar />
      <CartFlyToIcon />
      <CartDrawer />
      <main className="relative z-10 flex-1">
        <Outlet />
      </main>
      <Footer />
      <StickyCartBar />
      <AuthModal />
      <CallModal />
    </div>
  );
}
