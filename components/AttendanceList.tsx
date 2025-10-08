
import React from 'react';
import type { StudentAttendanceRecord } from '../types';
import { CheckCircleIcon } from './icons';

interface AttendanceListProps {
    records: StudentAttendanceRecord[];
}

const AttendanceList: React.FC<AttendanceListProps> = ({ records }) => {
    if (records.length === 0) {
        return (
            <div className="text-center text-slate-500 py-8">
                <p>No students marked present yet.</p>
                <p>Start the scanner to begin taking attendance.</p>
            </div>
        );
    }

    return (
        <div className="w-full bg-white rounded-lg shadow-md">
            <div className="p-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800">Attendance Log ({records.length})</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
                <ul className="divide-y divide-slate-200">
                    {records.map((record) => (
                        <li key={record.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div className="flex items-center space-x-4">
                                <CheckCircleIcon className="w-6 h-6 text-green-500" />
                                <div>
                                    <p className="font-medium text-slate-900">{record.name}</p>
                                    <p className="text-sm text-slate-500">ID: {record.id}</p>
                                </div>
                            </div>
                            <p className="text-sm text-slate-600">
                                {record.timestamp.toLocaleTimeString()}
                            </p>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default AttendanceList;