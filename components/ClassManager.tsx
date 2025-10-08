import React, { useState, useEffect, useRef } from 'react';
import type { ClassData } from '../types';
import { getClasses, addClass, deleteClass } from '../api';
import { PlusIcon, DotsVerticalIcon, TrashIcon, SpinnerIcon } from './icons';

// --- Add/Edit Class Modal ---
interface ClassModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (classData: Omit<ClassData, 'id'>) => Promise<void>;
}

const ClassModal: React.FC<ClassModalProps> = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [numeric, setNumeric] = useState('');
    const [capacity, setCapacity] = useState('');
    const [section, setSection] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        await onSave({
            class_name: name,
            class_numeric: numeric,
            class_capacity: capacity,
            sections: section || null,
        });
        setIsSaving(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b">
                        <h3 className="text-xl font-semibold text-slate-800">Add New Class</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label htmlFor="class-name" className="block text-sm font-medium text-slate-700">Class Name</label>
                            <input type="text" id="class-name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                        <div>
                            <label htmlFor="class-numeric" className="block text-sm font-medium text-slate-700">Class Numeric Value</label>
                            <input type="number" id="class-numeric" value={numeric} onChange={e => setNumeric(e.target.value)} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                        <div>
                            <label htmlFor="class-capacity" className="block text-sm font-medium text-slate-700">Student Capacity</label>
                            <input type="number" id="class-capacity" value={capacity} onChange={e => setCapacity(e.target.value)} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                         <div>
                            <label htmlFor="class-section" className="block text-sm font-medium text-slate-700">Section (Optional)</label>
                            <input type="text" id="class-section" value={section} onChange={e => setSection(e.target.value)} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                    </div>
                    <div className="bg-slate-50 px-6 py-3 flex justify-end gap-3 rounded-b-lg">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-indigo-700 border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-800 disabled:bg-indigo-400">
                            {isSaving ? 'Saving...' : 'Save Class'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Action Menu Dropdown ---
const ActionMenu = ({ onAction, classId }: { onAction: (action: 'delete', id: string) => void, classId: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-100">
                <DotsVerticalIcon className="w-5 h-5" />
            </button>
            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                        <button onClick={() => { onAction('delete', classId); setIsOpen(false); }} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                           <TrashIcon className="w-4 h-4" /> Delete
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Main Class Manager Component ---
interface ClassManagerProps {
    initialClasses: ClassData[];
    secretKey: string;
    onDataChange: () => void;
}

const ClassManager: React.FC<ClassManagerProps> = ({ initialClasses, secretKey, onDataChange }) => {
    const [classes, setClasses] = useState<ClassData[]>(initialClasses);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleAddClass = async (classData: Omit<ClassData, 'id'>) => {
        try {
            await addClass(classData, secretKey);
            onDataChange(); // Trigger a full sync to get the latest data
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add class');
        }
    };

    const handleAction = async (action: 'delete', classId: string) => {
        if (action === 'delete') {
            if (window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
                try {
                    await deleteClass(classId, secretKey);
                    onDataChange();
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to delete class');
                }
            }
        }
    };
    
    // Update local state if initialClasses prop changes after a sync
    useEffect(() => {
        setClasses(initialClasses);
    }, [initialClasses]);

    return (
        <>
            <ClassModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleAddClass} />
            <div className="bg-white rounded-lg shadow-lg">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        Class
                    </h2>
                    <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-700 text-white text-sm font-medium rounded-md shadow-sm hover:bg-indigo-800">
                        <PlusIcon className="w-5 h-5" />
                    </button>
                </div>
                {error && <p className="m-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Image</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Class Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Section</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Class Numeric Value</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Student Capacity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {isLoading ? (
                                <tr><td colSpan={6} className="text-center py-8"><SpinnerIcon className="w-8 h-8 text-indigo-600 mx-auto" /></td></tr>
                            ) : classes.map((c) => (
                                <tr key={c.id}>
                                    <td className="px-6 py-4">
                                        <div className="w-10 h-10 rounded-md bg-slate-200 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{c.class_name}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{c.sections || 'No Section'}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{c.class_numeric}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{c.class_capacity}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        <ActionMenu classId={c.id} onAction={handleAction} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default ClassManager;
