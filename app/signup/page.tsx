'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { ArrowRightIcon, UserPlusIcon, UserIcon, LockClosedIcon } from '@heroicons/react/24/outline';

export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Create user document in Firestore with properly formatted email
            await setDoc(doc(db, 'users', user.uid), {
                email: email.toLowerCase().trim(),
                uid: user.uid,  // Store UID for quick access
                createdAt: new Date(),
            });

            toast.success('Account created successfully! Please login.');
            router.push('/login'); // Redirect to login as requested
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Failed to create account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 overflow-hidden bg-black">
            {/* Background Image */}
            <div
                className="absolute inset-0 z-0"
                style={{
                    backgroundImage: "url('https://images.unsplash.com/photo-1440428099904-c6d459a7e7b5?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                {/* Dark overlay for better text readability */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
            </div>

            <div className="relative z-10 flex items-center justify-center min-h-screen w-full p-4">
                <div className="w-full max-w-6xl flex flex-col md:flex-row items-center justify-between gap-12">

                    {/* Left Side - Branding & Features */}
                    <div className="w-full md:w-1/2 text-white space-y-8 animate-float">
                        <div className="space-y-4">
                            <div className="inline-block p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                                <h1 className="text-5xl font-bold tracking-tight">FarmWeb</h1>
                            </div>
                            <p className="text-2xl font-light text-green-100 drop-shadow-lg">
                                Join the Future of Farming
                            </p>
                            <p className="text-lg text-gray-200 max-w-md drop-shadow-md">
                                Create your account today and start optimizing your dairy farm management.
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

                    {/* Right Side - Signup Form */}
                    <div className="w-full md:w-1/2 max-w-md">
                        <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl">
                            <div className="text-center mb-8">
                                <div className="mx-auto bg-green-500/20 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4 border border-green-500/30">
                                    <UserPlusIcon className="h-8 w-8 text-green-400" />
                                </div>
                                <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
                                <p className="text-gray-300">Get started with your free account</p>
                            </div>

                            <form onSubmit={handleSignup} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-200 mb-2">Email Address</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <UserIcon className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200 outline-none"
                                            placeholder="you@example.com"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-200 mb-2">Password</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <LockClosedIcon className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200 outline-none"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition duration-200 transform hover:scale-[1.02] group"
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Creating Account...
                                        </>
                                    ) : (
                                        <>
                                            Sign Up
                                            <ArrowRightIcon className="ml-2 h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="mt-8 text-center">
                                <p className="text-sm text-gray-300">
                                    Already have an account?{' '}
                                    <Link href="/login" className="font-medium text-green-400 hover:text-green-300 transition duration-150">
                                        Sign in
                                    </Link>
                                </p>
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