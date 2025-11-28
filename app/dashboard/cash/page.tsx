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
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="rounded-2xl bg-gradient-to-r from-green-500 to-emerald-700 p-8 text-white shadow-xl">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-bold capitalize tracking-tight">Cash Entry</h1>
                        <p className="text-green-50 mt-2 text-lg opacity-90">Manage daily cash transactions efficiently</p>
                    </div>
                </div>
            </div>

            {/* Entry Form */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="block w-full rounded-xl border-gray-200 bg-gray-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border transition-all"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="block w-full rounded-xl border-gray-200 bg-gray-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border transition-all"
                            >
                                <option value="Credit">Credit (In)</option>
                                <option value="Debit">Debit (Out)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="block w-full rounded-xl border-gray-200 bg-gray-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border transition-all"
                            placeholder="Enter transaction description"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (PKR)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="block w-full rounded-xl border-gray-200 bg-gray-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border transition-all"
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full flex justify-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-base font-semibold text-white ${type === 'Credit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-all transform hover:scale-105 active:scale-95`}
                        >
                            {loading ? 'Adding Entry...' : 'Add Cash Entry'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
