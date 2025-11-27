'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { CheckCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface FarmDetails {
    farmName: string;
    city: string;
    country: string;
    contact: string;
    email?: string;
}

interface DailyData {
    cow_morning: Record<string, string>;
    cow_evening: Record<string, string>;
    buffalo_morning: Record<string, string>;
    buffalo_evening: Record<string, string>;
}

interface FarmProduction {
    cow_morning_total: number;
    cow_evening_total: number;
    buffalo_morning_total: number;
    buffalo_evening_total: number;
    cashIn?: number;
    cashOut?: number;
    totalExpense?: number;
}

interface Customer {
    customerId: string;
    name: string;
}

interface CashEntry {
    date: string;
    description: string;
    amount: number;
    type: string;
}

interface ExpenseEntry {
    date: string;
    item: string;
    amount: number;
    category: string;
}

export default function ReportSubmitButton() {
    const { user } = useAuthStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmitReport = async () => {
        if (!user) {
            toast.error('You must be logged in to submit reports');
            return;
        }

        const passkey = prompt('Enter passkey to submit report:');
        if (passkey !== '0000') {
            toast.error('Incorrect passkey');
            return;
        }

        setIsSubmitting(true);

        try {
            // Fetch farm details
            const farmDetailsRef = doc(db, `users/${user.uid}/farm_details`, 'info');
            const farmDetailsSnap = await getDoc(farmDetailsRef);

            if (!farmDetailsSnap.exists()) {
                throw new Error('Farm details not found');
            }

            const farmDetails = farmDetailsSnap.data() as FarmDetails;

            // Get today's date
            const today = new Date().toISOString().split('T')[0];

            // Fetch daily record
            const dailyRecordRef = doc(db, `users/${user.uid}/daily_records`, today);
            const dailyRecordSnap = await getDoc(dailyRecordRef);
            let dailyData: DailyData | null = null;

            if (dailyRecordSnap.exists()) {
                dailyData = dailyRecordSnap.data() as DailyData;
            }

            // Fetch farm production data
            const farmProductionRef = doc(db, `users/${user.uid}/farm_production`, today);
            const farmProductionSnap = await getDoc(farmProductionRef);
            let farmProduction: FarmProduction | null = null;

            if (farmProductionSnap.exists()) {
                farmProduction = farmProductionSnap.data() as FarmProduction;
            }

            // Fetch customers
            const customersRef = collection(db, `users/${user.uid}/user_data`);
            const customersSnap = await getDocs(customersRef);
            const customers: Customer[] = [];

            customersSnap.forEach((doc) => {
                customers.push({ ...doc.data() } as Customer);
            });

            // Fetch today's cash entries
            const cashQuery = query(
                collection(db, `users/${user.uid}/cash_entries`),
                where('date', '==', today)
            );
            const cashSnap = await getDocs(cashQuery);
            const cashEntries: CashEntry[] = [];

            cashSnap.forEach((doc) => {
                cashEntries.push({ ...doc.data() } as CashEntry);
            });

            // Fetch today's expense entries
            const expenseQuery = query(
                collection(db, `users/${user.uid}/expenses`),
                where('date', '==', today)
            );
            const expenseSnap = await getDocs(expenseQuery);
            const expenseEntries: ExpenseEntry[] = [];

            expenseSnap.forEach((doc) => {
                expenseEntries.push({ ...doc.data() } as ExpenseEntry);
            });

            // Prepare data for API submission
            const reportData = {
                date: today,
                farmDetails,
                dailyData,
                farmProduction,
                customers,
                cashEntries,
                expenseEntries
            };

            // Submit to API endpoint
            const response = await fetch('/api/submit-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.uid,
                    reportData
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to submit report');
            }

            // Mark as submitted
            setIsSubmitted(true);
            toast.success('Report submitted successfully!');

            // Reset submission status after 5 seconds
            setTimeout(() => {
                setIsSubmitted(false);
            }, 5000);

        } catch (error) {
            console.error('Error submitting report:', error);
            toast.error('Failed to submit report. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Automated Reporting</h2>
            <p className="text-gray-600 mb-4">
                Submit today's report to Google Sheets and receive a summary via email.
            </p>

            <button
                onClick={handleSubmitReport}
                disabled={isSubmitting || isSubmitted}
                className={`flex items-center px-4 py-2 rounded-md ${isSubmitted
                        ? 'bg-green-600 text-white'
                        : isSubmitting
                            ? 'bg-gray-400 text-white'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
            >
                {isSubmitting ? (
                    <>
                        <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                        Submitting...
                    </>
                ) : isSubmitted ? (
                    <>
                        <CheckCircleIcon className="h-5 w-5 mr-2" />
                        Submitted Successfully!
                    </>
                ) : (
                    'Submit Daily Report'
                )}
            </button>

            {isSubmitted && (
                <div className="mt-4 p-4 bg-green-50 rounded-md border border-green-200">
                    <p className="text-sm text-green-800 font-medium">
                        Report submitted successfully!
                    </p>
                    <ul className="mt-2 text-sm text-green-700 list-disc list-inside">
                        <li>Data saved to Google Sheets</li>
                        <li>Summary email sent to your inbox</li>
                    </ul>
                </div>
            )}
        </div>
    );
}