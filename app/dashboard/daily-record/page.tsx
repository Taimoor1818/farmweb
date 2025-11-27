'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, getDocs, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-hot-toast';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import * as XLSX from 'xlsx';

interface DailyData {
    cow_morning: Record<string, string>;
    cow_evening: Record<string, string>;
    buffalo_morning: Record<string, string>;
    buffalo_evening: Record<string, string>;
}

interface FarmData {
    cow_morning_total: number;
    cow_evening_total: number;
    buffalo_morning_total: number;
    buffalo_evening_total: number;
    cashIn?: number;
    cashOut?: number;
    totalExpense?: number;
}

interface Customer {
    id?: string;
    customerId: string;
    name: string;
}

interface CashEntry {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: string;
}

interface ExpenseEntry {
    id: string;
    date: string;
    item: string;
    amount: number;
    category: string;
    notes?: string;
}

interface FarmDetails {
    farmName: string;
    city: string;
    country: string;
    contact: string;
    email?: string;
}

export default function DailyRecordPage() {
    const { user } = useAuthStore();
    const [viewMode, setViewMode] = useState<'Farm' | 'Users'>('Farm');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [data, setData] = useState<DailyData | null>(null);
    const [farmData, setFarmData] = useState<FarmData | null>(null);
    const [customers, setCustomers] = useState<Record<string, Customer>>({});
    const [loading, setLoading] = useState(false);
    const [farmDetails, setFarmDetails] = useState<FarmDetails | null>(null);

    // Modal states
    const [modalType, setModalType] = useState<'cashIn' | 'cashOut' | 'expense' | null>(null);
    const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
    const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>([]);
    const [editingEntry, setEditingEntry] = useState<any>(null);
    const [editAmount, setEditAmount] = useState('');

    // Fetch customers for name lookup
    useEffect(() => {
        if (!user) return;
        const fetchCustomers = async () => {
            const q = query(collection(db, `users/${user.uid}/user_data`));
            const snapshot = await getDocs(q);
            const custMap: Record<string, Customer> = {};
            snapshot.forEach((docSnap) => {
                const docData = docSnap.data() as Customer;
                custMap[docData.customerId] = { id: docSnap.id, ...docData };
            });
            setCustomers(custMap);
        };
        fetchCustomers();
    }, [user]);

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

    // Fetch daily record
    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                if (viewMode === 'Users') {
                    const docRef = doc(db, `users/${user.uid}/daily_records`, date);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setData(docSnap.data() as DailyData);
                    } else {
                        setData(null);
                    }
                } else {
                    // Farm mode - fetch production, cash, and expenses
                    const prodRef = doc(db, `users/${user.uid}/farm_production`, date);
                    const prodSnap = await getDoc(prodRef);

                    let prodData: FarmData = {
                        cow_morning_total: 0,
                        cow_evening_total: 0,
                        buffalo_morning_total: 0,
                        buffalo_evening_total: 0,
                    };

                    if (prodSnap.exists()) {
                        prodData = prodSnap.data() as FarmData;
                    }

                    // Fetch cash entries for this date
                    const cashQuery = query(
                        collection(db, `users/${user.uid}/cash_entries`),
                        where('date', '==', date)
                    );
                    const cashSnap = await getDocs(cashQuery);
                    let cashIn = 0;
                    let cashOut = 0;
                    const cashList: CashEntry[] = [];
                    cashSnap.forEach((docSnap) => {
                        const entry = docSnap.data();
                        cashList.push({ id: docSnap.id, ...entry } as CashEntry);
                        if (entry.type === 'Credit') {
                            cashIn += entry.amount || 0;
                        } else {
                            cashOut += entry.amount || 0;
                        }
                    });
                    setCashEntries(cashList);

                    // Fetch expenses for this date
                    const expenseQuery = query(
                        collection(db, `users/${user.uid}/expenses`),
                        where('date', '==', date)
                    );
                    const expenseSnap = await getDocs(expenseQuery);
                    let totalExpense = 0;
                    const expenseList: ExpenseEntry[] = [];
                    expenseSnap.forEach((docSnap) => {
                        const entry = docSnap.data();
                        expenseList.push({ id: docSnap.id, ...entry } as ExpenseEntry);
                        totalExpense += entry.amount || 0;
                    });
                    setExpenseEntries(expenseList);

                    setFarmData({
                        ...prodData,
                        cashIn,
                        cashOut,
                        totalExpense,
                    });
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user, date, viewMode]);

    const handleCardClick = (type: 'cashIn' | 'cashOut' | 'expense') => {
        setModalType(type);
    };

    const handleEdit = (entry: any) => {
        const passkey = prompt('Enter passkey to edit:');
        if (passkey !== '0000') {
            toast.error('Incorrect passkey');
            return;
        }
        setEditingEntry(entry);
        setEditAmount(entry.amount.toString());
    };

    const handleSaveEdit = async () => {
        if (!user || !editingEntry) return;

        try {
            const collection_name = modalType === 'expense' ? 'expenses' : 'cash_entries';
            await updateDoc(doc(db, `users/${user.uid}/${collection_name}`, editingEntry.id), {
                amount: parseFloat(editAmount)
            });
            toast.success('Updated successfully');
            setEditingEntry(null);
            // Refresh data
            window.location.reload();
        } catch (error) {
            toast.error('Failed to update');
        }
    };

    const handleDelete = async (entry: any) => {
        const passkey = prompt('Enter passkey to delete:');
        if (passkey !== '0000') {
            toast.error('Incorrect passkey');
            return;
        }

        if (!user || !confirm('Are you sure you want to delete this entry?')) return;

        try {
            const collection_name = modalType === 'expense' ? 'expenses' : 'cash_entries';
            await deleteDoc(doc(db, `users/${user.uid}/${collection_name}`, entry.id));
            toast.success('Deleted successfully');
            window.location.reload();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const generatePDF = () => {
        const pdfDoc = new jsPDF();

        // Add farm details to PDF if available - Updated format
        if (farmDetails) {
            pdfDoc.setFontSize(16);
            pdfDoc.setFont('helvetica', 'bold'); // Make farm name bold
            pdfDoc.setTextColor(0, 0, 0); // Black color
            pdfDoc.text(farmDetails.farmName, 105, 15, { align: "center" });

            pdfDoc.setFont('helvetica', 'normal'); // Reset to normal font
            pdfDoc.setFontSize(12);
            pdfDoc.text(`${farmDetails.city}`, 105, 22, { align: "center" }); // Removed comma
            pdfDoc.text(`Contact: ${farmDetails.contact}`, 105, 29, { align: "center" });

            // Add date on left side
            pdfDoc.text(`Date: ${format(new Date(date), 'dd-MM-yyyy')}`, 20, 36);
        } else {
            // Add date only if no farm details (on left side)
            pdfDoc.setFontSize(12);
            pdfDoc.text(`Date: ${format(new Date(date), 'dd-MM-yyyy')}`, 20, 15);
        }

        // Add separator lines
        const topY = farmDetails ? 42 : 22;
        pdfDoc.line(20, topY, 190, topY);

        // Add title
        pdfDoc.setFontSize(14);
        pdfDoc.setTextColor(0, 0, 0); // Black color
        pdfDoc.text("DAILY RECORD", 105, topY + 8, { align: "center" });

        pdfDoc.line(20, topY + 12, 190, topY + 12);

        if (viewMode === 'Farm' && farmData) {
            const headers = [["Category", "Morning", "Evening", "Total"]];
            const rows = [
                ["Cow Milk", farmData.cow_morning_total?.toFixed(1) || '0.0', farmData.cow_evening_total?.toFixed(1) || '0.0', ((farmData.cow_morning_total || 0) + (farmData.cow_evening_total || 0)).toFixed(1)],
                ["Buffalo Milk", farmData.buffalo_morning_total?.toFixed(1) || '0.0', farmData.buffalo_evening_total?.toFixed(1) || '0.0', ((farmData.buffalo_morning_total || 0) + (farmData.buffalo_evening_total || 0)).toFixed(1)],
                ["Total Milk", "", "", ((farmData.cow_morning_total || 0) + (farmData.cow_evening_total || 0) + (farmData.buffalo_morning_total || 0) + (farmData.buffalo_evening_total || 0)).toFixed(1)]
            ];

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
                    3: { halign: 'center' }
                }
            });
        } else if (viewMode === 'Users' && data) {
            const headers = [["ID", "Name", "Cow (M)", "Cow (E)", "Buff (M)", "Buff (E)", "Total"]];
            const rows: any[] = [];
            const allIds = new Set([
                ...Object.keys(data.cow_morning || {}),
                ...Object.keys(data.cow_evening || {}),
                ...Object.keys(data.buffalo_morning || {}),
                ...Object.keys(data.buffalo_evening || {})
            ]);
            const sortedIds = Array.from(allIds).sort((a, b) => parseInt(a) - parseInt(b));
            let grandTotal = 0;

            sortedIds.forEach(customerId => {
                const name = customers[customerId]?.name || 'Unknown';
                const cm = parseFloat(data.cow_morning?.[customerId] || '0');
                const ce = parseFloat(data.cow_evening?.[customerId] || '0');
                const bm = parseFloat(data.buffalo_morning?.[customerId] || '0');
                const be = parseFloat(data.buffalo_evening?.[customerId] || '0');
                const total = cm + ce + bm + be;
                grandTotal += total;

                if (total > 0) {
                    rows.push([customerId, name, cm || '-', ce || '-', bm || '-', be || '-', total.toFixed(1)]);
                }
            });

            rows.push(["", "Total", "", "", "", "", grandTotal.toFixed(1)]);

            autoTable(pdfDoc, {
                head: headers,
                body: rows,
                startY: topY + 20,
                theme: 'grid',
                headStyles: { fillColor: [22, 163, 74] },
                styles: { cellPadding: 3, fontSize: 10, halign: 'center' },
                columnStyles: {
                    0: { halign: 'center' },
                    1: { halign: 'left' },
                    2: { halign: 'center' },
                    3: { halign: 'center' },
                    4: { halign: 'center' },
                    5: { halign: 'center' },
                    6: { halign: 'center' }
                }
            });
        }

        pdfDoc.save(`daily_record_${date}.pdf`);
        toast.success('PDF downloaded');
    };

    const exportExcel = () => {
        if (viewMode === 'Farm' && farmData) {
            // Create header rows
            const excelData = [];

            // Add farm details if available - Updated format with better styling
            if (farmDetails) {
                excelData.push({ A: farmDetails.farmName, B: '', C: '', D: '', E: '', F: '', G: '' });
                excelData.push({ A: `${farmDetails.city}`, B: '', C: '', D: '', E: '', F: '', G: '' });
                excelData.push({ A: `Contact: ${farmDetails.contact}`, B: '', C: '', D: '', E: '', F: '', G: '' });
                excelData.push({ A: `Date: ${format(new Date(date), 'dd-MM-yyyy')}`, B: '', C: '', D: '', E: '', F: '', G: '' });
            } else {
                // Add date only if no farm details
                excelData.push({ A: `Date: ${format(new Date(date), 'dd-MM-yyyy')}`, B: '', C: '', D: '', E: '', F: '', G: '' });
            }

            // Add separator line
            excelData.push({ A: '----------------------------------------------------------', B: '', C: '', D: '', E: '', F: '', G: '' });

            // Add title
            excelData.push({ A: '', B: '', C: 'DAILY RECORD', D: '', E: '', F: '', G: '' });

            // Add another separator line
            excelData.push({ A: '----------------------------------------------------------', B: '', C: '', D: '', E: '', F: '', G: '' });

            // Add empty row
            excelData.push({ A: '', B: '', C: '', D: '', E: '', F: '', G: '' });

            // Add table data
            excelData.push({ A: 'Category', B: 'Morning', C: 'Evening', D: 'Total', E: '', F: '', G: '' });
            excelData.push({ A: 'Cow Milk', B: farmData.cow_morning_total?.toFixed(1) || '0.0', C: farmData.cow_evening_total?.toFixed(1) || '0.0', D: ((farmData.cow_morning_total || 0) + (farmData.cow_evening_total || 0)).toFixed(1), E: '', F: '', G: '' });
            excelData.push({ A: 'Buffalo Milk', B: farmData.buffalo_morning_total?.toFixed(1) || '0.0', C: farmData.buffalo_evening_total?.toFixed(1) || '0.0', D: ((farmData.buffalo_morning_total || 0) + (farmData.buffalo_evening_total || 0)).toFixed(1), E: '', F: '', G: '' });
            excelData.push({ A: 'Total Milk', B: '', C: '', D: ((farmData.cow_morning_total || 0) + (farmData.cow_evening_total || 0) + (farmData.buffalo_morning_total || 0) + (farmData.buffalo_evening_total || 0)).toFixed(1), E: '', F: '', G: '' });

            const ws = XLSX.utils.json_to_sheet(excelData, { skipHeader: true });

            // Set column widths
            ws['!cols'] = [
                { wch: 20 }, // A column
                { wch: 15 }, // B column
                { wch: 15 }, // C column
                { wch: 15 }, // D column
                { wch: 15 }, // E column
                { wch: 15 }, // F column
                { wch: 15 }  // G column
            ];

            // Apply styling to headers and data
            const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

            // Style the farm details section (green background, bold, centered)
            for (let row = 0; row <= 2; row++) {
                for (let col = 0; col <= 6; col++) {
                    const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
                    if (!ws[cellRef]) continue;
                    if (!ws[cellRef].s) ws[cellRef].s = {};
                    ws[cellRef].s = {
                        font: { bold: true, sz: 14 },
                        fill: { fgColor: { rgb: "C6EFCE" } }, // Light green background
                        alignment: { horizontal: "center", vertical: "center" }
                    };
                }
            }

            // Style the title row
            const titleRow = 6;
            for (let col = 0; col <= 6; col++) {
                const cellRef = XLSX.utils.encode_cell({ r: titleRow, c: col });
                if (!ws[cellRef]) continue;
                if (!ws[cellRef].s) ws[cellRef].s = {};
                ws[cellRef].s = {
                    font: { bold: true, sz: 16 },
                    fill: { fgColor: { rgb: "C6EFCE" } }, // Light green background
                    alignment: { horizontal: "center", vertical: "center" }
                };
            }

            // Style the table headers (Category, Morning, etc.)
            const headerRow = 9;
            for (let col = 0; col <= 6; col++) {
                const cellRef = XLSX.utils.encode_cell({ r: headerRow, c: col });
                if (!ws[cellRef]) continue;
                if (!ws[cellRef].s) ws[cellRef].s = {};
                ws[cellRef].s = {
                    font: { bold: true },
                    fill: { fgColor: { rgb: "90EE90" } }, // Green background
                    alignment: { horizontal: "center", vertical: "center" }
                };
            }

            // Style the data rows (centered)
            for (let row = 10; row <= 13; row++) {
                for (let col = 0; col <= 6; col++) {
                    const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
                    if (!ws[cellRef]) continue;
                    if (!ws[cellRef].s) ws[cellRef].s = {};
                    ws[cellRef].s.alignment = { horizontal: "center", vertical: "center" };
                }
            }

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Daily Record");
            XLSX.writeFile(wb, `daily_record_${date}.xlsx`);
            toast.success('Excel downloaded');
        } else if (viewMode === 'Users' && data) {
            // Create header rows
            const excelData = [];

            // Add farm details if available - Updated format with better styling
            if (farmDetails) {
                excelData.push({ A: farmDetails.farmName, B: '', C: '', D: '', E: '', F: '', G: '', H: '' });
                excelData.push({ A: `${farmDetails.city}`, B: '', C: '', D: '', E: '', F: '', G: '', H: '' });
                excelData.push({ A: `Contact: ${farmDetails.contact}`, B: '', C: '', D: '', E: '', F: '', G: '', H: '' });
                excelData.push({ A: `Date: ${format(new Date(date), 'dd-MM-yyyy')}`, B: '', C: '', D: '', E: '', F: '', G: '', H: '' });
            } else {
                // Add date only if no farm details
                excelData.push({ A: `Date: ${format(new Date(date), 'dd-MM-yyyy')}`, B: '', C: '', D: '', E: '', F: '', G: '', H: '' });
            }

            // Add separator line
            excelData.push({ A: '----------------------------------------------------------', B: '', C: '', D: '', E: '', F: '', G: '', H: '' });

            // Add title
            excelData.push({ A: '', B: '', C: '', D: 'DAILY RECORD', E: '', F: '', G: '', H: '' });

            // Add another separator line
            excelData.push({ A: '----------------------------------------------------------', B: '', C: '', D: '', E: '', F: '', G: '', H: '' });

            // Add empty row
            excelData.push({ A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' });

            // Add table data
            const allIds = new Set([
                ...Object.keys(data.cow_morning || {}),
                ...Object.keys(data.cow_evening || {}),
                ...Object.keys(data.buffalo_morning || {}),
                ...Object.keys(data.buffalo_evening || {})
            ]);
            const sortedIds = Array.from(allIds).sort((a, b) => parseInt(a) - parseInt(b));

            excelData.push({ A: 'ID', B: 'Name', C: 'Cow (M)', D: 'Cow (E)', E: 'Buffalo (M)', F: 'Buffalo (E)', G: 'Total', H: '' });

            let grandTotal = 0;
            sortedIds.forEach(customerId => {
                const name = customers[customerId]?.name || 'Unknown';
                const cm = parseFloat(data.cow_morning?.[customerId] || '0');
                const ce = parseFloat(data.cow_evening?.[customerId] || '0');
                const bm = parseFloat(data.buffalo_morning?.[customerId] || '0');
                const be = parseFloat(data.buffalo_evening?.[customerId] || '0');
                const total = cm + ce + bm + be;
                grandTotal += total;

                if (total > 0) {
                    excelData.push({
                        A: customerId,
                        B: name,
                        C: cm || '-',
                        D: ce || '-',
                        E: bm || '-',
                        F: be || '-',
                        G: total.toFixed(1),
                        H: ''
                    });
                }
            });

            excelData.push({ A: '', B: 'Total', C: '', D: '', E: '', F: '', G: grandTotal.toFixed(1), H: '' });

            const ws = XLSX.utils.json_to_sheet(excelData, { skipHeader: true });

            // Set column widths
            ws['!cols'] = [
                { wch: 10 }, // A column
                { wch: 20 }, // B column
                { wch: 12 }, // C column
                { wch: 12 }, // D column
                { wch: 15 }, // E column
                { wch: 15 }, // F column
                { wch: 12 }, // G column
                { wch: 10 }  // H column
            ];

            // Apply styling to headers and data
            const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

            // Style the farm details section (green background, bold, centered)
            for (let row = 0; row <= 2; row++) {
                for (let col = 0; col <= 7; col++) {
                    const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
                    if (!ws[cellRef]) continue;
                    if (!ws[cellRef].s) ws[cellRef].s = {};
                    ws[cellRef].s = {
                        font: { bold: true, sz: 14 },
                        fill: { fgColor: { rgb: "C6EFCE" } }, // Light green background
                        alignment: { horizontal: "center", vertical: "center" }
                    };
                }
            }

            // Style the title row
            const titleRow = 6;
            for (let col = 0; col <= 7; col++) {
                const cellRef = XLSX.utils.encode_cell({ r: titleRow, c: col });
                if (!ws[cellRef]) continue;
                if (!ws[cellRef].s) ws[cellRef].s = {};
                ws[cellRef].s = {
                    font: { bold: true, sz: 16 },
                    fill: { fgColor: { rgb: "C6EFCE" } }, // Light green background
                    alignment: { horizontal: "center", vertical: "center" }
                };
            }

            // Style the table headers (ID, Name, etc.)
            const headerRow = 9;
            for (let col = 0; col <= 7; col++) {
                const cellRef = XLSX.utils.encode_cell({ r: headerRow, c: col });
                if (!ws[cellRef]) continue;
                if (!ws[cellRef].s) ws[cellRef].s = {};
                ws[cellRef].s = {
                    font: { bold: true },
                    fill: { fgColor: { rgb: "90EE90" } }, // Green background
                    alignment: { horizontal: "center", vertical: "center" }
                };
            }

            // Style the data rows (centered)
            for (let row = 10; row <= excelData.length; row++) {
                for (let col = 0; col <= 7; col++) {
                    const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
                    if (!ws[cellRef]) continue;
                    if (!ws[cellRef].s) ws[cellRef].s = {};
                    ws[cellRef].s.alignment = { horizontal: "center", vertical: "center" };
                }
            }

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Daily Record");
            XLSX.writeFile(wb, `daily_record_${date}.xlsx`);
            toast.success('Excel downloaded');
        }
    };

    const getFilteredEntries = () => {
        if (modalType === 'cashIn') {
            return cashEntries.filter(e => e.type === 'Credit');
        } else if (modalType === 'cashOut') {
            return cashEntries.filter(e => e.type === 'Debit');
        } else {
            return expenseEntries;
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            {/* Farm Details Header */}
            {farmDetails && (
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{farmDetails.farmName}</h2>
                            <p className="text-gray-600">{farmDetails.city}, {farmDetails.country} | {farmDetails.contact}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Daily Record</h1>
                <div className="flex gap-4 items-center">
                    <ToggleSwitch
                        options={['Farm', 'Users']}
                        selected={viewMode}
                        onChange={(value) => setViewMode(value as 'Farm' | 'Users')}
                    />
                    <button
                        onClick={generatePDF}
                        disabled={viewMode === 'Farm' ? !farmData : !data}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                        Download PDF
                    </button>
                    <button
                        onClick={exportExcel}
                        disabled={viewMode === 'Farm' ? !farmData : !data}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        Export Excel
                    </button>
                </div>
            </div>

            {/* Quick Navigation Buttons */}
            <div className="mb-6 grid grid-cols-2 sm:grid-cols-5 gap-3">
                <Link href="/dashboard/cow-milk" className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-center text-sm font-medium hover:bg-blue-200 transition-colors">
                    Cow Milk Entry
                </Link>
                <Link href="/dashboard/buffalo-milk" className="px-3 py-2 bg-purple-100 text-purple-700 rounded-md text-center text-sm font-medium hover:bg-purple-200 transition-colors">
                    Buffalo Milk Entry
                </Link>
                <Link href="/dashboard/cash" className="px-3 py-2 bg-green-100 text-green-700 rounded-md text-center text-sm font-medium hover:bg-green-200 transition-colors">
                    Cash Entry
                </Link>
                <Link href="/dashboard/expense" className="px-3 py-2 bg-red-100 text-red-700 rounded-md text-center text-sm font-medium hover:bg-red-200 transition-colors">
                    Expense Entry
                </Link>
                <Link href="/dashboard/tools" className="px-3 py-2 bg-pink-100 text-pink-700 rounded-md text-center text-sm font-medium hover:bg-pink-200 transition-colors">
                    Tools
                </Link>
            </div>

            <div className="bg-white p-6 rounded-lg shadow mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                />
            </div>

            {loading ? (
                <div className="text-center py-10">Loading...</div>
            ) : viewMode === 'Farm' ? (
                farmData ? (
                    <div className="space-y-6">
                        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Farm Production Summary</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Cow Milk Card - Elegant Design */}
                                <div className="relative overflow-hidden rounded-2xl shadow-lg bg-gradient-to-br from-blue-100 via-white to-blue-200 p-6 border border-blue-200">
                                    <div className="absolute top-4 right-4 opacity-20 text-blue-400" style={{fontSize: '3rem'}}>
                                        🐄
                                    </div>
                                    <h3 className="text-lg font-bold text-blue-900 mb-2 flex items-center gap-2">
                                        Cow Milk
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500">Morning</span>
                                            <span className="font-semibold text-blue-700 text-xl">{farmData.cow_morning_total?.toFixed(1) || '0.0'} L</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500">Evening</span>
                                            <span className="font-semibold text-blue-700 text-xl">{farmData.cow_evening_total?.toFixed(1) || '0.0'} L</span>
                                        </div>
                                        <div className="flex justify-between items-center border-t pt-3 mt-2">
                                            <span className="font-medium text-blue-900">Total</span>
                                            <span className="font-bold text-2xl text-blue-900">{((farmData.cow_morning_total || 0) + (farmData.cow_evening_total || 0)).toFixed(1)} L</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Buffalo Milk Card - Elegant Design */}
                                <div className="relative overflow-hidden rounded-2xl shadow-lg bg-gradient-to-br from-green-100 via-white to-green-200 p-6 border border-green-200">
                                    <div className="absolute top-4 right-4 opacity-20 text-green-400" style={{fontSize: '3rem'}}>
                                        🐃
                                    </div>
                                    <h3 className="text-lg font-bold text-green-900 mb-2 flex items-center gap-2">
                                        Buffalo Milk
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500">Morning</span>
                                            <span className="font-semibold text-green-700 text-xl">{farmData.buffalo_morning_total?.toFixed(1) || '0.0'} L</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500">Evening</span>
                                            <span className="font-semibold text-green-700 text-xl">{farmData.buffalo_evening_total?.toFixed(1) || '0.0'} L</span>
                                        </div>
                                        <div className="flex justify-between items-center border-t pt-3 mt-2">
                                            <span className="font-medium text-green-900">Total</span>
                                            <span className="font-bold text-2xl text-green-900">{((farmData.buffalo_morning_total || 0) + (farmData.buffalo_evening_total || 0)).toFixed(1)} L</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 bg-gray-100 p-4 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-medium text-gray-900">Grand Total Production:</span>
                                    <span className="text-2xl font-bold text-green-600">
                                        {((farmData.cow_morning_total || 0) + (farmData.cow_evening_total || 0) + (farmData.buffalo_morning_total || 0) + (farmData.buffalo_evening_total || 0)).toFixed(1)} Liters
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h2>
                            <div className="grid grid-cols-3 gap-6">
                                <button
                                    onClick={() => handleCardClick('cashIn')}
                                    className="bg-green-50 p-4 rounded-lg hover:bg-green-100 transition-colors text-left"
                                >
                                    <h3 className="text-sm font-medium text-green-900 mb-2">Cash In</h3>
                                    <p className="text-2xl font-bold text-green-600">PKR {farmData.cashIn?.toFixed(2) || '0.00'}</p>
                                    <p className="text-xs text-gray-500 mt-2">Click to view details</p>
                                </button>
                                <button
                                    onClick={() => handleCardClick('cashOut')}
                                    className="bg-red-50 p-4 rounded-lg hover:bg-red-100 transition-colors text-left"
                                >
                                    <h3 className="text-sm font-medium text-red-900 mb-2">Cash Out</h3>
                                    <p className="text-2xl font-bold text-red-600">PKR {farmData.cashOut?.toFixed(2) || '0.00'}</p>
                                    <p className="text-xs text-gray-500 mt-2">Click to view details</p>
                                </button>
                                <button
                                    onClick={() => handleCardClick('expense')}
                                    className="bg-orange-50 p-4 rounded-lg hover:bg-orange-100 transition-colors text-left"
                                >
                                    <h3 className="text-sm font-medium text-orange-900 mb-2">Total Expenses</h3>
                                    <p className="text-2xl font-bold text-orange-600">PKR {farmData.totalExpense?.toFixed(2) || '0.00'}</p>
                                    <p className="text-xs text-gray-500 mt-2">Click to view details</p>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-10 text-gray-500">No data for this date.</div>
                )
            ) : data ? (
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cow (M)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cow (E)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buff (M)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buff (E)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {(() => {
                                const allIds = new Set([
                                    ...Object.keys(data.cow_morning || {}),
                                    ...Object.keys(data.cow_evening || {}),
                                    ...Object.keys(data.buffalo_morning || {}),
                                    ...Object.keys(data.buffalo_evening || {})
                                ]);
                                const sortedIds = Array.from(allIds).sort((a, b) => parseInt(a) - parseInt(b));

                                if (sortedIds.length === 0) {
                                    return <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No records for this date</td></tr>;
                                }

                                return sortedIds.map(customerId => (
                                    <tr key={customerId}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customerId}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customers[customerId]?.name || 'Unknown'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.cow_morning?.[customerId] || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.cow_evening?.[customerId] || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.buffalo_morning?.[customerId] || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.buffalo_evening?.[customerId] || '-'}</td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-10 text-gray-500">No records found for this date.</div>
            )}

            {/* Modal for detailed entries */}
            {modalType && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-3xl max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">
                                {modalType === 'cashIn' ? 'Cash In Details' : modalType === 'cashOut' ? 'Cash Out Details' : 'Expense Details'}
                            </h2>
                            <button onClick={() => setModalType(null)} className="text-gray-500 hover:text-gray-700">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {getFilteredEntries().map((entry: any) => (
                                <div key={entry.id} className="border rounded-lg p-4 hover:bg-gray-50">
                                    {editingEntry?.id === entry.id ? (
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="number"
                                                value={editAmount}
                                                onChange={(e) => setEditAmount(e.target.value)}
                                                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                                            />
                                            <button
                                                onClick={handleSaveEdit}
                                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => setEditingEntry(null)}
                                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {modalType === 'expense' ? entry.item : entry.description}
                                                </p>
                                                {modalType === 'expense' && (
                                                    <p className="text-sm text-gray-500">Category: {entry.category}</p>
                                                )}
                                                {entry.notes && <p className="text-sm text-gray-500">Notes: {entry.notes}</p>}
                                                <p className="text-lg font-bold text-green-600">PKR {entry.amount.toFixed(2)}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(entry)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    <PencilIcon className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(entry)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {getFilteredEntries().length === 0 && (
                                <p className="text-center text-gray-500 py-10">No entries found for this date.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}