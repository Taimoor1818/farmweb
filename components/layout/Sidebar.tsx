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
    ShieldCheckIcon,
    ArrowRightOnRectangleIcon,
    QuestionMarkCircleIcon
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
        <div className="flex flex-col h-full bg-gradient-to-b from-white to-slate-50/50 border-r border-slate-200/40 w-64 shadow-sm backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-center justify-center h-20 border-b border-slate-200/40 bg-white/80 backdrop-blur-sm">
                <div className="text-center">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                        Mtamsport
                    </h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Farm Management</p>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-5 px-3 flex flex-col justify-between">
                <div className="space-y-7">
                    {/* Main Navigation */}
                    <div className="space-y-1">
                        <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                            Main Menu
                        </p>
                        {mainNavigation.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        "group flex items-center px-3 py-2.5 text-[15px] font-medium rounded-lg transition-all duration-200",
                                        isActive
                                            ? "bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-700 shadow-sm border border-emerald-200/50"
                                            : "text-slate-600 hover:bg-slate-800/5 hover:text-slate-800"
                                    )}
                                >
                                    <item.icon
                                        className={cn(
                                            "mr-3 flex-shrink-0 h-5 w-5 transition-colors duration-200",
                                            isActive ? "text-emerald-600" : "text-slate-500 group-hover:text-slate-700"
                                        )}
                                        aria-hidden="true"
                                    />
                                    <span className={isActive ? "font-semibold" : ""}>{item.name}</span>
                                    {isActive && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    )}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Financial Section */}
                    <div>
                        <button
                            onClick={() => toggleSection('financial')}
                            className="group flex items-center justify-between w-full px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider rounded-lg hover:bg-slate-800/5 hover:text-slate-700 transition-all duration-200"
                        >
                            <span className="flex items-center">
                                <BanknotesIcon className="mr-2 h-4 w-4 text-slate-500 group-hover:text-slate-600" aria-hidden="true" />
                                Financial
                            </span>
                            <div className={cn(
                                "transition-transform duration-200 text-slate-500 group-hover:text-slate-600",
                                expandedSections.financial ? "rotate-180" : ""
                            )}>
                                <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
                            </div>
                        </button>
                        <div className={cn(
                            "mt-1 space-y-1 overflow-hidden transition-all duration-200",
                            expandedSections.financial ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                        )}>
                            {financialNavigation.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            "group flex items-center pl-9 pr-3 py-2.5 text-[15px] font-medium rounded-lg transition-all duration-200",
                                            isActive
                                                ? "bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-700 shadow-sm border border-emerald-200/50"
                                                : "text-slate-600 hover:bg-slate-800/5 hover:text-slate-800"
                                        )}
                                    >
                                        <item.icon
                                            className={cn(
                                                "mr-3 flex-shrink-0 h-4 w-4 transition-colors duration-200",
                                                isActive ? "text-emerald-600" : "text-slate-500 group-hover:text-slate-700"
                                            )}
                                            aria-hidden="true"
                                        />
                                        <span className={isActive ? "font-semibold" : ""}>{item.name}</span>
                                        {isActive && (
                                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tools Section */}
                    <div>
                        <button
                            onClick={() => toggleSection('tools')}
                            className="group flex items-center justify-between w-full px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider rounded-lg hover:bg-slate-800/5 hover:text-slate-700 transition-all duration-200"
                        >
                            <span className="flex items-center">
                                <WrenchScrewdriverIcon className="mr-2 h-4 w-4 text-slate-500 group-hover:text-slate-600" aria-hidden="true" />
                                Tools & More
                            </span>
                            <div className={cn(
                                "transition-transform duration-200 text-slate-500 group-hover:text-slate-600",
                                expandedSections.tools ? "rotate-180" : ""
                            )}>
                                <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
                            </div>
                        </button>
                        <div className={cn(
                            "mt-1 space-y-1 overflow-hidden transition-all duration-200",
                            expandedSections.tools ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                        )}>
                            {toolsNavigation.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            "group flex items-center pl-9 pr-3 py-2.5 text-[15px] font-medium rounded-lg transition-all duration-200",
                                            isActive
                                                ? "bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-700 shadow-sm border border-emerald-200/50"
                                                : "text-slate-600 hover:bg-slate-800/5 hover:text-slate-800"
                                        )}
                                    >
                                        <item.icon
                                            className={cn(
                                                "mr-3 flex-shrink-0 h-4 w-4 transition-colors duration-200",
                                                isActive ? "text-emerald-600" : "text-slate-500 group-hover:text-slate-700"
                                            )}
                                            aria-hidden="true"
                                        />
                                        <span className={isActive ? "font-semibold" : ""}>{item.name}</span>
                                        {isActive && (
                                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 mt-4 border-t border-slate-200/40 space-y-1">
                    {/* Help Link */}
                    <Link
                        href="/dashboard/help"
                        className={cn(
                            "flex items-center w-full px-3 py-2.5 text-[15px] font-medium rounded-lg transition-all duration-200 group",
                            pathname === '/dashboard/help'
                                ? "bg-gradient-to-r from-blue-500/15 to-indigo-500/15 text-blue-700 shadow-sm border border-blue-200/50"
                                : "text-slate-600 hover:bg-slate-800/5 hover:text-slate-800"
                        )}
                    >
                        <QuestionMarkCircleIcon
                            className={cn(
                                "mr-3 h-5 w-5 transition-colors duration-200",
                                pathname === '/dashboard/help' ? "text-blue-600" : "text-slate-500 group-hover:text-slate-700"
                            )}
                            aria-hidden="true"
                        />
                        Help
                    </Link>

                    {/* Set MPIN Button */}
                    <button
                        onClick={() => setShowMpinModal(true)}
                        className="flex items-center w-full px-3 py-2.5 text-[15px] font-medium text-slate-600 rounded-lg hover:bg-slate-800/5 hover:text-slate-800 transition-all duration-200 group"
                    >
                        <ShieldCheckIcon className="mr-3 h-5 w-5 text-slate-500 group-hover:text-slate-700 transition-colors duration-200" aria-hidden="true" />
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
                        className="flex items-center w-full px-3 py-2.5 text-[15px] font-medium text-rose-600 rounded-lg hover:bg-rose-500/5 hover:text-rose-700 transition-all duration-200 group"
                    >
                        <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 group-hover:translate-x-0.5 transition-transform duration-200" aria-hidden="true" />
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