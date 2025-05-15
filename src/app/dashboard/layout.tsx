"use client";

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  QrCode, 
  Home, 
  User, 
  School, 
  Settings, 
  Database, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  ChevronDown, 
  Users, 
  BookOpen, 
  FileText,
  CheckCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Scan,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import dynamic from 'next/dynamic';

const ConfirmDialog = dynamic(() => import('@/components/ConfirmDialog'), {
  ssr: false
});

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, userRole, userData, logout, loading, schoolId } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([
    { message: "Berhasil Login", time: "5 menit yang lalu", read: false },
    { message: "Data Pegawai berhasil ditambahkan", time: "1 jam yang lalu", read: false },
    { message: "Laporan bulanan tersedia", time: "1 hari yang lalu", read: true }
  ]);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  // Store notifications in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('notifications', JSON.stringify(notifications));
    }
  }, [notifications]);

  // Load notifications from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedNotifications = localStorage.getItem('notifications');
      if (savedNotifications) {
        setNotifications(JSON.parse(savedNotifications));
      }
    }
  }, []);
  const pathname = usePathname();
  
  // State to store school name
  const [schoolName, setSchoolName] = useState("Sekolah");
  
  // Load sidebar state from localStorage - auto-hide disabled
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('sidebarCollapsed');
      if (savedState !== null) {
        setSidebarCollapsed(false); // Always show sidebar
      }
    }
    
    // Fetch school name from Firestore
    const fetchSchoolName = async () => {
      if (schoolId) {
        try {
          const schoolDoc = await getDoc(doc(db, "schools", schoolId));
          if (schoolDoc.exists()) {
            setSchoolName(schoolDoc.data().name || "Sekolah");
          }
        } catch (error) {
          console.error("Error fetching school name:", error);
        }
      }
    };
    
    fetchSchoolName();
  }, [schoolId]);
  
  // Save sidebar state to localStorage when changed - auto-hide disabled
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', 'false'); // Always save as not collapsed
    }
  }, [sidebarCollapsed]);
  
  // Notification functions
  const markNotificationAsRead = (index) => {
    const updatedNotifications = [...notifications];
    updatedNotifications[index].read = true;
    setNotifications(updatedNotifications);
    toast.success('Notifikasi ditandai sebagai dibaca');
  };
  
  const deleteNotification = (index) => {
    const updatedNotifications = [...notifications];
    updatedNotifications.splice(index, 1);
    setNotifications(updatedNotifications);
    toast.success('Notifikasi dihapus');
  };
  
  const markAllNotificationsAsRead = () => {
    const updatedNotifications = notifications.map(notification => ({
      ...notification,
      read: true
    }));
    setNotifications(updatedNotifications);
    toast.success('Semua notifikasi ditandai dibaca');
  };
  
  const clearAllNotifications = () => {
    setNotifications([]);
    toast.success('Semua notifikasi dihapus');
    
    // Also clear from localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('notifications', JSON.stringify([]));
    }
  };
  
  // Get count of unread notifications
  const unreadCount = notifications.filter(notification => !notification.read).length;

  // Ensure user is authenticated with proper role-based access handling
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else {
        // Get current path
        const path = window.location.pathname;
        
        // Define restricted paths for each role
        const adminOnlyPaths = ['/dashboard/settings', '/dashboard/data-management'];
        const teacherRestrictedPaths = ['/dashboard/students/add', '/dashboard/classes/add'];
        const studentRestrictedPaths = [
          '/dashboard/students/add', 
          '/dashboard/classes', 
          '/dashboard/settings',
          '/dashboard/data-management',
          '/dashboard/profile-school'
        ];
        
        // Check permissions based on role
        if (userRole === 'student' && studentRestrictedPaths.some(p => path.startsWith(p))) {
          toast.error('Akses dibatasi untuk siswa');
          router.push('/dashboard');
        } else if (userRole === 'teacher' && teacherRestrictedPaths.some(p => path.startsWith(p))) {
          toast.error('Operator tidak dapat menambah atau menghapus data');
          router.push('/dashboard');
        }
      }
    }
  }, [user, userRole, router, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Berhasil keluar');
      router.push('/login');
    } catch (error) {
      toast.error('Gagal keluar');
    }
  };
  
  const openLogoutDialog = () => {
    setLogoutDialogOpen(true);
    setProfileOpen(false);
  };

  // Check if the path is active
  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-hidden">
      <Toaster position="top-center" />
      
      {/* Mobile Header */}
      <header className="bg-primary text-white py-2 sm:py-3 px-3 sm:px-4 fixed top-0 left-0 right-0 z-40 shadow-md flex items-center justify-between">
        <div className="flex items-center">
          <button 
            className="mr-3"
            onClick={() => {
              setMenuOpen(!menuOpen);
              setSidebarCollapsed(!sidebarCollapsed);
            }}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <QrCode className="h-6 w-6" />
            <span className="font-bold text-lg">ABSENSI DIGITAL</span>
          </Link>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative">
            <button 
              className="p-1.5 rounded-full hover:bg-white/20"
              onClick={() => {
                setNotificationOpen(!notificationOpen);
                setProfileOpen(false);
              }}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            
            {notificationOpen && (
              <>
                {/* Dark overlay */}
                <div 
                  className="fixed inset-0 bg-black/40 z-40"
                  onClick={() => setNotificationOpen(false)}
                ></div>
                
                <motion.div 
                  className="fixed top-[calc(50%-6cm)] left-[calc(40%-3.5cm)] transform -translate-x-1/2 -translate-y-1/2 w-[90vw] sm:w-[450px] max-w-[480px] bg-white rounded-xl shadow-xl z-50 border border-gray-200 max-h-[80vh]"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-primary to-blue-700 text-white rounded-t-xl">
                  <h3 className="text-base font-semibold">NOTIFIKASI</h3>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => markAllNotificationsAsRead()}
                      className="px-2 py-1 text-xs bg-white/20 hover:bg-white/30 rounded text-white"
                    >
                      DIBACA
                    </button>
                    <button 
                      onClick={() => clearAllNotifications()}
                      className="px-2 py-1 text-xs bg-red-500/80 hover:bg-red-600 rounded text-white"
                    >
                      HAPUS
                    </button>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto w-full sm:w-auto bg-gray-100/50">
                  {notifications.length > 0 ? (
                    notifications.map((notification, index) => (
                      <div key={index} className={`px-4 py-3 hover:bg-gray-100 ${notification.read ? 'border-l-4 border-gray-200 bg-white' : 'border-l-4 border-blue-500 bg-blue-50'} flex items-center justify-between mb-1`}>
                        <div>
                          <p className={`text-sm font-medium ${notification.read ? 'text-gray-600' : 'text-primary'}`}>{notification.message}</p>
                          <p className="text-xs text-gray-500">{notification.time}</p>
                        </div>
                        <div className="flex items-center">
                          {!notification.read && (
                            <button 
                              onClick={() => markNotificationAsRead(index)}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-1.5 rounded-md ml-2"
                              title="Tandai dibaca"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => deleteNotification(index)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded-md ml-2"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-gray-500">
                      <p>Tidak ada notifikasi</p>
                    </div>
                  )}
                </div>
                </motion.div>
              </>
            )}
          </div>
          
          <div className="relative">
            <button 
              className="flex items-center gap-2 py-1.5 px-2 rounded-full hover:bg-white/20"
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotificationOpen(false);
              }}
            >
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary font-bold text-lg">
                {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
              </div>
              <ChevronDown size={16} />
            </button>
            
            {profileOpen && (
              <motion.div 
                className="absolute right-0 mt-2 w-[calc(100vw-24px)] max-w-[224px] sm:w-56 bg-white rounded-md shadow-lg py-2 z-50"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Link 
                  href="/dashboard/profile-school" 
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-500 hover:text-white transition-colors"
                  onClick={() => setProfileOpen(false)}
                >
                  Profil Sekolah
                </Link>
                <Link 
                  href="/dashboard/profile-user" 
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-500 hover:text-white transition-colors"
                  onClick={() => setProfileOpen(false)}
                >
                  Profil Pengguna
                </Link>
                <button
                  onClick={openLogoutDialog}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-500 hover:text-white transition-colors"
                >
                  Keluar
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </header>
      
      {/* Sidebar - Toggle visibility based on sidebarCollapsed state */}
      <aside 
        className={`fixed left-0 top-0 z-30 h-full bg-[#1E329F] text-white shadow-lg w-[220px] sm:w-64 pt-16 transform transition-transform duration-300 ease-in-out ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        } ${sidebarCollapsed ? 'md:-translate-x-full' : 'md:translate-x-0'} md:pt-16 transition-all overflow-y-auto`}
      >
        {/* User profile section */}
        <div className="px-4 py-3 flex flex-col items-center text-center border-b border-blue-800 border-opacity-80 border-b-2">
          <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center text-xl font-bold">
            {userData?.name?.charAt(0).toUpperCase() || user?.displayName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <p className="font-bold text-sm text-gray-200 mt-1.5">{userData?.name || user?.displayName || 'User'}</p>
          <div className="mt-1">
            <span className="px-2 py-0.5 text-[7px] text-green-700 bg-green-100 border border-green-300 rounded flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-check-big mr-0.5" aria-hidden="true">
                <path d="M21.801 10A10 10 0 1 1 17 3.335"></path>
                <path d="m9 11 3 3L22 4"></path>
              </svg>
              Akun Terverifikasi
            </span>
          </div>
          <p className="text-xs text-gray-200 mt-1.5">{schoolName}</p>
        </div>
        
        <nav className="p-3 space-y-0.5">
          {/* Dashboard - All users */}
          <Link 
            href="/dashboard" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
              isActive('/dashboard') 
                ? 'bg-blue-800 text-white font-medium' 
                : 'text-white hover:bg-blue-800'
            }`}
            onClick={() => setMenuOpen(false)}
          >
            <Home size={20} />
            <span>Dashboard</span>
          </Link>
          
          {/* ADMIN NAVIGATION */}
          {userRole === 'admin' && (
            <>
              <Link 
                href="/dashboard/classes" 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive('/dashboard/classes') 
                    ? 'bg-blue-800 text-white font-medium' 
                    : 'text-white hover:bg-blue-800'
                }`}
                onClick={() => setMenuOpen(false)}
              >
                <BookOpen size={20} />
                <span>Manajemen Kelas</span>
              </Link>
              
              <Link 
                href="/dashboard/students" 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive('/dashboard/students') 
                    ? 'bg-blue-800 text-white font-medium' 
                    : 'text-white hover:bg-blue-800'
                }`}
                onClick={() => setMenuOpen(false)}
              >
                <Users size={20} />
                <span>Manajemen Siswa</span>
              </Link>
              
              <Link 
                href="/dashboard/scan" 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive('/dashboard/scan') 
                    ? 'bg-blue-800 text-white font-medium' 
                    : 'text-white hover:bg-blue-800'
                }`}
                onClick={() => setMenuOpen(false)}
              >
                <Scan size={20} />
                <span>Scan QR Code</span>
              </Link>
              
              <Link 
                href="/dashboard/attendance-history" 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive('/dashboard/attendance-history') 
                    ? 'bg-blue-800 text-white font-medium' 
                    : 'text-white hover:bg-blue-800'
                }`}
                onClick={() => setMenuOpen(false)}
              >
                <Calendar size={20} />
                <span>Riwayat Kehadiran</span>
              </Link>


              <Link 
                href="/dashboard/students/qr" 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive('/dashboard/students/qr') 
                    ? 'bg-blue-800 text-white font-medium' 
                    : 'text-white hover:bg-blue-800'
                }`}
                onClick={() => setMenuOpen(false)}
              >
                <QrCode size={20} />
                <span>Kartu QR Code</span>
              </Link>
            </>
          )}
          
          {/* TEACHER NAVIGATION */}
          {userRole === 'teacher' && (
            <>            
              <Link 
                href="/dashboard/students" 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive('/dashboard/students') 
                    ? 'bg-blue-800 text-white font-medium' 
                    : 'text-white hover:bg-blue-800'
                }`}
                onClick={() => setMenuOpen(false)}
              >
                <Users size={20} />
                <span>Daftar Siswa</span>
              </Link>
              
              <Link 
                href="/dashboard/classes" 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive('/dashboard/classes') 
                    ? 'bg-blue-800 text-white font-medium' 
                    : 'text-white hover:bg-blue-800'
                }`}
                onClick={() => setMenuOpen(false)}
              >
                <BookOpen size={20} />
                <span>Daftar Kelas</span>
              </Link>
              
              <Link 
                href="/dashboard/scan" 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive('/dashboard/scan') 
                    ? 'bg-blue-800 text-white font-medium' 
                    : 'text-white hover:bg-blue-800'
                }`}
                onClick={() => setMenuOpen(false)}
              >
                <Scan size={20} />
                <span>Scan Absensi</span>
              </Link>
            </>
          )}
          
          {/* COMMON NAVIGATION FOR ALL USERS */}          
          <Link 
            href="/dashboard/reports" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
              isActive('/dashboard/reports') || 
              isActive('/dashboard/reports/by-student') || 
              isActive('/dashboard/reports/by-class') || 
              isActive('/dashboard/reports/by-group') ||
              isActive('/dashboard/reports/monthly-attendance')
                ? 'bg-blue-800 text-white font-medium' 
                : 'text-white hover:bg-blue-800'
            }`}
            onClick={() => setMenuOpen(false)}
          >
            <FileText size={20} />
            <span>Laporan Absensi</span>
          </Link>
          
          
          <button
            onClick={openLogoutDialog}
            className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-white hover:bg-blue-800 w-full text-left mt-4`}
          >
            <LogOut size={20} />
            <span>Keluar</span>
          </button>
        </nav>
      </aside>
      
      {/* Backdrop to close the sidebar on mobile */}
      {menuOpen && (
        <div className="fixed inset-0 bg-black/20 z-20 md:hidden" onClick={() => setMenuOpen(false)}></div>
      )}

      {/* Main Content */}
      <main className={`pt-16 min-h-screen transition-all ${sidebarCollapsed ? 'md:pl-0' : 'md:pl-64'}`} onClick={() => menuOpen && setMenuOpen(false)}>
        <div className="p-3 sm:p-4 md:p-6">
          {children}
        </div>
      </main>
      
      {/* Mobile Bottom Navigation - Role-specific */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 shadow-lg">
        <div className="flex justify-around items-center py-1">
          {/* Home - All users */}
          <Link href="/dashboard" className="flex flex-col items-center p-2">
            <Home size={24} className={isActive('/dashboard') ? 'text-primary' : 'text-gray-500'} />
            <span className={`text-xs mt-1 ${isActive('/dashboard') ? 'text-primary' : 'text-gray-500'}`}>Home</span>
          </Link>
          
          {/* Admin and Teacher */}
          {(userRole === 'admin' || userRole === 'teacher') && (
            <Link href="/dashboard/students" className="flex flex-col items-center p-2">
              <Users size={24} className={isActive('/dashboard/students') ? 'text-primary' : 'text-gray-500'} />
              <span className={`text-xs mt-1 ${isActive('/dashboard/students') ? 'text-primary' : 'text-gray-500'}`}>Siswa</span>
            </Link>
          )}
          
          {/* Admin and Teacher */}
          {(userRole === 'admin' || userRole === 'teacher') && (
            <Link href="/dashboard/scan" className="flex flex-col items-center p-2">
              <div className="bg-primary rounded-full p-3 -mt-5">
                <Scan className="h-10 w-10 text-white" />
              </div>
              <span className="text-xs mt-1 text-gray-500">Scan QR</span>
            </Link>
          )}
          
          {/* Student */}
          {userRole === 'student' && (
            <Link href="/dashboard/profile-user" className="flex flex-col items-center p-2">
              <div className="bg-primary rounded-full p-3 -mt-5">
                <User size={24} className="text-white" />
              </div>
              <span className="text-xs mt-1 text-gray-500">Profil</span>
            </Link>
          )}
          
          {/* Admin and Teacher */}
          {(userRole === 'admin' || userRole === 'teacher') && (
            <Link href="/dashboard/classes" className="flex flex-col items-center p-2">
              <BookOpen size={24} className={isActive('/dashboard/classes') ? 'text-primary' : 'text-gray-500'} />
              <span className={`text-xs mt-1 ${isActive('/dashboard/classes') ? 'text-primary' : 'text-gray-500'}`}>Kelas</span>
            </Link>
          )}
          
          {/* All users */}
          <Link href="/dashboard/reports" className="flex flex-col items-center p-2">
            <FileText size={24} className={isActive('/dashboard/reports') ? 'text-primary' : 'text-gray-500'} />
            <span className={`text-xs mt-1 ${isActive('/dashboard/reports') ? 'text-primary' : 'text-gray-500'}`}>Laporan</span>
          </Link>
        </div>
      </div>
      <ConfirmDialog
        isOpen={logoutDialogOpen}
        title="Konfirmasi Keluar"
        message="Apakah Anda yakin ingin keluar dari aplikasi?"
        confirmLabel="Keluar"
        cancelLabel="Batal"
        confirmColor="bg-red-500 hover:bg-red-600"
        onConfirm={handleLogout}
        onCancel={() => setLogoutDialogOpen(false)}
        icon={<LogOut size={20} className="text-red-500" />}
      />
    </div>
  );
};

export default DashboardLayout;
