'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { BanknotesIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import PaymentGuard from '@/components/auth/PaymentGuard';

interface SubscriptionData {
  isPaid: boolean;
  subscriptionStatus: string;
  trialStartedAt?: {
    seconds: number;
  };
  paidAt?: {
    seconds: number;
  };
}

export default function PaymentPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentNotified, setPaymentNotified] = useState(false);
  const [userPlan, setUserPlan] = useState<SubscriptionData | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  // Load user subscription data
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setUserPlan(doc.data() as SubscriptionData);
      }
      setSubscriptionLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Handle automatic redirection when payment is approved
  useEffect(() => {
    if (userPlan?.isPaid && userPlan?.subscriptionStatus === 'active') {
      router.push('/dashboard');
    }
  }, [userPlan, router]);

  const handlePaymentNotification = async () => {
    if (!user || !email) return;
    
    setLoading(true);
    
    const notificationPromise = async () => {
      try {
        // Check if there's already a pending payment request for this user
        const q = query(
          collection(db, 'payment_requests'),
          where('userId', '==', user.uid),
          where('status', '==', 'pending')
        );
        
        const querySnapshot = await getDocs(q);
        
        // If there's already a pending request, just update the timestamp and notification email
        if (!querySnapshot.empty) {
          const existingRequest = querySnapshot.docs[0];
          const existingRequestId = existingRequest.id;
          
          // Update the existing request with new notification email and timestamp
          await updateDoc(doc(db, 'payment_requests', existingRequestId), {
            notificationEmail: email,
            updatedAt: new Date(),
            // Add a field to indicate this is a reminder/resubmission
            isResubmitted: true
          });
          
          // Update user's subscription status to pending payment
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            subscriptionStatus: 'pending_payment'
          });
          
          return true;
        }
        
        // If no existing pending request, create a new one
        const paymentRequest = {
          userId: user.uid,
          userEmail: user.email || '',
          notificationEmail: email,
          amount: 4000,
          status: 'pending',
          createdAt: new Date(),
          notificationType: 'manual_payment',
          message: 'User has made a manual payment. Please verify with the user directly.'
        };
        
        await addDoc(collection(db, 'payment_requests'), paymentRequest);
        
        // Update user's subscription status to pending payment
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          subscriptionStatus: 'pending_payment'
        });
        
        return true;
      } catch (error: any) {
        console.error('Error in notification process:', error);
        
        // Provide more specific error messages
        if (error.code === 'permission-denied') {
          throw new Error('Insufficient permissions. Please contact support.');
        } else if (error.code === 'resource-exhausted') {
          throw new Error('Too many requests. Please try again later.');
        } else {
          throw new Error('Failed to send payment notification. Please try again.');
        }
      }
    };
    
    // Add timeout to the entire process (45 seconds)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout. Please check your internet connection.')), 45000)
    );
    
    try {
      await Promise.race([notificationPromise(), timeoutPromise]);
      setPaymentNotified(true);
      toast.success('Payment notification sent! Admin will contact you shortly.');
    } catch (error: any) {
      console.error('Error notifying payment:', error);
      toast.error(error.message || 'Failed to send payment notification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <PaymentGuard>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4">
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-700 px-3 py-4 text-white">
              <div className="text-center">
                <BanknotesIcon className="h-8 w-8 mx-auto mb-2 text-green-200" />
                <h1 className="text-xl font-bold mb-1">Payment Required</h1>
                <p className="text-green-100 text-sm">
                  Your free trial has ended. Please make a payment to continue.
                </p>
              </div>
            </div>
            
            <div className="px-3 py-4">
              <div className="max-w-lg mx-auto">
                <div className="bg-green-50 border border-green-200 rounded p-3 mb-4 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                  <h3 className="font-medium text-green-800 mb-1 text-sm">Payment Instructions</h3>
                  <ul className="space-y-1 text-green-700 text-xs">
                    <li className="flex items-start">
                      <span className="font-medium mr-1">1.</span>
                      <span>Transfer <span className="font-bold">PKR 4000</span> to the bank account below</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-medium mr-1">2.</span>
                      <span>Get free access to the service</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-medium mr-1">3.</span>
                      <span>Contact: +966537499276</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-green-50 rounded p-3 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                  <h3 className="text-sm font-semibold text-green-900 mb-2">Bank Details</h3>
                  <div className="space-y-1">
                    <div>
                      <p className="text-xs text-green-600">Account Name</p>
                      <p className="font-medium text-xs text-gray-900">Mian Taimoor Shah</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-600">Bank Name</p>
                      <p className="font-medium text-xs text-gray-900">United Bank Limited</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-600">Account Number</p>
                      <p className="font-medium text-xs text-gray-900">1578306653591</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-600">IBAN</p>
                      <p className="font-medium text-xs text-gray-900">PK48UNIL0109000306653591</p>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-green-200 pt-4 mt-4">
                  <h2 className="text-base font-bold text-gray-900 mb-2">After Payment</h2>
                  {!paymentNotified ? (
                    <>
                      <p className="text-gray-700 text-xs mb-3">
                        After making the payment, enter your email and click the button below to notify the admin. 
                        The admin will contact you to verify and activate your account.
                      </p>
                      
                      {/* Email Input */}
                      <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Your Email Address
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          className="w-full px-3 py-2 border border-green-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                      
                      <button
                        onClick={handlePaymentNotification}
                        disabled={loading || !email || paymentNotified}
                        className={`w-full px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded hover:from-green-700 hover:to-emerald-800 transition text-xs disabled:opacity-50 ${
                          !email ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {loading ? 'Sending Notification...' : 'I Have Made the Payment'}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="bg-green-100 border border-green-300 rounded p-3 mb-3">
                        <div className="flex items-center">
                          <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                          <span className="text-green-800 text-xs font-medium">Payment notification sent!</span>
                        </div>
                        <p className="text-green-700 text-xs mt-2">
                          Admin will contact you shortly to verify and activate your account.
                        </p>
                      </div>
                      
                      {/* Account Status Message */}
                      {userPlan?.isPaid && userPlan?.subscriptionStatus === 'active' ? (
                        <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-lg p-3 mb-3 text-center">
                          <p className="text-white font-bold text-sm">Account Activated!</p>
                          <p className="text-white text-xs mt-1">Your payment has been approved</p>
                        </div>
                      ) : (
                        <div className="bg-yellow-100 border border-yellow-300 rounded p-3 mb-3">
                          <div className="flex items-center">
                            <div className="h-3 w-3 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
                            <span className="text-yellow-800 text-xs font-medium">Payment Processing</span>
                          </div>
                          <p className="text-yellow-700 text-xs mt-1">
                            Waiting for admin approval. This may take a few minutes.
                          </p>
                        </div>
                      )}
                      
                      <button
                        onClick={() => {
                          // Only navigate to dashboard if user is approved (paid and active)
                          if (userPlan?.isPaid && userPlan?.subscriptionStatus === 'active') {
                            router.push('/dashboard');
                          } else {
                            toast.error('Your payment is still being processed. Please wait for admin approval.');
                          }
                        }}
                        className={`px-3 py-1.5 rounded transition text-xs ${
                          userPlan?.isPaid && userPlan?.subscriptionStatus === 'active' 
                            ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        Back to Dashboard
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PaymentGuard>
  );
}