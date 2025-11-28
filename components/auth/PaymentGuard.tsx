'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface UserSubscriptionData {
  isPaid: boolean;
  subscriptionStatus: string;
  trialStartedAt?: any;
}

export default function PaymentGuard({ children }: { children: React.ReactNode }) {
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
      setSubscriptionLoading(false);
    });

    return () => unsubscribe();
  }, [user, loading]);

  // Check if user is in trial period
  const isInTrial = subscriptionData?.subscriptionStatus === 'trial';
  
  // Check if trial has expired (2 days)
  const isTrialExpired = isInTrial && subscriptionData?.trialStartedAt && 
    (new Date().getTime() - new Date(subscriptionData.trialStartedAt.seconds * 1000).getTime()) > (2 * 24 * 60 * 60 * 1000);

  // Check if user should have access to payment page (expired trial, pending payment, or not paid)
  const shouldAccessPayment = (isInTrial && isTrialExpired) || subscriptionData?.subscriptionStatus === 'pending_payment' || !subscriptionData?.isPaid;

  // Redirect logic
  useEffect(() => {
    if (subscriptionLoading || loading) return;
    
    // If user is already paid, redirect to dashboard
    if (subscriptionData?.isPaid) {
      router.push('/dashboard');
      return;
    }
    
    // If user is in valid trial period, redirect to dashboard
    if (isInTrial && !isTrialExpired) {
      router.push('/dashboard');
      return;
    }
    
    // If user should not access payment page, redirect to dashboard
    if (!shouldAccessPayment) {
      router.push('/dashboard');
    }
  }, [subscriptionData, subscriptionLoading, loading, isInTrial, isTrialExpired, shouldAccessPayment, router]);

  // Show loading state
  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // If user should access payment page, show content
  if (shouldAccessPayment) {
    return <>{children}</>;
  }

  // Show nothing while redirecting
  return null;
}
