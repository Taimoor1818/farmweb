'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import {
    BeakerIcon,
    BanknotesIcon,
    CalendarIcon,
    UsersIcon,
    ShoppingBagIcon,
    WrenchScrewdriverIcon,
    ClipboardDocumentListIcon,
    PencilIcon,
    CheckIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';

interface FarmDetails {
    farmName: string;
    city: string;
    contact: string;
}

interface UserSubscriptionData {
    isPaid: boolean;
    subscriptionStatus: string;
    email: string;
}

const quickActions = [
    { name: 'Cow Milk Entry', href: '/dashboard/cow-milk', icon: BeakerIcon, color: 'bg-blue-50 text-blue-600', bgColor: 'bg-blue-50' },
    { name: 'Buffalo Milk Entry', href: '/dashboard/buffalo-milk', icon: BeakerIcon, color: 'bg-purple-50 text-purple-600', bgColor: 'bg-purple-50' },
    { name: 'Daily Records', href: '/dashboard/daily-record', icon: ClipboardDocumentListIcon, color: 'bg-green-50 text-green-600', bgColor: 'bg-green-50' },
    { name: 'Monthly Report', href: '/dashboard/monthly-record', icon: CalendarIcon, color: 'bg-yellow-50 text-yellow-600', bgColor: 'bg-yellow-50' },
    { name: 'User Management', href: '/dashboard/users', icon: UsersIcon, color: 'bg-indigo-50 text-indigo-600', bgColor: 'bg-indigo-50' },
    { name: 'Cash Entry', href: '/dashboard/cash', icon: BanknotesIcon, color: 'bg-teal-50 text-teal-600', bgColor: 'bg-teal-50' },
    { name: 'Expense Entry', href: '/dashboard/expense', icon: BanknotesIcon, color: 'bg-red-50 text-red-600', bgColor: 'bg-red-50' },
    { name: 'Tools', href: '/dashboard/tools', icon: WrenchScrewdriverIcon, color: 'bg-pink-50 text-pink-600', bgColor: 'bg-pink-50' },
];

export default function DashboardPage() {
    const { user } = useAuthStore();
    const [farmDetails, setFarmDetails] = useState<FarmDetails | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState<FarmDetails>({
        farmName: '',
        city: '',
        contact: ''
    });
    const [subscriptionData, setSubscriptionData] = useState<UserSubscriptionData | null>(null);

    // Fetch farm details
    useEffect(() => {
        console.log('Dashboard: User object received:', user);
        console.log('Dashboard: User UID:', user?.uid);
        console.log('Dashboard: User email:', user?.email);
        
        if (!user) {
            console.log('Dashboard: No user object found');
            setLoading(false);
            return;
        }

        // Listen for real-time subscription data updates
        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribeSubscription = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setSubscriptionData({
                    isPaid: data.isPaid || false,
                    subscriptionStatus: data.subscriptionStatus || 'unknown',
                    email: data.email || user.email || ''
                });
            }
        }, (error) => {
            console.error('Dashboard: Error fetching subscription data:', error);
        });

        const fetchFarmDetails = async () => {
            try {
                const docRef = doc(db, `users/${user.uid}/farm_details`, 'info');
                console.log('Dashboard: Fetching farm details from path:', `users/${user.uid}/farm_details/info`);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data() as FarmDetails;
                    console.log('Dashboard: Farm details loaded:', data);
                    setFarmDetails(data);
                    setFormData(data);
                } else {
                    console.log('Dashboard: No farm details found for user:', user.uid);
                }
            } catch (error: any) {
                console.error('Dashboard: Error fetching farm details:', error);
                // Check if it's a permission error
                if (error.code === 'permission-denied') {
                    console.error('Dashboard: Permission denied error - Firestore rules may need updating');
                    toast.error('Access denied. Please contact support.');
                } else {
                    toast.error('Failed to load farm details: ' + error.message);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchFarmDetails();

        // Cleanup subscription listeners
        return () => {
            unsubscribeSubscription();
        };
    }, [user]);

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancel = () => {
        // Reset form to original values
        setFormData(farmDetails || {
            farmName: '',
            city: '',
            contact: ''
        });
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!user) {
            toast.error('User not authenticated');
            return;
        }

        try {
            const docRef = doc(db, `users/${user.uid}/farm_details`, 'info');
            await setDoc(docRef, formData);

            setFarmDetails(formData);
            setIsEditing(false);
            toast.success('Farm details saved successfully');
        } catch (error: any) {
            console.error('Error saving farm details:', error);
            // Check if it's a permission error
            if (error.code === 'permission-denied') {
                console.error('Permission denied error - Firestore rules may need updating');
                toast.error('Access denied. Please contact support.');
            } else {
                toast.error('Failed to save farm details: ' + error.message);
            }
        }
    };

    const handleChange = (field: keyof FarmDetails, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Show loading state while auth is being determined
    if (loading && !farmDetails) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-2 sm:p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 sm:mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
                    {subscriptionData && (
                        <div className="mt-2 md:mt-0 flex items-center space-x-3">
                            <div className="text-sm">
                                <p className="text-gray-600 truncate max-w-xs">{subscriptionData.email}</p>
                                <div className="flex items-center mt-1">
                                    {subscriptionData.isPaid && subscriptionData.subscriptionStatus === 'active' ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            <svg className="-ml-0.5 mr-1.5 h-2 w-2 text-green-400" fill="currentColor" viewBox="0 0 8 8">
                                                <circle cx={4} cy={4} r={3} />
                                            </svg>
                                            Activated
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                            <svg className="-ml-0.5 mr-1.5 h-2 w-2 text-yellow-400" fill="currentColor" viewBox="0 0 8 8">
                                                <circle cx={4} cy={4} r={3} />
                                            </svg>
                                            Pending
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Farm Details Section */}
                <div className="bg-white rounded-xl shadow p-3 sm:p-4 mb-4 sm:mb-6 transition-all duration-300 hover:shadow-md">
                    <div className="flex justify-between items-center mb-3 sm:mb-4">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Farm Details</h2>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-20">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                        </div>
                    ) : isEditing ? (
                        // Edit Form
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Farm Name</label>
                                    <input
                                        type="text"
                                        value={formData.farmName}
                                        onChange={(e) => handleChange('farmName', e.target.value)}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border transition duration-200 text-sm"
                                        placeholder="Enter farm name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">City</label>
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => handleChange('city', e.target.value)}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border transition duration-200 text-sm"
                                        placeholder="Enter city"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Contact</label>
                                    <input
                                        type="text"
                                        value={formData.contact}
                                        onChange={(e) => handleChange('contact', e.target.value)}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border transition duration-200 text-sm"
                                        placeholder="Enter contact"
                                    />
                                </div>
                            </div>
                            <div className="flex space-x-3 pt-2">
                                <button
                                    onClick={handleSave}
                                    className="flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 text-xs sm:text-sm"
                                >
                                    <CheckIcon className="h-4 w-4 mr-1" />
                                    Save
                                </button>
                                <button
                                    onClick={handleCancel}
                                    className="flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200 text-xs sm:text-sm"
                                >
                                    <XMarkIcon className="h-4 w-4 mr-1" />
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : farmDetails ? (
                        // Display Farm Details
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                                <div className="bg-gradient-to-br from-green-50 to-blue-50 p-2 sm:p-3 rounded-lg shadow-sm border border-green-100">
                                    <p className="text-xs font-medium text-gray-500 mb-0.5">Farm Name</p>
                                    <p className="font-semibold text-gray-900 truncate text-sm sm:text-base">{farmDetails.farmName}</p>
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-blue-50 p-2 sm:p-3 rounded-lg shadow-sm border border-green-100">
                                    <p className="text-xs font-medium text-gray-500 mb-0.5">City</p>
                                    <p className="font-semibold text-gray-900 truncate text-sm sm:text-base">{farmDetails.city}</p>
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-blue-50 p-2 sm:p-3 rounded-lg shadow-sm border border-green-100">
                                    <p className="text-xs font-medium text-gray-500 mb-0.5">Contact</p>
                                    <p className="font-semibold text-gray-900 truncate text-sm sm:text-base">{farmDetails.contact}</p>
                                </div>
                            </div>
                            <div className="pt-2">
                                <button
                                    onClick={handleEdit}
                                    className="flex items-center px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-all duration-200 text-xs sm:text-sm"
                                >
                                    <PencilIcon className="h-4 w-4 mr-1" />
                                    Edit Details
                                </button>
                            </div>
                        </div>
                    ) : (
                        // Set Farm Details
                        <div className="space-y-4 text-center py-4 sm:py-6">
                            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center mb-2 sm:mb-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <p className="text-gray-600 text-xs sm:text-sm">No farm details set yet. Please add your farm information.</p>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="mx-auto flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 text-xs sm:text-sm"
                            >
                                Set Farm Details
                            </button>
                        </div>
                    )}
                </div>

                {/* Quick Actions Grid */}
                <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 transition-all duration-300 hover:shadow-xl">
                    <div className="flex justify-between items-center mb-4 sm:mb-6">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Quick Actions</h2>
                        {user?.email === 'taimoorshah1818@gmail.com' && (
                            <Link 
                                href="/admin/payments"
                                className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Admin Panel
                            </Link>
                        )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                        {quickActions.map((action) => (
                            <Link
                                key={action.name}
                                href={action.href}
                                className="group flex flex-col items-center justify-center p-2 sm:p-3 rounded-xl shadow-sm hover:shadow transition-all duration-200 border border-gray-100 hover:border-green-200 bg-gradient-to-br from-white to-gray-50 hover:from-white hover:to-green-50"
                            >
                                <div className={`${action.color} p-2 rounded-xl mb-2 transition-all duration-200 group-hover:scale-105`}>
                                    <action.icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
                                </div>
                                <span className="text-xs sm:text-sm font-medium text-gray-800 text-center group-hover:text-green-700 transition-colors duration-200">{action.name}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}