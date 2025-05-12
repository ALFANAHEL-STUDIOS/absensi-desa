"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Calendar, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { format, subMonths, addMonths } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { jsPDF } from "jspdf";

export default function MonthlyAttendanceReport() {
  const { schoolId } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDownloading, setIsDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("all");
  const [classes, setClasses] = useState<string[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [schoolInfo, setSchoolInfo] = useState({
    name: "NAMA SEKOLAH",
    address: "Alamat",
    npsn: "NPSN",
    principalName: "",
    principalNip: ""
  });

  // Format current date for display
  const formattedMonth = format(currentDate, "MMMM yyyy", { locale: id });
  const formattedYear = format(currentDate, "yyyy");
  
  // Fetch school, classes and attendance data
  useEffect(() => {
    const fetchData = async () => {
      if (!schoolId) return;
      
      try {
        setLoading(true);
        
        // Fetch school info
        const schoolDoc = await getDoc(doc(db, "schools", schoolId));
        if (schoolDoc.exists()) {
          const data = schoolDoc.data();
          setSchoolInfo({
            name: data.name || "NAMA SEKOLAH",
            address: data.address || "Alamat",
            npsn: data.npsn || "NPSN",
            principalName: data.principalName || "",
            principalNip: data.principalNip || ""
          });
        }
        
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

        // Fetch students with attendance data
        await fetchAttendanceData(selectedClass);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Gagal mengambil data dari database");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [schoolId]);

  // Fetch attendance data when month or class changes
  useEffect(() => {
    if (schoolId) {
      fetchAttendanceData(selectedClass);
    }
  }, [currentDate, selectedClass, schoolId]);

  // Function to fetch attendance data
  const fetchAttendanceData = async (classFilter: string) => {
    if (!schoolId) return;
    
    try {
      setLoading(true);
      
      // Get start and end date for the month
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
      
      // First, get all students matching the class filter
      const studentsRef = collection(db, `schools/${schoolId}/students`);
      const studentsQuery = classFilter === "all" 
        ? query(studentsRef) 
        : query(studentsRef, where("class", "==", classFilter));
      
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsList: any[] = [];
      
      studentsSnapshot.forEach(doc => {
        studentsList.push({
          id: doc.id,
          ...doc.data(),
          // Initialize attendance counters
          hadir: 0,
          sakit: 0,
          izin: 0,
          alpha: 0,
          total: 0
        });
      });
      
      // If we have students, get their attendance for the selected month
      if (studentsList.length > 0) {
        const attendanceRef = collection(db, `schools/${schoolId}/attendance`);
        const attendanceQuery = query(
          attendanceRef,
          where("date", ">=", startDate),
          where("date", "<=", endDate)
        );
        
        const attendanceSnapshot = await getDocs(attendanceQuery);
        
        // Process attendance records
        attendanceSnapshot.forEach(doc => {
          const data = doc.data();
          const studentId = data.studentId;
          const status = data.status;
          
          // Find the student and update their attendance counts
          const studentIndex = studentsList.findIndex(s => s.id === studentId);
          if (studentIndex !== -1) {
            if (status === 'present' || status === 'hadir') {
              studentsList[studentIndex].hadir++;
            } else if (status === 'sick' || status === 'sakit') {
              studentsList[studentIndex].sakit++;
            } else if (status === 'permitted' || status === 'izin') {
              studentsList[studentIndex].izin++;
            } else if (status === 'absent' || status === 'alpha') {
              studentsList[studentIndex].alpha++;
            }
            
            studentsList[studentIndex].total++;
          }
        });
      }
      
      setStudents(studentsList);
      
      // Calculate overall percentages
      let totalHadir = 0;
      let totalSakit = 0;
      let totalIzin = 0;
      let totalAlpha = 0;
      let totalAttendance = 0;
      
      studentsList.forEach(student => {
        totalHadir += student.hadir;
        totalSakit += student.sakit;
        totalIzin += student.izin;
        totalAlpha += student.alpha;
        totalAttendance += student.total;
      });
      
      setAttendanceData([
        {
          type: 'Hadir',
          value: totalAttendance > 0 ? ((totalHadir / totalAttendance) * 100).toFixed(1) : "0.0",
          color: 'bg-blue-100 text-blue-800'
        },
        {
          type: 'Sakit',
          value: totalAttendance > 0 ? ((totalSakit / totalAttendance) * 100).toFixed(1) : "0.0",
          color: 'bg-orange-100 text-orange-800'
        },
        {
          type: 'Izin',
          value: totalAttendance > 0 ? ((totalIzin / totalAttendance) * 100).toFixed(1) : "0.0",
          color: 'bg-green-100 text-green-800'
        },
        {
          type: 'Alpha',
          value: totalAttendance > 0 ? ((totalAlpha / totalAttendance) * 100).toFixed(1) : "0.0",
          color: 'bg-red-100 text-red-800'
        }
      ]);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      toast.error("Gagal mengambil data kehadiran");
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClass(e.target.value);
  };

  const handleDownloadPDF = () => {
    setIsDownloading(true);
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const textSize = 10;

      // Add header
      doc.setFontSize(14);
      doc.text(schoolInfo.name, pageWidth / 2, margin, { align: "center" });
      doc.setFontSize(10);
      doc.text(schoolInfo.address, pageWidth / 2, margin + 6, { align: "center" });
      doc.text(`NPSN: ${schoolInfo.npsn}`, pageWidth / 2, margin + 12, { align: "center" });
      
      // Add horizontal line
      doc.setLineWidth(0.5);
      doc.line(margin, margin + 16, pageWidth - margin, margin + 16);

      // Add title
      doc.setFontSize(12);
      doc.text("REKAP LAPORAN KEHADIRAN SISWA", pageWidth / 2, margin + 22, { align: "center" });
      doc.text(`BULAN ${formattedMonth.toUpperCase()}`, pageWidth / 2, margin + 28, { align: "center" });
      doc.text(`TAHUN ${formattedYear}`, pageWidth / 2, margin + 34, { align: "center" });

      // Add table header
      const headers = ["Nama Siswa", "NISN", "Kelas", "Hadir", "Sakit", "Izin", "Alpha", "Total"];
      const colWidths = [50, 25, 15, 15, 15, 15, 15, 15];
      
      let yPos = margin + 44;
      
      // Draw table header - Green background
      doc.setFillColor(144, 238, 144); // Light green
      doc.rect(margin, yPos, pageWidth - margin * 2, 8, "F");
      doc.setDrawColor(0);
      doc.rect(margin, yPos, pageWidth - margin * 2, 8, "S"); // Border
      
      let xPos = margin;
      doc.setFontSize(9);
      doc.setTextColor(0);
      
      // Draw vertical lines and headers
      headers.forEach((header, i) => {
        if (i > 0) {
          doc.line(xPos, yPos, xPos, yPos + 8);
        }
        doc.text(header, xPos + 2, yPos + 5.5);
        xPos += colWidths[i];
      });
      
      yPos += 8;
      
      // Draw table rows
      doc.setFontSize(8);
      students.forEach((student, index) => {
        // Row background (alternating)
        if (index % 2 === 0) {
          doc.setFillColor(240, 240, 240);
          doc.rect(margin, yPos, pageWidth - margin * 2, 7, "F");
        }
        
        // Draw row border
        doc.rect(margin, yPos, pageWidth - margin * 2, 7, "S");
        
        // Draw cell content
        xPos = margin;
        doc.text(student.name || "", xPos + 2, yPos + 5); xPos += colWidths[0];
        
        // Draw vertical line
        doc.line(xPos, yPos, xPos, yPos + 7);
        doc.text(student.nisn || "", xPos + 2, yPos + 5); xPos += colWidths[1];
        
        // Draw vertical line
        doc.line(xPos, yPos, xPos, yPos + 7);
        doc.text(student.class || "", xPos + 2, yPos + 5); xPos += colWidths[2];
        
        // Draw vertical line
        doc.line(xPos, yPos, xPos, yPos + 7);
        doc.text(student.hadir.toString(), xPos + 2, yPos + 5); xPos += colWidths[3];
        
        // Draw vertical line
        doc.line(xPos, yPos, xPos, yPos + 7);
        doc.text(student.sakit.toString(), xPos + 2, yPos + 5); xPos += colWidths[4];
        
        // Draw vertical line
        doc.line(xPos, yPos, xPos, yPos + 7);
        doc.text(student.izin.toString(), xPos + 2, yPos + 5); xPos += colWidths[5];
        
        // Draw vertical line
        doc.line(xPos, yPos, xPos, yPos + 7);
        doc.text(student.alpha.toString(), xPos + 2, yPos + 5); xPos += colWidths[6];
        
        // Draw vertical line
        doc.line(xPos, yPos, xPos, yPos + 7);
        doc.text(student.total.toString(), xPos + 2, yPos + 5);
        
        yPos += 7;
        
        // Add a new page if we're near the bottom
        if (yPos > pageHeight - margin - 40 && index < students.length - 1) {
          doc.addPage();
          yPos = margin;
        }
      });
      
      // Calculate totals
      const totalHadir = students.reduce((sum, student) => sum + student.hadir, 0);
      const totalSakit = students.reduce((sum, student) => sum + student.sakit, 0);
      const totalIzin = students.reduce((sum, student) => sum + student.izin, 0);
      const totalAlpha = students.reduce((sum, student) => sum + student.alpha, 0);
      const totalAll = totalHadir + totalSakit + totalIzin + totalAlpha;
      
      // Add totals row
      doc.setFillColor(200, 200, 200);
      doc.rect(margin, yPos, pageWidth - margin * 2, 8, "F");
      doc.rect(margin, yPos, pageWidth - margin * 2, 8, "S"); // Border
      
      xPos = margin;
      doc.setFontSize(9);
      doc.text("TOTAL", xPos + 2, yPos + 5.5); 
      xPos += colWidths[0] + colWidths[1] + colWidths[2];
      
      // Draw vertical line
      doc.line(xPos, yPos, xPos, yPos + 8);
      doc.text(totalHadir.toString(), xPos + 2, yPos + 5.5); xPos += colWidths[3];
      
      // Draw vertical line
      doc.line(xPos, yPos, xPos, yPos + 8);
      doc.text(totalSakit.toString(), xPos + 2, yPos + 5.5); xPos += colWidths[4];
      
      // Draw vertical line
      doc.line(xPos, yPos, xPos, yPos + 8);
      doc.text(totalIzin.toString(), xPos + 2, yPos + 5.5); xPos += colWidths[5];
      
      // Draw vertical line
      doc.line(xPos, yPos, xPos, yPos + 8);
      doc.text(totalAlpha.toString(), xPos + 2, yPos + 5.5); xPos += colWidths[6];
      
      // Draw vertical line
      doc.line(xPos, yPos, xPos, yPos + 8);
      doc.text(totalAll.toString(), xPos + 2, yPos + 5.5);
      
      yPos += 20;
      
      // Add signature section
      const signatureWidth = (pageWidth - margin * 2) / 2;
      
      doc.text("Mengetahui", margin + signatureWidth * 0.25, yPos, { align: "center" });
      doc.text("Di unduh pada :", margin + signatureWidth * 1.75, yPos, { align: "center" });
      
      yPos += 5;
      
      doc.text("Kepala Sekolah,", margin + signatureWidth * 0.25, yPos, { align: "center" });
      doc.text(`Wali Kelas "${selectedClass || 'kelas'}"`, margin + signatureWidth * 1.75, yPos, { align: "center" });
      
      yPos += 20;
      
      doc.text(`"${schoolInfo.principalName}"`, margin + signatureWidth * 0.25, yPos, { align: "center" });
      doc.text(`"nama wali kelas"`, margin + signatureWidth * 1.75, yPos, { align: "center" });
      
      yPos += 5;
      
      doc.text(`NIP. "${schoolInfo.principalNip}"`, margin + signatureWidth * 0.25, yPos, { align: "center" });
      doc.text("NIP. ...............................", margin + signatureWidth * 1.75, yPos, { align: "center" });
      
      // Save the PDF
      const fileName = `Rekap_Kehadiran_${formattedMonth.replace(' ', '_')}.pdf`;
      doc.save(fileName);
      
      toast.success(`Laporan berhasil diunduh sebagai ${fileName}`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Gagal mengunduh laporan PDF");
    } finally {
      setIsDownloading(false);
    }
  };
  
  const handleDownloadExcel = async () => {
    setIsDownloading(true);
    try {
      // Dynamically import xlsx library
      const XLSX = await import('xlsx');
      
      // Create worksheet data
      const wsData = [
        [schoolInfo.name],
        [schoolInfo.address],
        [`NPSN: ${schoolInfo.npsn}`],
        [],
        ["REKAP LAPORAN KEHADIRAN SISWA"],
        [`BULAN ${formattedMonth.toUpperCase()}`],
        [`TAHUN ${formattedYear}`],
        [],
        [`Hadir: ${attendanceData[0]?.value || "0.0"}%`, `Sakit: ${attendanceData[1]?.value || "0.0"}%`, `Izin: ${attendanceData[2]?.value || "0.0"}%`, `Alpha: ${attendanceData[3]?.value || "0.0"}%`],
        [],
        ["Nama Siswa", "NISN", "Kelas", "Hadir", "Sakit", "Izin", "Alpha", "Total"]
      ];
      
      // Add student data
      students.forEach(student => {
        wsData.push([
          student.name || "", 
          student.nisn || "", 
          student.class || "", 
          student.hadir || 0, 
          student.sakit || 0, 
          student.izin || 0, 
          student.alpha || 0, 
          student.total || 0
        ]);
      });
      
      // Calculate totals
      const totalHadir = students.reduce((sum, student) => sum + student.hadir, 0);
      const totalSakit = students.reduce((sum, student) => sum + student.sakit, 0);
      const totalIzin = students.reduce((sum, student) => sum + student.izin, 0);
      const totalAlpha = students.reduce((sum, student) => sum + student.alpha, 0);
      const totalAll = totalHadir + totalSakit + totalIzin + totalAlpha;
      
      // Add totals row
      wsData.push([
        "TOTAL", "", "", totalHadir, totalSakit, totalIzin, totalAlpha, totalAll
      ]);
      
      // Create workbook and add worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Set column widths
      const colWidths = [
        { wch: 30 }, // Name
        { wch: 15 }, // NISN
        { wch: 10 }, // Class
        { wch: 8 },  // Hadir
        { wch: 8 },  // Sakit
        { wch: 8 },  // Izin
        { wch: 8 },  // Alpha
        { wch: 8 }   // Total
      ];
      
      ws['!cols'] = colWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Rekap Kehadiran");
      
      // Generate Excel file
      const fileName = `Rekap_Kehadiran_${formattedMonth.replace(' ', '_')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success(`Laporan berhasil diunduh sebagai ${fileName}`);
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
        <h1 className="text-2xl font-bold text-gray-800">Rekap Kehadiran Per Bulan</h1>
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
        
        {/* Filter by class */}
        <div className="mb-6">
          <div className="flex items-center mb-2">
            <label htmlFor="class-filter" className="block text-sm font-medium text-gray-700 mr-2">
              Filter Kelas:
            </label>
            <select
              id="class-filter"
              value={selectedClass}
              onChange={handleClassChange}
              className="border border-gray-300 rounded-md py-1 px-3 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Semua Kelas</option>
              {classes.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Attendance Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
          {attendanceData.map((item, index) => (
            <div key={index} className={`${item.color} rounded-xl p-4 border`}>
              <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-1">{item.type}</h3>
              <p className="text-xl md:text-2xl font-bold">{item.value}%</p>
            </div>
          ))}
        </div>
        
        {/* School Information and Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="text-center p-4">
            <h2 className="text-xl font-bold uppercase">{schoolInfo.name}</h2>
            <p className="text-gray-600">{schoolInfo.address}</p>
            <p className="text-gray-600">NPSN: {schoolInfo.npsn}</p>
          </div>
          
          <hr className="border-t border-gray-300 my-4" />
          
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold uppercase">REKAP LAPORAN KEHADIRAN SISWA</h3>
            <p className="font-medium">BULAN {formattedMonth.toUpperCase()}</p>
            <p className="font-medium">TAHUN {formattedYear}</p>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border">
                <thead>
                  <tr className="bg-green-100">
                    <th className="border px-2 py-2 text-left text-sm font-medium text-gray-700">Nama Siswa</th>
                    <th className="border px-2 py-2 text-left text-sm font-medium text-gray-700">NISN</th>
                    <th className="border px-2 py-2 text-left text-sm font-medium text-gray-700">Kelas</th>
                    <th className="border px-2 py-2 text-center text-sm font-medium text-gray-700">Hadir</th>
                    <th className="border px-2 py-2 text-center text-sm font-medium text-gray-700">Sakit</th>
                    <th className="border px-2 py-2 text-center text-sm font-medium text-gray-700">Izin</th>
                    <th className="border px-2 py-2 text-center text-sm font-medium text-gray-700">Alpha</th>
                    <th className="border px-2 py-2 text-center text-sm font-medium text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length > 0 ? (
                    students.map((student, index) => (
                      <tr key={student.id} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                        <td className="border px-2 py-1 text-xs sm:text-sm">{student.name}</td>
                        <td className="border px-2 py-1 text-xs sm:text-sm">{student.nisn}</td>
                        <td className="border px-2 py-1 text-xs sm:text-sm">{student.class}</td>
                        <td className="border px-2 py-1 text-xs sm:text-sm text-center">{student.hadir}</td>
                        <td className="border px-2 py-1 text-xs sm:text-sm text-center">{student.sakit}</td>
                        <td className="border px-2 py-1 text-xs sm:text-sm text-center">{student.izin}</td>
                        <td className="border px-2 py-1 text-xs sm:text-sm text-center">{student.alpha}</td>
                        <td className="border px-2 py-1 text-xs sm:text-sm text-center">{student.total}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="border px-4 py-4 text-center text-gray-500">
                        Tidak ada data kehadiran yang ditemukan
                      </td>
                    </tr>
                  )}
                  
                  {/* Total row */}
                  {students.length > 0 && (
                    <tr className="bg-gray-200 font-medium">
                      <td colSpan={3} className="border px-2 py-2 font-bold text-sm">TOTAL</td>
                      <td className="border px-2 py-2 text-center font-bold text-sm">
                        {students.reduce((sum, student) => sum + student.hadir, 0)}
                      </td>
                      <td className="border px-2 py-2 text-center font-bold text-sm">
                        {students.reduce((sum, student) => sum + student.sakit, 0)}
                      </td>
                      <td className="border px-2 py-2 text-center font-bold text-sm">
                        {students.reduce((sum, student) => sum + student.izin, 0)}
                      </td>
                      <td className="border px-2 py-2 text-center font-bold text-sm">
                        {students.reduce((sum, student) => sum + student.alpha, 0)}
                      </td>
                      <td className="border px-2 py-2 text-center font-bold text-sm">
                        {students.reduce((sum, student) => sum + student.total, 0)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
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
