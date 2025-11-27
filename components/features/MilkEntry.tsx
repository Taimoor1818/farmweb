'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import ToggleSwitch from '@/components/ui/ToggleSwitch';

interface Customer {
    id: string;
    customerId: string;
    name: string;
}

interface MilkEntryProps {
    type: 'cow' | 'buffalo';
}

export default function MilkEntry({ type }: MilkEntryProps) {
    const { user } = useAuthStore();
    const [viewMode, setViewMode] = useState<'Farm' | 'Users'>('Farm');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [shift, setShift] = useState<'morning' | 'evening'>('morning');
    const [quantities, setQuantities] = useState<Record<string, string>>({});
    const [farmTotal, setFarmTotal] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Fetch customers
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, `users/${user.uid}/user_data`));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: Customer[] = [];
            snapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() } as Customer);
            });
            list.sort((a, b) => parseInt(a.customerId) - parseInt(b.customerId));
            setCustomers(list);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    // Fetch existing data for date/shift
    useEffect(() => {
        if (!user || loading) return;

        const fetchData = async () => {
            try {
                if (viewMode === 'Users') {
                    const docRef = doc(db, `users/${user.uid}/daily_records`, date);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        const fieldName = `${type}_${shift}`;
                        const record = data[fieldName] || {};
                        setQuantities(record);
                    } else {
                        setQuantities({});
                    }
                } else {
                    // Farm mode
                    const docRef = doc(db, `users/${user.uid}/farm_production`, date);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        const fieldName = `${type}_${shift}_total`;
                        setFarmTotal(data[fieldName]?.toString() || '');
                    } else {
                        setFarmTotal('');
                    }
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };

        fetchData();
    }, [user, date, shift, type, loading, viewMode]);

    const handleQuantityChange = (customerId: string, value: string) => {
        setQuantities(prev => ({ ...prev, [customerId]: value }));
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);

        try {
            if (viewMode === 'Users') {
                const docRef = doc(db, `users/${user.uid}/daily_records`, date);
                const fieldName = `${type}_${shift}`;
                await setDoc(docRef, {
                    [fieldName]: quantities
                }, { merge: true });
            } else {
                // Farm mode
                const docRef = doc(db, `users/${user.uid}/farm_production`, date);
                const fieldName = `${type}_${shift}_total`;
                await setDoc(docRef, {
                    [fieldName]: parseFloat(farmTotal) || 0
                }, { merge: true });
            }

            toast.success('Saved successfully');
        } catch (error) {
            console.error(error);
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const nextInput = document.getElementById(`input-${index + 1}`);
            if (nextInput) {
                nextInput.focus();
            }
        }
    };

    const themeColor = type === 'cow' ? 'from-green-500 to-emerald-700' : 'from-slate-700 to-slate-900';
    const buttonColor = type === 'cow' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-800 hover:bg-slate-900';

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Header Section */}
            <div className={`rounded-2xl bg-gradient-to-r ${themeColor} p-8 text-white shadow-xl`}>
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-bold capitalize tracking-tight">{type} Milk Production</h1>
                        <p className="text-green-50 mt-2 text-lg opacity-90">Manage daily milk records efficiently</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-full">
                        <ToggleSwitch
                            options={['Farm', 'Users']}
                            selected={viewMode}
                            onChange={(value) => setViewMode(value as 'Farm' | 'Users')}
                        />
                    </div>
                </div>
            </div>

            {/* Controls Section */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 flex flex-wrap gap-6 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Select Date</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="block w-full rounded-xl border-gray-200 bg-gray-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border transition-all"
                    />
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Select Shift</label>
                    <select
                        value={shift}
                        onChange={(e) => setShift(e.target.value as 'morning' | 'evening')}
                        className="block w-full rounded-xl border-gray-200 bg-gray-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border transition-all"
                    >
                        <option value="morning">Morning Shift</option>
                        <option value="evening">Evening Shift</option>
                    </select>
                </div>
                <div className="flex-none">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`px-8 py-3.5 ${buttonColor} text-white font-semibold rounded-xl shadow-lg shadow-green-200 disabled:opacity-50 transition-all transform hover:scale-105 active:scale-95`}
                    >
                        {saving ? 'Saving...' : 'Save Records'}
                    </button>
                </div>
            </div>

            {/* Content Section */}
            {viewMode === 'Farm' ? (
                <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-600"></div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-8">Total Farm Production</h2>

                    <div className="max-w-md mx-auto relative">
                        <label className="block text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">
                            {type} Milk ({shift})
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.1"
                                value={farmTotal}
                                onChange={(e) => setFarmTotal(e.target.value)}
                                className="block w-full text-center text-5xl font-bold text-gray-900 bg-transparent border-b-2 border-gray-200 focus:border-emerald-500 focus:ring-0 p-4 transition-colors placeholder-gray-200"
                                placeholder="0.0"
                            />
                            <span className="absolute right-4 bottom-6 text-xl text-gray-400 font-medium">Liters</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="grid grid-cols-3 gap-4 px-8 py-4 bg-gray-50/50 border-b border-gray-100 font-semibold text-gray-500 text-sm uppercase tracking-wider">
                        <div>Customer ID</div>
                        <div>Name</div>
                        <div>Quantity (Liters)</div>
                    </div>
                    <ul className="divide-y divide-gray-100">
                        {customers.map((customer, index) => (
                            <li key={customer.id} className="px-8 py-5 grid grid-cols-3 gap-6 items-center hover:bg-green-50/30 transition-colors group">
                                <div className="text-lg font-bold text-gray-700 group-hover:text-emerald-700">#{customer.customerId}</div>
                                <div className="text-base font-medium text-gray-900">{customer.name}</div>
                                <div>
                                    <input
                                        id={`input-${index}`}
                                        type="number"
                                        step="0.1"
                                        value={quantities[customer.customerId] || ''}
                                        onChange={(e) => handleQuantityChange(customer.customerId, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, index)}
                                        className="block w-full rounded-lg border-gray-200 bg-gray-50 focus:bg-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2.5 border transition-all font-medium text-gray-900"
                                        placeholder="0.0"
                                    />
                                </div>
                            </li>
                        ))}
                        {customers.length === 0 && !loading && (
                            <li className="px-6 py-16 text-center">
                                <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">👥</span>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">No Customers Found</h3>
                                <p className="text-gray-500 mt-2 mb-6">Get started by adding customers to your system.</p>
                                <a
                                    href="/dashboard/users"
                                    className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                                >
                                    Manage Users
                                </a>
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
