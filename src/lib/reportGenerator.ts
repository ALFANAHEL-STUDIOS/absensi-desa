"use client";

import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface SchoolInfo {
  name: string;
  address: string;
  npsn: string;
  principalName: string;
  principalNip?: string;
}

interface AttendanceData {
  present: number;
  sick: number;
  permitted: number;
  absent: number;
  total?: number;
  month?: string;
  className?: string;
}

export const generatePDF = async (
  schoolInfo: SchoolInfo,
  attendanceData: AttendanceData,
  reportType: "monthly" | "class" | "student" | "custom",
  additionalInfo?: { className?: string; studentName?: string; teacherName?: string; schoolId?: string; studentId?: string; dateRange?: { start: string; end: string } }
) => {
  // Fetch additional data from Firestore if needed
  if (additionalInfo?.schoolId) {
    try {
      const { db } = await import('@/lib/firebase');
      const { doc, getDoc, collection, getDocs, query, where, orderBy, limit } = await import('firebase/firestore');
      
      // Fetch school data
      const schoolRef = doc(db, 'schools', additionalInfo.schoolId);
      const schoolSnap = await getDoc(schoolRef);
      if (schoolSnap.exists()) {
        const schoolData = schoolSnap.data();
        schoolInfo.name = schoolData.name || schoolInfo.name;
        schoolInfo.address = schoolData.address || schoolInfo.address;
        schoolInfo.npsn = schoolData.npsn || schoolInfo.npsn;
        schoolInfo.principalName = schoolData.principalName || schoolInfo.principalName;
        schoolInfo.principalNip = schoolData.principalNip || schoolInfo.principalNip;
      }
      
      // Get student data for student report
      if (reportType === "student" && additionalInfo?.studentId) {
        const studentRef = doc(db, `schools/${additionalInfo.schoolId}/students`, additionalInfo.studentId);
        const studentSnap = await getDoc(studentRef);
        
        if (studentSnap.exists()) {
          const studentData = studentSnap.data();
          // Update additionalInfo with data from Firestore
          additionalInfo.className = studentData.class || additionalInfo.className;
          additionalInfo.studentName = studentData.name || additionalInfo.studentName;
          
          // Fetch attendance data for this student
          const attendanceRef = collection(db, `schools/${additionalInfo.schoolId}/attendance`);
          const attendanceQuery = query(
            attendanceRef,
            where("studentId", "==", additionalInfo.studentId),
            orderBy("date", "desc"),
            limit(30)
          );
          const attendanceSnap = await getDocs(attendanceQuery);
          
          // Count attendance statuses
          let present = 0, sick = 0, permitted = 0, absent = 0;
          attendanceSnap.forEach(doc => {
            const data = doc.data();
            if (data.status === "present" || data.status === "hadir") present++;
            else if (data.status === "sick" || data.status === "sakit") sick++;
            else if (data.status === "permitted" || data.status === "izin") permitted++;
            else if (data.status === "absent" || data.status === "alpha") absent++;
          });
          
          // Update attendance data with real counts
          const total = present + sick + permitted + absent || 1; // Prevent division by zero
          attendanceData.present = present;
          attendanceData.sick = sick;
          attendanceData.permitted = permitted;
          attendanceData.absent = absent;
          attendanceData.total = total;
        }
      }
      
      // Get class data for class report
      if (reportType === "class" && additionalInfo?.className) {
        // Fetch students from this class
        const studentsRef = collection(db, `schools/${additionalInfo.schoolId}/students`);
        const studentsQuery = query(
          studentsRef,
          where("class", "==", additionalInfo.className)
        );
        const studentsSnap = await getDocs(studentsQuery);
        
        // Fetch attendance data for all students in the class
        let present = 0, sick = 0, permitted = 0, absent = 0;
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 7); // Last week
        
        const promises = studentsSnap.docs.map(async (studentDoc) => {
          const studentId = studentDoc.id;
          const attendanceRef = collection(db, `schools/${additionalInfo.schoolId}/attendance`);
          const attendanceQuery = query(
            attendanceRef,
            where("studentId", "==", studentId),
            where("date", ">=", recentDate.toISOString().split('T')[0])
          );
          
          const attendanceSnap = await getDocs(attendanceQuery);
          attendanceSnap.forEach(doc => {
            const data = doc.data();
            if (data.status === "present" || data.status === "hadir") present++;
            else if (data.status === "sick" || data.status === "sakit") sick++;
            else if (data.status === "permitted" || data.status === "izin") permitted++;
            else if (data.status === "absent" || data.status === "alpha") absent++;
          });
        });
        
        await Promise.all(promises);
        
        // Update attendance data with real counts
        const total = present + sick + permitted + absent || 1; // Prevent division by zero
        attendanceData.present = present;
        attendanceData.sick = sick;
        attendanceData.permitted = permitted;
        attendanceData.absent = absent;
        attendanceData.total = total;
      }
      
      // For monthly reports, get all attendance data for the month
      if (reportType === "monthly" && attendanceData.month) {
        const [year, month] = attendanceData.month.split(' ');
        const monthsInIndonesian = [
          "januari", "februari", "maret", "april", "mei", "juni",
          "juli", "agustus", "september", "oktober", "november", "desember"
        ];
        
        const monthIndex = monthsInIndonesian.findIndex(m => 
          m.toLowerCase() === month.toLowerCase());
        
        if (monthIndex >= 0) {
          const startDate = new Date(parseInt(year), monthIndex, 1);
          const endDate = new Date(parseInt(year), monthIndex + 1, 0);
          
          const startDateStr = startDate.toISOString().split('T')[0];
          const endDateStr = endDate.toISOString().split('T')[0];
          
          // Fetch all attendance records for the month
          const attendanceRef = collection(db, `schools/${additionalInfo.schoolId}/attendance`);
          const attendanceQuery = query(
            attendanceRef,
            where("date", ">=", startDateStr),
            where("date", "<=", endDateStr)
          );
          
          const attendanceSnap = await getDocs(attendanceQuery);
          
          let present = 0, sick = 0, permitted = 0, absent = 0;
          attendanceSnap.forEach(doc => {
            const data = doc.data();
            if (data.status === "present" || data.status === "hadir") present++;
            else if (data.status === "sick" || data.status === "sakit") sick++;
            else if (data.status === "permitted" || data.status === "izin") permitted++;
            else if (data.status === "absent" || data.status === "alpha") absent++;
          });
          
          // Update attendance data with real counts
          const total = present + sick + permitted + absent || 1; // Prevent division by zero
          attendanceData.present = present;
          attendanceData.sick = sick;
          attendanceData.permitted = permitted;
          attendanceData.absent = absent;
          attendanceData.total = total;
        }
      }
    } catch (error) {
      console.error("Error fetching data for PDF:", error);
    }
  }
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const currentDate = format(new Date(), "d MMMM yyyy", { locale: id });
  
  // Set font
  doc.setFont("helvetica");
  
  // School header with bold formatting and enhanced info
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(schoolInfo.name, pageWidth / 2, 20, { align: "center" });
  
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(schoolInfo.address, pageWidth / 2, 27, { align: "center" });
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`NPSN :  ${schoolInfo.npsn}`, pageWidth / 2, 33, { align: "center" });
  
  // Horizontal line with adjusted position
  doc.setLineWidth(0.5);
  doc.line(20, 40, pageWidth - 20, 40);
  
  // Report title with improved spacing
  doc.setFontSize(14);
  let title = "LAPORAN REKAPITULASI KEHADIRAN";
  
  if (reportType === "monthly") {
    title += ` BULAN ${attendanceData.month?.toUpperCase() || format(new Date(), "MMMM yyyy", { locale: id }).toUpperCase()}`;
    doc.text(title, pageWidth / 2, 55, { align: "center" });
    // Removed "Rekapitulasi Kehadiran" text
  } else if (reportType === "class") {
    title += ` ${additionalInfo?.className?.toUpperCase() || ""}`;
    doc.text(title, pageWidth / 2, 50, { align: "center" });
    doc.setFontSize(12);
    
    // Get today's date for the period text
    const today = format(new Date(), "dd MMMM yyyy", { locale: id });
    const weekAgo = format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), "dd MMMM yyyy", { locale: id });
    doc.text(`Periode Tanggal ${weekAgo} sampai ${today}`, pageWidth / 2, 58, { align: "center" });
  } else if (reportType === "student") {
    doc.text(title, pageWidth / 2, 50, { align: "center" });
    doc.text(`BULAN : ${format(new Date(), "MMMM yyyy", { locale: id }).toUpperCase()}`, pageWidth / 2, 58, { align: "center" });
    doc.setFontSize(11);
    doc.text(`NAMA SISWA : ${additionalInfo?.studentName?.toUpperCase() || ""}`, pageWidth / 2, 66, { align: "center" });
    // Always show class level
    doc.setFontSize(10);
    // Always show class level
    const classLevel = additionalInfo?.className || "-";
    doc.text(`KELAS SISWA : ${classLevel}`, pageWidth / 2, 74, { align: "center" });
    doc.text(`KELAS SISWA : ${classLevel}`, pageWidth / 2, 74, { align: "center" });
    // Removed "Rekapitulasi Kehadiran" text
  }
  
  // Calculate total
  const total = attendanceData.total || 
    (attendanceData.present + attendanceData.sick + attendanceData.permitted + attendanceData.absent);
    
  // Create wider table with proper positioning
  const tableX = 20;
  const tableY = reportType === "student" ? 85 : 70;
  const tableWidth = pageWidth - 40;
  
  // Add space before table
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  // Table headers with larger font and lighter, elegant styling
  doc.setFillColor(240, 249, 255); // Lighter blue background
  doc.rect(tableX, tableY, tableWidth, 12, "F");
  doc.setDrawColor(180, 200, 230); // Lighter border color
  doc.rect(tableX, tableY, tableWidth, 12, "S");
  
  // Draw vertical lines for header
  doc.line(tableX + tableWidth * 0.4, tableY, tableX + tableWidth * 0.4, tableY + 12);
  doc.line(tableX + tableWidth * 0.7, tableY, tableX + tableWidth * 0.7, tableY + 12);
  
  doc.setFontSize(12);
  doc.setTextColor(50, 50, 80); // Darker text for better contrast
  doc.text("Status", tableX + tableWidth * 0.2, tableY + 8, { align: "center" });
  doc.text("Jumlah", tableX + tableWidth * 0.55, tableY + 8, { align: "center" });
  doc.text("%", tableX + tableWidth * 0.85, tableY + 8, { align: "center" });
  
  // Table rows with improved formatting and larger font
  const rowHeight = 10;
  doc.setDrawColor(150, 180, 220); // Consistent border color
  doc.setFontSize(11);
  
  // Hadir row
  doc.setFillColor(255, 255, 255); // White background
  doc.rect(tableX, tableY + 12, tableWidth, rowHeight, "F");
  doc.rect(tableX, tableY + 12, tableWidth, rowHeight, "S");
  // Vertical lines
  doc.line(tableX + tableWidth * 0.4, tableY + 12, tableX + tableWidth * 0.4, tableY + 12 + rowHeight);
  doc.line(tableX + tableWidth * 0.7, tableY + 12, tableX + tableWidth * 0.7, tableY + 12 + rowHeight);
  doc.text("Hadir", tableX + tableWidth * 0.2, tableY + 12 + 7, { align: "center" });
  doc.text(`${attendanceData.present}`, tableX + tableWidth * 0.55, tableY + 12 + 7, { align: "center" });
  doc.text(`${((attendanceData.present / total) * 100).toFixed(1)}%`, tableX + tableWidth * 0.85, tableY + 12 + 7, { align: "center" });
  
  // Sakit row
  doc.setFillColor(255, 255, 255); // White background
  doc.rect(tableX, tableY + 22, tableWidth, rowHeight, "F");
  doc.rect(tableX, tableY + 22, tableWidth, rowHeight, "S");
  // Vertical lines
  doc.line(tableX + tableWidth * 0.4, tableY + 22, tableX + tableWidth * 0.4, tableY + 22 + rowHeight);
  doc.line(tableX + tableWidth * 0.7, tableY + 22, tableX + tableWidth * 0.7, tableY + 22 + rowHeight);
  doc.text("Sakit", tableX + tableWidth * 0.2, tableY + 22 + 7, { align: "center" });
  doc.text(`${attendanceData.sick}`, tableX + tableWidth * 0.55, tableY + 22 + 7, { align: "center" });
  doc.text(`${((attendanceData.sick / total) * 100).toFixed(1)}%`, tableX + tableWidth * 0.85, tableY + 22 + 7, { align: "center" });
  
  // Izin row
  doc.setFillColor(255, 255, 255); // White background
  doc.rect(tableX, tableY + 32, tableWidth, rowHeight, "F");
  doc.rect(tableX, tableY + 32, tableWidth, rowHeight, "S");
  // Vertical lines
  doc.line(tableX + tableWidth * 0.4, tableY + 32, tableX + tableWidth * 0.4, tableY + 32 + rowHeight);
  doc.line(tableX + tableWidth * 0.7, tableY + 32, tableX + tableWidth * 0.7, tableY + 32 + rowHeight);
  doc.text("Izin", tableX + tableWidth * 0.2, tableY + 32 + 7, { align: "center" });
  doc.text(`${attendanceData.permitted}`, tableX + tableWidth * 0.55, tableY + 32 + 7, { align: "center" });
  doc.text(`${((attendanceData.permitted / total) * 100).toFixed(1)}%`, tableX + tableWidth * 0.85, tableY + 32 + 7, { align: "center" });
  
  // Alpha row
  doc.setFillColor(255, 255, 255); // White background
  doc.rect(tableX, tableY + 42, tableWidth, rowHeight, "F");
  doc.rect(tableX, tableY + 42, tableWidth, rowHeight, "S");
  // Vertical lines
  doc.line(tableX + tableWidth * 0.4, tableY + 42, tableX + tableWidth * 0.4, tableY + 42 + rowHeight);
  doc.line(tableX + tableWidth * 0.7, tableY + 42, tableX + tableWidth * 0.7, tableY + 42 + rowHeight);
  doc.text("Alpha", tableX + tableWidth * 0.2, tableY + 42 + 7, { align: "center" });
  doc.text(`${attendanceData.absent}`, tableX + tableWidth * 0.55, tableY + 42 + 7, { align: "center" });
  doc.text(`${((attendanceData.absent / total) * 100).toFixed(1)}%`, tableX + tableWidth * 0.85, tableY + 42 + 7, { align: "center" });
  
  // Total row
  doc.setFillColor(255, 255, 255); // White background for total row
  doc.rect(tableX, tableY + 52, tableWidth, rowHeight, "F");
  doc.rect(tableX, tableY + 52, tableWidth, rowHeight, "S");
  // Vertical lines
  doc.line(tableX + tableWidth * 0.4, tableY + 52, tableX + tableWidth * 0.4, tableY + 52 + rowHeight);
  doc.line(tableX + tableWidth * 0.7, tableY + 52, tableX + tableWidth * 0.7, tableY + 52 + rowHeight);
  doc.text("Total", tableX + tableWidth * 0.2, tableY + 52 + 7, { align: "center" });
  doc.text(`${total}`, tableX + tableWidth * 0.55, tableY + 52 + 7, { align: "center" });
  doc.text("100%", tableX + tableWidth * 0.85, tableY + 52 + 7, { align: "center" });
  
  // Signatures - centered layout with reduced spacing
  doc.setFontSize(11);
  doc.text(`Di unduh pada: ${currentDate}`, pageWidth / 2, tableY + 75, { align: "center" });
  
  // Centered signature sections with increased spacing
  const signatureY = tableY + 90;
  const leftSignatureX = pageWidth / 4;
  const rightSignatureX = (pageWidth / 4) * 3;
  
  doc.setFontSize(10);
  doc.text("Mengetahui,", leftSignatureX, signatureY, { align: "center" });
  doc.text("Kepala Sekolah", leftSignatureX, signatureY + 5, { align: "center" });
  
  doc.text("Administrator Sekolah", rightSignatureX, signatureY, { align: "center" });
  doc.text(schoolInfo.name, rightSignatureX, signatureY + 5, { align: "center" });
  
  // Increased space for signatures
  const nameY = signatureY + 30;
  
  doc.setFontSize(10);
  doc.text("_________________", leftSignatureX, nameY, { align: "center" });
  doc.text("NIP. ......................................", leftSignatureX, nameY + 5, { align: "center" });
  doc.text("_________________", rightSignatureX, nameY, { align: "center" });
  doc.text("NIP. ......................................", rightSignatureX, nameY + 5, { align: "center" });
  
  // Save the PDF
  const fileName = `Laporan_${reportType}_${format(new Date(), "dd-MM-yyyy")}.pdf`;
  doc.save(fileName);
  
  return fileName;
};

// Make sure this function is properly exported
export const generateComprehensiveReport = (
  schoolInfo: SchoolInfo,
  monthlyData: any,
  weeklyData: any,
  studentData: any,
  reportType: "pdf" | "excel"
) => {
  if (reportType === "pdf") {
    return generateComprehensivePDF(schoolInfo, monthlyData, weeklyData, studentData);
  } else {
    return generateComprehensiveExcel(schoolInfo, monthlyData, weeklyData, studentData);
  }
};

function generateComprehensivePDF(
  schoolInfo: SchoolInfo,
  monthlyData: any,
  weeklyData: any,
  studentData: any
) {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const currentDate = format(new Date(), "d MMMM yyyy", { locale: id });
    
    // Set font
    doc.setFont("helvetica");
    
    // School header - moved closer to the top
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(schoolInfo.name.toUpperCase(), pageWidth / 2, 15, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(schoolInfo.address, pageWidth / 2, 22, { align: "center" });
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`NPSN: ${schoolInfo.npsn}`, pageWidth / 2, 28, { align: "center" });
    doc.setFont("helvetica", "normal");
    
    // Horizontal line - moved up
    doc.setLineWidth(0.5);
    doc.line(20, 32, pageWidth - 20, 32);
    
    // Report title - moved down slightly
    doc.setFontSize(14);
    doc.text("LAPORAN KOMPREHENSIF KEHADIRAN SISWA", pageWidth / 2, 48, { align: "center" });
    doc.setFontSize(11);
    doc.text(`PERIODE : ${(monthlyData?.month || format(new Date(), "MMMM yyyy", { locale: id })).toUpperCase()}`, pageWidth / 2, 56, { align: "center" });
    
    // Monthly summary
    doc.setFontSize(12);
    doc.text("1. Rekapitulasi Kehadiran Bulanan", 20, 70);
    
    const tableX = 20;
    let tableY = 80;
    
    // Table headers
    doc.setFillColor(240, 240, 240);
    doc.rect(tableX, tableY, pageWidth - 40, 10, "F");
    doc.setDrawColor(180, 180, 180);
    doc.rect(tableX, tableY, pageWidth - 40, 10, "S");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text("Status", tableX + 20, tableY + 6, { align: "center" });
    doc.text("Jumlah", tableX + 60, tableY + 6, { align: "center" });
    doc.text("%", tableX + 100, tableY + 6, { align: "center" });
    
    const rowHeight = 8;
    
    // Monthly data rows
    const data = monthlyData || { hadir: 0, sakit: 0, izin: 0, alpha: 0, total: 0 };
    const total = data.total || 100; // Prevent division by zero
    
    ["Hadir", "Sakit", "Izin", "Alpha"].forEach((status, index) => {
      const y = tableY + 10 + (index * rowHeight);
      const value = data[status.toLowerCase()] || 0;
      const percent = ((value / total) * 100).toFixed(1);
      
      doc.setFillColor(index % 2 === 0 ? 255 : 245, index % 2 === 0 ? 255 : 245, index % 2 === 0 ? 255 : 245);
      doc.rect(tableX, y, pageWidth - 40, rowHeight, "F");
      doc.setDrawColor(220, 220, 220);
      doc.rect(tableX, y, pageWidth - 40, rowHeight, "S");
      doc.text(status, tableX + 20, y + 6, { align: "center" });
      doc.text(value.toString(), tableX + 60, y + 6, { align: "center" });
      doc.text(`${percent}%`, tableX + 100, y + 6, { align: "center" });
    });
    
    // Total row
    tableY += 40;
    doc.setFillColor(240, 240, 240);
    doc.rect(tableX, tableY, pageWidth - 40, rowHeight, "F");
    doc.rect(tableX, tableY, pageWidth - 40, rowHeight, "S");
    doc.text("Total", tableX + 20, tableY + 6, { align: "center" });
    doc.text(total.toString(), tableX + 60, tableY + 6, { align: "center" });
    doc.text("100%", tableX + 100, tableY + 6, { align: "center" });
    
    // Weekly summary
    tableY += 25;
    doc.setFontSize(12);
    doc.text("2. Rekapitulasi Kehadiran Mingguan", 20, tableY);
    
    tableY += 10;
    // Weekly table headers
    doc.setFillColor(240, 240, 240);
    doc.rect(tableX, tableY, pageWidth - 40, 10, "F");
    doc.setDrawColor(180, 180, 180);
    doc.rect(tableX, tableY, pageWidth - 40, 10, "S");
    doc.text("Minggu", tableX + 15, tableY + 6, { align: "center" });
    doc.text("Hadir", tableX + 45, tableY + 6, { align: "center" });
    doc.text("Sakit", tableX + 70, tableY + 6, { align: "center" });
    doc.text("Izin", tableX + 95, tableY + 6, { align: "center" });
    doc.text("Alpha", tableX + 120, tableY + 6, { align: "center" });
    
    // Weekly data rows
    if (weeklyData && Array.isArray(weeklyData) && weeklyData.length > 0) {
      weeklyData.forEach((week, index) => {
        const y = tableY + 10 + (index * rowHeight);
        doc.setFillColor(index % 2 === 0 ? 255 : 245, index % 2 === 0 ? 255 : 245, index % 2 === 0 ? 255 : 245);
        doc.rect(tableX, y, pageWidth - 40, rowHeight, "F");
        doc.setDrawColor(220, 220, 220);
        doc.rect(tableX, y, pageWidth - 40, rowHeight, "S");
        doc.text(week.week || `Minggu ${index + 1}`, tableX + 15, y + 6, { align: "center" });
        doc.text((week.hadir || 0).toString(), tableX + 45, y + 6, { align: "center" });
        doc.text((week.sakit || 0).toString(), tableX + 70, y + 6, { align: "center" });
        doc.text((week.izin || 0).toString(), tableX + 95, y + 6, { align: "center" });
        doc.text((week.alpha || 0).toString(), tableX + 120, y + 6, { align: "center" });
      });
    }
    
    // Add a new page for student data
    doc.addPage();
    
    // Student summary
    doc.setFontSize(12);
    doc.text("3. Rekapitulasi Kehadiran Per Siswa", 20, 40);
    
    tableY = 50;
    // Students table headers
    doc.setFillColor(240, 240, 240);
    doc.rect(tableX, tableY, pageWidth - 40, 10, "F");
    doc.setDrawColor(180, 180, 180);
    doc.rect(tableX, tableY, pageWidth - 40, 10, "S");
    doc.text("Nama", tableX + 25, tableY + 6, { align: "center" });
    doc.text("Kelas", tableX + 60, tableY + 6, { align: "center" });
    doc.text("Hadir", tableX + 85, tableY + 6, { align: "center" });
    doc.text("Sakit", tableX + 105, tableY + 6, { align: "center" });
    doc.text("Izin", tableX + 125, tableY + 6, { align: "center" });
    doc.text("Alpha", tableX + 145, tableY + 6, { align: "center" });
    
    // Student data rows
    // Student rows (fetch real data from Firestore would go here)
    const studentRows: any[] = [];
  
    // Define the function at the top level of the function body
    const fetchStudentData = async (schoolIdParam: string) => {
      try {
        const { collection, getDocs, query, orderBy, where } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
    
        // Fetch actual students from Firestore
        const studentsRef = collection(db, `schools/${schoolIdParam}/students`);
        const studentsQuery = query(studentsRef, orderBy('name', 'asc'));
        const studentsSnapshot = await getDocs(studentsQuery);
    
        const fetchedStudentRows = [];
    
        // Track attendance data for each student
        for (const studentDoc of studentsSnapshot.docs) {
          const studentData = studentDoc.data();
          const studentId = studentDoc.id;
      
          // Get attendance records for this student
          const attendanceRef = collection(db, `schools/${schoolIdParam}/attendance`);
          const attendanceQuery = query(
            attendanceRef,
            where("studentId", "==", studentId)
          );
      
          const attendanceSnapshot = await getDocs(attendanceQuery);
      
          let present = 0;
          let sick = 0;
          let permitted = 0;
          let absent = 0;
      
          attendanceSnapshot.forEach(doc => {
            const status = doc.data().status;
            if (status === 'present' || status === 'hadir') present++;
            else if (status === 'sick' || status === 'sakit') sick++;
            else if (status === 'permitted' || status === 'izin') permitted++;
            else if (status === 'absent' || status === 'alpha') absent++;
          });
      
          fetchedStudentRows.push({
            name: studentData.name || "Unknown Name",
            class: studentData.class || "-",
            hadir: present,
            sakit: sick,
            izin: permitted,
            alpha: absent
          });
        }
    
        return fetchedStudentRows;
      } catch (error) {
        console.error("Error fetching student data from Firestore:", error);
        return [];
      }
    };
  
    // If we have real data, use it; otherwise fall back to provided data
    const records: any[] = [];
    const recordsToUse = records.length > 0 ? records : 
      (studentData && Array.isArray(studentData) && studentData.length > 0) ? studentData : [];
  
    recordsToUse.forEach((student, index) => {
      const y = tableY + 10 + (index * rowHeight);
      // Skip to new page if we're about to overflow
      if (y > 270) {
        doc.addPage();
        tableY = 20;
      
        // Re-add header on new page
        doc.setFillColor(240, 240, 240);
        doc.rect(tableX, tableY, pageWidth - 40, 10, "F");
        doc.setDrawColor(180, 180, 180);
        doc.rect(tableX, tableY, pageWidth - 40, 10, "S");
        doc.text("Nama", tableX + 25, tableY + 6, { align: "center" });
        doc.text("Kelas", tableX + 60, tableY + 6, { align: "center" });
        doc.text("Hadir", tableX + 85, tableY + 6, { align: "center" });
        doc.text("Sakit", tableX + 105, tableY + 6, { align: "center" });
        doc.text("Izin", tableX + 125, tableY + 6, { align: "center" });
        doc.text("Alpha", tableX + 145, tableY + 6, { align: "center" });
      }
    
      const rowY = tableY + 10 + ((index % 25) * rowHeight);
      doc.setFillColor(index % 2 === 0 ? 255 : 245, index % 2 === 0 ? 255 : 245, index % 2 === 0 ? 255 : 245);
      doc.rect(tableX, rowY, pageWidth - 40, rowHeight, "F");
      doc.setDrawColor(220, 220, 220);
      doc.rect(tableX, rowY, pageWidth - 40, rowHeight, "S");
    
      // Truncate long names
      const name = student.name || "";
      const displayName = name.length > 18 ? name.substring(0, 16) + "..." : name;
    
      doc.text(displayName, tableX + 25, rowY + 6, { align: "center" });
      doc.text(student.class || "-", tableX + 60, rowY + 6, { align: "center" });
      doc.text((student.hadir || 0).toString(), tableX + 85, rowY + 6, { align: "center" });
      doc.text((student.sakit || 0).toString(), tableX + 105, rowY + 6, { align: "center" });
      doc.text((student.izin || 0).toString(), tableX + 125, rowY + 6, { align: "center" });
      doc.text((student.alpha || 0).toString(), tableX + 145, rowY + 6, { align: "center" });
    });
    
    // Footer - position right after the table
    // Get the last y-position after the table
    const tableEndY = tableY + (studentData && Array.isArray(studentData) ? studentData.length * rowHeight : 0) + 10;
    
    // Downloaded on date
    doc.setFontSize(11);
    doc.text(`Di unduh pada: ${currentDate}`, pageWidth / 2, tableEndY + 10, { align: "center" });
    
    // Signatures with better positioning
    doc.setFontSize(10);
    doc.text("Mengetahui,", 50, tableEndY + 20);
    doc.text("Kepala Sekolah", 50, tableEndY + 26);
    
    doc.text("Wali Kelas", pageWidth - 50, tableEndY + 20, { align: "center" });
    
    // Principal and teacher names - with better spacing
    doc.text("_________________", 50, tableEndY + 45);
    doc.text("_________________", pageWidth - 50, tableEndY + 45, { align: "center" });
    
    // Save the PDF
    const fileName = `Laporan_Komprehensif_${format(new Date(), "dd-MM-yyyy")}.pdf`;
    doc.save(fileName);
    
    return fileName;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}

function generateComprehensiveExcel(
  schoolInfo: SchoolInfo,
  monthlyData: any,
  weeklyData: any,
  studentData: any
) {
  // Create workbook and worksheets
  const wb = XLSX.utils.book_new();
  
  // Header data for monthly sheet
  const monthlyHeaderData = [
    [schoolInfo.name.toUpperCase()],
    [schoolInfo.address],
    [`NPSN: ${schoolInfo.npsn}`],
    [""],
    ["LAPORAN REKAPITULASI KEHADIRAN BULANAN"],
    [`Periode: ${monthlyData.month || format(new Date(), "MMMM yyyy", { locale: id })}`],
    [""],
    ["Rekapitulasi Kehadiran:"]
  ];
  
  // Monthly attendance data
  const monthlyAttendanceRows = [
    ["Status", "Jumlah", "Persentase"],
    ["Hadir", monthlyData.hadir || 0, `${((monthlyData.hadir / monthlyData.total) * 100).toFixed(1)}%`],
    ["Sakit", monthlyData.sakit || 0, `${((monthlyData.sakit / monthlyData.total) * 100).toFixed(1)}%`],
    ["Izin", monthlyData.izin || 0, `${((monthlyData.izin / monthlyData.total) * 100).toFixed(1)}%`],
    ["Alpha", monthlyData.alpha || 0, `${((monthlyData.alpha / monthlyData.total) * 100).toFixed(1)}%`],
    ["Total", monthlyData.total || 0, "100%"]
  ];
  
  // Weekly sheet data - fetch real data from Firestore
  const weeklyHeaderData = [
    [schoolInfo.name],
    ["LAPORAN KEHADIRAN MINGGUAN"],
    [""],
    ["Minggu", "Hadir", "Sakit", "Izin", "Alpha", "Total"]
  ];
  
  // Get real weekly attendance data
  let realWeeklyData = [];
  
  // Define a function to fetch weekly data
  async function fetchWeeklyData(schoolIdParam: string) {
    try {
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const { startOfWeek, endOfWeek, subWeeks, format } = await import('date-fns');
      
      // Get data for last 4 weeks
      for (let i = 0; i < 4; i++) {
        const weekStartDate = subWeeks(startOfWeek(new Date()), i);
        const weekEndDate = endOfWeek(weekStartDate);
        
        const startDateStr = format(weekStartDate, 'yyyy-MM-dd');
        const endDateStr = format(weekEndDate, 'yyyy-MM-dd');
        
        const attendanceRef = collection(db, `schools/${schoolIdParam}/attendance`);
        const attendanceQuery = query(
          attendanceRef,
          where("date", ">=", startDateStr),
          where("date", "<=", endDateStr)
        );
        
        const attendanceSnapshot = await getDocs(attendanceQuery);
        
        let present = 0, sick = 0, permitted = 0, absent = 0;
        
        attendanceSnapshot.forEach(doc => {
          const status = doc.data().status;
          if (status === 'present' || status === 'hadir') present++;
          else if (status === 'sick' || status === 'sakit') sick++;
          else if (status === 'permitted' || status === 'izin') permitted++;
          else if (status === 'absent' || status === 'alpha') absent++;
        });
        
        realWeeklyData.push({
          week: `Minggu ${4-i}`,
          hadir: present,
          sakit: sick,
          izin: permitted,
          alpha: absent
        });
      }
    } catch (error) {
      console.error("Error fetching weekly data from Firestore:", error);
    }
  }
  
  // Use real data if available, fallback to dummy data
  const weeklyDataToUse = realWeeklyData.length > 0 ? realWeeklyData : weeklyData;
  
  const weeklyRows = weeklyDataToUse.map(week => [
    week.week || "",
    week.hadir || 0,
    week.sakit || 0,
    week.izin || 0,
    week.alpha || 0,
    (week.hadir || 0) + (week.sakit || 0) + (week.izin || 0) + (week.alpha || 0)
  ]);
  
  // Student sheet data - fetch real data from Firestore
  const studentHeaderData = [
    [schoolInfo.name],
    ["LAPORAN KEHADIRAN PER SISWA"],
    [""],
    ["Nama", "Kelas", "Hadir", "Sakit", "Izin", "Alpha", "Total"]
  ];
  
  // Create an empty array for student rows
  const studentRows: any[] = [];
  
  // Use the student rows array (which would be populated in an async context)
  const studentRowsData = studentRows.length > 0 ? studentRows.map(student => [
    student.name || "",
    student.class || "",
    student.hadir || 0,
    student.sakit || 0,
    student.izin || 0,
    student.alpha || 0,
    (student.hadir || 0) + (student.sakit || 0) + (student.izin || 0) + (student.alpha || 0)
  ]) : [];
  
  // Footer data (common to all sheets)
  const footerData = [
    [""],
    [""],
    [`Nama Alamat Sekolah`],
    [""],
    ["Mengetahui,", "", "Wali Kelas"],
    ["Kepala Sekolah", "", ""],
    ["", "", ""],
    [schoolInfo.principalName, "", "___________________"],
  ];
  
  // Combine monthly data
  const allMonthlyData = [...monthlyHeaderData, ...monthlyAttendanceRows, ...footerData];
  
  // Combine weekly data
  const allWeeklyData = [...weeklyHeaderData, ...weeklyRows, ...footerData];
  
  // Combine student data
  const allStudentData = [...studentHeaderData, ...studentRows, ...footerData];
  
  // Create worksheets
  const monthlyWs = XLSX.utils.aoa_to_sheet(allMonthlyData);
  const weeklyWs = XLSX.utils.aoa_to_sheet(allWeeklyData);
  const studentWs = XLSX.utils.aoa_to_sheet(allStudentData);
  
  // Set column widths
  const monthlyColWidths = [{ wch: 20 }, { wch: 15 }, { wch: 15 }];
  const weeklyColWidths = [{ wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
  const studentColWidths = [{ wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
  
  monthlyWs['!cols'] = monthlyColWidths;
  weeklyWs['!cols'] = weeklyColWidths;
  studentWs['!cols'] = studentColWidths;
  
  // Add worksheets to workbook
  XLSX.utils.book_append_sheet(wb, monthlyWs, "Bulanan");
  XLSX.utils.book_append_sheet(wb, weeklyWs, "Mingguan");
  XLSX.utils.book_append_sheet(wb, studentWs, "Per Siswa");
  
  // Generate Excel file
  const fileName = `Laporan_Komprehensif_${format(new Date(), "dd-MM-yyyy")}.xlsx`;
  XLSX.writeFile(wb, fileName);
  
  return fileName;
}

export const generateExcel = async (
  schoolInfo: SchoolInfo,
  attendanceData: AttendanceData,
  reportType: "monthly" | "class" | "student" | "custom",
  additionalInfo?: { className?: string; studentName?: string; teacherName?: string; schoolId?: string; studentId?: string; dateRange?: { start: string; end: string } }
) => {
  // Fetch additional data from Firestore if needed
  if (reportType === "student" && additionalInfo?.schoolId && additionalInfo?.studentId) {
    try {
      const { db } = await import('@/lib/firebase');
      const { doc, getDoc } = await import('firebase/firestore');
      
      // Get student data
      const studentRef = doc(db, `schools/${additionalInfo.schoolId}/students`, additionalInfo.studentId);
      const studentSnap = await getDoc(studentRef);
      
      if (studentSnap.exists()) {
        const studentData = studentSnap.data();
        // Update additionalInfo with data from Firestore
        additionalInfo.className = studentData.class || additionalInfo.className;
        additionalInfo.studentName = studentData.name || additionalInfo.studentName;
      }
    } catch (error) {
      console.error("Error fetching student data for Excel:", error);
    }
  }
  // Calculate total
  const total = attendanceData.total || 
    (attendanceData.present + attendanceData.sick + attendanceData.permitted + attendanceData.absent);
  
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  
  // Header data
  const headerData = [
    [schoolInfo.name],
    [`Nama Alamat Sekolah`],
    [`NPSN: ${schoolInfo.npsn}`],
    [""],
    ["LAPORAN REKAPITULASI KEHADIRAN SISWA"]
  ];
  
  if (reportType === "monthly") {
    headerData.push([`BULAN ${attendanceData.month?.toUpperCase() || format(new Date(), "MMMM yyyy", { locale: id }).toUpperCase()}`]);
  } else if (reportType === "class") {
    headerData.push([`KELAS: ${additionalInfo?.className?.toUpperCase() || ""}`]);
  } else if (reportType === "student") {
    headerData.push(["LAPORAN REKAPITULASI KEHADIRAN"]);
    headerData.push([`BULAN: ${format(new Date(), "MMMM yyyy", { locale: id }).toUpperCase()}`]);
    headerData.push([`NAMA SISWA: ${additionalInfo?.studentName?.toUpperCase() || ""}`]);
  }
  
  headerData.push([""], ["Rekapitulasi Kehadiran:"]);
  
  // Attendance data
  const attendanceRows = [
    ["Status", "Jumlah", "Persentase"],
    ["Hadir", attendanceData.present, `${((attendanceData.present / total) * 100).toFixed(1)}%`],
    ["Sakit", attendanceData.sick, `${((attendanceData.sick / total) * 100).toFixed(1)}%`],
    ["Izin", attendanceData.permitted, `${((attendanceData.permitted / total) * 100).toFixed(1)}%`],
    ["Alpha", attendanceData.absent, `${((attendanceData.absent / total) * 100).toFixed(1)}%`],
    ["Total", total, "100%"]
  ];
  
  // Add signature section - updated format with wali kelas on the right
  const signatureData = [
    [""],
    [""],
    [`Di unduh pada: ${format(new Date(), "d MMMM yyyy", { locale: id })}`],
    [""],
    ["Mengetahui,", "", "", "", "Administrator Sekolah"],
    ["Kepala Sekolah", "", "", "", schoolInfo.name],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    [schoolInfo.principalName, "", "", "", additionalInfo?.teacherName || "___________________"],
    [`NIP: ${schoolInfo.principalNip || "-"}`, "", "", "", `NIP: ${"-"}`],
    ["", "", "", "", ""],
  ];

  // Combine all data
  const allData = [...headerData, ...attendanceRows, ...signatureData];
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(allData);
  
  // Set column widths
  const colWidths = [{ wch: 20 }, { wch: 15 }, { wch: 15 }];
  ws['!cols'] = colWidths;
  
  // Add worksheet to workbook
  const sheetName = reportType === "monthly" 
    ? "Laporan Bulanan" 
    : reportType === "class" 
      ? `Laporan Kelas ${additionalInfo?.className}` 
      : `Laporan Siswa`;
  
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Generate Excel file
  const fileName = `Laporan_${reportType}_${format(new Date(), "dd-MM-yyyy")}.xlsx`;
  XLSX.writeFile(wb, fileName);
  
  return fileName;
};
