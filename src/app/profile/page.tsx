import type { Metadata } from 'next';
import ProfileClient from './ProfileClient';

export const metadata: Metadata = {
  title: 'My Profile',
  description: 'Manage your Karthikeya Farmer Producer Company Limited account profile and company details.',
};

export default function ProfilePage() {
  return <ProfileClient />;
}
