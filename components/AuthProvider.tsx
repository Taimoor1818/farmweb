'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const { user, setUser, setLoading } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);

            // Handle routing based on auth state
            // Check if user is authenticated via MPIN
            const isMpinAuthenticated = sessionStorage.getItem('mpin_authenticated') === 'true';
            
            // Redirect logic for unauthenticated users trying to access protected routes
            if (!firebaseUser && !isMpinAuthenticated && pathname.startsWith('/dashboard')) {
                router.push('/login');
            } 
            // Redirect logic for authenticated users on login page
            else if ((firebaseUser || isMpinAuthenticated) && pathname === '/login') {
                router.push('/dashboard');
            }
        });

        return () => unsubscribe();
    }, [setUser, setLoading, router, pathname]);

    // Additional effect to handle manual user state changes
    useEffect(() => {
        // Check if user is authenticated via MPIN
        const isMpinAuthenticated = sessionStorage.getItem('mpin_authenticated') === 'true';
        
        if ((user || isMpinAuthenticated) && pathname === '/login') {
            router.push('/dashboard');
        }
    }, [user, pathname, router]);

    return <>{children}</>;
}