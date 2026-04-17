import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, Save } from 'lucide-react';
import { api } from '../../lib/api';
import { CommentOption, User as AppUser } from '../../types';

interface NewEntryFormProps {
  comments: CommentOption[];
  user: AppUser | null;
  onSuccess: () => void;
  isDarkMode?: boolean;
}

export default function NewEntryForm({ comments, user, onSuccess, isDarkMode }: NewEntryFormProps) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    tPin: '',
    nickName: '',
    institute: '',
    department: '',
    comment: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const entryData = {
        ...formData,
        creatorDate: new Date().toISOString(),
        creatorName: user?.fullName || 'System',
        creatorUserId: user?.userId || 'system'
      };
      const res = await api.addMillEntry(entryData);
      if (res.success) {
        setFormData({ 
          date: new Date().toISOString().split('T')[0], 
          tPin: '', 
          nickName: '', 
          institute: '', 
          department: '', 
          comment: '' 
        });
        onSuccess();
        alert('Entry Added Successfully!');
      } else {
        alert('Failed: ' + res.error);
      }
    } catch (err) {
      alert('Error saving data');
    } finally {
      setLoading(false);
    }
  };

  const labelClass = `text-[12px] font-semibold ${isDarkMode ? 'text-[#94a3b8]' : 'text-[#7f8c8d]'}`;
  const inputClass = `p-[10px] border rounded-[6px] text-[14px] outline-none transition-all duration-200 ${
    isDarkMode 
      ? 'bg-[#111827] border-[#334155] text-white focus:border-[#4ade80] placeholder:text-[#4b5563]' 
      : 'bg-white border-[#e1e8ed] text-[#2c3e50] focus:border-[#107c10]'
  }`;

  return (
    <motion.div
      key="form"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={`${isDarkMode ? 'bg-[#0d121c] border-[#1a2333]' : 'bg-white border-[#e1e8ed]'} p-6 rounded-xl border flex-shrink-0 transition-colors duration-300`}
    >
      <h2 className={`text-[18px] font-bold mb-4 ${isDarkMode ? 'text-[#f8fafc]' : 'text-[#2c3e50]'}`}>New Entry</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex flex-col gap-1.5 col-span-2 md:col-span-1">
          <label className={labelClass}>Date</label>
          <input 
            required
            type="date" 
            value={formData.date}
            onChange={(e) => setFormData({...formData, date: e.target.value})}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5 col-span-1">
          <label className={labelClass}>T-Pin Identifier</label>
          <input 
            required
            type="text" 
            value={formData.tPin}
            onChange={(e) => setFormData({...formData, tPin: e.target.value})}
            placeholder="Enter T-Pin"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5 col-span-1">
          <label className={labelClass}>Subject Alias (Nick Name)</label>
          <input 
            required
            type="text" 
            value={formData.nickName}
            onChange={(e) => setFormData({...formData, nickName: e.target.value})}
            placeholder="Enter Nick Name"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5 col-span-2 md:col-span-1">
          <label className={labelClass}>Categorical Comment</label>
          <select 
            required
            value={formData.comment}
            onChange={(e) => setFormData({...formData, comment: e.target.value})}
            className={inputClass}
          >
            <option value="">Select Status...</option>
            {comments.map((c, idx) => (
              <option key={idx} value={c.comment}>{c.comment}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2 md:col-span-4 mt-2">
          <button 
            type="submit"
            disabled={loading}
            className={`w-full p-3 rounded-[6px] font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
              isDarkMode 
                ? 'bg-[#4ade80] text-[#064e3b] hover:bg-[#22c55e]' 
                : 'bg-[#107c10] text-white hover:bg-[#0c610c]'
            }`}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Push to Google Sheet
          </button>
        </div>
      </form>
    </motion.div>
  );
}
