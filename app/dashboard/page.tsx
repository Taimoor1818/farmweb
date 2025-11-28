'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
    country: string;
    contact: string;
    email?: string;
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
        country: '',
        contact: ''
    });

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
    }, [user]);

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancel = () => {
        // Reset form to original values
        setFormData(farmDetails || {
            farmName: '',
            city: '',
            country: '',
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

                {/* Farm Details Section */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 transition-all duration-300 hover:shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Farm Details</h2>
                        <div className="flex space-x-2">
                            {farmDetails && !isEditing && (
                                <button
                                    onClick={handleEdit}
                                    className="flex items-center px-4 py-2 bg-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-200 transition-all duration-200 shadow-sm hover:shadow-md"
                                >
                                    <PencilIcon className="h-5 w-5 mr-2" />
                                    Edit
                                </button>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-32">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500"></div>
                        </div>
                    ) : isEditing ? (
                        // Edit Form
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Farm Name</label>
                                    <input
                                        type="text"
                                        value={formData.farmName}
                                        onChange={(e) => handleChange('farmName', e.target.value)}
                                        className="w-full rounded-xl border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-3 border transition duration-200"
                                        placeholder="Enter farm name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => handleChange('city', e.target.value)}
                                        className="w-full rounded-xl border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-3 border transition duration-200"
                                        placeholder="Enter city"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                                    <input
                                        type="text"
                                        value={formData.country}
                                        onChange={(e) => handleChange('country', e.target.value)}
                                        className="w-full rounded-xl border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-3 border transition duration-200"
                                        placeholder="Enter country"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact</label>
                                    <input
                                        type="text"
                                        value={formData.contact}
                                        onChange={(e) => handleChange('contact', e.target.value)}
                                        className="w-full rounded-xl border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-3 border transition duration-200"
                                        placeholder="Enter contact"
                                    />
                                </div>
                            </div>
                            <div className="flex space-x-4 pt-4">
                                <button
                                    onClick={handleSave}
                                    className="flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg"
                                >
                                    <CheckIcon className="h-5 w-5 mr-2" />
                                    Save Changes
                                </button>
                                <button
                                    onClick={handleCancel}
                                    className="flex items-center px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
                                >
                                    <XMarkIcon className="h-5 w-5 mr-2" />
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : farmDetails ? (
                        // Display Farm Details
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-gradient-to-br from-green-50 to-blue-50 p-5 rounded-2xl shadow-sm border border-green-100">
                                    <p className="text-sm font-medium text-gray-500 mb-1">Farm Name</p>
                                    <p className="text-xl font-semibold text-gray-900">{farmDetails.farmName}</p>
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-blue-50 p-5 rounded-2xl shadow-sm border border-green-100">
                                    <p className="text-sm font-medium text-gray-500 mb-1">City</p>
                                    <p className="text-xl font-semibold text-gray-900">{farmDetails.city}</p>
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-blue-50 p-5 rounded-2xl shadow-sm border border-green-100">
                                    <p className="text-sm font-medium text-gray-500 mb-1">Country</p>
                                    <p className="text-xl font-semibold text-gray-900">{farmDetails.country}</p>
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-blue-50 p-5 rounded-2xl shadow-sm border border-green-100">
                                    <p className="text-sm font-medium text-gray-500 mb-1">Contact</p>
                                    <p className="text-xl font-semibold text-gray-900">{farmDetails.contact}</p>
                                </div>
                            </div>
                            <div className="pt-4">
                                <button
                                    onClick={handleEdit}
                                    className="flex items-center px-4 py-2 bg-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-200 transition-all duration-200 shadow-sm hover:shadow-md"
                                >
                                    <PencilIcon className="h-5 w-5 mr-2" />
                                    Edit Farm Details
                                </button>
                            </div>
                        </div>
                    ) : (
                        // Set Farm Details
                        <div className="space-y-6 text-center py-8">
                            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <p className="text-gray-600 text-lg">No farm details set yet. Please add your farm information.</p>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="mx-auto flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg"
                            >
                                Set Farm Details
                            </button>
                        </div>
                    )}
                </div>

                {/* Quick Actions Grid */}
                <div className="bg-white rounded-2xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6">
                        {quickActions.map((action) => (
                            <Link
                                key={action.name}
                                href={action.href}
                                className="group flex flex-col items-center justify-center p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-green-200 bg-gradient-to-br from-white to-gray-50 hover:from-white hover:to-green-50"
                            >
                                <div className={`${action.color} p-4 rounded-2xl mb-4 transition-all duration-200 group-hover:scale-110`}>
                                    <action.icon className="h-8 w-8" aria-hidden="true" />
                                </div>
                                <span className="text-base font-medium text-gray-800 text-center group-hover:text-green-700 transition-colors duration-200">{action.name}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}