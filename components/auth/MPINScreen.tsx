/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/lib/store';

interface MPINScreenProps {
    mode: 'login' | 'set';
    email?: string;
    onSuccess: (userUid?: string) => void;
    onCancel: () => void;
}

export default function MPINScreen({ mode, email, onSuccess, onCancel }: MPINScreenProps) {
    const [mpin, setMpin] = useState(['', '', '', '']);
    const [confirmMpin, setConfirmMpin] = useState(['', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { user } = useAuthStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Focus first input on mount
    useEffect(() => {
        if (mounted) {
            const firstInput = document.getElementById('mpin-0');
            if (firstInput) {
                firstInput.focus();
            }
        }
    }, [mounted]);

    // Auto-verify MPIN when all 4 digits are entered in login mode
    useEffect(() => {
        if (mode === 'login' && mpin.every(digit => digit !== '') && !loading) {
            console.log('MPINScreen: Auto-verifying MPIN');
            handleVerifyMpin();
        }
    }, [mpin, mode, loading]);

    const handleMpinChange = (index: number, value: string) => {
        if (value.length > 1) return;
        if (value !== '' && !/^\d$/.test(value)) return;

        const newMpin = [...mpin];
        newMpin[index] = value;
        setMpin(newMpin);

        // Auto-focus next input
        if (value !== '' && index < 3) {
            const nextInput = document.getElementById(`mpin-${index + 1}`);
            if (nextInput) {
                nextInput.focus();
            }
        }
    };

    const handleConfirmMpinChange = (index: number, value: string) => {
        if (value.length > 1) return;
        if (value !== '' && !/^\d$/.test(value)) return;

        const newConfirmMpin = [...confirmMpin];
        newConfirmMpin[index] = value;
        setConfirmMpin(newConfirmMpin);

        // Auto-focus next input
        if (value !== '' && index < 3) {
            const nextInput = document.getElementById(`confirm-mpin-${index + 1}`);
            if (nextInput) {
                nextInput.focus();
            }
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && mpin[index] === '' && index > 0) {
            const prevInput = document.getElementById(`mpin-${index - 1}`);
            if (prevInput) {
                prevInput.focus();
            }
        }
    };

    const handleConfirmKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && confirmMpin[index] === '' && index > 0) {
            const prevInput = document.getElementById(`confirm-mpin-${index - 1}`);
            if (prevInput) {
                prevInput.focus();
            }
        }
    };

    // Helper function to hash MPIN
    const hashMPIN = async (pin: string): Promise<string> => {
        const msgBuffer = new TextEncoder().encode(pin);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    };

    const handleSetMpin = async () => {
        if (!user) {
            setError('You must be logged in to set an MPIN');
            return;
        }

        const mpinString = mpin.join('');
        const confirmMpinString = confirmMpin.join('');

        if (mpinString.length !== 4) {
            setError('MPIN must be 4 digits');
            return;
        }

        if (confirmMpinString !== mpinString) {
            setError('MPINs do not match');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Hash the MPIN before storing
            const hashedMpin = await hashMPIN(mpinString);

            // Store MPIN in a global MPIN collection with user UID as key for consistency
            const mpinDocRef = doc(db, 'mpin_records', user.uid);
            await setDoc(mpinDocRef, {
                mpin: hashedMpin, // Store hashed MPIN
                email: user.email || email, // Store email with MPIN
                uid: user.uid,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            // Save UID to localStorage for seamless MPIN login
            localStorage.setItem('mpin_user_uid', user.uid);

            toast.success('MPIN set successfully!');
            onSuccess();
        } catch (err) {
            console.error('Error setting MPIN:', err);
            setError('Failed to set MPIN. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyMpin = async () => {
        console.log('MPINScreen: Verifying MPIN for email:', email);
        if (!email) {
            setError('Email is required');
            return;
        }

        const mpinString = mpin.join('');
        console.log('MPINScreen: MPIN entered (masked):', '****');
        if (mpinString.length !== 4) {
            setError('MPIN must be 4 digits');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Normalize the email for comparison
            const normalizedEmail = email.toLowerCase().trim();
            console.log('MPINScreen: Normalized email:', normalizedEmail);

            // First find user by email to get UID
            const { collection, query, where, getDocs } = await import('firebase/firestore');
            const usersCollection = collection(db, 'users');
            const q = query(usersCollection, where('email', '==', normalizedEmail));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.log('MPINScreen: No user found with email:', normalizedEmail);
                setError('No user found with this email');
                setLoading(false);
                return;
            }

            const userDoc = querySnapshot.docs[0];
            const userUid = userDoc.id;
            console.log('MPINScreen: User found with UID:', userUid);

            // Now check MPIN with UID as document ID (consistent with storage)
            const mpinDocRef = doc(db, 'mpin_records', userUid);
            const mpinDocSnap = await getDoc(mpinDocRef);

            if (!mpinDocSnap.exists()) {
                console.log('MPINScreen: No MPIN record found for user UID:', userUid);
                setError('No MPIN set for this user');
                setLoading(false);
                return;
            }

            const mpinData = mpinDocSnap.data();

            // Hash the entered MPIN to compare
            const hashedInputMpin = await hashMPIN(mpinString);

            if (mpinData.mpin !== hashedInputMpin) {
                console.log('MPINScreen: MPIN mismatch');
                setError('Incorrect MPIN');
                setLoading(false);
                return;
            }

            // Successfully verified MPIN
            console.log('MPINScreen: MPIN verified successfully for user UID:', userUid);
            toast.success('MPIN verified successfully!');
            onSuccess(userUid);
        } catch (err) {
            console.error('MPINScreen: Error verifying MPIN:', err);
            setError('Failed to verify MPIN. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = () => {
        if (mode === 'set') {
            handleSetMpin();
        } else {
            handleVerifyMpin();
        }
    };

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">
                            {mode === 'set' ? 'Set MPIN' : 'Enter MPIN'}
                        </h3>
                        <button
                            onClick={onCancel}
                            className="text-gray-400 hover:text-gray-500"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">
                            {error}
                        </div>
                    )}

                    {mode === 'set' ? (
                        <div>
                            <p className="text-sm text-gray-500 mb-4">
                                Set a 4-digit MPIN for quick access to your account
                            </p>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Enter MPIN
                                </label>
                                <div className="flex space-x-3 justify-center">
                                    {mpin.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`mpin-${index}`}
                                            type="password"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleMpinChange(index, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(index, e)}
                                            className="w-12 h-12 text-center text-xl border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-green-500"
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Confirm MPIN
                                </label>
                                <div className="flex space-x-3 justify-center">
                                    {confirmMpin.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`confirm-mpin-${index}`}
                                            type="password"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleConfirmMpinChange(index, e.target.value)}
                                            onKeyDown={(e) => handleConfirmKeyDown(index, e)}
                                            className="w-12 h-12 text-center text-xl border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-green-500"
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <p className="text-sm text-gray-500 mb-4">
                                Enter your 4-digit MPIN to access your account
                            </p>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Enter MPIN for {email}
                                </label>
                                <div className="flex space-x-3 justify-center">
                                    {mpin.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`mpin-${index}`}
                                            type="password"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleMpinChange(index, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(index, e)}
                                            className="w-12 h-12 text-center text-xl border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-green-500"
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={onCancel}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                            {loading ? (
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : null}
                            {loading ? (mode === 'set' ? 'Setting...' : 'Verifying...') : (mode === 'set' ? 'Set MPIN' : 'Verify MPIN')}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}