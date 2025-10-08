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
                <DetailRow label="Class" value={`${s.class || 'N/A'}${s.section ? ` - ${s.section}` : ''}`} />
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
    const securePhotoUrl = photoUrl?.replace(/^http:\/\//i, 'https://');

    return (
        <div className="bg-white w-full h-full flex flex-col font-sans border border-slate-200 overflow-hidden">
            {/* Header */}
            <header className="flex flex-col items-center p-2 bg-indigo-800 text-white text-center">
                 <img src="https://ponsrischool.in/wp-content/uploads/2025/03/cropped-download.png" alt="Ponsri School Logo" className="w-10 h-10 bg-white rounded-full p-0.5" />
                <h2 className="text-xs font-bold leading-tight mt-1">PM SHRI PRATHMIK VIDHYAMANDIR</h2>
                <p className="text-[10px] leading-tight">PONSRI, Ta. Una, Dist. Gir Somnath</p>
            </header>

            {/* Body */}
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

            {/* Footer */}
            <footer className="flex flex-col items-center justify-center p-2 bg-indigo-800 text-white">
                <QRCodeSVG value={qrValue} size={50} level={"H"} bgColor="#FFFFFF" fgColor="#000000" />
                <p className="text-[10px] font-mono mt-1">{id}</p>
            </footer>
        </div>
    );
};

export default IdCard;