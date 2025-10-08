// FIX: Provided full content for api.ts to define all API and user management functions.
import type { Student, Teacher, StudentAttendanceRecord, TeacherAttendanceRecord, User, ClassData } from './types';
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

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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
    return {
        students: data.students || [],
        teachers: data.teachers || [],
        classes: data.classes || [],
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
