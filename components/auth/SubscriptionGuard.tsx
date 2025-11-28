'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

interface UserSubscriptionData {
  isPaid: boolean;
  subscriptionStatus: string;
  trialStartedAt?: any;
}

export default function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  const router = useRouter();
  const [subscriptionData, setSubscriptionData] = useState<UserSubscriptionData | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  useEffect(() => {
    if (!user || loading) return;

    // Listen for user subscription data changes
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserSubscriptionData;
        setSubscriptionData(data);
      }
      setSubscriptionLoading(false);
    }, (error) => {
      console.error('Error fetching subscription data:', error);
      toast.error('Failed to load subscription data');
      setSubscriptionLoading(false);
    });

    return () => unsubscribe();
  }, [user, loading]);

  // Check if user is in trial period
  const isInTrial = subscriptionData?.subscriptionStatus === 'trial';
  
  // Check if trial has expired (2 days)
  const isTrialExpired = isInTrial && subscriptionData?.trialStartedAt && 
    (new Date().getTime() - new Date(subscriptionData.trialStartedAt.seconds * 1000).getTime()) > (2 * 24 * 60 * 60 * 1000);

  // Check if user has access (paid and active OR in valid trial)
  const hasAccess = (subscriptionData?.isPaid && subscriptionData?.subscriptionStatus === 'active') || (isInTrial && !isTrialExpired);

  // Redirect logic
  useEffect(() => {
    if (subscriptionLoading || loading) return;
    
    // If no subscription data, redirect to dashboard home
    if (!subscriptionData) {
      router.push('/dashboard');
      return;
    }
    
    // If trial expired and not paid, redirect to payment page
    if (isTrialExpired && !subscriptionData.isPaid) {
      router.push('/payment');
      return;
    }
    
    // If user was previously approved but is now pending, redirect to payment page
    if (subscriptionData.isPaid === false && subscriptionData.subscriptionStatus === 'pending_payment') {
      router.push('/payment');
      return;
    }
  }, [subscriptionData, subscriptionLoading, loading, isTrialExpired, router]);

  // Show loading state
  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // If user has access, show content
  if (hasAccess) {
    return <>{children}</>;
  }

  // If trial expired and not paid, or user is pending payment, redirect to payment (handled by useEffect)
  // This is a fallback UI
  if ((isTrialExpired && !subscriptionData?.isPaid) || 
      (subscriptionData?.isPaid === false && subscriptionData?.subscriptionStatus === 'pending_payment')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Subscription Required</h2>
          <p className="text-gray-600 mb-6">
            Your free trial has expired. Please make a payment to continue using the service.
          </p>
          <a
            href="/payment"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition inline-block"
          >
            Go to Payment Page
          </a>
        </div>
      </div>
    );
  }

  // Default fallback
  return <>{children}</>;
}