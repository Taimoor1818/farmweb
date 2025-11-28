'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { CheckCircleIcon, XCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import MPINScreen from '@/components/auth/MPINScreen';

interface PaymentRequest {
  id: string;
  userId: string;
  userEmail: string;
  notificationEmail?: string;
  amount: number;
  receiptUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  updatedAt?: any;
  isResubmitted?: boolean;
  userName?: string;
}

export default function AdminPaymentsPage() {
  const { user } = useAuthStore();
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [passkey, setPasskey] = useState('');
  const [showMPIN, setShowMPIN] = useState(false);
  const [mpinVerified, setMpinVerified] = useState(false);

  // Strict admin check - only taimoorshah1818@gmail.com is admin
  const isAdmin = user?.email === 'taimoorshah1818@gmail.com';

  useEffect(() => {
    if (!user || !isAdmin) return;

    // Show MPIN screen for admin users
    if (!mpinVerified) {
      setShowMPIN(true);
      return;
    }

    const fetchPayments = async () => {
      try {
        // Fetch all users to get their names
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const userMap: Record<string, string> = {};
        usersSnapshot.forEach((doc) => {
          const data = doc.data();
          userMap[doc.id] = data.email || 'Unknown User';
        });

        // Listen for payment requests
        const q = query(collection(db, 'payment_requests'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const list: PaymentRequest[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as PaymentRequest;
            list.push({
              ...data,
              id: doc.id,
              userName: userMap[data.userId] || data.userEmail || 'Unknown User'
            });
          });
          
          // Sort by createdAt descending
          list.sort((a, b) => 
            b.createdAt?.seconds - a.createdAt?.seconds || 
            b.createdAt - a.createdAt
          );
          
          setPayments(list);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching payments:', error);
        toast.error('Failed to load payment requests');
        setLoading(false);
      }
    };

    fetchPayments();
  }, [user, isAdmin, mpinVerified]);

  const handleApprove = async (paymentId: string) => {
    if (!user || !isAdmin) return;
    
    try {
      // Update payment request status
      const paymentRef = doc(db, 'payment_requests', paymentId);
      await updateDoc(paymentRef, {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: user.uid
      });
      
      // Find the payment to get user ID
      const payment = payments.find(p => p.id === paymentId);
      if (payment) {
        // Update user's subscription status
        const userRef = doc(db, 'users', payment.userId);
        await updateDoc(userRef, {
          isPaid: true,
          subscriptionStatus: 'active',
          paidAt: new Date()
        });
      }
      
      toast.success('Payment approved successfully');
    } catch (error) {
      console.error('Error approving payment:', error);
      toast.error('Failed to approve payment');
    }
  };

  const handleReject = async (paymentId: string) => {
    if (!user || !isAdmin) return;
    
    try {
      const paymentRef = doc(db, 'payment_requests', paymentId);
      await updateDoc(paymentRef, {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: user.uid
      });
      
      toast.success('Payment rejected');
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast.error('Failed to reject payment');
    }
  };

  const handlePending = async (paymentId: string) => {
    if (!user || !isAdmin) return;
    
    try {
      // Update payment request status to pending
      const paymentRef = doc(db, 'payment_requests', paymentId);
      await updateDoc(paymentRef, {
        status: 'pending',
        pendingAt: new Date(),
        pendingBy: user.uid
      });
      
      // Find the payment to get user ID
      const payment = payments.find(p => p.id === paymentId);
      if (payment) {
        // Update user's subscription status back to pending_payment
        const userRef = doc(db, 'users', payment.userId);
        await updateDoc(userRef, {
          isPaid: false,
          subscriptionStatus: 'pending_payment'
        });
      }
      
      toast.success('Payment status changed to pending');
    } catch (error) {
      console.error('Error setting payment to pending:', error);
      toast.error('Failed to set payment to pending');
    }
  };

  const handleDelete = async (paymentId: string) => {
    if (!user || !isAdmin) return;

    try {
      const paymentRef = doc(db, 'payment_requests', paymentId);
      await deleteDoc(paymentRef);

      toast.success('Payment request deleted successfully');
    } catch (error) {
      console.error('Error deleting payment request:', error);
      toast.error('Failed to delete payment request');
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // Handle MPIN verification
  const handleMPINSuccess = (userUid?: string) => {
    setMpinVerified(true);
    setShowMPIN(false);
    toast.success('MPIN verified successfully!');
  };

  const handleMPINCancel = () => {
    // Redirect to dashboard if MPIN verification is cancelled
    window.location.href = '/dashboard';
  };

  // Show MPIN screen if needed
  if (showMPIN) {
    return (
      <MPINScreen
        mode="login"
        email={user?.email || ''}
        onSuccess={handleMPINSuccess}
        onCancel={handleMPINCancel}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Payment Verification</h1>
        <p className="mt-2 text-gray-600">Review and approve payment requests from users</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Payment Requests</h2>
          <p className="text-gray-600">There are currently no pending payment requests.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {payments.map((payment) => (
              <li key={payment.id}>
                <div className="px-4 py-6 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <p className="text-lg font-medium text-green-600 truncate">
                          {payment.userName}
                        </p>
                        <span className={`ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          payment.status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : payment.status === 'approved' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                        }`}>
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          {payment.status === 'pending' && (
                            <span className="ml-2 flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                          )}
                        </span>
                        {/* Red dot indicator for resubmitted payments */}
                        {payment.isResubmitted && (
                          <span className="ml-2 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {payment.userEmail} • {format(new Date(payment.createdAt?.seconds * 1000 || payment.createdAt), 'MMM d, yyyy h:mm a')}
                        {payment.updatedAt && (
                          <span className="block text-xs">
                            Last updated: {format(new Date(payment.updatedAt?.seconds * 1000 || payment.updatedAt), 'MMM d, yyyy h:mm a')}
                          </span>
                        )}
                      </p>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <span className="font-medium">Amount:</span>
                        <span className="ml-2">PKR {payment.amount}</span>
                      </div>
                      {payment.notificationEmail && (
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <span className="font-medium">Notification Email:</span>
                          <span className="ml-2">{payment.notificationEmail}</span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex-shrink-0 flex space-x-4">
                      {payment.receiptUrl && (
                        <a
                          href={payment.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          View Receipt
                        </a>
                      )}
                      {payment.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(payment.id)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <CheckCircleIcon className="h-5 w-5 mr-2" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(payment.id)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <XCircleIcon className="h-5 w-5 mr-2" />
                            Reject
                          </button>
                          {/* Delete button with passkey protection */}
                          {deletingId === payment.id ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="password"
                                value={passkey}
                                onChange={(e) => setPasskey(e.target.value)}
                                placeholder="Enter passkey"
                                className="px-2 py-1 border border-gray-300 rounded text-sm w-24"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && passkey === '0000') {
                                    handleDelete(payment.id);
                                    setDeletingId(null);
                                    setPasskey('');
                                  } else if (e.key === 'Escape') {
                                    setDeletingId(null);
                                    setPasskey('');
                                  }
                                }}
                              />
                              <button
                                onClick={() => {
                                  if (passkey === '0000') {
                                    handleDelete(payment.id);
                                    setDeletingId(null);
                                    setPasskey('');
                                  } else {
                                    toast.error('Incorrect passkey');
                                  }
                                }}
                                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => {
                                  setDeletingId(null);
                                  setPasskey('');
                                }}
                                className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingId(payment.id)}
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            >
                              <XCircleIcon className="h-5 w-5 mr-2" />
                              Delete
                            </button>
                          )}
                        </>
                      )}
                      {payment.status === 'approved' && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handlePending(payment.id)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                          >
                            <XCircleIcon className="h-5 w-5 mr-2" />
                            Set to Pending
                          </button>
                          {/* Delete button with passkey protection */}
                          {deletingId === payment.id ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="password"
                                value={passkey}
                                onChange={(e) => setPasskey(e.target.value)}
                                placeholder="Enter passkey"
                                className="px-2 py-1 border border-gray-300 rounded text-sm w-24"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && passkey === '0000') {
                                    handleDelete(payment.id);
                                    setDeletingId(null);
                                    setPasskey('');
                                  } else if (e.key === 'Escape') {
                                    setDeletingId(null);
                                    setPasskey('');
                                  }
                                }}
                              />
                              <button
                                onClick={() => {
                                  if (passkey === '0000') {
                                    handleDelete(payment.id);
                                    setDeletingId(null);
                                    setPasskey('');
                                  } else {
                                    toast.error('Incorrect passkey');
                                  }
                                }}
                                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => {
                                  setDeletingId(null);
                                  setPasskey('');
                                }}
                                className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingId(payment.id)}
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            >
                              <XCircleIcon className="h-5 w-5 mr-2" />
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                      {payment.status === 'rejected' && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handlePending(payment.id)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                          >
                            <XCircleIcon className="h-5 w-5 mr-2" />
                            Set to Pending
                          </button>
                          {/* Delete button with passkey protection */}
                          {deletingId === payment.id ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="password"
                                value={passkey}
                                onChange={(e) => setPasskey(e.target.value)}
                                placeholder="Enter passkey"
                                className="px-2 py-1 border border-gray-300 rounded text-sm w-24"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && passkey === '0000') {
                                    handleDelete(payment.id);
                                    setDeletingId(null);
                                    setPasskey('');
                                  } else if (e.key === 'Escape') {
                                    setDeletingId(null);
                                    setPasskey('');
                                  }
                                }}
                              />
                              <button
                                onClick={() => {
                                  if (passkey === '0000') {
                                    handleDelete(payment.id);
                                    setDeletingId(null);
                                    setPasskey('');
                                  } else {
                                    toast.error('Incorrect passkey');
                                  }
                                }}
                                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => {
                                  setDeletingId(null);
                                  setPasskey('');
                                }}
                                className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingId(payment.id)}
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            >
                              <XCircleIcon className="h-5 w-5 mr-2" />
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}