// FIX: Created the ClassManager component file to resolve the module import error in App.tsx.
import React, { useState } from 'react';
import type { ClassData } from '../types';
import { BookOpenIcon, PlusIcon, SpinnerIcon, TrashIcon, UsersIcon } from './icons';

interface ClassManagerProps {
    initialClasses: ClassData[];
    secretKey: string;
    onDataChange: () => void;
}

const ClassManager: React.FC<ClassManagerProps> = ({ initialClasses, secretKey, onDataChange }) => {
    const [classes, setClasses] = useState<ClassData[]>(initialClasses);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // In a real app, these would be API calls
    const handleAddClass = () => {
        alert("Feature to add classes is not yet implemented.");
    };

    const handleDeleteClass = async (classId: string) => {
        alert(`Feature to delete class ${classId} is not yet implemented.`);
    };

    return (
        <div className="bg-white rounded-lg shadow-lg">
            <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                    <BookOpenIcon className="w-6 h-6" /> Class Management
                </h2>
                <button
                    onClick={handleAddClass}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-700 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
                >
                    <PlusIcon className="w-5 h-5" />
                    Add New Class
                </button>
            </div>

            {error && <p className="m-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}
            
            <div className="overflow-x-auto max-h-[32rem]">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 sticky top-0">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Class Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Students</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Assigned Teacher</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {isLoading && (
                             <tr><td colSpan={4} className="text-center py-12"><SpinnerIcon className="w-8 h-8 mx-auto text-indigo-600" /></td></tr>
                        )}
                        {!isLoading && classes.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="text-center text-slate-500 py-12 px-6">
                                    <div className="flex flex-col items-center">
                                        <BookOpenIcon className="w-12 h-12 text-slate-300" />
                                        <p className="font-semibold mt-2">No classes found.</p>
                                        <p className="text-sm">Sync with the server or add a new class to begin.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : classes.map((cls) => (
                            <tr key={cls.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{cls.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    <div className="flex items-center gap-2">
                                        <UsersIcon className="w-5 h-5 text-slate-400" />
                                        <span>{cls.students.length} Students</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{cls.teacherId || 'Not Assigned'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button 
                                        onClick={() => handleDeleteClass(cls.id)} 
                                        className="text-slate-400 hover:text-red-600 p-1 rounded-full transition-colors"
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
    );
};

export default ClassManager;
