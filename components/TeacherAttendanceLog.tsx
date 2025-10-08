import React from 'react';
import type { TeacherAttendanceRecord } from '../types';
import { CheckCircleIcon } from './icons';

interface TeacherAttendanceLogProps {
    records: TeacherAttendanceRecord[];
}

const TeacherAttendanceLog: React.FC<TeacherAttendanceLogProps> = ({ records }) => {
    return (
        <div className="w-full bg-white rounded-lg shadow-lg overflow-hidden">
             {records.length === 0 ? (
                <div className="text-center text-slate-500 py-16 px-6">
                    <p className="font-semibold">No teachers marked present yet.</p>
                    <p className="text-sm mt-1">Scan a teacher's QR code to mark them present.</p>
                </div>
            ) : (
                <div className="max-h-[28rem] overflow-y-auto">
                    <table className="min-w-full">
                        <thead className="bg-slate-50 sticky top-0">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Teacher</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Comment</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {records.map((record) => (
                                <tr key={record.teacherId} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center space-x-3">
                                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                                <CheckCircleIcon className="w-6 h-6 text-green-600" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-slate-900">{record.teacherName}</div>
                                                <div className="text-xs text-slate-500">ID: {record.teacherId}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                        {record.comment}
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

export default TeacherAttendanceLog;
