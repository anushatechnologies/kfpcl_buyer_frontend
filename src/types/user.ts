export type UserRole = 'buyer' | 'seller' | 'supplier' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  company: Company;
  isVerified: boolean;
  gstVerified: boolean;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  gstNumber?: string;
  address: Address;
  industry: string;
  employeeCount?: string;
  website?: string;
  description?: string;
  logo?: string;
  rating?: number;
  totalOrders?: number;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  companyName?: string;
  gstNumber?: string;
  gstin?: string;
  industry?: string;
  businessType?: string;
}
