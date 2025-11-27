'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';
import { PlusIcon, DocumentTextIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface PO {
    id: string;
    poNumber: string;
    vendor: string;
    totalAmount: number;
    status: 'Pending' | 'Received';
    createdAt: any;
}

export default function PurchasingPage() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [pos, setPos] = useState<PO[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, `users/${user.uid}/purchaseOrders`), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: PO[] = [];
            snapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() } as PO);
            });
            setPos(list);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    const handleEdit = (poId: string) => {
        // Ask for passkey before allowing edit
        const passkey = prompt('Enter passkey to edit PO:');
        if (passkey !== '0000') {
            toast.error('Incorrect passkey');
            return;
        }
        
        // Navigate to edit page (we'll use the same page as view for now, but with edit mode)
        router.push(`/dashboard/tools/purchasing/${poId}`);
    };

    const handleDelete = async (poId: string, poNumber: string) => {
        // Ask for passkey before allowing delete
        const passkey = prompt('Enter passkey to delete PO:');
        if (passkey !== '0000') {
            toast.error('Incorrect passkey');
            return;
        }
    
        if (!user || !confirm('Are you sure you want to delete this PO?')) return;

        try {
            // Delete only from the auto-generated ID location
            await deleteDoc(doc(db, `users/${user.uid}/purchaseOrders`, poId));
        
            toast.success('PO deleted successfully');
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete PO');
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Purchasing (PO)</h1>
                <Link
                    href="/dashboard/tools/purchasing/new"
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    New PO
                </Link>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {pos.map((po) => (
                        <li key={po.id} className="hover:bg-gray-50">
                            <div className="block px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <DocumentTextIcon className="h-6 w-6 text-gray-400 mr-3" />
                                        <div>
                                            <p className="text-sm font-medium text-green-600">PO #{po.poNumber}</p>
                                            <Link href={`/dashboard/tools/purchasing/${po.id}`} className="text-lg font-semibold text-gray-900 hover:text-green-600">
                                                {po.vendor}
                                            </Link>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <div className="mr-6 text-right">
                                            <p className="text-sm font-medium text-gray-900">PKR {po.totalAmount}</p>
                                            <p className="text-sm text-gray-500">
                                                {po.createdAt?.seconds ? format(new Date(po.createdAt.seconds * 1000), 'PP') : ''}
                                            </p>
                                        </div>
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${po.status === 'Received' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {po.status}
                                        </span>
                                        <div className="ml-4 flex space-x-2">
                                            <button
                                                onClick={() => handleEdit(po.id)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                            >
                                                <PencilIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(po.id, po.poNumber)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                    {pos.length === 0 && !loading && (
                        <li className="px-6 py-10 text-center text-gray-500">No Purchase Orders found.</li>
                    )}
                </ul>
            </div>
        </div>
    );
}