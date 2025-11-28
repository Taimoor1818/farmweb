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
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-blue-700 p-8 text-white shadow-xl">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-bold capitalize tracking-tight">Expense Entry</h1>
                        <p className="text-blue-50 mt-2 text-lg opacity-90">Manage daily farm expenses efficiently</p>
                    </div>
                </div>
            </div>

            {/* Entry Form */}
            <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100">
                <form onSubmit={handleSubmit} className="space-y-4 max-w-xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="block w-full rounded-lg border-gray-200 bg-gray-50 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border transition-all text-sm"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="block w-full rounded-lg border-gray-200 bg-gray-50 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border transition-all text-sm"
                            >
                                <option value="Feed">Feed</option>
                                <option value="Medical">Medical</option>
                                <option value="Maintenance">Maintenance</option>
                                <option value="Salary">Salary</option>
                                <option value="Misc">Misc</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Item Name</label>
                        <input
                            type="text"
                            value={item}
                            onChange={(e) => setItem(e.target.value)}
                            className="block w-full rounded-lg border-gray-200 bg-gray-50 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border transition-all text-sm"
                            placeholder="Enter item name"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Amount (PKR)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="block w-full rounded-lg border-gray-200 bg-gray-50 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border transition-all text-sm"
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="block w-full rounded-lg border-gray-200 bg-gray-50 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border transition-all text-sm"
                            rows={2}
                            placeholder="Additional notes (optional)"
                        />
                    </div>

                    <div className="pt-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-2 px-3 border border-transparent rounded-lg shadow-sm text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-50 transition-all"
                        >
                            {loading ? 'Adding Expense...' : 'Add Expense'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
