import { Suspense } from 'react';
import type { Metadata } from 'next';
import RFQClient from './RFQClient';

export const metadata: Metadata = {
  title: 'Request for Quotation',
  description: 'Submit an RFQ to receive competitive quotes from verified Indian exporters.',
};

export default function RFQPage() {
  return (
    <Suspense
      fallback={
        <div className="section animate-fade-in py-20 flex flex-col items-center justify-center gap-3">
          <div className="h-10 w-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-dark-500">Loading RFQ Portal...</p>
        </div>
      }
    >
      <RFQClient />
    </Suspense>
  );
}

