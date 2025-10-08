import React from 'react';
import { InformationCircleIcon } from './icons';

interface InfoModalProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}

const InfoModal: React.FC<InfoModalProps> = ({ title, onClose, children }) => {
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 transition-opacity duration-300" 
            aria-labelledby="modal-title" 
            role="dialog" 
            aria-modal="true"
        >
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-auto transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale" role="document">
                <div className="p-5 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2" id="modal-title">
                        <InformationCircleIcon className="w-6 h-6 text-indigo-600" />
                        {title}
                    </h3>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-slate-800 text-2xl leading-none font-bold"
                        aria-label="Close"
                    >
                        &times;
                    </button>
                </div>
                <div className="p-6 text-slate-600 space-y-4">
                    {children}
                </div>
                <div className="bg-slate-50 px-6 py-4 rounded-b-xl flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-6 py-2 bg-indigo-700 text-base font-medium text-white hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 sm:text-sm"
                    >
                        OK
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes fade-in-scale {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in-scale { animation: fade-in-scale 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default InfoModal;
