import React, { useState, useEffect } from 'react';
import { getUsers, addUser, deleteUser } from '../api';
import type { User } from '../types';
// FIX: Imported the missing CheckCircleIcon to resolve a 'Cannot find name' error.
import { LogoutIcon, SpinnerIcon, UsersIcon, ClipboardIcon, CloudDownloadIcon, ExclamationCircleIcon, CheckCircleIcon } from './icons';

interface SettingsProps {
    onSaveKey: (key: string) => void;
    onLogout?: () => void;
    secretKey?: string;
    initialSetup?: boolean;
    currentUser: Omit<User, 'password'>;
}

const GITHUB_PLUGIN_URL = 'https://raw.githubusercontent.com/Preet3627/Attendance-Management-System/main/qr-attendance-plugin.php';
const GITHUB_HTACCESS_URL = 'https://raw.githubusercontent.com/Preet3627/Attendance-Management-System/main/.htaccess';


const WordPressPluginCode = ({ code, version, isLoading, error }: { code: string, version: string, isLoading: boolean, error: string | null }) => {
    const [copyText, setCopyText] = useState('Copy Code');

    const handleCopy = () => {
        if (!code) return;
        navigator.clipboard.writeText(code).then(() => {
            setCopyText('Copied!');
            setTimeout(() => setCopyText('Copy Code'), 2000);
        }, (err) => {
            console.error('Could not copy text: ', err);
            setCopyText('Copy Failed');
             setTimeout(() => setCopyText('Copy Code'), 2000);
        });
    };
    
    return (
        <div className="p-6 bg-white rounded-lg shadow-lg space-y-6">
            <div className="border-b pb-3 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <ClipboardIcon className="w-5 h-5"/> WordPress Plugin Code {version && `(v${version})`}
                </h3>
                <button
                    onClick={handleCopy}
                    disabled={isLoading || !!error}
                    className="inline-flex items-center gap-2 px-3 py-1 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 transition-all duration-150 ease-in-out disabled:bg-slate-50 disabled:cursor-not-allowed"
                >
                    {copyText}
                </button>
            </div>
            <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4" role="alert">
                <p className="font-bold">How to Install & Set Your Secret Key</p>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                    <li><strong>Create Plugin File:</strong> Copy the PHP code below and save it in a new file named <code>qr-attendance-plugin.php</code>.</li>
                    <li><strong>Upload Plugin:</strong> In your WordPress dashboard, go to <strong>Plugins → Add New → Upload Plugin</strong>, and upload the file you just created.</li>
                    <li><strong>Activate:</strong> Activate the "Custom Data Sync for QR Attendance App" plugin from your plugins list.</li>
                    <li><strong>Go to Settings:</strong> Navigate to <strong>Settings → QR App Sync</strong> in the left-hand menu.</li>
                    <li><strong>Save Your Key:</strong> Enter the exact same Secret API Key that you use in this application into the "Secret Key" field and click "Save Settings".</li>
                </ol>
            </div>
            {isLoading ? (
                 <div className="flex justify-center items-center h-40">
                    <SpinnerIcon className="w-8 h-8 text-indigo-700" />
                 </div>
            ) : error ? (
                <div className="text-center text-red-600 bg-red-50 p-4 rounded-md">{error}</div>
            ) : (
                <pre className="bg-slate-800 text-white p-4 rounded-md text-sm overflow-x-auto">
                    <code>
                        {code}
                    </code>
                </pre>
            )}
        </div>
    );
};

const HtaccessCode = ({ code, isLoading, error }: { code: string, isLoading: boolean, error: string | null }) => {
    const [copyText, setCopyText] = useState('Copy Code');

    const handleCopy = () => {
        if (!code) return;
        navigator.clipboard.writeText(code).then(() => {
            setCopyText('Copied!');
            setTimeout(() => setCopyText('Copy Code'), 2000);
        });
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-lg space-y-6">
            <div className="border-b pb-3 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <ClipboardIcon className="w-5 h-5"/> Recommended .htaccess File
                </h3>
                <button
                    onClick={handleCopy}
                    disabled={isLoading || !!error}
                    className="inline-flex items-center gap-2 px-3 py-1 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 transition-all duration-150 ease-in-out disabled:bg-slate-50 disabled:cursor-not-allowed"
                >
                    {copyText}
                </button>
            </div>
            <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4" role="alert">
                <p className="font-bold">How to Use This File</p>
                <p className="mt-1 text-sm">
                    The <code>.htaccess</code> file is a powerful configuration file for web servers running Apache. Copy the code below and place it in the root directory of your WordPress installation. If a file already exists, you can add these rules to it (usually at the top). These rules help improve security and performance.
                </p>
            </div>
             {isLoading ? (
                 <div className="flex justify-center items-center h-40">
                    <SpinnerIcon className="w-8 h-8 text-indigo-700" />
                 </div>
            ) : error ? (
                <div className="text-center text-red-600 bg-red-50 p-4 rounded-md">{error}</div>
            ) : (
                <pre className="bg-slate-800 text-white p-4 rounded-md text-sm overflow-x-auto">
                    <code>
                        {code}
                    </code>
                </pre>
            )}
        </div>
    );
};


const Settings: React.FC<SettingsProps> = ({ onSaveKey, onLogout, secretKey: initialKey, initialSetup = false, currentUser }) => {
    const [secretKey, setSecretKey] = useState(initialKey || '');
    const [isSaving, setIsSaving] = useState(false);
    
    // Server code state
    const [pluginInfo, setPluginInfo] = useState({ code: '', version: '', error: null as string | null });
    const [htaccessInfo, setHtaccessInfo] = useState({ code: '', error: null as string | null });
    const [isLoadingCode, setIsLoadingCode] = useState(true);

    // User management state
    const [users, setUsers] = useState<Omit<User, 'password'>[]>([]);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [isUsersLoading, setIsUsersLoading] = useState(false);
    const [userError, setUserError] = useState<string | null>(null);

     useEffect(() => {
        if (!initialSetup) {
            fetchServerCode();
        }
        if (currentUser.role === 'superuser') {
            fetchUsers();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser.role, initialSetup]);

    const fetchServerCode = async () => {
        setIsLoadingCode(true);
        try {
            const [pluginResponse, htaccessResponse] = await Promise.all([
                fetch(GITHUB_PLUGIN_URL),
                fetch(GITHUB_HTACCESS_URL)
            ]);

            if (!pluginResponse.ok) throw new Error(`Failed to fetch plugin: ${pluginResponse.statusText}`);
            const pluginCode = await pluginResponse.text();
            const versionMatch = pluginCode.match(/Version:\s*([0-9.]+)/);
            setPluginInfo({ code: pluginCode, version: versionMatch ? versionMatch[1] : 'N/A', error: null });

            if (!htaccessResponse.ok) throw new Error(`Failed to fetch .htaccess: ${htaccessResponse.statusText}`);
            const htaccessCode = await htaccessResponse.text();
            setHtaccessInfo({ code: htaccessCode, error: null });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching files from GitHub.";
            setPluginInfo(prev => ({ ...prev, error: errorMessage }));
            setHtaccessInfo(prev => ({ ...prev, error: errorMessage }));
        } finally {
            setIsLoadingCode(false);
        }
    };

    const fetchUsers = async () => {
        setIsUsersLoading(true);
        try {
            const fetchedUsers = await getUsers();
            setUsers(fetchedUsers);
        } catch (error) {
            setUserError('Failed to load users.');
        } finally {
            setIsUsersLoading(false);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setUserError(null);
        if (!newUserEmail || !newUserPassword) {
            setUserError('Email and password are required.');
            return;
        }
        try {
            await addUser({ email: newUserEmail, password: newUserPassword, role: 'user' });
            setNewUserEmail('');
            setNewUserPassword('');
            await fetchUsers();
        } catch (error) {
            setUserError(error instanceof Error ? error.message : 'Failed to add user.');
        }
    };

    const handleDeleteUser = async (email: string) => {
        if (window.confirm(`Are you sure you want to delete user ${email}?`)) {
            try {
                await deleteUser(email);
                await fetchUsers();
            } catch (error) {
                setUserError(error instanceof Error ? error.message : 'Failed to delete user.');
            }
        }
    };


    const handleSave = () => {
        if (secretKey.trim()) {
            setIsSaving(true);
            setTimeout(() => {
                onSaveKey(secretKey.trim());
                setIsSaving(false);
            }, 500);
        }
    };

    return (
        <div className="space-y-8">
            <div className="p-6 bg-white rounded-lg shadow-lg space-y-6">
                <h3 className="text-lg font-semibold text-slate-800 border-b pb-3">{initialSetup ? 'Initial API Key Setup' : 'API Key Settings'}</h3>
                {initialSetup && (
                    <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4" role="alert">
                        <p className="font-bold">Welcome!</p>
                        <p>Please enter the Secret API Key provided by the school administration to connect this device to the server.</p>
                    </div>
                )}
                <div className="space-y-2">
                    <label htmlFor="secret-key" className="block text-sm font-medium text-slate-700">Secret API Key</label>
                    <div className="flex gap-4">
                        <input
                            type="password"
                            id="secret-key"
                            value={secretKey}
                            onChange={(e) => setSecretKey(e.target.value)}
                            className="flex-grow shadow-sm focus:ring-indigo-600 focus:border-indigo-600 block w-full sm:text-sm border-slate-300 rounded-md"
                            placeholder="Enter your secret key"
                        />
                         <button
                            onClick={handleSave}
                            disabled={isSaving || !secretKey.trim()}
                            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-700 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 disabled:bg-indigo-500 disabled:cursor-wait"
                        >
                            {isSaving ? <><SpinnerIcon className="w-5 h-5 mr-2" /> Saving...</> : 'Save Key'}
                        </button>
                    </div>
                </div>
            </div>

            {currentUser.role === 'superuser' && (
                <div className="p-6 bg-white rounded-lg shadow-lg space-y-6">
                     <h3 className="text-lg font-semibold text-slate-800 border-b pb-3 flex items-center gap-2"><UsersIcon className="w-5 h-5"/> User Management</h3>
                     {userError && <p className="text-sm text-red-600">{userError}</p>}
                     <form onSubmit={handleAddUser} className="space-y-4 sm:flex sm:items-end sm:gap-4">
                        <div className="flex-grow">
                             <label htmlFor="new-user-email" className="block text-sm font-medium text-slate-700">New User Email</label>
                             <input type="email" id="new-user-email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required className="mt-1 shadow-sm focus:ring-indigo-600 focus:border-indigo-600 block w-full sm:text-sm border-slate-300 rounded-md" />
                        </div>
                        <div className="flex-grow">
                             <label htmlFor="new-user-password" className="block text-sm font-medium text-slate-700">Password</label>
                             <input type="password" id="new-user-password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} required className="mt-1 shadow-sm focus:ring-indigo-600 focus:border-indigo-600 block w-full sm:text-sm border-slate-300 rounded-md" />
                        </div>
                         <button type="submit" className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">Add User</button>
                     </form>
                    
                    <div className="border-t pt-4">
                        <h4 className="font-semibold text-md text-slate-700 mb-2">Existing Users</h4>
                        {isUsersLoading ? <SpinnerIcon className="w-6 h-6 text-indigo-700" /> : (
                            <ul className="divide-y divide-slate-200">
                                {users.map(user => (
                                     <li key={user.email} className="py-3 flex justify-between items-center">
                                         <div>
                                            <p className="text-sm font-medium text-slate-900">{user.email}</p>
                                            <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                                         </div>
                                         <button onClick={() => handleDeleteUser(user.email)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
                                     </li>
                                ))}
                                {users.length === 0 && <p className="text-sm text-slate-500">No standard users found.</p>}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {!initialSetup && onLogout && (
                 <div className="p-6 bg-white rounded-lg shadow-lg">
                     <h3 className="text-lg font-semibold text-slate-800 border-b pb-3">Account</h3>
                     <div className="mt-4">
                        <button
                            onClick={onLogout}
                            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md shadow-sm text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                           <LogoutIcon className="w-5 h-5 mr-2" /> Log Out
                        </button>
                     </div>
                </div>
            )}
            
            {!initialSetup && (
                <>
                    <div className="p-6 bg-white rounded-lg shadow-lg space-y-4">
                         <h3 className="text-lg font-semibold text-slate-800 border-b pb-3">Server Code Sync</h3>
                         <div className="flex flex-col sm:flex-row gap-4 items-center">
                             <button onClick={fetchServerCode} disabled={isLoadingCode} className="flex-1 w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 disabled:bg-slate-100 disabled:cursor-wait transition-colors">
                                 {isLoadingCode ? <><SpinnerIcon className="w-5 h-5 mr-2"/>Checking...</> : <><CloudDownloadIcon className="w-5 h-5 mr-2"/>Re-check for Updates</>}
                             </button>
                             <div className="text-sm text-slate-600">
                                {isLoadingCode ? (
                                    <p>Checking for latest server code...</p>
                                ) : pluginInfo.error ? (
                                    <p className="flex items-center gap-2 text-red-600"><ExclamationCircleIcon className="w-5 h-5"/>Could not fetch updates.</p>
                                ) : (
                                    <p className="flex items-center gap-2 text-green-600"><CheckCircleIcon className="w-5 h-5"/>Latest plugin version is <strong>{pluginInfo.version}</strong></p>
                                )}
                             </div>
                         </div>
                    </div>
                    <WordPressPluginCode code={pluginInfo.code} version={pluginInfo.version} isLoading={isLoadingCode} error={pluginInfo.error} />
                    <HtaccessCode code={htaccessInfo.code} isLoading={isLoadingCode} error={htaccessInfo.error} />
                </>
            )}
        </div>
    );
};

export default Settings;