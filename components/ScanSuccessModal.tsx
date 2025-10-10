import React from 'react';
import type { Student, Teacher } from '../types';
import { UserIcon, CheckCircleIcon } from './icons';

interface ScanSuccessModalProps {
    person: Student | Teacher;
    scanTime: Date;
    onClose: () => void;
}

const ScanSuccessModal: React.FC<ScanSuccessModalProps> = ({ person, scanTime, onClose }) => {
    // Force HTTPS for avatar URLs to prevent mixed-content errors
    const securePhotoUrl = person.profilePhotoUrl?.replace(/^http:\/\//i, 'https');
    
    const isStudent = 'studentId' in person;
    const name = isStudent ? person.studentName : person.name;
    const id = isStudent ? person.studentId : person.id;


    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
            aria-labelledby="modal-title" 
            role="dialog" 
            aria-modal="true"
        >
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl max-w-sm w-full mx-auto transform transition-all" role="document">
                <div className="p-6 text-center">
                    <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100" id="modal-title">Welcome!</h3>
                    
                    <div className="mt-6 flex flex-col items-center gap-4">
                        <div className="w-32 h-32 rounded-full bg-slate-200 dark:bg-slate-700 border-4 border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden">
                            {securePhotoUrl ? 
                                <img src={securePhotoUrl} alt={name} className="w-full h-full object-cover" /> : 
                                <UserIcon className="w-24 h-24 text-slate-400 dark:text-slate-500" />
                            }
                        </div>
                        <div className="text-slate-700 dark:text-slate-200">
                             <p className="text-xl font-semibold">{name}</p>
                             <p className="text-sm text-slate-500 dark:text-slate-400">ID: {id}</p>
                        </div>
                    </div>
                    
                    <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                        Marked present at {scanTime.toLocaleTimeString()}
                    </p>
                </div>
                <div className="bg-slate-50/50 dark:bg-slate-900/50 px-6 py-4 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScanSuccessModal;