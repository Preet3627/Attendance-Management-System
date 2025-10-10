import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Student, Teacher, ClassData } from '../types';
import { formatClassName } from '../utils';
import { UserIcon } from './icons';

interface IdCardProps {
    person: Student | Teacher;
    type: 'student' | 'teacher';
    classMap: Map<string, ClassData>;
}

const DetailRow = ({ label, value }: { label: string, value: string | undefined }) => (
    <div className="grid grid-cols-3 gap-x-2 text-lg leading-tight">
        <span className="font-medium text-slate-600 col-span-1 text-right">{label}</span>
        <span className="font-semibold text-slate-800 break-words col-span-2">: {value || 'N/A'}</span>
    </div>
);


const IdCard: React.FC<IdCardProps> = ({ person, type, classMap }) => {
    let name: string, id: string, photoUrl: string | undefined, details: React.ReactNode;

    const role = type.charAt(0).toUpperCase() + type.slice(1);

    if (type === 'student') {
        const s = person as Student;
        name = s.studentName;
        id = s.studentId;
        photoUrl = s.profilePhotoUrl;

        const classInfo = classMap.get(s.class);
        const displayClassName = classInfo ? formatClassName(classInfo.class_name) : 'Unassigned';

        details = (
            <>
                <DetailRow label="Class" value={displayClassName} />
                <DetailRow label="Roll No." value={s.rollNumber} />
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
                <DetailRow label="Mobile" value={t.phone} />
                <DetailRow label="Email" value={t.email} />
            </>
        );
    }

    const qrValue = JSON.stringify({ id, name, type });
    const securePhotoUrl = photoUrl?.replace(/^http:\/\//i, 'https');

    return (
        <div className="bg-white w-full h-full flex flex-col font-sans border border-slate-300 overflow-hidden">
            {/* Header */}
            <header className="flex items-center gap-4 p-4 bg-purple-800 text-white shrink-0">
                 <img src="https://ponsrischool.in/wp-content/uploads/2025/03/cropped-download.png" alt="Ponsri School Logo" className="w-20 h-20 bg-white rounded-full p-1" />
                 <div className="text-left">
                    <h2 className="text-3xl font-bold uppercase">PM SHRI PRATHMIK VIDHYAMANDIR</h2>
                    <p className="text-xl font-semibold">PONSRI, TA: MALPUR, DIST: ARAVALLI</p>
                 </div>
                 <div className="ml-auto text-center border-l-2 pl-4">
                     <p className="text-xl font-bold">IDENTITY CARD</p>
                     <p className="text-lg">{role}</p>
                 </div>
            </header>
            
            {/* Body */}
            <main className="flex-grow p-4 flex flex-row items-stretch gap-8">
                {/* Left part: Details */}
                <div className="flex-grow flex flex-col justify-center items-center">
                     <div className="w-[100mm] h-[100mm] border-4 border-purple-300 p-1 rounded-lg bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 mb-4 shadow-lg">
                        {securePhotoUrl ? 
                            <img src={securePhotoUrl} alt={name} className="w-full h-full object-cover" /> : 
                            <UserIcon className="w-48 h-48 text-slate-400" />
                        }
                    </div>
                    <h3 className="text-4xl font-extrabold text-slate-800 uppercase tracking-wide leading-tight text-center mb-4">{name}</h3>
                    <div className="space-y-3 w-full max-w-md">
                       <DetailRow label="ID" value={id}/>
                       {details}
                    </div>
                </div>
                {/* Right part: QR Code */}
                <div className="w-[100mm] flex flex-col items-center justify-center p-4 border-l-2 border-dashed border-purple-200">
                    <QRCodeSVG value={qrValue} size={300} level={"H"} bgColor="#FFFFFF" fgColor="#000000" />
                    <p className="text-sm font-semibold mt-4">Scan for Attendance</p>
                </div>
            </main>
        </div>
    );
};

export default IdCard;