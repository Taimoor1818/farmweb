'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        // Check if user is authenticated via MPIN
        const isMpinAuthenticated = sessionStorage.getItem('mpin_authenticated') === 'true';
        
        if (!loading && !user && !isMpinAuthenticated) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
        );
    }

    // Allow access if either Firebase user exists or MPIN authentication flag is set
    const isMpinAuthenticated = sessionStorage.getItem('mpin_authenticated') === 'true';
    if (!user && !isMpinAuthenticated) {
        return null;
    }

    return <>{children}</>;
}