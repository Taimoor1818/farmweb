'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Consumption Log</h1>
                <button
                    onClick={exportPDF}
                    disabled={items.length === 0}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                >
                    Export PDF
                </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow mb-6">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
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
                        <label className="block text-sm font-medium text-gray-700">Item Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Qty</label>
                        <input
                            type="number"
                            value={qty}
                            onChange={(e) => setQty(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Unit</label>
                        <input
                            type="text"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                    >
                        Add
                    </button>
                </form>
                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                        rows={2}
                    />
                </div>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {items.map((item) => (
                        <li key={item.id} className="px-6 py-4 hover:bg-gray-50">
                            <div className="flex justify-between">
                                <div>
                                    <p className="text-lg font-semibold text-gray-900">{item.name}</p>
                                    <p className="text-sm text-gray-500">
                                        {item.qty} {item.unit} | {item.date}
                                    </p>
                                    {item.notes && <p className="text-sm text-gray-600 mt-1">Note: {item.notes}</p>}
                                </div>
                            </div>
                        </li>
                    ))}
                    {items.length === 0 && !loading && (
                        <li className="px-6 py-10 text-center text-gray-500">No consumption logs found.</li>
                    )}
                </ul>
            </div>
        </div>
    );
}
