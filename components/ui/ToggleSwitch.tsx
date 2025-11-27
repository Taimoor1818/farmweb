'use client';

interface ToggleSwitchProps {
    options: [string, string];
    selected: string;
    onChange: (value: string) => void;
}

export default function ToggleSwitch({ options, selected, onChange }: ToggleSwitchProps) {
    return (
        <div className="inline-flex rounded-full bg-gray-100 p-1 shadow-inner">
            {options.map((option) => (
                <button
                    key={option}
                    onClick={() => onChange(option)}
                    className={`px-6 py-2 text-sm font-semibold rounded-full transition-all duration-300 ease-in-out ${selected === option
                        ? 'bg-white text-green-700 shadow-md transform scale-105'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    {option}
                </button>
            ))}
        </div>
    );
}
