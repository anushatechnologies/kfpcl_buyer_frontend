'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const AUTH_ROUTES = ['/login', '/register'];

// Routes where the main site Navbar/Footer should be completely hidden.
// The Supplier Center has its own self-contained header.
const SUPPLIER_DASHBOARD_ROUTES = ['/seller/dashboard', '/supplier/dashboard'];

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_ROUTES.includes(pathname);
  const isSupplierDashboard = SUPPLIER_DASHBOARD_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Auth pages: no chrome at all
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Supplier Center: no public Navbar/Footer – the dashboard has its own chrome
  if (isSupplierDashboard) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}

