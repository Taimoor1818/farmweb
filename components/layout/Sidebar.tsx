'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    HomeIcon,
    BeakerIcon,
    BanknotesIcon,
    CalendarIcon,
    UsersIcon,
    ShoppingBagIcon,
    WrenchScrewdriverIcon,
    ClipboardDocumentListIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import MPINScreen from '@/components/auth/MPINScreen';

const mainNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Cow Milk', href: '/dashboard/cow-milk', icon: BeakerIcon },
    { name: 'Buffalo Milk', href: '/dashboard/buffalo-milk', icon: BeakerIcon },
    { name: 'Daily Record', href: '/dashboard/daily-record', icon: ClipboardDocumentListIcon },
    { name: 'Monthly Record', href: '/dashboard/monthly-record', icon: CalendarIcon },
    { name: 'Users', href: '/dashboard/users', icon: UsersIcon },
];

const financialNavigation = [
    { name: 'Cash', href: '/dashboard/cash', icon: BanknotesIcon },
    { name: 'Expense', href: '/dashboard/expense', icon: BanknotesIcon },
];

const toolsNavigation = [
    { name: 'Animal Inventory', href: '/dashboard/animal-inventory', icon: ShoppingBagIcon },
    { name: 'Medical', href: '/dashboard/medical', icon: BeakerIcon },
    { name: 'Tools', href: '/dashboard/tools', icon: WrenchScrewdriverIcon },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [expandedSections, setExpandedSections] = useState({
        financial: true,
        tools: true
    });
    const [showMpinModal, setShowMpinModal] = useState(false);

    const toggleSection = (section: 'financial' | 'tools') => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    return (
        <div className="flex flex-col h-full bg-white border-r border-gray-200 w-64">
            <div className="flex items-center justify-center h-16 border-b border-gray-200">
                <h1 className="text-xl font-bold text-green-700">Mtamsport</h1>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 flex flex-col justify-between">
                <div>
                    <div className="space-y-1 px-2">
                        {mainNavigation.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                                        isActive
                                            ? "bg-green-100 text-green-900"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    )}
                                >
                                    <item.icon
                                        className={cn(
                                            "mr-3 flex-shrink-0 h-6 w-6",
                                            isActive ? "text-green-700" : "text-gray-400 group-hover:text-gray-500"
                                        )}
                                        aria-hidden="true"
                                    />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Financial Section */}
                    <div className="mt-8 px-2">
                        <button
                            onClick={() => toggleSection('financial')}
                            className="group flex items-center justify-between w-full px-2 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900"
                        >
                            <span className="flex items-center">
                                <BanknotesIcon className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                                Financial
                            </span>
                            {expandedSections.financial ? (
                                <ChevronUpIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            ) : (
                                <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            )}
                        </button>
                        {expandedSections.financial && (
                            <div className="mt-1 space-y-1 pl-4">
                                {financialNavigation.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={cn(
                                                "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                                                isActive
                                                    ? "bg-green-100 text-green-900"
                                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                            )}
                                        >
                                            <item.icon
                                                className={cn(
                                                    "mr-3 flex-shrink-0 h-5 w-5",
                                                    isActive ? "text-green-700" : "text-gray-400 group-hover:text-gray-500"
                                                )}
                                                aria-hidden="true"
                                            />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Tools Section */}
                    <div className="mt-8 px-2">
                        <button
                            onClick={() => toggleSection('tools')}
                            className="group flex items-center justify-between w-full px-2 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900"
                        >
                            <span className="flex items-center">
                                <WrenchScrewdriverIcon className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                                Tools & More
                            </span>
                            {expandedSections.tools ? (
                                <ChevronUpIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            ) : (
                                <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            )}
                        </button>
                        {expandedSections.tools && (
                            <div className="mt-1 space-y-1 pl-4">
                                {toolsNavigation.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={cn(
                                                "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                                                isActive
                                                    ? "bg-green-100 text-green-900"
                                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                            )}
                                        >
                                            <item.icon
                                                className={cn(
                                                    "mr-3 flex-shrink-0 h-5 w-5",
                                                    isActive ? "text-green-700" : "text-gray-400 group-hover:text-gray-500"
                                                )}
                                                aria-hidden="true"
                                            />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="p-4 border-t border-gray-200 space-y-2">
                    {/* Set MPIN Button */}
                    <button
                        onClick={() => setShowMpinModal(true)}
                        className="flex items-center w-full px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
                    >
                        <ShieldCheckIcon className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                        Set MPIN
                    </button>

                    {/* Sign Out Button */}
                    <button
                        onClick={() => {
                            import('@/lib/firebase').then(({ auth }) => {
                                auth.signOut().then(() => {
                                    // Clear sessionStorage on logout
                                    sessionStorage.removeItem('app_unlocked');
                                    sessionStorage.removeItem('user_data');
                                    sessionStorage.removeItem('mpin_authenticated');
                                    window.location.href = '/login';
                                });
                            });
                        }}
                        className="flex items-center w-full px-2 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 hover:text-red-900"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mr-3 h-6 w-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                        </svg>
                        Sign Out
                    </button>
                </div>
            </nav>

            {/* MPIN Modal */}
            {showMpinModal && (
                <MPINScreen
                    mode="set"
                    onSuccess={() => setShowMpinModal(false)}
                    onCancel={() => setShowMpinModal(false)}
                />
            )}
        </div>
    );
}