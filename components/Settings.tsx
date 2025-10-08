import React, { useState, useEffect } from 'react';
import { getUsers, addUser, deleteUser } from '../api';
import type { User } from '../types';
import { LogoutIcon, SpinnerIcon, UsersIcon, ClipboardIcon, CloudDownloadIcon, ExclamationCircleIcon, CheckCircleIcon } from './icons';

interface SettingsProps {
    onSaveKey: (key: string) => void;
    onLogout?: () => void;
    secretKey?: string;
    initialSetup?: boolean;
    currentUser: Omit<User, 'password'>;
}

const PLUGIN_CODE = `<?php
/*
Plugin Name: Custom Data Sync for QR Attendance App
Description: Provides a secure REST API endpoint to sync student, teacher, and class data for the QR attendance app.
Version: 2.0
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
    register_rest_route('custom-sync/v1', '/classes/(?P<id>\\d+)', array(
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
            if (is_numeric($avatar_meta)) {
                $image_url = wp_get_attachment_image_url($avatar_meta, 'full');
                return $image_url ?: get_avatar_url($user_id);
            }
            if (filter_var($avatar_meta, FILTER_VALIDATE_URL)) {
                return $avatar_meta;
            }
        }
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
                'class_numeric' => $class->class_num_value,
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
                'contactNumber' => get_user_meta($user->ID, 'mobile', true),
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
                'phone' => get_user_meta($user->ID, 'mobile', true),
                'profilePhotoUrl' => get_custom_user_photo_url($user->ID),
            );
        }

        // Fetch Classes
        $response_data['classes'] = fetch_class_data_from_db();

        return new WP_REST_Response($response_data, 200);
    }
}

// Callback function for POST /attendance
if (!function_exists('receive_attendance_data')) {
    function receive_attendance_data($request) {
        global $wpdb;
        $params = $request->get_json_params();
        $attendance_table = $wpdb->prefix . 'smgt_attendence';

        if (isset($params['students']) && is_array($params['students'])) {
            foreach ($params['students'] as $student_record) {
                 $wpdb->insert($attendance_table, array(
                    'user_id' => $student_record['id'],
                    'attendence_date' => (new DateTime($student_record['timestamp']))->format('Y-m-d'),
                    'status' => 'Present',
                    'attendence_by' => 1, // Default to admin user
                    'role_name' => 'student'
                ));
            }
        }
        
        if (isset($params['teachers']) && is_array($params['teachers'])) {
            foreach ($params['teachers'] as $teacher_record) {
                $wpdb->insert($attendance_table, array(
                    'user_id' => $teacher_record['teacherId'],
                    'attendence_date' => $teacher_record['date'],
                    'status' => $teacher_record['status'],
                    'comment' => $teacher_record['comment'],
                    'attendence_by' => 1, // Default to admin user
                    'role_name' => 'teacher'
                ));
            }
        }

        return new WP_REST_Response(array('success' => true, 'message' => 'Attendance recorded.'), 200);
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
            'class_num_value' => intval($params['class_numeric']),
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

const HTACCESS_CODE = `<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /
RewriteRule ^index\\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_FILENAME} !-l
RewriteRule . /index.html [L]
</IfModule>`;


const WordPressPluginCode = ({ name, code, version }: { name: string, code: string, version: string }) => {
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
                    <ClipboardIcon className="w-5 h-5"/> {name} (v{version})
                </h3>
                <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-2 px-3 py-1 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 transition-all duration-150 ease-in-out"
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
            <pre className="bg-slate-800 text-white p-4 rounded-md text-sm overflow-x-auto">
                <code>
                    {code}
                </code>
            </pre>
        </div>
    );
};

const HtaccessCode = ({ code }: { code: string }) => {
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
                    className="inline-flex items-center gap-2 px-3 py-1 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 transition-all duration-150 ease-in-out"
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
            <pre className="bg-slate-800 text-white p-4 rounded-md text-sm overflow-x-auto">
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
    
    // User management state
    const [users, setUsers] = useState<Omit<User, 'password'>[]>([]);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [isUsersLoading, setIsUsersLoading] = useState(false);
    const [userError, setUserError] = useState<string | null>(null);
    const [userMessage, setUserMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    
    // Parse plugin info from constant
    const versionMatch = PLUGIN_CODE.match(/Version:\\s*([0-9.]+)/);
    const nameMatch = PLUGIN_CODE.match(/Plugin Name:\\s*(.*)/);
    const pluginInfo = {
        name: nameMatch ? nameMatch[1] : 'WordPress Plugin',
        code: PLUGIN_CODE,
        version: versionMatch ? versionMatch[1] : 'N/A',
    };

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
                     {userMessage && (
                        <div className={`p-3 rounded-md text-sm ${userMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {userMessage.text}
                        </div>
                     )}
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
                     {userError && <p className="text-sm text-red-600">{userError}</p>}
                    
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
                    <WordPressPluginCode name={pluginInfo.name} code={pluginInfo.code} version={pluginInfo.version} />
                    <HtaccessCode code={HTACCESS_CODE} />
                </>
            )}
        </div>
    );
};

export default Settings;