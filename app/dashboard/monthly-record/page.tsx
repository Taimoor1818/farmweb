'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Customer {
    id?: string;
    customerId: string;
    name: string;
    cowRate?: number;
    buffaloRate?: number;
    debitAmount?: number;
}

interface AggregatedData {
    customerId: string;
    name: string;
    cow_morning: number;
    cow_evening: number;
    buffalo_morning: number;
    buffalo_evening: number;
    total: number;
    cowTotal: number;
    buffaloTotal: number;
    amount: number;
}

interface DailyFarmRecord {
    date: string;
    cow_morning_total: number;
    cow_evening_total: number;
    buffalo_morning_total: number;
    buffalo_evening_total: number;
    total: number;
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
}

interface FarmDetails {
    farmName: string;
    city: string;
    country: string;
    contact: string;
    email?: string;
}

export default function MonthlyRecordPage() {
    const { user } = useAuthStore();
    const [viewMode, setViewMode] = useState<'Farm' | 'Users'>('Farm');
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [reportData, setReportData] = useState<AggregatedData[]>([]);
    const [farmRecords, setFarmRecords] = useState<DailyFarmRecord[]>([]);
    const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
    const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState<Record<string, Customer>>({});
    const [farmDetails, setFarmDetails] = useState<FarmDetails | null>(null);

    // Fetch customers
    useEffect(() => {
        if (!user) return;
        const fetchCustomers = async () => {
            const q = query(collection(db, `users/${user.uid}/user_data`));
            const snapshot = await getDocs(q);
            const custMap: Record<string, Customer> = {};
            snapshot.forEach((docSnap) => {
                const data = docSnap.data() as Customer;
                custMap[data.customerId] = { id: docSnap.id, ...data };
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

    const generateReport = async () => {
        if (!user) return;
        setLoading(true);

        try {
            if (viewMode === 'Farm') {
                // Fetch farm production records
                const farmRecordsList: DailyFarmRecord[] = [];
                
                // Get all dates in range
                const currentDate = new Date(startDate);
                const end = new Date(endDate);

                while (currentDate <= end) {
                    const dateStr = format(currentDate, 'yyyy-MM-dd');
                    const docRef = doc(db, `users/${user.uid}/farm_production`, dateStr);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        farmRecordsList.push({
                            date: dateStr,
                            cow_morning_total: data.cow_morning_total || 0,
                            cow_evening_total: data.cow_evening_total || 0,
                            buffalo_morning_total: data.buffalo_morning_total || 0,
                            buffalo_evening_total: data.buffalo_evening_total || 0,
                            total: (data.cow_morning_total || 0) + (data.cow_evening_total || 0) +
                                (data.buffalo_morning_total || 0) + (data.buffalo_evening_total || 0),
                        });
                    }

                    currentDate.setDate(currentDate.getDate() + 1);
                }

                farmRecordsList.sort((a, b) => b.date.localeCompare(a.date));
                setFarmRecords(farmRecordsList);
                
                // Fetch cash entries
                const cashQuery = query(
                    collection(db, `users/${user.uid}/cash_entries`),
                    where('date', '>=', startDate),
                    where('date', '<=', endDate)
                );
                const cashSnapshot = await getDocs(cashQuery);
                const cashList: CashEntry[] = [];
                cashSnapshot.forEach((docSnap) => {
                    cashList.push({ id: docSnap.id, ...docSnap.data() } as CashEntry);
                });
                setCashEntries(cashList);
                
                // Fetch expense entries
                const expenseQuery = query(
                    collection(db, `users/${user.uid}/expenses`),
                    where('date', '>=', startDate),
                    where('date', '<=', endDate)
                );
                const expenseSnapshot = await getDocs(expenseQuery);
                const expenseList: ExpenseEntry[] = [];
                expenseSnapshot.forEach((docSnap) => {
                    expenseList.push({ id: docSnap.id, ...docSnap.data() } as ExpenseEntry);
                });
                setExpenseEntries(expenseList);
            } else {
                // Users view - aggregate customer data
                const q = query(
                    collection(db, `users/${user.uid}/daily_records`),
                    where('__name__', '>=', startDate),
                    where('__name__', '<=', endDate)
                );

                const snapshot = await getDocs(q);
                const aggregation: Record<string, AggregatedData> = {};

                // Initialize aggregation for all known customers
                Object.values(customers).forEach(cust => {
                    aggregation[cust.customerId] = {
                        customerId: cust.customerId,
                        name: cust.name,
                        cow_morning: 0,
                        cow_evening: 0,
                        buffalo_morning: 0,
                        buffalo_evening: 0,
                        total: 0,
                        cowTotal: 0,
                        buffaloTotal: 0,
                        amount: 0,
                    };
                });

                snapshot.forEach((docSnap) => {
                    const data = docSnap.data();

                    const processShift = (shiftData: Record<string, string>, field: keyof AggregatedData, isCow: boolean) => {
                        if (!shiftData) return;
                        Object.entries(shiftData).forEach(([custId, qtyStr]) => {
                            const qty = parseFloat(qtyStr) || 0;
                            if (aggregation[custId]) {
                                (aggregation[custId][field] as number) += qty;
                                aggregation[custId].total += qty;
                                if (isCow) {
                                    aggregation[custId].cowTotal += qty;
                                } else {
                                    aggregation[custId].buffaloTotal += qty;
                                }
                            }
                        });
                    };

                    processShift(data.cow_morning, 'cow_morning', true);
                    processShift(data.cow_evening, 'cow_evening', true);
                    processShift(data.buffalo_morning, 'buffalo_morning', false);
                    processShift(data.buffalo_evening, 'buffalo_evening', false);
                });

                // Calculate amounts with separate rates
                Object.values(aggregation).forEach(item => {
                    const customer = customers[item.customerId];
                    const cowAmount = customer?.cowRate ? item.cowTotal * customer.cowRate : 0;
                    const buffaloAmount = customer?.buffaloRate ? item.buffaloTotal * customer.buffaloRate : 0;
                    item.amount = cowAmount + buffaloAmount;
                });

                const result = Object.values(aggregation)
                    .filter(item => item.total > 0)
                    .sort((a, b) => parseInt(a.customerId) - parseInt(b.customerId));

                setReportData(result);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate report');
        } finally {
            setLoading(false);
        }
    };

    const exportExcel = () => {
        if (viewMode === 'Farm') {
            if (farmRecords.length === 0) return;
            
            // Create header rows
            const excelData = [];
            
            // Add farm details in the requested format
            if (farmDetails) {
                excelData.push({ A: farmDetails.farmName, B: '', C: '', D: '', E: '', F: '', G: '' });
                excelData.push({ A: `Location: ${farmDetails.city}`, B: '', C: '', D: '', E: '', F: '', G: '' });
                excelData.push({ A: `Contact: ${farmDetails.contact}`, B: '', C: '', D: '', E: '', F: '', G: '' });
                excelData.push({ A: `Period: ${format(new Date(startDate), 'dd-MM-yyyy')} to ${format(new Date(endDate), 'dd-MM-yyyy')}`, B: '', C: '', D: '', E: '', F: '', G: '' });
            } else {
                excelData.push({ A: `Period: ${format(new Date(startDate), 'dd-MM-yyyy')} to ${format(new Date(endDate), 'dd-MM-yyyy')}`, B: '', C: '', D: '', E: '', F: '', G: '' });
            }
            
            // Add empty row
            excelData.push({ A: '', B: '', C: '', D: '', E: '', F: '', G: '' });
            
            // Add title
            excelData.push({ A: '', B: '', C: '', D: 'MONTHLY FARM PRODUCTION REPORT', E: '', F: '', G: '' });
            
            // Add empty row
            excelData.push({ A: '', B: '', C: '', D: '', E: '', F: '', G: '' });
            
            // Add table data with improved formatting
            excelData.push({ A: 'Date', B: 'Cow (M)', C: 'Cow (E)', D: 'Buffalo (M)', E: 'Buffalo (E)', F: 'Total', G: '' });
            
            farmRecords.forEach(item => {
                excelData.push({ 
                    A: item.date, 
                    B: item.cow_morning_total.toFixed(1), 
                    C: item.cow_evening_total.toFixed(1), 
                    D: item.buffalo_morning_total.toFixed(1), 
                    E: item.buffalo_evening_total.toFixed(1), 
                    F: item.total.toFixed(1),
                    G: ''
                });
            });
            
            // Add totals row
            const totalCowMorning = farmRecords.reduce((sum, record) => sum + record.cow_morning_total, 0);
            const totalCowEvening = farmRecords.reduce((sum, record) => sum + record.cow_evening_total, 0);
            const totalBuffaloMorning = farmRecords.reduce((sum, record) => sum + record.buffalo_morning_total, 0);
            const totalBuffaloEvening = farmRecords.reduce((sum, record) => sum + record.buffalo_evening_total, 0);
            const grandTotal = totalCowMorning + totalCowEvening + totalBuffaloMorning + totalBuffaloEvening;
            
            excelData.push({ A: '', B: '', C: '', D: '', E: 'Grand Total', F: grandTotal.toFixed(1), G: '' });
            
            const ws = XLSX.utils.json_to_sheet(excelData, { skipHeader: true });
            
            // Set column widths
            ws['!cols'] = [
                { wch: 15 }, // A column (Date)
                { wch: 12 }, // B column (Cow M)
                { wch: 12 }, // C column (Cow E)
                { wch: 15 }, // D column (Buffalo M)
                { wch: 15 }, // E column (Buffalo E)
                { wch: 12 }, // F column (Total)
                { wch: 10 }  // G column
            ];
            
            // Apply styling to headers and data
            const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
            
            // Style the header section (farm details)
            for (let row = 0; row <= 3; row++) {
                for (let col = 0; col <= 6; col++) {
                    const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
                    if (!ws[cellRef]) continue;
                    if (!ws[cellRef].s) ws[cellRef].s = {};
                    
                    // Farm name should be larger and bold
                    if (row === 0) {
                        ws[cellRef].s = {
                            font: { bold: true, sz: 18 },
                            fill: { fgColor: { rgb: "C6EFCE" } }, // Light green background
                            alignment: { horizontal: "center", vertical: "center" }
                        };
                    } else {
                        // Other details smaller font
                        ws[cellRef].s = {
                            font: { bold: true, sz: 12 },
                            fill: { fgColor: { rgb: "C6EFCE" } }, // Light green background
                            alignment: { horizontal: "center", vertical: "center" }
                        };
                    }
                }
            }
            
            // Style the title row
            const titleRow = 6;
            for (let col = 0; col <= 6; col++) {
                const cellRef = XLSX.utils.encode_cell({ r: titleRow, c: col });
                if (!ws[cellRef]) continue;
                if (!ws[cellRef].s) ws[cellRef].s = {};
                ws[cellRef].s = {
                    font: { bold: true, sz: 14 },
                    fill: { fgColor: { rgb: "90EE90" } }, // Green background
                    alignment: { horizontal: "center", vertical: "center" }
                };
            }
            
            // Style the table headers (Date, Cow (M), etc.)
            const headerRow = 9;
            for (let col = 0; col <= 6; col++) {
                const cellRef = XLSX.utils.encode_cell({ r: headerRow, c: col });
                if (!ws[cellRef]) continue;
                if (!ws[cellRef].s) ws[cellRef].s = {};
                ws[cellRef].s = {
                    font: { bold: true },
                    fill: { fgColor: { rgb: "D3D3D3" } }, // Light gray background
                    alignment: { horizontal: "center", vertical: "center" },
                    border: {
                        top: { style: "thin", color: { rgb: "D3D3D3" } },
                        bottom: { style: "thin", color: { rgb: "D3D3D3" } },
                        left: { style: "thin", color: { rgb: "D3D3D3" } },
                        right: { style: "thin", color: { rgb: "D3D3D3" } }
                    }
                };
            }
            
            // Style the data rows with alternating colors and proper alignment
            for (let row = 10; row <= 10 + farmRecords.length; row++) {
                for (let col = 0; col <= 6; col++) {
                    const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
                    if (!ws[cellRef]) continue;
                    if (!ws[cellRef].s) ws[cellRef].s = {};
                    
                    // Alternating row colors
                    const isEvenRow = row % 2 === 0;
                    const bgColor = isEvenRow ? "FFFFFF" : "F0F0F0"; // White or light gray
                    
                    // Alignment based on column
                    let halign = "center";
                    if (col === 0) halign = "left"; // Date column left-aligned
                    else if ([1, 2, 3, 4, 5].includes(col)) halign = "right"; // Numeric columns right-aligned
                    
                    ws[cellRef].s = {
                        fill: { fgColor: { rgb: bgColor } },
                        alignment: { horizontal: halign, vertical: "center" },
                        border: {
                            top: { style: "thin", color: { rgb: "D3D3D3" } },
                            bottom: { style: "thin", color: { rgb: "D3D3D3" } },
                            left: { style: "thin", color: { rgb: "D3D3D3" } },
                            right: { style: "thin", color: { rgb: "D3D3D3" } }
                        }
                    };
                }
            }
            
            // Style the totals row with background color
            const totalsRow = 11 + farmRecords.length;
            for (let col = 0; col <= 6; col++) {
                const cellRef = XLSX.utils.encode_cell({ r: totalsRow, c: col });
                if (!ws[cellRef]) continue;
                if (!ws[cellRef].s) ws[cellRef].s = {};
                
                // Right-align numeric columns
                const halign = col === 5 ? "right" : "center";
                
                ws[cellRef].s = {
                    font: { bold: true },
                    fill: { fgColor: { rgb: "FFFFE0" } }, // Light yellow background
                    alignment: { horizontal: halign, vertical: "center" },
                    border: {
                        top: { style: "thin", color: { rgb: "D3D3D3" } },
                        bottom: { style: "thin", color: { rgb: "D3D3D3" } },
                        left: { style: "thin", color: { rgb: "D3D3D3" } },
                        right: { style: "thin", color: { rgb: "D3D3D3" } }
                    }
                };
            }
            
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Monthly Farm Production");
            XLSX.writeFile(wb, `monthly_farm_production_${startDate}_to_${endDate}.xlsx`);
            toast.success('Excel exported');
        } else {
            if (reportData.length === 0) return;
            
            // Create header rows
            const excelData = [];
            
            // Add farm details in the requested format
            if (farmDetails) {
                excelData.push({ A: farmDetails.farmName, B: '', C: '', D: '', E: '', F: '', G: '', H: '', I: '' });
                excelData.push({ A: `Location: ${farmDetails.city}`, B: '', C: '', D: '', E: '', F: '', G: '', H: '', I: '' });
                excelData.push({ A: `Contact: ${farmDetails.contact}`, B: '', C: '', D: '', E: '', F: '', G: '', H: '', I: '' });
                excelData.push({ A: `Period: ${format(new Date(startDate), 'dd-MMM-yyyy')} to ${format(new Date(endDate), 'dd-MMM-yyyy')}`, B: '', C: '', D: '', E: '', F: '', G: '', H: '', I: '' });
            } else {
                excelData.push({ A: `Period: ${format(new Date(startDate), 'dd-MMM-yyyy')} to ${format(new Date(endDate), 'dd-MMM-yyyy')}`, B: '', C: '', D: '', E: '', F: '', G: '', H: '', I: '' });
            }
            
            // Add empty row
            excelData.push({ A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '', I: '' });
            
            // Add title
            excelData.push({ A: '', B: '', C: '', D: 'Customer Milk & Payment Summary', E: '', F: '', G: '', H: '', I: '' });
            
            // Add empty row
            excelData.push({ A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '', I: '' });
            
            // Add table data with improved formatting
            excelData.push({ A: 'ID', B: 'Name', C: 'Cow (L)', D: 'Buffalo (L)', E: 'Total (L)', F: 'Rate (PKR/L)', G: 'Amount (PKR)', H: 'Debit (PKR)', I: 'Final (PKR)' });
            
            let grandTotal = 0;
            let grandCowTotal = 0;
            let grandBuffaloTotal = 0;
            let grandAmount = 0;
            let grandDebit = 0;
            let grandFinal = 0;
            
            reportData.forEach(item => {
                const customer = customers[item.customerId];
                const cowAmount = customer?.cowRate ? item.cowTotal * customer.cowRate : 0;
                const buffaloAmount = customer?.buffaloRate ? item.buffaloTotal * customer.buffaloRate : 0;
                const totalAmount = cowAmount + buffaloAmount;
                const debitAmount = customer?.debitAmount || 0;
                const finalAmount = totalAmount - debitAmount;
                
                grandTotal += item.total;
                grandCowTotal += item.cowTotal;
                grandBuffaloTotal += item.buffaloTotal;
                grandAmount += totalAmount;
                grandDebit += debitAmount;
                grandFinal += finalAmount;
                
                excelData.push({ 
                    A: item.customerId,
                    B: item.name,
                    C: item.cowTotal.toFixed(1),
                    D: item.buffaloTotal.toFixed(1),
                    E: item.total.toFixed(1),
                    F: customer?.cowRate ? `Cow: ${customer.cowRate.toFixed(2)}\nBuffalo: ${customer.buffaloRate?.toFixed(2) || '0.00'}` : '-',
                    G: totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                    H: debitAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                    I: finalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                });
            });
            
            // Add totals row with merged cells
            excelData.push({ 
                A: '', 
                B: 'TOTAL', 
                C: grandCowTotal.toFixed(1), 
                D: grandBuffaloTotal.toFixed(1), 
                E: grandTotal.toFixed(1), 
                F: '', 
                G: grandAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
                H: grandDebit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
                I: grandFinal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
            });
            
            const ws = XLSX.utils.json_to_sheet(excelData, { skipHeader: true });
            
            // Set column widths
            ws['!cols'] = [
                { wch: 8 },  // A column (ID)
                { wch: 20 }, // B column (Name)
                { wch: 12 }, // C column (Cow)
                { wch: 12 }, // D column (Buffalo)
                { wch: 12 }, // E column (Total)
                { wch: 15 }, // F column (Rate)
                { wch: 15 }, // G column (Amount)
                { wch: 15 }, // H column (Debit)
                { wch: 15 }  // I column (Final)
            ];
            
            // Apply styling to headers and data
            const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
            
            // Style the header section (farm details)
            for (let row = 0; row <= 3; row++) {
                for (let col = 0; col <= 8; col++) {
                    const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
                    if (!ws[cellRef]) continue;
                    if (!ws[cellRef].s) ws[cellRef].s = {};
                    
                    // Farm name should be larger and bold
                    if (row === 0) {
                        ws[cellRef].s = {
                            font: { bold: true, sz: 18 },
                            fill: { fgColor: { rgb: "C6EFCE" } }, // Light green background
                            alignment: { horizontal: "center", vertical: "center" }
                        };
                    } else {
                        // Other details smaller font
                        ws[cellRef].s = {
                            font: { bold: true, sz: 12 },
                            fill: { fgColor: { rgb: "C6EFCE" } }, // Light green background
                            alignment: { horizontal: "center", vertical: "center" }
                        };
                    }
                }
            }
            
            // Style the title row
            const titleRow = 7;
            for (let col = 0; col <= 8; col++) {
                const cellRef = XLSX.utils.encode_cell({ r: titleRow, c: col });
                if (!ws[cellRef]) continue;
                if (!ws[cellRef].s) ws[cellRef].s = {};
                ws[cellRef].s = {
                    font: { bold: true, sz: 14 },
                    fill: { fgColor: { rgb: "90EE90" } }, // Green background
                    alignment: { horizontal: "center", vertical: "center" }
                };
            }
            
            // Style the separator lines
            const separatorRow1 = 6;
            const separatorRow2 = 9;
            for (let col = 0; col <= 8; col++) {
                // First separator
                const cellRef1 = XLSX.utils.encode_cell({ r: separatorRow1, c: col });
                if (!ws[cellRef1]) continue;
                if (!ws[cellRef1].s) ws[cellRef1].s = {};
                ws[cellRef1].s = {
                    font: { bold: true },
                    fill: { fgColor: { rgb: "90EE90" } }, // Green background
                    alignment: { horizontal: "center", vertical: "center" }
                };
                
                // Second separator
                const cellRef2 = XLSX.utils.encode_cell({ r: separatorRow2, c: col });
                if (!ws[cellRef2]) continue;
                if (!ws[cellRef2].s) ws[cellRef2].s = {};
                ws[cellRef2].s = {
                    font: { bold: true },
                    fill: { fgColor: { rgb: "90EE90" } }, // Green background
                    alignment: { horizontal: "center", vertical: "center" }
                };
            }
            
            // Style the table headers (ID, Name, etc.)
            const headerRow = 10;
            for (let col = 0; col <= 8; col++) {
                const cellRef = XLSX.utils.encode_cell({ r: headerRow, c: col });
                if (!ws[cellRef]) continue;
                if (!ws[cellRef].s) ws[cellRef].s = {};
                ws[cellRef].s = {
                    font: { bold: true },
                    fill: { fgColor: { rgb: "D3D3D3" } }, // Light gray background
                    alignment: { horizontal: "center", vertical: "center" }
                };
            }
            
            // Style the data rows with alternating colors
            for (let row = 11; row <= 11 + reportData.length; row++) {
                for (let col = 0; col <= 8; col++) {
                    const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
                    if (!ws[cellRef]) continue;
                    if (!ws[cellRef].s) ws[cellRef].s = {};
                    
                    // Alternating row colors
                    const isEvenRow = row % 2 === 0;
                    const bgColor = isEvenRow ? "FFFFFF" : "F0F0F0"; // White or light gray
                    
                    // Right-align numeric columns (C, D, E, G, H, I)
                    const isNumericColumn = [2, 3, 4, 6, 7, 8].includes(col);
                    
                    ws[cellRef].s = {
                        fill: { fgColor: { rgb: bgColor } },
                        alignment: { 
                            horizontal: isNumericColumn ? "right" : "center", 
                            vertical: "center" 
                        }
                    };
                }
            }
            
            // Style the totals row with background color
            const totalsRow = 12 + reportData.length;
            for (let col = 0; col <= 8; col++) {
                const cellRef = XLSX.utils.encode_cell({ r: totalsRow, c: col });
                if (!ws[cellRef]) continue;
                if (!ws[cellRef].s) ws[cellRef].s = {};
                ws[cellRef].s = {
                    font: { bold: true },
                    fill: { fgColor: { rgb: "FFFFE0" } }, // Light yellow background
                    alignment: { 
                        horizontal: [2, 3, 4, 6, 7, 8].includes(col) ? "right" : "center", 
                        vertical: "center" 
                    }
                };
            }
            
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Monthly Customer Report");
            XLSX.writeFile(wb, `monthly_customer_report_${startDate}_to_${endDate}.xlsx`);
            toast.success('Excel exported');
        }
    };

    // Add generatePDF function for monthly records
    const generatePDF = () => {
        if (viewMode === 'Farm') {
            if (farmRecords.length === 0) return;
            
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
                
                // Add date range on left side
                pdfDoc.text(`Period: ${format(new Date(startDate), 'dd-MM-yyyy')} to ${format(new Date(endDate), 'dd-MM-yyyy')}`, 20, 36);
            } else {
                // Add date range only if no farm details (on left side)
                pdfDoc.setFontSize(12);
                pdfDoc.text(`Period: ${format(new Date(startDate), 'dd-MM-yyyy')} to ${format(new Date(endDate), 'dd-MM-yyyy')}`, 20, 15);
            }
            
            // Add separator lines
            const topY = farmDetails ? 42 : 22;
            pdfDoc.line(20, topY, 190, topY);
            
            // Add title
            pdfDoc.setFontSize(14);
            pdfDoc.setTextColor(0, 0, 0); // Black color
            pdfDoc.text("MONTHLY FARM PRODUCTION REPORT", 105, topY + 8, { align: "center" });
            
            pdfDoc.line(20, topY + 12, 190, topY + 12);
            
            // Add table data
            const headers = [["Date", "Cow (M)", "Cow (E)", "Buffalo (M)", "Buffalo (E)", "Total"]];
            const rows = farmRecords.map(item => [
                item.date,
                item.cow_morning_total.toFixed(1),
                item.cow_evening_total.toFixed(1),
                item.buffalo_morning_total.toFixed(1),
                item.buffalo_evening_total.toFixed(1),
                item.total.toFixed(1)
            ]);
            
            // Add totals row
            const totalCowMorning = farmRecords.reduce((sum, record) => sum + record.cow_morning_total, 0);
            const totalCowEvening = farmRecords.reduce((sum, record) => sum + record.cow_evening_total, 0);
            const totalBuffaloMorning = farmRecords.reduce((sum, record) => sum + record.buffalo_morning_total, 0);
            const totalBuffaloEvening = farmRecords.reduce((sum, record) => sum + record.buffalo_evening_total, 0);
            const grandTotal = totalCowMorning + totalCowEvening + totalBuffaloMorning + totalBuffaloEvening;
            
            rows.push(["", "", "", "", "Grand Total", grandTotal.toFixed(1)]);
            
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
            
            pdfDoc.save(`monthly_farm_production_${startDate}_to_${endDate}.pdf`);
            toast.success('PDF downloaded');
        } else {
            if (reportData.length === 0) return;
            
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
            
            // Add date range
            pdfDoc.setFontSize(12);
            pdfDoc.text(`Period: ${format(new Date(startDate), 'dd-MM-yyyy')} to ${format(new Date(endDate), 'dd-MM-yyyy')}`, 105, farmDetails ? 36 : 22, { align: "center" });
            
            // Add separator lines
            const topY = farmDetails ? 40 : 30;
            pdfDoc.line(20, topY, 190, topY);
            
            // Add title
            pdfDoc.setFontSize(14);
            pdfDoc.setTextColor(22, 163, 74); // Green color
            pdfDoc.text("MONTHLY CUSTOMER REPORT", 105, topY + 8, { align: "center" });
            
            pdfDoc.line(20, topY + 12, 190, topY + 12);
            
            // Add table data
            const headers = [["ID", "Name", "Cow (M)", "Cow (E)", "Buffalo (M)", "Buffalo (E)", "Total", "Amount (PKR)"]];
            const rows = reportData.map(item => [
                item.customerId,
                item.name,
                item.cow_morning.toFixed(1),
                item.cow_evening.toFixed(1),
                item.buffalo_morning.toFixed(1),
                item.buffalo_evening.toFixed(1),
                item.total.toFixed(1),
                item.amount.toFixed(2)
            ]);
            
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
                    6: { halign: 'center' },
                    7: { halign: 'center' }
                }
            });
            
            pdfDoc.save(`monthly_customer_report_${startDate}_to_${endDate}.pdf`);
            toast.success('PDF downloaded');
        }
    };

    // Calculate totals for farm view
    const totalCowMorning = farmRecords.reduce((sum, record) => sum + record.cow_morning_total, 0);
    const totalCowEvening = farmRecords.reduce((sum, record) => sum + record.cow_evening_total, 0);
    const totalBuffaloMorning = farmRecords.reduce((sum, record) => sum + record.buffalo_morning_total, 0);
    const totalBuffaloEvening = farmRecords.reduce((sum, record) => sum + record.buffalo_evening_total, 0);
    const totalCow = totalCowMorning + totalCowEvening;
    const totalBuffalo = totalBuffaloMorning + totalBuffaloEvening;
    const grandTotal = totalCow + totalBuffalo;
    
    // Calculate cash totals
    const totalCashIn = cashEntries.filter(entry => entry.type === 'Credit').reduce((sum, entry) => sum + entry.amount, 0);
    const totalCashOut = cashEntries.filter(entry => entry.type === 'Debit').reduce((sum, entry) => sum + entry.amount, 0);
    const netCashFlow = totalCashIn - totalCashOut;
    
    // Calculate expense totals
    const totalExpenses = expenseEntries.reduce((sum, entry) => sum + entry.amount, 0);

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
                <h1 className="text-2xl font-bold text-gray-900">Monthly Record</h1>
                <div className="flex gap-4 items-center">
                    <ToggleSwitch
                        options={['Farm', 'Users']}
                        selected={viewMode}
                        onChange={(value) => setViewMode(value as 'Farm' | 'Users')}
                    />
                    <button
                        onClick={generatePDF}
                        disabled={(viewMode === 'Farm' ? farmRecords.length : reportData.length) === 0}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        Export PDF
                    </button>
                    <button
                        onClick={exportExcel}
                        disabled={(viewMode === 'Farm' ? farmRecords.length : reportData.length) === 0}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
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

            <div className="bg-white p-6 rounded-lg shadow mb-6 flex gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">End Date</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                    />
                </div>
                <button
                    onClick={generateReport}
                    disabled={loading}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                    {loading ? 'Generating...' : 'Generate Report'}
                </button>
            </div>

            {viewMode === 'Farm' ? (
                <div className="space-y-6">
                    {/* Farm Production Section */}
                    <div className="bg-white shadow overflow-hidden sm:rounded-lg overflow-x-auto">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                            <h2 className="text-lg font-medium text-gray-900">Farm Production Records</h2>
                        </div>
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
                                {farmRecords.map((item) => (
                                    <tr key={item.date}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.date}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.cow_morning_total.toFixed(1)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.cow_evening_total.toFixed(1)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.buffalo_morning_total.toFixed(1)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.buffalo_evening_total.toFixed(1)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{item.total.toFixed(1)}</td>
                                    </tr>
                                ))}
                                {farmRecords.length === 0 && !loading && (
                                    <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500">No data generated. Select date range and click Generate.</td></tr>
                                )}
                                {farmRecords.length > 0 && (
                                    <tr className="bg-gray-50 font-bold">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Totals</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{totalCowMorning.toFixed(1)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{totalCowEvening.toFixed(1)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{totalBuffaloMorning.toFixed(1)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{totalBuffaloEvening.toFixed(1)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{grandTotal.toFixed(1)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Separate Cow and Buffalo Totals */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Cow Milk Card - Modern Elegant Design */}
                        <div className="relative overflow-hidden rounded-2xl shadow-lg bg-gradient-to-br from-blue-100 via-white to-blue-200 p-8 border border-blue-200">
                            <div className="absolute top-4 right-4 opacity-20 text-blue-400" style={{fontSize: '3rem'}}>
                                🐄
                            </div>
                            <h3 className="text-2xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                                Cow Milk Summary
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Morning Total</span>
                                    <span className="font-semibold text-blue-700 text-xl">{totalCowMorning.toFixed(1)} L</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Evening Total</span>
                                    <span className="font-semibold text-blue-700 text-xl">{totalCowEvening.toFixed(1)} L</span>
                                </div>
                                <div className="flex justify-between items-center border-t pt-3 mt-2">
                                    <span className="font-medium text-blue-900">Cow Milk Total</span>
                                    <span className="font-bold text-2xl text-blue-900">{totalCow.toFixed(1)} L</span>
                                </div>
                            </div>
                        </div>

                        {/* Buffalo Milk Card - Modern Elegant Design */}
                        <div className="relative overflow-hidden rounded-2xl shadow-lg bg-gradient-to-br from-purple-100 via-white to-purple-200 p-8 border border-purple-200">
                            <div className="absolute top-4 right-4 opacity-20 text-purple-400" style={{fontSize: '3rem'}}>
                                🐃
                            </div>
                            <h3 className="text-2xl font-bold text-purple-900 mb-4 flex items-center gap-2">
                                Buffalo Milk Summary
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Morning Total</span>
                                    <span className="font-semibold text-purple-700 text-xl">{totalBuffaloMorning.toFixed(1)} L</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Evening Total</span>
                                    <span className="font-semibold text-purple-700 text-xl">{totalBuffaloEvening.toFixed(1)} L</span>
                                </div>
                                <div className="flex justify-between items-center border-t pt-3 mt-2">
                                    <span className="font-medium text-purple-900">Buffalo Milk Total</span>
                                    <span className="font-bold text-2xl text-purple-900">{totalBuffalo.toFixed(1)} L</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Cash Entries */}
                    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                            <h2 className="text-lg font-medium text-gray-900">Cash Entries</h2>
                        </div>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (PKR)</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {cashEntries.map((entry) => (
                                    <tr key={entry.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.date}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{entry.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                entry.type === 'Credit' 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {entry.type}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                                            entry.type === 'Credit' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'
                                        }`}>
                                            {entry.type === 'Credit' ? '+' : '-'} {entry.amount.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                                {cashEntries.length === 0 && (
                                    <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No cash entries found for the selected period.</td></tr>
                                )}
                                {cashEntries.length > 0 && (
                                    <tr className="bg-gray-50 font-bold">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" colSpan={3}>Totals</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <div className="space-y-1">
                                                <div className="text-green-600">+ {totalCashIn.toFixed(2)} (In)</div>
                                                <div className="text-red-600">- {totalCashOut.toFixed(2)} (Out)</div>
                                                <div className={netCashFlow >= 0 ? "text-green-700" : "text-red-700"}>
                                                    Net: {netCashFlow >= 0 ? '+' : ''}{netCashFlow.toFixed(2)}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Expense Entries */}
                    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                            <h2 className="text-lg font-medium text-gray-900">Expense Entries</h2>
                        </div>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (PKR)</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {expenseEntries.map((entry) => (
                                    <tr key={entry.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.date}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{entry.item}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.category}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">- {entry.amount.toFixed(2)}</td>
                                    </tr>
                                ))}
                                {expenseEntries.length === 0 && (
                                    <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No expenses found for the selected period.</td></tr>
                                )}
                                {expenseEntries.length > 0 && (
                                    <tr className="bg-gray-50 font-bold">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" colSpan={3}>Total Expenses</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">- {totalExpenses.toFixed(2)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cow (M)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cow (E)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buff (M)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buff (E)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reportData.map((item) => (
                                <tr key={item.customerId} className="hover:bg-gray-50 cursor-pointer">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <Link href={`/dashboard/users/${item.customerId}?view=true`} className="text-indigo-600 hover:text-indigo-900 hover:underline">
                                            {item.customerId}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        <Link href={`/dashboard/users/${item.customerId}?view=true`} className="text-indigo-600 hover:text-indigo-900 hover:underline">
                                            {item.name}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.cow_morning.toFixed(1)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.cow_evening.toFixed(1)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.buffalo_morning.toFixed(1)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.buffalo_evening.toFixed(1)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{item.total.toFixed(1)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">PKR {item.amount.toFixed(2)}</td>
                                </tr>
                            ))}
                            {reportData.length === 0 && !loading && (
                                <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-500">No data generated. Select date range and click Generate.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}