import React, { useState } from 'react';
import type { Teacher, AttendanceStatus, TeacherAttendanceRecord } from '../types';
import { SpinnerIcon } from './icons';

interface TeacherAttendanceProps {
    teachers: Teacher[];
    attendance: Map<string, { status: AttendanceStatus, comment: string }>;
    onAttendanceChange: React.Dispatch<React.SetStateAction<Map<string, { status: AttendanceStatus, comment: string }>>>;
    onSubmit: (records: TeacherAttendanceRecord[]) => Promise<void>;
}

const TeacherAttendance: React.FC<TeacherAttendanceProps> = ({ teachers, attendance, onAttendanceChange, onSubmit }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleStatusChange = (teacherId: string, status: AttendanceStatus) => {
        onAttendanceChange(prev => {
            const newAttendance = new Map<string, { status: AttendanceStatus, comment: string }>(prev);
            const current = newAttendance.get(teacherId) || { status: 'Present', comment: '' };
            newAttendance.set(teacherId, { status, comment: current.comment });
            return newAttendance;
        });
    };

    const handleCommentChange = (teacherId: string, comment: string) => {
        onAttendanceChange(prev => {
            const newAttendance = new Map<string, { status: AttendanceStatus, comment: string }>(prev);
            const current = newAttendance.get(teacherId) || { status: 'Present', comment: '' };
            newAttendance.set(teacherId, { status: current.status, comment });
            return newAttendance;
        });
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        const records: TeacherAttendanceRecord[] = teachers.map(teacher => {
            const record = attendance.get(teacher.id) || { status: 'Present', comment: '' };
            return {
                teacherId: teacher.id,
                teacherName: teacher.name,
                date: date,
                status: record.status,
                comment: record.comment,
            };
        });
        await onSubmit(records);
        setIsSubmitting(false);
    };

    const statuses: AttendanceStatus[] = ['Present', 'Absent', 'Late', 'Half Day'];

    return (
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20">
            <div className="p-4 border-b border-slate-300/50 dark:border-slate-700/50 space-y-4 md:flex md:items-center md:justify-between md:space-y-0">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Manual Teacher Attendance</h2>
                <div className="flex items-center gap-4">
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={teachers.length === 0 || isSubmitting}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-purple-400 disabled:cursor-wait transition-all duration-300 transform hover:scale-105"
                    >
                        {isSubmitting ? <><SpinnerIcon className="w-5 h-5 mr-2" />Submitting...</> : 'Submit'}
                    </button>
                </div>
            </div>
            
            <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-slate-200/50 dark:divide-slate-700/50">
                    <thead className="bg-slate-50/70 dark:bg-slate-900/70 sticky top-0 backdrop-blur-sm">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Teacher</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Attendance</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Comment</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                        {teachers.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="text-center text-slate-500 py-8">
                                    No teacher data found.
                                </td>
                            </tr>
                        ) : teachers.map((teacher) => {
                            const teacherAttendance = attendance.get(teacher.id) || { status: 'Present', comment: ''};
                            return (
                                <tr key={teacher.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-50">{teacher.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        <select
                                            name={`attendance-${teacher.id}`}
                                            value={teacherAttendance.status}
                                            onChange={(e) => handleStatusChange(teacher.id, e.target.value as AttendanceStatus)}
                                            className="w-full p-2 border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        >
                                            {statuses.map(status => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        <input
                                            type="text"
                                            value={teacherAttendance.comment}
                                            onChange={(e) => handleCommentChange(teacher.id, e.target.value)}
                                            className="w-full max-w-xs px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TeacherAttendance;