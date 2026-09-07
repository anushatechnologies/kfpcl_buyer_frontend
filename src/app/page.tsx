import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  TrendingUp,
  Shield,
  Globe,
  Truck,
  FileText,
  Package,
  Users,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import HeroCarousel from '@/components/home/HeroCarousel';
import ShopByCategory from '@/components/home/ShopByCategory';
import ShopBySubcategory from '@/components/home/ShopBySubcategory';
import FeaturedProducts from '@/components/home/FeaturedProducts';

export const metadata: Metadata = {
  title: 'Karthikeya Farmer Producer Company Limited — India\'s B2B Export Marketplace',
  description:
    'Discover premium Indian exports: basmati rice, spices, edible oils, and more. Connect with verified sellers and submit RFQs instantly.',
};

const STATS = [
  { label: 'Verified Sellers', value: '2,400+', icon: Users },
  { label: 'Products Listed', value: '18,000+', icon: Package },
  { label: 'Countries Served', value: '60+', icon: Globe },
  { label: 'Orders Fulfilled', value: '₹120 Cr+', icon: TrendingUp },
];

const WHY_KFPCL = [
  {
    icon: Shield,
    title: 'Verified Sellers',
    description: 'All sellers are APEDA-verified with GST credentials and export licences validated.',
  },
  {
    icon: FileText,
    title: 'Easy RFQ System',
    description: 'Submit a Request for Quotation in 2 minutes and receive competitive quotes.',
  },
  {
    icon: Truck,
    title: 'End-to-End Logistics',
    description: 'Integrated freight, customs, and documentation support for seamless exports.',
  },
  {
    icon: Globe,
    title: 'Global Network',
    description: 'Buyers in 60+ countries trust Karthikeya Farmer Producer Company Limited for high-quality Indian commodities.',
  },
];

export default function HomePage() {

  return (
    <div className="animate-fade-in">
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <HeroCarousel />

      {/* ─── Stats ────────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-dark-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <stat.icon className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <p className="text-xl font-bold font-display text-dark-900">{stat.value}</p>
                  <p className="text-xs text-dark-500">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Categories ───────────────────────────────────────────────────── */}
      {/* ─── Featured Products ─────────────────────────────────────────────── */}
      <ShopByCategory />

      <ShopBySubcategory />

      <FeaturedProducts />

      {/* ─── Why KFPCL ────────────────────────────────────────────────────── */}
      <section className="section">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold font-display text-dark-900">Why Choose Karthikeya Farmer Producer Company Limited?</h2>
          <p className="text-dark-500 mt-2 max-w-xl mx-auto">
            We combine decades of export experience with modern technology
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {WHY_KFPCL.map((item) => (
            <div key={item.title} className="card p-6 group hover:border-brand-200 transition-colors">
              <div className="h-12 w-12 rounded-xl bg-brand-50 group-hover:bg-brand-100 flex items-center justify-center mb-4 transition-colors">
                <item.icon className="h-6 w-6 text-brand-600" />
              </div>
              <h3 className="font-semibold text-dark-900 mb-2">{item.title}</h3>
              <p className="text-sm text-dark-500 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA Banner ───────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-brand-700 to-brand-600">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-white mb-3">
            Ready to Start Trading?
          </h2>
          <p className="text-brand-100 mb-8 max-w-xl mx-auto">
            Join 2,400+ verified exporters and connect with buyers in 60 countries
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register" className="btn-secondary text-base px-8 py-3 font-bold text-brand-700 hover:text-brand-800">
              Register Free
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/rfq" className="btn-outline-green text-base px-8 py-3 border-white/30 text-white hover:bg-white/10">
              Submit an RFQ
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
