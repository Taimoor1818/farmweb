'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DocumentTextIcon, DocumentArrowDownIcon, CalendarIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline';

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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg">
                                <DocumentTextIcon className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                    Notes & Reminders
                                </h1>
                                <p className="text-slate-600 mt-1">Keep track of important information and tasks</p>
                            </div>
                        </div>
                        <button
                            onClick={exportPDF}
                            disabled={notesList.length === 0}
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
                                <p className="text-sm font-medium text-slate-600">Total Notes</p>
                                <p className="text-3xl font-bold text-slate-900 mt-1">{notesList.length}</p>
                            </div>
                            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                                <DocumentTextIcon className="h-6 w-6 text-white" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600">This Month</p>
                                <p className="text-3xl font-bold text-purple-600 mt-1">
                                    {notesList.filter(n => {
                                        const noteDate = new Date(n.date);
                                        const now = new Date();
                                        return noteDate.getMonth() === now.getMonth() && noteDate.getFullYear() === now.getFullYear();
                                    }).length}
                                </p>
                            </div>
                            <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl">
                                <CalendarIcon className="h-6 w-6 text-white" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Add Note Form */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6 mb-8">
                    <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
                        <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg mr-3">
                            <ChatBubbleBottomCenterTextIcon className="h-5 w-5 text-purple-600" />
                        </div>
                        Create New Note
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all duration-200 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Topic</label>
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="e.g., Vaccination Schedule"
                                    className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all duration-200 outline-none"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Write your note details here..."
                                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all duration-200 outline-none resize-none"
                                rows={4}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Remarks (Optional)</label>
                            <input
                                type="text"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="Additional comments or reminders"
                                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all duration-200 outline-none"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 font-medium"
                        >
                            Add Note
                        </button>
                    </form>
                </div>

                {/* Notes List */}
                <div className="space-y-4">
                    {notesList.map((note) => (
                        <div
                            key={note.id}
                            className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl border border-slate-200/50 hover:border-purple-300/50 transition-all duration-300 overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="flex items-start space-x-4">
                                    <div className="p-3 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl group-hover:from-purple-100 group-hover:to-pink-100 transition-all duration-300 flex-shrink-0">
                                        <ChatBubbleBottomCenterTextIcon className="h-6 w-6 text-slate-600 group-hover:text-purple-600 transition-colors duration-300" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="text-xl font-bold text-slate-900">{note.topic}</h3>
                                            <span className="flex items-center text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full flex-shrink-0 ml-4">
                                                <CalendarIcon className="h-4 w-4 mr-1" />
                                                {note.date}
                                            </span>
                                        </div>
                                        <div className="bg-gradient-to-br from-slate-50 to-purple-50/30 rounded-xl p-4 mb-3 border border-slate-200/50">
                                            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{note.description}</p>
                                        </div>
                                        {note.remarks && (
                                            <div className="flex items-start space-x-2 bg-purple-50 rounded-lg p-3 border border-purple-200/50">
                                                <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide flex-shrink-0">Remarks:</span>
                                                <p className="text-sm text-purple-900 italic">{note.remarks}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {notesList.length === 0 && !loading && (
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-12 text-center">
                            <div className="flex flex-col items-center">
                                <div className="p-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full mb-4">
                                    <DocumentTextIcon className="h-12 w-12 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Notes Yet</h3>
                                <p className="text-slate-600">Start documenting important information by creating your first note above</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
