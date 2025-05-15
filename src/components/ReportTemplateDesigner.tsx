"use client";

import React, { useState, useEffect } from "react";
import { 
  Save, 
  Plus, 
  Trash2, 
  MoveUp, 
  MoveDown, 
  Layout, 
  BarChart2, 
  PieChart,
  CheckCircle,
  Loader2,
  X
} from "lucide-react";
import { motion } from "framer-motion";

interface ReportTemplateDesignerProps {
  initialTemplate?: any;
  onSave: (templateData: any) => void;
  onCancel: () => void;
  saving: boolean;
  saveSuccess: boolean;
}

const availableFields = [
  { id: "studentName", label: "Nama Siswa" },
  { id: "class", label: "Kelas" },
  { id: "attendance", label: "Kehadiran" },
  { id: "date", label: "Tanggal" },
  { id: "time", label: "Waktu" },
  { id: "status", label: "Status" },
  { id: "note", label: "Catatan" }
];

const layoutOptions = [
  { id: "standard", label: "Standar" },
  { id: "compact", label: "Kompak" },
  { id: "detailed", label: "Detail" }
];

export default function ReportTemplateDesigner({
  initialTemplate,
  onSave,
  onCancel,
  saving,
  saveSuccess
}: ReportTemplateDesignerProps) {
  const [templateData, setTemplateData] = useState({
    name: "",
    description: "",
    fields: [] as string[],
    layout: "standard",
    includeCharts: true,
    includeStatistics: true
  });
  
  // Initialize with initial template data if provided
  useEffect(() => {
    if (initialTemplate) {
      setTemplateData({
        name: initialTemplate.name || "",
        description: initialTemplate.description || "",
        fields: initialTemplate.fields || [],
        layout: initialTemplate.layout || "standard",
        includeCharts: initialTemplate.includeCharts !== undefined ? initialTemplate.includeCharts : true,
        includeStatistics: initialTemplate.includeStatistics !== undefined ? initialTemplate.includeStatistics : true
      });
    }
  }, [initialTemplate]);
  
  // Handle text input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTemplateData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle checkbox changes
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setTemplateData(prev => ({
      ...prev,
      [name]: checked
    }));
  };
  
  // Handle select changes
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTemplateData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Add a field to the template
  const addField = (fieldId: string) => {
    if (!templateData.fields.includes(fieldId)) {
      setTemplateData(prev => ({
        ...prev,
        fields: [...prev.fields, fieldId]
      }));
    }
  };
  
  // Remove a field from the template
  const removeField = (fieldId: string) => {
    setTemplateData(prev => ({
      ...prev,
      fields: prev.fields.filter(id => id !== fieldId)
    }));
  };
  
  // Move a field up in the order
  const moveFieldUp = (index: number) => {
    if (index > 0) {
      const newFields = [...templateData.fields];
      [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
      setTemplateData(prev => ({
        ...prev,
        fields: newFields
      }));
    }
  };
  
  // Move a field down in the order
  const moveFieldDown = (index: number) => {
    if (index < templateData.fields.length - 1) {
      const newFields = [...templateData.fields];
      [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
      setTemplateData(prev => ({
        ...prev,
        fields: newFields
      }));
    }
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(templateData);
  };
  
  // Get field label by ID
  const getFieldLabel = (fieldId: string) => {
    const field = availableFields.find(f => f.id === fieldId);
    return field ? field.label : fieldId;
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Template Information */}
        <div>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nama Template
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={templateData.name}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              placeholder="Masukkan nama template"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Deskripsi
            </label>
            <textarea
              id="description"
              name="description"
              value={templateData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              placeholder="Deskripsi singkat tentang template ini"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="layout" className="block text-sm font-medium text-gray-700 mb-1">
              Layout
            </label>
            <div className="flex items-center">
              <Layout className="h-5 w-5 text-gray-400 absolute ml-3" />
              <select
                id="layout"
                name="layout"
                value={templateData.layout}
                onChange={handleSelectChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              >
                {layoutOptions.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="includeCharts"
                name="includeCharts"
                checked={templateData.includeCharts}
                onChange={handleCheckboxChange}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="includeCharts" className="ml-2 block text-sm text-gray-700 flex items-center">
                <BarChart2 className="h-4 w-4 mr-1 text-gray-500" />
                Sertakan Grafik
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeStatistics"
                name="includeStatistics"
                checked={templateData.includeStatistics}
                onChange={handleCheckboxChange}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="includeStatistics" className="ml-2 block text-sm text-gray-700 flex items-center">
                <PieChart className="h-4 w-4 mr-1 text-gray-500" />
                Sertakan Statistik
              </label>
            </div>
          </div>
        </div>
        
        {/* Field Selection */}
        <div>
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Bidang yang Tersedia</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableFields.map(field => (
                <button
                  key={field.id}
                  type="button"
                  onClick={() => addField(field.id)}
                  disabled={templateData.fields.includes(field.id)}
                  className={`flex items-center justify-between px-3 py-2 border rounded-lg text-sm ${
                    templateData.fields.includes(field.id)
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 active:bg-gray-100"
                  }`}
                >
                  <span>{field.label}</span>
                  <Plus size={16} className={templateData.fields.includes(field.id) ? "text-gray-300" : "text-blue-500"} />
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Bidang yang Dipilih</h3>
            {templateData.fields.length > 0 ? (
              <div className="space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
                {templateData.fields.map((fieldId, index) => (
                  <div
                    key={fieldId}
                    className="flex items-center justify-between bg-white p-2 rounded border border-blue-200"
                  >
                    <span className="text-sm font-medium text-gray-800">{getFieldLabel(fieldId)}</span>
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => moveFieldUp(index)}
                        disabled={index === 0}
                        className={`p-1 rounded ${
                          index === 0 ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        <MoveUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveFieldDown(index)}
                        disabled={index === templateData.fields.length - 1}
                        className={`p-1 rounded ${
                          index === templateData.fields.length - 1 ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        <MoveDown size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeField(fieldId)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center">
                <p className="text-gray-500 text-sm">
                  Belum ada bidang yang dipilih. Pilih bidang dari daftar di atas dengan mengklik tombol <Plus size={14} className="text-blue-500 inline" />.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex justify-end mt-6 space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Batal
        </button>
        <motion.button
          type="submit"
          disabled={saving || saveSuccess}
          className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary hover:bg-opacity-90 transition-colors"
          whileTap={{ scale: 0.95 }}
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : saveSuccess ? (
            <CheckCircle size={20} />
          ) : (
            <Save size={20} />
          )}
          {saveSuccess ? "Tersimpan" : "Simpan Template"}
        </motion.button>
      </div>
    </form>
  );
}
