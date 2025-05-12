"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Calendar, Download, FileSpreadsheet, FileText, Loader2, Search, User } from "lucide-react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { generatePDF, generateExcel } from "@/lib/reportGenerator";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Sample students data - removed demo data
const STUDENTS: any[] = [];

// Generate attendance data function
const generateAttendanceData = (studentId: string) => {
  return [];
};

// Generate monthly summary
const generateMonthlySummary = () => {
  return {
    hadir: 0,
    sakit: 0,
    izin: 0,
    alpha: 0,
  };
};

export default function StudentReport() {
  const { schoolId, userRole, userData } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredStudents, setFilteredStudents] = useState(STUDENTS);
  const [isDownloading, setIsDownloading] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [currentMonth] = useState(format(new Date(), "MMMM yyyy", { locale: id }));
  const [schoolInfo, setSchoolInfo] = useState({
    name: "Sekolah Dasar Negeri 1",
    address: "Jl. Pendidikan No. 123, Kota",
    npsn: "12345678",
    principalName: "Drs. Ahmad Sulaiman, M.Pd."
  });
  const [teacherName, setTeacherName] = useState("Budi Santoso, S.Pd.");
  const [classesList, setClassesList] = useState([]);
  
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
  
  // Fetch classes from Firestore
  useEffect(() => {
    const fetchClasses = async () => {
      if (!schoolId) return;
      
      try {
        const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
        const classesRef = collection(db, `schools/${schoolId}/classes`);
        const classesQuery = query(classesRef, orderBy('name'));
        const snapshot = await getDocs(classesQuery);
        
        const classes = [];
        snapshot.forEach((doc) => {
          classes.push({
            id: doc.id,
            name: doc.data().name || `Class ${doc.id}`,
            level: doc.data().level || '',
            teacherName: doc.data().teacherName || '',
            room: doc.data().room || '',
            studentCount: doc.data().studentCount || 0
          });
        });
        
        setClassesList(classes);
      } catch (error) {
        console.error("Error fetching classes:", error);
        toast.error("Gagal mengambil data kelas");
      }
    };

    fetchClasses();
  }, [schoolId]);
  
  useEffect(() => {
    const fetchStudents = async () => {
      if (!schoolId) return;
      
      try {
        const { studentApi } = await import('@/lib/api');
        const fetchedStudents = await studentApi.getAll(schoolId);
        
        if (fetchedStudents && fetchedStudents.length > 0) {
          setFilteredStudents(fetchedStudents.filter(
            (student: any) =>
              (student.name && student.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
              (student.nisn && student.nisn.includes(searchQuery))
          ));
        }
      } catch (error) {
        console.error("Error fetching students:", error);
      }
    };
    
    // For student role, automatically select their own data
    if (userRole === 'student' && userData) {
      const studentData = {
        id: userData.id || '1',
        name: userData.name || 'Student Name',
        nisn: userData.nisn || '0012345678',
        kelas: userData.class || 'IX-A',
        gender: userData.gender || 'Laki-laki'
      };
      
      setSelectedStudent(studentData);
      fetchStudentAttendanceData(studentData.id);
    } else {
      // Fetch students from database
      fetchStudents();
    }
  }, [searchQuery, userRole, userData, schoolId]);
  
  const fetchStudentAttendanceData = async (studentId: string) => {
    if (!schoolId || !studentId) return;
    
    try {
      // Use a local loading state instead of trying to use useState inside this function
      let isLoading = true;
      const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      // Get current month and year
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const startOfMonth = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endOfMonth = `${year}-${month.toString().padStart(2, '0')}-31`;
      
      // Create query for this student's attendance records
      const attendanceRef = collection(db, `schools/${schoolId}/attendance`);
      const attendanceQuery = query(
        attendanceRef,
        where("studentId", "==", studentId),
        where("date", ">=", startOfMonth),
        where("date", "<=", endOfMonth),
        orderBy("date", "desc")
      );
      
      const snapshot = await getDocs(attendanceQuery);
      const records: any[] = [];
      let present = 0;
      let sick = 0;
      let permitted = 0;
      let absent = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        records.push(data);
        
        // Count by status
        if (data.status === 'present' || data.status === 'hadir') present++;
        else if (data.status === 'sick' || data.status === 'sakit') sick++;
        else if (data.status === 'permitted' || data.status === 'izin') permitted++;
        else if (data.status === 'absent' || data.status === 'alpha') absent++;
      });
      
      // Create chart data for all months
      const chartData = Array(12).fill(0).map((_, i) => {
        const month = i + 1;
        return {
          name: month.toString(),
          hadir: 0,
          sakit: 0,
          izin: 0,
          alpha: 0
        };
      });
      
      // Set current month data if we have records
      if (records.length > 0) {
        chartData[now.getMonth()].hadir = present;
        chartData[now.getMonth()].sakit = sick;
        chartData[now.getMonth()].izin = permitted;
        chartData[now.getMonth()].alpha = absent;
      }
      
      setAttendanceData(chartData);
      
      // Set monthly summary
      setMonthlySummary({
        hadir: present,
        sakit: sick,
        izin: permitted,
        alpha: absent
      });
      
      // No need to set loading state here as it's handled by the component's useState
    } catch (error) {
      console.error("Error fetching student attendance data:", error);
      toast.error("Gagal mengambil data kehadiran siswa");
      
      // Fallback to empty data if fetching fails
      setAttendanceData([]);
      setMonthlySummary({
        hadir: 0,
        sakit: 0,
        izin: 0,
        alpha: 0
      });
      // No need to set loading state here as it's handled by the component's useState
    }
  };

  useEffect(() => {
    // Set data when selected student changes
    if (selectedStudent) {
      fetchStudentAttendanceData(selectedStudent.id);
      
      // Also fetch class info for this student
      if (schoolId && selectedStudent.class) {
        const fetchClassInfo = async () => {
          try {
            const { classApi } = await import('@/lib/api');
            const classes = await classApi.getAll(schoolId) as {id: string; name: string; teacherName: string}[];
            const studentClass = classes.find(cls => cls.name === selectedStudent.class);
            
            if (studentClass && studentClass.teacherName) {
              setTeacherName(studentClass.teacherName);
            }
          } catch (error) {
            console.error("Error fetching class info:", error);
          }
        };
        
        fetchClassInfo();
      }
    }
  }, [selectedStudent, schoolId]);
  
  const handleStudentSelect = (student: any) => {
    setSelectedStudent(student);
    fetchStudentAttendanceData(student.id);
  };
  
  const [reportOptions, setReportOptions] = useState({
    includeCharts: true,
    includeStatistics: true,
    includeAttendanceHistory: true,
    paperSize: "a4",
    orientation: "portrait",
    showHeader: true,
    showFooter: true,
    showSignature: true,
    dateRange: "month" // month, semester, year
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
      // Generate PDF
      const fileName = generatePDF(
        schoolInfo,
        {
          present: monthlySummary?.hadir || 20,
          sick: monthlySummary?.sakit || 2,
          permitted: monthlySummary?.izin || 1,
          absent: monthlySummary?.alpha || 1
        },
        "student",
        {
          studentName: selectedStudent?.name || "",
          className: selectedStudent?.kelas || selectedStudent?.class || "",
          teacherName: teacherName || "",
          studentId: selectedStudent?.id || "",
          dateRange: {
            start: format(new Date(), "yyyy-MM-dd"),
            end: format(new Date(), "yyyy-MM-dd")
          },
          schoolId
        }
      );
      
      toast.success(`Laporan siswa ${selectedStudent.name} berhasil diunduh sebagai ${fileName}`);
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
      // Generate Excel
      const fileName = generateExcel(
        schoolInfo,
        {
          present: monthlySummary?.hadir || 20,
          sick: monthlySummary?.sakit || 2,
          permitted: monthlySummary?.izin || 1,
          absent: monthlySummary?.alpha || 1
        },
        "student",
        {
          studentName: selectedStudent?.name || "",
          className: selectedStudent?.kelas || selectedStudent?.class || "",
          teacherName: teacherName || "",
          studentId: selectedStudent?.id || "",
          dateRange: {
            start: format(new Date(), "yyyy-MM-dd"),
            end: format(new Date(), "yyyy-MM-dd")
          },
          schoolId: schoolId || ""
        }
      );
      
      toast.success(`Laporan siswa ${selectedStudent.name} berhasil diunduh sebagai ${fileName}`);
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast.error("Gagal mengunduh laporan Excel");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6">
      <div className="flex items-center mb-6">
        <Link href="/dashboard/reports" className="p-2 mr-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Rekap Per Siswa</h1>
      </div>
      
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-6 mb-20 md:mb-6">
        {/* Student Search Panel - Only for admin and teacher */}
        {userRole !== 'student' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center mb-4">
              <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                <User className="h-6 w-6 text-indigo-600" />
              </div>
              <h2 className="text-xl font-semibold">Cari Siswa</h2>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Nama atau NISN siswa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                />
              </div>
              
              {/* Filter by class feature removed as requested */}
            </div>
            
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedStudent?.id === student.id
                        ? "bg-blue-600 text-white"
                        : "hover:bg-gray-100"
                    }`}
                    onClick={() => handleStudentSelect(student)}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="font-medium">{student.name}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        selectedStudent?.id === student.id
                          ? "bg-blue-500/30 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        Kelas {student.class || student.kelas || '-'}
                      </span>
                    </div>
                    <div className="text-sm opacity-80">
                      NISN: {student.nisn}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Tidak ada siswa yang sesuai dengan pencarian
                </div>
              )}
            </div>
          </div>
        )}

        {/* Report Content - Full width for students */}
        <div className={userRole === 'student' ? "lg:col-span-3" : "lg:col-span-2"}>
          {selectedStudent ? (
            <div className="space-y-6">
              {/* Student Info */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white">
                <div className="flex items-center gap-4">
                  <div className="bg-white/30 h-16 w-16 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {selectedStudent.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{selectedStudent.name}</h3>
                    <div className="opacity-90 space-y-1 mt-1">
                      <div>NISN: {selectedStudent.nisn}</div>
                      <div>Kelas: {selectedStudent.class || selectedStudent.kelas}</div>
                      
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Monthly Summary with Filter */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div className="flex items-center mb-3 sm:mb-0">
                    <div className="bg-amber-100 p-2 rounded-lg mr-3">
                      <Calendar className="h-6 w-6 text-amber-600" />
                    </div>
                    <h2 className="text-lg font-semibold">Rekap Bulanan: {currentMonth}</h2>
                  </div>
                  
                  <div className="w-full sm:w-48">
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      onChange={(e) => {
                        // This would normally fetch data for the selected month
                        toast.success(`Data bulan ${e.target.value} berhasil dimuat`);
                      }}
                    >
                      <option value="Januari">Januari 2025</option>
                      <option value="Februari">Februari 2025</option>
                      <option value="Maret">Maret 2025</option>
                      <option value="April">April 2025</option>
                      <option value="Mei" selected>Mei 2025</option>
                      <option value="Juni">Juni 2025</option>
                      <option value="Juli">Juli 2025</option>
                      <option value="Agustus">Agustus 2025</option>
                      <option value="September">September 2025</option>
                      <option value="Oktober">Oktober 2025</option>
                      <option value="November">November 2025</option>
                      <option value="Desember">Desember 2025</option>
                    </select>
                  </div>
                </div>
                
                {monthlySummary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                      <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Hadir</h3>
                      <p className="text-2xl font-bold text-blue-600">{monthlySummary.hadir} hari</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                      <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Sakit</h3>
                      <p className="text-2xl font-bold text-orange-600">{monthlySummary.sakit} hari</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                      <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Izin</h3>
                      <p className="text-2xl font-bold text-green-600">{monthlySummary.izin} hari</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                      <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Alpha</h3>
                      <p className="text-2xl font-bold text-red-600">{monthlySummary.alpha} hari</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Download Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
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
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-10 text-center">
              <div className="flex flex-col items-center">
                <div className="bg-gray-100 rounded-full p-4 mb-4">
                  <User className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Pilih Siswa</h3>
                <p className="text-gray-500 mb-4">
                  Silakan pilih siswa dari daftar untuk melihat laporan kehadiran
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
