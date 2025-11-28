'use client';

import { useState, useEffect } from 'react';
import { doc, setDoc, getDoc, updateDoc, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { toast } from 'react-hot-toast';
import { BanknotesIcon, PhotoIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import PaymentGuard from '@/components/auth/PaymentGuard';

export default function PaymentPage() {
  const { user } = useAuthStore();
  const [amount, setAmount] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userPlan, setUserPlan] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    const fetchUserPlan = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserPlan(userDoc.data());
        }
      } catch (error) {
        console.error('Error fetching user plan:', error);
      }
    };

    fetchUserPlan();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReceipt(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !amount || !receipt) {
      toast.error('Please fill all fields and upload a receipt');
      return;
    }
    
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    setLoading(true);
    
    try {
      // Upload receipt to Firebase Storage
      setUploading(true);
      const receiptRef = ref(storage, `payment_receipts/${user.uid}/${Date.now()}_${receipt.name}`);
      await uploadBytes(receiptRef, receipt);
      const receiptUrl = await getDownloadURL(receiptRef);
      setUploading(false);
      
      // Save payment request to Firestore
      await setDoc(doc(collection(db, 'payment_requests')), {
        userId: user.uid,
        userEmail: user.email,
        amount: parseFloat(amount),
        receiptUrl,
        status: 'pending',
        createdAt: new Date(),
      });
      
      // Update user's payment status to pending
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        subscriptionStatus: 'pending_payment'
      });
      
      toast.success('Payment request submitted successfully! Admin will review your payment.');
      setAmount('');
      setReceipt(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast.error('Failed to submit payment request. Please try again.');
      setUploading(false);
    } finally {
      setLoading(false);
    }
  };

  // Check if user is still in trial period (2 days)
  const isInTrial = userPlan && userPlan.subscriptionStatus === 'trial';
  const trialExpired = isInTrial && userPlan.trialStartedAt && 
    (new Date().getTime() - new Date(userPlan.trialStartedAt.seconds * 1000).getTime()) > (2 * 24 * 60 * 60 * 1000);

  if (!userPlan) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  if (userPlan.isPaid) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <CheckCircleIcon className="h-20 w-20 text-green-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Subscription Active</h2>
          <p className="text-lg text-gray-600 mb-6">
            Your subscription is active and you have full access to all features.
          </p>
          <div className="bg-green-50 rounded-lg p-6 max-w-md mx-auto">
            <h3 className="font-medium text-green-800 mb-2">Current Plan</h3>
            <p className="text-green-700">Full Access Forever</p>
          </div>
        </div>
      </div>
    );
  }

  if (isInTrial && !trialExpired) {
    const trialEndDate = new Date(userPlan.trialStartedAt?.seconds * 1000);
    trialEndDate.setDate(trialEndDate.getDate() + 2);
    
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Free Trial</h2>
            <p className="text-lg text-gray-600">
              You're currently using the free trial version
            </p>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <h3 className="font-medium text-blue-800 mb-2">Trial Period</h3>
            <p className="text-blue-700">
              Your trial ends on {trialEndDate.toLocaleDateString()} at {trialEndDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">What's Included in Trial</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                  <span>Full access to all features</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                  <span>Create and manage records</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                  <span>Generate reports</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                  <span>Export data</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upgrade to Full Version</h3>
              <p className="text-gray-600 mb-4">
                After your trial ends, you'll need to make a payment to continue using the service.
              </p>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-500">One-time Payment</p>
                <p className="text-2xl font-bold text-gray-900">PKR 5,000</p>
                <p className="text-sm text-gray-500">Full access forever</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PaymentGuard>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-700 px-6 py-8 text-white">
            <div className="max-w-3xl mx-auto text-center">
              <BanknotesIcon className="h-12 w-12 mx-auto mb-4 text-green-200" />
              <h1 className="text-3xl font-bold mb-2">Payment Required</h1>
              <p className="text-green-100 text-lg">
                Your free trial has ended. Please make a payment to continue using the service.
              </p>
            </div>
          </div>
          
          <div className="px-6 py-8">
            <div className="max-w-2xl mx-auto">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
                <h3 className="font-medium text-yellow-800 mb-2">Payment Instructions</h3>
                <ul className="space-y-2 text-yellow-700">
                  <li className="flex items-start">
                    <span className="font-medium mr-2">1.</span>
                    <span>Transfer PKR 5,000 to the bank account or use the STC Pay QR code below</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-medium mr-2">2.</span>
                    <span>Upload your payment receipt</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-medium mr-2">3.</span>
                    <span>Admin will verify your payment and activate your account</span>
                  </li>
                </ul>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Bank Details</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Account Name</p>
                      <p className="font-medium">Mtamsport Farm Management</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Bank Name</p>
                      <p className="font-medium">National Bank of Pakistan</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Account Number</p>
                      <p className="font-medium">*****************</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">IBAN</p>
                      <p className="font-medium">*****************</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-6 flex flex-col items-center justify-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">STC Pay QR Code</h3>
                  <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="bg-gray-200 border-2 border-dashed rounded-xl w-32 h-32 flex items-center justify-center text-gray-500">
                      QR Code
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray-500">Scan this QR code with STC Pay app</p>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit Payment Receipt</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount (PKR)
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-3 border transition"
                      placeholder="5000"
                      min="1"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Receipt
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                      <div className="space-y-1 text-center">
                        {previewUrl ? (
                          <div className="mb-4">
                            <img src={previewUrl} alt="Receipt preview" className="mx-auto h-32" />
                          </div>
                        ) : (
                          <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                        )}
                        <div className="flex text-sm text-gray-600">
                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500">
                            <span>Upload a file</span>
                            <input
                              type="file"
                              className="sr-only"
                              accept="image/*,.pdf"
                              onChange={handleFileChange}
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, GIF up to 10MB
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading || uploading}
                      className="flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      {uploading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Uploading...
                        </>
                      ) : loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Submitting...
                        </>
                      ) : (
                        'Submit Payment Request'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PaymentGuard>
  );
}