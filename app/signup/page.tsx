'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex overflow-hidden">
                {/* Left Side - Image/Branding */}
                <div className="hidden md:flex md:w-1/2 bg-green-600 p-12 flex-col justify-between text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?ixlib=rb-4.0.3&auto=format&fit=crop&w=1474&q=80')] bg-cover bg-center opacity-20"></div>
                    <div className="relative z-10">
                        <h1 className="text-4xl font-bold mb-4">Join Farmweb</h1>
                        <p className="text-green-100 text-lg">Start managing your dairy farm efficiently today.</p>
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm text-green-200">© 2024 Mtamsport. All rights reserved.</p>
                    </div>
                </div>

                {/* Right Side - Signup Form */}
                <div className="w-full md:w-1/2 p-8 md:p-12">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
                        <p className="text-gray-500">Get started with your free account</p>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-6">
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
                            {loading ? 'Creating Account...' : 'Sign Up'}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link href="/login" className="font-medium text-green-600 hover:text-green-500 transition duration-150">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}