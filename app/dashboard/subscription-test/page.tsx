'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';

export default function SubscriptionTestPage() {
  const { user } = useAuthStore();
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Listen for user subscription data changes
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setSubscriptionData(docSnap.data());
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Check if user is in trial period
  const isInTrial = subscriptionData?.subscriptionStatus === 'trial';
  
  // Check if trial has expired (2 days)
  const isTrialExpired = isInTrial && subscriptionData?.trialStartedAt && 
    (new Date().getTime() - new Date(subscriptionData.trialStartedAt.seconds * 1000).getTime()) > (2 * 24 * 60 * 60 * 1000);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Subscription Status Test</h1>
        
        {subscriptionData ? (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">User Subscription Data</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Subscription Status</p>
                  <p className="font-medium">{subscriptionData.subscriptionStatus || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Is Paid</p>
                  <p className="font-medium">{subscriptionData.isPaid ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Trial Started At</p>
                  <p className="font-medium">
                    {subscriptionData.trialStartedAt 
                      ? new Date(subscriptionData.trialStartedAt.seconds * 1000).toLocaleString() 
                      : 'Not set'}
                  </p>
                </div>
                {subscriptionData.paidAt && (
                  <div>
                    <p className="text-sm text-gray-500">Paid At</p>
                    <p className="font-medium">{new Date(subscriptionData.paidAt.seconds * 1000).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Computed Status</h2>
              <div className="space-y-3">
                <div className="flex items-center">
                  <span className="font-medium mr-2">In Trial:</span>
                  <span className={isInTrial ? 'text-green-600' : 'text-red-600'}>
                    {isInTrial ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium mr-2">Trial Expired:</span>
                  <span className={isTrialExpired ? 'text-red-600' : 'text-green-600'}>
                    {isTrialExpired ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium mr-2">Has Access:</span>
                  <span className={(subscriptionData.isPaid || (isInTrial && !isTrialExpired)) ? 'text-green-600' : 'text-red-600'}>
                    {subscriptionData.isPaid || (isInTrial && !isTrialExpired) ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Expected Behavior</h2>
              <ul className="list-disc pl-5 space-y-2 text-gray-700">
                <li>If in trial and not expired: Full access to dashboard</li>
                <li>If trial expired and not paid: Redirect to payment page</li>
                <li>If paid: Full access to dashboard</li>
                <li>If pending payment: Redirect to payment page</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No subscription data found</p>
          </div>
        )}
      </div>
    </div>
  );
}