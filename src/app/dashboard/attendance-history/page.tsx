"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { 
  Search, 
  Calendar, 
  Filter,
  ChevronDown,
  Check,
  X,
  Loader2
} from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  date: string;
  time: string;
  status: string;
  note?: string;
}

export default function AttendanceHistory() {
  const { schoolId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [classes, setClasses] = useState<string[]>([]);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: format(new Date(new Date().setDate(new Date().getDate() - 30)), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd")
  });

  // Fetch classes and attendance records
  useEffect(() => {
    const fetchData = async () => {
      if (!schoolId) return;
      
      try {
        setLoading(true);
        
        // Fetch classes
        const classesRef = collection(db, `schools/${schoolId}/classes`);
        const classesSnapshot = await getDocs(classesRef);
        const classesData: string[] = [];
        classesSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.name) {
            classesData.push(data.name);
          }
        });
        setClasses(classesData.sort());
        
        // Fetch attendance records
        const attendanceRef = collection(db, `schools/${schoolId}/attendance`);
        const attendanceQuery = query(
          attendanceRef,
          where("date", ">=", dateRange.start),
          where("date", "<=", dateRange.end),
          orderBy("date", "desc"),
          orderBy("time", "desc")
        );
        
        const snapshot = await getDocs(attendanceQuery);
        
        const records: AttendanceRecord[] = [];
        snapshot.forEach((doc) => {
          records.push({
            id: doc.id,
            ...doc.data() as Omit<AttendanceRecord, 'id'>
          });
        });
        
        setAttendanceRecords(records);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Gagal mengambil data kehadiran");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [schoolId, dateRange]);

  // Filter attendance records
  const filteredRecords = attendanceRecords.filter((record) => {
    // Filter by class
    if (selectedClass !== "all" && record.class !== selectedClass) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery) {
      return (
        record.studentName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return true;
  });

  // Handle date range change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Get status badge color
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'hadir':
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'sakit':
      case 'sick':
        return 'bg-orange-100 text-orange-800';
      case 'izin':
      case 'permitted':
        return 'bg-blue-100 text-blue-800';
      case 'alpha':
      case 'absent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status display text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'hadir':
      case 'present':
        return 'Hadir';
      case 'sakit':
      case 'sick':
        return 'Sakit';
      case 'izin':
      case 'permitted':
        return 'Izin';
      case 'alpha':
      case 'absent':
        return 'Alpha';
      default:
        return status;
    }
  };

  return (
    <div className="pb-20 md:pb-6">
      <div className="flex items-center mb-6">
        <Calendar className="h-7 w-7 text-primary mr-3" />
        <h1 className="text-2xl font-bold text-gray-800">Riwayat Kehadiran</h1>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filter Data</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Date Range */}
          <div>
            <label htmlFor="start" className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Mulai
            </label>
            <input
              type="date"
              id="start"
              name="start"
              value={dateRange.start}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            />
          </div>
          
          <div>
            <label htmlFor="end" className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Akhir
            </label>
            <input
              type="date"
              id="end"
              name="end"
              value={dateRange.end}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            />
          </div>
          
          {/* Class Filter */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kelas
            </label>
            <button
              onClick={() => setShowClassDropdown(!showClassDropdown)}
              className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <span>
                {selectedClass === "all" ? "Semua Kelas" : `Kelas ${selectedClass}`}
              </span>
              <ChevronDown size={16} className={`transition-transform ${showClassDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showClassDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <div className="p-2">
                  <div
                    className="flex items-center px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
                    onClick={() => {
                      setSelectedClass("all");
                      setShowClassDropdown(false);
                    }}
                  >
                    <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                      selectedClass === "all" ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                    }`}>
                      {selectedClass === "all" && (
                        <Check size={12} className="text-white" />
                      )}
                    </div>
                    <span className="ml-2">Semua Kelas</span>
                  </div>
                  
                  {classes.map((className) => (
                    <div
                      key={className}
                      className="flex items-center px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
                      onClick={() => {
                        setSelectedClass(className);
                        setShowClassDropdown(false);
                      }}
                    >
                      <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                        selectedClass === className ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                      }`}>
                        {selectedClass === className && (
                          <Check size={12} className="text-white" />
                        )}
                      </div>
                      <span className="ml-2">Kelas {className}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Cari nama siswa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
          />
        </div>
      </div>
      
      {/* Attendance Records Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
        </div>
      ) : filteredRecords.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Waktu
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama Siswa
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kelas
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Catatan
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record) => {
                  // Format date from YYYY-MM-DD to DD/MM/YYYY
                  const dateParts = record.date.split('-');
                  const formattedDate = dateParts.length === 3 ? 
                    `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : 
                    record.date;
                    
                  return (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formattedDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.time}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{record.studentName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.class}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(record.status)}`}>
                          {getStatusText(record.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.note || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center">
          <div className="flex flex-col items-center">
            <div className="bg-gray-100 rounded-full p-3 mb-4">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">
              {searchQuery || selectedClass !== "all"
                ? "Tidak ada data kehadiran yang sesuai dengan filter"
                : "Belum ada data kehadiran"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
