import type { Metadata } from 'next';
import RegisterClient from './RegisterClient';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Register',
  description: 'Create your free Karthikeya Farmer Producer Company Limited account to start trading.',
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>}>
      <RegisterClient />
    </Suspense>
  );
}
