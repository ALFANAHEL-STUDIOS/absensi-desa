"use client";

import React, { useState, useEffect } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import DashboardWidget from './DashboardWidget';
import { PlusCircle, BarChart2, LineChart, PieChart, Table, FileBarChart2 } from 'lucide-react';

// Apply responsive capabilities to the grid layout
const ResponsiveGridLayout = WidthProvider(Responsive);

// Define widget types
const widgetTypes = [
  { id: 'bar', name: 'Bar Chart', icon: <BarChart2 size={18} /> },
  { id: 'line', name: 'Line Chart', icon: <LineChart size={18} /> },
  { id: 'pie', name: 'Pie Chart', icon: <PieChart size={18} /> },
  { id: 'stats', name: 'Statistics', icon: <FileBarChart2 size={18} /> },
  { id: 'table', name: 'Table', icon: <Table size={18} /> },
];

// Sample data for different widget types
const sampleData = {
  bar: [
    { name: 'Jan', hadir: 100, sakit: 30, izin: 20, alpha: 10 },
    { name: 'Feb', hadir: 120, sakit: 25, izin: 15, alpha: 8 },
    { name: 'Mar', hadir: 115, sakit: 20, izin: 25, alpha: 12 },
    { name: 'Apr', hadir: 130, sakit: 15, izin: 10, alpha: 5 },
    { name: 'May', hadir: 125, sakit: 20, izin: 15, alpha: 7 }
  ],
  line: [
    { name: 'Week 1', hadir: 92, sakit: 4, izin: 2, alpha: 2 },
    { name: 'Week 2', hadir: 90, sakit: 5, izin: 3, alpha: 2 },
    { name: 'Week 3', hadir: 93, sakit: 3, izin: 2, alpha: 2 },
    { name: 'Week 4', hadir: 95, sakit: 3, izin: 1, alpha: 1 },
  ],
  pie: [
    { name: 'Hadir', value: 85 },
    { name: 'Sakit', value: 7 },
    { name: 'Izin', value: 5 },
    { name: 'Alpha', value: 3 },
  ],
  stats: [
    { label: 'Total Siswa', value: 350, percentage: 5 },
    { label: 'Total Kelas', value: 12, percentage: 0 },
    { label: 'Kehadiran', value: '94%', percentage: 2 },
    { label: 'Guru Aktif', value: 24, percentage: 2 }
  ],
  table: [
    { nama: 'Ahmad Farhan', kelas: 'IX-A', status: 'Hadir', waktu: '07:15' },
    { nama: 'Siti Aisyah', kelas: 'VIII-B', status: 'Hadir', waktu: '07:20' },
    { nama: 'Budi Santoso', kelas: 'VII-A', status: 'Sakit', waktu: '-' },
    { nama: 'Dewi Anggraini', kelas: 'IX-B', status: 'Hadir', waktu: '07:05' },
  ]
};

// Default widget layouts for different screen sizes
const defaultLayouts = {
  lg: [
    { i: 'stats-1', x: 0, y: 0, w: 4, h: 2, type: 'stats' },
    { i: 'bar-1', x: 4, y: 0, w: 8, h: 4, type: 'bar' },
    { i: 'pie-1', x: 0, y: 2, w: 4, h: 4, type: 'pie' },
    { i: 'line-1', x: 0, y: 6, w: 6, h: 4, type: 'line' },
    { i: 'table-1', x: 6, y: 6, w: 6, h: 4, type: 'table' },
  ],
  md: [
    { i: 'stats-1', x: 0, y: 0, w: 4, h: 2, type: 'stats' },
    { i: 'bar-1', x: 4, y: 0, w: 4, h: 4, type: 'bar' },
    { i: 'pie-1', x: 0, y: 2, w: 4, h: 4, type: 'pie' },
    { i: 'line-1', x: 0, y: 6, w: 4, h: 4, type: 'line' },
    { i: 'table-1', x: 4, y: 4, w: 4, h: 4, type: 'table' },
  ],
  sm: [
    { i: 'stats-1', x: 0, y: 0, w: 6, h: 2, type: 'stats' },
    { i: 'bar-1', x: 0, y: 2, w: 6, h: 4, type: 'bar' },
    { i: 'pie-1', x: 0, y: 6, w: 6, h: 4, type: 'pie' },
    { i: 'line-1', x: 0, y: 10, w: 6, h: 4, type: 'line' },
    { i: 'table-1', x: 0, y: 14, w: 6, h: 4, type: 'table' },
  ],
};

// Widget titles
const defaultWidgetTitles = {
  'stats-1': 'Statistik Kehadiran',
  'bar-1': 'Kehadiran Bulanan',
  'pie-1': 'Distribusi Kehadiran',
  'line-1': 'Tren Kehadiran',
  'table-1': 'Data Kehadiran Terkini',
};

interface DynamicDashboardProps {
  userRole: string | null;
  schoolId: string | null;
}

export default function DynamicDashboard({ userRole, schoolId }: DynamicDashboardProps) {
  // State for layouts
  const [layouts, setLayouts] = useState(() => {
    // Try to load from localStorage first
    if (typeof window !== 'undefined') {
      const savedLayouts = localStorage.getItem(`dashboard-layout-${userRole}`);
      return savedLayouts ? JSON.parse(savedLayouts) : defaultLayouts;
    }
    return defaultLayouts;
  });

  // State for widgets
  const [widgets, setWidgets] = useState<any[]>(() => {
    // Initialize widgets from layouts
    return Object.values(layouts.lg || {}).map((item: any) => ({
      id: item.i,
      type: item.type,
      title: defaultWidgetTitles[item.i] || `Widget ${item.i}`,
      data: sampleData[item.type] || []
    }));
  });

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  // Widget being edited
  const [editingWidget, setEditingWidget] = useState<string | null>(null);
  // Add widget modal state
  const [showAddWidgetModal, setShowAddWidgetModal] = useState(false);
  // New widget type
  const [newWidgetType, setNewWidgetType] = useState('bar');

  // Save layouts to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`dashboard-layout-${userRole}`, JSON.stringify(layouts));
    }
  }, [layouts, userRole]);

  // Handle layout change
  const handleLayoutChange = (currentLayout: any, allLayouts: any) => {
    setLayouts(allLayouts);
  };

  // Add a new widget
  const addWidget = (type: string) => {
    const newWidgetId = `${type}-${Date.now()}`;
    const newWidget = {
      id: newWidgetId,
      type,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Chart`,
      data: sampleData[type] || []
    };

    // Add the widget to the state
    setWidgets([...widgets, newWidget]);

    // Add the widget to layouts
    const newLayouts = { ...layouts };
    Object.keys(newLayouts).forEach(breakpoint => {
      const lastWidget = [...newLayouts[breakpoint]].sort((a, b) => (b.y + b.h) - (a.y + a.h))[0];
      const y = lastWidget ? lastWidget.y + lastWidget.h : 0;
      
      let w = 6;
      let h = 4;
      if (type === 'stats') {
        h = 2;
      }
      
      newLayouts[breakpoint] = [
        ...newLayouts[breakpoint],
        { i: newWidgetId, x: 0, y, w, h, type }
      ];
    });
    
    setLayouts(newLayouts);
    setShowAddWidgetModal(false);
  };

  // Remove a widget
  const removeWidget = (id: string) => {
    // Remove from widgets state
    setWidgets(widgets.filter(widget => widget.id !== id));
    
    // Remove from layouts
    const newLayouts = { ...layouts };
    Object.keys(newLayouts).forEach(breakpoint => {
      newLayouts[breakpoint] = newLayouts[breakpoint].filter(item => item.i !== id);
    });
    setLayouts(newLayouts);
  };

  // Edit a widget
  const editWidget = (id: string) => {
    setEditingWidget(id);
  };

  // Reset to default layout
  const resetLayout = () => {
    setLayouts(defaultLayouts);
    setWidgets(Object.values(defaultLayouts.lg).map((item: any) => ({
      id: item.i,
      type: item.type,
      title: defaultWidgetTitles[item.i] || `Widget ${item.i}`,
      data: sampleData[item.type] || []
    })));
  };

  return (
    <div className="pb-4">
      {/* Dashboard Controls */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-2 justify-between items-center">
        <h2 className="text-lg font-semibold">Dashboard Kustom</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              isEditMode 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isEditMode ? 'Simpan Perubahan' : 'Edit Dashboard'}
          </button>
          
          {isEditMode && (
            <>
              <button 
                onClick={() => setShowAddWidgetModal(true)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium flex items-center gap-1"
              >
                <PlusCircle size={16} />
                <span>Tambah Widget</span>
              </button>
              
              <button 
                onClick={resetLayout}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium"
              >
                Reset Layout
              </button>
            </>
          )}
        </div>
      </div>

      {/* Grid Layout */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 min-h-[600px]">
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 8, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={70}
          onLayoutChange={handleLayoutChange}
          isDraggable={isEditMode}
          isResizable={isEditMode}
          compactType="vertical"
          margin={[16, 16]}
        >
          {widgets.map(widget => (
            <div key={widget.id}>
              <DashboardWidget
                id={widget.id}
                title={widget.title}
                type={widget.type}
                data={widget.data}
                onRemove={removeWidget}
                onEdit={editWidget}
                isEditing={isEditMode}
              />
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>

      {/* Add Widget Modal */}
      {showAddWidgetModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Add New Widget</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Widget Type</label>
              <div className="grid grid-cols-2 gap-2">
                {widgetTypes.map(type => (
                  <button
                    key={type.id}
                    className={`p-3 rounded-lg border flex items-center gap-2 transition-colors ${
                      newWidgetType === type.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setNewWidgetType(type.id)}
                  >
                    <span className={`${newWidgetType === type.id ? 'text-blue-500' : 'text-gray-500'}`}>
                      {type.icon}
                    </span>
                    <span className={`${newWidgetType === type.id ? 'font-medium' : ''}`}>
                      {type.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowAddWidgetModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={() => addWidget(newWidgetType)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Add Widget
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Widget Modal */}
      {editingWidget && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit Widget</h3>
            
            <div className="mb-4">
              <label htmlFor="widget-title" className="block text-sm font-medium mb-1">Widget Title</label>
              <input
                id="widget-title"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                value={widgets.find(w => w.id === editingWidget)?.title || ''}
                onChange={(e) => {
                  setWidgets(widgets.map(w => 
                    w.id === editingWidget ? { ...w, title: e.target.value } : w
                  ));
                }}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setEditingWidget(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={() => setEditingWidget(null)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
