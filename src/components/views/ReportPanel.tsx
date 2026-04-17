import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MillEntry } from '../../types';

interface ReportPanelProps {
  millList: MillEntry[];
}

const COLORS = ['#107c10', '#e67e22', '#3498db', '#9b59b6', '#e74c3c', '#2c3e50', '#1abc9c', '#f1c40f', '#006644', '#7f8c8d'];

export default function ReportPanel({ millList, isDarkMode }: ReportPanelProps & { isDarkMode?: boolean }) {
  // Calculate analytics based on comments
  const reportData = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = millList.length;

    millList.forEach(entry => {
      const c = entry.comment && entry.comment.trim() !== '' ? entry.comment : 'No Comment';
      counts[c] = (counts[c] || 0) + 1;
    });

    // Sort by count descending and format into array for charts
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
      }));

    return { total, details: sorted };
  }, [millList]);

  return (
    <motion.div
      key="report"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-6 rounded-[12px] border ${isDarkMode ? 'bg-[#0d121c] border-[#1a2333]' : 'bg-white border-[#e1e8ed]'} flex flex-col justify-center items-center gap-2 shadow-sm`}>
          <div className={`text-[14px] font-semibold ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'} uppercase tracking-wider`}>Total Records</div>
          <div className="text-[48px] font-bold text-[#107c10] leading-none">{reportData.total}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart Section */}
        <div className={`rounded-[12px] border ${isDarkMode ? 'bg-[#0d121c] border-[#1a2333]' : 'bg-white border-[#e1e8ed]'} shadow-sm flex flex-col items-center justify-center p-6 min-h-[350px]`}>
          <h2 className={`text-[16px] font-bold ${isDarkMode ? 'text-[#e2e8f0]' : 'text-[#2c3e50]'} mb-4 w-full text-center`}>Comment Distribution</h2>
          <div className="w-full h-[300px]">
            {reportData.details.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reportData.details}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {reportData.details.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string, props: any) => [`${value} (${props.payload.percentage}%)`, name]}
                    contentStyle={{ borderRadius: '8px', border: isDarkMode ? '1px solid #1a2333' : '1px solid #e1e8ed', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', backgroundColor: isDarkMode ? '#0d121c' : '#ffffff', color: isDarkMode ? '#e2e8f0' : '#2c3e50' }}
                  />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px', color: isDarkMode ? '#a0aec0' : '#7f8c8d' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className={`flex items-center justify-center h-full ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}`}>No data to display</div>
            )}
          </div>
        </div>

        {/* Table Section */}
        <div className={`rounded-[12px] border ${isDarkMode ? 'bg-[#0d121c] border-[#1a2333]' : 'bg-white border-[#e1e8ed]'} overflow-hidden shadow-sm flex flex-col`}>
          <div className={`p-[20px] border-b ${isDarkMode ? 'border-[#1a2333] bg-[#0a0e17]' : 'border-[#e1e8ed] bg-[#fafbfc]'}`}>
            <h2 className={`text-[16px] font-bold ${isDarkMode ? 'text-[#e2e8f0]' : 'text-[#2c3e50]'}`}>Records by Category (Comment)</h2>
          </div>
          <div className="p-0 overflow-x-auto flex-grow">
            <table className="w-full border-collapse text-[14px]">
              <thead>
                <tr>
                  <th className={`text-left p-[16px_20px] border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} font-semibold w-1/2`}>Category / Comment</th>
                  <th className={`text-right p-[16px_20px] border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} font-semibold w-1/4`}>Count</th>
                  <th className={`text-right p-[16px_20px] border-b ${isDarkMode ? 'border-[#1a2333] text-[#a0aec0]' : 'border-[#e1e8ed] text-[#7f8c8d]'} font-semibold w-1/4`}>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {reportData.details.map((item, idx) => (
                  <tr key={idx} className={`${isDarkMode ? 'hover:bg-[#1a2333]' : 'hover:bg-[#f4f7f6]'} transition-colors border-b ${isDarkMode ? 'border-[#1a2333]' : 'border-[#e1e8ed]'}`}>
                    <td className={`p-[16px_20px] ${isDarkMode ? 'text-[#e2e8f0]' : 'text-[#2c3e50]'} font-medium flex items-center gap-3`}>
                      <span 
                        className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" 
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      ></span>
                      <span className={`px-[10px] py-[4px] ${isDarkMode ? 'bg-[#003d29] text-[#34d399] border-[#34d399]/20' : 'bg-[#e3fcef] text-[#006644] border-[#006644]/20'} rounded-[6px] text-[12px] font-semibold border inline-block`}>
                        {item.name}
                      </span>
                    </td>
                    <td className={`p-[16px_20px] text-right ${isDarkMode ? 'text-[#e2e8f0]' : 'text-[#2c3e50]'} font-bold text-[16px]`}>
                      {item.value}
                    </td>
                    <td className={`p-[16px_20px] text-right ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'} font-medium text-[15px]`}>
                      {item.percentage}%
                    </td>
                  </tr>
                ))}
                {reportData.details.length === 0 && (
                  <tr>
                    <td colSpan={3} className={`p-8 text-center ${isDarkMode ? 'text-[#a0aec0]' : 'text-[#7f8c8d]'}`}>No data available to generate report.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
