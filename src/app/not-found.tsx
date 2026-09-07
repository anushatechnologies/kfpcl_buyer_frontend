import Link from 'next/link';
import { AlertTriangle, Home, Package } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 animate-fade-in">
      <div className="text-center max-w-md">
        <div className="h-20 w-20 rounded-full bg-accent-50 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="h-10 w-10 text-accent-500" />
        </div>
        <h1 className="text-6xl font-bold font-display text-dark-200 mb-2">404</h1>
        <h2 className="text-2xl font-bold font-display text-dark-900 mb-3">Page Not Found</h2>
        <p className="text-dark-500 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn-primary">
            <Home className="h-4 w-4" />
            Go Home
          </Link>
          <Link href="/products" className="btn-secondary">
            <Package className="h-4 w-4" />
            Browse Products
          </Link>
        </div>
      </div>
    </div>
  );
}
