import React, { useState, useEffect, useRef } from 'react';
import esbuild from 'esbuild-wasm';
import type { Plugin } from 'esbuild-wasm';
import { DownloadIcon, SpinnerIcon, ClipboardIcon } from './icons';

const HTACCESS_CODE = `<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /
RewriteRule ^index\\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_FILENAME} !-l
RewriteRule . /index.html [L]
</IfModule>`;


// FIX: Escaped all inner template literal backticks (` `) with (\\` \\`) within the file content strings.
// This prevents the JavaScript parser from prematurely ending the string, which was causing a cascade of syntax errors.
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

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
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
  'App.tsx': `
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
import StaticSiteDownloader from './components/StaticSiteDownloader';
import Header from './components/Header';
import ClassManager from './components/ClassManager';
import { QrCodeIcon, CameraIcon, StopIcon, UsersIcon, IdentificationIcon, SettingsIcon, SpinnerIcon, DownloadIcon, BookOpenIcon } from './components/icons';

type View = 'qr_attendance' | 'teacher_attendance' | 'class_management' | 'data_viewer' | 'settings' | 'export_website';

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const storedUser = localStorage.getItem('CURRENT_USER');
        return storedUser ? JSON.parse(storedUser) : null;
    });
    const [secretKey, setSecretKey] = useState<string | null>(() => localStorage.getItem('API_SECRET_KEY'));
    const [isSyncingOnLoad, setIsSyncingOnLoad] = useState(true);
    const [view, setView] = useState<View>('qr_attendance');
    const [syncError, setSyncError] = useState<string | null>(null);

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
        if (currentUser && secretKey) {
            handleSync(secretKey);
        } else {
            setIsSyncingOnLoad(false);
        }
    }, [currentUser]);

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
        handleSync(key);
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
            setSyncError(\`Failed to sync with the school server: \${errorMessage}. Please check your Secret Key and network connection.\`);
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
                    setScanError(\`Teacher with ID \${id} not found. Please sync data.\`);
                    return;
                }
                if (teacherScanRecords.some(rec => rec.teacherId === id)) {
                    setScanError(\`Teacher \${name} already marked present.\`);
                    return;
                }
                // Update manual attendance state
                setTeacherAttendance(prev => {
                    const newAttendance = new Map(prev);
                    newAttendance.set(id, { status: 'Present', comment: \`Scanned at \${timeString}\` });
                    return newAttendance;
                });
                // Add to scan log for this session
                const newRecord: TeacherAttendanceRecord = {
                    teacherId: id,
                    teacherName: name,
                    date: scanTime.toISOString().split('T')[0],
                    status: 'Present',
                    comment: \`Scanned at \${timeString}\`
                };
                setTeacherScanRecords(prev => [newRecord, ...prev]);
                setLastScannedInfo({ person: teacher, time: scanTime });

            } else { // Default to student
                if (attendanceRecords.some(rec => rec.id === id)) {
                    setScanError(\`Already marked present: \${name} (\${id})\`);
                    return;
                }
                const student = studentMap.get(id);
                if (!student) {
                    setScanError(\`Student with ID \${id} not found. Please sync data.\`);
                    return;
                }
                const newRecord = { id, name, timestamp: scanTime };
                await uploadStudentAttendance([newRecord], secretKey);
                setAttendanceRecords(prev => [newRecord, ...prev]);
                setLastScannedInfo({ person: student, time: newRecord.timestamp });
            }
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

    if (!currentUser) return <Login onLogin={login} onLoginSuccess={handleLoginSuccess} />;

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

    const QrAttendanceView = () => {
        const [logView, setLogView] = useState<'students'|'teachers'>('students');

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
                <div className="bg-white rounded-lg shadow-lg">
                    <div className="border-b border-slate-200">
                         <nav className="-mb-px flex space-x-6 px-6" aria-label="Tabs">
                            <button onClick={() => setLogView('students')} className={\`\${logView === 'students' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm\`}>
                                Student Log ({attendanceRecords.length})
                            </button>
                            <button onClick={() => setLogView('teachers')} className={\`\${logView === 'teachers' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm\`}>
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
                    person={lastScannedInfo.person} 
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
                            className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm"
                            onChange={(e) => setView(e.target.value as View)}
                            value={view}
                        >
                            <option value="qr_attendance">QR Attendance</option>
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
                                    onClick={() => setView('qr_attendance')}
                                    className={\`\${view === 'qr_attendance' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 cursor-pointer\`}
                                >
                                    <QrCodeIcon className="w-5 h-5" />
                                    QR Attendance
                                </button>
                                <button
                                    onClick={() => setView('teacher_attendance')}
                                    className={\`\${view === 'teacher_attendance' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 cursor-pointer\`}
                                >
                                    <UsersIcon className="w-5 h-5" />
                                    Teacher Attendance
                                </button>
                                 <button
                                    onClick={() => setView('class_management')}
                                    className={\`\${view === 'class_management' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 cursor-pointer\`}
                                >
                                    <BookOpenIcon className="w-5 h-5" />
                                    Class
                                </button>
                                <button
                                    onClick={() => setView('data_viewer')}
                                    className={\`\${view === 'data_viewer' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 cursor-pointer\`}
                                >
                                    <IdentificationIcon className="w-5 h-5" />
                                    Manage Data & IDs
                                </button>
                                <button
                                    onClick={() => setView('export_website')}
                                    className={\`\${view === 'export_website' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 cursor-pointer\`}
                                >
                                    <DownloadIcon className="w-5 h-5" />
                                    Export Website
                                </button>
                                <button
                                    onClick={() => setView('settings')}
                                    className={\`\${view === 'settings' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 cursor-pointer\`}
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

export default App;`,
  'types.ts': `
// FIX: Provided full content for types.ts to define all data structures used in the app.
export interface Student {
    studentId: string;
    studentName: string;
    class: string;
    section?: string;
    rollNumber: string;
    contactNumber: string;
    profilePhotoUrl?: string;
    type?: 'student';
}

export interface Teacher {
    id: string;
    name: string;
    role: string;
    phone: string;
    email: string;
    profilePhotoUrl?: string;
    type?: 'teacher';
}

export interface ClassData {
    id: string;
    class_name: string;
    class_numeric: string;
    class_section: string | string[];
    class_capacity: string;
    student_count?: number;
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

export interface AddClassPayload {
    class_name: string;
    class_numeric: string;
    class_section: string[];
    class_capacity: string;
}`,
  'api.ts': `
import type { Student, Teacher, StudentAttendanceRecord, TeacherAttendanceRecord, User, ClassData, AddClassPayload } from './types';
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
    classes: ClassData[];
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
    // Fetch students, teachers, and classes from the single, unified data sync plugin
    const mainData = await apiFetch('/data', secretKey, { method: 'GET' });

    return {
        students: mainData.students || [],
        teachers: mainData.teachers || [],
        classes: mainData.classes || [],
    };
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

export const getClasses = async (secretKey: string): Promise<ClassData[]> => {
    const data = await apiFetch('/classes', secretKey, { method: 'GET' });
    return data || [];
};

export const addClass = async (payload: AddClassPayload, secretKey: string): Promise<any> => {
    return await apiFetch('/classes', secretKey, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
};

export const deleteClass = async (classId: string, secretKey: string): Promise<any> => {
    return await apiFetch(\`/classes/\${classId}\`, secretKey, {
        method: 'DELETE',
    });
};
`,
  'config.ts': `
// IMPORTANT: Configuration for connecting to the school's WordPress server.
// This URL points to your 'Custom Data Sync for QR Attendance App' plugin endpoint.

export const API_BASE_URL = 'https://ponsrischool.in/wp-json/custom-sync/v1';
`,
  'utils.ts': `
export const formatClassName = (className: string | undefined | null): string => {
    if (!className || className.toLowerCase() === 'null') return 'N/A';
    
    const parts = className.split('=>').map(p => p.trim());
    
    if (parts.length >= 2 && parts[0] && parts[1]) {
        return \`Class \${parts[0]}-\${parts[1]}\`;
    }
    
    if (parts.length === 1 && parts[0]) {
       return \`Class \${parts[0]}\`;
    }

    return className.split('=>')[0] || 'N/A';
};`,
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

export const DownloadIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
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

export const ClipboardIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
);

export const BellIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
);

export const PowerIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
    </svg>
);

export const ChevronDownIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
);

export const InformationCircleIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export const BookOpenIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

export const PlusIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

export const TrashIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);`,
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
                    supportedScanTypes: [0], // 0 for camera
                },
                false // verbose
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

export default QrScanner;`,
  'components/AttendanceList.tsx': `
import React from 'react';
import type { StudentAttendanceRecord } from '../types';
import { CheckCircleIcon } from './icons';

interface AttendanceListProps {
    records: StudentAttendanceRecord[];
}

const AttendanceList: React.FC<AttendanceListProps> = ({ records }) => {
    return (
        <div className="w-full bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800">Attendance Log ({records.length})</h3>
            </div>
             {records.length === 0 ? (
                <div className="text-center text-slate-500 py-16 px-6">
                    <p className="font-semibold">No students marked present yet.</p>
                    <p className="text-sm mt-1">Start the scanner to begin taking attendance.</p>
                </div>
            ) : (
                <div className="max-h-[28rem] overflow-y-auto">
                    <table className="min-w-full">
                        <thead className="bg-slate-50 sticky top-0">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Student</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {records.map((record) => (
                                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center space-x-3">
                                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                                <CheckCircleIcon className="w-6 h-6 text-green-600" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-slate-900">{record.name}</div>
                                                <div className="text-xs text-slate-500">ID: {record.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
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

export default AttendanceList;`,
  'components/TeacherAttendanceLog.tsx': `
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

export default TeacherAttendanceLog;`,
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
        <div className="w-full p-6 bg-white rounded-lg shadow-lg space-y-6">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-3">Data Management</h3>
            
            <div className="space-y-2">
                <h4 className="font-semibold text-md text-slate-700">Server Sync</h4>
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="w-full sm:w-auto flex-1 inline-flex items-center justify-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 disabled:bg-slate-100 disabled:cursor-wait transition-colors"
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

export default DataControls;`,
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
        <div className="bg-white rounded-lg shadow-lg">
            <div className="p-4 border-b space-y-4 md:flex md:items-center md:justify-between md:space-y-0">
                <h2 className="text-xl font-semibold text-slate-800">Manual Teacher Attendance</h2>
                <div className="flex items-center gap-4">
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm"
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={teachers.length === 0 || isSubmitting}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-700 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 disabled:bg-indigo-500 disabled:cursor-wait"
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
                                            className="w-full p-1 border-slate-300 rounded-md shadow-sm focus:ring-indigo-600 focus:border-indigo-600"
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
                                            className="w-full max-w-xs px-2 py-1 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm"
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

export default TeacherAttendance;`,
  'components/DataViewer.tsx': `
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
        const securePhotoUrl = person.profilePhotoUrl?.replace(/^http:\\/\\//i, 'https://');
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
                            className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm rounded-md"
                        >
                            <option value="all">Print All Classes</option>
                            {Object.keys(groupedStudents).map(className => (
                                <option key={className} value={className}>{\`Print \${className}\`}</option>
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

export default DataViewer;`,
  'components/Settings.tsx': `
import React, { useState, useEffect } from 'react';
import { getUsers, addUser, deleteUser } from '../api';
import type { User } from '../types';
import { LogoutIcon, SpinnerIcon, UsersIcon, ClipboardIcon, CloudDownloadIcon, DownloadIcon } from './icons';

const PLUGIN_CODE = \`<?php
/*
Plugin Name: Custom Data Sync for QR Attendance App
Description: Provides a secure REST API endpoint to sync student, teacher, and class data for the QR attendance app.
Version: 2.2
Author: QR App Support
*/

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// IMPORTANT: Allow the 'X-Sync-Key' header for CORS requests.
add_filter( 'rest_allowed_cors_headers', function( \\$allowed_headers ) {
    \\$allowed_headers[] = 'x-sync-key';
    return \\$allowed_headers;
} );

// Register the REST API routes
add_action('rest_api_init', function () {
    // Main data sync endpoint
    register_rest_route('custom-sync/v1', '/data', array(
        'methods' => 'GET',
        'callback' => 'sync_app_data',
        'permission_callback' => 'sync_permission_check',
    ));
    // Attendance submission endpoint
    register_rest_route('custom-sync/v1', '/attendance', array(
        'methods' => 'POST',
        'callback' => 'receive_attendance_data',
        'permission_callback' => 'sync_permission_check',
    ));

    // Class management endpoints
    register_rest_route('custom-sync/v1', '/classes', array(
        'methods' => 'GET',
        'callback' => 'get_all_classes_data',
        'permission_callback' => 'sync_permission_check',
    ));
    register_rest_route('custom-sync/v1', '/classes', array(
        'methods' => 'POST',
        'callback' => 'add_new_class_data',
        'permission_callback' => 'sync_permission_check',
    ));
    register_rest_route('custom-sync/v1', '/classes/(?P<id>\\\\d+)', array(
        'methods' => 'DELETE',
        'callback' => 'delete_class_data',
        'permission_callback' => 'sync_permission_check',
    ));
});

// Permission check for the API key
if (!function_exists('sync_permission_check')) {
    function sync_permission_check(\\$request) {
        \\$secret_key = \\$request->get_header('X-Sync-Key');
        \\$stored_key = get_option('qr_app_secret_key', ''); 
        if (empty(\\$stored_key) || empty(\\$secret_key) || !hash_equals(\\$stored_key, \\$secret_key)) {
            return new WP_Error('rest_forbidden', 'Invalid or missing secret key.', array('status' => 401));
        }
        return true;
    }
}

// Helper function to get user profile photo
if (!function_exists('get_custom_user_photo_url')) {
    function get_custom_user_photo_url(\\$user_id) {
        \\$avatar_meta = get_user_meta(\\$user_id, 'smgt_user_avatar', true);
        if (!empty(\\$avatar_meta)) {
            // Case 1: It's an attachment ID
            if (is_numeric(\\$avatar_meta)) {
                \\$image_url = wp_get_attachment_image_url(\\$avatar_meta, 'full');
                if (\\$image_url) {
                    return \\$image_url;
                }
            }
            // Case 2: It's already a full URL
            if (is_string(\\$avatar_meta) && filter_var(\\$avatar_meta, FILTER_VALIDATE_URL)) {
                return \\$avatar_meta;
            }
            // Case 3: It might be a relative URL (e.g., /wp-content/...)
            if (is_string(\\$avatar_meta) && strpos(\\$avatar_meta, '/') === 0) {
                return site_url(\\$avatar_meta);
            }
        }
        // Fallback to the default WordPress avatar URL
        return get_avatar_url(\\$user_id);
    }
}

// Central function to fetch class data
if (!function_exists('fetch_class_data_from_db')) {
    function fetch_class_data_from_db() {
        global \\$wpdb;
        \\$class_table = \\$wpdb->prefix . 'smgt_class';
        \\$usermeta_table = \\$wpdb->prefix . 'usermeta';

        if (\\$wpdb->get_var("SHOW TABLES LIKE '\\$class_table'") != \\$class_table) {
            return []; // Return empty if table doesn't exist
        }

        \\$classes_results = \\$wpdb->get_results("SELECT * FROM \\$class_table");
        \\$classes_data = array();

        foreach(\\$classes_results as \\$class) {
            \\$student_count = \\$wpdb->get_var(\\$wpdb->prepare(
                "SELECT COUNT(*) FROM \\$usermeta_table WHERE meta_key = 'class_name' AND meta_value = %s", \\$class->class_name
            ));

            \\$classes_data[] = array(
                'id' => (string)\\$class->class_id,
                'class_name' => \\$class->class_name,
                'class_numeric' => \\$class->class_numeric,
                'class_section' => maybe_unserialize(\\$class->section_name),
                'class_capacity' => \\$class->class_capacity,
                'student_count' => (int)\\$student_count,
            );
        }
        return \\$classes_data;
    }
}

// Callback for GET /classes
if (!function_exists('get_all_classes_data')) {
    function get_all_classes_data(\\$request) {
        return new WP_REST_Response(fetch_class_data_from_db(), 200);
    }
}

// Callback function for main data sync GET /data
if (!function_exists('sync_app_data')) {
    function sync_app_data(\\$request) {
        \\$response_data = array(
            'students' => array(),
            'teachers' => array(),
            'classes'  => array(),
        );

        // Fetch Students
        \\$student_users = get_users(array('role' => 'student'));
        foreach (\\$student_users as \\$user) {
            \\$response_data['students'][] = array(
                'studentId'     => (string)\\$user->ID,
                'studentName'   => \\$user->display_name,
                'class'         => get_user_meta(\\$user->ID, 'class_name', true),
                'section'       => get_user_meta(\\$user->ID, 'class_section', true),
                'rollNumber'    => get_user_meta(\\$user->ID, 'roll_id', true),
                'contactNumber' => get_user_meta(\\$user->ID, 'mobile', true) ?: get_user_meta(\\$user->ID, 'phone', true),
                'profilePhotoUrl' => get_custom_user_photo_url(\\$user->ID),
            );
        }

        // Fetch Teachers
        \\$teacher_users = get_users(array('role' => 'teacher'));
        foreach (\\$teacher_users as \\$user) {
            \\$response_data['teachers'][] = array(
                'id'    => (string)\\$user->ID,
                'name'  => \\$user->display_name,
                'role'  => 'Teacher',
                'email' => \\$user->user_email,
                'phone' => get_user_meta(\\$user->ID, 'mobile', true) ?: get_user_meta(\\$user->ID, 'phone', true),
                'profilePhotoUrl' => get_custom_user_photo_url(\\$user->ID),
            );
        }

        // Fetch Classes
        \\$response_data['classes']  = fetch_class_data_from_db();

        return new WP_REST_Response(\\$response_data, 200);
    }
}

// Callback function for POST /attendance
if (!function_exists('receive_attendance_data')) {
    function receive_attendance_data(\\$request) {
        global \\$wpdb;
        \\$params = \\$request->get_json_params();
        \\$attendance_table = \\$wpdb->prefix . 'smgt_attendence';

        // Handle Students
        if (isset(\\$params['students']) && is_array(\\$params['students'])) {
            foreach (\\$params['students'] as \\$student_record) {
                \\$user_id = (int)\\$student_record['id'];
                \\$attendance_date = (new DateTime(\\$student_record['timestamp']))->format('Y-m-d');

                \\$existing_record = \\$wpdb->get_row(\\$wpdb->prepare(
                    "SELECT attend_id FROM \\$attendance_table WHERE user_id = %d AND attendence_date = %s AND role_name = 'student'",
                    \\$user_id,
                    \\$attendance_date
                ));

                \\$data = array(
                    'user_id' => \\$user_id,
                    'attendence_date' => \\$attendance_date,
                    'status' => 'Present',
                    'attendence_by' => 1,
                    'role_name' => 'student',
                    'comment' => 'Present via QR Scan'
                );

                if (\\$existing_record) {
                    \\$wpdb->update(\\$attendance_table, \\$data, array('attend_id' => \\$existing_record->attend_id));
                } else {
                    \\$wpdb->insert(\\$attendance_table, \\$data);
                }
            }
        }

        // Handle Teachers
        if (isset(\\$params['teachers']) && is_array(\\$params['teachers'])) {
            foreach (\\$params['teachers'] as \\$teacher_record) {
                \\$user_id = (int)\\$teacher_record['teacherId'];
                \\$attendance_date = \\$teacher_record['date'];

                \\$existing_record = \\$wpdb->get_row(\\$wpdb->prepare(
                    "SELECT attend_id FROM \\$attendance_table WHERE user_id = %d AND attendence_date = %s AND role_name = 'teacher'",
                    \\$user_id,
                    \\$attendance_date
                ));

                \\$data = array(
                    'user_id' => \\$user_id,
                    'attendence_date' => \\$attendance_date,
                    'status' => \\$teacher_record['status'],
                    'comment' => \\$teacher_record['comment'],
                    'attendence_by' => 1,
                    'role_name' => 'teacher'
                );

                if (\\$existing_record) {
                    \\$wpdb->update(\\$attendance_table, \\$data, array('attend_id' => \\$existing_record->attend_id));
                } else {
                    \\$wpdb->insert(\\$attendance_table, \\$data);
                }
            }
        }

        return new WP_REST_Response(array('success' => true, 'message' => 'Attendance recorded successfully.'), 200);
    }
}

// Callback for POST /classes
if (!function_exists('add_new_class_data')) {
    function add_new_class_data(\\$request) {
        global \\$wpdb;
        \\$params = \\$request->get_json_params();
        \\$class_table = \\$wpdb->prefix . 'smgt_class';

        \\$data_to_insert = array(
            'class_name' => sanitize_text_field(\\$params['class_name']),
            'class_numeric' => intval(\\$params['class_numeric']),
            'section_name' => serialize(\\$params['class_section']), // Serialize array for storage
            'class_capacity' => intval(\\$params['class_capacity']),
        );