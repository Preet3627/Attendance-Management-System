import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import * as esbuild from 'esbuild-wasm';
import { DownloadIcon, SpinnerIcon } from './icons';

// This object contains the entire source code of the application.
// It acts as a virtual filesystem for the in-browser bundler.
const fileContents: Record<string, string> = {
  'index.tsx': `
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1>Something went wrong.</h1>
          <p>Please refresh the page and try again. Check the console for more details.</p>
        </div>
      );
    }

    return this.props.children; 
  }
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);`,
  'App.tsx': (document.querySelector('script[src="/App.tsx"]') as any)?.textContent || `
import React, { useState, useEffect } from 'react';
import {
    login,
    syncAllData,
    uploadStudentAttendance,
    uploadTeacherAttendance,
} from './api';
import type { Student, Teacher, StudentAttendanceRecord, AttendanceStatus, TeacherAttendanceRecord, User } from './types';
import QrScanner from './components/QrScanner';
import AttendanceList from './components/AttendanceList';
import DataControls from './components/ExportControls';
import TeacherAttendance from './components/TeacherAttendance';
import DataViewer from './components/DataViewer';
import Settings from './components/Settings';
import Login from './components/Login';
import ScanSuccessModal from './components/ScanSuccessModal';
import { QrCodeIcon, CameraIcon, StopIcon, UsersIcon, IdentificationIcon, SchoolLogo, SettingsIcon, SpinnerIcon, LogoutIcon } from './components/icons';

type View = 'student_attendance' | 'teacher_attendance' | 'data_viewer' | 'settings';

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
    }, [currentUser]);

    useEffect(() => {
        if (students.length > 0) {
            const map = new Map<string, Student>();
            students.forEach(s => map.set(s.studentId, s));
            setStudentMap(map);
        }
    }, [students]);

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
        setStudents([]);
        setTeachers([]);
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
            const { students: fetchedStudents, teachers: fetchedTeachers } = await syncAllData(key);
            setStudents(fetchedStudents);
            setTeachers(fetchedTeachers);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setSyncError(\`Failed to sync with the school server: \${errorMessage}. Please check your Secret Key and network connection.\`);
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
                setScanError(\`Already marked present: \${name} (\${id})\`);
                return;
            }
            
            const student = studentMap.get(id);
            if (!student) {
                setScanError(\`Student with ID \${id} not found. Please sync data first.\`);
                return;
            }

            const newRecord = { id, name, timestamp: new Date() };
            await uploadStudentAttendance([newRecord], secretKey);
            setAttendanceRecords(prev => [newRecord, ...prev]);
            setLastScannedInfo({ student, time: newRecord.timestamp });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setScanError(\`Failed to process QR code. Error: \${errorMessage}\`);
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
            alert(\`Submission failed: \${errorMessage}\`);
        }
    };

    if (!currentUser) {
        return <Login onLogin={login} onLoginSuccess={handleLoginSuccess} />;
    }

    if (isSyncingOnLoad) {
        return (
            <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center gap-4">
                <SpinnerIcon className="w-12 h-12 text-indigo-600" />
                <p className="text-slate-600">Connecting to school server...</p>
            </div>
        );
    }
    
    if (!secretKey) {
        return (
             <div className="min-h-screen bg-slate-100 font-sans">
                 <header className="bg-white shadow-md">
                     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                         <div className="flex justify-between items-center h-16">
                             <div className="flex items-center gap-4">
                                 <SchoolLogo className="h-12"/>
                                 <h1 className="text-xl font-bold text-slate-800">Attendance Portal Setup</h1>
                             </div>
                         </div>
                     </div>
                 </header>
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
                            <div className="p-6 bg-white rounded-lg shadow-md">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">QR Code Scanner</h3>
                                <button
                                    onClick={() => setIsScanning(!isScanning)}
                                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
            case 'data_viewer':
                return <DataViewer students={students} teachers={teachers} />;
            case 'settings':
                return <Settings onSaveKey={handleSaveKey} onLogout={handleLogout} secretKey={secretKey} currentUser={currentUser} />;
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
            <header className="bg-white shadow-md sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-4">
                            <SchoolLogo className="h-12"/>
                            <h1 className="text-xl font-bold text-slate-800">Attendance Portal</h1>
                        </div>
                         <button
                            onClick={handleLogout}
                            className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            <LogoutIcon className="w-5 h-5" />
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {syncError && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
                        <p className="font-bold">Data Sync Error</p>
                        <p>{syncError}</p>
                    </div>
                )}
                 <div className="mb-8">
                    <div className="sm:hidden">
                        <select
                            id="tabs"
                            name="tabs"
                            className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                            onChange={(e) => setView(e.target.value as View)}
                            value={view}
                        >
                            <option value="student_attendance">Student Attendance</option>
                            <option value="teacher_attendance">Teacher Attendance</option>
                            <option value="data_viewer">Manage Data & IDs</option>
                            <option value="settings">Settings</option>
                        </select>
                    </div>
                    <div className="hidden sm:block">
                        <div className="border-b border-slate-200">
                            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                                <button
                                    onClick={() => setView('student_attendance')}
                                    className={\`\${view === 'student_attendance' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2\`}
                                >
                                    <QrCodeIcon className="w-5 h-5" />
                                    Student Attendance
                                </button>
                                <button
                                    onClick={() => setView('teacher_attendance')}
                                    className={\`\${view === 'teacher_attendance' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2\`}
                                >
                                    <UsersIcon className="w-5 h-5" />
                                    Teacher Attendance
                                </button>
                                <button
                                    onClick={() => setView('data_viewer')}
                                    className={\`\${view === 'data_viewer' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2\`}
                                >
                                    <IdentificationIcon className="w-5 h-5" />
                                    Manage Data & IDs
                                </button>
                                <button
                                    onClick={() => setView('settings')}
                                    className={\`\${view === 'settings' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2\`}
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
`,
  'types.ts': `
export interface Student {
    studentId: string;
    studentName: string;
    class: string;
    section?: string;
    rollNumber: string;
    contactNumber: string;
    profilePhotoUrl?: string;
}

export interface Teacher {
    id: string;
    name: string;
    role: string;
    phone: string;
    email: string;
    profilePhotoUrl?: string;
}

export interface StudentAttendanceRecord {
    id: string;
    name: string;
    timestamp: Date;
}

export interface QrScanResult {
    decodedText: string;
    result: {
        format: {
            formatName: string;
        };
    };
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Half Day';

export interface TeacherAttendanceRecord {
    teacherId: string;
    teacherName: string;
    date: string; // YYYY-MM-DD
    status: AttendanceStatus;
    comment: string;
}

export interface User {
    email: string;
    password?: string;
    role: 'superuser' | 'user';
}
`,
  'api.ts': `
import type { Student, Teacher, StudentAttendanceRecord, TeacherAttendanceRecord, User } from './types';
import { API_BASE_URL } from './config';

const SUPERUSER_EMAIL = 'ponsri.big.gan.nav@gmail.com';
const SUPERUSER_PASS = 'Pvp3736@257237';
const USERS_STORAGE_KEY = 'app_users';

const getStoredUsers = (): User[] => {
    try {
        const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
        return usersJson ? JSON.parse(usersJson) : [];
    } catch {
        return [];
    }
};

const saveStoredUsers = (users: User[]) => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

export const login = async (email: string, password: string): Promise<User | null> => {
    if (email === SUPERUSER_EMAIL && password === SUPERUSER_PASS) {
        return { email, role: 'superuser' };
    }
    const users = getStoredUsers();
    const foundUser = users.find(u => u.email === email && u.password === password);
    if (foundUser) {
        return { email: foundUser.email, role: foundUser.role };
    }
    return null;
};

export const getUsers = async (): Promise<Omit<User, 'password'>[]> => {
    return getStoredUsers().map(({ email, role }) => ({ email, role }));
};

export const addUser = async (user: Required<User>): Promise<void> => {
    const users = getStoredUsers();
    if (users.some(u => u.email === user.email) || user.email === SUPERUSER_EMAIL) {
        throw new Error("User with this email already exists.");
    }
    users.push(user);
    saveStoredUsers(users);
};

export const deleteUser = async (email: string): Promise<void> => {
    let users = getStoredUsers();
    users = users.filter(u => u.email !== email);
    saveStoredUsers(users);
};

interface SyncDataResponse {
    students: Student[];
    teachers: Teacher[];
}

const apiFetch = async (endpoint: string, secretKey: string, options: RequestInit = {}): Promise<any> => {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    headers.set('X-Sync-Key', secretKey);

    const response = await fetch(\`\${API_BASE_URL}\${endpoint}\`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || 'An unknown API error occurred');
    }
    const responseText = await response.text();
    if (!responseText) {
        return null;
    }
    return JSON.parse(responseText);
};

export const syncAllData = async (secretKey: string): Promise<SyncDataResponse> => {
    const data = await apiFetch('/data', secretKey, { method: 'GET' });
    return data;
};

export const uploadStudentAttendance = async (records: StudentAttendanceRecord[], secretKey: string): Promise<boolean> => {
    const studentPayload = records.map(r => ({ id: r.id, timestamp: r.timestamp.toISOString() }));
    await apiFetch('/attendance', secretKey, {
        method: 'POST',
        body: JSON.stringify({ students: studentPayload }),
    });
    return true;
};

export const uploadTeacherAttendance = async (records: TeacherAttendanceRecord[], secretKey: string): Promise<void> => {
    await apiFetch('/attendance', secretKey, {
        method: 'POST',
        body: JSON.stringify({ teachers: records }),
    });
};
`,
  'config.ts': `
export const API_BASE_URL = 'https://ponsrischool.in/wp-json/custom-sync/v1';
`,
  'components/icons.tsx': `
import React from 'react';

export const QrCodeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6.5 6.5v2M4.5 12.5h-2M18 18.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM8.5 18.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM18.5 8.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM8.5 8.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM4 4h4v4H4V4zM4 16h4v4H4v-4zM16 4h4v4h-4V4zM16 16h4v4h-4v-4z" />
  </svg>
);
export const CameraIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
export const StopIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5h14v14H5V5z" />
    </svg>
);
export const CheckCircleIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
export const ExclamationCircleIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
export const UploadIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);
export const LogoutIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
);
export const SyncIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4a14.95 14.95 0 0114.364 2.636m0 0A15.05 15.05 0 0120 20m-1.636-13.364A14.95 14.95 0 015.636 17.364m0 0A15.05 15.05 0 014 4" />
    </svg>
);
export const UserIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);
export const UsersIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197M15 21a6 6 0 006-6v-1a3 3 0 00-3-3H9a3 3 0 00-3 3v1a6 6 0 006 6z" />
  </svg>
);
export const IdentificationIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 012-2h4a2 2 0 012 2v1m-4 0h4m-9 4h2m-2 4h4m-4 4h4m4-8h4m-4 4h4m-4 4h4" />
    </svg>
);
export const SpinnerIcon = ({ className }: { className?: string }) => (
  <svg className={\`animate-spin \${className}\`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
export const SchoolLogo = ({ className }: { className?: string }) => (
    <img src="https://ponsrischool.in/wp-content/uploads/2025/03/cropped-download-300x300.png" alt="Ponsri School Logo" className={className} />
);
export const SettingsIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
export const KeyIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.629 5.629l-2.371 2.371a2.121 2.121 0 01-3 0l-1.371-1.371a2.121 2.121 0 010-3l2.371-2.371A6 6 0 0121 11zM12 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
export const ClipboardIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
);
`,
'components/QrScanner.tsx': `
import React, { useEffect, useRef } from 'react';
declare global {
    interface Window {
        Html5QrcodeScanner: any;
    }
}
interface QrScannerProps {
    onScanSuccess: (decodedText: string, decodedResult: any) => void;
    onScanError: (errorMessage: string) => void;
}
const QR_SCANNER_ID = "qr-reader";
const QrScanner: React.FC<QrScannerProps> = ({ onScanSuccess, onScanError }) => {
    const scannerRef = useRef<any>(null);
    useEffect(() => {
        if (!scannerRef.current) {
            scannerRef.current = new window.Html5QrcodeScanner(
                QR_SCANNER_ID,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    supportedScanTypes: [0],
                },
                false
            );
        }
        scannerRef.current.render(onScanSuccess, onScanError);
        return () => {
            if (scannerRef.current && scannerRef.current.getState() === 2) { // 2 is SCANNING
                scannerRef.current.clear().catch((error: Error) => {
                    console.error("Failed to clear html5-qrcode-scanner.", error);
                });
            }
        };
    }, []);
    return <div id={QR_SCANNER_ID} className="w-full max-w-md mx-auto"></div>;
};
export default QrScanner;
`,
'components/AttendanceList.tsx': `
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
`,
'components/ExportControls.tsx': `
import React, { useState } from 'react';
import { SyncIcon, SpinnerIcon } from './icons';

interface DataControlsProps {
    onSync: () => Promise<void>;
}

const DataControls: React.FC<DataControlsProps> = ({ onSync }) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

    const handleSync = async () => {
        setIsSyncing(true);
        await onSync();
        setIsSyncing(false);
        setLastSyncTime(new Date().toLocaleTimeString());
    };

    return (
        <div className="w-full p-6 bg-white rounded-lg shadow-md space-y-6">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-3">Data Management</h3>
            
            <div className="space-y-2">
                <h4 className="font-semibold text-md text-slate-700">Server Sync</h4>
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="w-full sm:w-auto flex-1 inline-flex items-center justify-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:cursor-wait transition-colors"
                    >
                        {isSyncing ? (
                            <><SpinnerIcon className="w-5 h-5 mr-2" /> Syncing...</>
                        ) : (
                            <><SyncIcon className="w-5 h-5 mr-2" /> Refresh Data</>
                        )}
                    </button>
                    {lastSyncTime && <p className="text-xs text-slate-500">Last synced at {lastSyncTime}</p>}
                </div>
            </div>
        </div>
    );
};
export default DataControls;
`,
'components/TeacherAttendance.tsx': `
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
        <div className="bg-white rounded-lg shadow-md">
            <div className="p-4 border-b space-y-4 md:flex md:items-center md:justify-between md:space-y-0">
                <h2 className="text-xl font-semibold text-slate-800">Manual Teacher Attendance</h2>
                <div className="flex items-center gap-4">
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={teachers.length === 0 || isSubmitting}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-wait"
                    >
                        {isSubmitting ? <><SpinnerIcon className="w-5 h-5 mr-2" />Submitting...</> : 'Submit'}
                    </button>
                </div>
            </div>
            
            <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 sticky top-0">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Teacher</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Attendance</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Comment</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {teachers.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="text-center text-slate-500 py-8">
                                    No teacher data found.
                                </td>
                            </tr>
                        ) : teachers.map((teacher) => {
                            const teacherAttendance = attendance.get(teacher.id) || { status: 'Present', comment: ''};
                            return (
                                <tr key={teacher.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{teacher.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        <select
                                            name={\`attendance-\${teacher.id}\`}
                                            value={teacherAttendance.status}
                                            onChange={(e) => handleStatusChange(teacher.id, e.target.value as AttendanceStatus)}
                                            className="w-full p-1 border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
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
                                            className="w-full max-w-xs px-2 py-1 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
`,
'components/DataViewer.tsx': `
import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { Student, Teacher } from '../types';
import PrintableView from './PrintableView';
import { UserIcon, UsersIcon, IdentificationIcon } from './icons';

interface DataViewerProps {
    students: Student[];
    teachers: Teacher[];
}

const DataViewer: React.FC<DataViewerProps> = ({ students, teachers }) => {
    const [view, setView] = useState<'students' | 'teachers'>('students');
    const [selectedPrintClass, setSelectedPrintClass] = useState<string>('all');
    const filteredStudents = useMemo(() => students.filter(s => s.class && s.class.trim() !== '' && s.class.toLowerCase() !== 'null'), [students]);
    const handlePrint = () => {
        setTimeout(() => {
            window.print();
        }, 100);
    };
    const printRoot = document.getElementById('print-root');
    const groupedStudents = useMemo((): Record<string, Student[]> | null => {
        if (view !== 'students') return null;
        const groups = filteredStudents.reduce((acc, student) => {
            const groupKey = \`\${student.class}\${student.section ? \` - \${student.section}\` : ''}\`;
            if (!acc[groupKey]) {
                acc[groupKey] = [];
            }
            acc[groupKey].push(student);
            return acc;
        }, {} as Record<string, Student[]>);
        return Object.fromEntries(Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))) as Record<string, Student[]>;
    }, [filteredStudents, view]);

    useEffect(() => {
        setSelectedPrintClass('all');
    }, [view]);

    const peopleToPrint = useMemo(() => {
        if (view === 'teachers') {
            return teachers;
        }
        if (selectedPrintClass === 'all') {
            return filteredStudents;
        }
        return groupedStudents?.[selectedPrintClass] || [];
    }, [view, selectedPrintClass, filteredStudents, groupedStudents, teachers]);
    const type = view === 'students' ? 'student' : 'teacher';
    const tableHeaders = view === 'students'
        ? ['Photo', 'ID', 'Name', 'Class', 'Roll No.', 'Contact']
        : ['Photo', 'ID', 'Name', 'Role', 'Email', 'Phone'];

    const renderTableRow = (person: Student | Teacher) => {
        const securePhotoUrl = person.profilePhotoUrl?.replace(/^http:\\/\\//i, 'https://');
        const photoCell = (
             <td className="px-6 py-2">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden ring-2 ring-slate-100">
                    {securePhotoUrl ? <img src={securePhotoUrl} alt={type === 'student' ? (person as Student).studentName : (person as Teacher).name} className="w-full h-full object-contain" /> : <UserIcon className="w-6 h-6 text-slate-400" />}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{(student.class || 'N/A')}{student.section ? \`-\${student.section}\` : ''}</td>
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
        <div className="bg-white rounded-lg shadow-md">
            <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                     <div className="sm:hidden">
                        <select
                            id="tabs-mobile"
                            name="tabs-mobile"
                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                            onChange={(e) => setView(e.target.value as 'students' | 'teachers')}
                            value={view}
                        >
                            <option value="students">Students</option>
                            <option value="teachers">Teachers</option>
                        </select>
                    </div>
                    <div className="hidden sm:block">
                        <nav className="flex space-x-4" aria-label="Tabs">
                             <button onClick={() => setView('students')} className={\`px-3 py-2 font-medium text-sm rounded-md flex items-center gap-2 \${view === 'students' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}\`}>
                                <UsersIcon className="w-5 h-5" /> Students ({filteredStudents.length})
                            </button>
                             <button onClick={() => setView('teachers')} className={\`px-3 py-2 font-medium text-sm rounded-md flex items-center gap-2 \${view === 'teachers' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}\`}>
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
                            className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        >
                            <option value="all">Print All Classes</option>
                            {Object.keys(groupedStudents).map(className => (
                                <option key={className} value={className}>{\`Print \${className}\`}</option>
                            ))}
                        </select>
                    )}
                    <button
                        onClick={handlePrint}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex-shrink-0"
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
                                    {header}
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
    );
};
export default DataViewer;
`,
'components/Settings.tsx': `
import React, { useState, useEffect } from 'react';
import { getUsers, addUser, deleteUser } from '../api';
import type { User } from '../types';
import { LogoutIcon, SpinnerIcon, UsersIcon, ClipboardIcon } from './icons';

interface SettingsProps {
    onSaveKey: (key: string) => void;
    onLogout?: () => void;
    secretKey?: string;
    initialSetup?: boolean;
    currentUser: Omit<User, 'password'>;
}

const PHP_CODE = \`<?php
/*
Plugin Name: Custom Data Sync for QR Attendance App
Description: Provides a secure REST API endpoint to sync student and teacher data for the QR attendance app.
Version: 1.7
Author: QR App Support
*/

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

add_filter( 'rest_allowed_cors_headers', function( $allowed_headers ) {
    $allowed_headers[] = 'x-sync-key';
    return $allowed_headers;
} );

add_action('rest_api_init', function () {
    register_rest_route('custom-sync/v1', '/data', array(
        'methods' => 'GET',
        'callback' => 'sync_app_data',
        'permission_callback' => 'sync_permission_check',
    ));
    register_rest_route('custom-sync/v1', '/attendance', array(
        'methods' => 'POST',
        'callback' => 'receive_attendance_data',
        'permission_callback' => 'sync_permission_check',
    ));
});

if (!function_exists('sync_permission_check')) {
    function sync_permission_check($request) {
        $secret_key = $request->get_header('X-Sync-Key');
        $stored_key = get_option('qr_app_secret_key', ''); 
        if (empty($stored_key) || empty($secret_key) || !hash_equals($stored_key, $secret_key)) {
            return new WP_Error('rest_forbidden', 'Invalid or missing secret key.', array('status' => 401));
        }
        return true;
    }
}

if (!function_exists('get_custom_user_photo_url')) {
    function get_custom_user_photo_url($user_id) {
        $avatar_meta = get_user_meta($user_id, 'smgt_user_avatar', true);
        if (!empty($avatar_meta)) {
            if (is_numeric($avatar_meta)) {
                $image_url = wp_get_attachment_image_url($avatar_meta, 'full');
                if ($image_url) {
                    return $image_url;
                }
            }
            elseif (filter_var($avatar_meta, FILTER_VALIDATE_URL)) {
                return $avatar_meta;
            }
        }
        return get_avatar_url($user_id);
    }
}

if (!function_exists('sync_app_data')) {
    function sync_app_data($request) {
        $response_data = array(
            'students' => array(),
            'teachers' => array(),
        );

        $student_users = get_users(array('role' => 'student'));
        foreach ($student_users as $user) {
            $student_data = array(
                'studentId'     => (string)$user->ID,
                'studentName'   => $user->display_name,
                'class'         => get_user_meta($user->ID, 'class_name', true),
                'section'       => get_user_meta($user->ID, 'class_section', true),
                'rollNumber'    => get_user_meta($user->ID, 'roll_id', true),
                'contactNumber' => get_user_meta($user->ID, 'mobile', true),
                'profilePhotoUrl' => get_custom_user_photo_url($user->ID),
            );
            $response_data['students'][] = $student_data;
        }

        $teacher_users = get_users(array('role' => 'teacher'));
        foreach ($teacher_users as $user) {
            $teacher_data = array(
                'id'    => (string)$user->ID,
                'name'  => $user->display_name,
                'role'  => 'Teacher',
                'email' => $user->user_email,
                'phone' => get_user_meta($user->ID, 'mobile', true),
                'profilePhotoUrl' => get_custom_user_photo_url($user->ID),
            );
            $response_data['teachers'][] = $teacher_data;
        }

        return new WP_REST_Response($response_data, 200);
    }
}

if (!function_exists('receive_attendance_data')) {
    function receive_attendance_data($request) {
        global $wpdb;
        $params = $request->get_json_params();
        $attendance_table = $wpdb->prefix . 'smgt_attendence';

        if (isset($params['students']) && is_array($params['students'])) {
            foreach ($params['students'] as $student_record) {
                 $wpdb->insert(
                    $attendance_table,
                    array(
                        'user_id' => $student_record['id'],
                        'attendence_date' => (new DateTime($student_record['timestamp']))->format('Y-m-d'),
                        'status' => 'Present',
                        'attendence_by' => get_current_user_id() ?: 1,
                        'role_name' => 'student'
                    )
                );
            }
        }
        
        if (isset($params['teachers']) && is_array($params['teachers'])) {
            foreach ($params['teachers'] as $teacher_record) {
                $wpdb->insert($attendance_table, array(
                    'user_id' => $teacher_record['teacherId'],
                    'attendence_date' => $teacher_record['date'],
                    'status' => $teacher_record['status'],
                    'comment' => $teacher_record['comment'],
                    'attendence_by' => get_current_user_id() ?: 1,
                    'role_name' => 'teacher'
                ));
            }
        }

        return new WP_REST_Response(array('success' => true, 'message' => 'Attendance recorded.'), 200);
    }
}

add_action('admin_menu', function() {
    add_options_page('QR App Sync Settings', 'QR App Sync', 'manage_options', 'qr-app-sync', 'qr_app_settings_page_html');
});

if (!function_exists('qr_app_settings_page_html')) {
    function qr_app_settings_page_html() {
        if (!current_user_can('manage_options')) {
            return;
        }
        if (isset($_GET['settings-updated'])) {
            add_settings_error('qr_app_messages', 'qr_app_message', __('Settings Saved', 'qr-app-sync'), 'updated');
        }
        settings_errors('qr_app_messages');
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            <p>Use this page to set the secret API key required for the QR Attendance App to sync data.</p>
            <form action="options.php" method="post">
                <?php
                settings_fields('qr-app-sync');
                do_settings_sections('qr-app-sync');
                submit_button('Save Settings');
                ?>
            </form>
        </div>
        <?php
    }
}

add_action('admin_init', function() {
    register_setting('qr-app-sync', 'qr_app_secret_key');
    add_settings_section('qr_app_section_developers', __('API Settings', 'qr-app-sync'), null, 'qr-app-sync');
    add_settings_field('qr_app_secret_key', __('Secret Key', 'qr-app-sync'), 'qr_app_secret_key_callback', 'qr-app-sync', 'qr_app_section_developers');
});

if (!function_exists('qr_app_secret_key_callback')) {
    function qr_app_secret_key_callback() {
        $option = get_option('qr_app_secret_key');
        echo '<input type="text" id="qr_app_secret_key" name="qr_app_secret_key" value="' . esc_attr($option) . '" size="50" />';
        echo '<p class="description">Enter a strong, unique secret key for the app to use. This must match the key entered in the app.</p>';
    }
}
?>\`;

const WordPressPluginCode = () => {
    const [copyText, setCopyText] = useState('Copy Code');

    const handleCopy = () => {
        navigator.clipboard.writeText(PHP_CODE).then(() => {
            setCopyText('Copied!');
            setTimeout(() => setCopyText('Copy Code'), 2000);
        }, (err) => {
            console.error('Could not copy text: ', err);
            setCopyText('Copy Failed');
             setTimeout(() => setCopyText('Copy Code'), 2000);
        });
    };
    
    return (
        <div className="p-6 bg-white rounded-lg shadow-md space-y-6">
            <div className="border-b pb-3 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <ClipboardIcon className="w-5 h-5"/> WordPress Plugin Code (v1.7)
                </h3>
                <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-2 px-3 py-1 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-150 ease-in-out"
                >
                    {copyText}
                </button>
            </div>
            <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4" role="alert">
                <p className="font-bold">How to Install & Set Your Secret Key</p>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                    <li><strong>Create Plugin File:</strong> Copy the PHP code below and save it in a new file named <code>qr-attendance-plugin.php</code>.</li>
                    <li><strong>Upload Plugin:</strong> In your WordPress dashboard, go to <strong>Plugins → Add New → Upload Plugin</strong>, and upload the file you just created.</li>
                    <li><strong>Activate:</strong> Activate the "Custom Data Sync for QR Attendance App" plugin from your plugins list.</li>
                    <li><strong>Go to Settings:</strong> Navigate to <strong>Settings → QR App Sync</strong> in the left-hand menu.</li>
                    <li><strong>Save Your Key:</strong> Enter the exact same Secret API Key that you use in this application into the "Secret Key" field and click "Save Settings".</li>
                </ol>
                <p className="mt-2 text-sm">The plugin reads the key from this WordPress setting; you do not need to edit the PHP code itself.</p>
            </div>
            <pre className="bg-slate-800 text-white p-4 rounded-md text-sm overflow-x-auto">
                <code>
                    {PHP_CODE}
                </code>
            </pre>
        </div>
    );
};


const Settings: React.FC<SettingsProps> = ({ onSaveKey, onLogout, secretKey: initialKey, initialSetup = false, currentUser }) => {
    const [secretKey, setSecretKey] = useState(initialKey || '');
    const [isSaving, setIsSaving] = useState(false);
    const [users, setUsers] = useState<Omit<User, 'password'>[]>([]);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [isUsersLoading, setIsUsersLoading] = useState(false);
    const [userError, setUserError] = useState<string | null>(null);

    useEffect(() => {
        if (currentUser.role === 'superuser') {
            fetchUsers();
        }
    }, [currentUser.role]);

    const fetchUsers = async () => {
        setIsUsersLoading(true);
        try {
            const fetchedUsers = await getUsers();
            setUsers(fetchedUsers);
        } catch (error) {
            setUserError('Failed to load users.');
        } finally {
            setIsUsersLoading(false);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setUserError(null);
        if (!newUserEmail || !newUserPassword) {
            setUserError('Email and password are required.');
            return;
        }
        try {
            await addUser({ email: newUserEmail, password: newUserPassword, role: 'user' });
            setNewUserEmail('');
            setNewUserPassword('');
            await fetchUsers();
        } catch (error) {
            setUserError(error instanceof Error ? error.message : 'Failed to add user.');
        }
    };

    const handleDeleteUser = async (email: string) => {
        if (window.confirm(\`Are you sure you want to delete user \${email}?\`)) {
            try {
                await deleteUser(email);
                await fetchUsers();
            } catch (error) {
                setUserError(error instanceof Error ? error.message : 'Failed to delete user.');
            }
        }
    };

    const handleSave = () => {
        if (secretKey.trim()) {
            setIsSaving(true);
            setTimeout(() => {
                onSaveKey(secretKey.trim());
                setIsSaving(false);
            }, 500);
        }
    };

    return (
        <div className="space-y-8">
            <div className="p-6 bg-white rounded-lg shadow-md space-y-6">
                <h3 className="text-lg font-semibold text-slate-800 border-b pb-3">{initialSetup ? 'Initial API Key Setup' : 'API Key Settings'}</h3>
                {initialSetup && (
                    <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4" role="alert">
                        <p className="font-bold">Welcome!</p>
                        <p>Please enter the Secret API Key provided by the school administration to connect this device to the server.</p>
                    </div>
                )}
                <div className="space-y-2">
                    <label htmlFor="secret-key" className="block text-sm font-medium text-slate-700">Secret API Key</label>
                    <div className="flex gap-4">
                        <input
                            type="password"
                            id="secret-key"
                            value={secretKey}
                            onChange={(e) => setSecretKey(e.target.value)}
                            className="flex-grow shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md"
                            placeholder="Enter your secret key"
                        />
                         <button
                            onClick={handleSave}
                            disabled={isSaving || !secretKey.trim()}
                            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-wait"
                        >
                            {isSaving ? <><SpinnerIcon className="w-5 h-5 mr-2" /> Saving...</> : 'Save Key'}
                        </button>
                    </div>
                </div>
            </div>

            {currentUser.role === 'superuser' && (
                <div className="p-6 bg-white rounded-lg shadow-md space-y-6">
                     <h3 className="text-lg font-semibold text-slate-800 border-b pb-3 flex items-center gap-2"><UsersIcon className="w-5 h-5"/> User Management</h3>
                     {userError && <p className="text-sm text-red-600">{userError}</p>}
                     <form onSubmit={handleAddUser} className="space-y-4 sm:flex sm:items-end sm:gap-4">
                        <div className="flex-grow">
                             <label htmlFor="new-user-email" className="block text-sm font-medium text-slate-700">New User Email</label>
                             <input type="email" id="new-user-email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md" />
                        </div>
                        <div className="flex-grow">
                             <label htmlFor="new-user-password" className="block text-sm font-medium text-slate-700">Password</label>
                             <input type="password" id="new-user-password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} required className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md" />
                        </div>
                         <button type="submit" className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">Add User</button>
                     </form>
                    
                    <div className="border-t pt-4">
                        <h4 className="font-semibold text-md text-slate-700 mb-2">Existing Users</h4>
                        {isUsersLoading ? <SpinnerIcon className="w-6 h-6 text-indigo-500" /> : (
                            <ul className="divide-y divide-slate-200">
                                {users.map(user => (
                                     <li key={user.email} className="py-3 flex justify-between items-center">
                                         <div>
                                            <p className="text-sm font-medium text-slate-900">{user.email}</p>
                                            <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                                         </div>
                                         <button onClick={() => handleDeleteUser(user.email)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
                                     </li>
                                ))}
                                {users.length === 0 && <p className="text-sm text-slate-500">No standard users found.</p>}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {!initialSetup && onLogout && (
                 <div className="p-6 bg-white rounded-lg shadow-md">
                     <h3 className="text-lg font-semibold text-slate-800 border-b pb-3">Account</h3>
                     <div className="mt-4">
                        <button
                            onClick={onLogout}
                            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md shadow-sm text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                           <LogoutIcon className="w-5 h-5 mr-2" /> Log Out
                        </button>
                     </div>
                </div>
            )}
            
            {!initialSetup && <WordPressPluginCode />}
        </div>
    );
};
export default Settings;
`,
'components/Login.tsx': `
import React, { useState } from 'react';
import { SchoolLogo, SpinnerIcon } from './icons';
import type { User } from '../types';

interface LoginProps {
    onLogin: (email: string, password: string) => Promise<User | null>;
    onLoginSuccess: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            const user = await onLogin(email, password);
            if (user) {
                onLoginSuccess(user);
            } else {
                setError('Invalid email or password. Please try again.');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-6">
                <div className="flex flex-col items-center space-y-4">
                    <SchoolLogo className="h-20" />
                    <h2 className="text-2xl font-bold text-center text-slate-800">
                        Attendance Portal Login
                    </h2>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email address</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Email address"
                            />
                        </div>
                        <div>
                            <label htmlFor="password-for-login" className="sr-only">Password</label>
                            <input
                                id="password-for-login"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Password"
                            />
                        </div>
                    </div>
                    {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-wait"
                        >
                            {isLoading ? <SpinnerIcon className="h-5 w-5" /> : 'Sign in'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
export default Login;
`,
'components/ScanSuccessModal.tsx': `
import React from 'react';
import type { Student } from '../types';
import { UserIcon, CheckCircleIcon } from './icons';

interface ScanSuccessModalProps {
    student: Student;
    scanTime: Date;
    onClose: () => void;
}

const ScanSuccessModal: React.FC<ScanSuccessModalProps> = ({ student, scanTime, onClose }) => {
    const securePhotoUrl = student.profilePhotoUrl?.replace(/^http:\\/\\//i, 'https://');
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
`,
'components/PrintableView.tsx': `
import React from 'react';
import IdCard from './IdCard';
import type { Student, Teacher } from '../types';

interface PrintableViewProps {
    people: (Student | Teacher)[];
    type: 'student' | 'teacher';
}

const PrintableView: React.FC<PrintableViewProps> = ({ people, type }) => {
    return (
        <div className="id-card-print-container">
            {people.map(person => {
                const key = type === 'student' ? (person as Student).studentId : (person as Teacher).id;
                return (
                    <div key={key} className="id-card-print-wrapper">
                        <IdCard person={person} type={type} />
                    </div>
                );
            })}
        </div>
    );
};
export default PrintableView;
`,
'components/IdCard.tsx': `
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Student, Teacher } from '../types';
import { SchoolLogo, UserIcon } from './icons';

interface IdCardProps {
    person: Student | Teacher;
    type: 'student' | 'teacher';
}

const DetailRow = ({ label, value }: { label: string, value: string | undefined }) => (
    <div className="flex text-xs">
        <p className="w-2/5 font-semibold text-slate-600">{label}</p>
        <p className="w-3/5 text-slate-800 break-words"><span className="mr-1">:</span>{value || 'N/A'}</p>
    </div>
);

const IdCard: React.FC<IdCardProps> = ({ person, type }) => {
    let name: string, id: string, photoUrl: string | undefined, details: React.ReactNode;

    if (type === 'student') {
        const s = person as Student;
        name = s.studentName;
        id = s.studentId;
        photoUrl = s.profilePhotoUrl;
        details = (
            <>
                <DetailRow label="Class" value={\`\${s.class || 'N/A'}\${s.section ? \` - \${s.section}\` : ''}\`} />
                <DetailRow label="Roll No" value={s.rollNumber} />
                <DetailRow label="Contact" value={s.contactNumber} />
            </>
        );
    } else {
        const t = person as Teacher;
        name = t.name;
        id = t.id;
        photoUrl = t.profilePhotoUrl;
        details = (
            <>
                <DetailRow label="Role" value={t.role} />
                <DetailRow label="Phone" value={t.phone} />
                <DetailRow label="Email" value={t.email} />
            </>
        );
    }

    const qrValue = JSON.stringify({ id, name });
    const securePhotoUrl = photoUrl?.replace(/^http:\\/\\//i, 'https://');

    return (
        <div className="bg-white w-full h-full flex flex-col font-sans border border-slate-200 overflow-hidden">
            <header className="flex flex-col items-center p-2 bg-indigo-800 text-white text-center">
                 <img src="https://ponsrischool.in/wp-content/uploads/2025/03/cropped-download.png" alt="Ponsri School Logo" className="w-10 h-10 bg-white rounded-full p-0.5" />
                <h2 className="text-xs font-bold leading-tight mt-1">PM SHRI PRATHMIK VIDHYAMANDIR</h2>
                <p className="text-[10px] leading-tight">PONSRI, Ta. Una, Dist. Gir Somnath</p>
            </header>
            <main className="flex-grow flex flex-col items-center p-3 text-center">
                <div className="w-24 h-24 mt-2 border-4 border-indigo-200 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {securePhotoUrl ? 
                        <img src={securePhotoUrl} alt={name} className="w-full h-full object-contain" /> : 
                        <UserIcon className="w-16 h-16 text-slate-400" />
                    }
                </div>
                <h3 className="mt-3 text-lg font-extrabold text-indigo-900 uppercase tracking-wide">{name}</h3>
                <p className="text-sm font-semibold text-slate-600 -mt-1">{type === 'student' ? 'Student' : (person as Teacher).role}</p>
                <div className="text-left w-full mt-4 space-y-1.5 px-2">
                    {details}
                </div>
            </main>
            <footer className="flex flex-col items-center justify-center p-2 bg-indigo-800 text-white">
                <QRCodeSVG value={qrValue} size={50} level={"H"} bgColor="#FFFFFF" fgColor="#000000" />
                <p className="text-[10px] font-mono mt-1">{id}</p>
            </footer>
        </div>
    );
};
export default IdCard;
`,
};


const StaticSiteDownloader: React.FC = () => {
    const [isBuilding, setIsBuilding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const esbuildInitialized = useRef(false);

    useEffect(() => {
        const initializeEsbuild = async () => {
            if (!esbuildInitialized.current) {
                try {
                    await esbuild.initialize({
                        wasmURL: 'https://aistudiocdn.com/esbuild-wasm@^0.23.0/esbuild.wasm',
                    });
                    esbuildInitialized.current = true;
                } catch (e) {
                    setError('Failed to initialize the bundler. Please try refreshing the page.');
                    console.error(e);
                }
            }
        };
        initializeEsbuild();
    }, []);

    const handleDownload = async () => {
        if (!esbuildInitialized.current) {
            setError('Bundler is not ready yet. Please wait a moment and try again.');
            return;
        }
        setIsBuilding(true);
        setError(null);

        try {
            const inMemoryPlugin: esbuild.Plugin = {
                name: 'in-memory-plugin',
                setup(build) {
                    build.onResolve({ filter: /.*/ }, args => {
                         if (args.path === 'react' || args.path === 'react-dom' || args.path === 'qrcode.react') {
                            return { path: args.path, external: true };
                        }
                        const path = new URL(args.path, `file:///${args.importer || ''}`).pathname.slice(1);
                        return { path: path.endsWith('.tsx') || path.endsWith('.ts') ? path : `${path}.tsx`, namespace: 'in-memory' };
                    });

                    build.onLoad({ filter: /.*/, namespace: 'in-memory' }, args => {
                        let content = fileContents[args.path] || fileContents[args.path.replace(/\.tsx$/, '.ts')];
                         if (content === undefined) {
                            return { errors: [{ text: `File not found: ${args.path}` }] };
                        }
                        const loader = args.path.endsWith('.tsx') ? 'tsx' : 'ts';
                        return { contents: content, loader };
                    });
                }
            };
            
            const result = await esbuild.build({
                entryPoints: ['index.tsx'],
                bundle: true,
                write: false,
                plugins: [inMemoryPlugin],
                jsx: 'automatic',
                loader: { '.ts': 'ts' },
                target: 'es2020',
                format: 'iife',
                globalName: 'app',
                define: {
                    'process.env.NODE_ENV': '"production"',
                },
            });
            
            const bundledJs = result.outputFiles[0].text;

            const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QR Attendance Manager</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        if (typeof global === 'undefined') { var global = window; }
    </script>
    <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
    <style>
      @media screen { #print-root { display: none; } }
      @media print {
        @page { size: A4; margin: 1cm; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body > #root { display: none; }
        #print-root { display: block; }
        .id-card-print-container { display: flex; flex-wrap: wrap; gap: 5mm; justify-content: flex-start; }
        .id-card-print-wrapper { width: 54mm; height: 85.6mm; border: 1px dashed #ccc; page-break-inside: avoid; overflow: hidden; }
      }
    </style>
</head>
<body>
    <div id="root"></div>
    <div id="print-root"></div>
    <script src="https://aistudiocdn.com/react@^19.2.0/umd/react.production.min.js" defer></script>
    <script src="https://aistudiocdn.com/react-dom@^19.2.0/umd/react-dom.production.min.js" defer></script>
    <script src="https://aistudiocdn.com/qrcode.react@^4.2.0/umd/qrcode.react.production.min.js" defer></script>
    <script src="bundle.js" defer></script>
</body>
</html>`;

            const readme = `QR Attendance App - Static Website
=================================

To host this website, simply upload all the files in this zip archive (index.html and bundle.js) to your web hosting provider (e.g., Hostinger, Netlify, Vercel, etc.).

No further build steps are needed.
`;

            const zip = new JSZip();
            zip.file('index.html', finalHtml);
            zip.file('bundle.js', bundledJs);
            zip.file('README.txt', readme);

            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = 'qr-attendance-static-site.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (e) {
            console.error(e);
            setError(`Build failed: ${e instanceof Error ? e.message : 'An unknown error occurred'}`);
        } finally {
            setIsBuilding(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md space-y-6">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-3">Export Static Website</h3>
            <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4" role="alert">
                <p className="font-bold">Deploy Anywhere</p>
                <p className="mt-1">
                    Click the button below to generate a <code>.zip</code> file containing a standalone version of this application.
                    You can upload these files directly to any static web host (like Hostinger's shared hosting) without needing Node.js, npm, or a VPS.
                </p>
            </div>

            <div className="flex justify-center items-center py-4">
                <button
                    onClick={handleDownload}
                    disabled={isBuilding || !esbuildInitialized.current}
                    className="inline-flex items-center justify-center gap-3 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-wait transition-all"
                >
                    {isBuilding ? (
                        <>
                            <SpinnerIcon className="w-5 h-5" />
                            Building...
                        </>
                    ) : (
                        <>
                            <DownloadIcon className="w-6 h-6" />
                            Generate & Download .zip File
                        </>
                    )}
                </button>
            </div>
            
            {error && <p className="mt-2 text-sm text-red-600 text-center bg-red-50 p-3 rounded-md">{error}</p>}
        </div>
    );
};

export default StaticSiteDownloader;
