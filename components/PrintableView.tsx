import React from 'react';
import IdCard from './IdCard';
import type { Student, Teacher, ClassData } from '../types';

type PrintOrientation = 'portrait' | 'landscape';

interface PrintableViewProps {
    people: (Student | Teacher)[];
    type: 'student' | 'teacher';
    orientation: PrintOrientation;
    classMap: Map<string, ClassData>;
}

const PrintableView: React.FC<PrintableViewProps> = ({ people, type, orientation, classMap }) => {
    const wrapperClass = orientation === 'portrait' ? 'portrait-card' : 'landscape-card';

    return (
        <div className="id-card-print-container">
            {people.map(person => {
                const key = type === 'student' ? (person as Student).studentId : (person as Teacher).id;
                return (
                    <div key={key} className={wrapperClass}>
                        <IdCard person={person} type={type} classMap={classMap} />
                    </div>
                );
            })}
        </div>
    );
};

export default PrintableView;