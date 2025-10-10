import React, { useState, useEffect } from 'react';
import { getUsers, addUser, deleteUser } from '../api';
import type { User } from '../types';
import { LogoutIcon, SpinnerIcon, UsersIcon, ClipboardIcon, DownloadIcon, InformationCircleIcon } from './icons';

const PLUGIN_CODE = `<?php
/*
Plugin Name: Custom Data Sync for QR Attendance App
Description: Provides a secure REST API endpoint to sync student, teacher, and class data for the QR attendance app.
Version: 2.2
Author: QR App Support
*/

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// IMPORTANT: Allow the 'X-Sync-Key' header for CORS requests.
add_filter( 'rest_allowed_cors_headers', function( $allowed_headers ) {
    $allowed_headers[] = 'x-sync-key';
    return $allowed_headers;
} );

// Register the REST API routes
add_action('rest_api_init', function () {
    // Main data sync endpoint
    register_rest_route('custom-sync/v1', '/data', array(
        'methods' => 'GET',
        'callback' => 'sync_app_data',
        'permission_callback' => 'sync_permission_check',
    ));
    // Attendance submission endpoint
    register_rest_route('custom-sync/v1', '/attendance', array(
        'methods' => 'POST',
        'callback' => 'receive_attendance_data',
        'permission_callback' => 'sync_permission_check',
    ));

    // Class management endpoints
    register_rest_route('custom-sync/v1', '/classes', array(
        'methods' => 'GET',
        'callback' => 'get_all_classes_data',
        'permission_callback' => 'sync_permission_check',
    ));
    register_rest_route('custom-sync/v1', '/classes', array(
        'methods' => 'POST',
        'callback' => 'add_new_class_data',
        'permission_callback' => 'sync_permission_check',
    ));
    register_rest_route('custom-sync/v1', '/classes/(?P<id>\\\\d+)', array(
        'methods' => 'DELETE',
        'callback' => 'delete_class_data',
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
            // Case 1: It's an attachment ID
            if (is_numeric($avatar_meta)) {
                $image_url = wp_get_attachment_image_url($avatar_meta, 'full');
                if ($image_url) {
                    return $image_url;
                }
            }
            // Case 2: It's already a full URL
            if (is_string($avatar_meta) && filter_var($avatar_meta, FILTER_VALIDATE_URL)) {
                return $avatar_meta;
            }
            // Case 3: It might be a relative URL (e.g., /wp-content/...)
            if (is_string($avatar_meta) && strpos($avatar_meta, '/') === 0) {
                return site_url($avatar_meta);
            }
        }
        // Fallback to the default WordPress avatar URL
        return get_avatar_url($user_id);
    }
}

// Central function to fetch class data
if (!function_exists('fetch_class_data_from_db')) {
    function fetch_class_data_from_db() {
        global $wpdb;
        $class_table = $wpdb->prefix . 'smgt_class';
        $usermeta_table = $wpdb->prefix . 'usermeta';

        if ($wpdb->get_var("SHOW TABLES LIKE '$class_table'") != $class_table) {
            return []; // Return empty if table doesn't exist
        }

        $classes_results = $wpdb->get_results("SELECT * FROM $class_table");
        $classes_data = array();

        foreach($classes_results as $class) {
            $student_count = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM $usermeta_table WHERE meta_key = 'class_name' AND meta_value = %s", $class->class_name
            ));

            $classes_data[] = array(
                'id' => (string)$class->class_id,
                'class_name' => $class->class_name,
                'class_numeric' => $class->class_numeric,
                'class_section' => maybe_unserialize($class->section_name),
                'class_capacity' => $class->class_capacity,
                'student_count' => (int)$student_count,
            );
        }
        return $classes_data;
    }
}

// Callback for GET /classes
if (!function_exists('get_all_classes_data')) {
    function get_all_classes_data($request) {
        return new WP_REST_Response(fetch_class_data_from_db(), 200);
    }
}

// Callback function for main data sync GET /data
if (!function_exists('sync_app_data')) {
    function sync_app_data($request) {
        $response_data = array(
            'students' => array(),
            'teachers' => array(),
            'classes'  => array(),
        );

        // Fetch Students
        $student_users = get_users(array('role' => 'student'));
        foreach ($student_users as $user) {
            $response_data['students'][] = array(
                'studentId'     => (string)$user->ID,
                'studentName'   => $user->display_name,
                'class'         => get_user_meta($user->ID, 'class_name', true),
                'section'       => get_user_meta($user->ID, 'class_section', true),
                'rollNumber'    => get_user_meta($user->ID, 'roll_id', true),
                'contactNumber' => get_user_meta($user->ID, 'mobile', true) ?: get_user_meta($user->ID, 'phone', true),
                'profilePhotoUrl' => get_custom_user_photo_url($user->ID),
            );
        }

        // Fetch Teachers
        $teacher_users = get_users(array('role' => 'teacher'));
        foreach ($teacher_users as $user) {
            $response_data['teachers'][] = array(
                'id'    => (string)$user->ID,
                'name'  => $user->display_name,
                'role'  => 'Teacher',
                'email' => $user->user_email,
                'phone' => get_user_meta($user->ID, 'mobile', true) ?: get_user_meta($user->ID, 'phone', true),
                'profilePhotoUrl' => get_custom_user_photo_url($user->ID),
            );
        }

        // Fetch Classes
        $response_data['classes']  = fetch_class_data_from_db();

        return new WP_REST_Response($response_data, 200);
    }
}

// Callback function for POST /attendance
if (!function_exists('receive_attendance_data')) {
    function receive_attendance_data($request) {
        global $wpdb;
        $params = $request->get_json_params();
        $attendance_table = $wpdb->prefix . 'smgt_attendence';

        // Handle Students
        if (isset($params['students']) && is_array($params['students'])) {
            foreach ($params['students'] as $student_record) {
                $user_id = (int)$student_record['id'];
                $attendance_date = (new DateTime($student_record['timestamp']))->format('Y-m-d');

                $existing_record = $wpdb->get_row($wpdb->prepare(
                    "SELECT attend_id FROM $attendance_table WHERE user_id = %d AND attendence_date = %s AND role_name = 'student'",
                    $user_id,
                    $attendance_date
                ));

                $data = array(
                    'user_id' => $user_id,
                    'attendence_date' => $attendance_date,
                    'status' => 'Present',
                    'attendence_by' => 1,
                    'role_name' => 'student',
                    'comment' => 'Present via QR Scan'
                );

                if ($existing_record) {
                    $wpdb->update($attendance_table, $data, array('attend_id' => $existing_record->attend_id));
                } else {
                    $wpdb->insert($attendance_table, $data);
                }
            }
        }

        // Handle Teachers
        if (isset($params['teachers']) && is_array($params['teachers'])) {
            foreach ($params['teachers'] as $teacher_record) {
                $user_id = (int)$teacher_record['teacherId'];
                $attendance_date = $teacher_record['date'];

                $existing_record = $wpdb->get_row($wpdb->prepare(
                    "SELECT attend_id FROM $attendance_table WHERE user_id = %d AND attendence_date = %s AND role_name = 'teacher'",
                    $user_id,
                    $attendance_date
                ));

                $data = array(
                    'user_id' => $user_id,
                    'attendence_date' => $attendance_date,
                    'status' => $teacher_record['status'],
                    'comment' => $teacher_record['comment'],
                    'attendence_by' => 1,
                    'role_name' => 'teacher'
                );

                if ($existing_record) {
                    $wpdb->update($attendance_table, $data, array('attend_id' => $existing_record->attend_id));
                } else {
                    $wpdb->insert($attendance_table, $data);
                }
            }
        }

        return new WP_REST_Response(array('success' => true, 'message' => 'Attendance recorded successfully.'), 200);
    }
}


// Callback for POST /classes
if (!function_exists('add_new_class_data')) {
    function add_new_class_data($request) {
        global $wpdb;
        $params = $request->get_json_params();
        $class_table = $wpdb->prefix . 'smgt_class';

        $data_to_insert = array(
            'class_name' => sanitize_text_field($params['class_name']),
            'class_numeric' => intval($params['class_numeric']),
            'section_name' => serialize($params['class_section']), // Serialize array for storage
            'class_capacity' => intval($params['class_capacity']),
        );

        $result = $wpdb->insert($class_table, $data_to_insert);

        if ($result === false) {
            return new WP_Error('db_error', 'Could not add class to the database.', array('status' => 500));
        }

        return new WP_REST_Response(array('success' => true, 'message' => 'Class added successfully.'), 201);
    }
}

// Callback for DELETE /classes/{id}
if (!function_exists('delete_class_data')) {
    function delete_class_data($request) {
        global $wpdb;
        $class_id = (int) $request['id'];
        $class_table = $wpdb->prefix . 'smgt_class';

        $result = $wpdb->delete($class_table, array('class_id' => $class_id), array('%d'));

        if ($result === false) {
             return new WP_Error('db_error', 'Could not delete class from the database.', array('status' => 500));
        }
        if ($result === 0) {
            return new WP_Error('not_found', 'Class with the specified ID was not found.', array('status' => 404));
        }

        return new WP_REST_Response(array('success' => true, 'message' => 'Class deleted successfully.'), 200);
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

interface SettingsProps {
    onSaveKey: (key: string) => void;
    onLogout?: () => void;
    secretKey?: string | null;
    initialSetup?: boolean;
    currentUser: Omit<User, 'password'>;
}

const WordPressPluginCode = ({ name, code, version }: { name: string, code: string, version: string }) => {
    const [copyText, setCopyText] = useState('Copy Code');

    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopyText('Copied!');
            setTimeout(() => setCopyText('Copy Code'), 2000);
        });
    };

    const handleDownload = () => {
        const blob = new Blob([code], { type: 'text/php' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'custom-data-sync.php';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 space-y-6">
            <div className="border-b border-slate-300/50 dark:border-slate-700/50 pb-3 flex flex-col sm:flex-row justify-between items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <ClipboardIcon className="w-5 h-5"/> {name} (v{version})
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCopy}
                        className="inline-flex items-center gap-2 px-3 py-1 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-lg shadow-sm text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-slate-700/70 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                    >
                        <ClipboardIcon className="w-4 h-4"/>
                        {copyText}
                    </button>
                    <button
                        onClick={handleDownload}
                        className="inline-flex items-center gap-2 px-3 py-1 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-purple-600 hover:bg-purple-700 transition-all duration-300 transform hover:scale-105"
                    >
                        <DownloadIcon className="w-4 h-4"/>
                        Download File
                    </button>
                </div>
            </div>
            <div className="bg-blue-100/80 dark:bg-blue-900/40 border-l-4 border-blue-500 text-blue-800 dark:text-blue-200 p-4 rounded-lg" role="alert">
                <p className="font-bold">How to Install & Set Your Secret Key</p>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                    <li><strong>Create Plugin File:</strong> Download the plugin file or copy the PHP code below and save it in a new file named <code>custom-data-sync.php</code>.</li>
                    <li><strong>Upload Plugin:</strong> In your WordPress dashboard, go to <strong>Plugins → Add New → Upload Plugin</strong>, and upload the file.</li>
                    <li><strong>Activate:</strong> Activate the "Custom Data Sync for QR Attendance App" plugin from your plugins list.</li>
                    <li><strong>Go to Settings:</strong> Navigate to <strong>Settings → QR App Sync</strong> in the left-hand menu.</li>
                    <li><strong>Save Your Key:</strong> Enter the exact same Secret API Key that you use in this application into the "Secret Key" field and click "Save Settings".</li>
                </ol>
            </div>
            <pre className="bg-slate-900 text-white p-4 rounded-xl text-sm overflow-x-auto max-h-96">
                <code>
                    {code}
                </code>
            </pre>
        </div>
    );
};

const Settings: React.FC<SettingsProps> = ({ onSaveKey, onLogout, secretKey: initialKey, initialSetup = false, currentUser }) => {
    const [secretKey, setSecretKey] = useState(initialKey || '');
    const [isSaving, setIsSaving] = useState(false);
    
    const [users, setUsers] = useState<Omit<User, 'password'>[]>([]);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [isUsersLoading, setIsUsersLoading] = useState(false);
    const [userError, setUserError] = useState<string | null>(null);
    const [userMessage, setUserMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
        setUserMessage(null);
        if (!newUserEmail || !newUserPassword) {
            setUserError('Email and password are required.');
            return;
        }
        try {
            await addUser({ email: newUserEmail, password: newUserPassword, role: 'user' });
            setUserMessage({ type: 'success', text: `User ${newUserEmail} added successfully.` });
            setNewUserEmail('');
            setNewUserPassword('');
            await fetchUsers();
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to add user.';
            setUserError(msg);
        }
        setTimeout(() => setUserMessage(null), 4000);
    };

    const handleDeleteUser = async (email: string) => {
        if (window.confirm(`Are you sure you want to delete user ${email}?`)) {
            setUserMessage(null);
            try {
                await deleteUser(email);
                setUserMessage({ type: 'success', text: `User ${email} has been deleted.` });
                await fetchUsers();
            } catch (error) {
                const msg = error instanceof Error ? error.message : 'Failed to delete user.';
                setUserMessage({ type: 'error', text: msg });
            }
            setTimeout(() => setUserMessage(null), 4000);
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
    
    const nameMatch = PLUGIN_CODE.match(/Plugin Name:\\s*(.*)/);
    const versionMatch = PLUGIN_CODE.match(/Version:\\s*([0-9.]+)/);
    const pluginInfo = {
        name: nameMatch ? nameMatch[1].trim() : 'WordPress Plugin',
        code: PLUGIN_CODE,
        version: versionMatch ? versionMatch[1].trim() : 'N/A'
    };

    return (
        <div className="space-y-8">
            <div className="p-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 space-y-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 border-b border-slate-300/50 dark:border-slate-700/50 pb-3">{initialSetup ? 'Initial API Key Setup' : 'API Key Settings'}</h3>
                {initialSetup && (
                    <div className="bg-blue-100/80 dark:bg-blue-900/40 border-l-4 border-blue-500 text-blue-700 dark:text-blue-200 p-4 rounded-lg" role="alert">
                        <p className="font-bold">Welcome!</p>
                        <p>Please enter the Secret API Key from your WordPress plugin to connect this device to the server. You can find instructions for the plugin below.</p>
                    </div>
                )}
                <div className="space-y-2">
                    <label htmlFor="secret-key" className="block text-sm font-medium text-slate-700 dark:text-slate-200">Secret API Key</label>
                    <div className="flex gap-4">
                        <input
                            type="password"
                            id="secret-key"
                            value={secretKey}
                            onChange={(e) => setSecretKey(e.target.value)}
                            className="flex-grow shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 rounded-xl"
                            placeholder="Enter your secret key"
                        />
                         <button
                            onClick={handleSave}
                            disabled={isSaving || !secretKey.trim()}
                            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-purple-400 disabled:cursor-wait transition-all duration-300 transform hover:scale-105"
                        >
                            {isSaving ? <><SpinnerIcon className="w-5 h-5 mr-2" /> Saving...</> : 'Save Key'}
                        </button>
                    </div>
                    <div className="flex items-start gap-2 pt-2">
                        <InformationCircleIcon className="w-5 h-5 text-slate-400 dark:text-slate-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                           The API key is stored locally on this device's browser. You will need to enter it again if you use a different device or clear your browser data.
                        </p>
                    </div>
                </div>
                 {!initialSetup && onLogout && (
                     <div className="border-t border-slate-300/50 dark:border-slate-700/50 pt-6">
                        <button
                            onClick={onLogout}
                            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-red-300 dark:border-red-600 text-sm font-medium rounded-xl shadow-sm text-red-700 dark:text-red-400 bg-white dark:bg-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                        >
                           <LogoutIcon className="w-5 h-5 mr-2" /> Log Out
                        </button>
                     </div>
                )}
            </div>

            <WordPressPluginCode name={pluginInfo.name} code={pluginInfo.code} version={pluginInfo.version} />

            {currentUser.role === 'superuser' && (
                 <div className="p-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 space-y-6">
                     <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 border-b border-slate-300/50 dark:border-slate-700/50 pb-3 flex items-center gap-2"><UsersIcon className="w-5 h-5"/> User Management</h3>
                     {userMessage && (
                        <div className={`p-3 rounded-lg text-sm ${userMessage.type === 'success' ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200'}`}>
                            {userMessage.text}
                        </div>
                     )}
                     <form onSubmit={handleAddUser} className="space-y-4 sm:flex sm:items-end sm:gap-4">
                        <div className="flex-grow">
                             <label htmlFor="new-user-email" className="block text-sm font-medium text-slate-700 dark:text-slate-200">New User Email</label>
                             <input type="email" id="new-user-email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required className="mt-1 shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 rounded-xl" />
                        </div>
                        <div className="flex-grow">
                             <label htmlFor="new-user-password" className="block text-sm font-medium text-slate-700 dark:text-slate-200">Password</label>
                             <input type="password" id="new-user-password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} required className="mt-1 shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 rounded-xl" />
                        </div>
                         <button type="submit" className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">Add User</button>
                     </form>
                     {userError && <p className="text-sm text-red-600 dark:text-red-400">{userError}</p>}
                    
                    <div className="border-t border-slate-300/50 dark:border-slate-700/50 pt-4">
                        <h4 className="font-semibold text-md text-slate-700 dark:text-slate-200 mb-2">Existing Users</h4>
                        {isUsersLoading ? <SpinnerIcon className="w-6 h-6 text-purple-500" /> : (
                            <ul className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                                {users.map(user => (
                                     <li key={user.email} className="py-3 flex justify-between items-center">
                                         <div>
                                            <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{user.email}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user.role}</p>
                                         </div>
                                         <button onClick={() => handleDeleteUser(user.email)} className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">Delete</button>
                                     </li>
                                ))}
                                {users.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No standard users found.</p>}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;