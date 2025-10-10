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
import TeacherAttendanceLog from './components/TeacherAttendanceLog';
import DataControls from './components/ExportControls';
import TeacherAttendance from './components/TeacherAttendance';
import DataViewer from './components/DataViewer';
import Settings from './components/Settings';
import Login from './components/Login';
import ScanSuccessModal from './components/ScanSuccessModal';
import Header from './components/Header';
import ClassManager from './components/ClassManager';
import { QrCodeIcon, CameraIcon, StopIcon, UsersIcon, IdentificationIcon, SettingsIcon, SpinnerIcon, BookOpenIcon } from './components/icons';

type View = 'qr_attendance' | 'teacher_attendance' | 'class_management' | 'data_viewer' | 'settings';
type Theme = 'light' | 'dark';

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const storedUser = localStorage.getItem('CURRENT_USER');
        return storedUser ? JSON.parse(storedUser) : null;
    });
    const [secretKey, setSecretKey] = useState<string | null>(() => localStorage.getItem('API_SECRET_KEY'));
    const [isSyncingOnLoad, setIsSyncingOnLoad] = useState(true);
    const [view, setView] = useState<View>('qr_attendance');
    const [syncError, setSyncError] = useState<string | null>(null);
    const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('THEME') as Theme) || 'light');

    // Data state
    const [students, setStudents] = useState<Student[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [studentMap, setStudentMap] = useState<Map<string, Student>>(new Map());
    const [teacherMap, setTeacherMap] = useState<Map<string, Teacher>>(new Map());

    // Student attendance state
    const [isScanning, setIsScanning] = useState(false);
    const [lastScannedInfo, setLastScannedInfo] = useState<{ person: Student | Teacher, time: Date } | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);
    const [attendanceRecords, setAttendanceRecords] = useState<StudentAttendanceRecord[]>([]);
    
    // Teacher attendance state
    const [teacherAttendance, setTeacherAttendance] = useState<Map<string, { status: AttendanceStatus; comment: string }>>(new Map());
    const [teacherScanRecords, setTeacherScanRecords] = useState<TeacherAttendanceRecord[]>([]);

    // Effects
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('THEME', theme);
    }, [theme]);

    useEffect(() => {
        if (currentUser && secretKey) {
            handleSync(secretKey);
        } else {
            setIsSyncingOnLoad(false);
        }
    }, [currentUser, secretKey]);

    useEffect(() => {
        setStudentMap(new Map(students.map(s => [s.studentId, s])));
    }, [students]);

    useEffect(() => {
        setTeacherMap(new Map(teachers.map(t => [t.id, t])));
    }, [teachers]);

    // Handlers
    const handleLoginSuccess = (user: User) => {
        localStorage.setItem('CURRENT_USER', JSON.stringify(user));
        setCurrentUser(user);
    };

    const handleSaveKey = (key: string) => {
        localStorage.setItem('API_SECRET_KEY', key);
        setSecretKey(key);
        setView('qr_attendance');
        if(!isSyncingOnLoad) { // Prevent double sync on initial load
           handleSync(key);
        }
    };
    
    const handleLogout = () => {
        localStorage.removeItem('CURRENT_USER');
        localStorage.removeItem('API_SECRET_KEY');
        setCurrentUser(null);
        setSecretKey(null);
        setStudents([]);
        setTeachers([]);
        setClasses([]);
        setStudentMap(new Map());
        setTeacherMap(new Map());
        setAttendanceRecords([]);
        setTeacherScanRecords([]);
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
            setScanError("Cannot process scan: Secret API key is not set.");
            return;
        }
        setScanError(null);
        setLastScannedInfo(null);

        try {
            const qrData = JSON.parse(decodedText);
            const { id, name, type } = qrData;
            if (!id || !name) throw new Error("Invalid QR code format.");

            const scanTime = new Date();
            const timeString = scanTime.toLocaleTimeString();

            if (type === 'teacher') {
                const teacher = teacherMap.get(id);
                if (!teacher) {
                    setScanError(`Teacher with ID ${id} not found. Please sync data.`);
                    return;
                }
                if (teacherScanRecords.some(rec => rec.teacherId === id)) {
                    setScanError(`Teacher ${name} already marked present.`);
                    return;
                }
                // Update manual attendance state
                setTeacherAttendance(prev => {
                    const newAttendance = new Map(prev);
                    newAttendance.set(id, { status: 'Present', comment: `Scanned at ${timeString}` });
                    return newAttendance;
                });
                // Add to scan log for this session
                const newRecord: TeacherAttendanceRecord = {
                    teacherId: id,
                    teacherName: name,
                    date: scanTime.toISOString().split('T')[0],
                    status: 'Present',
                    comment: `Scanned at ${timeString}`
                };
                setTeacherScanRecords(prev => [newRecord, ...prev]);
                setLastScannedInfo({ person: teacher, time: scanTime });

            } else { // Default to student
                if (attendanceRecords.some(rec => rec.id === id)) {
                    setScanError(`Already marked present: ${name} (${id})`);
                    return;
                }
                const student = studentMap.get(id);
                if (!student) {
                    setScanError(`Student with ID ${id} not found. Please sync data.`);
                    return;
                }
                const newRecord = { id, name, timestamp: scanTime };
                await uploadStudentAttendance([newRecord], secretKey);
                setAttendanceRecords(prev => [newRecord, ...prev]);
                setLastScannedInfo({ person: student, time: newRecord.timestamp });
            }
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

    if (!currentUser) return <Login onLogin={login} onLoginSuccess={handleLoginSuccess} />;

    if (isSyncingOnLoad) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center gap-4 bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <SpinnerIcon className="w-12 h-12 text-purple-600" />
                <p className="text-slate-600 dark:text-slate-300">Connecting to school server...</p>
            </div>
        );
    }
    
    if (!secretKey) {
        return (
             <div className="min-h-screen font-sans">
                 <Header currentUser={currentUser} onLogout={()=>{}} onNavigate={()=>{}} theme={theme} setTheme={setTheme} />
                 <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    <Settings onSaveKey={handleSaveKey} initialSetup={true} currentUser={currentUser} />
                 </main>
            </div>
        )
    }

    const QrAttendanceView = () => {
        const [logView, setLogView] = useState<'students'|'teachers'>('students');

        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="space-y-6">
                    <div className="p-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">QR Code Scanner</h3>
                        <button
                            onClick={() => setIsScanning(!isScanning)}
                            className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-xl shadow-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-300 transform hover:scale-105"
                        >
                            {isScanning ? <><StopIcon className="w-5 h-5 mr-2" /> Stop Scanner</> : <><CameraIcon className="w-5 h-5 mr-2" /> Start Scanner</>}
                        </button>
                        {isScanning && <div className="mt-4 border-t border-slate-300/50 dark:border-slate-700/50 pt-4"><QrScanner onScanSuccess={handleScanSuccess} onScanError={handleScanError} /></div>}
                        {scanError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{scanError}</p>}
                    </div>
                    <DataControls onSync={() => handleSync()} />
                </div>
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20">
                    <div className="border-b border-slate-300/50 dark:border-slate-700/50">
                         <nav className="-mb-px flex space-x-6 px-6" aria-label="Tabs">
                            <button onClick={() => setLogView('students')} className={`${logView === 'students' ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:border-slate-300 dark:hover:text-slate-200 dark:hover:border-slate-600'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}>
                                Student Log ({attendanceRecords.length})
                            </button>
                            <button onClick={() => setLogView('teachers')} className={`${logView === 'teachers' ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:border-slate-300 dark:hover:text-slate-200 dark:hover:border-slate-600'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}>
                                Teacher Log ({teacherScanRecords.length})
                            </button>
                         </nav>
                    </div>
                    {logView === 'students' ? <AttendanceList records={attendanceRecords} /> : <TeacherAttendanceLog records={teacherScanRecords} />}
                </div>
            </div>
        );
    };

    const renderView = () => {
        switch (view) {
            case 'qr_attendance':
                return <QrAttendanceView />;
            case 'teacher_attendance':
                return <TeacherAttendance teachers={teachers} attendance={teacherAttendance} onAttendanceChange={setTeacherAttendance} onSubmit={handleSubmitTeacherAttendance} />;
            case 'class_management':
                return <ClassManager initialClasses={classes} secretKey={secretKey} onDataChange={() => handleSync()} />;
            case 'data_viewer':
                return <DataViewer students={students} teachers={teachers} classes={classes} />;
            case 'settings':
                return <Settings onSaveKey={handleSaveKey} onLogout={handleLogout} secretKey={secretKey} currentUser={currentUser} />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen font-sans text-slate-800 dark:text-slate-200 transition-colors">
            {lastScannedInfo && (
                <ScanSuccessModal 
                    person={lastScannedInfo.person} 
                    scanTime={lastScannedInfo.time}
                    onClose={() => setLastScannedInfo(null)}
                />
            )}
            <Header currentUser={currentUser} onLogout={handleLogout} onNavigate={(view) => setView(view as View)} theme={theme} setTheme={setTheme} />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {syncError && (
                    <div className="bg-red-100/80 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg shadow-lg backdrop-blur-sm" role="alert">
                        <p className="font-bold">Data Sync Error</p>
                        <p>{syncError}</p>
                    </div>
                )}
                 <div className="mb-8">
                    <div className="sm:hidden">
                        <select
                            id="tabs"
                            name="tabs"
                            className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 bg-white/60 dark:bg-slate-800/60 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-xl backdrop-blur-xl"
                            onChange={(e) => setView(e.target.value as View)}
                            value={view}
                        >
                            <option value="qr_attendance">QR Attendance</option>
                            <option value="teacher_attendance">Teacher Attendance</option>
                            <option value="class_management">Class Management</option>
                            <option value="data_viewer">Manage Data & IDs</option>
                            <option value="settings">Settings</option>
                        </select>
                    </div>
                    <div className="hidden sm:block">
                        <div className="border-b border-slate-300/50 dark:border-slate-700/50">
                            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                                <button
                                    onClick={() => setView('qr_attendance')}
                                    className={`${view === 'qr_attendance' ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 cursor-pointer transition-colors`}
                                >
                                    <QrCodeIcon className="w-5 h-5" />
                                    QR Attendance
                                </button>
                                <button
                                    onClick={() => setView('teacher_attendance')}
                                    className={`${view === 'teacher_attendance' ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 cursor-pointer transition-colors`}
                                >
                                    <UsersIcon className="w-5 h-5" />
                                    Teacher Attendance
                                </button>
                                 <button
                                    onClick={() => setView('class_management')}
                                    className={`${view === 'class_management' ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 cursor-pointer transition-colors`}
                                >
                                    <BookOpenIcon className="w-5 h-5" />
                                    Class Management
                                </button>
                                <button
                                    onClick={() => setView('data_viewer')}
                                    className={`${view === 'data_viewer' ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 cursor-pointer transition-colors`}
                                >
                                    <IdentificationIcon className="w-5 h-5" />
                                    Manage Data & IDs
                                </button>
                                <button
                                    onClick={() => setView('settings')}
                                    className={`${view === 'settings' ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 cursor-pointer transition-colors`}
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