'use client';

import Link from 'next/link';
import { WrenchScrewdriverIcon, ShoppingCartIcon, BanknotesIcon, ClipboardDocumentListIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const tools = [
    {
        name: 'Purchasing',
        description: 'Create and manage purchase orders',
        href: '/dashboard/tools/purchasing',
        icon: ShoppingCartIcon,
        color: 'bg-blue-500',
    },
    {
        name: 'Issue Payments',
        description: 'Manage employee payments',
        href: '/dashboard/tools/payments',
        icon: BanknotesIcon,
        color: 'bg-green-500',
    },
    {
        name: 'Consumption',
        description: 'Track item consumption',
        href: '/dashboard/tools/consumption',
        icon: ClipboardDocumentListIcon,
        color: 'bg-purple-500',
    },
    {
        name: 'Notes',
        description: 'Manage farm notes and records',
        href: '/dashboard/tools/notes',
        icon: DocumentTextIcon,
        color: 'bg-orange-500',
    },
];

export default function ToolsPage() {
    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Tools Dashboard</h1>
                <p className="mt-2 text-gray-600">Manage purchasing, payments, consumption, and notes</p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {tools.map((tool) => (
                    <Link
                        key={tool.name}
                        href={tool.href}
                        className="relative group bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 hover:border-green-500"
                    >
                        <div>
                            <span className={`rounded-lg inline-flex p-3 ${tool.color} text-white ring-4 ring-white`}>
                                <tool.icon className="h-6 w-6" aria-hidden="true" />
                            </span>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-lg font-medium text-gray-900 group-hover:text-green-600">
                                {tool.name}
                            </h3>
                            <p className="mt-2 text-sm text-gray-500">{tool.description}</p>
                        </div>
                        <span className="absolute top-6 right-6 text-gray-400 group-hover:text-green-500" aria-hidden="true">
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
                            </svg>
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
