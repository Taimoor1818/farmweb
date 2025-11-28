'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Sidebar from '@/components/layout/Sidebar';

import AuthGuard from '@/components/auth/AuthGuard';
import SubscriptionGuard from '@/components/auth/SubscriptionGuard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <AuthGuard>
            <div className="h-screen flex overflow-hidden bg-gray-100">
                {/* Mobile sidebar */}
                <Transition.Root show={sidebarOpen} as={Fragment}>
                    <Dialog as="div" className="relative z-40 md:hidden" onClose={setSidebarOpen}>
                        <Transition.Child
                            as={Fragment}
                            enter="transition-opacity ease-linear duration-300"
                            enterFrom="opacity-0"
                            enterTo="opacity-100"
                            leave="transition-opacity ease-linear duration-300"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                        >
                            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
                        </Transition.Child>

                        <div className="fixed inset-0 z-40 flex">
                            <Transition.Child
                                as={Fragment}
                                enter="transition ease-in-out duration-300 transform"
                                enterFrom="-translate-x-full"
                                enterTo="translate-x-0"
                                leave="transition ease-in-out duration-300 transform"
                                leaveFrom="translate-x-0"
                                leaveTo="-translate-x-full"
                            >
                                <Dialog.Panel className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
                                    <Transition.Child
                                        as={Fragment}
                                        enter="ease-in-out duration-300"
                                        enterFrom="opacity-0"
                                        enterTo="opacity-100"
                                        leave="ease-in-out duration-300"
                                        leaveFrom="opacity-100"
                                        leaveTo="opacity-0"
                                    >
                                        <div className="absolute top-0 right-0 -mr-12 pt-2">
                                            <button
                                                type="button"
                                                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                                                onClick={() => setSidebarOpen(false)}
                                            >
                                                <span className="sr-only">Close sidebar</span>
                                                <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                                            </button>
                                        </div>
                                    </Transition.Child>
                                    <Sidebar />
                                </Dialog.Panel>
                            </Transition.Child>
                            <div className="flex-shrink-0 w-14" aria-hidden="true">
                                {/* Force sidebar to shrink to fit close icon */}
                            </div>
                        </div>
                    </Dialog>
                </Transition.Root>

                {/* Static sidebar for desktop */}
                <div className="hidden md:flex md:flex-shrink-0">
                    <Sidebar />
                </div>

                <div className="flex flex-col w-0 flex-1 overflow-hidden">
                    <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
                        <button
                            type="button"
                            className="-ml-0.5 -mt-0.5 h-10 w-10 sm:h-12 sm:w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <span className="sr-only">Open sidebar</span>
                            <Bars3Icon className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
                        </button>
                    </div>
                    <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
                        <div className="py-4 sm:py-6">
                            <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 md:px-8">
                            <SubscriptionGuard>
                                {children}
                            </SubscriptionGuard>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </AuthGuard>
    );
}