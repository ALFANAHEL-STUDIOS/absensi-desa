"use client";

import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { 
  Calendar, 
  FileText, 
  Download, 
  Filter, 
  Users, 
  BookOpen, 
  User, 
  Loader2,
  ChevronDown,
  Check,
  X
} from "lucide-react";
import { format, subDays, subMonths } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import * as ChartJS from "chart.js/auto";

interface ReportGeneratorProps {
  schoolId: string | null;
  userRole: string | null;
}

interface ReportOptions {
  reportType: "summary" | "detailed" | "attendance" | "absence";
  dateRange: "today" | "week" | "month" | "custom";
  startDate: string;
  endDate: string;
  includeCharts: boolean;
  includeStatistics: boolean;
  selectedClasses: string[];
  selectedStudents: string[];
  orientation: "portrait" | "landscape";
  paperSize: "a4" | "letter";
  templateId?: string;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({ schoolId, userRole }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [showClassSelector, setShowClassSelector] = useState(false);
  const [showStudentSelector, setShowStudentSelector] = useState(false);
  
  const [options, setOptions] = useState<ReportOptions>({
    reportType: "summary",
    dateRange: "month",
    startDate: format(subMonths(new Date(), 1), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    includeCharts: true,
    includeStatistics: true,
    selectedClasses: [],
    selectedStudents: [],
    orientation: "portrait",
    paperSize: "a4",
    templateId: ""
  });

  // Fetch classes and students when component mounts
  useEffect(() => {
    const fetchData = async () => {
      if (!schoolId) return;
      
      try {
        // Fetch classes
        const { classApi } = await import('@/lib/api');
        const classesData = await classApi.getAll(schoolId);
        setClasses(classesData || []);
        
        // Fetch students
        const { studentApi } = await import('@/lib/api');
        const studentsData = await studentApi.getAll(schoolId);
        setStudents(studentsData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    
    fetchData();
  }, [schoolId]);

  const handleOptionChange = (key: keyof ReportOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }));
    
    // Handle date range changes
    if (key === "dateRange") {
      const today = new Date();
      let startDate = "";
      
      switch (value) {
        case "today":
          startDate = format(today, "yyyy-MM-dd");
          break;
        case "week":
          startDate = format(subDays(today, 7), "yyyy-MM-dd");
          break;
        case "month":
          startDate = format(subMonths(today, 1), "yyyy-MM-dd");
          break;
        case "custom":
          // Keep current dates for custom range
          return;
      }
      
      setOptions(prev => ({
        ...prev,
        startDate,
        endDate: format(today, "yyyy-MM-dd")
      }));
    }
  };

  const toggleClassSelection = (classId: string) => {
    setOptions(prev => {
      const isSelected = prev.selectedClasses.includes(classId);
      return {
        ...prev,
        selectedClasses: isSelected
          ? prev.selectedClasses.filter(id => id !== classId)
          : [...prev.selectedClasses, classId]
      };
    });
  };

  const toggleStudentSelection = (studentId: string) => {
    setOptions(prev => {
      const isSelected = prev.selectedStudents.includes(studentId);
      return {
        ...prev,
        selectedStudents: isSelected
          ? prev.selectedStudents.filter(id => id !== studentId)
          : [...prev.selectedStudents, studentId]
      };
    });
  };

  const [templates, setTemplates] = useState<any[]>([]);
  
  // Fetch available templates
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!schoolId) return;
      
      try {
        // Try to get templates from localStorage first
        const storedTemplates = localStorage.getItem(`reportTemplates_${schoolId}`);
        if (storedTemplates) {
          setTemplates(JSON.parse(storedTemplates));
          return;
        }
        
        // If no templates in localStorage, try Firestore
        const { collection, query, getDocs, orderBy } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        
        const templatesRef = collection(db, `schools/${schoolId}/reportTemplates`);
        const templatesQuery = query(templatesRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(templatesQuery);
        
        const fetchedTemplates: any[] = [];
        snapshot.forEach((doc) => {
          fetchedTemplates.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setTemplates(fetchedTemplates);
        
        // Save to localStorage for faster access next time
        localStorage.setItem(`reportTemplates_${schoolId}`, JSON.stringify(fetchedTemplates));
      } catch (error) {
        console.error("Error fetching templates:", error);
      }
    };
    
    fetchTemplates();
  }, [schoolId]);

  const generateReport = async () => {
    setIsGenerating(true);
    
    try {
      // Get school info
      const { db } = await import('@/lib/firebase');
      const { doc, getDoc } = await import('firebase/firestore');
      
      let schoolInfo = {
        name: "School Name",
        address: "School Address",
        npsn: "12345678",
        principalName: "Principal Name"
      };
      
      if (schoolId) {
        const schoolDoc = await getDoc(doc(db, "schools", schoolId));
        if (schoolDoc.exists()) {
          const data = schoolDoc.data();
          schoolInfo = {
            name: data.name || schoolInfo.name,
            address: data.address || schoolInfo.address,
            npsn: data.npsn || schoolInfo.npsn,
            principalName: data.principalName || schoolInfo.principalName
          };
        }
      }
      
      // If using a template, redirect to the template generation page
      if (options.templateId) {
        window.location.href = `/dashboard/reports/generate?templateId=${options.templateId}`;
        return;
      }
      
      // Create PDF document
      const pdfDoc = new jsPDF({
        orientation: options.orientation,
        unit: "mm",
        format: options.paperSize
      });
      
      const pageWidth = pdfDoc.internal.pageSize.getWidth();
      const pageHeight = pdfDoc.internal.pageSize.getHeight();
      const margin = 15;
      
      // Add header
      pdfDoc.setFontSize(16);
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.text(schoolInfo.name, pageWidth / 2, margin, { align: "center" });
      
      pdfDoc.setFontSize(10);
      pdfDoc.setFont("helvetica", "normal");
      pdfDoc.text(schoolInfo.address, pageWidth / 2, margin + 7, { align: "center" });
      pdfDoc.text(`NPSN: ${schoolInfo.npsn}`, pageWidth / 2, margin + 12, { align: "center" });
      
      // Add title
      pdfDoc.setFontSize(14);
      pdfDoc.setFont("helvetica", "bold");
      const reportTitle = `LAPORAN ${options.reportType.toUpperCase()} KEHADIRAN SISWA`;
      pdfDoc.text(reportTitle, pageWidth / 2, margin + 25, { align: "center" });
      
      // Add date range
      pdfDoc.setFontSize(10);
      pdfDoc.setFont("helvetica", "normal");
      const startDateFormatted = format(new Date(options.startDate), "d MMMM yyyy", { locale: id });
      const endDateFormatted = format(new Date(options.endDate), "d MMMM yyyy", { locale: id });
      pdfDoc.text(`Periode: ${startDateFormatted} - ${endDateFormatted}`, pageWidth / 2, margin + 32, { align: "center" });
      
      // Add filter information
      let currentY = margin + 40;
      
      if (options.selectedClasses.length > 0) {
        const selectedClassNames = options.selectedClasses.map(classId => {
          const classObj = classes.find(c => c.id === classId);
          return classObj ? classObj.name : classId;
        }).join(", ");
        
        pdfDoc.text(`Kelas: ${selectedClassNames}`, margin, currentY);
        currentY += 6;
      }
      
      if (options.selectedStudents.length > 0) {
        const selectedStudentNames = options.selectedStudents.map(studentId => {
          const student = students.find(s => s.id === studentId);
          return student ? student.name : studentId;
        }).join(", ");
        
        pdfDoc.text(`Siswa: ${selectedStudentNames}`, margin, currentY);
        currentY += 6;
      }
      
      // Add attendance data
      currentY += 10;
      pdfDoc.setFontSize(12);
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.text("Rekapitulasi Kehadiran", margin, currentY);
      currentY += 8;
      
      // Create table headers
      const tableHeaders = ["Status", "Jumlah", "Persentase"];
      const columnWidths = [40, 30, 30];
      const rowHeight = 8;
      
      // Draw table header
      pdfDoc.setFillColor(240, 240, 240);
      pdfDoc.rect(margin, currentY, columnWidths.reduce((a, b) => a + b, 0), rowHeight, "F");
      
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.setFontSize(10);
      let currentX = margin;
      tableHeaders.forEach((header, index) => {
        pdfDoc.text(header, currentX + columnWidths[index] / 2, currentY + 5.5, { align: "center" });
        currentX += columnWidths[index];
      });
      
      currentY += rowHeight;
      
      // Sample attendance data - in a real app, this would come from your database
      const attendanceData = [
        { status: "Hadir", count: 450, percentage: "90%" },
        { status: "Sakit", count: 25, percentage: "5%" },
        { status: "Izin", count: 15, percentage: "3%" },
        { status: "Alpha", count: 10, percentage: "2%" }
      ];
      
      // Draw table rows
      pdfDoc.setFont("helvetica", "normal");
      attendanceData.forEach((row, rowIndex) => {
        // Alternate row background
        if (rowIndex % 2 === 0) {
          pdfDoc.setFillColor(250, 250, 250);
          pdfDoc.rect(margin, currentY, columnWidths.reduce((a, b) => a + b, 0), rowHeight, "F");
        }
        
        currentX = margin;
        pdfDoc.text(row.status, currentX + columnWidths[0] / 2, currentY + 5.5, { align: "center" });
        currentX += columnWidths[0];
        
        pdfDoc.text(row.count.toString(), currentX + columnWidths[1] / 2, currentY + 5.5, { align: "center" });
        currentX += columnWidths[1];
        
        pdfDoc.text(row.percentage, currentX + columnWidths[2] / 2, currentY + 5.5, { align: "center" });
        
        currentY += rowHeight;
      });
      
      // Add total row
      pdfDoc.setFillColor(240, 240, 240);
      pdfDoc.rect(margin, currentY, columnWidths.reduce((a, b) => a + b, 0), rowHeight, "F");
      pdfDoc.setFont("helvetica", "bold");
      
      currentX = margin;
      pdfDoc.text("Total", currentX + columnWidths[0] / 2, currentY + 5.5, { align: "center" });
      currentX += columnWidths[0];
      
      const totalCount = attendanceData.reduce((sum, row) => sum + row.count, 0);
      pdfDoc.text(totalCount.toString(), currentX + columnWidths[1] / 2, currentY + 5.5, { align: "center" });
      currentX += columnWidths[1];
      
      pdfDoc.text("100%", currentX + columnWidths[2] / 2, currentY + 5.5, { align: "center" });
      
      currentY += rowHeight + 15;
      
      // Add charts if requested
      if (options.includeCharts) {
        // Create a canvas for the chart
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 200;
        document.body.appendChild(canvas);
        
        // Create pie chart
        const ctx = canvas.getContext('2d');
        if (ctx) {
          new ChartJS.Chart(ctx, {
            type: 'pie',
            data: {
              labels: attendanceData.map(item => item.status),
              datasets: [{
                data: attendanceData.map(item => item.count),
                backgroundColor: [
                  '#4C6FFF', // Hadir - Blue
                  '#FF9800', // Sakit - Orange
                  '#8BC34A', // Izin - Green
                  '#F44336'  // Alpha - Red
                ]
              }]
            },
            options: {
              responsive: false,
              plugins: {
                legend: {
                  position: 'right',
                }
              }
            }
          });
          
          // Add chart to PDF
          pdfDoc.text("Grafik Kehadiran", margin, currentY);
          currentY += 8;
          
          // Convert canvas to image
          const imgData = canvas.toDataURL('image/png');
          pdfDoc.addImage(imgData, 'PNG', margin, currentY, 100, 50);
          
          // Clean up
          document.body.removeChild(canvas);
        }
      }
      
      // Add footer
      const currentDate = format(new Date(), "d MMMM yyyy", { locale: id });
      pdfDoc.setFontSize(10);
      pdfDoc.setFont("helvetica", "normal");
      pdfDoc.text(`Dicetak pada: ${currentDate}`, pageWidth - margin, pageHeight - 20, { align: "right" });
      
      // Add signatures
      pdfDoc.text("Mengetahui,", margin, pageHeight - 30);
      pdfDoc.text("Kepala Sekolah", margin, pageHeight - 25);
      pdfDoc.text(schoolInfo.principalName, margin, pageHeight - 10);
      
      // Save the PDF
      const fileName = `Laporan_Kehadiran_${format(new Date(), "dd-MM-yyyy")}.pdf`;
      pdfDoc.save(fileName);
      
      toast.success(`Laporan berhasil dibuat: ${fileName}`);
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Gagal membuat laporan");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="bg-blue-100 p-2 rounded-lg mr-3">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold">Generator Laporan Kustom</h2>
        </div>
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          {showOptions ? "Sembunyikan Opsi" : "Tampilkan Opsi"}
          <ChevronDown className={`h-4 w-4 transition-transform ${showOptions ? "rotate-180" : ""}`} />
        </button>
      </div>
      
      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Report Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jenis Laporan
                </label>
                <select
                  value={options.reportType}
                  onChange={(e) => handleOptionChange("reportType", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                >
                  <option value="summary">Ringkasan</option>
                  <option value="detailed">Detail</option>
                  <option value="attendance">Kehadiran</option>
                  <option value="absence">Ketidakhadiran</option>
                </select>
              </div>
              
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rentang Waktu
                </label>
                <select
                  value={options.dateRange}
                  onChange={(e) => handleOptionChange("dateRange", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                >
                  <option value="today">Hari Ini</option>
                  <option value="week">Minggu Ini</option>
                  <option value="month">Bulan Ini</option>
                  <option value="custom">Kustom</option>
                </select>
              </div>
              
              {/* Custom Date Range */}
              {options.dateRange === "custom" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tanggal Mulai
                    </label>
                    <input
                      type="date"
                      value={options.startDate}
                      onChange={(e) => handleOptionChange("startDate", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tanggal Akhir
                    </label>
                    <input
                      type="date"
                      value={options.endDate}
                      onChange={(e) => handleOptionChange("endDate", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    />
                  </div>
                </>
              )}
              
              {/* Class Selector */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pilih Kelas
                </label>
                <button
                  type="button"
                  onClick={() => setShowClassSelector(!showClassSelector)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left flex justify-between items-center"
                >
                  <span>
                    {options.selectedClasses.length === 0
                      ? "Semua Kelas"
                      : `${options.selectedClasses.length} Kelas Dipilih`}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                
                {showClassSelector && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2">
                      {classes.length > 0 ? (
                        classes.map((cls) => (
                          <div
                            key={cls.id}
                            className="flex items-center px-3 py-2 hover:bg-gray-100 rounded-md cursor-pointer"
                            onClick={() => toggleClassSelection(cls.id)}
                          >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                              options.selectedClasses.includes(cls.id)
                                ? "bg-primary border-primary"
                                : "border-gray-300"
                            }`}>
                              {options.selectedClasses.includes(cls.id) && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <span className="ml-2">{cls.name}</span>
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-gray-500">Tidak ada kelas</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Student Selector */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pilih Siswa
                </label>
                <button
                  type="button"
                  onClick={() => setShowStudentSelector(!showStudentSelector)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left flex justify-between items-center"
                >
                  <span>
                    {options.selectedStudents.length === 0
                      ? "Semua Siswa"
                      : `${options.selectedStudents.length} Siswa Dipilih`}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                
                {showStudentSelector && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2">
                      {students.length > 0 ? (
                        students.map((student) => (
                          <div
                            key={student.id}
                            className="flex items-center px-3 py-2 hover:bg-gray-100 rounded-md cursor-pointer"
                            onClick={() => toggleStudentSelection(student.id)}
                          >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                              options.selectedStudents.includes(student.id)
                                ? "bg-primary border-primary"
                                : "border-gray-300"
                            }`}>
                              {options.selectedStudents.includes(student.id) && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <span className="ml-2">{student.name}</span>
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-gray-500">Tidak ada siswa</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Include Charts */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeCharts"
                  checked={options.includeCharts}
                  onChange={(e) => handleOptionChange("includeCharts", e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="includeCharts" className="ml-2 block text-sm text-gray-700">
                  Sertakan Grafik
                </label>
              </div>
              
              {/* Include Statistics */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeStatistics"
                  checked={options.includeStatistics}
                  onChange={(e) => handleOptionChange("includeStatistics", e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="includeStatistics" className="ml-2 block text-sm text-gray-700">
                  Sertakan Statistik
                </label>
              </div>
              
              {/* Page Orientation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Orientasi Halaman
                </label>
                <select
                  value={options.orientation}
                  onChange={(e) => handleOptionChange("orientation", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                >
                  <option value="portrait">Potrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
              
              {/* Paper Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ukuran Kertas
                </label>
                <select
                  value={options.paperSize}
                  onChange={(e) => handleOptionChange("paperSize", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                >
                  <option value="a4">A4</option>
                  <option value="letter">Letter</option>
                </select>
              </div>
            
              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Laporan
                </label>
                <select
                  value={options.templateId}
                  onChange={(e) => handleOptionChange("templateId", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                >
                  <option value="">Gunakan Template Default</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="flex justify-end">
        <button
          onClick={generateReport}
          disabled={isGenerating}
          className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors"
        >
          {isGenerating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Download className="h-5 w-5" />
          )}
          {isGenerating ? "Membuat Laporan..." : "Buat Laporan"}
        </button>
      </div>
    </div>
  );
};

export default ReportGenerator;
