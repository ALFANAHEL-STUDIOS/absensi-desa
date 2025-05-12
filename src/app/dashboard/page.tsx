"use client";

import React, { useEffect, useState } from "react";
import { Home, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

// Import role-specific dashboard components
import AdminDashboard from "./components/AdminDashboard";
import TeacherDashboard from "./components/TeacherDashboard";
import StudentDashboard from "./components/StudentDashboard";

export default function Dashboard() {
  const { user, schoolId, userRole, userData } = useAuth();
  const router = useRouter();
  const [schoolName, setSchoolName] = useState("");
  const [userName, setUserName] = useState("");
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalClasses, setTotalClasses] = useState(0);
  const [totalTeachers, setTotalTeachers] = useState(0);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchoolData = async () => {
      if (schoolId) {
        try {
          setLoading(true);
          // Fetch school info
          const schoolDoc = await getDoc(doc(db, "schools", schoolId));
          if (schoolDoc.exists()) {
            setSchoolName(schoolDoc.data().name || "Sekolah Anda");
          }
          
          // Fetch total students count
          const studentsRef = collection(db, `schools/${schoolId}/students`);
          const studentsSnapshot = await getDocs(studentsRef);
          setTotalStudents(studentsSnapshot.size);
          
          // Fetch total classes count
          const classesRef = collection(db, `schools/${schoolId}/classes`);
          const classesSnapshot = await getDocs(classesRef);
          setTotalClasses(classesSnapshot.size);
          
          // Fetch total teachers count
          const teachersRef = collection(db, "users");
          const teachersQuery = query(
            teachersRef,
            where("schoolId", "==", schoolId),
            where("role", "==", "teacher")
          );
          const teachersSnapshot = await getDocs(teachersQuery);
          setTotalTeachers(teachersSnapshot.size);
          
          // Calculate attendance rate
          const today = new Date().toISOString().split('T')[0];
          const startOfMonth = today.substring(0, 8) + '01'; // First day of current month
          
          const attendanceRef = collection(db, `schools/${schoolId}/attendance`);
          const attendanceQuery = query(
            attendanceRef,
            where("date", ">=", startOfMonth),
            where("date", "<=", today)
          );
          
          const attendanceSnapshot = await getDocs(attendanceQuery);
          
          let present = 0;
          let total = 0;
          
          attendanceSnapshot.forEach(doc => {
            total++;
            const status = doc.data().status;
            if (status === 'hadir' || status === 'present') {
              present++;
            }
          });
          
          setAttendanceRate(total > 0 ? Math.round((present / total) * 100) : 0);
          
          // Fetch recent attendance records
          const recentAttendanceQuery = query(
            attendanceRef,
            orderBy("timestamp", "desc"),
            limit(5)
          );
          
          const recentAttendanceSnapshot = await getDocs(recentAttendanceQuery);
          const recentAttendanceData = [];
          
          recentAttendanceSnapshot.forEach(doc => {
            recentAttendanceData.push({
              id: doc.id,
              ...doc.data()
            });
          });
          
          setRecentAttendance(recentAttendanceData);
          setLoading(false);
        } catch (error) {
          console.error("Error fetching school data:", error);
          setLoading(false);
        }
      }
    };

    fetchSchoolData();
    setUserName(user?.displayName || "Pengguna");
    
    // Check if the user is an admin without school setup
    if (typeof window !== 'undefined' && userRole === 'admin') {
      const needsSetup = localStorage.getItem('needsSchoolSetup');
      if (needsSetup === 'true' && !schoolId) {
        router.push('/dashboard/setup-school');
      }
    }
  }, [user, schoolId, userRole, router]);

  return (
    <div className="pb-20 md:pb-6">
      {/* Dashboard Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Hallo, {userName}
          {userRole && (
            <span className="ml-2 text-xs font-normal px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
              {userRole === 'admin' ? 'Administrator' : userRole === 'teacher' ? 'Guru' : 'Siswa'}
            </span>
          )}
        </h1>
        <div className="flex items-center mt-1 text-gray-500">
          <Home size={14} className="mr-1.5" />
          <span className="font-medium text-xs">SELAMAT DATANG DI ABSENSI DIGITAL</span>
        </div>
      </div>

      {/* Render different dashboard based on user role */}
      {userRole === 'admin' && (
        <AdminDashboard 
          schoolName={schoolName} 
          principalName={userData?.principalName || ""}
          principalNip={userData?.principalNip || ""}
          stats={{
            totalStudents,
            totalClasses,
            attendanceRate,
            totalTeachers
          }}
          recentAttendance={recentAttendance}
          loading={loading}
        />
      )}
      
      {userRole === 'teacher' && (
        <TeacherDashboard 
          schoolName={schoolName} 
          userName={userName}
          stats={{
            totalStudents,
            totalClasses,
            attendanceRate,
            totalTeachers
          }}
          recentAttendance={recentAttendance}
          loading={loading}
        />
      )}
      
      {userRole === 'student' && (
        <StudentDashboard 
          userData={userData}
          schoolId={schoolId}
        />
      )}
      
      {/* Fallback if no role is detected */}
      {!userRole && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="flex flex-col items-center">
            <div className="bg-blue-100 p-4 rounded-full mb-4">
              <Home className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Selamat Datang di Dashboard</h2>
            <p className="text-gray-600 mb-4">
              Silakan hubungi administrator untuk mengatur peran akses Anda.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
