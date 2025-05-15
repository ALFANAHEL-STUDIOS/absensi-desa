"use client";

import React, { useState, useEffect } from "react";
import { collection, query, getDocs, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { 
  TrendingUp, 
  Users, 
  BookOpen, 
  Settings, 
  FileText,
  PlusCircle,
  School,
  Scan,
  UserPlus,
  Loader2
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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";

interface AdminDashboardProps {
  schoolName: string;
  principalName?: string;
  principalNip?: string;
  stats: {
    totalStudents: number;
    totalClasses: number;
    attendanceRate: number;
    totalTeachers: number;
  };
  recentAttendance: any[];
  loading: boolean;
}

export default function AdminDashboard({ 
  schoolName, 
  principalName, 
  principalNip,
  stats,
  recentAttendance,
  loading
}: AdminDashboardProps) {
  const [attendanceData, setAttendanceData] = useState([
    { name: "Hadir", value: 85, color: "#4C6FFF" },
    { name: "Sakit", value: 7, color: "#FF9800" },
    { name: "Izin", value: 5, color: "#8BC34A" },
    { name: "Alpha", value: 3, color: "#F44336" },
  ]);
  
  const [classData, setClassData] = useState([]);
  const { schoolId, userRole } = useAuth();
  
  const [weeklyData, setWeeklyData] = useState([
    { name: "Senin", hadir: 95, sakit: 3, izin: 1, alpha: 1 },
    { name: "Selasa", hadir: 92, sakit: 4, izin: 2, alpha: 2 },
    { name: "Rabu", hadir: 88, sakit: 6, izin: 3, alpha: 3 },
    { name: "Kamis", hadir: 90, sakit: 5, izin: 3, alpha: 2 },
    { name: "Jumat", hadir: 93, sakit: 3, izin: 2, alpha: 2 },
  ]);
  
  // State to toggle between static and dynamic dashboard
  const [showDynamicDashboard, setShowDynamicDashboard] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('showDynamicDashboard') === 'true';
    }
    return false;
  });
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('showDynamicDashboard', showDynamicDashboard.toString());
    }
  }, [showDynamicDashboard]);
  
  // Fetch class data with student counts
  useEffect(() => {
    const fetchClassData = async () => {
      if (!schoolId) return;
      
      try {
        // Get classes with student counts
        const classesRef = collection(db, `schools/${schoolId}/classes`);
        const classesQuery = query(classesRef, orderBy("name"));
        const classesSnapshot = await getDocs(classesQuery);
        
        const classesData = [];
        const classMap = {};
        
        classesSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.name) {
            const classItem = {
              name: data.name,
              students: 0
            };
            classesData.push(classItem);
            classMap[data.name] = classItem;
          }
        });
        
        // Count students per class
        const studentsRef = collection(db, `schools/${schoolId}/students`);
        const studentsSnapshot = await getDocs(studentsRef);
        
        studentsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.class && classMap[data.class]) {
            classMap[data.class].students++;
          }
        });
        
        if (classesData.length > 0) {
          setClassData(classesData);
        }
      } catch (error) {
        console.error("Error fetching class data:", error);
      }
    };
    
    fetchClassData();
  }, [schoolId]);
  
  // Calculate attendance distribution
  useEffect(() => {
    if (stats && stats.attendanceRate) {
      // Create attendance distribution based on stats
      const present = stats.attendanceRate;
      const remaining = 100 - present;
      
      // Distribute the remaining percentage among sick, izin, and alpha
      // This is an approximation - in a real app you'd get actual data
      const sick = Math.round(remaining * 0.5);
      const izin = Math.round(remaining * 0.3);
      const alpha = remaining - sick - izin;
      
      setAttendanceData([
        { name: "Hadir", value: present, color: "#4C6FFF" },
        { name: "Sakit", value: sick, color: "#FF9800" },
        { name: "Izin", value: izin, color: "#8BC34A" },
        { name: "Alpha", value: alpha, color: "#F44336" },
      ]);
    }
  }, [stats]);

  return (
    <div>
      {showDynamicDashboard ? (
        // Dynamic Dashboard
        <div className="mb-6">
          <DynamicDashboard userRole={userRole} schoolId={schoolId} />
        </div>
      ) : (
        <>
          {/* School Information */}
          <div className="bg-blue-600 text-white p-4 sm:p-5 mb-4 sm:mb-6 rounded-xl">
            <div className="flex items-center mb-1">
              <School className="h-4 w-4 text-white mr-1.5" />
              <h3 className="text-sm font-medium text-white">DATA INSTANSI</h3>
            </div>
            <p className="text-lg font-bold text-white">{schoolName}</p>
            <div className="flex flex-wrap items-center mt-2 text-xs text-white">
              <span>Tahun Anggaran 2025</span>
              <span className="mx-2">•</span>
              <span className="flex items-center">
                <span className="mr-1 h-2 w-2 bg-green-300 rounded-full inline-block animate-pulse"></span>
                Aktif
              </span>
            </div>
          </div>

          {/* Admin-specific stats overview */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-blue-500 rounded-xl p-3 sm:p-5 text-white">
              <div className="flex items-center mb-1">
                <Users className="h-4 sm:h-5 w-4 sm:w-5 text-white mr-1.5 sm:mr-2" />
                <h3 className="text-xs sm:text-sm font-medium text-white">Total Pegawai</h3>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-white">{stats.totalStudents}</p>
              <div className="text-xs text-white mt-1 sm:mt-2">
                <span>Pada Semester ini</span>
              </div>
            </div>
            
            <div className="bg-purple-500 rounded-xl p-3 sm:p-5 text-white">
              <div className="flex items-center mb-1">
                <BookOpen className="h-4 sm:h-5 w-4 sm:w-5 text-white mr-1.5 sm:mr-2" />
                <h3 className="text-xs sm:text-sm font-medium text-white">Total Kepegawaian</h3>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-white">{stats.totalClasses}</p>
              <div className="text-xs text-white mt-1 sm:mt-2">
                <span>Pada Semester ini</span>
              </div>
            </div>
            
            <div className="bg-orange-500 rounded-xl p-3 sm:p-5 text-white">
              <div className="flex items-center mb-1">
                <TrendingUp className="h-4 sm:h-5 w-4 sm:w-5 text-white mr-1.5 sm:mr-2" />
                <h3 className="text-xs sm:text-sm font-medium text-white">Kehadiran</h3>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-white">{stats.attendanceRate}%</p>
              <div className="text-xs text-white mt-1 sm:mt-2">
                <span>Pada Bulan ini</span>
              </div>
            </div>
            
            <div className="bg-green-500 rounded-xl p-3 sm:p-5 text-white">
              <div className="flex items-center mb-1">
                <Users className="h-4 sm:h-5 w-4 sm:w-5 text-white mr-1.5 sm:mr-2" />
                <h3 className="text-xs sm:text-sm font-medium text-white">Pegawai Aktif</h3>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-white">{stats.totalTeachers}</p>
              <div className="text-xs text-white mt-1 sm:mt-2">
                <span>Pada Semester ini</span>
              </div>
            </div>
          </div>

          {/* Recent Attendance */}
          <div className="mb-6 bg-yellow-50 p-4 sm:p-6 rounded-xl">
            <div className="flex items-center mb-3 sm:mb-4">
              <div className="bg-yellow-100 p-1.5 sm:p-2 rounded-lg mr-2 sm:mr-3">
                <Users className="h-5 sm:h-6 w-5 sm:w-6 text-yellow-600" />
              </div>
              <h2 className="text-base sm:text-lg font-semibold">Riwayat Kehadiran</h2>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center py-8 sm:py-10">
                <Loader2 className="h-7 sm:h-8 w-7 sm:w-8 text-primary animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nama Pegawai
                      </th>
                      <th scope="col" className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Jabatan
                      </th>
                      <th scope="col" className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tanggal
                      </th>
                      <th scope="col" className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Waktu
                      </th>
                      <th scope="col" className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Catatan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentAttendance.length > 0 ? (
                      recentAttendance.map((record) => (
                        <tr key={record.id}>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                            <div className="font-medium text-gray-900 text-xs">{record.studentName}</div>
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                            {record.class}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                            <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              record.status === 'hadir' || record.status === 'present' 
                                ? 'bg-green-100 text-green-800'
                                : record.status === 'sakit' || record.status === 'sick'
                                ? 'bg-orange-100 text-orange-800'
                                : record.status === 'izin' || record.status === 'permitted'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {record.status === 'hadir' || record.status === 'present' ? 'Hadir' : 
                               record.status === 'sakit' || record.status === 'sick' ? 'Sakit' : 
                               record.status === 'izin' || record.status === 'permitted' ? 'Izin' : 'Alpha'}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                            {record.date ? record.date.split('-').reverse().join('-') : '-'}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                            {record.time}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                            {record.notes || record.note || record.catatan || '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-center text-gray-500">
                          Belum ada data kehadiran
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Admin Quick Access */}
          <div className="mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
              <Settings className="h-4 sm:h-5 w-4 sm:w-5 text-primary mr-1.5 sm:mr-2" />
              Akses Cepat Admin
            </h2>
            
            <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4">
              <Link href="/dashboard/students/add" className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl shadow-sm p-5 hover:shadow-md transition-all text-white">
                <div className="flex flex-col items-center justify-center">
                  <div className="bg-blue-400 bg-opacity-30 p-3 rounded-full mb-3">
                    <PlusCircle className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-medium text-white text-center">Tambah Siswa</h3>
                </div>
              </Link>
              
              <Link href="/dashboard/classes" className="bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl shadow-sm p-5 hover:shadow-md transition-all text-white">
                <div className="flex flex-col items-center justify-center">
                  <div className="bg-purple-400 bg-opacity-30 p-3 rounded-full mb-3">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-medium text-white text-center">Kelola Jabatan</h3>
                </div>
              </Link>
              
              <Link href="/dashboard/attendance-history" className="bg-gradient-to-r from-amber-500 to-yellow-600 rounded-xl shadow-sm p-5 hover:shadow-md transition-all text-white">
                <div className="flex flex-col items-center justify-center">
                  <div className="bg-amber-400 bg-opacity-30 p-3 rounded-full mb-3">
                    <Settings className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-medium text-white text-center">Riwayat Absen</h3>
                </div>
              </Link>
              
              <Link href="/dashboard/user-management" className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-sm p-5 hover:shadow-md transition-all text-white">
                <div className="flex flex-col items-center justify-center">
                  <div className="bg-green-400 bg-opacity-30 p-3 rounded-full mb-3">
                    <UserPlus className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-medium text-white text-center">Manajemen User</h3>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
