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
}
