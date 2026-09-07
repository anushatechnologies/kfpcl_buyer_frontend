import type { Metadata } from 'next';
import './globals.css';
import LayoutShell from '@/components/layout/LayoutShell';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: {
    template: '%s | Karthikeya Farmer Producer Company Limited',
    default: 'Karthikeya Farmer Producer Company Limited — India\'s B2B Export Marketplace',
  },
  description:
    'Karthikeya Farmer Producer Company Limited is India\'s trusted B2B marketplace for agro commodities, spices, textiles, and industrial goods. Connect buyers and sellers globally.',
  keywords: [
    'B2B marketplace',
    'India exports',
    'agro commodities',
    'spices export',
    'APEDA',
    'RFQ',
    'trade',
    'Karthikeya Farmer Producer Company Limited',
  ],
  authors: [{ name: 'Karthikeya Farmer Producer Company Limited' }],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://kfpcl-exports.com',
    siteName: 'Karthikeya Farmer Producer Company Limited',
    title: 'Karthikeya Farmer Producer Company Limited — India\'s B2B Export Marketplace',
    description: 'Connect Indian exporters with global buyers',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-dark-50">
        <Providers>
          <LayoutShell>{children}</LayoutShell>
        </Providers>
      </body>
    </html>
  );
}
