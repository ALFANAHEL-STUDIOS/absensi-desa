"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Calendar, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, subMonths, addMonths } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "react-hot-toast";
import { generatePDF, generateExcel } from "@/lib/reportGenerator";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Function to fetch daily attendance data from Firestore
const fetchDailyData = async (schoolId: string, year: number, month: number) => {
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');
    
    // Format month for queries (1 -> 01, 12 -> 12)
    const monthStr = month.toString().padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-31`; // Use 31 to cover all possible days
    
    // Query attendance records for the month
    const attendanceRef = collection(db, `schools/${schoolId}/attendance`);
    const attendanceQuery = query(
      attendanceRef,
      where("date", ">=", startDate),
      where("date", "<=", endDate)
    );
    
    const snapshot = await getDocs(attendanceQuery);
    
    // Organize by day of month
    const dailyStats: {[key: string]: {hadir: number, sakit: number, izin: number, alpha: number}} = {};
    
    // Initialize data for each day in month
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      const day = i.toString().padStart(2, '0');
      dailyStats[day] = {hadir: 0, sakit: 0, izin: 0, alpha: 0};
    }
    
    // Count attendance by status for each day
    snapshot.forEach(doc => {
      const data = doc.data();
      const date = data.date;
      if (!date) return;
      
      // Extract day from date (format: YYYY-MM-DD)
      const day = date.split('-')[2];
      
      if (day && dailyStats[day]) {
        if (data.status === 'present' || data.status === 'hadir') {
          dailyStats[day].hadir++;
        } else if (data.status === 'sick' || data.status === 'sakit') {
          dailyStats[day].sakit++;
        } else if (data.status === 'permitted' || data.status === 'izin') {
          dailyStats[day].izin++;
        } else if (data.status === 'absent' || data.status === 'alpha') {
          dailyStats[day].alpha++;
        }
      }
    });
    
    // Convert to array format for charts
    const result = Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      ...stats
    }));
    
    return result.sort((a, b) => parseInt(a.date) - parseInt(b.date));
  } catch (error) {
    console.error("Error fetching daily attendance data:", error);
    return [];
  }
};

export default function MonthlyReport() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDownloading, setIsDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const { schoolId } = useAuth();
  const [schoolInfo, setSchoolInfo] = useState({
    name: "Sekolah Dasar Negeri 1",
    address: "Jl. Pendidikan No. 123, Kota",
    npsn: "12345678",
    principalName: "Drs. Ahmad Sulaiman, M.Pd."
  });
  const [dailyData, setDailyData] = useState<any[]>([]);
  
  // Format current date for display
  const formattedMonth = format(currentDate, "MMMM yyyy", { locale: id });
  
  // Remove duplicate useEffect - this second one is not needed as it's identical to the first
  
  // Remove duplicate useEffect - this second one is not needed as it's identical to the first
  
  // Fetch attendance data when date changes
  useEffect(() => {
    const loadAttendanceData = async () => {
      if (!schoolId) return;
      
      setLoading(true);
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const data = await fetchDailyData(schoolId, year, month);
        setDailyData(data);
      } catch (error) {
        console.error("Error loading attendance data:", error);
        toast.error("Gagal memuat data kehadiran dari database");
      } finally {
        setLoading(false);
      }
    };
    
    loadAttendanceData();
  }, [schoolId, currentDate]);
  
  useEffect(() => {
    const fetchSchoolData = async () => {
      if (schoolId) {
        try {
          const schoolDoc = await getDoc(doc(db, "schools", schoolId));
          if (schoolDoc.exists()) {
            const data = schoolDoc.data();
            setSchoolInfo({
              name: data.name || "Sekolah Dasar Negeri 1",
              address: data.address || "Jl. Pendidikan No. 123, Kota",
              npsn: data.npsn || "12345678",
              principalName: data.principalName || "Drs. Ahmad Sulaiman, M.Pd."
            });
          }
        } catch (error) {
          console.error("Error fetching school data:", error);
        }
      }
    };
    
    fetchSchoolData();
  }, [schoolId]);
  
  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };
  
  const [reportOptions, setReportOptions] = useState({
    includeCharts: true,
    includeStatistics: true,
    includeAttendanceHistory: false,
    paperSize: "a4",
    orientation: "portrait",
    showHeader: true,
    showFooter: true,
    showSignature: true,
    dateRange: {
      start: format(new Date(), "yyyy-MM-dd"),
      end: format(new Date(), "yyyy-MM-dd")
    }
  });
  
  const handleOptionChange = (key: string, value: any) => {
    setReportOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const handleDownloadPDF = () => {
    setIsDownloading(true);
  
    try {
      // Get summary data
      const summary = calculateSummary();
    
      // Generate PDF
      const fileName = generatePDF(
        schoolInfo,
        {
          present: parseInt(summary.hadir),
          sick: parseInt(summary.sakit),
          permitted: parseInt(summary.izin),
          absent: parseInt(summary.alpha),
          month: formattedMonth
        },
        "monthly",
        {
          ...reportOptions,
          schoolId,
          dateRange: {
            start: format(new Date(), "yyyy-MM-dd"),
            end: format(new Date(), "yyyy-MM-dd")
          }
        }
      );
    
      toast.success(`Laporan bulan ${formattedMonth} berhasil diunduh sebagai ${fileName}`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Gagal mengunduh laporan PDF");
    } finally {
      setIsDownloading(false);
    }
  };
  
  const handleDownloadExcel = () => {
    setIsDownloading(true);
  
    try {
      // Get summary data
      const summary = calculateSummary();
    
      // Generate Excel
      const fileName = generateExcel(
        schoolInfo,
        {
          present: parseInt(summary.hadir),
          sick: parseInt(summary.sakit),
          permitted: parseInt(summary.izin),
          absent: parseInt(summary.alpha),
          month: formattedMonth
        },
        "monthly",
        {
          ...reportOptions,
          schoolId,
          dateRange: {
            start: format(new Date(), "yyyy-MM-dd"),
            end: format(new Date(), "yyyy-MM-dd")
          }
        }
      );
    
      toast.success(`Laporan bulan ${formattedMonth} berhasil diunduh sebagai ${fileName}`);
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast.error("Gagal mengunduh laporan Excel");
    } finally {
      setIsDownloading(false);
    }
  };

  // Calculate attendance summary
  const calculateSummary = () => {
    const totalDays = dailyData.length;
    
    const summary = dailyData.reduce((acc, day) => {
      acc.hadir += day.hadir;
      acc.sakit += day.sakit;
      acc.izin += day.izin;
      acc.alpha += day.alpha;
      return acc;
    }, { hadir: 0, sakit: 0, izin: 0, alpha: 0 });
    
    return {
      hadir: (summary.hadir / totalDays).toFixed(1),
      sakit: (summary.sakit / totalDays).toFixed(1),
      izin: (summary.izin / totalDays).toFixed(1),
      alpha: (summary.alpha / totalDays).toFixed(1)
    };
  };
  
  const summary = calculateSummary();

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6">
      <div className="flex items-center mb-6">
        <Link href="/dashboard/reports" className="p-2 mr-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Rekap Bulanan</h1>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 md:mb-6">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="bg-blue-100 p-2 rounded-lg mr-3">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold">Laporan Bulan: {formattedMonth}</h2>
          </div>
          
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-md border border-gray-300 hover:bg-gray-50"
            >
              Bulan Sebelumnya
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-md border border-gray-300 hover:bg-gray-50"
            >
              Bulan Berikutnya
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 md:gap-4 mb-4 sm:mb-6">
          <div className="bg-yellow-50 rounded-xl p-4 border border-blue-200">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Hadir</h3>
            <p className="text-2xl font-bold text-blue-600">{summary.hadir}%</p>
          </div>
          
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Sakit</h3>
            <p className="text-2xl font-bold text-orange-600">{summary.sakit}%</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Izin</h3>
            <p className="text-2xl font-bold text-green-600">{summary.izin}%</p>
          </div>
          
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Alpha</h3>
            <p className="text-2xl font-bold text-red-600">{summary.alpha}%</p>
          </div>
        </div>
        
      </div>
      
      
              
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-20 md:mb-6">
        <button 
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className="flex items-center justify-center gap-3 bg-red-600 text-white p-4 rounded-xl hover:bg-red-700 transition-colors"
        >
          {isDownloading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <FileText className="h-6 w-6" />
          )}
          <span className="font-medium">Download Laporan PDF</span>
        </button>
        
        <button 
          onClick={handleDownloadExcel}
          disabled={isDownloading}
          className="flex items-center justify-center gap-3 bg-green-600 text-white p-4 rounded-xl hover:bg-green-700 transition-colors"
        >
          {isDownloading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-6 w-6" />
          )}
          <span className="font-medium">Download Laporan Excel</span>
        </button>
      </div>
    </div>
  );
}
