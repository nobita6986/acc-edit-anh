
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as authService from '../services/authService';
import type { User } from '../services/authService';
import { LoaderIcon, CopyIcon, SparklesIcon, PowerIcon, CheckIcon } from '../components/Icons';

const AdminPanel: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // State for creating a new user
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [createError, setCreateError] = useState('');
    const [createSuccess, setCreateSuccess] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    
    // State for UI feedback
    const [copiedUsername, setCopiedUsername] = useState<string | null>(null);
    const [resettingUser, setResettingUser] = useState<string | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const userList = await authService.getUsers();
            // Sort by passwordChangedAt (creation time) descending
            userList.sort((a, b) => (b.passwordChangedAt || 0) - (a.passwordChangedAt || 0));
            setUsers(userList);
        } catch (err: any) {
            setError('Không thể tải danh sách người dùng.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCopy = (user: User) => {
        if (!user.password_plaintext) return;
        const credentialText = `Tài khoản: ${user.username}\nMật khẩu: ${user.password_plaintext}`;
        navigator.clipboard.writeText(credentialText);
        setCopiedUsername(user.username);
        setTimeout(() => {
            setCopiedUsername(null);
        }, 2000);
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError('');
        setCreateSuccess('');
        setIsCreating(true);

        try {
            const newUser = await authService.addUser(newUsername, newPassword);
            setUsers(prevUsers => [newUser, ...prevUsers]);
            setNewUsername('');
            setNewPassword('');
            setCreateSuccess(`Đã tạo thành công tài khoản: ${newUser.username}`);
        } catch (err: any) {
            setCreateError(err.message);
        } finally {
            setIsCreating(false);
        }
    };
    
    const handleResetDevice = async (username: string) => {
        if (!window.confirm(`Bạn có chắc muốn reset thiết bị cho người dùng '${username}' không? Họ sẽ có thể đăng nhập từ một máy tính mới.`)) {
            return;
        }
        setResettingUser(username);
        setError('');
        try {
            await authService.resetUserDevice(username);
            // Refresh the user list to show the updated status
            await fetchUsers();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setResettingUser(null);
        }
    };
    
    const filteredUsers = users.filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );


    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto"
        >
            <div className="text-center mb-10">
                <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 mb-2">
                    Quản lý Tài khoản Người dùng
                </h1>
                <p className="text-lg text-slate-400">
                    Thêm, cung cấp và quản lý thiết bị đăng nhập cho người dùng.
                </p>
            </div>
            
            {/* Create User Form */}
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl shadow-xl p-6 mb-8">
                <h2 className="text-2xl font-bold text-cyan-300 mb-4">Tạo tài khoản mới</h2>
                <form onSubmit={handleCreateUser} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="new-username" className="block text-sm font-medium text-slate-300 mb-2">Tên đăng nhập mới</label>
                            <input id="new-username" type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="ví dụ: user01" required
                            className="w-full bg-slate-800/70 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"/>
                        </div>
                         <div>
                            <label htmlFor="new-password" className="block text-sm font-medium text-slate-300 mb-2">Mật khẩu mới</label>
                            <input id="new-password" type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="ví dụ: pass123" required
                            className="w-full bg-slate-800/70 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"/>
                        </div>
                    </div>
                     {createError && <p className="text-red-400 text-sm text-center">{createError}</p>}
                     {createSuccess && <p className="text-green-400 text-sm text-center">{createSuccess}</p>}
                    <button type="submit" disabled={isCreating} className="w-full flex items-center justify-center bg-gradient-to-r from-sky-500 to-cyan-600 text-white font-bold py-3 px-6 rounded-lg hover:from-sky-600 hover:to-cyan-700 transition-all shadow-lg hover:shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-wait">
                        {isCreating ? <><LoaderIcon className="animate-spin mr-2" /> Đang tạo...</> : <><SparklesIcon className="mr-2" /> Tạo tài khoản</>}
                    </button>
                </form>
            </div>

            <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 rounded-xl shadow-2xl p-6">
                <div className="mb-4">
                    <input 
                        type="text"
                        placeholder="Tìm kiếm người dùng..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full max-w-sm bg-slate-800/70 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
                    />
                </div>
                 {error && <p className="text-red-400 text-center bg-red-900/50 p-3 rounded-lg mb-4">{error}</p>}

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <LoaderIcon className="w-8 h-8 animate-spin text-yellow-400"/>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left table-auto">
                            <thead className="bg-slate-900/70">
                                <tr>
                                    <th className="p-3 text-sm font-semibold text-yellow-300 rounded-l-lg w-[25%]">Tên đăng nhập</th>
                                    <th className="p-3 text-sm font-semibold text-yellow-300 w-[25%]">Mật khẩu</th>
                                    <th className="p-3 text-sm font-semibold text-yellow-300 text-center w-[20%]">Trạng thái thiết bị</th>
                                    <th className="p-3 text-sm font-semibold text-yellow-300 rounded-r-lg text-center w-[30%]">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(user => (
                                    <tr key={user.username} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/30">
                                        <td className="p-3 text-slate-200 font-mono align-middle truncate">{user.username}</td>
                                        <td className="p-3 text-slate-200 font-mono align-middle truncate">{user.password_plaintext}</td>
                                        <td className="p-3 text-center align-middle">
                                            {user.deviceId ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900 text-red-300" title={`Locked to device: ${user.deviceId}`}>
                                                    Đã khóa
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-300">
                                                    Chưa khóa
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 text-center align-middle">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => handleCopy(user)}
                                                    className={`flex items-center justify-center gap-2 text-sm font-medium py-2 px-3 rounded-md transition-all duration-200 w-32
                                                        ${copiedUsername === user.username
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-slate-700 hover:bg-cyan-600/80 text-white'
                                                    }`}
                                                >
                                                    {copiedUsername === user.username ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                                                    {copiedUsername === user.username ? 'Đã sao chép!' : 'Sao chép TK'}
                                                </button>
                                                <button
                                                    onClick={() => handleResetDevice(user.username)}
                                                    disabled={!user.deviceId || resettingUser === user.username}
                                                    className="flex items-center justify-center gap-2 text-sm font-medium py-2 px-3 rounded-md transition-all duration-200 w-32 bg-red-800/80 text-white hover:bg-red-700 disabled:bg-slate-600/50 disabled:text-slate-400 disabled:cursor-not-allowed"
                                                >
                                                    {resettingUser === user.username ? <LoaderIcon className="w-4 h-4 animate-spin" /> : <PowerIcon className="w-4 h-4" />}
                                                    {resettingUser === user.username ? 'Đang reset...' : 'Reset Thiết bị'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default AdminPanel;
