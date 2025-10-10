
import React from 'react';
import type { StudentAttendanceRecord } from '../types';
import { CheckCircleIcon, UserIcon } from './icons';

interface AttendanceListProps {
    records: StudentAttendanceRecord[];
}

const AttendanceList: React.FC<AttendanceListProps> = ({ records }) => {
    return (
        <div className="w-full overflow-hidden">
            <div className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Attendance Log ({records.length})</h3>
            </div>
             {records.length === 0 ? (
                <div className="text-center text-slate-500 dark:text-slate-400 py-16 px-6">
                    <p className="font-semibold">No students marked present yet.</p>
                    <p className="text-sm mt-1">Start the scanner to begin taking attendance.</p>
                </div>
            ) : (
                <div className="max-h-[28rem] overflow-y-auto">
                    <table className="min-w-full">
                        <thead className="bg-slate-50/70 dark:bg-slate-900/70 sticky top-0 backdrop-blur-sm">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Student</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                            {records.map((record) => (
                                <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center space-x-3">
                                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                                                <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-slate-900 dark:text-slate-50">{record.name}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">ID: {record.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                                        {record.timestamp.toLocaleTimeString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AttendanceList;