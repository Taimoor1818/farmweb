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
    { name: 'Cow Milk Entry', href: '/dashboard/cow-milk', icon: BeakerIcon, color: 'bg-blue-100 text-blue-600' },
    { name: 'Buffalo Milk Entry', href: '/dashboard/buffalo-milk', icon: BeakerIcon, color: 'bg-purple-100 text-purple-600' },
    { name: 'Daily Records', href: '/dashboard/daily-record', icon: ClipboardDocumentListIcon, color: 'bg-green-100 text-green-600' },
    { name: 'Monthly Report', href: '/dashboard/monthly-record', icon: CalendarIcon, color: 'bg-yellow-100 text-yellow-600' },
    { name: 'User Management', href: '/dashboard/users', icon: UsersIcon, color: 'bg-indigo-100 text-indigo-600' },
    { name: 'Cash Entry', href: '/dashboard/cash', icon: BanknotesIcon, color: 'bg-teal-100 text-teal-600' },
    { name: 'Expense Entry', href: '/dashboard/expense', icon: BanknotesIcon, color: 'bg-red-100 text-red-600' },
    { name: 'Tools', href: '/dashboard/tools', icon: WrenchScrewdriverIcon, color: 'bg-pink-100 text-pink-600' },
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
        if (!user) return;

        const fetchFarmDetails = async () => {
            try {
                const docRef = doc(db, `users/${user.uid}/farm_details`, 'info');
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data() as FarmDetails;
                    setFarmDetails(data);
                    setFormData(data);
                }
            } catch (error) {
                console.error('Error fetching farm details:', error);
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
        if (!user) return;

        try {
            const docRef = doc(db, `users/${user.uid}/farm_details`, 'info');
            await setDoc(docRef, formData);

            setFarmDetails(formData);
            setIsEditing(false);
            toast.success('Farm details saved successfully');
        } catch (error) {
            console.error('Error saving farm details:', error);
            toast.error('Failed to save farm details');
        }
    };

    const handleChange = (field: keyof FarmDetails, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <div>
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

            {/* Farm Details Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Farm Details</h2>
                    {farmDetails && !isEditing && (
                        <button
                            onClick={handleEdit}
                            className="flex items-center text-sm text-indigo-600 hover:text-indigo-900"
                        >
                            <PencilIcon className="h-4 w-4 mr-1" />
                            Edit
                        </button>
                    )}
                </div>

                {loading ? (
                    <p className="text-gray-500">Loading farm details...</p>
                ) : isEditing ? (
                    // Edit Form
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Farm Name</label>
                                <input
                                    type="text"
                                    value={formData.farmName}
                                    onChange={(e) => handleChange('farmName', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                                    placeholder="Enter farm name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">City</label>
                                <input
                                    type="text"
                                    value={formData.city}
                                    onChange={(e) => handleChange('city', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                                    placeholder="Enter city"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Contact</label>
                                <input
                                    type="text"
                                    value={formData.contact}
                                    onChange={(e) => handleChange('contact', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                                    placeholder="Enter contact"
                                />
                            </div>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={handleSave}
                                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                            >
                                <CheckIcon className="h-4 w-4 mr-1" />
                                Save
                            </button>
                            <button
                                onClick={handleCancel}
                                className="flex items-center px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                            >
                                <XMarkIcon className="h-4 w-4 mr-1" />
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : farmDetails ? (
                    // Display Farm Details
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Farm Name</p>
                            <p className="text-lg font-semibold text-gray-900">{farmDetails.farmName}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">City</p>
                            <p className="text-lg font-semibold text-gray-900">{farmDetails.city}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Contact</p>
                            <p className="text-lg font-semibold text-gray-900">{farmDetails.contact}</p>
                        </div>
                    </div>
                ) : (
                    // Set Farm Details
                    <div className="space-y-4">
                        <p className="text-gray-500">No farm details set yet. Please add your farm information.</p>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                            Set Farm Details
                        </button>
                    </div>
                )}
            </div>

            <div className="py-4">
                <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex flex-col items-center justify-center">
                    <p className="text-gray-500 mb-8 text-lg">Welcome to Mtamsport Dashboard</p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full max-w-4xl px-8">
                        {quickActions.map((action) => (
                            <Link
                                key={action.name}
                                href={action.href}
                                className="flex flex-col items-center justify-center p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200 hover:border-green-300"
                            >
                                <div className={`${action.color} p-3 rounded-full mb-2`}>
                                    <action.icon className="h-6 w-6" aria-hidden="true" />
                                </div>
                                <span className="text-sm font-medium text-gray-700 text-center">{action.name}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}