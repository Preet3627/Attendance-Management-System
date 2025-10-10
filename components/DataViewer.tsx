import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { Student, Teacher, ClassData } from '../types';
import PrintableView from './PrintableView';
import InfoModal from './InfoModal';
import { UserIcon, UsersIcon, IdentificationIcon, InformationCircleIcon } from './icons';
import { formatClassName } from '../utils';

type PrintOrientation = 'portrait' | 'landscape';

interface DataViewerProps {
    students: Student[];
    teachers: Teacher[];
    classes: ClassData[];
}

const DataViewer: React.FC<DataViewerProps> = ({ students, teachers, classes }) => {
    const [view, setView] = useState<'students' | 'teachers'>('students');
    const [selectedPrintClass, setSelectedPrintClass] = useState<string>('all');
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [printOrientation, setPrintOrientation] = useState<PrintOrientation>('landscape');

    const classMap = useMemo(() => new Map(classes.map(c => [c.id, c])), [classes]);

    const filteredStudents = useMemo(() => students.filter(s => s.class && s.class.trim() !== '' && s.class.toLowerCase() !== 'null'), [students]);

    const handlePrint = () => {
        setTimeout(() => window.print(), 100);
    };
    
    const printRoot = document.getElementById('print-root');

    const groupedStudents = useMemo((): Record<string, Student[]> | null => {
        if (view !== 'students') return null;
        const groups = filteredStudents.reduce((acc, student) => {
            const classInfo = classMap.get(student.class);
            const groupKey = classInfo ? formatClassName(classInfo.class_name) : 'Unassigned Students';
            if (!acc[groupKey]) acc[groupKey] = [];
            acc[groupKey].push(student);
            return acc;
        }, {} as Record<string, Student[]>);

        const sortedEntries = Object.entries(groups).sort(([a], [b]) => {
            if (a === 'Unassigned Students') return 1;
            if (b === 'Unassigned Students') return -1;
            return a.localeCompare(b);
        });
        return Object.fromEntries(sortedEntries);
    }, [filteredStudents, view, classMap]);

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
        const securePhotoUrl = person.profilePhotoUrl?.replace(/^http:\/\//i, 'https');
        const photoCell = (
             <td className="px-6 py-2">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden ring-2 ring-white/10">
                    {securePhotoUrl ? <img src={securePhotoUrl} alt={type === 'student' ? (person as Student).studentName : (person as Teacher).name} className="w-full h-full object-cover" /> : <UserIcon className="w-6 h-6 text-slate-400 dark:text-slate-500" />}
                </div>
            </td>
        );

        if (view === 'students' && 'studentId' in person) {
            const student = person as Student;
            const classInfo = classMap.get(student.class);
            const displayClassName = classInfo ? formatClassName(classInfo.class_name) : 'Unassigned';

            return (
                <tr key={student.studentId}>
                    {photoCell}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{student.studentId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-50">{student.studentName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{displayClassName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{student.rollNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{student.contactNumber}</td>
                </tr>
            );
        }
        if (view === 'teachers' && 'id' in person) {
            const teacher = person as Teacher;
            return (
                <tr key={teacher.id}>
                    {photoCell}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{teacher.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-50">{teacher.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{teacher.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{teacher.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{teacher.phone}</td>
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
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20">
            <div className="p-4 border-b border-slate-300/50 dark:border-slate-700/50 flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex items-center gap-4">
                     <div className="sm:hidden">
                        <select
                            id="tabs-mobile"
                            name="tabs-mobile"
                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-slate-600 bg-white/70 dark:bg-slate-800/70 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-xl"
                            onChange={(e) => setView(e.target.value as 'students' | 'teachers')}
                            value={view}
                        >
                            <option value="students">Students</option>
                            <option value="teachers">Teachers</option>
                        </select>
                    </div>
                    <div className="hidden sm:block">
                        <nav className="flex space-x-4" aria-label="Tabs">
                             <button onClick={() => setView('students')} className={`px-3 py-2 font-medium text-sm rounded-md flex items-center gap-2 ${view === 'students' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300' : 'text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white'}`}>
                                <UsersIcon className="w-5 h-5" /> Students ({filteredStudents.length})
                            </button>
                             <button onClick={() => setView('teachers')} className={`px-3 py-2 font-medium text-sm rounded-md flex items-center gap-2 ${view === 'teachers' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300' : 'text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white'}`}>
                                <UserIcon className="w-5 h-5" /> Teachers ({teachers.length})
                            </button>
                        </nav>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    <div className="flex-grow flex flex-col gap-2">
                        {view === 'students' && groupedStudents && (
                            <select
                                value={selectedPrintClass}
                                onChange={(e) => setSelectedPrintClass(e.target.value)}
                                className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-800/70 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-xl"
                            >
                                <option value="all">Print All Classes</option>
                                {Object.keys(groupedStudents).map(className => (
                                    <option key={className} value={className}>{`Print ${className}`}</option>
                                ))}
                            </select>
                        )}
                         <div className="flex items-center space-x-4 p-2 rounded-xl bg-slate-200/50 dark:bg-slate-900/50">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Orientation:</span>
                            <div className="flex items-center">
                                <input id="portrait" name="orientation" type="radio" checked={printOrientation === 'portrait'} onChange={() => setPrintOrientation('portrait')} className="focus:ring-purple-500 h-4 w-4 text-purple-600 border-gray-300" />
                                <label htmlFor="portrait" className="ml-2 block text-sm text-gray-900 dark:text-slate-100">Portrait</label>
                            </div>
                            <div className="flex items-center">
                                <input id="landscape" name="orientation" type="radio" checked={printOrientation === 'landscape'} onChange={() => setPrintOrientation('landscape')} className="focus:ring-purple-500 h-4 w-4 text-purple-600 border-gray-300" />
                                <label htmlFor="landscape" className="ml-2 block text-sm text-gray-900 dark:text-slate-100">Landscape</label>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handlePrint}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 flex-shrink-0 h-full"
                    >
                        <IdentificationIcon className="w-5 h-5" />
                        Print ID Cards
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto max-h-[32rem]">
                <table className="min-w-full divide-y divide-slate-200/50 dark:divide-slate-700/50">
                    <thead className="bg-slate-50/70 dark:bg-slate-900/70 sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                            {tableHeaders.map(header => (
                                <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    <div className="flex items-center gap-1">
                                       {header}
                                       {header === 'Photo' && (
                                           <button onClick={() => setIsInfoModalOpen(true)} title="How to change photos">
                                               <InformationCircleIcon className="w-4 h-4 text-slate-400 hover:text-purple-500" />
                                           </button>
                                       )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                       {view === 'students' ? (
                            groupedStudents && Object.keys(groupedStudents).length > 0 ? (
                                Object.keys(groupedStudents).map(groupName => {
                                    const studentsInGroup = groupedStudents[groupName];
                                    return (
                                        <React.Fragment key={groupName}>
                                            <tr className="bg-slate-100/70 dark:bg-slate-900/70">
                                                <th colSpan={tableHeaders.length} className="px-6 py-2 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 sticky top-12 backdrop-blur-sm">
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
                <PrintableView people={peopleToPrint} type={type} orientation={printOrientation} classMap={classMap} />,
                printRoot
            )}
        </div>
        </>
    );
};

export default DataViewer;