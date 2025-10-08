import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { Student, Teacher } from '../types';
import PrintableView from './PrintableView';
import InfoModal from './InfoModal';
import { UserIcon, UsersIcon, IdentificationIcon, InformationCircleIcon } from './icons';
import { formatClassName } from '../utils';

interface DataViewerProps {
    students: Student[];
    teachers: Teacher[];
}

const DataViewer: React.FC<DataViewerProps> = ({ students, teachers }) => {
    const [view, setView] = useState<'students' | 'teachers'>('students');
    const [selectedPrintClass, setSelectedPrintClass] = useState<string>('all');
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

    const filteredStudents = useMemo(() => students.filter(s => s.class && s.class.trim() !== '' && s.class.toLowerCase() !== 'null'), [students]);

    const handlePrint = () => {
        setTimeout(() => window.print(), 100);
    };
    
    const printRoot = document.getElementById('print-root');

    const groupedStudents = useMemo((): Record<string, Student[]> | null => {
        if (view !== 'students') return null;
        const groups = filteredStudents.reduce((acc, student) => {
            const groupKey = formatClassName(student.class);
            if (!acc[groupKey]) acc[groupKey] = [];
            acc[groupKey].push(student);
            return acc;
        }, {} as Record<string, Student[]>);
        return Object.fromEntries(Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))) as Record<string, Student[]>;
    }, [filteredStudents, view]);

    useEffect(() => {
        setSelectedPrintClass('all');
    }, [view]);

    const peopleToPrint = useMemo(() => {
        if (view === 'teachers') return teachers;
        if (selectedPrintClass === 'all') return filteredStudents;
        return groupedStudents?.[selectedPrintClass] || [];
    }, [view, selectedPrintClass, filteredStudents, groupedStudents, teachers]);

    const type = view === 'students' ? 'student' : 'teacher';
    
    const tableHeaders = view === 'students'
        ? ['Photo', 'ID', 'Name', 'Class', 'Roll No.', 'Contact']
        : ['Photo', 'ID', 'Name', 'Role', 'Email', 'Phone'];

    const renderTableRow = (person: Student | Teacher) => {
        const securePhotoUrl = person.profilePhotoUrl?.replace(/^http:\/\//i, 'https://');
        const photoCell = (
             <td className="px-6 py-2">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden ring-2 ring-white">
                    {securePhotoUrl ? <img src={securePhotoUrl} alt={type === 'student' ? (person as Student).studentName : (person as Teacher).name} className="w-full h-full object-cover" /> : <UserIcon className="w-6 h-6 text-slate-400" />}
                </div>
            </td>
        );

        if (view === 'students' && 'studentId' in person) {
            const student = person as Student;
            return (
                <tr key={student.studentId}>
                    {photoCell}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{student.studentId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{student.studentName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatClassName(student.class)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{student.rollNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{student.contactNumber}</td>
                </tr>
            );
        }
        if (view === 'teachers' && 'id' in person) {
            const teacher = person as Teacher;
            return (
                <tr key={teacher.id}>
                    {photoCell}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{teacher.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{teacher.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{teacher.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{teacher.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{teacher.phone}</td>
                </tr>
            );
        }
        return null;
    };

    return (
        <>
        {isInfoModalOpen && (
            <InfoModal title="How to Change Profile Photos" onClose={() => setIsInfoModalOpen(false)}>
                <p>Profile photos are managed by the School Management plugin within your WordPress dashboard.</p>
                <p>To change a student or teacher's photo, please log in to your WordPress admin account, navigate to the user's profile, and upload a new avatar there. The changes will appear in this app after the next data sync.</p>
            </InfoModal>
        )}
        <div className="bg-white rounded-lg shadow-lg">
            <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                     <div className="sm:hidden">
                        <select
                            id="tabs-mobile"
                            name="tabs-mobile"
                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm rounded-md"
                            onChange={(e) => setView(e.target.value as 'students' | 'teachers')}
                            value={view}
                        >
                            <option value="students">Students</option>
                            <option value="teachers">Teachers</option>
                        </select>
                    </div>
                    <div className="hidden sm:block">
                        <nav className="flex space-x-4" aria-label="Tabs">
                             <button onClick={() => setView('students')} className={`px-3 py-2 font-medium text-sm rounded-md flex items-center gap-2 ${view === 'students' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
                                <UsersIcon className="w-5 h-5" /> Students ({filteredStudents.length})
                            </button>
                             <button onClick={() => setView('teachers')} className={`px-3 py-2 font-medium text-sm rounded-md flex items-center gap-2 ${view === 'teachers' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
                                <UserIcon className="w-5 h-5" /> Teachers ({teachers.length})
                            </button>
                        </nav>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {view === 'students' && groupedStudents && (
                        <select
                            value={selectedPrintClass}
                            onChange={(e) => setSelectedPrintClass(e.target.value)}
                            className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm rounded-md"
                        >
                            <option value="all">Print All Classes</option>
                            {Object.keys(groupedStudents).map(className => (
                                <option key={className} value={className}>{`Print ${className}`}</option>
                            ))}
                        </select>
                    )}
                    <button
                        onClick={handlePrint}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-700 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 flex-shrink-0"
                    >
                        <IdentificationIcon className="w-5 h-5" />
                        Print ID Cards
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto max-h-[32rem]">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                            {tableHeaders.map(header => (
                                <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    <div className="flex items-center gap-1">
                                       {header}
                                       {header === 'Photo' && (
                                           <button onClick={() => setIsInfoModalOpen(true)} title="How to change photos">
                                               <InformationCircleIcon className="w-4 h-4 text-slate-400 hover:text-indigo-600" />
                                           </button>
                                       )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                       {view === 'students' ? (
                            groupedStudents && Object.keys(groupedStudents).length > 0 ? (
                                Object.keys(groupedStudents).map(groupName => {
                                    const studentsInGroup = groupedStudents[groupName];
                                    return (
                                        <React.Fragment key={groupName}>
                                            <tr className="bg-slate-100">
                                                <th colSpan={tableHeaders.length} className="px-6 py-2 text-left text-sm font-semibold text-slate-700 sticky top-12 bg-slate-100">
                                                    {groupName}
                                                </th>
                                            </tr>
                                            {studentsInGroup.map(student => renderTableRow(student))}
                                        </React.Fragment>
                                    );
                                })
                            ) : (
                                <tr><td colSpan={tableHeaders.length} className="text-center text-slate-500 py-8">No student data available.</td></tr>
                            )
                        ) : (
                            teachers.length > 0 ? (
                                teachers.map(teacher => renderTableRow(teacher))
                            ) : (
                                <tr><td colSpan={tableHeaders.length} className="text-center text-slate-500 py-8">No teacher data available.</td></tr>
                            )
                        )}
                    </tbody>
                </table>
            </div>

            {printRoot && ReactDOM.createPortal(
                <PrintableView people={peopleToPrint} type={type} />,
                printRoot
            )}
        </div>
        </>
    );
};

export default DataViewer;