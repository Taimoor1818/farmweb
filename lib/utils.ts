import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
    }).format(amount);
};

export const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
};
