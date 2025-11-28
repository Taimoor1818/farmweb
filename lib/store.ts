import { create } from 'zustand';

// Define a more flexible user type that can accommodate both Firebase users and MPIN users
interface AppUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    isMpinUser?: boolean;
    isMpinLogin?: boolean;
    emailVerified?: boolean;
    phoneNumber?: string | null;
    photoURL?: string | null;
    refreshToken?: string;
    tenantId?: string | null;
    providerData?: any[];
    isAnonymous?: boolean;
    // Add index signature for additional properties
    [key: string]: any;
}

interface AuthState {
    user: AppUser | null;
    loading: boolean;
    setUser: (user: AppUser | null) => void;
    setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    loading: true,
    setUser: (user) => set({ user }),
    setLoading: (loading) => set({ loading }),
}));