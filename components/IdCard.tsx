import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Student, Teacher } from '../types';
import { formatClassName } from '../utils';
import { UserIcon } from './icons';

interface IdCardProps {
    person: Student | Teacher;
    type: 'student' | 'teacher';
}

const DetailRow = ({ label, value }: { label: string, value: string | undefined }) => (
    <tr className="border-b border-slate-200">
        <td className="py-1 pr-2 font-semibold text-slate-600">{label}</td>
        <td className="py-1 text-slate-800 break-words">{value || 'N/A'}</td>
    </tr>
);


const IdCard: React.FC<IdCardProps> = ({ person, type }) => {
    let name: string, id: string, photoUrl: string | undefined, details: React.ReactNode;

    if (type === 'student') {
        const s = person as Student;
        name = s.studentName;
        id = s.studentId;
        photoUrl = s.profilePhotoUrl;
        details = (
            <table className="w-full text-left text-xs">
                <tbody>
                    <DetailRow label="Admission No." value={s.studentId} />
                    <DetailRow label="Class" value={formatClassName(s.class)} />
                    <DetailRow label="Roll No." value={s.rollNumber} />
                    <DetailRow label="Mobile" value={s.contactNumber} />
                </tbody>
            </table>
        );
    } else {
        const t = person as Teacher;
        name = t.name;
        id = t.id;
        photoUrl = t.profilePhotoUrl;
        details = (
            <table className="w-full text-left text-xs">
                <tbody>
                    <DetailRow label="Teacher ID" value={t.id} />
                    <DetailRow label="Role" value={t.role} />
                    <DetailRow label="Mobile" value={t.phone} />
                    <DetailRow label="Email" value={t.email} />
                </tbody>
            </table>
        );
    }

    const qrValue = JSON.stringify({ id, name });
    const securePhotoUrl = photoUrl?.replace(/^http:\/\//i, 'https://');

    return (
        <div className="bg-white w-full h-full flex flex-col font-sans border border-slate-300 overflow-hidden">
            {/* Header */}
            <header className="flex items-center gap-2 p-1.5 bg-sky-500 text-white">
                 <img src="https://ponsrischool.in/wp-content/uploads/2025/03/cropped-download.png" alt="Ponsri School Logo" className="w-10 h-10 bg-white rounded-md p-0.5" />
                 <div className="text-center flex-grow">
                    <h2 className="text-xs font-bold leading-tight">PM SHRI PRATHMIK VIDHYAMANDIR</h2>
                    <p className="text-[9px] leading-tight">PONSRI, Ta. Una, Dist. Gir Somnath</p>
                 </div>
            </header>

            {/* Body */}
            <main className="flex-grow p-2 flex flex-col items-center">
                <div className="w-20 h-20 mt-1 border-2 border-sky-300 p-0.5 rounded-md bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {securePhotoUrl ? 
                        <img src={securePhotoUrl} alt={name} className="w-full h-full object-cover" /> : 
                        <UserIcon className="w-16 h-16 text-slate-400" />
                    }
                </div>
                
                <h3 className="mt-2 text-base font-bold text-slate-800 uppercase">{name}</h3>
                
                <div className="w-full mt-2 text-sm">
                    {details}
                </div>
            </main>

            {/* Footer */}
            <footer className="flex items-center justify-between p-1.5 bg-sky-500 text-white mt-auto">
                <div className="flex flex-col items-center">
                    <QRCodeSVG value={qrValue} size={40} level={"H"} bgColor="#FFFFFF" fgColor="#000000" className="rounded-sm" />
                    <p className="text-[8px] font-mono mt-0.5">{id}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold">Principal's Signature</p>
                </div>
            </footer>
        </div>
    );
};

export default IdCard;