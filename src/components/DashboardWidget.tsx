"use client";

import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { Settings, X, Maximize2, Minimize2, MoreVertical, Move } from 'lucide-react';

interface WidgetProps {
  id: string;
  title: string;
  type: 'bar' | 'line' | 'pie' | 'stats' | 'table';
  data: any[];
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
  isEditing?: boolean;
  width?: number;
  height?: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#4C6FFF'];

export default function DashboardWidget({
  id,
  title,
  type,
  data,
  onRemove,
  onEdit,
  isEditing = false,
  width = 1,
  height = 1,
}: WidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const renderWidgetContent = () => {
    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              {Object.keys(data[0] || {}).filter(key => key !== 'name').map((key, index) => (
                <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              {Object.keys(data[0] || {}).filter(key => key !== 'name').map((key, index) => (
                <Line 
                  key={key} 
                  type="monotone" 
                  dataKey={key} 
                  stroke={COLORS[index % COLORS.length]} 
                  activeDot={{ r: 8 }} 
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius="80%"
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'stats':
        return (
          <div className="grid grid-cols-2 gap-2 h-full">
            {data.map((item, index) => (
              <div 
                key={index} 
                className="bg-white p-3 rounded-lg border border-gray-100 flex flex-col items-center justify-center"
              >
                <div className="text-xs text-gray-500">{item.label}</div>
                <div className="text-xl font-bold" style={{ color: COLORS[index % COLORS.length] }}>
                  {item.value}
                </div>
                {item.percentage !== undefined && (
                  <div className="text-xs text-green-600">
                    {item.percentage > 0 ? '+' : ''}{item.percentage}%
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case 'table':
        const headers = Object.keys(data[0] || {});
        return (
          <div className="overflow-auto h-full">
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  {headers.map(header => (
                    <th key={header} className="py-2 px-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    {headers.map(header => (
                      <td key={`${rowIndex}-${header}`} className="py-2 px-3 border-b border-gray-200 text-sm">
                        {row[header]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return <div className="flex items-center justify-center h-full">Unknown widget type</div>;
    }
  };

  return (
    <div 
      className={`bg-white rounded-xl shadow-sm overflow-hidden flex flex-col transition-all duration-300 
        ${isEditing ? 'border-2 border-dashed border-blue-400' : 'border border-gray-100'}
        ${isExpanded ? 'fixed inset-4 z-50' : 'relative'}`}
    >
      <div className={`flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100 ${isEditing ? 'cursor-move' : ''}`}>
        {isEditing && (
          <div className="p-1 mr-2 text-gray-400">
            <Move size={16} />
          </div>
        )}
        <h3 className="text-sm font-medium text-gray-700 flex-grow truncate">{title}</h3>
        <div className="flex items-center space-x-1">
          <button 
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button 
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreVertical size={16} />
          </button>
          {showMenu && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-10">
              <button 
                className="w-full text-left px-4 py-1 text-sm hover:bg-gray-50 flex items-center"
                onClick={() => {
                  setShowMenu(false);
                  onEdit(id);
                }}
              >
                <Settings size={14} className="mr-2" /> Edit Widget
              </button>
              <button 
                className="w-full text-left px-4 py-1 text-sm hover:bg-gray-50 text-red-500 flex items-center"
                onClick={() => {
                  setShowMenu(false);
                  onRemove(id);
                }}
              >
                <X size={14} className="mr-2" /> Remove Widget
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-grow p-4 h-[calc(100%-40px)]">
        {renderWidgetContent()}
      </div>
    </div>
  );
}
