import React, { useState, useEffect, useRef } from 'react';
import { SettingsIcon, BellIcon, PowerIcon, ChevronDownIcon, SchoolLogo } from './icons';
import type { User } from '../types';

interface HeaderProps {
    currentUser: User;
    onLogout: () => void;
    onNavigate: (view: string) => void;
}

const Header: React.FC<HeaderProps> = ({ currentUser, onLogout, onNavigate }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const userInitial = currentUser.email ? currentUser.email.charAt(0).toUpperCase() : '?';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <header className="bg-white shadow-md sticky top-0 z-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Left side: Logo and Title */}
                    <div className="flex items-center gap-3">
                        <SchoolLogo className="h-10 w-10" />
                        <h1 className="text-xl font-bold text-slate-800">
                           Student Attendance
                        </h1>
                    </div>

                    {/* Right side: Actions and User Menu */}
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => onNavigate('settings')}
                            className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
                            aria-label="Settings"
                        >
                            <SettingsIcon className="w-6 h-6" />
                        </button>

                        <button className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600" aria-label="Notifications">
                            <BellIcon className="w-6 h-6" />
                        </button>
                        
                        <div className="w-px h-6 bg-slate-200"></div>

                        {/* User Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center gap-2 rounded-full hover:bg-slate-100 p-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
                            >
                                <div className="w-9 h-9 bg-indigo-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                    {userInitial}
                                </div>
                                <ChevronDownIcon className="w-5 h-5 text-slate-500" />
                            </button>
                            
                            {isDropdownOpen && (
                                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                                    <div className="px-4 py-2 text-sm text-slate-700 border-b">
                                        <p className="font-medium">Signed in as</p>
                                        <p className="truncate">{currentUser.email}</p>
                                    </div>
                                    <a
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            onLogout();
                                            setIsDropdownOpen(false);
                                        }}
                                        className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-100"
                                    >
                                        <PowerIcon className="w-5 h-5" />
                                        Log Out
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;