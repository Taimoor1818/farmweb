'use client';

import { useState } from 'react';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import PasskeyModal from '@/components/ui/PasskeyModal';

interface POItem {
    id: number;
    name: string;
    qty: number;
    unit: string;
    price: number;
}

export default function NewPOPage() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [vendor, setVendor] = useState('');
    const [items, setItems] = useState<POItem[]>([{ id: 1, name: '', qty: 1, unit: 'kg', price: 0 }]);
    const [loading, setLoading] = useState(false);

    // Passkey Modal state
    const [isPasskeyModalOpen, setIsPasskeyModalOpen] = useState(false);

    const addItem = () => {
        setItems([...items, { id: Date.now(), name: '', qty: 1, unit: 'kg', price: 0 }]);
    };

    const removeItem = (id: number) => {
        setItems(items.filter(i => i.id !== id));
    };

    const updateItem = (id: number, field: keyof POItem, value: any) => {
        setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.qty * item.price), 0);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsPasskeyModalOpen(true);
    };

    const handlePasskeySuccess = async () => {
        if (!user) return;

        setLoading(true);

        try {
            const poNumber = `PO-${Date.now().toString().slice(-6)}`;
            const poData = {
                poNumber,
                vendor,
                items,
                totalAmount: calculateTotal(),
                status: 'Pending',
                createdAt: new Date(),
            };

            // Create doc with auto ID - this is the primary storage method
            const docRef = await addDoc(collection(db, `users/${user.uid}/purchaseOrders`), poData);

            toast.success(`PO #${poNumber} created`);
            router.push('/dashboard/tools/purchasing');
        } catch (error) {
            console.error(error);
            toast.error('Failed to create PO');
        } finally {
            setLoading(false);
            setIsPasskeyModalOpen(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New PO</h1>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Vendor Name</label>
                    <input
                        type="text"
                        value={vendor}
                        onChange={(e) => setVendor(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
                    <div className="space-y-2">
                        {items.map((item, index) => (
                            <div key={item.id} className="flex gap-2 items-center">
                                <span className="text-gray-500 w-6">{index + 1}.</span>
                                <input
                                    type="text"
                                    placeholder="Item Name"
                                    value={item.name}
                                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                    className="flex-grow rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                                    required
                                />
                                <input
                                    type="number"
                                    placeholder="Qty"
                                    value={item.qty}
                                    onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value))}
                                    className="w-20 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="Unit"
                                    value={item.unit}
                                    onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                                    className="w-20 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                                    required
                                />
                                <input
                                    type="number"
                                    placeholder="Price"
                                    value={item.price}
                                    onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value))}
                                    className="w-24 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => removeItem(item.id)}
                                    className="text-red-600 hover:text-red-800"
                                    disabled={items.length === 1}
                                >
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={addItem}
                        className="mt-2 flex items-center text-sm text-green-600 hover:text-green-700"
                    >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Add Item
                    </button>
                </div>

                <div className="border-t pt-4 flex justify-between items-center">
                    <div className="text-lg font-bold">Total: PKR {calculateTotal()}</div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Create PO'}
                    </button>
                </div>
            </form>

            <PasskeyModal
                isOpen={isPasskeyModalOpen}
                onClose={() => setIsPasskeyModalOpen(false)}
                onSuccess={handlePasskeySuccess}
                title="Confirm Creation"
                description="Please enter your MPIN to create this Purchase Order."
            />
        </div>
    );
}