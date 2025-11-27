'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, query, onSnapshot, doc, updateDoc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { toast } from 'react-hot-toast';
import { Tab } from '@headlessui/react';
import { PlusIcon, TrashIcon, CheckCircleIcon, XCircleIcon, CurrencyRupeeIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ');
}

interface Employee {
    id: string;
    name: string;
    role: string;
    salary: number;
}

interface Payment {
    id: string;
    employeeId: string;
    employeeName: string;
    amount: number;
    date: string;
    status: 'Pending' | 'Received';
    createdAt: any;
}

interface FarmDetails {
    farmName: string;
    city: string;
    country: string;
    contact: string;
    email?: string;
}

export default function PaymentsPage() {
    const { user } = useAuthStore();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [employeePayments, setEmployeePayments] = useState<Payment[]>([]);
    const [farmDetails, setFarmDetails] = useState<FarmDetails | null>(null);

    // Employee Form
    const [empName, setEmpName] = useState('');
    const [empRole, setEmpRole] = useState('');
    const [empSalary, setEmpSalary] = useState('');

    // Payment Form
    const [payEmpId, setPayEmpId] = useState('');
    const [payAmount, setPayAmount] = useState('');
    const [payDate, setPayDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    useEffect(() => {
        if (!user) return;

        // Fetch Employees
        const unsubEmp = onSnapshot(collection(db, `users/${user.uid}/employees`), (snap) => {
            const list: Employee[] = [];
            snap.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Employee));
            setEmployees(list);
        });

        // Fetch Payments
        const unsubPay = onSnapshot(query(collection(db, `users/${user.uid}/issued_payments`)), (snap) => {
            const list: Payment[] = [];
            snap.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Payment));
            // Sort by date desc
            list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setPayments(list);
            setLoading(false);
        });

        return () => {
            unsubEmp();
            unsubPay();
        };
    }, [user]);

    // Fetch payments for selected employee
    useEffect(() => {
        if (!user || !selectedEmployee) {
            setEmployeePayments([]);
            return;
        }

        const q = query(collection(db, `users/${user.uid}/issued_payments`));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: Payment[] = [];
            snapshot.forEach((doc) => {
                const payment = { id: doc.id, ...doc.data() } as Payment;
                if (payment.employeeId === selectedEmployee.id) {
                    list.push(payment);
                }
            });
            // Sort by date desc
            list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setEmployeePayments(list);
        });

        return () => unsubscribe();
    }, [user, selectedEmployee]);

    const addEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        try {
            await addDoc(collection(db, `users/${user.uid}/employees`), {
                name: empName,
                role: empRole,
                salary: parseFloat(empSalary),
            });
            toast.success('Employee added');
            setEmpName('');
            setEmpRole('');
            setEmpSalary('');
        } catch (error) {
            toast.error('Failed to add employee');
        }
    };

    const issuePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        const emp = employees.find(e => e.id === payEmpId);
        if (!emp) return;

        try {
            await addDoc(collection(db, `users/${user.uid}/issued_payments`), {
                employeeId: payEmpId,
                employeeName: emp.name,
                amount: parseFloat(payAmount),
                date: payDate,
                status: 'Pending',
                createdAt: new Date(),
            });
            toast.success('Payment issued');
            setPayAmount('');
        } catch (error) {
            toast.error('Failed to issue payment');
        }
    };

    const toggleStatus = async (payment: Payment) => {
        if (!user) return;
        const newStatus = payment.status === 'Pending' ? 'Received' : 'Pending';
        try {
            await updateDoc(doc(db, `users/${user.uid}/issued_payments`, payment.id), {
                status: newStatus
            });
            toast.success(`Marked as ${newStatus}`);
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const deleteEmployee = async (id: string) => {
        if (!user || !confirm('Delete employee?')) return;
        try {
            await deleteDoc(doc(db, `users/${user.uid}/employees`, id));
            toast.success('Employee deleted');
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

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

    const exportPayments = () => {
        // Get current date for header
        const currentDate = format(new Date(), 'dd-MM-yyyy');
        
        // Create header rows
        const excelData = [];
        
        // Add farm details if available
        if (farmDetails) {
            excelData.push({ A: farmDetails.farmName, B: '', C: '', D: '', E: '' });
            excelData.push({ A: `${farmDetails.city}, ${farmDetails.country}`, B: '', C: '', D: '', E: '' });
            excelData.push({ A: `Contact: ${farmDetails.contact}`, B: '', C: '', D: '', E: '' });
        }
        
        // Add date
        excelData.push({ A: `Date: ${currentDate}`, B: '', C: '', D: '', E: '' });
        
        // Add separator line
        excelData.push({ A: '----------------------------------------------------------', B: '', C: '', D: '', E: '' });
        
        // Add title
        excelData.push({ A: '', B: '', C: 'PAYMENTS RECORD', D: '', E: '' });
        
        // Add another separator line
        excelData.push({ A: '----------------------------------------------------------', B: '', C: '', D: '', E: '' });
        
        // Add empty row
        excelData.push({ A: '', B: '', C: '', D: '', E: '' });
        
        // Add table data
        excelData.push({ A: 'Date', B: 'Employee', C: 'Amount', D: 'Status', E: '' });
        
        payments.forEach(p => {
            excelData.push({ 
                A: p.date,
                B: p.employeeName,
                C: p.amount,
                D: p.status,
                E: ''
            });
        });
        
        const ws = XLSX.utils.json_to_sheet(excelData, { skipHeader: true });
        
        // Set column widths
        ws['!cols'] = [
            { wch: 15 }, // A column
            { wch: 20 }, // B column
            { wch: 15 }, // C column
            { wch: 15 }, // D column
            { wch: 10 }  // E column
        ];
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Payments");
        XLSX.writeFile(wb, "payments.xlsx");
        toast.success('Payments exported');
    };

    const handleEmployeeClick = (employee: Employee) => {
        setSelectedEmployee(employee);
    };

    const closeEmployeeDetails = () => {
        setSelectedEmployee(null);
    };

    // Calculate payment statistics
    const totalPaid = employeePayments
        .filter(p => p.status === 'Received')
        .reduce((sum, p) => sum + p.amount, 0);
        
    const totalPending = employeePayments
        .filter(p => p.status === 'Pending')
        .reduce((sum, p) => sum + p.amount, 0);

    return (
        <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Issue Payments</h1>

            {selectedEmployee ? (
                // Employee Details View
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{selectedEmployee.name}</h2>
                            <p className="text-gray-600">{selectedEmployee.role} • Salary: PKR {selectedEmployee.salary}</p>
                        </div>
                        <button
                            onClick={closeEmployeeDetails}
                            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                        >
                            Back to All Employees
                        </button>
                    </div>
                    
                    {/* Payment Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 border-b border-gray-200">
                        <div className="bg-green-50 p-4 rounded-lg">
                            <div className="flex items-center">
                                <CurrencyRupeeIcon className="h-8 w-8 text-green-600" />
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-green-900">Total Paid</p>
                                    <p className="text-2xl font-bold text-green-700">PKR {totalPaid.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg">
                            <div className="flex items-center">
                                <CurrencyRupeeIcon className="h-8 w-8 text-yellow-600" />
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-yellow-900">Pending Payments</p>
                                    <p className="text-2xl font-bold text-yellow-700">PKR {totalPending.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="flex items-center">
                                <CurrencyRupeeIcon className="h-8 w-8 text-blue-600" />
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-blue-900">Total Payments</p>
                                    <p className="text-2xl font-bold text-blue-700">PKR {(totalPaid + totalPending).toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Payment History */}
                    <div className="p-6">
                        <h3 className="text-lg font-medium mb-4">Payment History</h3>
                        {employeePayments.length > 0 ? (
                            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                                <ul className="divide-y divide-gray-200">
                                    {employeePayments.map((payment) => (
                                        <li key={payment.id} className="px-6 py-4 hover:bg-gray-50">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-lg font-semibold text-gray-900">PKR {payment.amount}</p>
                                                    <p className="text-sm text-gray-500">
                                                        Date: {payment.date}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => toggleStatus(payment)}
                                                    className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${payment.status === 'Received' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                        }`}
                                                >
                                                    {payment.status === 'Received' ? (
                                                        <CheckCircleIcon className="h-5 w-5 mr-1" />
                                                    ) : (
                                                        <XCircleIcon className="h-5 w-5 mr-1" />
                                                    )}
                                                    {payment.status}
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <div className="text-center py-10 text-gray-500">
                                No payment history found for {selectedEmployee.name}.
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                // Main Tabs View
                <Tab.Group>
                    <Tab.List className="flex space-x-1 rounded-xl bg-green-900/20 p-1 mb-6">
                        <Tab className={({ selected }) =>
                            classNames(
                                'w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-green-700',
                                'ring-white ring-opacity-60 ring-offset-2 ring-offset-green-400 focus:outline-none focus:ring-2',
                                selected ? 'bg-white shadow' : 'text-green-100 hover:bg-white/[0.12] hover:text-white'
                            )
                        }>
                            Payments
                        </Tab>
                        <Tab className={({ selected }) =>
                            classNames(
                                'w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-green-700',
                                'ring-white ring-opacity-60 ring-offset-2 ring-offset-green-400 focus:outline-none focus:ring-2',
                                selected ? 'bg-white shadow' : 'text-green-100 hover:bg-white/[0.12] hover:text-white'
                            )
                        }>
                            Employees
                        </Tab>
                    </Tab.List>
                    <Tab.Panels>
                        <Tab.Panel>
                            <div className="bg-white p-6 rounded-lg shadow mb-6">
                                <h2 className="text-lg font-medium mb-4">Issue New Payment</h2>
                                <form onSubmit={issuePayment} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Employee</label>
                                        <select
                                            value={payEmpId}
                                            onChange={(e) => setPayEmpId(e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                                            required
                                        >
                                            <option value="">Select Employee</option>
                                            {employees.map(e => (
                                                <option key={e.id} value={e.id}>{e.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Amount</label>
                                        <input
                                            type="number"
                                            value={payAmount}
                                            onChange={(e) => setPayAmount(e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Date</label>
                                        <input
                                            type="date"
                                            value={payDate}
                                            onChange={(e) => setPayDate(e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                                    >
                                        Issue Payment
                                    </button>
                                </form>
                            </div>

                            <div className="flex justify-end mb-4">
                                <button
                                    onClick={exportPayments}
                                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                                >
                                    Export Excel
                                </button>
                            </div>

                            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                                <ul className="divide-y divide-gray-200">
                                    {payments.map((payment) => (
                                        <li key={payment.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                                            <div>
                                                <p className="text-lg font-semibold text-gray-900">{payment.employeeName}</p>
                                                <p className="text-sm text-gray-500">
                                                    Date: {payment.date} | Amount: PKR {payment.amount}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => toggleStatus(payment)}
                                                className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${payment.status === 'Received' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                    }`}
                                            >
                                                {payment.status === 'Received' ? (
                                                    <CheckCircleIcon className="h-5 w-5 mr-1" />
                                                ) : (
                                                    <XCircleIcon className="h-5 w-5 mr-1" />
                                                )}
                                                {payment.status}
                                            </button>
                                        </li>
                                    ))}
                                    {payments.length === 0 && !loading && (
                                        <li className="px-6 py-10 text-center text-gray-500">No payments found.</li>
                                    )}
                                </ul>
                            </div>
                        </Tab.Panel>

                        <Tab.Panel>
                            <div className="bg-white p-6 rounded-lg shadow mb-6">
                                <h2 className="text-lg font-medium mb-4">Add Employee</h2>
                                <form onSubmit={addEmployee} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Name</label>
                                        <input
                                            type="text"
                                            value={empName}
                                            onChange={(e) => setEmpName(e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Role</label>
                                        <input
                                            type="text"
                                            value={empRole}
                                            onChange={(e) => setEmpRole(e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Salary</label>
                                        <input
                                            type="number"
                                            value={empSalary}
                                            onChange={(e) => setEmpSalary(e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 border"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                                    >
                                        Add Employee
                                    </button>
                                </form>
                            </div>

                            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                                <ul className="divide-y divide-gray-200">
                                    {employees.map((emp) => (
                                        <li 
                                            key={emp.id} 
                                            className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                                            onClick={() => handleEmployeeClick(emp)}
                                        >
                                            <div>
                                                <p className="text-lg font-semibold text-gray-900">{emp.name}</p>
                                                <p className="text-sm text-gray-500">Role: {emp.role} | Salary: PKR {emp.salary}</p>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteEmployee(emp.id);
                                                    }}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                                <span className="text-green-600">
                                                    <PlusIcon className="h-5 w-5" />
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                    {employees.length === 0 && !loading && (
                                        <li className="px-6 py-10 text-center text-gray-500">No employees found.</li>
                                    )}
                                </ul>
                            </div>
                        </Tab.Panel>
                    </Tab.Panels>
                </Tab.Group>
            )}
        </div>
    );
}