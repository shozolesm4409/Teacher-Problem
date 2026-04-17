import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Plus, Edit2, Trash2, X, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { CommentOption, User } from '../../types';
import { api } from '../../lib/api';
import { hasModulePerm } from '../../lib/permissions';

interface CommentsPanelProps {
  comments: CommentOption[];
  onUpdate: () => void;
  user: User;
  isDarkMode?: boolean;
}

export default function CommentsPanel({ comments, onUpdate, user, isDarkMode }: CommentsPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingComment, setEditingComment] = useState<CommentOption | null>(null);
  const [deletingComment, setDeletingComment] = useState<CommentOption | null>(null);
  
  const [formData, setFormData] = useState<Partial<CommentOption>>({ comment: '', rm: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canCreate = hasModulePerm(user, 'comments', 'create');
  const canEdit = hasModulePerm(user, 'comments', 'edit');
  const canDelete = hasModulePerm(user, 'comments', 'delete');

  const labelClass = `text-[12px] font-semibold ${isDarkMode ? 'text-[#94a3b8]' : 'text-[#7f8c8d]'}`;
  const inputClass = `p-[10px] border rounded-[6px] text-[14px] outline-none transition-all duration-200 ${
    isDarkMode 
      ? 'bg-[#111827] border-[#334155] text-white focus:border-[#4ade80] placeholder:text-[#4b5563]' 
      : 'bg-white border-[#e1e8ed] text-[#2c3e50] focus:border-[#107c10]'
  }`;

  const handleAddSubmit = async () => {
    if (!formData.comment) return;
    setIsSaving(true);
    try {
      const commentData = {
        ...formData,
        creatorDate: new Date().toISOString(),
        creatorName: user?.fullName || 'System',
        creatorUserId: user?.userId || 'system'
      };
      const res = await api.addComment(commentData as Omit<CommentOption, 'sl'>);
      if (res.success) {
        onUpdate();
        setIsAdding(false);
        setFormData({ comment: '', rm: '' });
      } else {
        alert('Failed to add comment: ' + res.error);
      }
    } catch (err) {
      alert('Network error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editingComment || !formData.comment) return;
    setIsSaving(true);
    try {
      const updateData = {
        ...editingComment,
        ...formData,
        updatorDate: new Date().toISOString(),
        updatorName: user?.fullName || 'System',
        updatorUserId: user?.userId || 'system'
      };
      const res = await api.updateComment(updateData as CommentOption);
      if (res.success) {
        onUpdate();
        setEditingComment(null);
      } else {
        alert('Failed to update comment: ' + res.error);
      }
    } catch (err) {
      alert('Network error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const executeDelete = async () => {
    if (!deletingComment) return;
    setIsDeleting(true);
    try {
      const res = await api.deleteComment(deletingComment.sl);
      if (res.success) {
        onUpdate();
        setDeletingComment(null);
      } else {
        alert('Failed to delete comment: ' + res.error);
      }
    } catch (err) {
      alert('Network error occurred.');
    } finally {
      setIsDeleting(false);
    }
  };

  const openEdit = (comment: CommentOption) => {
    setEditingComment(comment);
    setFormData({ comment: comment.comment, rm: comment.rm });
  };

  return (
    <>
      <motion.div
        key="comments-panel"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col gap-6"
      >
        <div className={`p-[24px] rounded-[12px] border ${isDarkMode ? 'bg-[#0d121c] border-[#1a2333]' : 'bg-white border-[#e1e8ed]'} shadow-sm transition-colors duration-300`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="text-[#f39c12]" size={24} />
              <div>
                <h2 className={`text-[18px] font-bold ${isDarkMode ? 'text-[#f8fafc]' : 'text-[#2c3e50]'}`}>Manage Comments</h2>
                <p className={`text-[13px] ${isDarkMode ? 'text-[#94a3b8]' : 'text-[#7f8c8d]'}`}>Add, edit, or remove comment categories used in the form.</p>
              </div>
            </div>
            {canCreate && (
              <button 
                onClick={() => { setIsAdding(true); setFormData({ comment: '', rm: '' }); }}
                className={`px-4 py-2 rounded-lg font-medium text-[14px] transition-colors flex items-center justify-center gap-2 ${
                  isDarkMode ? 'bg-[#4ade80] text-[#064e3b] hover:bg-[#22c55e]' : 'bg-[#107c10] text-white hover:bg-[#0c610c]'
                }`}
              >
                <Plus size={16} />
                Add Comment
              </button>
            )}
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden flex flex-col gap-3">
            {comments.length === 0 ? (
              <div className={`p-[24px] text-center ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}`}>No comments found. Add your first comment category.</div>
            ) : (
              comments.map((c, i) => (
                <div key={i} className={`p-4 rounded-xl border ${isDarkMode ? 'bg-[#0d121c] border-[#1a2333]' : 'bg-white border-[#e1e8ed]'} shadow-sm flex justify-between items-center`}>
                    <div className="flex flex-col gap-1">
                      <span className={`font-semibold ${isDarkMode ? 'text-[#e2e8f0]' : 'text-[#2c3e50]'}`}>{c.comment}</span>
                      <span className={`text-[12px] ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}`}>{c.rm || 'No Remarks'}</span>
                    </div>
                    {(canEdit || canDelete) && (
                      <div className="flex gap-1">
                        {canEdit && (
                          <button onClick={() => openEdit(c)} className={`p-2 rounded-md ${isDarkMode ? 'bg-[#1a2333] text-[#3b82f6]' : 'bg-[#ebf5ff] text-[#3498db]'}`}><Edit2 size={16} /></button>
                        )}
                        {canDelete && (
                          <button onClick={() => setDeletingComment(c)} className={`p-2 rounded-md ${isDarkMode ? 'bg-[#450a0a] text-[#f87171]' : 'bg-[#fdefed] text-[#e74c3c]'}`}><Trash2 size={16} /></button>
                        )}
                      </div>
                    )}
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto p-1">
            <table className="w-full border-collapse text-[14px] min-w-max">
              <thead>
                <tr className={`${isDarkMode ? 'bg-[#1a2333] border-[#334155]' : 'bg-[#fafbfc] border-[#e1e8ed]'} border-y`}>
                  <th className={`text-left p-2 font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'} whitespace-nowrap`}>SL</th>
                  <th className={`text-left p-2 font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'} whitespace-nowrap`}>Comment Statement</th>
                  <th className={`text-left p-2 font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'} whitespace-nowrap`}>RM (Remarks)</th>
                  <th className={`text-right p-2 font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'} whitespace-nowrap`}>Actions</th>
                  {user?.role === 'Admin' && (
                    <>
                      <th className={`text-left p-1 font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'} whitespace-nowrap`}>Creator Date</th>
                      <th className={`text-left p-1 font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'} whitespace-nowrap`}>Creator</th>
                      <th className={`text-left p-1 font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'} whitespace-nowrap`}>Creator ID</th>
                      <th className={`text-left p-1 font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'} whitespace-nowrap`}>Updator Date</th>
                      <th className={`text-left p-1 font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'} whitespace-nowrap`}>Updator</th>
                      <th className={`text-left p-1 font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'} whitespace-nowrap`}>Updator ID</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {comments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={`p-[24px] text-center ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}`}>No comments found. Add your first comment category.</td>
                  </tr>
                ) : (
                  comments.map((c, i) => (
                    <tr key={i} className={`${isDarkMode ? 'hover:bg-[#1a2333] border-[#1a2333]' : 'hover:bg-[#f4f7f6] border-[#e1e8ed]'} transition-colors border-b last:border-b-0 group`}>
                      <td className={`p-2 ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'} whitespace-nowrap`}>{c.sl}</td>
                      <td className={`p-2 font-medium ${isDarkMode ? 'text-[#e2e8f0]' : 'text-[#2c3e50]'} whitespace-nowrap`}>{c.comment}</td>
                      <td className={`p-2 ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'} whitespace-nowrap`}>{c.rm || '-'}</td>
                      <td className="p-2 text-right">
                        <div className="flex items-center justify-end gap-2 transition-opacity">
                          {canEdit && (
                            <button 
                              onClick={() => openEdit(c)}
                              className={`p-1.5 ${isDarkMode ? 'text-[#3b82f6] hover:bg-[#1e293b]' : 'text-[#3498db] hover:bg-[#ebf5ff]'} rounded-md transition-colors`}
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                          {canDelete && (
                            <button 
                              onClick={() => setDeletingComment(c)}
                              className={`p-1.5 ${isDarkMode ? 'text-[#f87171] hover:bg-[#450a0a]' : 'text-[#e74c3c] hover:bg-[#fdefed]'} rounded-md transition-colors`}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                      {user?.role === 'Admin' && (
                        <>
                          <td className={`p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} whitespace-nowrap`}>{c.creatorDate ? new Date(c.creatorDate).toLocaleDateString() : '-'}</td>
                          <td className={`p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} whitespace-nowrap`}>{c.creatorName || '-'}</td>
                          <td className={`p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} whitespace-nowrap`}>{c.creatorUserId || '-'}</td>
                          <td className={`p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} whitespace-nowrap`}>{c.updatorDate ? new Date(c.updatorDate).toLocaleDateString() : '-'}</td>
                          <td className={`p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} whitespace-nowrap`}>{c.updatorName || '-'}</td>
                          <td className={`p-2 border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} whitespace-nowrap`}>{c.updatorUserId || '-'}</td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {(isAdding || editingComment) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isSaving && (setIsAdding(false), setEditingComment(null))}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-xl shadow-xl overflow-hidden"
            >
              <div className={`flex items-center justify-between p-5 border-b ${isDarkMode ? 'border-[#1a2333] bg-[#0a0e17]' : 'border-[#e1e8ed] bg-[#fafbfc]'}`}>
                <h3 className={`text-[18px] font-bold ${isDarkMode ? 'text-[#e2e8f0]' : 'text-[#2c3e50]'}`}>
                  {isAdding ? 'Add New Comment' : 'Edit Comment'}
                </h3>
                <button 
                  onClick={() => !isSaving && (setIsAdding(false), setEditingComment(null))}
                  disabled={isSaving}
                  className={`w-8 h-8 flex items-center justify-center ${isDarkMode ? 'text-[#a0aec0] hover:bg-[#1a2333]' : 'text-[#7f8c8d] hover:bg-[#e1e8ed]'} rounded-full transition-colors disabled:opacity-50`}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className={`text-[12px] font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}`}>Comment Statement <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={formData.comment || ''}
                      onChange={(e) => setFormData({...formData, comment: e.target.value})}
                      placeholder="e.g. Good Quality, Payment Pending..."
                      className={`p-[10px] border ${isDarkMode ? 'bg-[#0d121c] border-[#334155] text-[#e2e8f0] focus:border-[#107c10]' : 'border-[#e1e8ed] text-[#2c3e50] focus:border-[#107c10]'} rounded-[6px] text-[14px] outline-none`}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={`text-[12px] font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}`}>RM (Remarks)</label>
                    <input 
                      type="text" 
                      value={formData.rm || ''}
                      onChange={(e) => setFormData({...formData, rm: e.target.value})}
                      placeholder="Any additional remarks..."
                      className={`p-[10px] border ${isDarkMode ? 'bg-[#0d121c] border-[#334155] text-[#e2e8f0] focus:border-[#107c10]' : 'border-[#e1e8ed] text-[#2c3e50] focus:border-[#107c10]'} rounded-[6px] text-[14px] outline-none`}
                    />
                  </div>
                </div>
              </div>

              <div className={`p-5 border-t ${isDarkMode ? 'border-[#1a2333] bg-[#0a0e17]' : 'border-[#e1e8ed] bg-[#fafbfc]'} flex justify-end gap-3`}>
                <button 
                  onClick={() => (setIsAdding(false), setEditingComment(null))}
                  disabled={isSaving}
                  className={`px-4 py-2 border ${isDarkMode ? 'border-[#334155] text-[#a0aec0] hover:bg-[#1a2333]' : 'border-[#e1e8ed] text-[#7f8c8d] hover:bg-[#f4f7f6]'} rounded-md font-medium text-[14px] disabled:opacity-50`}
                >
                  Cancel
                </button>
                <button 
                  onClick={isAdding ? handleAddSubmit : handleEditSubmit}
                  disabled={isSaving || !formData.comment}
                  className="px-4 py-2 bg-[#107c10] text-white rounded-md font-medium text-[14px] hover:bg-[#0c610c] flex items-center gap-2 relative overflow-hidden disabled:bg-[#075c07]"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingComment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isDeleting && setDeletingComment(null)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-xl shadow-xl overflow-hidden"
            >
              <div className={`flex items-center justify-between p-5 border-b ${isDarkMode ? 'border-[#1a2333] bg-[#0a0e17]' : 'border-[#e1e8ed] bg-[#fafbfc]'}`}>
                <div className="flex items-center gap-3 text-[#e74c3c]">
                    <AlertTriangle size={24} />
                    <h3 className={`text-[18px] font-bold ${isDarkMode ? 'text-[#e2e8f0]' : 'text-[#2c3e50]'}`}>Confirm Delete</h3>
                </div>
                <button 
                  onClick={() => !isDeleting && setDeletingComment(null)}
                  disabled={isDeleting}
                  className={`w-8 h-8 flex items-center justify-center ${isDarkMode ? 'text-[#a0aec0] hover:bg-[#1a2333]' : 'text-[#7f8c8d] hover:bg-[#e1e8ed]'} rounded-full transition-colors disabled:opacity-50`}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6">
                <p className={`text-sm mb-3 ${isDarkMode ? 'text-[#e2e8f0]' : 'text-[#2c3e50]'}`}>
                  Are you sure you want to delete the comment category: <span className="font-bold text-[#e74c3c]">{deletingComment.comment}</span>?
                </p>
                <p className={`text-[12px] ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}`}>
                  This action cannot be undone.
                </p>
              </div>

              <div className={`p-5 border-t ${isDarkMode ? 'border-[#1a2333] bg-[#0a0e17]' : 'border-[#e1e8ed] bg-[#fafbfc]'} flex justify-end gap-3`}>
                <button 
                  onClick={() => setDeletingComment(null)}
                  disabled={isDeleting}
                  className={`px-4 py-2 border ${isDarkMode ? 'border-[#334155] text-[#a0aec0] hover:bg-[#1a2333]' : 'border-[#e1e8ed] text-[#7f8c8d] hover:bg-[#f4f7f6]'} rounded-md font-medium text-[14px] disabled:opacity-50`}
                >
                  Cancel
                </button>
                <button 
                  onClick={executeDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-[#e74c3c] text-white rounded-md font-medium text-[14px] hover:bg-[#c0392b] flex items-center gap-2 relative overflow-hidden disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
