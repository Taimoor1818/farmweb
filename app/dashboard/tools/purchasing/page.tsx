'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';
import { PlusIcon, DocumentTextIcon, PencilIcon, TrashIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import PasskeyModal from '@/components/ui/PasskeyModal';

interface PO {
    id: string;
    poNumber: string;
    vendor: string;
    totalAmount: number;
    status: 'Pending' | 'Received';
    createdAt: any;
}

export default function PurchasingPage() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [pos, setPos] = useState<PO[]>([]);
    const [loading, setLoading] = useState(true);

    // Passkey Modal state
    const [isPasskeyModalOpen, setIsPasskeyModalOpen] = useState(false);
    const [passkeyAction, setPasskeyAction] = useState<'edit' | 'delete' | null>(null);
    const [passkeyContext, setPasskeyContext] = useState<any>(null);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, `users/${user.uid}/purchaseOrders`), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: PO[] = [];
            snapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() } as PO);
            });
            setPos(list);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    const handleEdit = (poId: string) => {
        setPasskeyAction('edit');
        setPasskeyContext(poId);
        setIsPasskeyModalOpen(true);
    };

    const handleDelete = (poId: string, poNumber: string) => {
        setPasskeyAction('delete');
        setPasskeyContext({ id: poId, poNumber });
        setIsPasskeyModalOpen(true);
    };

    const handlePasskeySuccess = async () => {
        if (!user || !passkeyContext) return;

        if (passkeyAction === 'edit') {
            const poId = passkeyContext as string;
            router.push(`/dashboard/tools/purchasing/${poId}`);
        } else if (passkeyAction === 'delete') {
            const { id } = passkeyContext;
            if (!confirm('Are you sure you want to delete this PO?')) return;

            try {
                await deleteDoc(doc(db, `users/${user.uid}/purchaseOrders`, id));
                toast.success('PO deleted successfully');
            } catch (error) {
                console.error(error);
                toast.error('Failed to delete PO');
            }
        }

        setIsPasskeyModalOpen(false);
        setPasskeyAction(null);
        setPasskeyContext(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
                                <ShoppingCartIcon className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                                    Purchase Orders
                                </h1>
                                <p className="text-slate-600 mt-1">Manage your procurement and vendor orders</p>
                            </div>
                        </div>
                        <Link
                            href="/dashboard/tools/purchasing/new"
                            className="group flex items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                        >
                            <PlusIcon className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-200" />
                            New Purchase Order
                        </Link>
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600">Total Orders</p>
                                <p className="text-3xl font-bold text-slate-900 mt-1">{pos.length}</p>
                            </div>
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                                <DocumentTextIcon className="h-6 w-6 text-white" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600">Pending</p>
                                <p className="text-3xl font-bold text-amber-600 mt-1">
                                    {pos.filter(p => p.status === 'Pending').length}
                                </p>
                            </div>
                            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                                <DocumentTextIcon className="h-6 w-6 text-white" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600">Received</p>
                                <p className="text-3xl font-bold text-emerald-600 mt-1">
                                    {pos.filter(p => p.status === 'Received').length}
                                </p>
                            </div>
                            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                                <DocumentTextIcon className="h-6 w-6 text-white" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Purchase Orders List */}
                <div className="space-y-4">
                    {pos.map((po) => (
                        <div
                            key={po.id}
                            className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl border border-slate-200/50 hover:border-emerald-300/50 transition-all duration-300 overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4 flex-1">
                                        <div className="p-3 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl group-hover:from-emerald-100 group-hover:to-teal-100 transition-all duration-300">
                                            <DocumentTextIcon className="h-6 w-6 text-slate-600 group-hover:text-emerald-600 transition-colors duration-300" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-1">
                                                <span className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-semibold rounded-full">
                                                    PO #{po.poNumber}
                                                </span>
                                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${po.status === 'Received'
                                                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white'
                                                        : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white'
                                                    }`}>
                                                    {po.status}
                                                </span>
                                            </div>
                                            <Link
                                                href={`/dashboard/tools/purchasing/${po.id}`}
                                                className="text-xl font-bold text-slate-900 hover:text-emerald-600 transition-colors duration-200"
                                            >
                                                {po.vendor}
                                            </Link>
                                            <div className="flex items-center space-x-4 mt-2 text-sm text-slate-600">
                                                <span className="flex items-center">
                                                    <span className="font-semibold text-emerald-600">PKR {po.totalAmount.toLocaleString()}</span>
                                                </span>
                                                <span className="text-slate-400">•</span>
                                                <span>
                                                    {po.createdAt?.seconds ? format(new Date(po.createdAt.seconds * 1000), 'PPP') : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2 ml-4">
                                        <button
                                            onClick={() => handleEdit(po.id)}
                                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200 hover:scale-110"
                                            title="Edit PO"
                                        >
                                            <PencilIcon className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(po.id, po.poNumber)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110"
                                            title="Delete PO"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {pos.length === 0 && !loading && (
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-12 text-center">
                            <div className="flex flex-col items-center">
                                <div className="p-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full mb-4">
                                    <ShoppingCartIcon className="h-12 w-12 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Purchase Orders Yet</h3>
                                <p className="text-slate-600 mb-6">Get started by creating your first purchase order</p>
                                <Link
                                    href="/dashboard/tools/purchasing/new"
                                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                                >
                                    <PlusIcon className="h-5 w-5 mr-2" />
                                    Create Purchase Order
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                <PasskeyModal
                    isOpen={isPasskeyModalOpen}
                    onClose={() => {
                        setIsPasskeyModalOpen(false);
                        setPasskeyAction(null);
                        setPasskeyContext(null);
                    }}
                    onSuccess={handlePasskeySuccess}
                    title={passkeyAction === 'delete' ? 'Confirm Deletion' : 'Confirm Edit'}
                    description="Please enter your MPIN to continue."
                />
            </div>
        </div>
    );
}