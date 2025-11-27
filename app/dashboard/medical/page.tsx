'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import {
    PlusIcon,
    MagnifyingGlassIcon,
    TrashIcon,
    PencilIcon,
    BeakerIcon
} from '@heroicons/react/24/outline';
import PasskeyModal from '@/components/ui/PasskeyModal';

interface MedicalRecord {
    id: string;
    animalId: string; // e.g., "1001"
    animalType: string; // e.g., "Cow"
    diagnosis: string;
    treatment: string;
    cost: number;
    date: string;
    notes?: string;
    createdAt: Timestamp;
}

interface Animal {
    id: string;
    animalId: string;
    type: string;
}

export default function MedicalPage() {
    const { user } = useAuthStore();
    const [records, setRecords] = useState<MedicalRecord[]>([]);
    const [animals, setAnimals] = useState<Animal[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [selectedAnimalId, setSelectedAnimalId] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    const [treatment, setTreatment] = useState('');
    const [cost, setCost] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');

    // Security & Actions State
    const [showPasskeyModal, setShowPasskeyModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
    const [actionType, setActionType] = useState<'delete' | 'edit' | null>(null);

    // Fetch Animals for Dropdown
    useEffect(() => {
        if (!user) return;
        const fetchAnimals = async () => {
            const q = query(collection(db, `users/${user.uid}/animals`), orderBy('animalId', 'asc'));
            const snapshot = await getDocs(q);
            const list: Animal[] = [];
            snapshot.forEach(doc => {
                list.push({ id: doc.id, ...doc.data() } as Animal);
            });
            setAnimals(list);
        };
        fetchAnimals();
    }, [user]);

    // Fetch Medical Records
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, `users/${user.uid}/medical_records`), orderBy('date', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: MedicalRecord[] = [];
            snapshot.forEach(doc => {
                list.push({ id: doc.id, ...doc.data() } as MedicalRecord);
            });
            setRecords(list);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    const handleAddRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !selectedAnimalId) return;
        setIsSubmitting(true);

        try {
            const animal = animals.find(a => a.animalId === selectedAnimalId);
            if (!animal) throw new Error('Animal not found');

            const newRecord = {
                animalId: animal.animalId,
                animalType: animal.type,
                diagnosis,
                treatment,
                cost: parseFloat(cost) || 0,
                date,
                notes,
                createdAt: Timestamp.now()
            };

            await addDoc(collection(db, `users/${user.uid}/medical_records`), newRecord);
            toast.success('Medical record added');

            // Reset form
            setDiagnosis('');
            setTreatment('');
            setCost('');
            setNotes('');
        } catch (error) {
            console.error('Error adding record:', error);
            toast.error('Failed to add record');
        } finally {
            setIsSubmitting(false);
        }
    };

    const initiateDelete = (record: MedicalRecord) => {
        setSelectedRecord(record);
        setActionType('delete');
        setShowPasskeyModal(true);
    };

    const onPasskeySuccess = async () => {
        if (!user || !selectedRecord || !actionType) return;

        try {
            if (actionType === 'delete') {
                await deleteDoc(doc(db, `users/${user.uid}/medical_records`, selectedRecord.id));
                toast.success('Record deleted successfully');
            } else if (actionType === 'edit') {
                toast.success('Edit access granted (Feature in progress)');
            }
        } catch (error) {
            console.error('Error performing action:', error);
            toast.error('Action failed');
        } finally {
            setShowPasskeyModal(false);
            setSelectedRecord(null);
            setActionType(null);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Medical Records</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Add Record Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <PlusIcon className="h-5 w-5 mr-2 text-green-600" />
                            New Medical Entry
                        </h2>

                        <form onSubmit={handleAddRecord} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Select Animal
                                </label>
                                <select
                                    value={selectedAnimalId}
                                    onChange={(e) => setSelectedAnimalId(e.target.value)}
                                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2.5 border"
                                    required
                                >
                                    <option value="">-- Select Animal --</option>
                                    {animals.map(animal => (
                                        <option key={animal.id} value={animal.animalId}>
                                            #{animal.animalId} - {animal.type}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Diagnosis / Issue
                                </label>
                                <input
                                    type="text"
                                    value={diagnosis}
                                    onChange={(e) => setDiagnosis(e.target.value)}
                                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2.5 border"
                                    placeholder="e.g. Fever, Injury"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Treatment / Medicine
                                </label>
                                <input
                                    type="text"
                                    value={treatment}
                                    onChange={(e) => setTreatment(e.target.value)}
                                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2.5 border"
                                    placeholder="e.g. Antibiotics"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Cost
                                    </label>
                                    <input
                                        type="number"
                                        value={cost}
                                        onChange={(e) => setCost(e.target.value)}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2.5 border"
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date
                                    </label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2.5 border"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes (Optional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2.5 border"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
                            >
                                {isSubmitting ? 'Saving...' : 'Save Record'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Records List */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                                Recent Medical History
                            </h3>
                        </div>

                        {loading ? (
                            <div className="p-8 text-center text-gray-500">Loading records...</div>
                        ) : records.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="mx-auto h-12 w-12 text-gray-400 mb-3">
                                    <BeakerIcon />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">No medical records</h3>
                                <p className="text-gray-500 mt-1">Select an animal to add a medical entry.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Animal
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Diagnosis
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Treatment
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {records.map((record) => (
                                            <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-bold text-gray-900">#{record.animalId}</div>
                                                    <div className="text-xs text-gray-500">{record.animalType}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900">{record.diagnosis}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900">{record.treatment}</div>
                                                    <div className="text-xs text-gray-500">Cost: {record.cost}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-500">
                                                        {format(new Date(record.date), 'MMM d, yyyy')}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end space-x-2">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedRecord(record);
                                                                setActionType('edit');
                                                                setShowPasskeyModal(true);
                                                            }}
                                                            className="text-indigo-600 hover:text-indigo-900 p-1 hover:bg-indigo-50 rounded"
                                                        >
                                                            <PencilIcon className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => initiateDelete(record)}
                                                            className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                                                        >
                                                            <TrashIcon className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <PasskeyModal
                isOpen={showPasskeyModal}
                onClose={() => setShowPasskeyModal(false)}
                onSuccess={onPasskeySuccess}
                title={actionType === 'delete' ? 'Confirm Deletion' : 'Security Check'}
                description={actionType === 'delete'
                    ? 'Enter passkey to delete this record. This action cannot be undone.'
                    : 'Enter passkey to edit this record.'}
            />
        </div>
    );
}
