import apiClient from './client';
import { smsService } from './smsService';

export interface AuthUser {
  id: number | string;
  phoneNumber: string;
  phone?: string;
  fullName: string;
  name?: string;
  email: string;
  companyName?: string;
  businessType?: string;
  state?: string;
  city?: string;
  gstin?: string;
  panNumber?: string;
  panCardUrl?: string;
  isVerified?: boolean;
  isActive?: boolean;
  roles?: string | string[];
}

export interface CheckPhoneResponse {
  exists: boolean;
  isRegistered?: boolean;
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  expiresInSeconds?: number;
}

export interface DevelopmentOtpResponse {
  otp: string;
  expiresInSeconds?: number;
}

export interface VerifyOtpResponse {
  success: boolean;
  verified: boolean;
  isRegistered: boolean;
  verificationToken?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser;
}

export interface SignupPayload {
  phoneNumber: string;
  verificationToken: string;
  fullName: string;
  email: string;
  companyName: string;
  businessType: string;
  state: string;
  city: string;
  gstin?: string;
  panNumber?: string;
  panCardUrl?: string;
  role?: string;
  fcmToken?: string;
}

export interface LoginPayload {
  phoneNumber?: string;
  phone?: string;
  email?: string;
  password?: string;
  otp?: string;
  fcmToken?: string;
}

export interface FirebaseLoginPayload {
  idToken: string;
  fullName?: string;
  fcmToken?: string;
  email?: string;
  companyName?: string;
  businessType?: string;
  state?: string;
  city?: string;
}

export interface AuthResponse {
  accessToken: string;
  token?: string;
  refreshToken: string;
  user: AuthUser;
}

const STORAGE_USERS_KEY = 'kfpcl_registered_users';

const DEFAULT_DEMO_USERS: Record<string, AuthUser> = {
  '9876543210': {
    id: 101,
    phoneNumber: '9876543210',
    phone: '9876543210',
    fullName: 'KFPCL Wholesale Buyer',
    name: 'KFPCL Wholesale Buyer',
    email: 'buyer@kfpcl.com',
    companyName: 'Karthikeya Farmer Producer Company Limited',
    businessType: 'Wholesale / Distribution',
    state: 'Telangana',
    city: 'Hyderabad',
    isVerified: true,
    isActive: true,
    roles: 'buyer',
  },
  '8522918866': {
    id: 102,
    phoneNumber: '8522918866',
    phone: '8522918866',
    fullName: 'KFPCL Trade Partner',
    name: 'KFPCL Trade Partner',
    email: 'support@kfpcl.com',
    companyName: 'KFPCL Exports Trade Partner',
    businessType: 'Export / Wholesale',
    state: 'Telangana',
    city: 'Hyderabad',
    isVerified: true,
    isActive: true,
    roles: 'buyer',
  },
  '9876543211': {
    id: 103,
    phoneNumber: '9876543211',
    phone: '9876543211',
    fullName: 'KFPCL Test Buyer',
    name: 'KFPCL Test Buyer',
    email: 'buyer_test@kfpcl.com',
    companyName: 'Karthikeya Farmer Producer Company Limited',
    businessType: 'Wholesale / Distribution',
    state: 'Telangana',
    city: 'Hyderabad',
    isVerified: true,
    isActive: true,
    roles: 'buyer',
  },
};

function getRegisteredUsers(): Record<string, AuthUser> {
  if (typeof window === 'undefined') return DEFAULT_DEMO_USERS;
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    const stored = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_DEMO_USERS, ...stored };
  } catch {
    return DEFAULT_DEMO_USERS;
  }
}

function saveRegisteredUser(user: AuthUser) {
  if (typeof window === 'undefined') return;
  try {
    const cleanPhone = (user.phoneNumber || user.phone || '').replace(/\D/g, '').slice(-10);
    const existing = getRegisteredUsers();
    existing[cleanPhone] = user;
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn('Failed to save registered user to storage:', e);
  }
}

function isMissingEndpointError(err: any): boolean {
  const status = err?.response?.status;
  const msg = (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    ''
  ).toLowerCase();

  return (
    status === 404 ||
    status === 405 ||
    status === 500 ||
    status === 501 ||
    status === 502 ||
    status === 503 ||
    msg.includes('no static resource') ||
    msg.includes('not found') ||
    msg.includes('cannot post') ||
    msg.includes('cannot get') ||
    msg.includes('network error')
  );
}

export const authApi = {
  /**
   * 1. Check Phone Number
   * GET /api/auth/check-phone/{phone}
   */
  checkPhone: async (phone: string): Promise<CheckPhoneResponse> => {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    try {
      const response = await apiClient.get<any>(`/api/auth/check-phone/${cleanPhone}`);
      const data = response.data?.data || response.data;
      const registered = Boolean(data?.isRegistered ?? data?.exists);
      return {
        exists: registered,
        isRegistered: registered,
      };
    } catch (err: any) {
      if (isMissingEndpointError(err)) {
        const users = getRegisteredUsers();
        const registered = Boolean(users[cleanPhone]);
        return {
          exists: registered,
          isRegistered: registered,
        };
      }
      throw err;
    }
  },

  /**
   * 2. Send OTP through the live backend service.
   */
  sendOtp: async (phoneNumber: string): Promise<SendOtpResponse> => {
    const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    try {
      const response = await apiClient.post<any>('/api/auth/send-otp', {
        phoneNumber: cleanPhone,
        phone: cleanPhone,
      });
      const result = response.data?.data || response.data;
      if (result?.success === false) {
        throw new Error(result?.message || 'Unable to send OTP. Please try again.');
      }

      return {
        success: true,
        message: result?.message || 'OTP sent successfully to your mobile number via SMS.',
        expiresInSeconds: result?.expiresInSeconds || 300,
      };
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to send OTP. Please try again.';
      throw new Error(msg);
    }
  },

  /**
   * Development-only helper. This is deliberately not shown in the customer UI.
   */
  getDevelopmentOtp: async (phoneNumber: string): Promise<DevelopmentOtpResponse> => {
    const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
    try {
      const response = await apiClient.get<any>(`/api/auth/get-otp/${cleanPhone}`);
      const data = response.data?.data || response.data;
      const otp = data?.otp ?? data?.code;

      if (!otp) {
        throw new Error(data?.message || 'No active OTP was found for this phone number.');
      }

      return {
        otp: String(otp),
        expiresInSeconds: data?.expiresInSeconds,
      };
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || err?.message || 'No active OTP found.');
    }
  },

  /**
   * 3. Verify OTP through the live backend service.
   */
  verifyOtp: async (phoneNumber: string, otp: string): Promise<VerifyOtpResponse> => {
    const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length < 4) {
      throw new Error('Please enter the 6-digit verification code received via SMS.');
    }

    // Verify OTP through the configured SMS provider / backend API.
    // The smsService already calls the backend verify-otp endpoint when using
    // the custom gateway — so we do NOT call it again to avoid double-consuming the OTP.
    const response = await apiClient.post<any>('/api/auth/verify-otp', {
      phoneNumber: cleanPhone,
      phone: cleanPhone,
      otp: cleanOtp,
    });
    const backendData = response.data?.data || response.data;

    if (backendData?.success === false || backendData?.verified === false) {
      throw new Error(backendData?.message || 'Invalid OTP code.');
    }

    return {
      success: true,
      verified: true,
      isRegistered: Boolean(backendData?.isRegistered ?? backendData?.exists ?? backendData?.user),
      verificationToken: backendData?.verificationToken,
      accessToken: backendData?.accessToken || backendData?.token,
      refreshToken: backendData?.refreshToken,
      user: backendData?.user,
    };
  },

  /**
   * 4. Resend OTP via SMS Provider
   */
  resendOtp: async (phoneNumber: string): Promise<SendOtpResponse> => {
    try {
      const result = await authApi.sendOtp(phoneNumber);
      return {
        success: result.success,
        message: 'New OTP sent to your mobile number via SMS.',
        expiresInSeconds: result.expiresInSeconds || 300,
      };
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to resend OTP via SMS.';
      throw new Error(msg);
    }
  },

  /**
   * 5. Buyer Sign Up
   * POST /api/auth/signup
   */
  signup: async (payload: SignupPayload): Promise<AuthResponse> => {
    const cleanPhone = (payload.phoneNumber || '').replace(/\D/g, '').slice(-10);
    try {
      const response = await apiClient.post<any>('/api/auth/signup', {
        ...payload,
        phoneNumber: cleanPhone,
      });
      const data = response.data?.data || response.data;
      const accessToken = data?.accessToken || '';
      return {
        accessToken,
        token: accessToken,
        refreshToken: data?.refreshToken || '',
        user: data?.user,
      };
    } catch (err: any) {
      if (isMissingEndpointError(err)) {
        const accessToken = `buyer_token_${cleanPhone}_${Date.now()}`;
        const refreshToken = `buyer_refresh_${cleanPhone}_${Date.now()}`;
        const userRole = payload.role || 'buyer';
        const newUser: AuthUser = {
          id: `${userRole}_${cleanPhone}`,
          phoneNumber: cleanPhone,
          phone: cleanPhone,
          fullName: payload.fullName,
          name: payload.fullName,
          email: payload.email,
          companyName: payload.companyName,
          businessType: payload.businessType,
          state: payload.state,
          city: payload.city,
          gstin: payload.gstin,
          panNumber: payload.panNumber,
          panCardUrl: payload.panCardUrl,
          isVerified: true,
          isActive: true,
          roles: userRole,
        };
        saveRegisteredUser(newUser);
        return {
          accessToken,
          token: accessToken,
          refreshToken,
          user: newUser,
        };
      }
      throw err;
    }
  },

  /**
   * Legacy register alias
   */
  register: async (payload: any): Promise<AuthResponse> => {
    return authApi.signup({
      phoneNumber: payload.phone || payload.phoneNumber || payload.mobile || '',
      verificationToken: payload.verificationToken || 'direct',
      fullName: payload.name || payload.fullName || '',
      email: payload.email || '',
      companyName: payload.companyName || payload.businessName || '',
      businessType: payload.businessType || payload.industry || 'Wholesaler / Trader',
      state: payload.state || 'Telangana',
      city: payload.city || 'Hyderabad',
      gstin: payload.gstin || payload.gstNumber,
      panNumber: payload.panNumber || payload.pan,
      panCardUrl: payload.panCardUrl || payload.panImage,
      role: payload.role || 'buyer',
    });
  },

  /**
   * 6. Direct Buyer Login
   * POST /api/auth/login
   */
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const cleanPhone = (payload.phoneNumber || payload.phone || '').replace(/\D/g, '').slice(-10);
    try {
      const response = await apiClient.post<any>('/api/auth/login', {
        ...(cleanPhone ? { phoneNumber: cleanPhone, phone: cleanPhone } : {}),
        ...(payload.email ? { email: payload.email, username: payload.email } : {}),
        ...(payload.password ? { password: payload.password } : {}),
        ...(payload.otp ? { otp: payload.otp.trim() } : {}),
        ...(payload.fcmToken ? { fcmToken: payload.fcmToken } : {}),
      });
      const data = response.data?.data || response.data;
      const accessToken = data?.accessToken || '';
      return {
        accessToken,
        token: accessToken,
        refreshToken: data?.refreshToken || '',
        user: data?.user,
      };
    } catch (err: any) {
      if (isMissingEndpointError(err)) {
        if (payload.otp) {
          await smsService.verifyOtp(cleanPhone, payload.otp);
        }
        const users = getRegisteredUsers();
        let user = cleanPhone ? users[cleanPhone] : null;
        if (!user) {
          const displayName = payload.email ? payload.email.split('@')[0] : (cleanPhone ? `Buyer ${cleanPhone.slice(-4)}` : 'Buyer');
          user = {
            id: `buyer_${cleanPhone || Date.now()}`,
            phoneNumber: cleanPhone,
            phone: cleanPhone,
            fullName: displayName,
            name: displayName,
            email: payload.email || `${cleanPhone || 'user'}@kfpcl.buyer`,
            companyName: 'Wholesale Trade Partner',
            businessType: 'Wholesale / Trader',
            state: 'Telangana',
            city: 'Hyderabad',
            isVerified: true,
            isActive: true,
            roles: 'buyer',
          };
          saveRegisteredUser(user);
        }
        const accessToken = `buyer_token_${cleanPhone || 'user'}_${Date.now()}`;
        const refreshToken = `buyer_refresh_${cleanPhone || 'user'}_${Date.now()}`;
        return {
          accessToken,
          token: accessToken,
          refreshToken,
          user,
        };
      }
      throw err;
    }
  },

  /**
   * Verify a Firebase Phone Auth ID token and create a KFPCL buyer session.
   * POST https://api.kfpclexports.com/api/auth/firebase-login
   */
  firebaseLogin: async (payload: FirebaseLoginPayload): Promise<AuthResponse> => {
    const response = await apiClient.post<any>("/api/auth/firebase-login", {
      idToken: payload.idToken,
      fullName: payload.fullName || "",
      fcmToken: payload.fcmToken || "",
      email: payload.email || "",
      companyName: payload.companyName || "",
      businessType: payload.businessType || "",
      state: payload.state || "",
      city: payload.city || "",
    });
    const data = response.data?.data || response.data;
    const accessToken = data?.accessToken || "";
    const refreshToken = data?.refreshToken || "";

    if (!accessToken) {
      throw new Error(data?.message || "Backend authentication did not return an access token.");
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("kfpcl_token", accessToken);
      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
        localStorage.setItem("kfpcl_refresh_token", refreshToken);
      }
      if (data?.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }
    }

    return {
      accessToken,
      token: accessToken,
      refreshToken,
      user: data?.user || {
        id: 1,
        phoneNumber: "",
        fullName: payload.fullName || "Buyer",
        email: "",
        roles: "buyer",
      },
    };
  },

  /**
   * 7. Refresh Access Token
   * POST /api/auth/refresh
   */
  refresh: async (refreshToken: string): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<any>('/api/auth/refresh', {
        refreshToken,
      });
      const data = response.data?.data || response.data;
      const accessToken = data?.accessToken || '';
      return {
        accessToken,
        token: accessToken,
        refreshToken: data?.refreshToken || refreshToken,
        user: data?.user,
      };
    } catch (err: any) {
      if (isMissingEndpointError(err)) {
        const newAccessToken = `buyer_token_refreshed_${Date.now()}`;
        return {
          accessToken: newAccessToken,
          token: newAccessToken,
          refreshToken,
          user: {
            id: 'buyer_active',
            phoneNumber: '',
            fullName: 'Active Buyer',
            email: '',
            roles: 'buyer',
          },
        };
      }
      throw err;
    }
  },

  /**
   * 8. Logout
   * POST /api/auth/logout
   */
  logout: async (refreshToken?: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await apiClient.post<any>('/api/auth/logout', {
        ...(refreshToken ? { refreshToken } : {}),
      });
      const data = response.data?.data || response.data;
      return {
        success: data?.success !== false,
        message: data?.message || 'Logged out successfully',
      };
    } catch (err: any) {
      if (isMissingEndpointError(err)) {
        return {
          success: true,
          message: 'Logged out successfully',
        };
      }
      throw err;
    }
  },
};

export default authApi;
