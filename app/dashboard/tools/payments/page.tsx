'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { toast } from 'react-hot-toast';
import { Tab } from '@headlessui/react';
import { PlusIcon, TrashIcon, CheckCircleIcon, XCircleIcon, CurrencyDollarIcon, UserGroupIcon, DocumentArrowDownIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
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

export default function PaymentsPage() {
    const { user } = useAuthStore();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [employeePayments, setEmployeePayments] = useState<Payment[]>([]);

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

    const exportPayments = () => {
        const excelData = [];
        excelData.push({ A: 'PAYMENTS RECORD', B: '', C: '', D: '', E: '' });
        excelData.push({ A: `Date: ${format(new Date(), 'dd-MM-yyyy')}`, B: '', C: '', D: '', E: '' });
        excelData.push({ A: '', B: '', C: '', D: '', E: '' });
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
        ws['!cols'] = [
            { wch: 15 },
            { wch: 20 },
            { wch: 15 },
            { wch: 15 },
            { wch: 10 }
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-orange-50/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {selectedEmployee ? (
                    // Employee Details View
                    <div>
                        <button
                            onClick={closeEmployeeDetails}
                            className="mb-6 flex items-center px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-xl transition-all duration-200"
                        >
                            <ArrowLeftIcon className="h-5 w-5 mr-2" />
                            Back to All Employees
                        </button>

                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden">
                            <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-8 text-white">
                                <div className="flex items-center space-x-4">
                                    <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                                        <UserGroupIcon className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold">{selectedEmployee.name}</h2>
                                        <p className="text-amber-100">{selectedEmployee.role} • Salary: PKR {selectedEmployee.salary.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Statistics */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 border-b border-slate-200">
                                <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-2xl border border-emerald-200/50">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-emerald-900">Total Paid</p>
                                            <p className="text-3xl font-bold text-emerald-700 mt-1">PKR {totalPaid.toLocaleString()}</p>
                                        </div>
                                        <CheckCircleIcon className="h-8 w-8 text-emerald-600" />
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-6 rounded-2xl border border-amber-200/50">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-amber-900">Pending</p>
                                            <p className="text-3xl font-bold text-amber-700 mt-1">PKR {totalPending.toLocaleString()}</p>
                                        </div>
                                        <XCircleIcon className="h-8 w-8 text-amber-600" />
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200/50">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-blue-900">Total</p>
                                            <p className="text-3xl font-bold text-blue-700 mt-1">PKR {(totalPaid + totalPending).toLocaleString()}</p>
                                        </div>
                                        <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
                                    </div>
                                </div>
                            </div>

                            {/* Payment History */}
                            <div className="p-6">
                                <h3 className="text-lg font-semibold text-slate-900 mb-4">Payment History</h3>
                                {employeePayments.length > 0 ? (
                                    <div className="space-y-3">
                                        {employeePayments.map((payment) => (
                                            <div key={payment.id} className="bg-white rounded-xl p-4 border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all duration-200">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-lg font-bold text-slate-900">PKR {payment.amount.toLocaleString()}</p>
                                                        <p className="text-sm text-slate-500">Date: {payment.date}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => toggleStatus(payment)}
                                                        className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${payment.status === 'Received'
                                                                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700'
                                                                : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700'
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
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-xl">
                                        No payment history found for {selectedEmployee.name}.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    // Main Tabs View
                    <div>
                        {/* Header */}
                        <div className="mb-8">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg">
                                    <CurrencyDollarIcon className="h-8 w-8 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                                        Issue Payments
                                    </h1>
                                    <p className="text-slate-600 mt-1">Manage employee payments and salaries</p>
                                </div>
                            </div>
                        </div>

                        <Tab.Group>
                            <Tab.List className="flex space-x-2 rounded-2xl bg-white/80 backdrop-blur-sm p-2 mb-8 shadow-lg border border-slate-200/50">
                                <Tab className={({ selected }) =>
                                    classNames(
                                        'w-full rounded-xl py-3 text-sm font-semibold leading-5 transition-all duration-200',
                                        'focus:outline-none focus:ring-2 focus:ring-amber-500/50',
                                        selected
                                            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg'
                                            : 'text-slate-600 hover:bg-slate-100'
                                    )
                                }>
                                    Payments
                                </Tab>
                                <Tab className={({ selected }) =>
                                    classNames(
                                        'w-full rounded-xl py-3 text-sm font-semibold leading-5 transition-all duration-200',
                                        'focus:outline-none focus:ring-2 focus:ring-amber-500/50',
                                        selected
                                            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg'
                                            : 'text-slate-600 hover:bg-slate-100'
                                    )
                                }>
                                    Employees
                                </Tab>
                            </Tab.List>
                            <Tab.Panels>
                                <Tab.Panel>
                                    {/* Issue Payment Form */}
                                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6 mb-6">
                                        <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
                                            <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg mr-3">
                                                <CurrencyDollarIcon className="h-5 w-5 text-amber-600" />
                                            </div>
                                            Issue New Payment
                                        </h2>
                                        <form onSubmit={issuePayment} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Employee</label>
                                                <select
                                                    value={payEmpId}
                                                    onChange={(e) => setPayEmpId(e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all duration-200 outline-none"
                                                    required
                                                >
                                                    <option value="">Select Employee</option>
                                                    {employees.map(e => (
                                                        <option key={e.id} value={e.id}>{e.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Amount</label>
                                                <input
                                                    type="number"
                                                    value={payAmount}
                                                    onChange={(e) => setPayAmount(e.target.value)}
                                                    placeholder="0"
                                                    className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all duration-200 outline-none"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                                                <input
                                                    type="date"
                                                    value={payDate}
                                                    onChange={(e) => setPayDate(e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all duration-200 outline-none"
                                                    required
                                                />
                                            </div>
                                            <div className="flex items-end">
                                                <button
                                                    type="submit"
                                                    className="w-full px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl hover:from-amber-700 hover:to-orange-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 font-medium"
                                                >
                                                    Issue Payment
                                                </button>
                                            </div>
                                        </form>
                                    </div>

                                    <div className="flex justify-end mb-4">
                                        <button
                                            onClick={exportPayments}
                                            className="flex items-center px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                                        >
                                            <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                                            Export Excel
                                        </button>
                                    </div>

                                    {/* Payments List */}
                                    <div className="space-y-3">
                                        {payments.map((payment) => (
                                            <div key={payment.id} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl border border-slate-200/50 hover:border-amber-300/50 transition-all duration-300 p-6">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xl font-bold text-slate-900">{payment.employeeName}</p>
                                                        <p className="text-sm text-slate-600 mt-1">
                                                            Date: {payment.date} • Amount: PKR {payment.amount.toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => toggleStatus(payment)}
                                                        className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${payment.status === 'Received'
                                                                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700'
                                                                : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700'
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
                                            </div>
                                        ))}
                                        {payments.length === 0 && !loading && (
                                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-12 text-center">
                                                <div className="flex flex-col items-center">
                                                    <div className="p-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full mb-4">
                                                        <CurrencyDollarIcon className="h-12 w-12 text-slate-400" />
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Payments Yet</h3>
                                                    <p className="text-slate-600">Issue your first payment to get started</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Tab.Panel>

                                <Tab.Panel>
                                    {/* Add Employee Form */}
                                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6 mb-6">
                                        <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
                                            <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg mr-3">
                                                <UserGroupIcon className="h-5 w-5 text-amber-600" />
                                            </div>
                                            Add New Employee
                                        </h2>
                                        <form onSubmit={addEmployee} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                                                <input
                                                    type="text"
                                                    value={empName}
                                                    onChange={(e) => setEmpName(e.target.value)}
                                                    placeholder="Employee name"
                                                    className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all duration-200 outline-none"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                                                <input
                                                    type="text"
                                                    value={empRole}
                                                    onChange={(e) => setEmpRole(e.target.value)}
                                                    placeholder="Job title"
                                                    className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all duration-200 outline-none"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Salary</label>
                                                <input
                                                    type="number"
                                                    value={empSalary}
                                                    onChange={(e) => setEmpSalary(e.target.value)}
                                                    placeholder="0"
                                                    className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all duration-200 outline-none"
                                                    required
                                                />
                                            </div>
                                            <div className="flex items-end">
                                                <button
                                                    type="submit"
                                                    className="w-full px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl hover:from-amber-700 hover:to-orange-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 font-medium"
                                                >
                                                    Add Employee
                                                </button>
                                            </div>
                                        </form>
                                    </div>

                                    {/* Employees List */}
                                    <div className="space-y-3">
                                        {employees.map((emp) => (
                                            <div
                                                key={emp.id}
                                                onClick={() => handleEmployeeClick(emp)}
                                                className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl border border-slate-200/50 hover:border-amber-300/50 transition-all duration-300 p-6 cursor-pointer"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-4">
                                                        <div className="p-3 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl group-hover:from-amber-100 group-hover:to-orange-100 transition-all duration-300">
                                                            <UserGroupIcon className="h-6 w-6 text-slate-600 group-hover:text-amber-600 transition-colors duration-300" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xl font-bold text-slate-900">{emp.name}</p>
                                                            <p className="text-sm text-slate-600">Role: {emp.role} • Salary: PKR {emp.salary.toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-3">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteEmployee(emp.id);
                                                            }}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110"
                                                        >
                                                            <TrashIcon className="h-5 w-5" />
                                                        </button>
                                                        <PlusIcon className="h-5 w-5 text-amber-600 group-hover:rotate-90 transition-transform duration-300" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {employees.length === 0 && !loading && (
                                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-12 text-center">
                                                <div className="flex flex-col items-center">
                                                    <div className="p-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full mb-4">
                                                        <UserGroupIcon className="h-12 w-12 text-slate-400" />
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Employees Yet</h3>
                                                    <p className="text-slate-600">Add your first employee to get started</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Tab.Panel>
                            </Tab.Panels>
                        </Tab.Group>
                    </div>
                )}
            </div>
        </div>
    );
}