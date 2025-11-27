'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import MPINScreen from '@/components/auth/MPINScreen';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@/lib/store';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showMpinModal, setShowMpinModal] = useState(false);
    const [mpinEmail, setMpinEmail] = useState('');
    const router = useRouter();
    const { setUser } = useAuthStore();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            setUser(userCredential.user);
            toast.success('Logged in successfully!');
            router.push('/dashboard');
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    const handleMpinLogin = () => {
        if (!email) {
            toast.error('Please enter your email first');
            return;
        }
        // Normalize the email before passing to MPIN screen
        setMpinEmail(email.toLowerCase().trim());
        setShowMpinModal(true);
    };

    const handleMpinSuccess = async (userUid?: string) => {
        if (!userUid) {
            return;
        }

        try {
            // For MPIN login, we store a session flag to indicate successful login
            // This will be checked by the AuthGuard
            sessionStorage.setItem('mpin_authenticated', 'true');
            sessionStorage.setItem('mpin_user_uid', userUid);
            
            setShowMpinModal(false);
            toast.success('Logged in with MPIN successfully!');
            // Navigate directly to dashboard
            router.push('/dashboard');
        } catch (error) {
            console.error('Error during MPIN login:', error);
            toast.error('Failed to complete MPIN login');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex overflow-hidden">
                {/* Left Side - Image/Branding */}
                <div className="hidden md:flex md:w-1/2 bg-green-600 p-12 flex-col justify-between text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?ixlib=rb-4.0.3&auto=format&fit=crop&w=1474&q=80')] bg-cover bg-center opacity-20"></div>
                    <div className="relative z-10">
                        <h1 className="text-4xl font-bold mb-4">Farmweb</h1>
                        <p className="text-green-100 text-lg">Manage your dairy farm with ease and precision.</p>
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm text-green-200">© 2024 Mtamsport. All rights reserved.</p>
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className="w-full md:w-1/2 p-8 md:p-12">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">
                            Welcome Back
                        </h2>
                        <p className="text-gray-500">
                            Please sign in to your account
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200 outline-none"
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200 outline-none"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input id="remember-me" type="checkbox" className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded" />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">Remember me</label>
                            </div>
                            <div className="text-sm">
                                <a href="#" className="font-medium text-green-600 hover:text-green-500">Forgot password?</a>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition duration-200 transform hover:scale-[1.02]"
                        >
                            {loading ? (
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : null}
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">Or</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleMpinLogin}
                            className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-200"
                        >
                            <ShieldCheckIcon className="h-5 w-5 mr-2" />
                            Login with MPIN
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-600">
                            Don't have an account?{' '}
                            <Link href="/signup" className="font-medium text-green-600 hover:text-green-500 transition duration-150">
                                Sign up for free
                            </Link>
                        </p>
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
        </div>
    );
}