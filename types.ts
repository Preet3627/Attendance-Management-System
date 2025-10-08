// FIX: Removed a circular import of the 'User' type. A file cannot import from itself.
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
    // This is a simplified version of the result object from html5-qrcode
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
    password?: string; // Password should not be sent back to the client
    role: 'superuser' | 'user';
}