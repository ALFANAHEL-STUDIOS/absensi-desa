"use client";

import React, { useEffect, useState } from "react";
import { Home, Users, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// Import role-specific dashboard components
import AdminDashboard from "./components/AdminDashboard";
import TeacherDashboard from "./components/TeacherDashboard";
import StudentDashboard from "./components/StudentDashboard";
import DynamicDashboard from "@/components/DynamicDashboard";

export default function Dashboard() {
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [showCustomDashboard, setShowCustomDashboard] = useState(false);
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

  // Check if this is the user's first login
  useEffect(() => {
    if (user) {
      // Check if this is the first login by looking for a flag in localStorage
      const isFirstLogin = localStorage.getItem(`hasLoggedIn_${user.uid}`) !== 'true';
      
      if (isFirstLogin) {
        setShowWelcomePopup(true);
        // Mark that the user has logged in
        localStorage.setItem(`hasLoggedIn_${user.uid}`, 'true');
      }
    }
  }, [user]);

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
            const data = doc.data();
            recentAttendanceData.push({
              id: doc.id,
              ...data,
              // Ensure notes field is available for display
              notes: data.notes || data.note || data.catatan || null
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
          Hai, {userName}
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
        <>
          {showCustomDashboard ? (
            <DynamicDashboard userRole={userRole} schoolId={schoolId} />
          ) : (
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
        </>
      )}
      
      {userRole === 'teacher' && (
        <>
          {showCustomDashboard ? (
            <DynamicDashboard userRole={userRole} schoolId={schoolId} />
          ) : (
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
        </>
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

      {/* Welcome Popup for First-time Login */}
      <AnimatePresence>
        {showWelcomePopup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6"
            >
              <div className="flex justify-end">
                <button 
                  onClick={() => setShowWelcomePopup(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold mb-1">SELAMAT DATANG</h2>
                <h3 className="text-lg font-bold text-primary mb-4">{userData?.name || userName}</h3>
                <p className="text-gray-700 text-sm sm:text-base">
                  Jika anda pertama kali login ke Aplikasi ABSENSI DIGITAL, jangan lupa untuk dapat menggunakan aplikasi ini, silahkan lengkapi <span className="font-bold">Profil Sekolah</span> anda dengan cara mengakses Menu yang berada di pojok kanan atas.
                </p>
              </div>
              <div className="flex justify-center">
                <button 
                  onClick={() => setShowWelcomePopup(false)}
                  className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary hover:bg-opacity-90 transition-colors"
                >
                  Saya Mengerti
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
