'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

interface PasskeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    title?: string;
    description?: string;
}

import { useAuthStore } from '@/lib/store';

export default function PasskeyModal({
    isOpen,
    onClose,
    onSuccess,
    title = "Security Check",
    description = "Please enter the 4-digit passkey to continue."
}: PasskeyModalProps) {
    const [passkey, setPasskey] = useState(['', '', '', '']);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const { user } = useAuthStore();

    useEffect(() => {
        if (isOpen) {
            setPasskey(['', '', '', '']);
            // Focus first input after a short delay to allow modal animation
            setTimeout(() => {
                inputRefs.current[0]?.focus();
            }, 100);
        }
    }, [isOpen]);

    const handleInput = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        const newPasskey = [...passkey];
        newPasskey[index] = value;
        setPasskey(newPasskey);

        // Auto-focus next input
        if (value && index < 3) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit if complete
        if (index === 3 && value) {
            const code = newPasskey.join('');
            // Check immediately for better UX
            // Use user's MPIN if available, otherwise fallback to '0000' (or handle as error)
            const correctPasskey = user?.mpin || '0000';

            if (code === correctPasskey) {
                onSuccess();
                onClose();
            } else {
                toast.error('Incorrect passkey');
                setPasskey(['', '', '', '']);
                inputRefs.current[0]?.focus();
            }
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace') {
            if (!passkey[index] && index > 0) {
                inputRefs.current[index - 1]?.focus();
            }
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex flex-col items-center">
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                                        <LockClosedIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                                    </div>
                                    <Dialog.Title
                                        as="h3"
                                        className="text-lg font-medium leading-6 text-gray-900"
                                    >
                                        {title}
                                    </Dialog.Title>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500 text-center">
                                            {description}
                                        </p>
                                    </div>

                                    <div className="mt-6 flex justify-center gap-3">
                                        {passkey.map((digit, index) => (
                                            <input
                                                key={index}
                                                ref={el => {
                                                    if (index === 0) inputRefs.current = []; // Reset on first item
                                                    inputRefs.current[index] = el;
                                                }}
                                                type="password"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => handleInput(index, e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(index, e)}
                                                className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-red-500 outline-none transition-colors"
                                            />
                                        ))}
                                    </div>

                                    <div className="mt-6 w-full">
                                        <button
                                            type="button"
                                            className="w-full inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                                            onClick={onClose}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
