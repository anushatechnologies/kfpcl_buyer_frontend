'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  Shield,
  Edit3,
  ShoppingCart,
  FileText,
  Heart,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Package,
  Settings,
  Bell,
  Lock,
  ArrowUpRight,
  Trash2,
  CheckCircle2,
  RefreshCw,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { profileApi } from '@/api/profile.api';
import { authApi } from '@/api/auth.api';

export default function ProfileClient() {
  const router = useRouter();
  const { user, isAuthenticated, clearAuth, updateUser } = useAuthStore();
  const [isClient, setIsClient] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    companyName: '',
    businessType: '',
    state: '',
    city: '',
  });

  useEffect(() => {
    setIsClient(true);
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Fetch latest verified profile from backend (API 9)
    const loadProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const profile = await profileApi.getProfile();
        updateUser({
          name: profile.fullName || user?.name || '',
          email: profile.email || user?.email || '',
          phone: profile.phoneNumber || user?.phone || '',
          company: {
            id: user?.company?.id || `company-${profile.id}`,
            name: profile.companyName || user?.company?.name || '',
            address: {
              street: user?.company?.address?.street || '',
              city: profile.city || user?.company?.address?.city || '',
              state: profile.state || user?.company?.address?.state || '',
              pincode: user?.company?.address?.pincode || '',
              country: 'India',
            },
            industry: profile.businessType || user?.company?.industry || '',
          },
        });
      } catch (err) {
        console.warn('Could not refresh profile from backend:', err);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadProfile();
  }, [isAuthenticated, router]);

  const handleOpenEdit = () => {
    setEditForm({
      fullName: user?.name || '',
      email: user?.email || '',
      companyName: user?.company?.name || '',
      businessType: user?.company?.industry || '',
      state: user?.company?.address?.state || 'Telangana',
      city: user?.company?.address?.city || 'Hyderabad',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // API 10: Update Profile
      const updated = await profileApi.updateProfile(editForm);
      updateUser({
        name: updated.fullName,
        email: updated.email,
        company: {
          id: user?.company?.id || `company-${updated.id}`,
          name: updated.companyName || '',
          address: {
            street: user?.company?.address?.street || '',
            city: updated.city || '',
            state: updated.state || '',
            pincode: user?.company?.address?.pincode || '',
            country: 'India',
          },
          industry: updated.businessType || '',
        },
      });
      toast.success('Profile updated successfully!');
      setIsEditModalOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('kfpcl_refresh_token') || undefined : undefined;
    try {
      // API 8: Logout
      await authApi.logout(refreshToken);
    } catch (e) {
      console.warn('Logout API warning:', e);
    }
    clearAuth();
    router.push('/');
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to deactivate your buyer profile? Active sessions will be terminated.'
    );
    if (!confirmed) return;

    try {
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('kfpcl_refresh_token') || undefined : undefined;
      // API 11: Soft-delete Profile
      await profileApi.deleteProfile(refreshToken);
      toast.success('Your profile has been deactivated.');
      clearAuth();
      router.push('/');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to deactivate account.');
    }
  };

  if (!isClient || !user) {
    return (
      <div className="section animate-fade-in flex justify-center py-20">
        <div className="animate-pulse h-20 w-20 bg-dark-100 rounded-full"></div>
      </div>
    );
  }

  const isBuyer = user.role === 'buyer';

  return (
    <div className="section animate-fade-in py-8 sm:py-12">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Top Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-dark-900">
              Account &amp; Profile
            </h1>
            <p className="text-sm text-dark-500 mt-1">
              Manage your verified enterprise credentials, orders, and addresses
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenEdit}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-dark-100 hover:bg-dark-200 text-dark-800 transition"
            >
              <Edit3 className="h-3.5 w-3.5 text-dark-600" />
              Edit Profile
            </button>

            {!isBuyer && (
              <Link
                href="/supplier/dashboard"
                className="btn-primary text-xs sm:text-sm self-start sm:self-auto"
              >
                <LayoutDashboard className="h-4 w-4" />
                Supplier Dashboard
              </Link>
            )}
          </div>
        </div>

        {/* Profile overview card */}
        <div className="card p-6 relative">
          {isLoadingProfile && (
            <div className="absolute top-4 right-4 flex items-center gap-1 text-[11px] text-brand-700 bg-brand-50 px-2 py-1 rounded-md">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Syncing</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start gap-5 mb-6">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-2xl font-bold font-display shadow-sm flex-shrink-0 uppercase">
              {user.name.slice(0, 2)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h2 className="text-xl font-bold font-display text-dark-900">{user.name}</h2>
                <span className="badge-green capitalize font-semibold">
                  {user.role === 'buyer' ? 'Verified Buyer' : 'Verified Supplier'}
                </span>
              </div>
              <p className="text-dark-600 flex items-center gap-1.5 text-sm mb-1 font-medium">
                <Building2 className="h-4 w-4 text-brand-600" />
                {user.company?.name || `${user.name} Commercial`}
              </p>
              <p className="text-dark-400 text-xs">
                Account active since {new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Contact & Verification details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-dark-50 border border-dark-100">
              <Mail className="h-4 w-4 text-brand-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-dark-400 font-medium">Email Address</p>
                <p className="text-sm font-semibold text-dark-800 truncate">{user.email || 'Not provided'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-dark-50 border border-dark-100">
              <Phone className="h-4 w-4 text-brand-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-dark-400 font-medium">Phone Number</p>
                <p className="text-sm font-semibold text-dark-800 truncate">{user.phone || 'Verified via OTP'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-dark-50 border border-dark-100">
              <MapPin className="h-4 w-4 text-brand-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-dark-400 font-medium">Location / Region</p>
                <p className="text-sm font-semibold text-dark-800 truncate">
                  {user.company?.address?.city ? `${user.company.address.city}, ${user.company.address.state || 'India'}` : 'Telangana, India'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-dark-50 border border-dark-100">
              <ShieldCheck className="h-4 w-4 text-brand-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-dark-400 font-medium">KYC &amp; Verification</p>
                <p className="text-sm font-semibold text-emerald-700">
                  {user.isVerified ? '✅ Verified Account' : 'Pending Verification'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Hub Quick Navigation */}
        <div>
          <h3 className="font-bold font-display text-dark-900 text-lg mb-4">
            Buyer Activity &amp; Services
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/orders"
              className="card-hover p-4 rounded-xl border border-dark-200/90 flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-brand-50 group-hover:bg-brand-100 text-brand-700 flex items-center justify-center transition-colors">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-dark-900 group-hover:text-brand-700 transition-colors">
                    My Orders
                  </h4>
                  <p className="text-[11px] text-dark-400 mt-0.5">Track active &amp; past shipments</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-dark-400 group-hover:text-brand-600 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <Link
              href="/rfq"
              className="card-hover p-4 rounded-xl border border-dark-200/90 flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 group-hover:bg-blue-100 text-blue-700 flex items-center justify-center transition-colors">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-dark-900 group-hover:text-brand-700 transition-colors">
                    My RFQs &amp; Quotes
                  </h4>
                  <p className="text-[11px] text-dark-400 mt-0.5">Submit enquiries &amp; review bids</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-dark-400 group-hover:text-brand-600 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <Link
              href="/account?tab=addresses"
              className="card-hover p-4 rounded-xl border border-dark-200/90 flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-50 group-hover:bg-amber-100 text-amber-700 flex items-center justify-center transition-colors">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-dark-900 group-hover:text-brand-700 transition-colors">
                    Delivery Addresses
                  </h4>
                  <p className="text-[11px] text-dark-400 mt-0.5">Manage warehouse destinations</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-dark-400 group-hover:text-brand-600 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Account actions */}
        <div className="card p-5">
          <h3 className="font-bold font-display text-dark-900 text-base mb-3">Account Settings</h3>
          <div className="space-y-1">
            <button
              type="button"
              onClick={handleOpenEdit}
              className="w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold text-dark-700 hover:bg-dark-50 transition-colors flex items-center justify-between"
            >
              <span>Update Business Information</span>
              <ChevronRight className="h-3.5 w-3.5 text-dark-400" />
            </button>

            <button
              type="button"
              onClick={handleDeleteAccount}
              className="w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold text-amber-700 hover:bg-amber-50 transition-colors flex items-center gap-2"
            >
              <Trash2 className="h-3.5 w-3.5 text-amber-600" />
              <span>Deactivate Buyer Account</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 mt-2 pt-2 border-t border-dark-100"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out of Account</span>
            </button>
          </div>
        </div>

      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold font-display text-dark-900 mb-4">
              Edit Business Profile
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-brand-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Business Email</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-brand-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={editForm.companyName}
                  onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-brand-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Business Type</label>
                <input
                  type="text"
                  value={editForm.businessType}
                  onChange={(e) => setEditForm({ ...editForm, businessType: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-brand-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-brand-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-brand-600 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2 text-xs font-bold rounded-lg bg-[#0A4D3C] hover:bg-[#0E5E4A] text-white flex items-center justify-center gap-1.5"
                >
                  {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
