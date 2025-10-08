import React, { useState, useEffect } from 'react';
import {
    login,
    syncAllData,
    uploadStudentAttendance,
    uploadTeacherAttendance,
} from './api';
import type { Student, Teacher, StudentAttendanceRecord, AttendanceStatus, TeacherAttendanceRecord, User, ClassData } from './types';
import QrScanner from './components/QrScanner';
import AttendanceList from './components/AttendanceList';
import DataControls from './components/ExportControls';
import TeacherAttendance from './components/TeacherAttendance';
import DataViewer from './components/DataViewer';
import Settings from './components/Settings';
import Login from './components/Login';
import ScanSuccessModal from './components/ScanSuccessModal';
import StaticSiteDownloader from './components/StaticSiteDownloader';
import Header from './components/Header';
// FIX: Corrected import path for ClassManager.
import ClassManager from './components/ClassManager';
import { QrCodeIcon, CameraIcon, StopIcon, UsersIcon, IdentificationIcon, SettingsIcon, SpinnerIcon, DownloadIcon, BookOpenIcon } from './components/icons';

type View = 'student_attendance' | 'teacher_attendance' | 'class_management' | 'data_viewer' | 'settings' | 'export_website';

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const storedUser = localStorage.getItem('CURRENT_USER');
        return storedUser ? JSON.parse(storedUser) : null;
    });
    const [secretKey, setSecretKey] = useState<string | null>(() => localStorage.getItem('API_SECRET_KEY'));
    const [isSyncingOnLoad, setIsSyncingOnLoad] = useState(true);
    const [view, setView] = useState<View>('student_attendance');
    const [syncError, setSyncError] = useState<string | null>(null);

    // Data state
    const [students, setStudents] = useState<Student[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [studentMap, setStudentMap] = useState<Map<string, Student>>(new Map());

    // Student attendance state
    const [isScanning, setIsScanning] = useState(false);
    const [lastScannedInfo, setLastScannedInfo] = useState<{ student: Student, time: Date } | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);
    const [attendanceRecords, setAttendanceRecords] = useState<StudentAttendanceRecord[]>([]);
    
    // Teacher attendance state
    const [teacherAttendance, setTeacherAttendance] = useState<Map<string, { status: AttendanceStatus; comment: string }>>(new Map());


    // Effects
    useEffect(() => {
        if (currentUser && secretKey) {
            handleSync(secretKey);
        } else {
            setIsSyncingOnLoad(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    useEffect(() => {
        if (students.length > 0) {
            const map = new Map<string, Student>();
            students.forEach(s => map.set(s.studentId, s));
            setStudentMap(map);
        }
    }, [students]);

    // Handlers
    const handleLoginSuccess = (user: User) => {
        localStorage.setItem('CURRENT_USER', JSON.stringify(user));
        setCurrentUser(user);
    };

    const handleSaveKey = (key: string) => {
        localStorage.setItem('API_SECRET_KEY', key);
        setSecretKey(key);
        setView('student_attendance');
        handleSync(key);
    };
    
    const handleLogout = () => {
        localStorage.removeItem('CURRENT_USER');
        localStorage.removeItem('API_SECRET_KEY');
        setCurrentUser(null);
        setSecretKey(null);
        // Clear all local data
        setStudents([]);
        setTeachers([]);
        setClasses([]);
        setStudentMap(new Map());
        setAttendanceRecords([]);
        setTeacherAttendance(new Map());
        setSyncError(null);
    };

    const handleSync = async (key: string | null = secretKey) => {
        if (!key) {
            setSyncError("Cannot sync: Secret API key is not set.");
            return;
        }
        setSyncError(null);
        try {
            const { students: fetchedStudents, teachers: fetchedTeachers, classes: fetchedClasses } = await syncAllData(key);
            setStudents(fetchedStudents);
            setTeachers(fetchedTeachers);
            setClasses(fetchedClasses);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setSyncError(`Failed to sync with the school server: ${errorMessage}. Please check your Secret Key and network connection.`);
        } finally {
            if (isSyncingOnLoad) setIsSyncingOnLoad(false);
        }
    };
    
    const handleScanSuccess = async (decodedText: string) => {
        if (!secretKey) {
            setScanError("Cannot submit attendance: Secret API key is not set.");
            return;
        }
        setScanError(null);
        setLastScannedInfo(null);
        try {
            const { id, name } = JSON.parse(decodedText);
            if (!id || !name) throw new Error("Invalid QR code format.");

            if (attendanceRecords.some(rec => rec.id === id)) {
                setScanError(`Already marked present: ${name} (${id})`);
                return;
            }
            
            const student = studentMap.get(id);
            if (!student) {
                setScanError(`Student with ID ${id} not found. Please sync data first.`);
                return;
            }

            const newRecord = { id, name, timestamp: new Date() };
            await uploadStudentAttendance([newRecord], secretKey);
            setAttendanceRecords(prev => [newRecord, ...prev]);
            setLastScannedInfo({ student, time: newRecord.timestamp });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setScanError(`Failed to process QR code. Error: ${errorMessage}`);
        }
    };

    const handleScanError = (errorMessage: string) => {
        if (errorMessage && !errorMessage.toLowerCase().includes('no qr code found')) {
            setScanError(errorMessage);
        }
    };

    const handleSubmitTeacherAttendance = async (records: TeacherAttendanceRecord[]) => {
        if (!secretKey) {
            alert("Cannot submit attendance: Secret API key is not set.");
            return;
        }
        try {
            await uploadTeacherAttendance(records, secretKey);
            alert("Teacher attendance submitted successfully!");
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            alert(`Submission failed: ${errorMessage}`);
        }
    };


    // Render logic
    if (!currentUser) {
        return <Login onLogin={login} onLoginSuccess={handleLoginSuccess} />;
    }

    if (isSyncingOnLoad) {
        return (
            <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center gap-4">
                <SpinnerIcon className="w-12 h-12 text-indigo-700" />
                <p className="text-slate-600">Connecting to school server...</p>
            </div>
        );
    }
    
    if (!secretKey) {
        return (
             <div className="min-h-screen bg-slate-100 font-sans">
                 <Header currentUser={currentUser} onLogout={()=>{}} onNavigate={()=>{}}/>
                 <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    <Settings onSaveKey={handleSaveKey} initialSetup={true} currentUser={currentUser} />
                 </main>
            </div>
        )
    }

    const renderView = () => {
        switch (view) {
            case 'student_attendance':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        <div className="space-y-6">
                            <div className="p-6 bg-white rounded-lg shadow-lg">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">QR Code Scanner</h3>
                                <button
                                    onClick={() => setIsScanning(!isScanning)}
                                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-700 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
                                >
                                    {isScanning ? <><StopIcon className="w-5 h-5 mr-2" /> Stop Scanner</> : <><CameraIcon className="w-5 h-5 mr-2" /> Start Scanner</>}
                                </button>
                                {isScanning && <div className="mt-4 border-t pt-4"><QrScanner onScanSuccess={handleScanSuccess} onScanError={handleScanError} /></div>}
                                {scanError && <p className="mt-2 text-sm text-red-600">{scanError}</p>}
                            </div>
                            <DataControls onSync={() => handleSync()} />
                        </div>
                        <AttendanceList records={attendanceRecords} />
                    </div>
                );
            case 'teacher_attendance':
                return <TeacherAttendance teachers={teachers} attendance={teacherAttendance} onAttendanceChange={setTeacherAttendance} onSubmit={handleSubmitTeacherAttendance} />;
            case 'class_management':
                return <ClassManager initialClasses={classes} secretKey={secretKey} onDataChange={() => handleSync()} />;
            case 'data_viewer':
                return <DataViewer students={students} teachers={teachers} />;
            case 'settings':
                return <Settings onSaveKey={handleSaveKey} onLogout={handleLogout} secretKey={secretKey} currentUser={currentUser} />;
            case 'export_website':
                return <StaticSiteDownloader />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans">
            {lastScannedInfo && (
                <ScanSuccessModal 
                    student={lastScannedInfo.student} 
                    scanTime={lastScannedInfo.time}
                    onClose={() => setLastScannedInfo(null)}
                />
            )}
            <Header currentUser={currentUser} onLogout={handleLogout} onNavigate={(view) => setView(view as View)} />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {syncError && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow" role="alert">
                        <p className="font-bold">Data Sync Error</p>
                        <p>{syncError}</p>
                    </div>
                )}
                 <div className="mb-8">
                    <div className="sm:hidden">
                        <select
                            id="tabs"
                            name="tabs"
                            className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm rounded-md"
                            onChange={(e) => setView(e.target.value as View)}
                            value={view}
                        >
                            <option value="student_attendance">Student Attendance</option>
                            <option value="teacher_attendance">Teacher Attendance</option>
                            <option value="class_management">Class</option>
                            <option value="data_viewer">Manage Data & IDs</option>
                            <option value="export_website">Export Website</option>
                            <option value="settings">Settings</option>
                        </select>
                    </div>
                    <div className="hidden sm:block">
                        <div className="border-b border-slate-200">
                            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                                <button
                                    onClick={() => setView('student_attendance')}
                                    className={`${view === 'student_attendance' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                                >
                                    <QrCodeIcon className="w-5 h-5" />
                                    Student Attendance
                                </button>
                                <button
                                    onClick={() => setView('teacher_attendance')}
                                    className={`${view === 'teacher_attendance' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                                >
                                    <UsersIcon className="w-5 h-5" />
                                    Teacher Attendance
                                </button>
                                 <button
                                    onClick={() => setView('class_management')}
                                    className={`${view === 'class_management' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                                >
                                    <BookOpenIcon className="w-5 h-5" />
                                    Class
                                </button>
                                <button
                                    onClick={() => setView('data_viewer')}
                                    className={`${view === 'data_viewer' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                                >
                                    <IdentificationIcon className="w-5 h-5" />
                                    Manage Data & IDs
                                </button>
                                <button
                                    onClick={() => setView('export_website')}
                                    className={`${view === 'export_website' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                                >
                                    <DownloadIcon className="w-5 h-5" />
                                    Export Website
                                </button>
                                <button
                                    onClick={() => setView('settings')}
                                    className={`${view === 'settings' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                                >
                                    <SettingsIcon className="w-5 h-5" />
                                    Settings
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>

                {renderView()}
            </main>
        </div>
    );
};

export default App;
