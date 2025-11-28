'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { collection, query, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import PasskeyModal from '@/components/ui/PasskeyModal';

interface MilkRecord {
    date: string;
    cowMorning: number;
    cowEvening: number;
    buffaloMorning: number;
    buffaloEvening: number;
    total: number;
}

interface Customer {
    customerId: string;
    name: string;
    phone?: string;
    cowRate?: number;
    buffaloRate?: number;
    debitAmount?: number;
}

interface FarmDetails {
    farmName: string;
    city: string;
    contact: string;
}

export default function UserRecordPage() {
    const { user } = useAuthStore();
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const customerId = params.customerId as string;

    // Check if we're in view mode (from monthly report)
    const isViewMode = searchParams.get('view') === 'true';

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [records, setRecords] = useState<MilkRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [showDebitModal, setShowDebitModal] = useState(false);
    const [debitInput, setDebitInput] = useState('');
    const [farmDetails, setFarmDetails] = useState<FarmDetails | null>(null);

    // Passkey Modal state
    const [isPasskeyModalOpen, setIsPasskeyModalOpen] = useState(false);
    const [passkeyAction, setPasskeyAction] = useState<'setDebit' | 'clearDebit' | null>(null);

    useEffect(() => {
        if (!user || !customerId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch customer details
                const customerDoc = await getDoc(doc(db, `users/${user.uid}/user_data`, customerId));
                if (customerDoc.exists()) {
                    setCustomer(customerDoc.data() as Customer);
                }

                // Fetch all daily records
                const dailyRecordsRef = collection(db, `users/${user.uid}/daily_records`);
                const snapshot = await getDocs(query(dailyRecordsRef));

                const recordsList: MilkRecord[] = [];
                snapshot.forEach((docSnap) => {
                    const date = docSnap.id;
                    const data = docSnap.data();

                    const cowMorning = parseFloat(data.cow_morning?.[customerId] || '0');
                    const cowEvening = parseFloat(data.cow_evening?.[customerId] || '0');
                    const buffaloMorning = parseFloat(data.buffalo_morning?.[customerId] || '0');
                    const buffaloEvening = parseFloat(data.buffalo_evening?.[customerId] || '0');
                    const total = cowMorning + cowEvening + buffaloMorning + buffaloEvening;

                    if (total > 0 && date >= startDate && date <= endDate) {
                        recordsList.push({
                            date,
                            cowMorning,
                            cowEvening,
                            buffaloMorning,
                            buffaloEvening,
                            total,
                        });
                    }
                });

                recordsList.sort((a, b) => b.date.localeCompare(a.date));
                setRecords(recordsList);
            } catch (error) {
                console.error(error);
                toast.error('Failed to load records');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, customerId, startDate, endDate]);

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

    const handleSetDebit = () => {
        if (!user || !customer) return;
        setPasskeyAction('setDebit');
        setIsPasskeyModalOpen(true);
    };

    const handleClearDebit = () => {
        if (!user || !customer) return;
        setPasskeyAction('clearDebit');
        setIsPasskeyModalOpen(true);
    };

    const handlePasskeySuccess = async () => {
        if (!user || !customer) return;

        if (passkeyAction === 'setDebit') {
            try {
                const debitValue = parseFloat(debitInput);
                if (isNaN(debitValue) || debitValue < 0) {
                    toast.error('Please enter a valid debit amount');
                    return;
                }

                await setDoc(doc(db, `users/${user.uid}/user_data`, customerId), {
                    ...customer,
                    debitAmount: debitValue,
                });

                toast.success('Debit amount set successfully');
                setShowDebitModal(false);
                setDebitInput('');
                window.location.reload();
            } catch (error) {
                toast.error('Failed to set debit');
            }
        } else if (passkeyAction === 'clearDebit') {
            if (!confirm('Are you sure you want to clear the debit amount?')) return;

            try {
                await setDoc(doc(db, `users/${user.uid}/user_data`, customerId), {
                    ...customer,
                    debitAmount: 0,
                });

                toast.success('Debit cleared successfully');
                window.location.reload();
            } catch (error) {
                toast.error('Failed to clear debit');
            }
        }

        setIsPasskeyModalOpen(false);
        setPasskeyAction(null);
    };

    const exportPDF = () => {
        if (!customer) return;

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
        }

        // Add customer info and date range (date on left side)
        pdfDoc.setFontSize(12);
        pdfDoc.text(`Customer: ${customer.name} (ID: ${customer.customerId})`, 105, farmDetails ? 36 : 22, { align: "center" });
        pdfDoc.text(`Period: ${format(new Date(startDate), 'dd-MM-yyyy')} to ${format(new Date(endDate), 'dd-MM-yyyy')}`, farmDetails ? 20 : 20, farmDetails ? 43 : 29); // Date on left side

        // Add separator lines
        const topY = farmDetails ? 47 : 33;
        pdfDoc.line(20, topY, 190, topY);

        // Add title
        pdfDoc.setFontSize(14);
        pdfDoc.setTextColor(0, 0, 0); // Black color
        pdfDoc.text("CUSTOMER MILK RECORD", 105, topY + 8, { align: "center" });

        pdfDoc.line(20, topY + 12, 190, topY + 12);

        const headers = [["Date", "Cow (M)", "Cow (E)", "Buffalo (M)", "Buffalo (E)", "Total"]];
        const rows = records.map(r => [
            r.date,
            r.cowMorning || '-',
            r.cowEvening || '-',
            r.buffaloMorning || '-',
            r.buffaloEvening || '-',
            r.total.toFixed(1)
        ]);

        const grandTotal = records.reduce((sum, r) => sum + r.total, 0);
        const cowTotal = records.reduce((sum, r) => sum + r.cowMorning + r.cowEvening, 0);
        const buffaloTotal = records.reduce((sum, r) => sum + r.buffaloMorning + r.buffaloEvening, 0);

        const cowAmount = customer.cowRate ? cowTotal * customer.cowRate : 0;
        const buffaloAmount = customer.buffaloRate ? buffaloTotal * customer.buffaloRate : 0;
        const totalAmount = cowAmount + buffaloAmount;
        const debitAmount = customer.debitAmount || 0;
        const finalAmount = totalAmount - debitAmount;

        rows.push(["", "", "", "", "Grand Total", grandTotal.toFixed(1)]);
        if (cowAmount > 0) {
            rows.push(["", "", "", "", `Cow (${cowTotal.toFixed(1)}L)`, `PKR ${cowAmount.toFixed(2)}`]);
        }
        if (buffaloAmount > 0) {
            rows.push(["", "", "", "", `Buffalo (${buffaloTotal.toFixed(1)}L)`, `PKR ${buffaloAmount.toFixed(2)}`]);
        }
        if (totalAmount > 0) {
            rows.push(["", "", "", "", "Total Amount", `PKR ${totalAmount.toFixed(2)}`]);
        }
        if (debitAmount > 0) {
            rows.push(["", "", "", "", "Debit Amount", `PKR ${debitAmount.toFixed(2)}`]);
            rows.push(["", "", "", "", "Final Amount", `PKR ${finalAmount.toFixed(2)}`]);
        }

        autoTable(pdfDoc, {
            head: headers,
            body: rows,
            startY: topY + 20,
            theme: 'grid',
            headStyles: { fillColor: [22, 163, 74] },
            styles: { cellPadding: 3, fontSize: 10, halign: 'center' },
            columnStyles: {
                0: { halign: 'center' },
                1: { halign: 'center' },
                2: { halign: 'center' },
                3: { halign: 'center' },
                4: { halign: 'center' },
                5: { halign: 'center' }
            }
        });

        pdfDoc.save(`${customer.name}_milk_record.pdf`);
        toast.success('PDF downloaded');
    };

    const exportExcel = () => {
        if (!customer) return;

        // Create header rows
        const excelData = [];

        // Add farm details if available - Updated format with better styling
        if (farmDetails) {
            excelData.push({ A: farmDetails.farmName, B: '', C: '', D: '', E: '', F: '', G: '' });
            excelData.push({ A: `${farmDetails.city}`, B: '', C: '', D: '', E: '', F: '', G: '' });
            excelData.push({ A: `Contact: ${farmDetails.contact}`, B: '', C: '', D: '', E: '', F: '', G: '' });
            excelData.push({ A: `Customer: ${customer.name} (ID: ${customer.customerId})`, B: '', C: '', D: '', E: '', F: '', G: '' });
            excelData.push({ A: `Period: ${format(new Date(startDate), 'dd-MM-yyyy')} to ${format(new Date(endDate), 'dd-MM-yyyy')}`, B: '', C: '', D: '', E: '', F: '', G: '' });
        } else {
            // Add customer info and date range only if no farm details
            excelData.push({ A: `Customer: ${customer.name} (ID: ${customer.customerId})`, B: '', C: '', D: '', E: '', F: '', G: '' });
            excelData.push({ A: `Period: ${format(new Date(startDate), 'dd-MM-yyyy')} to ${format(new Date(endDate), 'dd-MM-yyyy')}`, B: '', C: '', D: '', E: '', F: '', G: '' });
        }

        // Add separator line
        excelData.push({ A: '----------------------------------------------------------', B: '', C: '', D: '', E: '', F: '', G: '' });

        // Add title
        excelData.push({ A: '', B: '', C: 'CUSTOMER MILK RECORD', D: '', E: '', F: '', G: '' });

        // Add another separator line
        excelData.push({ A: '----------------------------------------------------------', B: '', C: '', D: '', E: '', F: '', G: '' });

        // Add empty row
        excelData.push({ A: '', B: '', C: '', D: '', E: '', F: '', G: '' });

        // Add table data
        excelData.push({ A: 'Date', B: 'Cow (M)', C: 'Cow (E)', D: 'Buffalo (M)', E: 'Buffalo (E)', F: 'Total', G: '' });

        records.forEach(r => {
            excelData.push({
                A: r.date,
                B: r.cowMorning || '-',
                C: r.cowEvening || '-',
                D: r.buffaloMorning || '-',
                E: r.buffaloEvening || '-',
                F: r.total.toFixed(1),
                G: ''
            });
        });

        const grandTotal = records.reduce((sum, r) => sum + r.total, 0);
        const cowTotal = records.reduce((sum, r) => sum + r.cowMorning + r.cowEvening, 0);
        const buffaloTotal = records.reduce((sum, r) => sum + r.buffaloMorning + r.buffaloEvening, 0);

        const cowAmount = customer.cowRate ? cowTotal * customer.cowRate : 0;
        const buffaloAmount = customer.buffaloRate ? buffaloTotal * customer.buffaloRate : 0;
        const totalAmount = cowAmount + buffaloAmount;
        const debitAmount = customer.debitAmount || 0;
        const finalAmount = totalAmount - debitAmount;

        excelData.push({ A: '', B: '', C: '', D: '', E: 'Grand Total', F: grandTotal.toFixed(1), G: '' });
        if (cowAmount > 0) {
            excelData.push({ A: '', B: '', C: '', D: '', E: `Cow (${cowTotal.toFixed(1)}L)`, F: `PKR ${cowAmount.toFixed(2)}`, G: '' });
        }
        if (buffaloAmount > 0) {
            excelData.push({ A: '', B: '', C: '', D: '', E: `Buffalo (${buffaloTotal.toFixed(1)}L)`, F: `PKR ${buffaloAmount.toFixed(2)}`, G: '' });
        }
        if (totalAmount > 0) {
            excelData.push({ A: '', B: '', C: '', D: '', E: 'Total Amount', F: `PKR ${totalAmount.toFixed(2)}`, G: '' });
        }
        if (debitAmount > 0) {
            excelData.push({ A: '', B: '', C: '', D: '', E: 'Debit Amount', F: `PKR ${debitAmount.toFixed(2)}`, G: '' });
            excelData.push({ A: '', B: '', C: '', D: '', E: 'Final Amount', F: `PKR ${finalAmount.toFixed(2)}`, G: '' });
        }

        const ws = XLSX.utils.json_to_sheet(excelData, { skipHeader: true });

        // Set column widths
        ws['!cols'] = [
            { wch: 15 }, // A column
            { wch: 12 }, // B column
            { wch: 12 }, // C column
            { wch: 15 }, // D column
            { wch: 15 }, // E column
            { wch: 12 }, // F column
            { wch: 10 }  // G column
        ];

        // Apply styling to headers and data
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

        // Style the farm details section (green background, bold, centered)
        for (let row = 0; row <= 3; row++) {
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
        const titleRow = 7;
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

        // Style the table headers (Date, Cow (M), etc.)
        const headerRow = 10;
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
        for (let row = 11; row <= 11 + records.length + 6; row++) { // +6 for the summary rows
            for (let col = 0; col <= 6; col++) {
                const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
                if (!ws[cellRef]) continue;
                if (!ws[cellRef].s) ws[cellRef].s = {};
                ws[cellRef].s.alignment = { horizontal: "center", vertical: "center" };
            }
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Milk Record");
        XLSX.writeFile(wb, `${customer.name}_milk_record.xlsx`);
        toast.success('Excel downloaded');
    };

    const grandTotal = records.reduce((sum, r) => sum + r.total, 0);
    const cowTotal = records.reduce((sum, r) => sum + r.cowMorning + r.cowEvening, 0);
    const buffaloTotal = records.reduce((sum, r) => sum + r.buffaloMorning + r.buffaloEvening, 0);

    const cowAmount = customer?.cowRate ? cowTotal * customer.cowRate : 0;
    const buffaloAmount = customer?.buffaloRate ? buffaloTotal * customer.buffaloRate : 0;
    const totalAmount = cowAmount + buffaloAmount;
    const debitAmount = customer?.debitAmount || 0;
    const finalAmount = totalAmount - debitAmount;

    return (
        <div className="max-w-6xl mx-auto">
            {/* Farm Details Header */}
            {farmDetails && (
                <div className="bg-white rounded-lg shadow-sm p-3 mb-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">{farmDetails.farmName}</h2>
                            <p className="text-gray-600 text-sm">{farmDetails.city} | {farmDetails.contact}</p>
                        </div>
                    </div>
                </div>
            )}

            <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
            >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Users
            </button>

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {customer?.name || 'Loading...'}
                    </h1>
                    {customer && (
                        <p className="text-gray-600">Customer ID: {customer.customerId} {customer.phone && `• ${customer.phone}`}</p>
                    )}
                </div>
                {!isViewMode && (
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowDebitModal(true)}
                            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                        >
                            Set Debit
                        </button>
                        {debitAmount > 0 && (
                            <button
                                onClick={handleClearDebit}
                                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                            >
                                Clear Debit
                            </button>
                        )}
                        <button
                            onClick={exportPDF}
                            disabled={records.length === 0}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                        >
                            Export PDF
                        </button>
                        <button
                            onClick={exportExcel}
                            disabled={records.length === 0}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                        >
                            Export Excel
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h2 className="text-lg font-medium mb-4">Date Range</h2>
                <div className="grid grid-cols-2 gap-4 max-w-md">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10">Loading...</div>
            ) : records.length > 0 ? (
                <>
                    <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cow (M)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cow (E)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buff (M)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buff (E)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {records.map((record) => (
                                    <tr key={record.date}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.date}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.cowMorning || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.cowEvening || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.buffaloMorning || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.buffaloEvening || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.total.toFixed(1)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-green-50 p-6 rounded-lg shadow space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-medium text-gray-900">Grand Total Milk:</span>
                            <span className="text-2xl font-bold text-green-600">{grandTotal.toFixed(1)} Liters</span>
                        </div>
                        {(customer?.cowRate || customer?.buffaloRate) && (
                            <>
                                {customer.cowRate && cowTotal > 0 && (
                                    <div className="flex justify-between items-center pt-2 border-t border-green-200">
                                        <span className="text-md font-medium text-gray-700">Cow Milk ({cowTotal.toFixed(1)}L @ PKR {customer.cowRate}/L):</span>
                                        <span className="text-xl font-semibold text-blue-600">PKR {cowAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                {customer.buffaloRate && buffaloTotal > 0 && (
                                    <div className="flex justify-between items-center pt-2 border-t border-green-200">
                                        <span className="text-md font-medium text-gray-700">Buffalo Milk ({buffaloTotal.toFixed(1)}L @ PKR {customer.buffaloRate}/L):</span>
                                        <span className="text-xl font-semibold text-purple-600">PKR {buffaloAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-2 border-t-2 border-green-300">
                                    <span className="text-lg font-bold text-gray-900">Total Amount:</span>
                                    <span className="text-2xl font-bold text-green-600">PKR {totalAmount.toFixed(2)}</span>
                                </div>
                                {debitAmount > 0 && (
                                    <>
                                        <div className="flex justify-between items-center pt-2 border-t border-green-200">
                                            <span className="text-lg font-medium text-orange-900">Debit Amount:</span>
                                            <span className="text-2xl font-bold text-orange-600">- PKR {debitAmount.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t-2 border-green-400">
                                            <span className="text-xl font-bold text-gray-900">Final Amount:</span>
                                            <span className="text-3xl font-bold text-blue-600">PKR {finalAmount.toFixed(2)}</span>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </>
            ) : (
                <div className="text-center py-10 text-gray-500">No records found for this customer in the selected date range.</div>
            )}

            {/* Debit Modal - only shown when not in view mode */}
            {!isViewMode && showDebitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Set Debit Amount</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Enter the debit amount for {customer?.name}. This will be deducted from their total amount.
                        </p>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Debit Amount (PKR)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={debitInput}
                                onChange={(e) => setDebitInput(e.target.value)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDebitModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSetDebit}
                                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                            >
                                Set Debit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <PasskeyModal
                isOpen={isPasskeyModalOpen}
                onClose={() => {
                    setIsPasskeyModalOpen(false);
                    setPasskeyAction(null);
                }}
                onSuccess={handlePasskeySuccess}
                title={passkeyAction === 'setDebit' ? 'Confirm Debit' : 'Confirm Clear Debit'}
                description="Please enter your MPIN to continue."
            />
        </div>
    );
}