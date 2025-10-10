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
    <div className="flex text-[8px] leading-tight">
        <span className="w-14 font-medium text-slate-600 shrink-0">{label}</span>
        <span className="font-semibold text-slate-800 break-words">: {value || 'N/A'}</span>
    </div>
);


const IdCard: React.FC<IdCardProps> = ({ person, type, classMap }) => {
    let name: string, id: string, photoUrl: string | undefined, details: React.ReactNode;

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
    const securePhotoUrl = photoUrl?.replace(/^http:\/\//i, 'https');

    return (
        <div className="bg-white w-full h-full flex flex-col font-sans border border-slate-300 overflow-hidden">
            {/* Header */}
            <header className="flex items-center gap-1 p-1 bg-purple-700 text-white shrink-0">
                 <img src="https://ponsrischool.in/wp-content/uploads/2025/03/cropped-download.png" alt="Ponsri School Logo" className="w-6 h-6 bg-white rounded-full p-0.5" />
                 <h2 className="text-[7px] font-bold leading-tight uppercase text-center flex-grow">PM SHRI PRATHMIK VIDHYAMANDIR PONSRI</h2>
            </header>
            
            {/* Body */}
            <main className="flex-grow p-1.5 flex flex-row items-stretch gap-2">
                {/* Left part: QR Code */}
                <div className="w-[50mm] flex flex-col items-center justify-center">
                    <QRCodeSVG value={qrValue} size={130} level={"H"} bgColor="#FFFFFF" fgColor="#000000" />
                </div>
                {/* Right part: Details */}
                <div className="flex-grow flex flex-col justify-center items-center border-l-2 border-purple-200 pl-1.5">
                     <div className="w-[25mm] h-[25mm] border-2 border-purple-300 p-0.5 rounded-md bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 mb-1">
                        {securePhotoUrl ? 
                            <img src={securePhotoUrl} alt={name} className="w-full h-full object-cover" /> : 
                            <UserIcon className="w-16 h-16 text-slate-400" />
                        }
                    </div>
                    <h3 className="text-[10px] font-extrabold text-slate-800 uppercase leading-tight text-center mb-1.5">{name}</h3>
                    <div className="space-y-1">
                       <DetailRow label="ID" value={id}/>
                       {details}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default IdCard;