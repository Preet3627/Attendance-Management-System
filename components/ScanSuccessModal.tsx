import React from 'react';
import type { Student } from '../types';
import { UserIcon, CheckCircleIcon } from './icons';

interface ScanSuccessModalProps {
    student: Student;
    scanTime: Date;
    onClose: () => void;
}

const ScanSuccessModal: React.FC<ScanSuccessModalProps> = ({ student, scanTime, onClose }) => {
    // Force HTTPS for avatar URLs to prevent mixed-content errors
    const securePhotoUrl = student.profilePhotoUrl?.replace(/^http:\/\//i, 'https://');

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
            aria-labelledby="modal-title" 
            role="dialog" 
            aria-modal="true"
        >
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-auto transform transition-all" role="document">
                <div className="p-6 text-center">
                    <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-slate-800" id="modal-title">Welcome!</h3>
                    
                    <div className="mt-6 flex flex-col items-center gap-4">
                        <div className="w-32 h-32 rounded-full bg-slate-200 border-4 border-slate-300 flex items-center justify-center overflow-hidden">
                            {securePhotoUrl ? 
                                <img src={securePhotoUrl} alt={student.studentName} className="w-full h-full object-contain" /> : 
                                <UserIcon className="w-24 h-24 text-slate-400" />
                            }
                        </div>
                        <div className="text-slate-700">
                             <p className="text-xl font-semibold">{student.studentName}</p>
                             <p className="text-sm text-slate-500">ID: {student.studentId}</p>
                        </div>
                    </div>
                    
                    <p className="mt-4 text-sm text-slate-500">
                        Marked present at {scanTime.toLocaleTimeString()}
                    </p>
                </div>
                <div className="bg-slate-50 px-6 py-4 rounded-b-xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScanSuccessModal;