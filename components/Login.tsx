import React, { useState } from 'react';
import { SchoolLogo, SpinnerIcon } from './icons';
import type { User } from '../types';

interface LoginProps {
    onLogin: (email: string, password: string) => Promise<User | null>;
    onLoginSuccess: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            const user = await onLogin(email, password);
            if (user) {
                onLoginSuccess(user);
            } else {
                setError('Invalid email or password. Please try again.');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-6">
                <div className="flex flex-col items-center space-y-4">
                    <SchoolLogo className="h-20" />
                    <h2 className="text-2xl font-bold text-center text-slate-800">
                        Attendance Portal Login
                    </h2>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email address</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Email address"
                            />
                        </div>
                        <div>
                            <label htmlFor="password-for-login" className="sr-only">Password</label>
                            <input
                                id="password-for-login"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Password"
                            />
                        </div>
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 text-center">{error}</p>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-wait"
                        >
                            {isLoading ? <SpinnerIcon className="h-5 w-5" /> : 'Sign in'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;