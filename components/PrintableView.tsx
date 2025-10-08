import React from 'react';
import IdCard from './IdCard';
import type { Student, Teacher } from '../types';

interface PrintableViewProps {
    people: (Student | Teacher)[];
    type: 'student' | 'teacher';
}

const PrintableView: React.FC<PrintableViewProps> = ({ people, type }) => {
    return (
        <div className="id-card-print-container">
            {people.map(person => {
                const key = type === 'student' ? (person as Student).studentId : (person as Teacher).id;
                return (
                    <div key={key} className="id-card-print-wrapper">
                        <IdCard person={person} type={type} />
                    </div>
                );
            })}
        </div>
    );
};

export default PrintableView;