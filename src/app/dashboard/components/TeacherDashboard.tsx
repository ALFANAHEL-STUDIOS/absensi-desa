"use client";

import React, { useState, useEffect } from "react";
import { collection, query, orderBy, limit, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { 
  Users, 
  BookOpen, 
  FileText, 
  Scan,
  QrCode,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  BarChart2,
  PieChart,
  AlertCircle,
  Settings,
  Loader2,
  School
} from "lucide-react";
import DynamicDashboard from "@/components/DynamicDashboard";
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
  LineChart,
  Line
} from "recharts";

interface TeacherDashboardProps {
  schoolName: string;
  userName: string;
  stats: {
    totalStudents: number;
    totalClasses: number;
    attendanceRate: number;
    totalTeachers: number;
  };
  recentAttendance: any[];
  loading: boolean;
}

export default function TeacherDashboard({ 
  schoolName, 
  userName,
  stats,
  recentAttendance,
  loading
}: TeacherDashboardProps) {
  const { schoolId, userRole } = useAuth();
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    sick: 0,
    permitted: 0,
    absent: 0,
    total: 0
  });
  
  // Static dashboard only
  const showDynamicDashboard = false;
  
  // Get current date and time
  const currentDate = new Date();
  const formattedDate = new Intl.DateTimeFormat('id-ID', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }).format(currentDate);
  
  // Calculate attendance statistics from recent attendance data
  useEffect(() => {
    if (recentAttendance && recentAttendance.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      
      // Filter today's attendance
      const todayAttendance = recentAttendance.filter(record => record.date === today);
      
      const stats = {
        present: 0,
        sick: 0,
        permitted: 0,
        absent: 0,
        total: todayAttendance.length
      };
      
      todayAttendance.forEach(record => {
        if (record.status === "present" || record.status === "hadir") {
          stats.present++;
        } else if (record.status === "sick" || record.status === "sakit") {
          stats.sick++;
        } else if (record.status === "permitted" || record.status === "izin") {
          stats.permitted++;
        } else if (record.status === "absent" || record.status === "alpha") {
          stats.absent++;
        }
      });
      
      setAttendanceStats(stats);
    }
  }, [recentAttendance]);
  
  return (
    <div>
      {/* Dashboard content */}

      {showDynamicDashboard ? (
        // Dynamic Dashboard
        <div className="mb-6">
          <DynamicDashboard userRole={userRole} schoolId={schoolId} />
        </div>
      ) : (
        <>
          {/* School Information */}
          <div className="bg-blue-600 text-white p-5 mb-6 rounded-xl">
            <div className="flex items-center mb-1">
              <School className="h-4 w-4 text-white mr-1.5" />
              <h3 className="text-sm font-medium text-white">DATA INSTANSI</h3>
            </div>
            <p className="text-lg font-bold text-white">{schoolName}</p>
            <div className="flex items-center mt-2 text-xs text-white">
              <span>Tahun Anggaran 2025</span>
              <span className="mx-2">•</span>
              <span className="flex items-center">
                <span className="mr-1 h-2 w-2 bg-green-300 rounded-full inline-block animate-pulse"></span>
                Aktif
              </span>
            </div>
          </div>

          {/* Admin-specific stats overview */}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3 mb-3 sm:mb-5">
            <div className="bg-green-100 rounded-xl shadow-sm p-3 sm:p-4 border-l-4 border-green-500">
              <div className="flex flex-wrap items-center mb-1">
                <CheckCircle size={16} className="text-green-600 mr-1 sm:mr-2" />
                <h3 className="text-xs sm:text-sm font-medium text-gray-700">Kehadiran Hari Ini</h3>
              </div>
              <p className="text-lg font-bold text-gray-800">{attendanceStats.present}/{attendanceStats.total}</p>
              <div className="flex items-center mt-1 text-xs text-green-600">
                <CheckCircle size={12} className="mr-1" />
                <span>{attendanceStats.total > 0 ? Math.round((attendanceStats.present / attendanceStats.total) * 100) : 0}% hadir</span>
              </div>
            </div>
            
            <div className="bg-amber-100 rounded-xl shadow-sm p-3 sm:p-4 border-l-4 border-amber-500">
              <div className="flex flex-wrap items-center mb-1">
                <Calendar size={16} className="text-amber-600 mr-1 sm:mr-2" />
                <h3 className="text-xs sm:text-sm font-medium text-gray-700">Izin</h3>
              </div>
              <p className="text-lg font-bold text-gray-800">{attendanceStats.permitted}</p>
              <div className="flex items-center mt-1 text-xs text-amber-600">
                <Clock size={12} className="mr-1" />
                <span>{attendanceStats.total > 0 ? Math.round((attendanceStats.permitted / attendanceStats.total) * 100) : 0}% izin</span>
              </div>
            </div>
            
            <div className="bg-blue-100 rounded-xl shadow-sm p-3 sm:p-4 border-l-4 border-blue-500">
              <div className="flex flex-wrap items-center mb-1">
                <AlertCircle size={16} className="text-blue-600 mr-1 sm:mr-2" />
                <h3 className="text-xs sm:text-sm font-medium text-gray-700">Sakit</h3>
              </div>
              <p className="text-lg font-bold text-gray-800">{attendanceStats.sick}</p>
              <div className="flex items-center mt-1 text-xs text-blue-600">
                <Clock size={12} className="mr-1" />
                <span>{attendanceStats.total > 0 ? Math.round((attendanceStats.sick / attendanceStats.total) * 100) : 0}% sakit</span>
              </div>
            </div>
            
            <div className="bg-red-100 rounded-xl shadow-sm p-3 sm:p-4 border-l-4 border-red-500">
              <div className="flex flex-wrap items-center mb-1">
                <XCircle size={16} className="text-red-600 mr-1 sm:mr-2" />
                <h3 className="text-xs sm:text-sm font-medium text-gray-700">Alpha</h3>
              </div>
              <p className="text-lg font-bold text-gray-800">{attendanceStats.absent}</p>
              <div className="flex items-center mt-1 text-xs text-green-600">
                <CheckCircle size={12} className="mr-1" />
                <span>{attendanceStats.total > 0 ? Math.round((attendanceStats.absent / attendanceStats.total) * 100) : 0}% alpha</span>
              </div>
            </div>
          </div>

          {/* Recent attendance records */}
          <div className="bg-yellow-100 rounded-xl shadow-sm p-4 sm:p-6 mb-6">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 p-2 rounded-lg mr-3">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold">Riwayat Kehadiran</h2>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nama Pegawai
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Jabatan
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tanggal
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Waktu
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Catatan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentAttendance.length > 0 ? (
                      recentAttendance.map((record) => (
                        <tr key={record.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{record.studentName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-gray-500">{record.class}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${record.status === 'hadir' || record.status === 'present' ? 'bg-green-100 text-green-800' : ''}
                              ${record.status === 'sakit' || record.status === 'sick' ? 'bg-orange-100 text-orange-800' : ''}
                              ${record.status === 'izin' || record.status === 'permitted' ? 'bg-blue-100 text-blue-800' : ''}
                              ${record.status === 'alpha' || record.status === 'absent' ? 'bg-red-100 text-red-800' : ''}
                            `}>
                              {record.status === 'hadir' || record.status === 'present' ? 'Hadir' : 
                               record.status === 'sakit' || record.status === 'sick' ? 'Sakit' : 
                               record.status === 'izin' || record.status === 'permitted' ? 'Izin' : 'Alpha'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                            {record.date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                            {record.time}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                            {record.notes || record.note || record.catatan || '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                          Belum ada data kehadiran
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Teacher Quick Access */}
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 p-2 rounded-lg mr-3">
                <Settings className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Akses Cepat Operator</h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
              <Link href="/dashboard/scan" className="bg-blue-100 rounded-xl shadow-sm p-4 sm:p-5 hover:shadow-md transition-all border-t-4 border-blue-500">
                <div className="flex flex-col items-center justify-center">
                  <div className="bg-blue-100 p-2 sm:p-3 rounded-full mb-2 sm:mb-3">
                    <QrCode className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  </div>
                  <h3 className="font-medium text-gray-800 text-center text-xs sm:text-sm">Scan QR Code</h3>
                </div>
              </Link>
              
              <Link href="/dashboard/students/qr" className="bg-amber-100 rounded-xl shadow-sm p-4 sm:p-5 hover:shadow-md transition-all border-t-4 border-amber-500">
                <div className="flex flex-col items-center justify-center">
                  <div className="bg-amber-100 p-2 sm:p-3 rounded-full mb-2 sm:mb-3">
                    <QrCode className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                  </div>
                  <h3 className="font-medium text-gray-800 text-center text-xs sm:text-sm">QR Code Pegawai</h3>
                </div>
              </Link>
              
              <Link href="/dashboard/reports" className="bg-green-100 rounded-xl shadow-sm p-4 sm:p-5 hover:shadow-md transition-all border-t-4 border-green-500">
                <div className="flex flex-col items-center justify-center">
                  <div className="bg-green-100 p-2 sm:p-3 rounded-full mb-2 sm:mb-3">
                    <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                  </div>
                  <h3 className="font-medium text-gray-800 text-center text-xs sm:text-sm">Laporan Absensi</h3>
                </div>
              </Link>
              
              <Link href="/dashboard/students" className="bg-purple-100 rounded-xl shadow-sm p-4 sm:p-5 hover:shadow-md transition-all border-t-4 border-purple-500">
                <div className="flex flex-col items-center justify-center">
                  <div className="bg-purple-100 p-2 sm:p-3 rounded-full mb-2 sm:mb-3">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                  </div>
                  <h3 className="font-medium text-gray-800 text-center text-xs sm:text-sm">Daftar Pegawai</h3>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
