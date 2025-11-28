'use client';

import { useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const { user, setUser, setLoading } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
            // Check if user is authenticated via MPIN
            const isMpinAuthenticated = sessionStorage.getItem('mpin_authenticated') === 'true';

            // If no Firebase user but MPIN authenticated, use stored user data
            if (!firebaseUser && isMpinAuthenticated) {
                try {
                    const storedUserData = sessionStorage.getItem('user_data');
                    if (storedUserData) {
                        const userData = JSON.parse(storedUserData);

                        // Enhance user data to match Firebase user structure for consistent permissions
                        const enhancedUserData = {
                            ...userData,
                            isMpinUser: true,
                            // Ensure essential properties are present
                            uid: userData.uid || '',
                            email: userData.email || '',
                            displayName: userData.displayName || userData.name || userData.email || '',
                        };

                        setUser(enhancedUserData);
                    }
                } catch (error) {
                    console.error('Error parsing stored user data:', error);
                    sessionStorage.removeItem('mpin_authenticated');
                    sessionStorage.removeItem('user_data');
                }
            } else if (firebaseUser) {
                // Fetch MPIN for the user
                const fetchMpin = async () => {
                    try {
                        const { doc, getDoc } = await import('firebase/firestore');
                        const { db } = await import('@/lib/firebase');
                        const mpinDocRef = doc(db, 'mpin_records', firebaseUser.uid);
                        const mpinDocSnap = await getDoc(mpinDocRef);

                        let userMpin = null;
                        if (mpinDocSnap.exists()) {
                            userMpin = mpinDocSnap.data().mpin;
                        }

                        setUser({
                            ...firebaseUser,
                            mpin: userMpin
                        } as any);
                    } catch (error) {
                        console.error('Error fetching MPIN:', error);
                        setUser(firebaseUser as any);
                    }
                };
                fetchMpin();
            } else {
                setUser(null);
            }

            setLoading(false);

            // Handle routing based on auth state
            if (!firebaseUser && !isMpinAuthenticated && pathname.startsWith('/dashboard')) {
                router.push('/login');
            } else if ((firebaseUser || isMpinAuthenticated) && pathname === '/login') {
                router.push('/dashboard');
            }
        });

        return () => unsubscribe();
    }, [setUser, setLoading, router, pathname]);

    // Additional effect to handle manual user state changes
    useEffect(() => {
        const isMpinAuthenticated = sessionStorage.getItem('mpin_authenticated') === 'true';
        if ((user || isMpinAuthenticated) && pathname === '/login') {
            router.push('/dashboard');
        }
    }, [user, pathname, router]);

    return <>{children}</>;
}