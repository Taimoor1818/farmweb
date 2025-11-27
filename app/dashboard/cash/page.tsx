'use client';

import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

export default function CashPage() {
    const { user } = useAuthStore();
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState('Credit'); // Credit (In) or Debit (Out)
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            await addDoc(collection(db, `users/${user.uid}/cash_entries`), {
                date,
                description,
                amount: parseFloat(amount),
                type,
                createdAt: new Date(),
            });
            toast.success('Cash entry added successfully');
            setDescription('');
            setAmount('');
        } catch (error) {
            console.error(error);
            toast.error('Failed to add cash entry');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Cash Entry</h1>
            <div className="bg-white p-6 rounded-lg shadow">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Type</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                        >
                            <option value="Credit">Credit (In)</option>
                            <option value="Debit">Debit (Out)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Amount (PKR)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${type === 'Credit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50`}
                    >
                        {loading ? 'Adding Entry...' : 'Add Entry'}
                    </button>
                </form>
            </div>
        </div>
    );
}
