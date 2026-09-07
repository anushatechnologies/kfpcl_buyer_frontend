import Link from 'next/link';
import { Globe, Mail, Phone, MapPin, ExternalLink } from 'lucide-react';

const FOOTER_LINKS = {
  Marketplace: [
    { label: 'Browse Products', href: '/products' },
    { label: 'Submit RFQ', href: '/rfq' },
    { label: 'Categories', href: '/products' },
    { label: 'Featured Sellers', href: '/sellers' },
  ],
  'Seller Tools': [
    { label: 'Seller Dashboard', href: '/seller/dashboard' },
    { label: 'List Products', href: '/seller/products' },
    { label: 'Manage RFQs', href: '/seller/rfqs' },
    { label: 'Order Management', href: '/seller/orders' },
  ],
  Company: [
    { label: 'About Karthikeya Farmer Producer Company Limited', href: '/about' },
    { label: 'Trade Compliance', href: '/compliance' },
    { label: 'Certifications', href: '/certifications' },
    { label: 'Contact Us', href: '/contact' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Refund Policy', href: '/refunds' },
    { label: 'Disclaimer', href: '/disclaimer' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-dark-900 text-dark-300">
      {/* ── Top strip ── */}
      <div className="border-b border-dark-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/images/image-logo.png"
                  alt="KFPCL Logo"
                  className="h-11 w-11 rounded-xl bg-white p-1 object-contain border border-white/10 shadow-md"
                />
                <div>
                  <span className="block text-lg font-bold font-display text-white leading-none">
                    Karthikeya Farmer Producer Company Limited
                  </span>
                  <span className="block text-xs text-brand-400 tracking-wider uppercase mt-0.5">
                    B2B Global Marketplace
                  </span>
                </div>
              </div>
              <p className="text-sm text-dark-400 max-w-sm leading-relaxed">
                Connecting Indian exporters with global buyers. Trusted trade
                facilitation for agro commodities, spices, textiles, and
                industrial goods.
              </p>
            </div>

            {/* Contact */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
                Get in Touch
              </h4>
              <div className="space-y-2">
                <a
                  href="mailto:kfpclexports@gmail.com"
                  className="flex items-center gap-2.5 text-sm text-dark-400 hover:text-brand-400 transition-colors group"
                >
                  <Mail className="h-4 w-4 text-brand-600 group-hover:text-brand-400 flex-shrink-0" />
                  kfpclexports@gmail.com
                </a>
                <a
                  href="tel:+916309981444"
                  className="flex items-center gap-2.5 text-sm text-dark-400 hover:text-brand-400 transition-colors group"
                >
                  <Phone className="h-4 w-4 text-brand-600 group-hover:text-brand-400 flex-shrink-0" />
                  +91 6309 981 444
                </a>
                <div className="flex items-start gap-2.5 text-sm text-dark-400">
                  <MapPin className="h-4 w-4 text-brand-600 flex-shrink-0 mt-0.5" />
                  <span>
                    C99F+VXG, Madhura Nagar Colony, Gachibowli, Hyderabad, Telangana 500104.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Link columns ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="text-sm font-semibold text-white mb-4">{heading}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-dark-400 hover:text-brand-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-dark-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-dark-500">
            © {new Date().getFullYear()} Karthikeya Farmer Producer Company Limited. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-dark-500 flex items-center gap-1">
              <Globe className="h-3 w-3" />
              India&apos;s Trusted B2B Export Platform
            </span>
            <a
              href="https://apeda.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-dark-500 hover:text-brand-400 flex items-center gap-1 transition-colors"
            >
              APEDA Member
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
