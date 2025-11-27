'use client';

import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

export default function ExpensePage() {
    const { user } = useAuthStore();
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [item, setItem] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Feed');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            await addDoc(collection(db, `users/${user.uid}/expenses`), {
                date,
                item,
                amount: parseFloat(amount),
                category,
                notes,
                createdAt: new Date(),
            });
            toast.success('Expense added successfully');
            setItem('');
            setAmount('');
            setNotes('');
        } catch (error) {
            console.error(error);
            toast.error('Failed to add expense');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Expense Entry</h1>
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
                        <label className="block text-sm font-medium text-gray-700">Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                        >
                            <option value="Feed">Feed</option>
                            <option value="Medical">Medical</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Salary">Salary</option>
                            <option value="Misc">Misc</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Item Name</label>
                        <input
                            type="text"
                            value={item}
                            onChange={(e) => setItem(e.target.value)}
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
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                            rows={3}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                        {loading ? 'Adding Expense...' : 'Add Expense'}
                    </button>
                </form>
            </div>
        </div>
    );
}
