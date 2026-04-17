import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserIcon, Shield, Edit3, Check, Loader2, ArrowLeft, PlusCircle, Table as TableIcon, PieChart, MessageSquare, Activity, Settings2, Plus, Trash2, Edit2, AlertTriangle, X } from 'lucide-react';
import { User } from '../../types';
import { api } from '../../lib/api';
import { hasModulePerm } from '../../lib/permissions';

interface UserAccessPanelProps {
  usersList: User[];
  onUpdate?: () => void;
  user: User;
}

type PermsObj = { create: boolean, read: boolean, edit: boolean, delete: boolean };

const ColoredToggle = ({ checked, onChange, color, isDarkMode }: { checked: boolean, onChange: () => void, color: 'blue' | 'green' | 'orange' | 'red', isDarkMode?: boolean }) => {
  const colors = {
    blue: { 
      bg: isDarkMode ? 'bg-[#191d30]' : 'bg-[#f0f4ff]', border: isDarkMode ? 'border-[#262c43]' : 'border-[#dbeafe]', 
      activeBg: isDarkMode ? 'bg-[#1e233d]' : 'bg-[#3b82f6]', activeBorder: isDarkMode ? 'border-[#2e3656]' : 'border-[#2563eb]',
      handle: isDarkMode ? 'bg-[#2b314d]' : 'bg-white', activeHandle: isDarkMode ? 'bg-[#404ba1]' : 'bg-white', 
      dot: isDarkMode ? 'bg-[#5e6cf6]' : 'bg-[#3b82f6]', activeDot: isDarkMode ? 'bg-[#7384fa]' : 'bg-[#2563eb]'
    },
    green: { 
      bg: isDarkMode ? 'bg-[#182a25]' : 'bg-[#f0fff4]', border: isDarkMode ? 'border-[#1e342f]' : 'border-[#dcfce7]', 
      activeBg: isDarkMode ? 'bg-[#1b342e]' : 'bg-[#22c55e]', activeBorder: isDarkMode ? 'border-[#23423a]' : 'border-[#16a34a]',
      handle: isDarkMode ? 'bg-[#203a33]' : 'bg-white', activeHandle: isDarkMode ? 'bg-[#0b644b]' : 'bg-white', 
      dot: isDarkMode ? 'bg-[#139873]' : 'bg-[#22c55e]', activeDot: isDarkMode ? 'bg-[#31cf9e]' : 'bg-[#16a34a]'
    },
    orange: { 
      bg: isDarkMode ? 'bg-[#2b2216]' : 'bg-[#fffaf0]', border: isDarkMode ? 'border-[#382d1f]' : 'border-[#ffedd5]', 
      activeBg: isDarkMode ? 'bg-[#3b2d1c]' : 'bg-[#f59e0b]', activeBorder: isDarkMode ? 'border-[#4a3a25]' : 'border-[#d97706]',
      handle: isDarkMode ? 'bg-[#41311b]' : 'bg-white', activeHandle: isDarkMode ? 'bg-[#a37016]' : 'bg-white', 
      dot: isDarkMode ? 'bg-[#c98e21]' : 'bg-[#f59e0b]', activeDot: isDarkMode ? 'bg-[#f7b945]' : 'bg-[#d97706]'
    },
    red: { 
      bg: isDarkMode ? 'bg-[#2e1c20]' : 'bg-[#fff5f5]', border: isDarkMode ? 'border-[#3f262c]' : 'border-[#fee2e2]', 
      activeBg: isDarkMode ? 'bg-[#391e25]' : 'bg-[#ef4444]', activeBorder: isDarkMode ? 'border-[#4d2932]' : 'border-[#dc2626]',
      handle: isDarkMode ? 'bg-[#4a242d]' : 'bg-white', activeHandle: isDarkMode ? 'bg-[#a12a45]' : 'bg-white', 
      dot: isDarkMode ? 'bg-[#c73d5c]' : 'bg-[#ef4444]', activeDot: isDarkMode ? 'bg-[#f85c7c]' : 'border-[#dc2626]'
    }
  };
  const theme = colors[color];

  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); onChange(); }}
      className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-xl border ${checked ? theme.activeBorder : theme.border} transition-colors duration-200 ease-in-out focus:outline-none ${checked ? theme.activeBg : theme.bg}`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`pointer-events-none mt-1 h-5 w-6 transform rounded-lg shadow-sm flex items-center justify-center transition-colors ${checked ? (isDarkMode ? theme.activeHandle : 'bg-white shadow-md') : (isDarkMode ? theme.handle : 'bg-white shadow-sm')}`}
        style={{ x: checked ? 25 : 5, borderRadius: '8px' }}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${checked ? (isDarkMode ? theme.activeDot : theme.activeDot) : (isDarkMode ? theme.dot : 'bg-gray-300')} ${checked && isDarkMode ? 'shadow-[0_0_6px_rgba(255,255,255,0.4)]' : ''}`} />
      </motion.span>
    </button>
  );
};

export default function UserAccessPanel({ usersList, onUpdate, user, isDarkMode }: UserAccessPanelProps & { isDarkMode?: boolean }) {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // User CRUD states
  const [userForm, setUserForm] = useState<{ isOpen: boolean; mode: 'add' | 'edit'; user: Partial<User> }>({ isOpen: false, mode: 'add', user: {} });
  const [isDeletingUser, setIsDeletingUser] = useState<User | null>(null);
  const [crudLoading, setCrudLoading] = useState(false);

  const [perms, setPerms] = useState<Record<string, PermsObj>>({
    entry: { create: false, read: false, edit: false, delete: false },
    records: { create: false, read: false, edit: false, delete: false },
    report: { create: false, read: false, edit: false, delete: false },
    comments: { create: false, read: false, edit: false, delete: false },
    access: { create: false, read: false, edit: false, delete: false }
  });

  const [loading, setLoading] = useState(false);

  const handleSaveUser = async () => {
    if (!userForm.user.userId || !userForm.user.fullName || !userForm.user.role) {
      alert('Please fill out all fields.');
      return;
    }
    setCrudLoading(true);
    try {
      let res;
      if (userForm.mode === 'add') {
        const userData = {
          ...userForm.user,
          creatorDate: new Date().toISOString(),
          creatorName: user?.fullName || 'System',
          creatorUserId: user?.userId || 'system'
        };
        res = await api.addUser(userData as Omit<User, 'sl'>);
      } else {
        const updateData = {
          ...userForm.user,
          updatorDate: new Date().toISOString(),
          updatorName: user?.fullName || 'System',
          updatorUserId: user?.userId || 'system'
        };
        res = await api.updateUser(updateData as User);
      }
      if (res.success) {
        if (onUpdate) onUpdate();
        setUserForm({ isOpen: false, mode: 'add', user: {} });
      } else {
        alert('Failed to save user: ' + res.error);
      }
    } catch (err) {
      alert('Network error occurred.');
    } finally {
      setCrudLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!isDeletingUser) return;
    setCrudLoading(true);
    try {
      const res = await api.deleteUser(isDeletingUser.userId);
      if (res.success) {
        if (onUpdate) onUpdate();
        setIsDeletingUser(null);
      } else {
        alert('Failed to delete user: ' + res.error);
      }
    } catch (err) {
      alert('Network error occurred.');
    } finally {
      setCrudLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setPerms({
      entry: {
        create: hasModulePerm(user, 'entry', 'create'),
        read: hasModulePerm(user, 'entry', 'read'),
        edit: false,
        delete: false
      },
      records: {
        create: hasModulePerm(user, 'records', 'create'),
        read: hasModulePerm(user, 'records', 'read'),
        edit: hasModulePerm(user, 'records', 'edit'),
        delete: hasModulePerm(user, 'records', 'delete')
      },
      report: {
        create: false,
        read: hasModulePerm(user, 'report', 'read'),
        edit: false,
        delete: false
      },
      comments: {
        create: hasModulePerm(user, 'comments', 'create'),
        read: hasModulePerm(user, 'comments', 'read'),
        edit: hasModulePerm(user, 'comments', 'edit'),
        delete: hasModulePerm(user, 'comments', 'delete')
      },
      access: {
        create: false,
        read: hasModulePerm(user, 'access', 'read'),
        edit: hasModulePerm(user, 'access', 'edit'),
        delete: false
      }
    });
    setEditingUser(user);
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setLoading(true);
    
    const permStrings: string[] = [];
    Object.entries(perms).forEach(([mod, actions]) => {
      const typedActions = actions as PermsObj;
      if (typedActions.create) permStrings.push(`${mod}:create`);
      if (typedActions.read) permStrings.push(`${mod}:read`);
      if (typedActions.edit) permStrings.push(`${mod}:edit`);
      if (typedActions.delete) permStrings.push(`${mod}:delete`);
    });

    const permString = permStrings.join(', ');

    try {
        const res = await api.updateUserPermission(editingUser.userId, permString, {
          updatorDate: new Date().toISOString(),
          updatorName: user?.fullName || 'System',
          updatorUserId: user?.userId || 'system'
        });
        if (res.success) {
            alert('Permissions updated successfully!');
            if (onUpdate) onUpdate();
            setEditingUser(null);
        } else {
            alert('Failed to update: ' + res.error);
        }
    } catch (err) {
        alert('An error occurred while saving permissions.');
    } finally {
        setLoading(false);
    }
  };

  const modules = [
    { id: 'entry', title: 'ENTRY FORM', hex: '0x00', icon: PlusCircle },
    { id: 'records', title: 'DATA RECORDS', hex: '0x01', icon: TableIcon },
    { id: 'report', title: 'ANALYTICS', hex: '0x02', icon: PieChart },
    { id: 'comments', title: 'LOG COMMENTS', hex: '0x03', icon: MessageSquare },
    { id: 'access', title: 'SYS ACCESS', hex: '0x04', icon: Shield }
  ];

  return (
    <>
      <AnimatePresence mode="wait">
        {!editingUser ? (
        <motion.div
          key="users-list"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex flex-col gap-6"
        >
          <div className={`${isDarkMode ? 'bg-[#0d121c] border-[#1a2333]' : 'bg-white border-[#e1e8ed]'} p-[24px] rounded-[12px] border shadow-sm`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <Shield className="text-[#107c10]" size={24} />
                <div>
                  <h2 className={`text-[18px] font-bold ${isDarkMode ? 'text-[#e2e8f0]' : 'text-[#2c3e50]'}`}>Access Management</h2>
                  <p className={`text-[13px] ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}`}>Manage user privileges across the dashboard modules.</p>
                </div>
              </div>
              <button 
                onClick={() => setUserForm({ isOpen: true, mode: 'add', user: { role: 'User' } })}
                className="bg-[#107c10] text-white px-4 py-2 rounded-lg font-medium text-[14px] hover:bg-[#0c610c] transition-colors flex items-center justify-center gap-2 shrink-0"
              >
                <Plus size={16} />
                Add User
              </button>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden flex flex-col gap-3">
              {usersList.map((u, i) => (
                <div key={i} className={`p-4 rounded-xl border ${isDarkMode ? 'bg-[#0d121c] border-[#1a2333]' : 'bg-white border-[#e1e8ed]'} shadow-sm flex flex-col gap-2`}>
                  <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${isDarkMode ? 'bg-[#1a2333] text-[#34d399]' : 'bg-[#e3fcef] text-[#107c10]'}`}>
                          {u.fullName.charAt(0)}
                        </div>
                        <span className={`font-semibold ${isDarkMode ? 'text-[#e2e8f0]' : 'text-[#2c3e50]'}`}>{u.fullName}</span>
                      </div>
                      <span className={`px-2 py-1 rounded text-[10px] font-semibold border ${u.role === 'Admin' ? 'bg-[#fff1f0] text-[#cf1322] border-[#cf1322]/20' : 'bg-[#e6f7ff] text-[#096dd9] border-[#096dd9]/20'}`}>
                        {u.role}
                      </span>
                  </div>
                  <div className={`text-[12px] flex justify-between ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}`}>
                    <span>{u.userId}</span>
                    <span>{u.role === 'Admin' ? 'Full Access' : 'Custom'}</span>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <button onClick={() => setUserForm({ isOpen: true, mode: 'edit', user: u })} className={`p-2 rounded-md ${isDarkMode ? 'bg-[#1a2333] text-[#34d399]' : 'bg-[#e3fcef] text-[#107c10]'}`}><Edit2 size={16} /></button>
                    <button onClick={() => handleEdit(u)} className={`p-2 rounded-md ${isDarkMode ? 'bg-[#1a2333] text-[#3b82f6]' : 'bg-[#ebf5ff] text-[#3498db]'}`}><Settings2 size={16} /></button>
                    <button onClick={() => setIsDeletingUser(u)} disabled={u.userId === 'admin' || u.role === 'Admin'} className="p-2 text-[#e74c3c] rounded-md disabled:opacity-50"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto p-2">
              <table className="w-full border-collapse text-[14px] min-w-max">
                <thead>
                  <tr className={`${isDarkMode ? 'bg-[#1a2333] border-[#334155]' : 'bg-[#fafbfc] border-[#e1e8ed]'} border-y`}>
                    <th className={`text-left p-2 font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'} whitespace-nowrap`}>User</th>
                    <th className={`text-left p-2 font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'} whitespace-nowrap`}>Role</th>
                    <th className={`text-center p-2 font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'} whitespace-nowrap`}>Matrix</th>
                    <th className={`text-right p-2 font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'} whitespace-nowrap`}>Actions</th>
                    {user?.role === 'Admin' && (
                      <>
                        <th className={`text-left p-2 font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'} whitespace-nowrap`}>Creator Date</th>
                        <th className={`text-left p-2 font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'} whitespace-nowrap`}>Creator</th>
                        <th className={`text-left p-2 font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'} whitespace-nowrap`}>Creator ID</th>
                        <th className={`text-left p-2 font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'} whitespace-nowrap`}>Updator Date</th>
                        <th className={`text-left p-2 font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'} whitespace-nowrap`}>Updator</th>
                        <th className={`text-left p-2 font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'} whitespace-nowrap`}>Updator ID</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u, i) => (
                    <tr key={i} className={`${isDarkMode ? 'hover:bg-[#1a2333] border-[#1a2333]' : 'hover:bg-[#f4f7f6] border-[#e1e8ed]'} transition-colors border-b last:border-b-0 group`}>
                      <td className="p-2">
                        <div className="flex items-center gap-3 whitespace-nowrap">
                          <div className={`w-10 h-10 rounded-full ${isDarkMode ? 'bg-[#1e293b]' : 'bg-[#ebf5eb]'} flex items-center justify-center ${isDarkMode ? 'text-[#34d399]' : 'text-[#107c10]'}`}>
                            <UserIcon size={20} />
                          </div>
                          <div className="flex flex-col">
                            <span className={`font-bold ${isDarkMode ? 'text-[#e2e8f0]' : 'text-[#2c3e50]'}`}>{u.fullName}</span>
                            <span className={`text-[12px] ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}`}>ID: {u.userId}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <span className={`px-[10px] py-[4px] rounded-[6px] text-[12px] font-semibold border ${u.role === 'Admin' ? 'bg-[#fff1f0] text-[#cf1322] border-[#cf1322]/20' : 'bg-[#e6f7ff] text-[#096dd9] border-[#096dd9]/20'} whitespace-nowrap`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <button 
                          onClick={() => handleEdit(u)}
                          className={`bg-white border rounded-md px-3 py-1 text-[13px] font-medium flex items-center justify-center gap-2 transition-colors outline-none mx-auto whitespace-nowrap ${
                            isDarkMode 
                              ? 'bg-[#1e293b] border-[#334155] text-white hover:bg-[#334155] hover:border-[#4ade80]' 
                              : 'bg-white border-[#e1e8ed] text-[#2c3e50] hover:bg-[#f4f7f6] hover:text-[#107c10] hover:border-[#107c10]'
                          }`}
                          title="Manage Capabilities"
                        >
                          <Settings2 size={14} />
                          Matrix
                        </button>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center justify-end gap-2 text-right whitespace-nowrap">
                          <button 
                            onClick={() => setUserForm({ isOpen: true, mode: 'edit', user: u })}
                            className="p-1.5 text-[#3498db] hover:bg-[#ebf5ff] rounded-md transition-colors"
                            title="Edit User Info"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => setIsDeletingUser(u)}
                            disabled={u.userId === 'admin' || u.role === 'Admin'}
                            className="p-1.5 text-[#e74c3c] hover:bg-[#fdefed] rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete User"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                      {user?.role === 'Admin' && (
                        <>
                          <td className={`p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} whitespace-nowrap`}>{u.creatorDate ? new Date(u.creatorDate).toLocaleDateString() : '-'}</td>
                          <td className={`p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} whitespace-nowrap`}>{u.creatorName || '-'}</td>
                          <td className={`p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} whitespace-nowrap`}>{u.creatorUserId || '-'}</td>
                          <td className={`p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} whitespace-nowrap`}>{u.updatorDate ? new Date(u.updatorDate).toLocaleDateString() : '-'}</td>
                          <td className={`p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} whitespace-nowrap`}>{u.updatorName || '-'}</td>
                          <td className={`p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} whitespace-nowrap`}>{u.updatorUserId || '-'}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="edit-permissions"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="flex flex-col gap-6 font-sans"
        >
          {/* Header controls outside the cyber UI */}
          <div className={`${isDarkMode ? 'bg-[#0d121c] border-[#1a2333]' : 'bg-white border-[#e1e8ed]'} p-4 md:p-6 rounded-[16px] border shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors duration-300`}>
            <div className="flex items-center gap-5">
              <button 
                onClick={() => setEditingUser(null)}
                className={`w-12 h-12 flex items-center justify-center transition-all duration-200 rounded-xl border ${
                  isDarkMode 
                    ? 'text-[#94a3b8] bg-[#1a2333] border-[#334155] hover:bg-[#334155] hover:text-white' 
                    : 'text-[#7f8c8d] bg-[#f4f7f6] border-[#e1e8ed] hover:bg-[#e1e8ed] hover:text-[#2c3e50]'
                }`}
                title="Back to User List"
              >
                <ArrowLeft size={24} />
              </button>
              <div className="flex flex-col">
                <h2 className={`text-[20px] md:text-[22px] font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-[#2c3e50]'}`}>Manage Capabilities</h2>
                <p className={`text-[13px] md:text-[14px] ${isDarkMode ? 'text-[#94a3b8]' : 'text-[#7f8c8d]'} flex flex-wrap items-center gap-1.5`}>
                  Configuring matrix for 
                  <span className={`font-bold px-2 py-0.5 rounded-md ${isDarkMode ? 'bg-[#064e3b] text-[#4ade80]' : 'bg-[#ebf5eb] text-[#107c10]'}`}>
                    {editingUser.fullName}
                  </span>
                </p>
              </div>
            </div>
            <button 
              onClick={handleSave}
              disabled={loading}
              className={`px-8 py-3 rounded-xl font-bold text-[15px] shadow-lg flex items-center justify-center gap-3 transition-all duration-300 transform active:scale-95 ${
                isDarkMode 
                  ? 'bg-[#4ade80] text-[#064e3b] hover:bg-[#22c55e] hover:shadow-[#4ade80]/10' 
                  : 'bg-[#107c10] text-white hover:bg-[#0c610c]'
              } disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto`}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Check size={20} />}
              Save Configuration
            </button>
          </div>

          <div className={`w-full ${isDarkMode ? 'bg-[#0d121c] border-[#1a2333]' : 'bg-white border-[#e1e8ed]'} rounded-xl overflow-hidden shadow-2xl border select-none transition-colors duration-300`}>
            {/* Tech Header */}
            <div className={`hidden md:grid md:grid-cols-12 ${isDarkMode ? 'bg-[#0a0e17] border-b border-[#1a2333]' : 'bg-[#fafbfc] border-b border-[#e1e8ed]'} p-2 items-center`}>
              <div className={`md:col-span-5 flex items-center gap-2 text-xs font-mono tracking-widest uppercase ${isDarkMode ? 'text-[#4f6485]' : 'text-[#7f8c8d]'}`}>
                <Activity size={14} className="text-[#3b82f6]" />
                Module_Identifier
              </div>
              <div className={`md:col-span-7 flex items-center justify-center gap-2 text-xs font-mono tracking-widest uppercase md:border-l ${isDarkMode ? 'text-[#4f6485] border-[#1a2333]' : 'text-[#7f8c8d] border-[#e1e8ed]'} pl-4`}>
                <Settings2 size={14} className={isDarkMode ? 'text-[#8b9bb4]' : 'text-[#7f8c8d]'} />
                Capability_Configuration
              </div>
            </div>

            <div className="flex flex-col">
              {modules.map((mod, idx) => {
                const Icon = mod.icon;
                const mPerms = perms[mod.id];
                
                return (
                  <div key={mod.id} className={`flex flex-col md:grid md:grid-cols-12 border-b last:border-0 transition-colors ${isDarkMode ? 'border-[#131b28] hover:bg-[#111723]' : 'border-[#f1f5f9] hover:bg-[#f8fafc]'}`}>
                    {/* Left Column - Module Info */}
                    <div className="md:col-span-12 lg:col-span-5 p-2 flex items-center gap-4">
                      <div className={`relative w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-[#131926] border-[#1d273a]' : 'bg-[#f4f7f6] border-[#e1e8ed]'}`}>
                        <span className={`absolute -top-2 left-2 text-[10px] font-mono px-1 font-bold ${isDarkMode ? 'bg-[#0d121c] text-[#eab308]' : 'bg-white text-[#d97706]'}`}>
                          0{idx + 1}
                        </span>
                        <Icon size={20} className={isDarkMode ? 'text-[#64748b]' : 'text-[#107c10]'} />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className={`font-extrabold tracking-widest text-[14px] uppercase ${isDarkMode ? 'text-white' : 'text-[#2c3e50]'}`}>{mod.title}</span>
                          <div className={`hidden md:block w-1.5 h-1.5 rounded-full ${isDarkMode ? 'bg-[#3b82f6]/50' : 'bg-[#107c10]/30'}`}></div>
                        </div>
                        <div className={`flex items-center gap-2 mt-1 font-mono text-[10px] uppercase ${isDarkMode ? 'text-[#4f6485]' : 'text-[#7f8c8d]'}`}>
                          <span>ADDR: {mod.hex}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Capabilities */}
                    <div className={`md:col-span-12 lg:col-span-7 border-t lg:border-t-0 lg:border-l p-2 flex flex-wrap items-center justify-around gap-y-4 ${isDarkMode ? 'border-[#131b28] bg-[#0a0e17] lg:bg-transparent' : 'border-[#f1f5f9] bg-[#fbfcfd] lg:bg-transparent'}`}>
                      {/* CREATE */}
                      <div className="flex flex-col items-center gap-3">
                        <span className={`font-mono text-[10px] font-bold tracking-widest uppercase ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}`}>Create</span>
                        <ColoredToggle 
                          color="blue" 
                          checked={mPerms.create} 
                          onChange={() => setPerms(p => ({ ...p, [mod.id]: { ...p[mod.id], create: !p[mod.id].create } }))} 
                          isDarkMode={isDarkMode}
                        />
                      </div>
                      
                      {/* READ */}
                      <div className="flex flex-col items-center gap-3">
                        <span className={`font-mono text-[10px] font-bold tracking-widest uppercase ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}`}>Read</span>
                        <ColoredToggle 
                          color="green" 
                          checked={mPerms.read} 
                          onChange={() => setPerms(p => ({ ...p, [mod.id]: { ...p[mod.id], read: !p[mod.id].read } }))} 
                          isDarkMode={isDarkMode}
                        />
                      </div>

                      {/* EDIT */}
                      <div className="flex flex-col items-center gap-3">
                        <span className={`font-mono text-[10px] font-bold tracking-widest uppercase ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}`}>Edit</span>
                        <ColoredToggle 
                          color="orange" 
                          checked={mPerms.edit} 
                          onChange={() => setPerms(p => ({ ...p, [mod.id]: { ...p[mod.id], edit: !p[mod.id].edit } }))} 
                          isDarkMode={isDarkMode}
                        />
                      </div>

                      {/* DELETE */}
                      <div className="flex flex-col items-center gap-3">
                        <span className={`font-mono text-[10px] font-bold tracking-widest uppercase ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}`}>Delete</span>
                        <ColoredToggle 
                          color="red" 
                          checked={mPerms.delete} 
                          onChange={() => setPerms(p => ({ ...p, [mod.id]: { ...p[mod.id], delete: !p[mod.id].delete } }))} 
                          isDarkMode={isDarkMode}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Info Form Modal */}
      <AnimatePresence>
        {userForm.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a0e17]/60 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-[#e1e8ed]"
            >
              <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-[#1a2333] bg-[#0a0e17]' : 'border-[#e1e8ed] bg-[#fafbfc]'}`}>
                <h3 className={`font-bold ${isDarkMode ? 'text-[#e2e8f0]' : 'text-[#2c3e50]'} text-[16px]`}>
                  {userForm.mode === 'add' ? 'Add New User' : 'Edit User Information'}
                </h3>
                <button
                  onClick={() => setUserForm({ isOpen: false, mode: 'add', user: {} })}
                  className={`${isDarkMode ? 'text-[#a0aec0] hover:text-[#e2e8f0]' : 'text-[#7f8c8d] hover:text-[#2c3e50]'} transition-colors`}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={`text-[13px] font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#2c3e50]'}`}>Full Name</label>
                  <input 
                    type="text" 
                    value={userForm.user.fullName || ''}
                    onChange={(e) => setUserForm(p => ({ ...p, user: { ...p.user, fullName: e.target.value } }))}
                    placeholder="E.g. John Doe"
                    className={`w-full p-2.5 border ${isDarkMode ? 'bg-[#0d121c] border-[#334155] text-[#e2e8f0]' : 'border-[#e1e8ed] text-[text-[#2c3e50]]'} rounded-lg text-sm focus:border-[#107c10] outline-none transition-colors`}
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className={`text-[13px] font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#2c3e50]'}`}>User ID (Login)</label>
                  <input 
                    type="text" 
                    value={userForm.user.userId || ''}
                    onChange={(e) => setUserForm(p => ({ ...p, user: { ...p.user, userId: e.target.value } }))}
                    placeholder="E.g. JD001"
                    disabled={userForm.mode === 'edit'}
                    className={`w-full p-2.5 border ${isDarkMode ? 'bg-[#1a2333] border-[#334155] text-[#a0aec0] cursor-not-allowed' : 'border-[#e1e8ed] bg-[#f4f7f6] cursor-not-allowed'} rounded-lg text-sm focus:border-[#107c10] outline-none transition-colors`}
                  />
                  {userForm.mode === 'edit' && (
                     <span className="text-[11px] text-[#7f8c8d]">User ID cannot be changed after creation.</span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={`text-[13px] font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#2c3e50]'}`}>Role Classification</label>
                  <select 
                    value={userForm.user.role || 'User'}
                    onChange={(e) => setUserForm(p => ({ ...p, user: { ...p.user, role: e.target.value as 'Admin' | 'User' } }))}
                    className={`w-full p-2.5 border ${isDarkMode ? 'bg-[#0d121c] border-[#334155] text-[#e2e8f0]' : 'border-[#e1e8ed] bg-white text-[#2c3e50]'} rounded-lg text-sm focus:border-[#107c10] outline-none transition-colors`}
                  >
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className={`p-4 border-t ${isDarkMode ? 'border-[#1a2333] bg-[#0a0e17]' : 'border-[#e1e8ed] bg-[#fafbfc]'} flex justify-end gap-3`}>
                <button
                  onClick={() => setUserForm({ isOpen: false, mode: 'add', user: {} })}
                  className={`px-4 py-2 border ${isDarkMode ? 'border-[#334155] text-[#a0aec0] hover:bg-[#1a2333]' : 'border-[#e1e8ed] text-[#7f8c8d] hover:bg-[#f4f7f6]'} rounded-lg font-medium text-[13px] transition-colors`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUser}
                  disabled={crudLoading}
                  className="px-4 py-2 bg-[#107c10] text-white rounded-lg font-medium text-[13px] hover:bg-[#0c610c] flex items-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {crudLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {userForm.mode === 'add' ? 'Create User' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isDeletingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a0e17]/60 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-[#e1e8ed]"
            >
              <div className="p-6 flex flex-col items-center gap-4 text-center">
                <div className={`w-12 h-12 rounded-full ${isDarkMode ? 'bg-[#450a0a] text-[#f87171]' : 'bg-[#fdefed] text-[#e74c3c]'} flex items-center justify-center`}>
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className={`font-bold ${isDarkMode ? 'text-[#e2e8f0]' : 'text-[#2c3e50]'} text-[18px] mb-1`}>Obliterate User?</h3>
                  <p className={`text-[13px] ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}`}>
                    Are you sure you want to permanently delete <strong>{isDeletingUser.fullName}</strong>? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className={`p-4 border-t ${isDarkMode ? 'border-[#1a2333] bg-[#0a0e17]' : 'border-[#e1e8ed] bg-[#fafbfc]'} flex justify-end gap-3`}>
                <button
                  onClick={() => setIsDeletingUser(null)}
                  className={`px-4 py-2 border ${isDarkMode ? 'border-[#334155] text-[#a0aec0] hover:bg-[#1a2333]' : 'border-[#e1e8ed] text-[#7f8c8d] hover:bg-[#f4f7f6]'} rounded-lg font-medium text-[13px] transition-colors flex-1`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={crudLoading}
                  className="px-4 py-2 bg-[#e74c3c] text-white rounded-lg font-medium text-[13px] hover:bg-[#c0392b] flex items-center justify-center gap-2 transition-colors flex-1 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {crudLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
