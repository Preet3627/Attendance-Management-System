import React, { useState, useEffect } from 'react';
import { getUsers, addUser, deleteUser } from '../api';
import type { User } from '../types';
import { LogoutIcon, SpinnerIcon, UsersIcon, ClipboardIcon } from './icons';

interface SettingsProps {
    onSaveKey: (key: string) => void;
    onLogout?: () => void;
    secretKey?: string;
    initialSetup?: boolean;
    currentUser: Omit<User, 'password'>;
}

const PHP_CODE = `<?php
/*
Plugin Name: Custom Data Sync for QR Attendance App
Description: Provides a secure REST API endpoint to sync student and teacher data for the QR attendance app.
Version: 1.7
Author: QR App Support
*/

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// IMPORTANT: Allow the 'X-Sync-Key' header for CORS requests.
// This is required to prevent "Failed to fetch" errors when the app
// tries to connect to the WordPress server from a different origin.
add_filter( 'rest_allowed_cors_headers', function( $allowed_headers ) {
    $allowed_headers[] = 'x-sync-key';
    return $allowed_headers;
} );

// Register the REST API routes
add_action('rest_api_init', function () {
    register_rest_route('custom-sync/v1', '/data', array(
        'methods' => 'GET',
        'callback' => 'sync_app_data',
        'permission_callback' => 'sync_permission_check',
    ));
    register_rest_route('custom-sync/v1', '/attendance', array(
        'methods' => 'POST',
        'callback' => 'receive_attendance_data',
        'permission_callback' => 'sync_permission_check',
    ));
});

// Permission check for the API key
if (!function_exists('sync_permission_check')) {
    function sync_permission_check($request) {
        $secret_key = $request->get_header('X-Sync-Key');
        $stored_key = get_option('qr_app_secret_key', ''); 
        if (empty($stored_key) || empty($secret_key) || !hash_equals($stored_key, $secret_key)) {
            return new WP_Error('rest_forbidden', 'Invalid or missing secret key.', array('status' => 401));
        }
        return true;
    }
}

// Helper function to get user profile photo
if (!function_exists('get_custom_user_photo_url')) {
    function get_custom_user_photo_url($user_id) {
        $avatar_meta = get_user_meta($user_id, 'smgt_user_avatar', true);
        if (!empty($avatar_meta)) {
            if (is_numeric($avatar_meta)) {
                $image_url = wp_get_attachment_image_url($avatar_meta, 'full');
                if ($image_url) {
                    return $image_url;
                }
            }
            elseif (filter_var($avatar_meta, FILTER_VALIDATE_URL)) {
                return $avatar_meta;
            }
        }
        return get_avatar_url($user_id);
    }
}

// Callback function to provide the data
if (!function_exists('sync_app_data')) {
    function sync_app_data($request) {
        $response_data = array(
            'students' => array(),
            'teachers' => array(),
        );

        $student_users = get_users(array('role' => 'student'));
        foreach ($student_users as $user) {
            $student_data = array(
                'studentId'     => (string)$user->ID,
                'studentName'   => $user->display_name,
                'class'         => get_user_meta($user->ID, 'class_name', true),
                'section'       => get_user_meta($user->ID, 'class_section', true),
                'rollNumber'    => get_user_meta($user->ID, 'roll_id', true),
                'contactNumber' => get_user_meta($user->ID, 'mobile', true),
                'profilePhotoUrl' => get_custom_user_photo_url($user->ID),
            );
            $response_data['students'][] = $student_data;
        }

        $teacher_users = get_users(array('role' => 'teacher'));
        foreach ($teacher_users as $user) {
            $teacher_data = array(
                'id'    => (string)$user->ID,
                'name'  => $user->display_name,
                'role'  => 'Teacher',
                'email' => $user->user_email,
                'phone' => get_user_meta($user->ID, 'mobile', true),
                'profilePhotoUrl' => get_custom_user_photo_url($user->ID),
            );
            $response_data['teachers'][] = $teacher_data;
        }

        return new WP_REST_Response($response_data, 200);
    }
}

// Callback function to receive attendance data
if (!function_exists('receive_attendance_data')) {
    function receive_attendance_data($request) {
        global $wpdb;
        $params = $request->get_json_params();
        $attendance_table = $wpdb->prefix . 'smgt_attendence';

        if (isset($params['students']) && is_array($params['students'])) {
            foreach ($params['students'] as $student_record) {
                 $wpdb->insert(
                    $attendance_table,
                    array(
                        'user_id' => $student_record['id'],
                        'attendence_date' => (new DateTime($student_record['timestamp']))->format('Y-m-d'),
                        'status' => 'Present',
                        'attendence_by' => get_current_user_id() ?: 1,
                        'role_name' => 'student'
                    )
                );
            }
        }
        
        if (isset($params['teachers']) && is_array($params['teachers'])) {
            foreach ($params['teachers'] as $teacher_record) {
                $wpdb->insert($attendance_table, array(
                    'user_id' => $teacher_record['teacherId'],
                    'attendence_date' => $teacher_record['date'],
                    'status' => $teacher_record['status'],
                    'comment' => $teacher_record['comment'],
                    'attendence_by' => get_current_user_id() ?: 1,
                    'role_name' => 'teacher'
                ));
            }
        }

        return new WP_REST_Response(array('success' => true, 'message' => 'Attendance recorded.'), 200);
    }
}

// Add a settings page for the API key
add_action('admin_menu', function() {
    add_options_page('QR App Sync Settings', 'QR App Sync', 'manage_options', 'qr-app-sync', 'qr_app_settings_page_html');
});

if (!function_exists('qr_app_settings_page_html')) {
    function qr_app_settings_page_html() {
        if (!current_user_can('manage_options')) {
            return;
        }
        if (isset($_GET['settings-updated'])) {
            add_settings_error('qr_app_messages', 'qr_app_message', __('Settings Saved', 'qr-app-sync'), 'updated');
        }
        settings_errors('qr_app_messages');
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            <p>Use this page to set the secret API key required for the QR Attendance App to sync data.</p>
            <form action="options.php" method="post">
                <?php
                settings_fields('qr-app-sync');
                do_settings_sections('qr-app-sync');
                submit_button('Save Settings');
                ?>
            </form>
        </div>
        <?php
    }
}

add_action('admin_init', function() {
    register_setting('qr-app-sync', 'qr_app_secret_key');
    add_settings_section('qr_app_section_developers', __('API Settings', 'qr-app-sync'), null, 'qr-app-sync');
    add_settings_field('qr_app_secret_key', __('Secret Key', 'qr-app-sync'), 'qr_app_secret_key_callback', 'qr-app-sync', 'qr_app_section_developers');
});

if (!function_exists('qr_app_secret_key_callback')) {
    function qr_app_secret_key_callback() {
        $option = get_option('qr_app_secret_key');
        echo '<input type="text" id="qr_app_secret_key" name="qr_app_secret_key" value="' . esc_attr($option) . '" size="50" />';
        echo '<p class="description">Enter a strong, unique secret key for the app to use. This must match the key entered in the app.</p>';
    }
}

?>`;

const WordPressPluginCode = () => {
    const [copyText, setCopyText] = useState('Copy Code');

    const handleCopy = () => {
        navigator.clipboard.writeText(PHP_CODE).then(() => {
            setCopyText('Copied!');
            setTimeout(() => setCopyText('Copy Code'), 2000);
        }, (err) => {
            console.error('Could not copy text: ', err);
            setCopyText('Copy Failed');
             setTimeout(() => setCopyText('Copy Code'), 2000);
        });
    };
    
    return (
        <div className="p-6 bg-white rounded-lg shadow-md space-y-6">
            <div className="border-b pb-3 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <ClipboardIcon className="w-5 h-5"/> WordPress Plugin Code (v1.7)
                </h3>
                <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-2 px-3 py-1 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-150 ease-in-out"
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
                <p className="mt-2 text-sm">The plugin reads the key from this WordPress setting; you do not need to edit the PHP code itself.</p>
            </div>
            <pre className="bg-slate-800 text-white p-4 rounded-md text-sm overflow-x-auto">
                <code>
                    {PHP_CODE}
                </code>
            </pre>
        </div>
    );
};


const Settings: React.FC<SettingsProps> = ({ onSaveKey, onLogout, secretKey: initialKey, initialSetup = false, currentUser }) => {
    const [secretKey, setSecretKey] = useState(initialKey || '');
    const [isSaving, setIsSaving] = useState(false);
    
    // User management state
    const [users, setUsers] = useState<Omit<User, 'password'>[]>([]);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [isUsersLoading, setIsUsersLoading] = useState(false);
    const [userError, setUserError] = useState<string | null>(null);

    useEffect(() => {
        if (currentUser.role === 'superuser') {
            fetchUsers();
        }
    }, [currentUser.role]);

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
            // Simulate save delay
            setTimeout(() => {
                onSaveKey(secretKey.trim());
                setIsSaving(false);
            }, 500);
        }
    };

    return (
        <div className="space-y-8">
            <div className="p-6 bg-white rounded-lg shadow-md space-y-6">
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
                            className="flex-grow shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md"
                            placeholder="Enter your secret key"
                        />
                         <button
                            onClick={handleSave}
                            disabled={isSaving || !secretKey.trim()}
                            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-wait"
                        >
                            {isSaving ? <><SpinnerIcon className="w-5 h-5 mr-2" /> Saving...</> : 'Save Key'}
                        </button>
                    </div>
                </div>
            </div>

            {currentUser.role === 'superuser' && (
                <div className="p-6 bg-white rounded-lg shadow-md space-y-6">
                     <h3 className="text-lg font-semibold text-slate-800 border-b pb-3 flex items-center gap-2"><UsersIcon className="w-5 h-5"/> User Management</h3>
                     {userError && <p className="text-sm text-red-600">{userError}</p>}
                     <form onSubmit={handleAddUser} className="space-y-4 sm:flex sm:items-end sm:gap-4">
                        <div className="flex-grow">
                             <label htmlFor="new-user-email" className="block text-sm font-medium text-slate-700">New User Email</label>
                             <input type="email" id="new-user-email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md" />
                        </div>
                        <div className="flex-grow">
                             <label htmlFor="new-user-password" className="block text-sm font-medium text-slate-700">Password</label>
                             <input type="password" id="new-user-password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} required className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md" />
                        </div>
                         <button type="submit" className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">Add User</button>
                     </form>
                    
                    <div className="border-t pt-4">
                        <h4 className="font-semibold text-md text-slate-700 mb-2">Existing Users</h4>
                        {isUsersLoading ? <SpinnerIcon className="w-6 h-6 text-indigo-500" /> : (
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
                 <div className="p-6 bg-white rounded-lg shadow-md">
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
            
            {!initialSetup && <WordPressPluginCode />}
        </div>
    );
};

export default Settings;