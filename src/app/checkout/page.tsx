import type { Metadata } from 'next';
import CheckoutClient from './CheckoutClient';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your order on Karthikeya Farmer Producer Company Limited.',
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
