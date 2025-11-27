'use client';

import { useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { toast } from 'react-hot-toast';
import { PlusIcon, TrashIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import BarcodeScanner from '@/components/features/BarcodeScanner';

interface StoreItem {
    barcode: string;
    item: string;
    price: number;
}

export default function StorePage() {
    const { user } = useAuthStore();
    const [items, setItems] = useState<StoreItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        barcode: '',
        item: '',
        price: '',
    });

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, `users/${user.uid}/store_record`));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: StoreItem[] = [];
            snapshot.forEach((doc) => {
                list.push({ barcode: doc.id, ...doc.data() } as StoreItem);
            });
            setItems(list);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            await setDoc(doc(db, `users/${user.uid}/store_record`, formData.barcode), {
                item: formData.item,
                price: parseFloat(formData.price),
            });
            toast.success('Item saved successfully');
            setFormData({ barcode: '', item: '', price: '' });
        } catch (error) {
            console.error(error);
            toast.error('Failed to save item');
        }
    };

    const handleDelete = async (barcode: string) => {
        if (!user || !confirm('Delete this item?')) return;
        try {
            await deleteDoc(doc(db, `users/${user.uid}/store_record`, barcode));
            toast.success('Item deleted');
        } catch (error) {
            toast.error('Failed to delete item');
        }
    };

    const handleScan = (result: string) => {
        setFormData(prev => ({ ...prev, barcode: result }));
        setIsScanning(false);
        toast.success('Barcode scanned: ' + result);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Store Record</h1>

            <div className="bg-white p-6 rounded-lg shadow mb-8">
                <h2 className="text-lg font-medium mb-4">Add / Edit Item</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700">Barcode</label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                            <input
                                type="text"
                                value={formData.barcode}
                                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                className="flex-1 block w-full rounded-none rounded-l-md border-gray-300 focus:border-green-500 focus:ring-green-500 p-2 border"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setIsScanning(true)}
                                className="-ml-px relative inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                            >
                                <QrCodeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Item Name</label>
                        <input
                            type="text"
                            value={formData.item}
                            onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Price</label>
                        <input
                            type="number"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                        Save Item
                    </button>
                </form>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {items.map((item) => (
                        <li key={item.barcode} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                            <div>
                                <p className="text-sm font-medium text-green-600">Barcode: {item.barcode}</p>
                                <p className="text-lg font-semibold text-gray-900">{item.item}</p>
                                <p className="text-sm text-gray-500">Price: PKR {item.price}</p>
                            </div>
                            <button
                                onClick={() => handleDelete(item.barcode)}
                                className="text-red-600 hover:text-red-900"
                            >
                                <TrashIcon className="h-5 w-5" />
                            </button>
                        </li>
                    ))}
                    {items.length === 0 && !loading && (
                        <li className="px-6 py-10 text-center text-gray-500">No items in store.</li>
                    )}
                </ul>
            </div>

            {isScanning && (
                <BarcodeScanner
                    onScan={handleScan}
                    onClose={() => setIsScanning(false)}
                />
            )}
        </div>
    );
}
