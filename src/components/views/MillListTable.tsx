import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Edit2, Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';
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
}

export default function MillListTable({ millList, searchTerm, setSearchTerm, user, onRefresh, isDarkMode }: MillListTableProps) {
  const [filterInstitute, setFilterInstitute] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterComment, setFilterComment] = useState('');
  
  const [deletingEntry, setDeletingEntry] = useState<MillEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editingEntry, setEditingEntry] = useState<MillEntry | null>(null);
  const [editFormData, setEditFormData] = useState<MillEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const uniqueInstitutes = useMemo(() => Array.from(new Set(millList.map(item => item.institute || '').filter(Boolean))).sort(), [millList]);
  const uniqueDepartments = useMemo(() => Array.from(new Set(millList.map(item => item.department || '').filter(Boolean))).sort(), [millList]);
  const uniqueComments = useMemo(() => Array.from(new Set(millList.map(item => item.comment || '').filter(Boolean))).sort(), [millList]);

  // Determine permissions
  const canEdit = hasModulePerm(user, 'records', 'edit');
  const canDelete = hasModulePerm(user, 'records', 'delete');

  const filteredMillList = useMemo(() => {
    return millList.filter(entry => {
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
    });
  }, [millList, searchTerm, filterInstitute, filterDepartment, filterComment]);

  const formatDateString = (dateStr?: string) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    return isNaN(dateObj.getTime()) ? dateStr : dateObj.toDateString();
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

  return (
    <>
      <motion.div
        key="table"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col flex-grow h-0 gap-4"
      >
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
                  </div>
                  
                  {(canEdit || canDelete) && (
                    <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                      {canEdit && (
                        <button className={`p-2 rounded-md ${isDarkMode ? 'bg-[#1a2333] text-[#3b82f6]' : 'bg-[#ebf5ff] text-[#3498db]'}`} onClick={() => handleEditClick(entry)}><Edit2 size={16} /></button>
                      )}
                      {canDelete && (
                        <button className={`p-2 rounded-md ${isDarkMode ? 'bg-[#450a0a] text-[#f87171]' : 'bg-[#fdefed] text-[#e74c3c]'}`} onClick={() => setDeletingEntry(entry)}><Trash2 size={16} /></button>
                      )}
                    </div>
                  )}
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
                  <td className={`p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#e2e8f0]' : 'border-[#e1e8ed]'} whitespace-nowrap`}>{entry.institute}</td>
                  <td className={`p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#e2e8f0]' : 'border-[#e1e8ed]'} whitespace-nowrap`}>{entry.department}</td>
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
    </>
  );
}
