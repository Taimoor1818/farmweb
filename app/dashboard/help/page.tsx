'use client';

import {
    QuestionMarkCircleIcon,
    BeakerIcon,
    UsersIcon,
    BanknotesIcon,
    CalendarIcon,
    ShoppingBagIcon,
    WrenchScrewdriverIcon,
    ClipboardDocumentListIcon,
    ShieldCheckIcon,
    ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

export default function HelpPage() {
    const sections = [
        {
            title: "Getting Started",
            icon: QuestionMarkCircleIcon,
            color: "from-blue-500 to-indigo-600",
            steps: [
                "Login with your email and password or use MPIN for quick access",
                "Set up your MPIN from the sidebar for faster future logins",
                "Navigate through the dashboard using the left sidebar menu"
            ]
        },
        {
            title: "Milk Management",
            icon: BeakerIcon,
            color: "from-emerald-500 to-teal-600",
            steps: [
                "Go to 'Cow Milk' or 'Buffalo Milk' from the sidebar",
                "Click 'Add Entry' to record new milk production",
                "Enter customer name, quantity (liters), and date",
                "View all entries in the table with edit/delete options",
                "Use filters to search by customer or date range",
                "Export data to Excel for record keeping"
            ]
        },
        {
            title: "Customer Management",
            icon: UsersIcon,
            color: "from-purple-500 to-pink-600",
            steps: [
                "Click 'Users' in the sidebar to manage customers",
                "Add new customers with name, contact, and milk rates",
                "Set separate rates for cow milk and buffalo milk",
                "Click on any customer to view their detailed record",
                "View total milk supplied, amount due, and payment history",
                "Record payments and track debit/credit balances"
            ]
        },
        {
            title: "Daily & Monthly Records",
            icon: ClipboardDocumentListIcon,
            color: "from-amber-500 to-orange-600",
            steps: [
                "Access 'Daily Record' to view day-by-day milk production",
                "Check 'Monthly Record' for comprehensive monthly summaries",
                "View total production, sales, and revenue statistics",
                "Filter records by date range or customer",
                "Export records to PDF or Excel for reporting"
            ]
        },
        {
            title: "Financial Management",
            icon: BanknotesIcon,
            color: "from-green-500 to-emerald-600",
            steps: [
                "Use 'Cash' to track all cash inflows and outflows",
                "Record income from milk sales and other sources",
                "Use 'Expense' to log farm expenses and costs",
                "Categorize expenses (feed, medicine, utilities, etc.)",
                "View financial summaries and balance reports",
                "Export financial data for accounting purposes"
            ]
        },
        {
            title: "Animal Inventory",
            icon: ShoppingBagIcon,
            color: "from-indigo-500 to-purple-600",
            steps: [
                "Navigate to 'Animal Inventory' under Tools section",
                "Add animals with details (type, breed, age, health status)",
                "Track animal count and categorize by type",
                "Update animal information as needed",
                "Monitor health status and breeding records"
            ]
        },
        {
            title: "Medical Records",
            icon: BeakerIcon,
            color: "from-rose-500 to-red-600",
            steps: [
                "Go to 'Medical' to track animal health",
                "Record vaccinations, treatments, and medications",
                "Log veterinary visits and diagnoses",
                "Set reminders for upcoming vaccinations",
                "Track medicine inventory and usage"
            ]
        },
        {
            title: "Tools - Purchasing",
            icon: WrenchScrewdriverIcon,
            color: "from-teal-500 to-cyan-600",
            steps: [
                "Access 'Tools' → 'Purchasing' for purchase orders",
                "Create new PO with vendor name and items",
                "Track order status (Pending/Received)",
                "Edit or delete purchase orders (requires MPIN)",
                "View total purchase amounts and vendor history"
            ]
        },
        {
            title: "Tools - Payments",
            icon: BanknotesIcon,
            color: "from-yellow-500 to-amber-600",
            steps: [
                "Go to 'Tools' → 'Payments' for employee management",
                "Add employees with name, role, and salary",
                "Issue payments to employees with date and amount",
                "Toggle payment status (Pending/Received)",
                "Click on employee to view payment history",
                "Export payment records to Excel"
            ]
        },
        {
            title: "Tools - Consumption",
            icon: WrenchScrewdriverIcon,
            color: "from-blue-500 to-sky-600",
            steps: [
                "Navigate to 'Tools' → 'Consumption'",
                "Log inventory usage (feed, medicine, supplies)",
                "Enter item name, quantity, unit, and date",
                "Add notes for additional details",
                "Track consumption patterns over time",
                "Export consumption logs to PDF"
            ]
        },
        {
            title: "Tools - Notes",
            icon: ClipboardDocumentListIcon,
            color: "from-violet-500 to-purple-600",
            steps: [
                "Access 'Tools' → 'Notes' for important reminders",
                "Create notes with topic, description, and date",
                "Add remarks for additional context",
                "View all notes sorted by date",
                "Export notes to PDF for documentation"
            ]
        },
        {
            title: "Security - MPIN",
            icon: ShieldCheckIcon,
            color: "from-slate-600 to-slate-700",
            steps: [
                "Click 'Set MPIN' at the bottom of the sidebar",
                "Enter a 4-digit PIN and confirm it",
                "Use MPIN for quick login on the login page",
                "MPIN protects sensitive actions (edit/delete)",
                "Reset MPIN anytime from the sidebar"
            ]
        },
        {
            title: "Tips & Best Practices",
            icon: QuestionMarkCircleIcon,
            color: "from-pink-500 to-rose-600",
            steps: [
                "Regularly backup your data by exporting to Excel/PDF",
                "Set different milk rates for cow and buffalo per customer",
                "Use the search and filter features to find records quickly",
                "Keep your MPIN secure and don't share it",
                "Update customer payments regularly to track balances",
                "Review monthly records for business insights",
                "Log expenses immediately to maintain accurate records"
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                            <QuestionMarkCircleIcon className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                Help & User Guide
                            </h1>
                            <p className="text-slate-600 mt-1">Learn how to use all features of the Farm Management System</p>
                        </div>
                    </div>
                </div>

                {/* Quick Navigation */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6 mb-8">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Navigation</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {sections.map((section, index) => (
                            <a
                                key={index}
                                href={`#section-${index}`}
                                className="flex items-center space-x-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors duration-200 text-sm text-slate-700 hover:text-slate-900"
                            >
                                <section.icon className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{section.title}</span>
                            </a>
                        ))}
                    </div>
                </div>

                {/* Help Sections */}
                <div className="space-y-6">
                    {sections.map((section, index) => (
                        <div
                            key={index}
                            id={`section-${index}`}
                            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden scroll-mt-8"
                        >
                            <div className={`bg-gradient-to-r ${section.color} px-6 py-4`}>
                                <div className="flex items-center space-x-3 text-white">
                                    <section.icon className="h-6 w-6" />
                                    <h2 className="text-xl font-bold">{section.title}</h2>
                                </div>
                            </div>
                            <div className="p-6">
                                <ol className="space-y-3">
                                    {section.steps.map((step, stepIndex) => (
                                        <li key={stepIndex} className="flex items-start space-x-3">
                                            <span className={`flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r ${section.color} text-white flex items-center justify-center text-sm font-bold`}>
                                                {stepIndex + 1}
                                            </span>
                                            <p className="text-slate-700 leading-relaxed pt-0.5">{step}</p>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Note */}
                <div className="mt-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg p-6 text-white">
                    <div className="flex items-start space-x-4">
                        <QuestionMarkCircleIcon className="h-6 w-6 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="text-lg font-bold mb-2">Need More Help?</h3>
                            <p className="text-blue-100 leading-relaxed">
                                This guide covers all the main features of the Farm Management System.
                                For any additional questions or support, please contact your system administrator.
                                Remember to keep your data backed up regularly and maintain your MPIN security.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
