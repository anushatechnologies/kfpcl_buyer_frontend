import type { Metadata } from 'next';
import LoginClient from './LoginClient';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to your Karthikeya Farmer Producer Company Limited account.',
};

export default function LoginPage() {
  return <LoginClient />;
}
