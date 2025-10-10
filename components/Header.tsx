import React, { useState, useEffect, useRef } from 'react';
import { PowerIcon, ChevronDownIcon, SchoolLogo, SunIcon, MoonIcon } from './icons';
import type { User } from '../types';

interface HeaderProps {
    currentUser: User;
    onLogout: () => void;
    onNavigate: (view: string) => void;
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
}

const SUPERUSER_EMAIL = 'ponsrischool.big.gan.nav@gmail.com';
const SUPERUSER_AVATAR = 'https://ponsrischool.in/wp-content/uploads/2025/03/cropped-download.png';

const Header: React.FC<HeaderProps> = ({ currentUser, onLogout, onNavigate, theme, setTheme }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isSuperUser = currentUser.email === SUPERUSER_EMAIL;
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

    const renderAvatar = () => {
        if (isSuperUser) {
            return <img src={SUPERUSER_AVATAR} alt="Admin Logo" className="w-full h-full object-cover" />;
        }
        return <span className="font-bold text-sm text-white">{userInitial}</span>;
    };

    return (
        <header className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg sticky top-0 z-20 border-b border-white/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Left side: Logo and Title */}
                    <div className="flex items-center gap-3">
                        <SchoolLogo className="h-10 w-10" />
                        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 hidden sm:block">
                           PM SHRI PONSRI Attendance
                        </h1>
                    </div>

                    {/* Right side: Actions and User Menu */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button
                          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                          className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                          aria-label="Toggle theme"
                        >
                            {theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
                        </button>
                        
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>

                        {/* User Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center gap-2 rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-700/70 p-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                            >
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden ${isSuperUser ? 'bg-white border border-slate-200' : 'bg-purple-600'}`}>
                                    {renderAvatar()}
                                </div>
                                <ChevronDownIcon className="w-5 h-5 text-slate-500 dark:text-slate-400 hidden sm:block" />
                            </button>
                            
                            {isDropdownOpen && (
                                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-xl shadow-lg py-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-slate-200/50 dark:border-slate-700/50">
                                    <div className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                                        <p className="font-medium">Signed in as</p>
                                        <p className="truncate font-semibold">{currentUser.email}</p>
                                    </div>
                                    <a
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            onLogout();
                                            setIsDropdownOpen(false);
                                        }}
                                        className="flex items-center gap-3 w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-slate-100/70 dark:hover:bg-slate-700/70"
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