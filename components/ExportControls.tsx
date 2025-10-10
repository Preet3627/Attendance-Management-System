import React, { useState } from 'react';
import { SyncIcon, SpinnerIcon } from './icons';

interface DataControlsProps {
    onSync: () => Promise<void>;
}

const DataControls: React.FC<DataControlsProps> = ({ onSync }) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

    const handleSync = async () => {
        setIsSyncing(true);
        await onSync();
        setIsSyncing(false);
        setLastSyncTime(new Date().toLocaleTimeString());
    };

    return (
        <div className="w-full p-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 space-y-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 border-b border-slate-300/50 dark:border-slate-700/50 pb-3">Data Management</h3>
            
            <div className="space-y-2">
                <h4 className="font-semibold text-md text-slate-700 dark:text-slate-200">Server Sync</h4>
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="w-full sm:w-auto flex-1 inline-flex items-center justify-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-xl shadow-sm text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-slate-700/70 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-slate-100 disabled:cursor-wait transition-colors"
                    >
                        {isSyncing ? (
                            <><SpinnerIcon className="w-5 h-5 mr-2" /> Syncing...</>
                        ) : (
                            <><SyncIcon className="w-5 h-5 mr-2" /> Refresh Data</>
                        )}
                    </button>
                    {lastSyncTime && <p className="text-xs text-slate-500 dark:text-slate-400">Last synced at {lastSyncTime}</p>}
                </div>
            </div>
        </div>
    );
};

export default DataControls;