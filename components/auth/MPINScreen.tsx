'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/lib/store';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';

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

    // Focus first input on mount
    useEffect(() => {
        const firstInput = document.getElementById('mpin-0');
        if (firstInput) {
            firstInput.focus();
        }
    }, []);

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
        
        // Auto-submit when all 4 digits are filled (only in login mode)
        if (mode === 'login' && value !== '' && index === 3) {
            // Check if all digits are filled
            const updatedMpin = [...newMpin];
            updatedMpin[index] = value;
            if (updatedMpin.every(digit => digit !== '')) {
                console.log('All digits filled, triggering auto-verify');
                // Small delay to ensure state is updated
                setTimeout(() => {
                    // Double-check that all inputs have values before submitting
                    const currentMpin = [...updatedMpin];
                    if (currentMpin.every(digit => digit !== '')) {
                        console.log('Auto-verify conditions met, calling handleVerifyMpin');
                        // Call verification directly without validation since we know we have 4 digits
                        verifyMpinDirect(currentMpin);
                    }
                }, 100);
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
        
        // Auto-submit when all 4 digits are filled (only in set mode)
        if (mode === 'set' && value !== '' && index === 3) {
            // Check if all digits are filled in both MPIN and confirm MPIN
            const updatedConfirmMpin = [...newConfirmMpin];
            updatedConfirmMpin[index] = value;
            if (mpin.every(digit => digit !== '') && updatedConfirmMpin.every(digit => digit !== '')) {
                console.log('All digits filled for set MPIN, triggering auto-set');
                // Small delay to ensure state is updated
                setTimeout(() => {
                    // Double-check that all inputs have values before submitting
                    const currentMpin = [...mpin];
                    const currentConfirmMpin = [...updatedConfirmMpin];
                    if (currentMpin.every(digit => digit !== '') && currentConfirmMpin.every(digit => digit !== '')) {
                        console.log('Auto-set conditions met, calling setMpinDirect');
                        // Call set MPIN directly without validation since we know we have 4 digits
                        setMpinDirect(currentMpin, currentConfirmMpin);
                    }
                }, 100);
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

    const handleSetMpin = async () => {
        console.log('handleSetMpin called');
        console.log('Current user:', user);
        console.log('Current mpin:', mpin);
        console.log('Current confirmMpin:', confirmMpin);
        
        if (!user) {
            console.log('User is not logged in');
            setError('You must be logged in to set an MPIN');
            return;
        }

        const mpinString = mpin.join('');
        const confirmMpinString = confirmMpin.join('');
        console.log('MPIN string:', mpinString);
        console.log('Confirm MPIN string:', confirmMpinString);

        if (mpinString.length !== 4) {
            console.log('MPIN length is not 4');
            setError('MPIN must be 4 digits');
            return;
        }

        if (confirmMpinString !== mpinString) {
            console.log('MPINs do not match');
            setError('MPINs do not match');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Store MPIN in a global MPIN collection with user UID as key for consistency
            const mpinDocRef = doc(db, 'mpin_records', user.uid);
            await setDoc(mpinDocRef, {
                mpin: mpinString,
                email: user.email || email, // Store email with MPIN
                uid: user.uid,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            toast.success('MPIN set successfully!');
            onSuccess();
        } catch (err) {
            console.error('Error setting MPIN:', err);
            setError('Failed to set MPIN. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // New function for direct MPIN verification without initial validation
    const verifyMpinDirect = async (mpinArray: string[]) => {
        console.log('verifyMpinDirect called with mpinArray:', mpinArray);
        
        if (!email) {
            console.log('Email is missing');
            setError('Email is required');
            return;
        }

        const mpinString = mpinArray.join('');
        console.log('MPIN string:', mpinString);
        
        // Skip length validation since we know we have 4 digits

        setLoading(true);
        setError('');

        try {
            // Normalize the email for comparison
            const normalizedEmail = email.toLowerCase().trim();
            console.log('Normalized email:', normalizedEmail);
            
            // First find user by email to get UID
            const { collection, query, where, getDocs } = await import('firebase/firestore');
            const usersCollection = collection(db, 'users');
            const q = query(usersCollection, where('email', '==', normalizedEmail));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                console.log('No user found with this email');
                setError('No user found with this email');
                setLoading(false);
                return;
            }

            const userDoc = querySnapshot.docs[0];
            const userUid = userDoc.id;
            console.log('Found user with UID:', userUid);
            
            // Now check MPIN with UID as document ID (consistent with storage)
            const mpinDocRef = doc(db, 'mpin_records', userUid);
            const mpinDocSnap = await getDoc(mpinDocRef);
            
            if (!mpinDocSnap.exists()) {
                console.log('No MPIN set for this user');
                setError('No MPIN set for this user');
                setLoading(false);
                return;
            }

            const mpinData = mpinDocSnap.data();
            console.log('Retrieved MPIN data:', mpinData);
            
            if (mpinData.mpin !== mpinString) {
                console.log('Incorrect MPIN');
                setError('Incorrect MPIN');
                setLoading(false);
                return;
            }

            // Successfully verified MPIN
            console.log('MPIN verified successfully!');
            toast.success('MPIN verified successfully!');
            onSuccess(userUid);
        } catch (err) {
            console.error('Error verifying MPIN:', err);
            setError('Failed to verify MPIN. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // New function for direct MPIN setting without initial validation
    const setMpinDirect = async (mpinArray: string[], confirmMpinArray: string[]) => {
        console.log('setMpinDirect called');
        console.log('Current user:', user);
        console.log('Current mpin:', mpinArray);
        console.log('Current confirmMpin:', confirmMpinArray);
        
        if (!user) {
            console.log('User is not logged in');
            setError('You must be logged in to set an MPIN');
            return;
        }

        const mpinString = mpinArray.join('');
        const confirmMpinString = confirmMpinArray.join('');
        console.log('MPIN string:', mpinString);
        console.log('Confirm MPIN string:', confirmMpinString);

        // Skip length validation since we know we have 4 digits

        if (confirmMpinString !== mpinString) {
            console.log('MPINs do not match');
            setError('MPINs do not match');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Store MPIN in a global MPIN collection with user UID as key for consistency
            const mpinDocRef = doc(db, 'mpin_records', user.uid);
            await setDoc(mpinDocRef, {
                mpin: mpinString,
                email: user.email || email, // Store email with MPIN
                uid: user.uid,
                createdAt: new Date(),
                updatedAt: new Date()
            });

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
        console.log('handleVerifyMpin called with email:', email);
        console.log('Current mpin state:', mpin);
        
        if (!email) {
            console.log('Email is missing');
            setError('Email is required');
            return;
        }

        const mpinString = mpin.join('');
        console.log('MPIN string:', mpinString);
        
        // Validate length for manual submission
        if (mpinString.length !== 4) {
            console.log('MPIN length is not 4');
            setError('MPIN must be 4 digits');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Normalize the email for comparison
            const normalizedEmail = email.toLowerCase().trim();
            console.log('Normalized email:', normalizedEmail);
            
            // First find user by email to get UID
            const { collection, query, where, getDocs } = await import('firebase/firestore');
            const usersCollection = collection(db, 'users');
            const q = query(usersCollection, where('email', '==', normalizedEmail));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                console.log('No user found with this email');
                setError('No user found with this email');
                setLoading(false);
                return;
            }

            const userDoc = querySnapshot.docs[0];
            const userUid = userDoc.id;
            console.log('Found user with UID:', userUid);
            
            // Now check MPIN with UID as document ID (consistent with storage)
            const mpinDocRef = doc(db, 'mpin_records', userUid);
            const mpinDocSnap = await getDoc(mpinDocRef);
            
            if (!mpinDocSnap.exists()) {
                console.log('No MPIN set for this user');
                setError('No MPIN set for this user');
                setLoading(false);
                return;
            }

            const mpinData = mpinDocSnap.data();
            console.log('Retrieved MPIN data:', mpinData);
            
            if (mpinData.mpin !== mpinString) {
                console.log('Incorrect MPIN');
                setError('Incorrect MPIN');
                setLoading(false);
                return;
            }

            // Successfully verified MPIN
            console.log('MPIN verified successfully!');
            toast.success('MPIN verified successfully!');
            onSuccess(userUid);
        } catch (err) {
            console.error('Error verifying MPIN:', err);
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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100">
                <div className="p-8">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center">
                            <div className="bg-green-100 p-2 rounded-lg">
                                <ShieldCheckIcon className="h-6 w-6 text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 ml-3">
                                {mode === 'set' ? 'Set MPIN' : 'Enter MPIN'}
                            </h3>
                        </div>
                        <button
                            onClick={onCancel}
                            className="text-gray-400 hover:text-gray-500 transition-colors duration-200"
                            disabled={loading}
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 animate-pulse">
                            <div className="flex items-center">
                                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </div>
                        </div>
                    )}

                    {mode === 'set' ? (
                        <div>
                            <p className="text-gray-600 mb-8 text-center">
                                Set a 4-digit MPIN for quick access to your account
                            </p>
                            <div className="mb-8">
                                <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                                    Enter MPIN
                                </label>
                                <div className="flex space-x-4 justify-center">
                                    {mpin.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`mpin-${index}`}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleMpinChange(index, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(index, e)}
                                            disabled={loading}
                                            className={`w-14 h-14 text-center text-2xl font-bold border-2 rounded-xl transition-all duration-200 shadow-sm ${
                                                loading 
                                                    ? 'border-gray-200 bg-gray-50' 
                                                    : 'border-gray-300 focus:border-green-500 focus:ring-4 focus:ring-green-100'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="mb-8">
                                <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                                    Confirm MPIN
                                </label>
                                <div className="flex space-x-4 justify-center">
                                    {confirmMpin.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`confirm-mpin-${index}`}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleConfirmMpinChange(index, e.target.value)}
                                            onKeyDown={(e) => handleConfirmKeyDown(index, e)}
                                            disabled={loading}
                                            className={`w-14 h-14 text-center text-2xl font-bold border-2 rounded-xl transition-all duration-200 shadow-sm ${
                                                loading 
                                                    ? 'border-gray-200 bg-gray-50' 
                                                    : 'border-gray-300 focus:border-green-500 focus:ring-4 focus:ring-green-100'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <p className="text-gray-600 mb-8 text-center">
                                Enter your 4-digit MPIN to access your account
                            </p>
                            <div className="mb-8">
                                <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                                    Enter MPIN for {email}
                                </label>
                                <div className="flex space-x-4 justify-center">
                                    {mpin.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`mpin-${index}`}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleMpinChange(index, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(index, e)}
                                            disabled={loading}
                                            className={`w-14 h-14 text-center text-2xl font-bold border-2 rounded-xl transition-all duration-200 shadow-sm ${
                                                loading 
                                                    ? 'border-gray-200 bg-gray-50' 
                                                    : 'border-gray-300 focus:border-green-500 focus:ring-4 focus:ring-green-100'
                                            } ${index === 3 && digit !== '' && !loading ? 'animate-pulse border-green-400' : ''}`}
                                        />
                                    ))}
                                </div>
                            </div>
                            
                            {loading && (
                                <div className="flex justify-center mb-6">
                                    <div className="flex items-center text-green-600">
                                        <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span className="text-sm font-medium">Verifying MPIN...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-between space-x-4">
                        <button
                            onClick={onCancel}
                            disabled={loading}
                            className="flex-1 px-6 py-3 text-base font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 disabled:opacity-50 transition-all duration-200"
                        >
                            Cancel
                        </button>
                        {mode === 'set' && (
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-1 px-6 py-3 text-base font-medium text-white bg-gradient-to-r from-green-500 to-green-600 rounded-xl hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Setting...
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center">
                                        <ShieldCheckIcon className="h-5 w-5 mr-2" />
                                        Set MPIN
                                    </div>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}