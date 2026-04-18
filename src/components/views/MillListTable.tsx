import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Edit2, Trash2, X, AlertTriangle, Loader2, Search, UploadCloud } from 'lucide-react';
import { MillEntry, User } from '../../types';
import { api } from '../../lib/api';
import { hasModulePerm } from '../../lib/permissions';

interface MillListTableProps {
  millList: MillEntry[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  user?: User | null;
  onRefresh?: () => void;
  isDarkMode?: boolean;
  examinersCache?: any[];
}

type TabType = 'all' | 'own';

export default function MillListTable({ 
  millList, 
  searchTerm, 
  setSearchTerm, 
  user, 
  onRefresh, 
  isDarkMode,
  examinersCache = []
}: MillListTableProps) {
  const [activeTableTab, setActiveTableTab] = useState<TabType>('own');
  const [filterInstitute, setFilterInstitute] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterComment, setFilterComment] = useState('');
  
  const [deletingEntry, setDeletingEntry] = useState<MillEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editingEntry, setEditingEntry] = useState<MillEntry | null>(null);
  const [editFormData, setEditFormData] = useState<MillEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [searchPopupEntry, setSearchPopupEntry] = useState<MillEntry | null>(null);
  const [isSearchingExaminer, setIsSearchingExaminer] = useState(false);
  const [searchResults, setSearchResults] = useState<{ examinerName: string; institute: string; department: string; phone: string; tPin: string } | null>(null);
  const [isUpdatingFromExaminer, setIsUpdatingFromExaminer] = useState(false);

  const uniqueInstitutes = useMemo(() => Array.from(new Set(millList.map(item => item.institute || '').filter(Boolean))).sort(), [millList]);
  const uniqueDepartments = useMemo(() => Array.from(new Set(millList.map(item => item.department || '').filter(Boolean))).sort(), [millList]);
  const uniqueComments = useMemo(() => Array.from(new Set(millList.map(item => item.comment || '').filter(Boolean))).sort(), [millList]);

  // Determine permissions
  const canEdit = hasModulePerm(user, 'records', 'edit');
  const canDelete = hasModulePerm(user, 'records', 'delete');
  const isAdmin = user?.role === 'Admin';
  const showSearch = isAdmin || (canEdit && activeTableTab === 'own');

  const filteredMillList = useMemo(() => {
    return millList.filter(entry => {
      // First apply Tab filter
      if (activeTableTab === 'own' && user) {
        // Compare with creatorUserId (normalized)
        const creatorId = (entry.creatorUserId || '').toString().trim().toLowerCase();
        const currentUserId = (user.userId || '').toString().trim().toLowerCase();
        
        if (creatorId !== currentUserId) {
          return false;
        }
      }

      const matchesSearch = 
        (entry.date || '').toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.tPin || '').toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.nickName || '').toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.institute || '').toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.department || '').toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.comment || '').toString().toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesInstitute = filterInstitute === '' || (entry.institute || '') === filterInstitute;
      const matchesDepartment = filterDepartment === '' || (entry.department || '') === filterDepartment;
      const matchesComment = filterComment === '' || (entry.comment || '') === filterComment;
      
      return matchesSearch && matchesInstitute && matchesDepartment && matchesComment;
    }).sort((a, b) => (Number(b.sl) || 0) - (Number(a.sl) || 0));
  }, [millList, searchTerm, filterInstitute, filterDepartment, filterComment, activeTableTab, user]);

  const formatDateString = (dateStr?: string) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    return isNaN(dateObj.getTime()) ? dateStr : dateObj.toDateString();
  };

  const formatPhone = (phone?: string | number) => {
    if (!phone) return '';
    let p = phone.toString().trim();
    if (p.indexOf("'") === 0) p = p.substring(1); // Remove leading quote from sheet
    // If it's a standard length mobile number without leading zero, add it
    if (p.length >= 10 && p.indexOf('0') !== 0) return '0' + p;
    return p;
  };

  const executeDelete = async () => {
    if (!deletingEntry) return;
    setIsDeleting(true);
    try {
      const res = await api.deleteMillEntry(deletingEntry.sl);
      if (res.success) {
        if (onRefresh) onRefresh();
        setDeletingEntry(null);
      } else {
        alert('Failed to delete: ' + res.error);
      }
    } catch (err) {
      alert('Network error occurred.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = (entry: MillEntry) => {
    let formattedDate = entry.date;
    if (formattedDate) {
      const d = new Date(formattedDate);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toISOString().split('T')[0];
      }
    }
    setEditingEntry(entry);
    setEditFormData({ ...entry, date: formattedDate });
  };

  const executeEdit = async () => {
    if (!editFormData) return;
    setIsSaving(true);
    try {
      const updateData = {
        ...editFormData,
        updatorDate: new Date().toISOString(),
        updatorName: user?.fullName || 'System',
        updatorUserId: user?.userId || 'system'
      };
      const res = await api.updateMillEntry(updateData);
      if (res.success) {
        if (onRefresh) onRefresh();
        setEditingEntry(null);
      } else {
        alert('Failed to update: ' + res.error);
      }
    } catch (err) {
      alert('Network error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSearchExaminer = async (entry: MillEntry) => {
    setSearchPopupEntry(entry);
    setIsSearchingExaminer(true);
    setSearchResults(null);
    
    // Check cache first for instant results
    const cached = examinersCache.find(ex => 
      (ex.tPin || '').toString().trim().toLowerCase() === (entry.tPin || '').toString().trim().toLowerCase()
    );

    if (cached) {
      setSearchResults({
        examinerName: cached.examinerName || '',
        institute: cached.institute || '',
        department: cached.department || '',
        phone: cached.phone || '',
        tPin: cached.tPin || ''
      });
      setIsSearchingExaminer(false);
      return;
    }

    try {
      const res = await api.searchExaminer(entry.tPin);
      if (res.success && res.data) {
        setSearchResults({
          ...res.data,
          tPin: entry.tPin
        });
      }
    } catch (err) {
      console.error('Search error', err);
    } finally {
      setIsSearchingExaminer(false);
    }
  };

  const handleUpdateFromExaminer = async () => {
    if (!searchPopupEntry || !searchResults) return;
    setIsUpdatingFromExaminer(true);
    try {
      const updateData: MillEntry = {
        ...searchPopupEntry,
        institute: searchResults.institute,
        department: searchResults.department,
        phone: searchResults.phone,
        updatorDate: new Date().toISOString(),
        updatorName: user?.fullName || 'System',
        updatorUserId: user?.userId || 'system'
      };
      const res = await api.updateMillEntry(updateData);
      if (res.success) {
        if (onRefresh) onRefresh();
        setSearchPopupEntry(null);
      } else {
        alert('Update failed: ' + res.error);
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setIsUpdatingFromExaminer(false);
    }
  };

  return (
    <>
      <motion.div
        key="table"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col flex-grow h-0 gap-4"
      >
        {/* Tabs for Records */}
        <div className="flex items-center gap-1 border-b border-gray-200 dark:border-[#1a2333] mb-2 px-1">
          <button
            onClick={() => setActiveTableTab('all')}
            className={`px-4 py-2 text-sm font-semibold transition-all relative ${
              activeTableTab === 'all'
                ? (isDarkMode ? 'text-[#4ade80]' : 'text-[#107c10]')
                : (isDarkMode ? 'text-[#94a3b8] hover:text-[#e2e8f0]' : 'text-[#7f8c8d] hover:text-[#2c3e50]')
            }`}
          >
            All Records
            {activeTableTab === 'all' && (
              <motion.div 
                layoutId="activeTableTab" 
                className={`absolute bottom-0 left-0 right-0 h-0.5 ${isDarkMode ? 'bg-[#4ade80]' : 'bg-[#107c10]'}`} 
              />
            )}
          </button>
          <button
            onClick={() => setActiveTableTab('own')}
            className={`px-4 py-2 text-sm font-semibold transition-all relative ${
              activeTableTab === 'own'
                ? (isDarkMode ? 'text-[#4ade80]' : 'text-[#107c10]')
                : (isDarkMode ? 'text-[#94a3b8] hover:text-[#e2e8f0]' : 'text-[#7f8c8d] hover:text-[#2c3e50]')
            }`}
          >
            Own Records
            {activeTableTab === 'own' && (
              <motion.div 
                layoutId="activeTableTab" 
                className={`absolute bottom-0 left-0 right-0 h-0.5 ${isDarkMode ? 'bg-[#4ade80]' : 'bg-[#107c10]'}`} 
              />
            )}
          </button>
        </div>

        <div className={`md:hidden p-4 rounded-xl border ${isDarkMode ? 'bg-[#0d121c] border-[#1a2333]' : 'bg-white border-[#e1e8ed]'} flex-shrink-0`}>
          <input 
            type="text" 
            placeholder="Search records..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full p-2.5 border rounded-md text-sm outline-none ${isDarkMode ? 'bg-[#1a2333] border-[#334155] text-[#e2e8f0]' : 'border-[#e1e8ed] bg-white'}`}
          />
        </div>
        
        {/* Card View for Mobile, Table for Desktop */}
         <div className={`md:hidden flex flex-col gap-3 flex-grow overflow-auto`}>
             {filteredMillList.map((entry, idx) => (
                <div key={idx} className={`p-4 rounded-xl border ${isDarkMode ? 'bg-[#0d121c] border-[#1a2333]' : 'bg-white border-[#e1e8ed]'} shadow-sm`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`font-bold ${isDarkMode ? 'text-[#e2e8f0]' : 'text-[#2c3e50]'}`}>{entry.nickName || 'No Name'}</span>
                    <span className={`px-2 py-1 rounded inline-block text-[10px] font-semibold ${isDarkMode ? 'bg-[#003d29] text-[#34d399]' : 'bg-[#e3fcef] text-[#006644]'}`}>{entry.comment}</span>
                  </div>
                  <div className="text-[12px] space-y-1 mb-3">
                    <p className={isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}>Date: <span className={isDarkMode ? 'text-[#e2e8f0]' : 'text-[#2c3e50]'}>{formatDateString(entry.date)}</span></p>
                    <p className={isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}>T-Pin: <span className={isDarkMode ? 'text-[#e2e8f0]' : 'text-[#2c3e50]'}>{entry.tPin}</span></p>
                    <p className={isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}>Inst/Dept: <span className={isDarkMode ? 'text-[#e2e8f0]' : 'text-[#2c3e50]'}>{entry.institute} / {entry.department}</span></p>
                    <p className={isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}>Phone: <span className={isDarkMode ? 'text-[#e2e8f0]' : 'text-[#2c3e50]'}>{formatPhone(entry.phone)}</span></p>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                    {showSearch && (
                      <button 
                        className={`p-2 rounded-md ${isDarkMode ? 'bg-[#1a2333] text-[#4ade80]' : 'bg-[#ebf5eb] text-[#107c10]'}`} 
                        onClick={() => handleSearchExaminer(entry)}
                        title="Find Examiner"
                      >
                        <Search size={16} />
                      </button>
                    )}
                    {canEdit && (
                        <button className={`p-2 rounded-md ${isDarkMode ? 'bg-[#1a2333] text-[#3b82f6]' : 'bg-[#ebf5ff] text-[#3498db]'}`} onClick={() => handleEditClick(entry)}><Edit2 size={16} /></button>
                      )}
                      {canDelete && (
                        <button className={`p-2 rounded-md ${isDarkMode ? 'bg-[#450a0a] text-[#f87171]' : 'bg-[#fdefed] text-[#e74c3c]'}`} onClick={() => setDeletingEntry(entry)}><Trash2 size={16} /></button>
                      )}
                    </div>
                </div>
             ))}
          </div>

        <div className={`hidden md:block rounded-[12px] border ${isDarkMode ? 'bg-[#0d121c] border-[#1a2333]' : 'bg-white border-[#e1e8ed]'} overflow-x-auto flex-grow shadow-sm p-1`}>
          <table className="w-full border-collapse text-[13px] min-w-max">
            <thead className={`sticky top-0 ${isDarkMode ? 'bg-[#0d121c]' : 'bg-[#fafbfc]'} z-10`}>
              <tr>
                <th className={`text-left p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} font-semibold align-middle whitespace-nowrap`}>Sl</th>
                <th className={`text-left p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} font-semibold align-middle whitespace-nowrap`}>Date</th>
                <th className={`text-left p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} font-semibold align-middle whitespace-nowrap`}>T-Pin</th>
                <th className={`text-left p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} font-semibold align-middle whitespace-nowrap`}>Nick Name</th>
                {showSearch && (
                  <th className={`text-left p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} font-semibold align-middle whitespace-nowrap text-center`}>Search</th>
                )}
                
                <th className={`text-left p-2 border-b ${isDarkMode ? 'border-[#1a2333]' : 'border-[#e1e8ed]'} font-semibold align-middle min-w-[150px]`}>
                  <select 
                    className={`w-full p-2 border border-transparent hover:border-[#e1e8ed] rounded text-[13px] font-semibold ${isDarkMode ? 'text-[#a0aec0] bg-[#0d121c]' : 'text-[#7f8c8d] bg-transparent'} outline-none focus:border-[#107c10] focus:bg-white cursor-pointer`}
                    value={filterInstitute}
                    onChange={(e) => setFilterInstitute(e.target.value)}
                  >
                    <option value="">Institute (All)</option>
                    {uniqueInstitutes.map(inst => (
                      <option key={inst} value={inst}>{inst}</option>
                    ))}
                  </select>
                </th>
                
                <th className={`text-left p-[8px_12px] border-b ${isDarkMode ? 'border-[#1a2333]' : 'border-[#e1e8ed]'} font-semibold align-middle min-w-[150px]`}>
                  <select 
                    className={`w-full p-2 border border-transparent hover:border-[#e1e8ed] rounded text-[13px] font-semibold ${isDarkMode ? 'text-[#a0aec0] bg-[#0d121c]' : 'text-[#7f8c8d] bg-transparent'} outline-none focus:border-[#107c10] focus:bg-white cursor-pointer`}
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                  >
                    <option value="">Department (All)</option>
                    {uniqueDepartments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </th>
                
                <th className={`text-left p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} font-semibold align-middle whitespace-nowrap`}>Phone Number</th>
                
                <th className={`text-left p-2 border-b ${isDarkMode ? 'border-[#1a2333]' : 'border-[#e1e8ed]'} font-semibold align-middle min-w-[150px]`}>
                  <select 
                    className={`w-full p-2 border border-transparent hover:border-[#e1e8ed] rounded text-[13px] font-semibold ${isDarkMode ? 'text-[#a0aec0] bg-[#0d121c]' : 'text-[#7f8c8d] bg-transparent'} outline-none focus:border-[#107c10] focus:bg-white cursor-pointer`}
                    value={filterComment}
                    onChange={(e) => setFilterComment(e.target.value)}
                  >
                    <option value="">Comment (All)</option>
                    {uniqueComments.map(comment => (
                      <option key={comment} value={comment}>{comment}</option>
                    ))}
                  </select>
                </th>

                {(canEdit || canDelete) && (
                  <th className={`text-center p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} font-semibold align-middle whitespace-nowrap`}>Action</th>
                )}
                {user?.role === 'Admin' && (
                  <>
                    <th className={`text-left p-1 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} font-semibold align-middle whitespace-nowrap`}>Creator Date</th>
                    <th className={`text-left p-1 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} font-semibold align-middle whitespace-nowrap`}>Creator</th>
                    <th className={`text-left p-1 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} font-semibold align-middle whitespace-nowrap`}>Creator ID</th>
                    <th className={`text-left p-1 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} font-semibold align-middle whitespace-nowrap`}>Updator Date</th>
                    <th className={`text-left p-1 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} font-semibold align-middle whitespace-nowrap`}>Updator Name</th>
                    <th className={`text-left p-1 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} font-semibold align-middle whitespace-nowrap`}>Updator ID</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredMillList.map((entry, idx) => (
                <tr key={idx} className={`${isDarkMode ? 'hover:bg-[#1a2333]' : 'hover:bg-[#f4f7f6]'} transition-colors group`}>
                  <td className={`p-1 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} font-medium text-xs`}>
                    {entry.sl}
                  </td>
                  <td className={`p-1 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} font-medium whitespace-nowrap`}>
                    {formatDateString(entry.date)}
                  </td>
                  <td className={`p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#e2e8f0]' : 'border-[#e1e8ed]'} font-medium whitespace-nowrap`}>{entry.tPin}</td>
                  <td className={`p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#e2e8f0]' : 'border-[#e1e8ed]'} whitespace-nowrap`}>{entry.nickName}</td>
                  {showSearch && (
                    <td className={`p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#e2e8f0]' : 'border-[#e1e8ed]'} text-center`}>
                      <button 
                        onClick={() => handleSearchExaminer(entry)}
                        className={`p-1.5 rounded-full ${isDarkMode ? 'text-[#4ade80] hover:bg-[#4ade80]/10' : 'text-[#107c10] hover:bg-[#107c10]/10'} transition-colors`}
                        title="Find Examiner Information"
                      >
                        <Search size={16} />
                      </button>
                    </td>
                  )}
                  <td className={`p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#e2e8f0]' : 'border-[#e1e8ed]'} whitespace-nowrap`}>{entry.institute}</td>
                  <td className={`p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#e2e8f0]' : 'border-[#e1e8ed]'} whitespace-nowrap`}>{entry.department}</td>
                  <td className={`p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#e2e8f0]' : 'border-[#e1e8ed]'} whitespace-nowrap`}>{formatPhone(entry.phone)}</td>
                  <td className={`p-2 border-b ${isDarkMode ? 'border-[#1a2333]' : 'border-[#e1e8ed]'} whitespace-nowrap`}>
                    <span className={`px-[10px] py-[4px] ${isDarkMode ? 'bg-[#003d29] text-[#34d399] border-[#34d399]/20' : 'bg-[#e3fcef] text-[#006644] border-[#006644]/20'} rounded-[12px] text-[11px] font-semibold border inline-block`}>
                      {entry.comment}
                    </span>
                  </td>
                  {(canEdit || canDelete) && (
                    <td className={`p-1 border-b ${isDarkMode ? 'border-[#1a2333]' : 'border-[#e1e8ed]'} text-center`}>
                      <div className="flex items-center justify-center gap-2 transition-opacity">
                        {canEdit && (
                          <button 
                            className={`p-1.5 ${isDarkMode ? 'text-[#3b82f6] hover:bg-[#1e293b]' : 'text-[#3498db] hover:bg-[#ebf5ff]'} rounded-md transition-colors`}
                            onClick={() => handleEditClick(entry)}
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button 
                            className={`p-1.5 ${isDarkMode ? 'text-[#f87171] hover:bg-[#450a0a]' : 'text-[#e74c3c] hover:bg-[#fdefed]'} rounded-md transition-colors`}
                            onClick={() => setDeletingEntry(entry)}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                  {user?.role === 'Admin' && (
                    <>
                      <td className={`p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} whitespace-nowrap`}>{formatDateString(entry.creatorDate)}</td>
                      <td className={`p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} whitespace-nowrap`}>{entry.creatorName || '-'}</td>
                      <td className={`p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} whitespace-nowrap`}>{entry.creatorUserId || '-'}</td>
                      <td className={`p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} whitespace-nowrap`}>{formatDateString(entry.updatorDate)}</td>
                      <td className={`p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} whitespace-nowrap`}>{entry.updatorName || '-'}</td>
                      <td className={`p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} whitespace-nowrap`}>{entry.updatorUserId || '-'}</td>
                    </>
                  )}
                </tr>
              ))}
              {filteredMillList.length === 0 && (
                <tr>
                  <td colSpan={(canEdit || canDelete) ? 7 : 6} className="p-8 text-center text-[#7f8c8d]">
                    {(searchTerm || filterInstitute || filterDepartment || filterComment) 
                      ? 'No matching records found for your search and filters.' 
                      : 'No records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isDeleting && setDeletingEntry(null)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-[16px] shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[#e1e8ed] bg-[#fafbfc]">
                <div className="flex items-center gap-3 text-[#e74c3c]">
                    <AlertTriangle size={24} />
                    <h3 className="text-[18px] font-bold text-[#2c3e50]">Confirm Delete</h3>
                </div>
                <button 
                  onClick={() => !isDeleting && setDeletingEntry(null)}
                  disabled={isDeleting}
                  className="w-8 h-8 flex items-center justify-center text-[#7f8c8d] hover:bg-[#e1e8ed] rounded-full transition-colors disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6">
                <p className="text-sm text-[#2c3e50] mb-3">
                  Are you sure you want to permanently delete the entry for <span className="font-bold text-[#e74c3c]">{deletingEntry.nickName || deletingEntry.tPin}</span>?
                </p>
                <p className="text-[12px] text-[#7f8c8d]">
                  This action cannot be undone and will be permanently removed from the Google Sheet.
                </p>
              </div>

              <div className="p-5 border-t border-[#e1e8ed] flex justify-end gap-3 bg-[#fafbfc]">
                <button 
                  onClick={() => setDeletingEntry(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 border border-[#e1e8ed] text-[#7f8c8d] rounded-md font-medium text-[14px] hover:bg-[#f4f7f6] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-[#e74c3c] text-white rounded-md font-medium text-[14px] hover:bg-[#c0392b] flex items-center gap-2 relative overflow-hidden disabled:bg-[#f5b7b1]"
                >
                  {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Entry Modal */}
      <AnimatePresence>
        {editingEntry && editFormData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isSaving && setEditingEntry(null)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[16px] shadow-xl overflow-hidden"
            >
               <div className={`flex items-center justify-between p-5 border-b ${isDarkMode ? 'border-[#1a2333] bg-[#0a0e17]' : 'border-[#e1e8ed] bg-[#fafbfc]'}`}>
                <div className="flex items-center gap-3 text-[#3498db]">
                    <Edit2 size={24} />
                    <h3 className={`text-[18px] font-bold ${isDarkMode ? 'text-[#e2e8f0]' : 'text-[#2c3e50]'}`}>Edit Record</h3>
                </div>
                <button 
                  onClick={() => !isSaving && setEditingEntry(null)}
                  disabled={isSaving}
                  className={`w-8 h-8 flex items-center justify-center ${isDarkMode ? 'text-[#a0aec0] hover:bg-[#1a2333]' : 'text-[#7f8c8d] hover:bg-[#e1e8ed]'} rounded-full transition-colors disabled:opacity-50`}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 col-span-2 md:col-span-1">
                    <label className={`text-[12px] font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}`}>Date</label>
                    <input 
                      type="date" 
                      value={editFormData.date || ''}
                      onChange={(e) => setEditFormData({...editFormData, date: e.target.value})}
                      className={`p-[10px] border ${isDarkMode ? 'bg-[#0d121c] border-[#334155] text-[#e2e8f0] focus:border-[#107c10]' : 'border-[#e1e8ed] text-[#2c3e50] focus:border-[#107c10]'} rounded-[6px] text-[14px] outline-none`}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-1">
                    <label className={`text-[12px] font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}`}>T-Pin</label>
                    <input 
                      type="text" 
                      value={editFormData.tPin || ''}
                      onChange={(e) => setEditFormData({...editFormData, tPin: e.target.value})}
                      className={`p-[10px] border ${isDarkMode ? 'bg-[#0d121c] border-[#334155] text-[#e2e8f0] focus:border-[#107c10]' : 'border-[#e1e8ed] text-[#2c3e50] focus:border-[#107c10]'} rounded-[6px] text-[14px] outline-none`}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-1 md:col-span-2">
                    <label className={`text-[12px] font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}`}>Nick Name</label>
                    <input 
                      type="text" 
                      value={editFormData.nickName || ''}
                      onChange={(e) => setEditFormData({...editFormData, nickName: e.target.value})}
                      className={`p-[10px] border ${isDarkMode ? 'bg-[#0d121c] border-[#334155] text-[#e2e8f0] focus:border-[#107c10]' : 'border-[#e1e8ed] text-[#2c3e50] focus:border-[#107c10]'} rounded-[6px] text-[14px] outline-none`}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-1">
                    <label className={`text-[12px] font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}`}>Institute</label>
                    <input 
                      type="text" 
                      value={editFormData.institute || ''}
                      onChange={(e) => setEditFormData({...editFormData, institute: e.target.value})}
                      className={`p-[10px] border ${isDarkMode ? 'bg-[#0d121c] border-[#334155] text-[#e2e8f0] focus:border-[#107c10]' : 'border-[#e1e8ed] text-[#2c3e50] focus:border-[#107c10]'} rounded-[6px] text-[14px] outline-none`}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-1">
                    <label className={`text-[12px] font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}`}>Department</label>
                    <input 
                      type="text" 
                      value={editFormData.department || ''}
                      onChange={(e) => setEditFormData({...editFormData, department: e.target.value})}
                      className={`p-[10px] border ${isDarkMode ? 'bg-[#0d121c] border-[#334155] text-[#e2e8f0] focus:border-[#107c10]' : 'border-[#e1e8ed] text-[#2c3e50] focus:border-[#107c10]'} rounded-[6px] text-[14px] outline-none`}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-1">
                    <label className={`text-[12px] font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}`}>Phone Number</label>
                    <input 
                      type="text" 
                      value={editFormData.phone || ''}
                      onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                      className={`p-[10px] border ${isDarkMode ? 'bg-[#0d121c] border-[#334155] text-[#e2e8f0] focus:border-[#107c10]' : 'border-[#e1e8ed] text-[#2c3e50] focus:border-[#107c10]'} rounded-[6px] text-[14px] outline-none`}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-2">
                    <label className={`text-[12px] font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}`}>Comment</label>
                    <select 
                      value={editFormData.comment || ''}
                      onChange={(e) => setEditFormData({...editFormData, comment: e.target.value})}
                      className={`p-[10px] border ${isDarkMode ? 'bg-[#0d121c] border-[#334155] text-[#e2e8f0] focus:border-[#107c10]' : 'border-[#e1e8ed] bg-white text-[#2c3e50] focus:border-[#107c10]'} rounded-[6px] text-[14px] outline-none`}
                    >
                      <option value="">Select Status...</option>
                      {uniqueComments.map((c, idx) => (
                        <option key={idx} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className={`p-5 border-t ${isDarkMode ? 'border-[#1a2333] bg-[#0a0e17]' : 'border-[#e1e8ed] bg-[#fafbfc]'} flex justify-end gap-3`}>
                <button 
                  onClick={() => setEditingEntry(null)}
                  disabled={isSaving}
                  className={`px-4 py-2 border ${isDarkMode ? 'border-[#334155] text-[#a0aec0] hover:bg-[#1a2333]' : 'border-[#e1e8ed] text-[#7f8c8d] hover:bg-[#f4f7f6]'} rounded-md font-medium text-[14px] disabled:opacity-50`}
                >
                  Cancel
                </button>
                <button 
                  onClick={executeEdit}
                  disabled={isSaving}
                  className="px-4 py-2 bg-[#3498db] text-white rounded-md font-medium text-[14px] hover:bg-[#2980b9] flex items-center gap-2 relative overflow-hidden disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Edit2 size={16} />}
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Examiner Search Popup */}
      <AnimatePresence>
        {searchPopupEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isUpdatingFromExaminer && setSearchPopupEntry(null)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`relative ${isDarkMode ? 'bg-[#0d121c] border-[#1a2333]' : 'bg-white border-[#e1e8ed]'} w-full max-w-md rounded-2xl shadow-xl overflow-hidden border`}
            >
              <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-[#1a2333] bg-[#0a0e17]' : 'border-[#e1e8ed] bg-[#fafbfc]'}`}>
                <div className="flex items-center gap-2">
                  <Search size={20} className="text-[#107c10]" />
                  <h3 className={`font-bold ${isDarkMode ? 'text-[#e2e8f0]' : 'text-[#2c3e50]'}`}>Examiner Information</h3>
                </div>
                <button 
                  onClick={() => setSearchPopupEntry(null)}
                  className={`p-1.5 rounded-full ${isDarkMode ? 'hover:bg-[#1a2333]' : 'hover:bg-[#e1e8ed]'} transition-colors`}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6">
                {/* Search Context Header */}
                <div className={`mb-6 p-4 rounded-xl ${isDarkMode ? 'bg-[#0a0e17] border-[#1a2333]' : 'bg-gray-50 border-gray-100'} border`}>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className={`text-[12px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}`}>Search Context</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isDarkMode ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'bg-[#107c10]/10 text-[#107c10]'}`}>Active Record</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${isDarkMode ? 'text-[#f8fafc]' : 'text-[#1e293b]'}`}>{searchPopupEntry.nickName}</span>
                      <span className={`text-xs ${isDarkMode ? 'text-[#64748b]' : 'text-[#94a3b8]'}`}>({searchPopupEntry.tPin})</span>
                    </div>
                  </div>
                </div>

                {isSearchingExaminer ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 size={32} className="animate-spin text-[#107c10]" />
                    <p className={`text-sm ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}`}>Consulting Examiner Database...</p>
                  </div>
                ) : searchResults ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    {/* Matching Logic Border Wrapper */}
                    <div className={`p-4 rounded-xl border-2 transition-colors duration-500 ${
                      (searchPopupEntry.nickName || '').trim().toLowerCase() === (searchResults.examinerName || '').trim().toLowerCase()
                        ? (isDarkMode ? 'border-[#4ade80]/30 bg-[#4ade80]/5' : 'border-[#107c10]/30 bg-[#107c10]/5')
                        : (isDarkMode ? 'border-red-500/30 bg-red-500/5' : 'border-red-500/30 bg-red-500/5')
                    }`}>
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                           <div className="flex-1">
                              <label className={`text-[10px] block font-bold uppercase ${isDarkMode ? 'text-[#64748b]' : 'text-[#94a3b8]'} mb-1`}>Registered Name (Only Display)</label>
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className={`text-md font-bold ${String(searchPopupEntry.nickName || '').trim().toLowerCase() === String(searchResults.examinerName || '').trim().toLowerCase() ? (isDarkMode ? 'text-[#4ade80]' : 'text-[#107c10]') : (isDarkMode ? 'text-red-400' : 'text-red-600')}`}>
                                  {searchResults.examinerName}
                                </span>
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-white/5 text-[#94a3b8]' : 'bg-gray-100 text-[#64748b]'}`}>
                                  T-Pin: {searchResults.tPin || searchPopupEntry.tPin}
                                </span>
                              </div>
                           </div>
                           {String(searchPopupEntry.nickName || '').trim().toLowerCase() === String(searchResults.examinerName || '').trim().toLowerCase() ? (
                             <div className={`px-2 py-1 rounded text-[10px] font-bold shrink-0 ${isDarkMode ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'bg-[#107c10]/20 text-[#107c10]'}`}>Matched ✔</div>
                           ) : (
                             <div className={`px-2 py-1 rounded text-[10px] font-bold shrink-0 ${isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'}`}>Mismatched ✖</div>
                           )}
                        </div>

                        <div className={`p-2 rounded-lg text-[11px] font-bold flex items-center justify-between ${
                          String(searchPopupEntry.tPin || '').trim().toLowerCase() === String(searchResults.tPin || '').trim().toLowerCase()
                            ? (isDarkMode ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'bg-[#107c10]/10 text-[#107c10]')
                            : (isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600')
                        }`}>
                          <span>Verify T-Pin Context:</span>
                          <span>{String(searchResults.tPin) === String(searchPopupEntry.tPin) ? 'Identifier Verified' : 'Identifier Mismatch'}</span>
                        </div>

                        <hr className={isDarkMode ? 'border-[#1a2333]' : 'border-gray-200'} />

                        <div className="grid grid-cols-1 gap-2.5">
                          <div className="flex justify-between items-center group">
                            <label className={`text-[11px] font-medium ${isDarkMode ? 'text-[#94a3b8]' : 'text-[#64748b]'}`}>Institute</label>
                            <span className={`text-[13px] font-semibold ${isDarkMode ? 'text-[#f1f5f9]' : 'text-[#334155]'}`}>{searchResults.institute}</span>
                          </div>
                          <div className="flex justify-between items-center group">
                            <label className={`text-[11px] font-medium ${isDarkMode ? 'text-[#94a3b8]' : 'text-[#64748b]'}`}>Department</label>
                            <span className={`text-[13px] font-semibold ${isDarkMode ? 'text-[#f1f5f9]' : 'text-[#334155]'}`}>{searchResults.department}</span>
                          </div>
                          <div className="flex justify-between items-center group">
                            <label className={`text-[11px] font-medium ${isDarkMode ? 'text-[#94a3b8]' : 'text-[#64748b]'}`}>Phone Number</label>
                            <span className={`text-[13px] font-semibold ${isDarkMode ? 'text-[#f1f5f9]' : 'text-[#334155]'}`}>{formatPhone(searchResults.phone)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={handleUpdateFromExaminer}
                      disabled={isUpdatingFromExaminer}
                      className="w-full mt-2 py-3 bg-[#107c10] hover:bg-[#0c610c] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#107c10]/20 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {isUpdatingFromExaminer ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                      Sync Attributes to Record
                    </button>
                    <p className={`text-[10px] text-center italic ${isDarkMode ? 'text-[#4b5563]' : 'text-[#94a3b8]'}`}>
                      * Syncing will update Institute, Dept, and Phone only.
                    </p>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center bg-red-500/5 rounded-xl border border-dashed border-red-500/20">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isDarkMode ? 'bg-[#1a2333]' : 'bg-gray-100'}`}>
                      <X size={24} className="text-red-500" />
                    </div>
                    <h4 className={`font-bold ${isDarkMode ? 'text-[#e2e8f0]' : 'text-[#2c3e50]'}`}>Examiner Not Found</h4>
                    <p className={`text-xs mt-1 px-4 ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}`}>
                      We couldn't locate an examiner profile for T-Pin "{searchPopupEntry.tPin}"
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
