'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CubeIcon, DocumentArrowDownIcon, CalendarIcon, ScaleIcon } from '@heroicons/react/24/outline';

interface ConsumptionItem {
    id: string;
    name: string;
    qty: number;
    unit: string;
    notes: string;
    date: string;
    createdAt: any;
}

export default function ConsumptionPage() {
    const { user } = useAuthStore();
    const [items, setItems] = useState<ConsumptionItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Form
    const [name, setName] = useState('');
    const [qty, setQty] = useState('');
    const [unit, setUnit] = useState('kg');
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, `users/${user.uid}/consumption`), orderBy('date', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: ConsumptionItem[] = [];
            snapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() } as ConsumptionItem);
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
            await addDoc(collection(db, `users/${user.uid}/consumption`), {
                name,
                qty: parseFloat(qty),
                unit,
                notes,
                date,
                createdAt: new Date(),
            });
            toast.success('Consumption logged');
            setName('');
            setQty('');
            setNotes('');
        } catch (error) {
            toast.error('Failed to log consumption');
        }
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Consumption Report", 105, 15, { align: "center" });

        const headers = [["Date", "Item", "Qty", "Unit", "Notes"]];
        const rows = items.map(item => [
            item.date,
            item.name,
            item.qty,
            item.unit,
            item.notes
        ]);

        autoTable(doc, {
            head: headers,
            body: rows,
            startY: 25,
            theme: 'grid',
        });

        doc.save('consumption_report.pdf');
        toast.success('PDF downloaded');
    };

    const totalItems = items.length;
    const recentItems = items.slice(0, 5).length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                                <CubeIcon className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    Consumption Log
                                </h1>
                                <p className="text-slate-600 mt-1">Track inventory usage and consumption</p>
                            </div>
                        </div>
                        <button
                            onClick={exportPDF}
                            disabled={items.length === 0}
                            className="group flex items-center px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            <DocumentArrowDownIcon className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                            Export PDF
                        </button>
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600">Total Items Logged</p>
                                <p className="text-3xl font-bold text-slate-900 mt-1">{totalItems}</p>
                            </div>
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                                <CubeIcon className="h-6 w-6 text-white" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600">Recent Activity</p>
                                <p className="text-3xl font-bold text-indigo-600 mt-1">{recentItems}</p>
                                <p className="text-xs text-slate-500 mt-1">Last 5 entries</p>
                            </div>
                            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                                <CalendarIcon className="h-6 w-6 text-white" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Add Consumption Form */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6 mb-8">
                    <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
                        <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg mr-3">
                            <CubeIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        Log New Consumption
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Item Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Feed, Medicine"
                                    className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Quantity</label>
                                <input
                                    type="number"
                                    value={qty}
                                    onChange={(e) => setQty(e.target.value)}
                                    placeholder="0"
                                    step="0.01"
                                    className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Unit</label>
                                <input
                                    type="text"
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value)}
                                    placeholder="kg, ltr, pcs"
                                    className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 outline-none"
                                    required
                                />
                            </div>
                            <div className="flex items-end">
                                <button
                                    type="submit"
                                    className="w-full px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 font-medium"
                                >
                                    Add Entry
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Notes (Optional)</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Additional details or remarks..."
                                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 outline-none resize-none"
                                rows={2}
                            />
                        </div>
                    </form>
                </div>

                {/* Consumption Items List */}
                <div className="space-y-4">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl border border-slate-200/50 hover:border-blue-300/50 transition-all duration-300 overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-4 flex-1">
                                        <div className="p-3 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl group-hover:from-blue-100 group-hover:to-indigo-100 transition-all duration-300">
                                            <ScaleIcon className="h-6 w-6 text-slate-600 group-hover:text-blue-600 transition-colors duration-300" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-slate-900 mb-2">{item.name}</h3>
                                            <div className="flex items-center space-x-4 text-sm">
                                                <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-full">
                                                    {item.qty} {item.unit}
                                                </span>
                                                <span className="flex items-center text-slate-600">
                                                    <CalendarIcon className="h-4 w-4 mr-1" />
                                                    {item.date}
                                                </span>
                                            </div>
                                            {item.notes && (
                                                <p className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-200">
                                                    <span className="font-medium text-slate-700">Note:</span> {item.notes}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {items.length === 0 && !loading && (
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-12 text-center">
                            <div className="flex flex-col items-center">
                                <div className="p-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full mb-4">
                                    <CubeIcon className="h-12 w-12 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Consumption Logs Yet</h3>
                                <p className="text-slate-600">Start tracking your inventory usage by adding your first entry above</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
