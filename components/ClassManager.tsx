import React, { useState, useEffect } from 'react';
import type { ClassData, AddClassPayload } from '../types';
import { getClasses, addClass, deleteClass } from '../api';
import { BookOpenIcon, PlusIcon, SpinnerIcon, TrashIcon, UsersIcon, ExclamationCircleIcon, DotsVerticalIcon } from './icons';
import { formatSection, displayWithFallback } from '../utils';

interface ClassManagerProps {
    initialClasses: ClassData[];
    secretKey: string;
    onDataChange: () => void; // To trigger a global refresh if needed
}

const ClassManager: React.FC<ClassManagerProps> = ({ initialClasses, secretKey, onDataChange }) => {
    const [classes, setClasses] = useState<ClassData[]>(initialClasses);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        // Fetch fresh data on component mount to ensure it's up-to-date
        fetchClassData();
    }, []);

    useEffect(() => {
        // This keeps the component in sync if a global refresh happens
        setClasses(initialClasses);
    }, [initialClasses]);

    const fetchClassData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const freshClasses = await getClasses(secretKey);
            setClasses(freshClasses);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch class data.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddClass = async (payload: AddClassPayload) => {
        try {
            await addClass(payload, secretKey);
            setIsModalOpen(false);
            onDataChange(); // Trigger global sync to get all data again
        } catch (err) {
            throw err; // Let the modal handle the error display
        }
    };

    const handleDeleteClass = async (classId: string) => {
        if (window.confirm("Are you sure you want to delete this class? This action cannot be undone.")) {
            try {
                await deleteClass(classId, secretKey);
                onDataChange(); // Trigger global sync
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to delete class.");
            }
        }
    };

    return (
        <>
        {isModalOpen && (
            <AddClassModal 
                onClose={() => setIsModalOpen(false)} 
                onAddClass={handleAddClass}
            />
        )}
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20">
            <div className="p-4 sm:p-6 border-b border-slate-300/50 dark:border-slate-700/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <BookOpenIcon className="w-6 h-6" /> Class Management
                </h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-300 transform hover:scale-105"
                >
                    <PlusIcon className="w-5 h-5" />
                    Add New Class
                </button>
            </div>

            {error && <p className="m-4 text-sm text-red-600 dark:text-red-300 bg-red-100/80 dark:bg-red-900/40 p-3 rounded-lg">{error}</p>}
            
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200/50 dark:divide-slate-700/50">
                    <thead className="bg-slate-50/70 dark:bg-slate-900/70 backdrop-blur-sm">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Class Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Section</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Class Numeric Value</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Student Capacity</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Action</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                        {isLoading ? (
                             <tr><td colSpan={5} className="text-center py-12"><SpinnerIcon className="w-8 h-8 mx-auto text-purple-600" /></td></tr>
                        ) : !classes || classes.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center text-slate-500 dark:text-slate-400 py-12 px-6">
                                    <div className="flex flex-col items-center">
                                        <BookOpenIcon className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                                        <p className="font-semibold mt-2">No classes found.</p>
                                        <p className="text-sm">Sync with the server or add a new class to begin.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : classes.map((cls) => (
                            <tr key={cls.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-50">{cls.class_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{formatSection(cls.class_section)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{displayWithFallback(cls.class_numeric, 'No Section')}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{`${cls.student_count || 0} Out Of ${cls.class_capacity}`}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button 
                                        onClick={() => handleDeleteClass(cls.id)} 
                                        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1 rounded-full transition-colors"
                                        title="Delete Class"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                        <span className="sr-only">Delete</span>
                                    </button>
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

// AddClassModal sub-component
const AddClassModal: React.FC<{onClose: () => void, onAddClass: (payload: AddClassPayload) => Promise<void>}> = ({ onClose, onAddClass }) => {
    const [name, setName] = useState('');
    const [numeric, setNumeric] = useState('');
    const [sections, setSections] = useState('');
    const [capacity, setCapacity] = useState('');
    const [error, setError] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsAdding(true);

        const sectionsArray = sections.split(',').map(s => s.trim()).filter(Boolean);
        if (sectionsArray.length === 0) {
            setError('Please provide at least one section.');
            setIsAdding(false);
            return;
        }

        const payload: AddClassPayload = {
            class_name: name,
            class_numeric: numeric,
            class_section: sectionsArray,
            class_capacity: capacity,
        };

        try {
            await onAddClass(payload);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsAdding(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-lg w-full border border-white/20">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Add New Class</h3>
                    </div>
                    <div className="p-6 space-y-4 bg-white dark:bg-slate-900/50">
                        {error && <p className="text-sm text-red-600 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-3 rounded-lg">{error}</p>}
                        <div>
                            <label htmlFor="class_name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Class Name</label>
                            <input type="text" id="class_name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 w-full border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 rounded-xl shadow-sm focus:ring-purple-500 focus:border-purple-500"/>
                        </div>
                         <div>
                            <label htmlFor="class_numeric" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Class Numeric Value</label>
                            <input type="number" id="class_numeric" value={numeric} onChange={e => setNumeric(e.target.value)} required className="mt-1 w-full border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 rounded-xl shadow-sm focus:ring-purple-500 focus:border-purple-500"/>
                        </div>
                        <div>
                            <label htmlFor="class_section" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Sections</label>
                            <input type="text" id="class_section" value={sections} onChange={e => setSections(e.target.value)} required className="mt-1 w-full border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 rounded-xl shadow-sm focus:ring-purple-500 focus:border-purple-500"/>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Enter comma-separated values for multiple sections (e.g., A, B, C).</p>
                        </div>
                         <div>
                            <label htmlFor="class_capacity" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Student Capacity</label>
                            <input type="number" id="class_capacity" value={capacity} onChange={e => setCapacity(e.target.value)} required className="mt-1 w-full border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 rounded-xl shadow-sm focus:ring-purple-500 focus:border-purple-500"/>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 flex justify-end gap-3 rounded-b-2xl">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-slate-700/70 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600">Cancel</button>
                        <button type="submit" disabled={isAdding} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-xl shadow-sm hover:bg-purple-700 disabled:bg-purple-400 transition-colors">
                            {isAdding ? <SpinnerIcon className="w-5 h-5"/> : 'Add Class'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


export default ClassManager;