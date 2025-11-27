'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, query, onSnapshot, doc, updateDoc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

interface Customer {
    id: string; // Firestore doc ID
    customerId: string; // Manual ID (e.g., 1, 2, 3)
    name: string;
    phone?: string;
    cowRate?: number;
    buffaloRate?: number;
}

interface FarmDetails {
    farmName: string;
    city: string;
    country: string;
    contact: string;
}

export default function UsersPage() {
    const { user } = useAuthStore();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [farmDetails, setFarmDetails] = useState<FarmDetails | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        customerId: '',
        name: '',
        phone: '',
        cowRate: '',
        buffaloRate: '',
    });

    // Helper to generate a unique 4-digit ID
    function generateUniqueId(existingIds: string[]): string {
        let id = '';
        do {
            id = Math.floor(1000 + Math.random() * 9000).toString();
        } while (existingIds.includes(id));
        return id;
    }

    useEffect(() => {
        if (!user) return;

        const q = query(collection(db, `users/${user.uid}/user_data`));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const customerList: Customer[] = [];
            snapshot.forEach((doc) => {
                customerList.push({ id: doc.id, ...doc.data() } as Customer);
            });
            // Sort by customerId (numeric)
            customerList.sort((a, b) => parseInt(a.customerId) - parseInt(b.customerId));
            setCustomers(customerList);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Fetch farm details
    useEffect(() => {
        if (!user) return;
        
        const fetchFarmDetails = async () => {
            try {
                const docRef = doc(db, `users/${user.uid}/farm_details`, 'info');
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    setFarmDetails(docSnap.data() as FarmDetails);
                }
            } catch (error) {
                console.error('Error fetching farm details:', error);
            }
        };
        
        fetchFarmDetails();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            const data = {
                customerId: formData.customerId,
                name: formData.name,
                phone: formData.phone,
                cowRate: parseFloat(formData.cowRate) || 0,
                buffaloRate: parseFloat(formData.buffaloRate) || 0,
            };

            if (editingCustomer) {
                await updateDoc(doc(db, `users/${user.uid}/user_data`, editingCustomer.id), data);
                toast.success('Customer updated successfully');
            } else {
                // Use customerId as doc ID for easier lookup
                await setDoc(doc(db, `users/${user.uid}/user_data`, formData.customerId), data);
                toast.success('Customer added successfully');
            }

            setIsModalOpen(false);
            setFormData({ customerId: '', name: '', phone: '', cowRate: '', buffaloRate: '' });
            setEditingCustomer(null);
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to save customer');
        }
    };

    const handleEdit = (customer: Customer) => {
        const passkey = prompt('Enter passkey to edit:');
        if (passkey !== '0000') {
            toast.error('Incorrect passkey');
            return;
        }
        setEditingCustomer(customer);
        setFormData({
            customerId: customer.customerId,
            name: customer.name,
            phone: customer.phone || '',
            cowRate: customer.cowRate?.toString() || '',
            buffaloRate: customer.buffaloRate?.toString() || '',
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        const passkey = prompt('Enter passkey to delete:');
        if (passkey !== '0000') {
            toast.error('Incorrect passkey');
            return;
        }

        if (!user || !confirm('Are you sure you want to delete this customer?')) return;

        try {
            await deleteDoc(doc(db, `users/${user.uid}/user_data`, id));
            toast.success('Customer deleted');
        } catch (error) {
            toast.error('Failed to delete customer');
        }
    };

    return (
        <div>
            {/* Farm Details Header */}
            {farmDetails && (
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{farmDetails.farmName}</h2>
                            <p className="text-gray-600">{farmDetails.city}, {farmDetails.country} | {farmDetails.contact}</p>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                <button
                    onClick={() => {
                        setEditingCustomer(null);
                        // Generate a unique 4-digit ID for new customer
                        const existingIds = customers.map(c => c.customerId);
                        setFormData({
                            customerId: generateUniqueId(existingIds),
                            name: '',
                            phone: '',
                            cowRate: '',
                            buffaloRate: '',
                        });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Add Customer
                </button>
            </div>

            {/* Quick Navigation Buttons */}
            <div className="mb-6 grid grid-cols-2 sm:grid-cols-5 gap-3">
                <Link href="/dashboard/cow-milk" className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-center text-sm font-medium hover:bg-blue-200 transition-colors">
                    Cow Milk Entry
                </Link>
                <Link href="/dashboard/buffalo-milk" className="px-3 py-2 bg-purple-100 text-purple-700 rounded-md text-center text-sm font-medium hover:bg-purple-200 transition-colors">
                    Buffalo Milk Entry
                </Link>
                <Link href="/dashboard/monthly-record" className="px-3 py-2 bg-green-100 text-green-700 rounded-md text-center text-sm font-medium hover:bg-green-200 transition-colors">
                    Monthly Report
                </Link>
                <Link href="/dashboard/daily-record" className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-md text-center text-sm font-medium hover:bg-yellow-200 transition-colors">
                    Daily Records
                </Link>
                <Link href="/dashboard/tools" className="px-3 py-2 bg-pink-100 text-pink-700 rounded-md text-center text-sm font-medium hover:bg-pink-200 transition-colors">
                    Tools
                </Link>
            </div>

            {/* Search Bar */}
            <div className="mb-4 max-w-md mx-auto">
                <input
                    type="text"
                    placeholder="Search by name or ID..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border rounded shadow focus:outline-none focus:ring-2 focus:ring-green-500"
                />
            </div>
            {loading ? (
                <div className="text-center py-10">Loading...</div>
            ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {customers
                            .filter(c =>
                                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                c.customerId.includes(searchTerm)
                            )
                            .map((customer) => (
                                <li key={customer.id} className="px-6 py-4 hover:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <a
                                            href={`/dashboard/users/${customer.customerId}`}
                                            className="flex-1 cursor-pointer"
                                        >
                                            <p className="text-sm font-medium text-green-600">ID: {customer.customerId}</p>
                                            <p className="text-lg font-semibold text-gray-900 hover:text-green-600">{customer.name}</p>
                                            <p className="text-sm text-gray-500">
                                                Cow: PKR {customer.cowRate || 0}/L | Buffalo: PKR {customer.buffaloRate || 0}/L | Phone: {customer.phone}
                                            </p>
                                        </a>
                                        <div className="flex space-x-3 ml-4">
                                            <button
                                                onClick={() => handleEdit(customer)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                            >
                                                <PencilIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(customer.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        {customers.length === 0 && (
                            <li className="px-6 py-10 text-center text-gray-500">No customers found. Add one to get started.</li>
                        )}
                    </ul>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">{editingCustomer ? 'Edit Customer' : 'Add Customer'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Customer ID</label>
                                <input
                                    type="text"
                                    value={formData.customerId}
                                    readOnly
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border bg-gray-100 cursor-not-allowed"
                                    required
                                    disabled
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Phone</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Cow Rate (PKR/L)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.cowRate}
                                        onChange={(e) => setFormData({ ...formData, cowRate: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Buffalo Rate (PKR/L)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.buffaloRate}
                                        onChange={(e) => setFormData({ ...formData, buffaloRate: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}