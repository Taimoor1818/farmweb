'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuthStore();
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        // Check if user is authenticated via MPIN
        const isMpinAuthenticated = sessionStorage.getItem('mpin_authenticated') === 'true';

        if (!loading) {
            if (!user && !isMpinAuthenticated) {
                router.push('/login');
            } else {
                // Allow smooth transition without artificial delay
                setIsChecking(false);
            }
        }
    }, [user, loading, router]);

    // Show loading state while checking authentication
    if (loading || isChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/30">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-200 border-t-emerald-600 mb-4"></div>
                    <p className="text-slate-600 font-medium">Loading...</p>
                </div>
            </div>
        );
    }

    // Allow access if either Firebase user exists or MPIN authentication flag is set
    const isMpinAuthenticated = sessionStorage.getItem('mpin_authenticated') === 'true';
    if (!user && !isMpinAuthenticated) return null;

    return <>{children}</>;
}