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
    <div className="flex text-[10px] leading-snug">
        <span className="w-20 font-medium text-slate-600 shrink-0">{label}</span>
        <span className="font-semibold text-slate-800 break-words">: {value || 'N/A'}</span>
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
                <DetailRow label="Class" value={formatClassName(s.class)} />
                <DetailRow label="Roll No." value={s.rollNumber} />
                <DetailRow label="Contact No." value={s.contactNumber} />
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
                <DetailRow label="Mobile" value={t.phone} />
                <DetailRow label="Email" value={t.email} />
            </>
        );
    }

    const qrValue = JSON.stringify({ id, name, type });
    const securePhotoUrl = photoUrl?.replace(/^http:\/\//i, 'https://');

    return (
        <div className="bg-white w-full h-full flex flex-col font-sans border border-slate-300 overflow-hidden">
            {/* Header */}
            <header className="flex items-center gap-2 p-1 bg-indigo-700 text-white shrink-0">
                 <img src="https://ponsrischool.in/wp-content/uploads/2025/03/cropped-download.png" alt="Ponsri School Logo" className="w-8 h-8 bg-white rounded-full p-0.5" />
                 <h2 className="text-xs font-bold leading-tight uppercase text-center flex-grow">PM SHRI PRATHMIK VIDHYAMANDIR PONSRI</h2>
            </header>
            
            {/* Body */}
            <main className="flex-grow p-1.5 flex flex-row items-stretch gap-2">
                {/* Left part */}
                <div className="w-[75px] flex flex-col items-center justify-between">
                     <div className="w-[75px] h-[75px] border-2 border-indigo-300 p-0.5 rounded-md bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {securePhotoUrl ? 
                            <img src={securePhotoUrl} alt={name} className="w-full h-full object-cover" /> : 
                            <UserIcon className="w-12 h-12 text-slate-400" />
                        }
                    </div>
                    <div className="flex flex-col items-center">
                        <QRCodeSVG value={qrValue} size={70} level={"H"} bgColor="#FFFFFF" fgColor="#000000" />
                    </div>
                </div>
                {/* Right part */}
                <div className="flex-grow flex flex-col justify-center border-l pl-2 border-slate-200">
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase leading-tight mb-2">{name}</h3>
                    <div className="space-y-1.5">
                       <DetailRow label="Student Name" value={name}/>
                       {details}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default IdCard;