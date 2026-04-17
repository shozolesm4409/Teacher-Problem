/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Table as TableIcon, 
  Users, 
  LogOut, 
  Loader2, 
  AlertCircle,
  Menu,
  PieChart,
  MessageSquare,
  X
} from 'lucide-react';
import { Sun, Moon } from 'lucide-react';
import { api } from './lib/api';
import { User, MillEntry, CommentOption } from './types';

import NewEntryForm from './components/views/NewEntryForm';
import MillListTable from './components/views/MillListTable';
import UserAccessPanel from './components/views/UserAccessPanel';
import ReportPanel from './components/views/ReportPanel';
import CommentsPanel from './components/views/CommentsPanel';

import { hasModulePerm } from './lib/permissions';

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('sheetSync_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [loginId, setLoginId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'table' | 'users' | 'report' | 'comments'>('form');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('sheetSync_darkMode') === 'true';
  });
  
  const [millList, setMillList] = useState<MillEntry[]>([]);
  const [comments, setComments] = useState<CommentOption[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Initial data load if user is already logged in
  useEffect(() => {
    if (user) {
      loadConfig();
      loadMillList();
    }
  }, []);

  // Apply dark mode class to root and save to localStorage
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('sheetSync_darkMode', isDarkMode.toString());
  }, [isDarkMode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(loginId);
      if (res.success && res.data) {
        setUser(res.data);
        localStorage.setItem('sheetSync_user', JSON.stringify(res.data));
        loadConfig();
        loadMillList();
      } else {
        setError(res.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('sheetSync_user');
    // We keep darkMode preference
  };

  const loadConfig = async () => {
    // Load from cache first for fast rendering
    const cachedComments = localStorage.getItem('sheetSync_comments');
    if (cachedComments) {
      try {
        setComments(JSON.parse(cachedComments));
      } catch (e) {
        // invalid JSON
      }
    }

    const res = await api.getConfig();
    if (res.success && res.data) {
      // Filter out empty rows from the spreadsheet
      const validComments = res.data.comments.filter(c => c && c.comment && c.comment.toString().trim() !== '');
      setComments(validComments);
      setUsersList(res.data.users);
      // Save valid comments to Cache
      localStorage.setItem('sheetSync_comments', JSON.stringify(validComments));
    }
  };

  const loadMillList = async () => {
    const res = await api.getMillList();
    if (res.success && res.data) {
      setMillList(res.data);
    }
  };

  if (!user) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-[#0a0e17]' : 'bg-[#f4f7f6]'} ${isDarkMode ? 'text-[#f8fafc]' : 'text-[#2c3e50]'} font-sans flex items-center justify-center p-4 transition-colors duration-300`}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`w-full max-w-md ${isDarkMode ? 'bg-[#0d121c] border-[#1a2333]' : 'bg-white border-[#e1e8ed]'} border rounded-xl p-8 shadow-sm`}
        >
          <div className="flex items-center justify-between mb-8">
            <div className={`flex items-center gap-2 ${isDarkMode ? 'text-[#4ade80]' : 'text-[#107c10]'} font-bold text-xl`}>
              <LayoutDashboard size={24} />
              Teacher
            </div>
            <button 
              className={`p-2 ${isDarkMode ? 'bg-[#1a2333]' : 'bg-[#f4f7f6]'} rounded-full text-[#7f8c8d] hover:bg-[#e1e8ed] transition-colors`}
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 items-center">
              <label className={`text-xs font-semibold text-center ${isDarkMode ? 'text-[#94a3b8]' : 'text-[#7f8c8d]'}`}>
                User Access ID
              </label>
              <input 
                type="text" 
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="Enter your ID"
                className={`w-full p-2.5 outline-none text-center transition-colors border rounded-md text-sm ${isDarkMode ? 'bg-[#111827] border-[#334155] text-white focus:border-[#4ade80]' : 'bg-white border-[#e1e8ed] text-[#2c3e50] focus:border-[#107c10]'}`}
                required
              />
            </div>

            {error && (
              <div className={`flex items-center gap-2 text-sm p-3 rounded-md border ${isDarkMode ? 'bg-red-900/20 border-red-900/50 text-red-400' : 'bg-red-50 border-red-100 text-red-600'}`}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full mt-2 py-3 rounded-md font-semibold transition-colors flex items-center justify-center gap-2 ${isDarkMode ? 'bg-[#4ade80] text-[#064e3b] hover:bg-[#22c55e]' : 'bg-[#107c10] text-white hover:bg-[#0c610c]'}`}
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Log In'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#0a0e17]' : 'bg-[#f4f7f6]'} ${isDarkMode ? 'text-[#e2e8f0]' : 'text-[#2c3e50]'} font-sans flex relative`}>
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`w-[240px] ${isDarkMode ? 'bg-[#0d121c] border-[#1a2333]' : 'bg-white border-[#e1e8ed]'} border-r p-6 flex flex-col fixed h-full z-30 transition-transform duration-300 md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="text-xl font-bold text-[#107c10] mb-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard size={24} />
            Teacher
          </div>
          <button 
            className={`p-2 ${isDarkMode ? 'bg-[#1a2333]' : 'bg-[#f4f7f6]'} rounded-full text-[#7f8c8d] hover:bg-[#e1e8ed] transition-colors`}
            onClick={() => setIsDarkMode(!isDarkMode)}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="md:hidden text-[#7f8c8d]" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1">
          <ul className="list-none flex flex-col">
            {hasModulePerm(user, 'entry', 'read') && (
              <li 
                onClick={() => { setActiveTab('form'); setIsMobileMenuOpen(false); }}
                className={`flex items-center gap-3 p-[9px_12px] rounded-lg mb-1 cursor-pointer text-sm font-medium transition-colors ${activeTab === 'form' ? (isDarkMode ? 'bg-[#1a2333] text-[#107c10]' : 'bg-[#ebf5eb] text-[#107c10]') : (isDarkMode ? 'text-[#a0aec0] hover:bg-[#1a2333]' : 'text-[#7f8c8d] hover:bg-[#f4f7f6]')}`}
              >
                <PlusCircle size={18} />
                New Entry
              </li>
            )}
            {hasModulePerm(user, 'records', 'read') && (
              <li 
                onClick={() => { setActiveTab('table'); setIsMobileMenuOpen(false); }}
                className={`flex items-center gap-3 p-[9px_12px] rounded-lg mb-1 cursor-pointer text-sm font-medium transition-colors ${activeTab === 'table' ? (isDarkMode ? 'bg-[#1a2333] text-[#107c10]' : 'bg-[#ebf5eb] text-[#107c10]') : (isDarkMode ? 'text-[#a0aec0] hover:bg-[#1a2333]' : 'text-[#7f8c8d] hover:bg-[#f4f7f6]')}`}
              >
                <TableIcon size={18} />
                Mill List
              </li>
            )}
            {hasModulePerm(user, 'report', 'read') && (
              <li 
                onClick={() => { setActiveTab('report'); setIsMobileMenuOpen(false); }}
                className={`flex items-center gap-3 p-[9px_12px] rounded-lg mb-1 cursor-pointer text-sm font-medium transition-colors ${activeTab === 'report' ? (isDarkMode ? 'bg-[#1a2333] text-[#107c10]' : 'bg-[#ebf5eb] text-[#107c10]') : (isDarkMode ? 'text-[#a0aec0] hover:bg-[#1a2333]' : 'text-[#7f8c8d] hover:bg-[#f4f7f6]')}`}
              >
                <PieChart size={18} />
                Report
              </li>
            )}
            {hasModulePerm(user, 'comments', 'read') && (
              <li 
                onClick={() => { setActiveTab('comments'); setIsMobileMenuOpen(false); }}
                className={`flex items-center gap-3 p-[9px_12px] rounded-lg mb-1 cursor-pointer text-sm font-medium transition-colors ${activeTab === 'comments' ? (isDarkMode ? 'bg-[#1a2333] text-[#107c10]' : 'bg-[#ebf5eb] text-[#107c10]') : (isDarkMode ? 'text-[#a0aec0] hover:bg-[#1a2333]' : 'text-[#7f8c8d] hover:bg-[#f4f7f6]')}`}
              >
                <MessageSquare size={18} />
                Comments
              </li>
            )}
            {hasModulePerm(user, 'access', 'read') && (
              <li 
                onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }}
                className={`flex items-center gap-3 p-[9px_12px] rounded-lg mb-1 cursor-pointer text-sm font-medium transition-colors ${activeTab === 'users' ? (isDarkMode ? 'bg-[#1a2333] text-[#107c10]' : 'bg-[#ebf5eb] text-[#107c10]') : (isDarkMode ? 'text-[#a0aec0] hover:bg-[#1a2333]' : 'text-[#7f8c8d] hover:bg-[#f4f7f6]')}`}
              >
                <Users size={18} />
                User Access
              </li>
            )}
          </ul>
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          <div className="text-[12px] font-semibold text-inherit mb-2 px-2">
            {user.fullName}
            <span className={`block font-normal ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'} text-[11px] mt-0.5`}>{user.role}</span>
          </div>
          <button 
            onClick={handleLogout}
            className={`w-full flex items-center gap-2 p-3 rounded-lg ${isDarkMode ? 'text-[#a0aec0] hover:bg-[#1a2333]' : 'text-[#7f8c8d] hover:bg-[#f4f7f6]'} font-medium text-sm transition-colors`}
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow md:ml-[240px] px-[4px] py-[4px] pb-[80px] md:p-[32px] md:pb-[32px] flex flex-col gap-[24px] overflow-auto h-screen w-full">
        {/* Header for Desktop and Mobile */}
        <header className={`md:hidden sticky top-0 z-20 flex justify-between items-center p-4 ${isMobileMenuOpen ? 'hidden' : 'flex'} ${isDarkMode ? 'bg-[#0d121c] border-b border-[#1a2333]' : 'bg-white border-b border-[#e1e8ed]'}`}>
          <div className="flex items-center gap-2 font-bold text-[#107c10]">
            <LayoutDashboard size={20} />
            Teacher
          </div>
          <div className="flex items-center gap-3">
            <button 
              className={`p-2 ${isDarkMode ? 'bg-[#1a2333]' : 'bg-[#f4f7f6]'} rounded-full text-[#7f8c8d] hover:bg-[#e1e8ed] transition-colors`}
              onClick={() => setIsDarkMode(!isDarkMode)}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button 
              onClick={handleLogout}
              className={`${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}`}
            >
              <LogOut size={20} />
            </button>
            <button className={`${isDarkMode ? 'text-[#e2e8f0]' : 'text-[#2c3e50]'}`} onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
          </div>
        </header>

        <header className="hidden md:flex justify-between items-center bg-transparent shrink-0">
          <div className="flex items-center gap-3">
            <h1 className={`text-[20px] md:text-[24px] font-bold ${isDarkMode ? 'text-[#e2e8f0]' : 'text-[#2c3e50]'} whitespace-nowrap`}>
              {activeTab === 'form' ? 'Entry Overview' : activeTab === 'table' ? 'Historical Records' : activeTab === 'report' ? 'Analytics Report' : activeTab === 'comments' ? 'Comments Rules' : 'Access Management'}
            </h1>
          </div>
          <div className="flex items-center gap-4 w-full justify-end">
            {activeTab === 'table' && (
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`hidden lg:block w-full max-w-[300px] p-[8px_16px] border rounded-[6px] text-sm outline-none focus:border-[#107c10] ${isDarkMode ? 'bg-[#0d121c] border-[#1a2333] text-[#e2e8f0]' : 'bg-white border-[#e1e8ed]'} transition-colors`}
              />
            )}
            <div className={`hidden md:flex text-[13px] ${isDarkMode ? 'text-[#a0aec0] bg-[#0d121c] border-[#1a2333]' : 'text-[#7f8c8d] bg-white border-[#e1e8ed]'} p-[8px_16px] rounded-[20px] border items-center gap-2 shadow-sm whitespace-nowrap`}>
              <span className="w-2 h-2 rounded-full bg-[#107c10]"></span>
              Active Connection
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'form' && (
            <NewEntryForm 
              comments={comments} 
              user={user}
              onSuccess={() => {
                loadMillList();
              }} 
              isDarkMode={isDarkMode}
            />
          )}

          {activeTab === 'table' && (
            <MillListTable 
              millList={millList} 
              searchTerm={searchTerm} 
              setSearchTerm={setSearchTerm} 
              user={user}
              onRefresh={loadMillList}
              isDarkMode={isDarkMode}
            />
          )}

          {activeTab === 'users' && (
            <UserAccessPanel usersList={usersList} user={user} onUpdate={loadConfig} isDarkMode={isDarkMode} />
          )}

          {activeTab === 'report' && (
            <ReportPanel millList={millList} isDarkMode={isDarkMode} />
          )}

          {activeTab === 'comments' && (
            <CommentsPanel comments={comments} onUpdate={loadConfig} user={user} isDarkMode={isDarkMode} />
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav 
        className={`md:hidden fixed bottom-0 left-0 w-full ${isDarkMode ? 'bg-[#0d121c] border-[#1a2333]' : 'bg-white border-[#e1e8ed]'} border-t z-40`} 
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="flex items-center justify-around p-2">
          {hasModulePerm(user, 'entry', 'read') && (
            <li 
              onClick={() => setActiveTab('form')}
              className={`flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer transition-colors flex-1 ${activeTab === 'form' ? 'text-[#107c10]' : (isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]')}`}
            >
              <PlusCircle size={20} className="mb-1" />
              <span className="text-[10px] font-medium text-center">Entry</span>
            </li>
          )}
          {hasModulePerm(user, 'records', 'read') && (
            <li 
              onClick={() => setActiveTab('table')}
              className={`flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer transition-colors flex-1 ${activeTab === 'table' ? 'text-[#107c10]' : (isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]')}`}
            >
              <TableIcon size={20} className="mb-1" />
              <span className="text-[10px] font-medium text-center">Records</span>
            </li>
          )}
          {hasModulePerm(user, 'report', 'read') && (
            <li 
              onClick={() => setActiveTab('report')}
              className={`flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer transition-colors flex-1 ${activeTab === 'report' ? 'text-[#107c10]' : (isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]')}`}
            >
              <PieChart size={20} className="mb-1" />
              <span className="text-[10px] font-medium text-center">Report</span>
            </li>
          )}
          {hasModulePerm(user, 'comments', 'read') && (
            <li 
              onClick={() => setActiveTab('comments')}
              className={`flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer transition-colors flex-1 ${activeTab === 'comments' ? 'text-[#107c10]' : (isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]')}`}
            >
              <MessageSquare size={20} className="mb-1" />
              <span className="text-[10px] font-medium text-center">Comms</span>
            </li>
          )}
          {hasModulePerm(user, 'access', 'read') && (
            <li 
              onClick={() => setActiveTab('users')}
              className={`flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer transition-colors flex-1 ${activeTab === 'users' ? 'text-[#107c10]' : (isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]')}`}
            >
              <Users size={20} className="mb-1" />
              <span className="text-[10px] font-medium text-center">Access</span>
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
}
