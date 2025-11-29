'use client';

import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import MPINScreen from '@/components/auth/MPINScreen';
import { ShieldCheckIcon, LockClosedIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [showMpinModal, setShowMpinModal] = useState(false);
    const [mpinEmail, setMpinEmail] = useState('');
    const router = useRouter();

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Save email to localStorage for future MPIN logins
            if (user.email) {
                localStorage.setItem('last_login_email', user.email);
            }

            // Check if user exists in Firestore
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                // Create new user document
                await setDoc(userDocRef, {
                    email: user.email?.toLowerCase().trim(),
                    uid: user.uid,
                    name: user.displayName,
                    photoURL: user.photoURL,
                    createdAt: new Date(),
                    trialStartedAt: new Date(),
                    isPaid: false,
                    subscriptionStatus: 'trial',
                });
                toast.success('Account created successfully!');
            } else {
                toast.success('Logged in successfully!');
            }

            router.push('/dashboard');
        } catch (error: any) {
            console.error('Google login error:', error);
            toast.error(error.message || 'Failed to login with Google');
        } finally {
            setLoading(false);
        }
    };

    const handleMpinLogin = () => {
        // Check if we have a stored email from previous login
        const storedEmail = localStorage.getItem('last_login_email');

        if (storedEmail) {
            setMpinEmail(storedEmail.toLowerCase().trim());
            setShowMpinModal(true);
        } else {
            const emailInput = window.prompt("Please enter your email for MPIN login:");
            if (emailInput) {
                setMpinEmail(emailInput.toLowerCase().trim());
                setShowMpinModal(true);
            }
        }
    };

    const handleMpinSuccess = async (userUid?: string) => {
        console.log('MPIN Success called with UID:', userUid);
        if (!userUid) {
            console.log('No UID provided to MPIN success handler');
            return;
        }

        try {
            // Get user document to retrieve email for setting auth state
            const { doc, getDoc } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');

            const userDocRef = doc(db, 'users', userUid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                console.log('User data found:', userData);
                // For MPIN login, we need to set the user state directly
                // since we're not using Firebase auth for MPIN
                const { useAuthStore } = await import('@/lib/store');
                // Create a minimal user-like object that our app can work with
                const userObject = {
                    uid: userUid,
                    email: userData.email || '',
                    displayName: userData.name || userData.email || '',
                    // Add other properties that might be expected
                    isAnonymous: false,
                    providerData: [],
                    // Add a custom property to identify MPIN login
                    isMpinLogin: true,
                    // Include all userData properties to ensure completeness
                    ...userData,
                    // Add additional properties to match Firebase user structure
                    emailVerified: true,
                    phoneNumber: null,
                    photoURL: null,
                    refreshToken: '',
                    tenantId: null,
                };
                console.log('Setting user in store:', userObject);
                useAuthStore.getState().setUser(userObject as any);

                // Set MPIN authentication flag in sessionStorage
                sessionStorage.setItem('mpin_authenticated', 'true');
                sessionStorage.setItem('user_data', JSON.stringify(userObject));

                // Log the stored data to verify it's correct
                console.log('Stored user data in sessionStorage:', sessionStorage.getItem('user_data'));

                setShowMpinModal(false);
                toast.success('Logged in with MPIN successfully!');
                console.log('Navigating to dashboard for user:', userUid);
                router.push('/dashboard');
            } else {
                console.log('No user document found for UID:', userUid);
                toast.error('User data not found');
            }
        } catch (error) {
            console.error('Error during MPIN login:', error);
            toast.error('Failed to complete MPIN login: ' + (error as Error).message);
        }
    };

    return (
        <div className="min-h-screen relative flex flex-col bg-black">
            {/* Background Image */}
            <div
                className="fixed inset-0 z-0"
                style={{
                    backgroundImage: "url('https://images.unsplash.com/photo-1440428099904-c6d459a7e7b5?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                {/* Dark overlay for better text readability */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
            </div>

            <div className="relative z-10 flex flex-grow items-center justify-center w-full p-4 py-12">
                <div className="w-full max-w-6xl flex flex-col md:flex-row items-center justify-between gap-12">

                    {/* Left Side - Branding & Features */}
                    <div className="w-full md:w-1/2 text-white space-y-8 animate-float">
                        <div className="space-y-4">
                            <div className="inline-block p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                                <h1 className="text-5xl font-bold tracking-tight">FarmWeb</h1>
                            </div>
                            <p className="text-2xl font-light text-green-100 drop-shadow-lg">
                                Smart Dairy Farm Management
                            </p>
                            <p className="text-lg text-gray-200 max-w-md drop-shadow-md">
                                Streamline your dairy operations with our comprehensive management solution.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center space-x-4 bg-black/20 p-4 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-black/30 transition-colors">
                                <div className="bg-green-500/20 p-2 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">Comprehensive Management</h3>
                                    <p className="text-sm text-gray-300">Track milk production, expenses, and inventory</p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-4 bg-black/20 p-4 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-black/30 transition-colors">
                                <div className="bg-blue-500/20 p-2 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">Real-time Analytics</h3>
                                    <p className="text-sm text-gray-300">Monitor performance with detailed reports</p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-4 bg-black/20 p-4 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-black/30 transition-colors">
                                <div className="bg-purple-500/20 p-2 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">Secure & Reliable</h3>
                                    <p className="text-sm text-gray-300">Enterprise-grade security for your data</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Login Form */}
                    <div className="w-full md:w-1/2 max-w-md">
                        <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl">
                            <div className="text-center mb-8">
                                <div className="mx-auto bg-green-500/20 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4 border border-green-500/30">
                                    <LockClosedIcon className="h-8 w-8 text-green-400" />
                                </div>
                                <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
                                <p className="text-gray-300">Sign in to access your dashboard</p>
                            </div>

                            <div className="space-y-6">
                                <button
                                    onClick={handleGoogleLogin}
                                    disabled={loading}
                                    className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-lg text-base font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition duration-200 transform hover:scale-[1.02] group"
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Signing in...
                                        </>
                                    ) : (
                                        <>
                                            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-6 w-6 mr-3" />
                                            Sign in with Google
                                            <ArrowRightIcon className="ml-2 h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                                        </>
                                    )}
                                </button>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-white/20"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-transparent text-gray-400">Or continue with</span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleMpinLogin}
                                    className="w-full flex justify-center items-center py-3 px-4 border border-white/20 rounded-xl shadow-sm text-sm font-medium text-white bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-200 group"
                                >
                                    <ShieldCheckIcon className="h-5 w-5 mr-2 text-green-400" />
                                    Login with MPIN
                                    <ArrowRightIcon className="ml-2 h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                                </button>
                            </div>
                        </div>

                        {/* Footer Note */}
                        <div className="mt-6 text-center">
                            <p className="text-xs text-gray-400 drop-shadow-md">
                                Protected by industry-standard encryption
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* MPIN Modal */}
            {showMpinModal && (
                <MPINScreen
                    mode="login"
                    email={mpinEmail}
                    onSuccess={handleMpinSuccess}
                    onCancel={() => setShowMpinModal(false)}
                />
            )}

            {/* Custom styles for animations */}
            <style jsx>{`
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                    100% { transform: translateY(0px); }
                }
                .animate-float {
                    animation: float 4s ease-in-out infinite;
                }
                .animate-float-delayed {
                    animation: float 4s ease-in-out infinite;
                    animation-delay: 2s;
                }
            `}</style>
        </div>
    );
}