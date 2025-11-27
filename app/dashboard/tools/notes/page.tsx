'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Note {
    id: string;
    topic: string;
    description: string;
    remarks: string;
    date: string;
    createdAt: any;
}

export default function NotesPage() {
    const { user } = useAuthStore();
    const [notesList, setNotesList] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);

    // Form
    const [topic, setTopic] = useState('');
    const [description, setDescription] = useState('');
    const [remarks, setRemarks] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, `users/${user.uid}/notes`), orderBy('date', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: Note[] = [];
            snapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() } as Note);
            });
            setNotesList(list);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            await addDoc(collection(db, `users/${user.uid}/notes`), {
                topic,
                description,
                remarks,
                date,
                createdAt: new Date(),
            });
            toast.success('Note added');
            setTopic('');
            setDescription('');
            setRemarks('');
        } catch (error) {
            toast.error('Failed to add note');
        }
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Notes Report", 105, 15, { align: "center" });

        const headers = [["Date", "Topic", "Description", "Remarks"]];
        const rows = notesList.map(note => [
            note.date,
            note.topic,
            note.description,
            note.remarks
        ]);

        autoTable(doc, {
            head: headers,
            body: rows,
            startY: 25,
            theme: 'grid',
            columnStyles: {
                2: { cellWidth: 60 }, // Description width
                3: { cellWidth: 40 }  // Remarks width
            }
        });

        doc.save('notes_report.pdf');
        toast.success('PDF downloaded');
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
                <button
                    onClick={exportPDF}
                    disabled={notesList.length === 0}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                >
                    Export PDF
                </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow mb-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <label className="block text-sm font-medium text-gray-700">Topic</label>
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                            rows={3}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Remarks</label>
                        <input
                            type="text"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                    >
                        Add Note
                    </button>
                </form>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {notesList.map((note) => (
                        <li key={note.id} className="px-6 py-4 hover:bg-gray-50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-lg font-semibold text-gray-900">{note.topic}</p>
                                    <p className="text-sm text-gray-500 mb-2">{note.date}</p>
                                    <p className="text-gray-700 whitespace-pre-wrap">{note.description}</p>
                                    {note.remarks && <p className="text-sm text-gray-500 mt-2 italic">Remarks: {note.remarks}</p>}
                                </div>
                            </div>
                        </li>
                    ))}
                    {notesList.length === 0 && !loading && (
                        <li className="px-6 py-10 text-center text-gray-500">No notes found.</li>
                    )}
                </ul>
            </div>
        </div>
    );
}
