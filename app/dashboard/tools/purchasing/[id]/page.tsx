'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, setDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PlusIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface POItem {
    id: number;
    name: string;
    qty: number;
    unit: string;
    price: number;
}

interface PO {
    id: string;
    poNumber: string;
    vendor: string;
    items: POItem[];
    totalAmount: number;
    status: 'Pending' | 'Received' | 'Partially Received';
    createdAt: any;
}

interface FarmDetails {
    farmName: string;
    city: string;
    country: string;
    contact: string;
    email?: string;
}

export default function PODetailsPage() {
    const { user } = useAuthStore();
    const params = useParams();
    const router = useRouter();
    const [po, setPo] = useState<PO | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isReceiving, setIsReceiving] = useState(false);
    const [receivedItems, setReceivedItems] = useState<Record<number, number>>({});
    const [vendor, setVendor] = useState('');
    const [items, setItems] = useState<POItem[]>([]);
    const [farmDetails, setFarmDetails] = useState<FarmDetails | null>(null);

    useEffect(() => {
        if (!user || !params.id) return;
        const fetchPO = async () => {
            try {
                const docRef = doc(db, `users/${user.uid}/purchaseOrders`, params.id as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const poData = { id: docSnap.id, ...docSnap.data() } as PO;
                    setPo(poData);
                    setVendor(poData.vendor);
                    setItems(poData.items);
                    
                    // Initialize received items with 0 quantities
                    const initialReceived: Record<number, number> = {};
                    poData.items.forEach(item => {
                        initialReceived[item.id] = 0;
                    });
                    setReceivedItems(initialReceived);
                } else {
                    toast.error('PO not found');
                    router.push('/dashboard/tools/purchasing');
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchPO();
    }, [user, params.id, router]);

    // Fetch farm details
    useEffect(() => {
        if (!user) return;
        
        const fetchFarmDetails = async () => {
            try {
                const docRef = doc(db, `users/${user.uid}/farm_details`, 'info');
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    setFarmDetails(docSnap.data() as FarmDetails);
                }
            } catch (error) {
                console.error('Error fetching farm details:', error);
            }
        };
        
        fetchFarmDetails();
    }, [user]);

    const generatePDF = () => {
        if (!po) return;

        // Password protection check
        const pin = prompt('Enter PIN to download PDF:');
        if (pin !== '01468') {
            toast.error('Incorrect PIN');
            return;
        }

        const pdfDoc = new jsPDF();

        // Add farm details to PDF if available
        if (farmDetails) {
            pdfDoc.setFontSize(16);
            pdfDoc.setTextColor(22, 163, 74); // Green color
            pdfDoc.text(farmDetails.farmName, 105, 15, { align: "center" });
        
            pdfDoc.setFontSize(12);
            pdfDoc.setTextColor(0, 0, 0);
            pdfDoc.text(`${farmDetails.city}, ${farmDetails.country}`, 105, 22, { align: "center" });
            pdfDoc.text(`Contact: ${farmDetails.contact}`, 105, 29, { align: "center" });
        }
        
        // Add PO info
        pdfDoc.setFontSize(12);
        const startY = farmDetails ? 36 : 22;
        pdfDoc.text(`PO Number: ${po.poNumber}`, 105, startY, { align: "center" });
        pdfDoc.text(`Vendor: ${po.vendor}`, 105, startY + 7, { align: "center" });
        pdfDoc.text(`Date: ${po.createdAt?.seconds ? format(new Date(po.createdAt.seconds * 1000), 'dd-MM-yyyy') : ''}`, 105, startY + 14, { align: "center" });
        pdfDoc.text(`Status: ${po.status}`, 105, startY + 21, { align: "center" });
        
        // Add separator lines
        const topY = farmDetails ? 60 : 46;
        pdfDoc.line(20, topY, 190, topY);
        
        // Add title
        pdfDoc.setFontSize(14);
        pdfDoc.setTextColor(22, 163, 74); // Green color
        pdfDoc.text("PURCHASE ORDER", 105, topY + 8, { align: "center" });
        
        pdfDoc.line(20, topY + 12, 190, topY + 12);

        const headers = [["Item", "Qty", "Unit", "Price", "Total"]];
        const rows = po.items.map(item => [
            item.name,
            item.qty,
            item.unit,
            item.price,
            (item.qty * item.price).toFixed(2)
        ]);

        // Footer row
        rows.push(["", "", "", "Grand Total", po.totalAmount.toFixed(2)]);

        autoTable(pdfDoc, {
            head: headers,
            body: rows,
            startY: topY + 20,
            theme: 'grid',
            headStyles: { fillColor: [22, 163, 74] },
            styles: { cellPadding: 3, fontSize: 10, halign: 'center' },
            columnStyles: {
                0: { halign: 'left' },
                1: { halign: 'center' },
                2: { halign: 'center' },
                3: { halign: 'center' },
                4: { halign: 'center' }
            }
        });

        pdfDoc.save(`PO_${po.poNumber}.pdf`);
        toast.success('PDF downloaded');
    };

    const addItem = () => {
        setItems([...items, { id: Date.now(), name: '', qty: 1, unit: 'kg', price: 0 }]);
    };

    const removeItem = (id: number) => {
        setItems(items.filter(i => i.id !== id));
    };

    const updateItem = (id: number, field: keyof POItem, value: any) => {
        setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.qty * item.price), 0);
    };

    const handleEdit = () => {
        // Ask for passkey before allowing edit
        const passkey = prompt('Enter passkey to edit PO:');
        if (passkey !== '0000') {
            toast.error('Incorrect passkey');
            return;
        }
        
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        // Reset form fields to original values
        if (po) {
            setVendor(po.vendor);
            setItems(po.items);
        }
        setIsEditing(false);
    };

    const handleSaveEdit = async () => {
        if (!user || !po) return;
        
        // Ask for passkey before saving changes
        const passkey = prompt('Enter passkey to save changes:');
        if (passkey !== '0000') {
            toast.error('Incorrect passkey');
            return;
        }

        try {
            const updatedPO = {
                ...po,
                vendor,
                items,
                totalAmount: calculateTotal(),
            };

            // Update only in the auto-generated ID location
            const docRef = doc(db, `users/${user.uid}/purchaseOrders`, po.id);
            await updateDoc(docRef, updatedPO);

            setPo(updatedPO);
            setIsEditing(false);
            toast.success('PO updated successfully');
        } catch (error) {
            console.error(error);
            toast.error('Failed to update PO');
        }
    };

    const handleDelete = async () => {
        if (!user || !po) return;
        
        // Ask for passkey before allowing delete
        const passkey = prompt('Enter passkey to delete PO:');
        if (passkey !== '0000') {
            toast.error('Incorrect passkey');
            return;
        }
        
        if (!confirm('Are you sure you want to delete this PO?')) return;

        try {
            // Delete only from the auto-generated ID location
            await deleteDoc(doc(db, `users/${user.uid}/purchaseOrders`, po.id));
            
            toast.success('PO deleted successfully');
            router.push('/dashboard/tools/purchasing');
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete PO');
        }
    };

    const handleReceiveItems = () => {
        // Ask for passkey before allowing receive
        const passkey = prompt('Enter passkey to receive items:');
        if (passkey !== '0000') {
            toast.error('Incorrect passkey');
            return;
        }
        
        setIsReceiving(true);
    };

    const updateReceivedQuantity = (itemId: number, quantity: number) => {
        setReceivedItems(prev => ({
            ...prev,
            [itemId]: quantity
        }));
    };

    const handleSaveReceivedItems = async () => {
        if (!user || !po) return;
        
        // Ask for passkey before saving received items
        const passkey = prompt('Enter passkey to save received items:');
        if (passkey !== '0000') {
            toast.error('Incorrect passkey');
            return;
        }

        try {
            // Determine new status based on received quantities
            const totalItems = po.items.length;
            const fullyReceivedItems = po.items.filter(item => 
                receivedItems[item.id] >= item.qty
            ).length;
            
            let newStatus: 'Pending' | 'Received' | 'Partially Received' = 'Pending';
            if (fullyReceivedItems === totalItems) {
                newStatus = 'Received';
            } else if (fullyReceivedItems > 0) {
                newStatus = 'Partially Received';
            }

            // Update PO status
            const docRef = doc(db, `users/${user.uid}/purchaseOrders`, po.id);
            await updateDoc(docRef, { status: newStatus });

            // Create receiving record with received quantities
            const receivingData = {
                poId: po.id,
                poNumber: po.poNumber,
                vendor: po.vendor,
                items: po.items.map(item => ({
                    ...item,
                    receivedQty: receivedItems[item.id] || 0
                })),
                receivedAt: new Date(),
                status: newStatus
            };

            await addDoc(collection(db, `users/${user.uid}/po_receiving`), receivingData);

            // Update local state
            setPo({ ...po, status: newStatus });
            setIsReceiving(false);
            toast.success('Items received and recorded successfully');
        } catch (error) {
            console.error(error);
            toast.error('Failed to record received items');
        }
    };

    const handleCancelReceiving = () => {
        // Reset received items to 0
        const resetReceived: Record<number, number> = {};
        if (po) {
            po.items.forEach(item => {
                resetReceived[item.id] = 0;
            });
        }
        setReceivedItems(resetReceived);
        setIsReceiving(false);
    };

    if (loading) return <div className="text-center py-10">Loading...</div>;
    if (!po) return null;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    {isEditing ? 'Edit PO' : isReceiving ? 'Receive Items' : 'PO Details'}: {po.poNumber}
                </h1>
                <div className="space-x-3">
                    {isEditing ? (
                        <>
                            <button
                                onClick={handleCancelEdit}
                                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                            >
                                Save Changes
                            </button>
                        </>
                    ) : isReceiving ? (
                        <>
                            <button
                                onClick={handleCancelReceiving}
                                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveReceivedItems}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                            >
                                Save Received Items
                            </button>
                        </>
                    ) : (
                        <>
                            {po.status !== 'Received' && (
                                <button
                                    onClick={handleReceiveItems}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Receive Items
                                </button>
                            )}
                            <button
                                onClick={handleEdit}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                            >
                                Edit PO
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                            >
                                Delete PO
                            </button>
                            <button
                                onClick={generatePDF}
                                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                            >
                                Download PDF
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
                {isEditing ? (
                    // Edit form
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Vendor Name</label>
                            <input
                                type="text"
                                value={vendor}
                                onChange={(e) => setVendor(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
                            <div className="space-y-2">
                                {items.map((item, index) => (
                                    <div key={item.id} className="flex gap-2 items-center">
                                        <span className="text-gray-500 w-6">{index + 1}.</span>
                                        <input
                                            type="text"
                                            placeholder="Item Name"
                                            value={item.name}
                                            onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                            className="flex-grow rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                                            required
                                        />
                                        <input
                                            type="number"
                                            placeholder="Qty"
                                            value={item.qty}
                                            onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value))}
                                            className="w-20 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                                            required
                                        />
                                        <input
                                            type="text"
                                            placeholder="Unit"
                                            value={item.unit}
                                            onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                                            className="w-20 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                                            required
                                        />
                                        <input
                                            type="number"
                                            placeholder="Price"
                                            value={item.price}
                                            onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value))}
                                            className="w-24 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item.id)}
                                            className="text-red-600 hover:text-red-800"
                                            disabled={items.length === 1}
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={addItem}
                                className="mt-2 flex items-center text-sm text-green-600 hover:text-green-700"
                            >
                                <PlusIcon className="h-4 w-4 mr-1" />
                                Add Item
                            </button>
                        </div>

                        <div className="border-t pt-4">
                            <div className="text-lg font-bold">Total: PKR {calculateTotal()}</div>
                        </div>
                    </div>
                ) : isReceiving ? (
                    // Receive items form
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Vendor</p>
                                <p className="text-lg text-gray-900">{po.vendor}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Status</p>
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${po.status === 'Received' ? 'bg-green-100 text-green-800' : po.status === 'Partially Received' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                    {po.status}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Date</p>
                                <p className="text-gray-900">
                                    {po.createdAt?.seconds ? format(new Date(po.createdAt.seconds * 1000), 'PPpp') : ''}
                                </p>
                            </div>
                        </div>

                        <h3 className="text-lg font-medium text-gray-900 mb-4">Items to Receive</h3>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ordered Qty</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receive Qty</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {po.items.map((item) => {
                                    const receivedQty = receivedItems[item.id] || 0;
                                    const isFullyReceived = receivedQty >= item.qty;
                                    const isPartiallyReceived = receivedQty > 0 && receivedQty < item.qty;
                                    
                                    return (
                                        <tr key={item.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.qty}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.unit}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={item.qty}
                                                    value={receivedQty}
                                                    onChange={(e) => updateReceivedQuantity(item.id, parseFloat(e.target.value) || 0)}
                                                    className="w-20 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {isFullyReceived ? (
                                                    <span className="inline-flex items-center text-green-600">
                                                        <CheckCircleIcon className="h-5 w-5 mr-1" />
                                                        Received
                                                    </span>
                                                ) : isPartiallyReceived ? (
                                                    <span className="text-yellow-600">Partial</span>
                                                ) : (
                                                    <span className="text-gray-500">Pending</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        
                        <div className="mt-4 p-4 bg-blue-50 rounded-md">
                            <p className="text-sm text-blue-700">
                                <strong>Note:</strong> Enter the quantity of each item you are receiving. 
                                You can receive partial quantities. The PO status will be updated accordingly.
                            </p>
                        </div>
                    </div>
                ) : (
                    // View mode
                    <>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Vendor</p>
                                <p className="text-lg text-gray-900">{po.vendor}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Status</p>
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${po.status === 'Received' ? 'bg-green-100 text-green-800' : po.status === 'Partially Received' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                    {po.status}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Date</p>
                                <p className="text-gray-900">
                                    {po.createdAt?.seconds ? format(new Date(po.createdAt.seconds * 1000), 'PPpp') : ''}
                                </p>
                            </div>
                        </div>

                        <h3 className="text-lg font-medium text-gray-900 mb-4">Items</h3>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {po.items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.qty}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.unit}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.price}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{(item.qty * item.price).toFixed(2)}</td>
                                    </tr>
                                ))}
                                <tr className="bg-gray-50">
                                    <td colSpan={4} className="px-6 py-4 text-right font-bold text-gray-900">Grand Total:</td>
                                    <td className="px-6 py-4 whitespace-nowrap font-bold text-green-600">{po.totalAmount.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </>
                )}
            </div>
        </div>
    );
}