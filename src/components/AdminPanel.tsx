/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, RoomRequest, RoomUsageRecord, BorrowRecord } from '../types';
import { 
  Users, UserCheck, ShieldAlert, CheckCircle, XCircle, 
  Plus, Printer, Key, Eye, ToggleLeft, ToggleRight, Settings, Info,
  Camera, QrCode, Search, Award, BookOpen, RefreshCw, Wrench,
  Calendar, Folder
} from 'lucide-react';
import { alerts as Swal } from '../lib/alerts';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  getAppOriginForQR,
  getGoogleScriptUrl,
  saveGoogleScriptUrl,
  syncWithGoogleSheets,
  pullFromGoogleSheets,
  DEFAULT_GOOGLE_SCRIPT_URL,
  APIService
} from '../lib/api';
import { TraceabilityToolsLogDoc } from './Documents';

const normalizeDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  let year = NaN;
  let month = NaN;
  let day = NaN;

  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
      } else {
        year = parseInt(parts[2], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[0], 10);
      }
    }
  } else if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        year = parseInt(parts[2], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[0], 10);
      } else if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
      }
    }
  }

  if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
    if (year > 2400) {
      year -= 543;
    }
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return trimmed;
};

interface AdminPanelProps {
  currentUser: User;
  users: User[];
  roomRequests: RoomRequest[];
  roomUsageRecords: RoomUsageRecord[];
  borrowRecords: BorrowRecord[];
  subTab: 'home' | 'users' | 'rooms' | 'records' | 'verify';
  onSubTabChange: (tab: 'home' | 'users' | 'rooms' | 'records' | 'verify') => void;
  onApproveUser: (userId: string) => void;
  onRejectUser: (userId: string) => void;
  onUpdateUserStatus: (userId: string, newStatus: User['status']) => void;
  onToggleRecordStatus: (recId: string) => void;
  onViewStudentCard: (user: User) => void;
  onViewBulkStudentCards: (users: User[]) => void;
  onViewRequestDoc: (req: RoomRequest) => void;
  onViewBulkRequestDocs?: (reqs: RoomRequest[]) => void;
  onPrintUsageRecords: () => void;
  onReloadDb?: () => void;
  welcomeBanner?: React.ReactNode;
}

export default function AdminPanel({
  currentUser,
  users,
  roomRequests,
  roomUsageRecords,
  borrowRecords,
  subTab,
  onSubTabChange,
  onApproveUser,
  onRejectUser,
  onUpdateUserStatus,
  onToggleRecordStatus,
  onViewStudentCard,
  onViewBulkStudentCards,
  onViewRequestDoc,
  onViewBulkRequestDocs,
  onPrintUsageRecords,
  onReloadDb,
  welcomeBanner
}: AdminPanelProps) {
  // const [subTab, setSubTab] = useState<'users' | 'rooms' | 'records' | 'verify'>('users');
  const [selectedRoom, setSelectedRoom] = useState<string>('Practical Area in Hangar');
  const [filterBatch, setFilterBatch] = useState<string>('All');
  
  // Date range filters for document printing (TLTC-MO-033)
  const [docStartDate, setDocStartDate] = useState('');
  const [docEndDate, setDocEndDate] = useState('');
  const [showTraceabilityDoc, setShowTraceabilityDoc] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState<string>(getGoogleScriptUrl());
  const [showSheetsConfig, setShowSheetsConfig] = useState(false);

  // Verify Student state
  const [verifySearchId, setVerifySearchId] = useState('');
  const [verifyUser, setVerifyUser] = useState<User | null>(null);
  const [isVerifyCameraActive, setIsVerifyCameraActive] = useState(false);
  const [adminCameraFacingMode, setAdminCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [verifyCameraError, setVerifyCameraError] = useState<string | null>(null);

  // Camera handling for QR code simulation/reading
  React.useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    let isMounted = true;

    if (isVerifyCameraActive) {
      setVerifyCameraError(null);
      
      const startScanner = async () => {
        // Wait briefly for React to render the scanner container div
        await new Promise((resolve) => setTimeout(resolve, 300));
        if (!isMounted) return;

        try {
          const container = document.getElementById('admin-verify-reader');
          if (!container) {
            throw new Error('ไม่พบตำแหน่งแผงแสดงผลกล้องเครื่องสแกน');
          }
          
          html5QrCode = new Html5Qrcode('admin-verify-reader');
          await html5QrCode.start(
            { facingMode: adminCameraFacingMode },
            {
              fps: 15,
              qrbox: (w, h) => {
                const size = Math.max(120, Math.min(w, h, 250));
                return { width: size, height: size };
              }
            },
            (decodedText) => {
              // On scanned successfully:
              handleSimulateQRScan(decodedText);
            },
            () => {
              // Quietly bypass non-match frames
            }
          );
        } catch (err: any) {
          console.error('Error starting Admin Html5Qrcode engine:', err);
          setVerifyCameraError(err.message || 'ไม่สามารถเข้าถึงอุปกรณ์กล้องได้ โปรดอนุมัติสิทธิ์การใช้งานกล้องในเบราว์เซอร์');
        }
      };

      startScanner();
    }

    return () => {
      isMounted = false;
      if (html5QrCode) {
        try {
          if (html5QrCode.isScanning) {
            html5QrCode.stop().catch((stopErr) => {
              console.error('Error stopping scanner during cleanup:', stopErr);
            });
          }
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, [isVerifyCameraActive, adminCameraFacingMode]);

  const handleSimulateQRScan = (qrData: string) => {
    const cleanQR = qrData.trim();
    let parsedId = '';
    
    // Check if the QR encodes a URL and extract parameter
    if (cleanQR.startsWith('http://') || cleanQR.startsWith('https://') || cleanQR.includes('//') || cleanQR.includes('/?')) {
      try {
        let urlText = cleanQR;
        if (!urlText.startsWith('http://') && !urlText.startsWith('https://')) {
          urlText = 'https://' + urlText;
        }
        const urlObj = new URL(urlText);
        const idParam = urlObj.searchParams.get('id') || urlObj.searchParams.get('verifyId') || urlObj.searchParams.get('data');
        if (idParam) {
          parsedId = idParam.trim();
        }
      } catch (e) {
        console.error("AdminPanel URL extraction fallback to regex error:", e);
      }
    }

    // Regex Fallback if standard URL parser fails to detect ID
    if (!parsedId) {
      try {
        const idMatch = cleanQR.match(/[?&]id=([^&?#]+)/i) || cleanQR.match(/id=([^&?#]+)/i);
        const dataMatch = cleanQR.match(/[?&]data=([^&?#]+)/i) || cleanQR.match(/data=([^&?#]+)/i);
        const verifyIdMatch = cleanQR.match(/[?&]verifyId=([^&?#]+)/i) || cleanQR.match(/verifyId=([^&?#]+)/i);

        if (idMatch && idMatch[1]) {
          parsedId = decodeURIComponent(idMatch[1]).trim();
        } else if (dataMatch && dataMatch[1]) {
          parsedId = decodeURIComponent(dataMatch[1]).trim();
        } else if (verifyIdMatch && verifyIdMatch[1]) {
          parsedId = decodeURIComponent(verifyIdMatch[1]).trim();
        }
      } catch (e) {
        console.error("Admin regex extraction error:", e);
      }
    }

    if (!parsedId) {
      parsedId = cleanQR;
    }

    // Now extract ID if it has the prefix
    if (parsedId.toUpperCase().includes('AMT-CONNECT-VERIFY:')) {
      parsedId = parsedId.split(/AMT-CONNECT-VERIFY:/i)[1];
    }
    
    // Trim and clean possible enclosing quotes
    parsedId = parsedId.trim().replace(/^['"\[\]]|['"\[\]]$/g, '').trim();

    const found = users.find(u => {
      const uIdClean = String(u.id || '').trim().toLowerCase();
      const scannedIdClean = parsedId.toLowerCase();
      return uIdClean === scannedIdClean || uIdClean === scannedIdClean.replace(/\D/g, '') || scannedIdClean === uIdClean.replace(/\D/g, '');
    });

    if (found) {
      setVerifyUser(found);
      setVerifySearchId(found.id);
      Swal.fire({
        icon: 'success',
        title: 'สแกนสำเร็จ (QR Scanned Completed)',
        text: `ตรวจวิเคราะห์รหัสสิทธิ์: ${found.firstNameTh || found.firstName || ''} ${found.lastNameTh || found.lastName || ''} (${found.role})`,
        timer: 1500,
        showConfirmButton: false
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'ไม่พบบัญชีผู้ใช้ในระบบ',
        html: `
          <div class="text-left text-xs space-y-2 select-text font-sans text-neutral-800">
            <p><strong>รหัสที่ถอดความได้ (Decoded ID):</strong> <code class="bg-neutral-100 px-1 py-0.5 rounded font-mono text-xs font-bold">${parsedId || 'ว่างเปล่า'}</code></p>
            <p class="text-neutral-500 text-[11px] leading-relaxed">
              รหัสจำลองนี้ไม่มีรายชื่ออยู่ในสารบัญสิทธิของระบบ โปรดลงทะเบียนก่อนสแกน
            </p>
            <p class="text-neutral-400 text-[10px] break-all">ข้อมูลดิบ: "${qrData}"</p>
          </div>
        `,
        confirmButtonColor: '#171717'
      });
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = verifySearchId.trim();
    const found = users.find(u => String(u.id || '') === cleanId || String(u.id || '').toLowerCase() === cleanId.toLowerCase());
    if (found) {
      setVerifyUser(found);
      Swal.fire({
        icon: 'success',
        title: 'ค้นพบข้อมูลผู้ใช้',
        text: `ระบบทำการโหลดบัตรประจำตัวและตารางสิทธิ์เสร็จสิ้น`,
        timer: 1000,
        showConfirmButton: false
      });
    } else {
      setVerifyUser(null);
      Swal.fire({
        icon: 'error',
        title: 'ไม่พบข้อมูล',
        text: `ไม่พบผู้ใช้ที่ใช้รหัสประจำตัว: ${cleanId}`,
        confirmButtonColor: '#171717'
      });
    }
  };

  // Derive status counters
  const activeStudents = users.filter(u => u.role === 'นักศึกษา' && u.status === 'Active');
  const activePersonnel = users.filter(u => u.role !== 'นักศึกษา' && u.role !== 'Admin' && u.status === 'Active');
  const totalStudents = users.filter(u => u.role === 'นักศึกษา');
  const totalPersonnel = users.filter(u => u.role !== 'นักศึกษา' && u.role !== 'Admin');
  const pendingUsers = users.filter(u => u.status === 'Pending');

  // Hardcoded 10 Hangar/Class Rooms
  const roomsList = [
    'Practical Area in Hangar',
    'Meeting Room',
    'Theoretical Classroom',
    'Library Room',
    'Workshop 1',
    'Workshop 2',
    'Fiberglass Workshop',
    'Examination Room',
    'Aerodynamic Room',
    'Electrical Room'
  ];

  // Helper check if Room is Occupied today by approved request
  const checkRoomStatus = (roomName: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    // Check if there is an approved request for today
    const approvedUsage = roomRequests.find(
      req => req.room === roomName && req.maintenanceApproved === 'Approved' && req.date === todayStr
    );
    return approvedUsage ? { occupied: true, req: approvedUsage } : { occupied: false };
  };

  // Get cohorts (groups of batches) strictly based on first 2 characters of student id
  const batches = [
    'All',
    ...Array.from(new Set(
      (users || [])
        .filter(u => u && u.role === 'นักศึกษา')
        .map(u => u.batch || String(u.id || '').substring(0, 2))
        .filter(b => b && String(b).trim().length > 0)
    )).sort()
  ];

  return (
    <div className="space-y-6 text-slate-850 font-sans text-xs animate-fade-in">
      {welcomeBanner}
      
      {/* Admin Action Sub-navigation tabs */}
      <div className="hidden bg-white hover:bg-slate-50/50 p-1 rounded-xl border border-slate-200 shadow-sm gap-1 overflow-x-auto shrink-0">
        <button
          id="adminHomeTabBtn"
          onClick={() => onSubTabChange('home')}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-lg font-sans font-bold text-center text-xs transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'home' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          หน้าแรก
        </button>
        <button
          id="adminUsersTabBtn"
          onClick={() => onSubTabChange('users')}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-lg font-sans font-bold text-center text-xs transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'users' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          ข้อมูลผู้ใช้งาน
        </button>
        <button
          id="adminRoomsTabBtn"
          onClick={() => onSubTabChange('rooms')}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-lg font-sans font-bold text-center text-xs transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'rooms' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          ข้อมูลห้อง
        </button>
        <button
          id="adminRecordsTabBtn"
          onClick={() => onSubTabChange('records')}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-lg font-sans font-bold text-center text-xs transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'records' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          เอกสารคำขอทั้งหมด
        </button>
      </div>

      {/* Subtab content: HOME (Dashboard) */}
      {subTab === 'home' && (
        <div className="space-y-6">
          {/* Main overview sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Student statistics widget */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all duration-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <Users size={20} />
                  </div>
                  <div>
                    <h4 className="font-sans font-extrabold text-sm text-slate-900">สถิติจำนวนนักศึกษา</h4>
                    <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">STUDENT ENROLLMENT STATUS</p>
                  </div>
                </div>
                <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-bold">
                  {totalStudents.length > 0 ? Math.round((activeStudents.length / totalStudents.length) * 100) : 0}% Active
                </span>
              </div>
              
              <div className="border-t border-slate-100 my-2" />
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                  <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider block">นักศึกษาที่ ACTIVE</span>
                  <span className="text-3xl font-extrabold text-blue-600 font-mono block mt-1">{activeStudents.length}</span>
                  <span className="text-[10px] text-slate-500 font-sans mt-1 block">คนพร้อมใช้งานในระบบ</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                  <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider block">นักศึกษาทั้งหมด</span>
                  <span className="text-3xl font-extrabold text-slate-900 font-mono block mt-1">{totalStudents.length}</span>
                  <span className="text-[10px] text-slate-500 font-sans mt-1 block">คนลงทะเบียนในระบบ</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="pt-2">
                <div className="flex justify-between text-[10px] text-slate-500 font-sans font-bold mb-1.5">
                  <span>สัดส่วนนักศึกษาที่ Active</span>
                  <span>{activeStudents.length} จาก {totalStudents.length} คน</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${totalStudents.length > 0 ? (activeStudents.length / totalStudents.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Personnel statistics widget */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all duration-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h4 className="font-sans font-extrabold text-sm text-slate-900">สถิติจำนวนบุคลากร</h4>
                    <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">PERSONNEL & INSTRUCTOR STATUS</p>
                  </div>
                </div>
                <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold">
                  {totalPersonnel.length > 0 ? Math.round((activePersonnel.length / totalPersonnel.length) * 100) : 0}% Active
                </span>
              </div>
              
              <div className="border-t border-slate-100 my-2" />
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                  <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider block">บุคลากรที่ ACTIVE</span>
                  <span className="text-3xl font-extrabold text-emerald-600 font-mono block mt-1">{activePersonnel.length}</span>
                  <span className="text-[10px] text-slate-500 font-sans mt-1 block">คนพร้อมใช้งานในระบบ</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                  <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider block">บุคลากรทั้งหมด</span>
                  <span className="text-3xl font-extrabold text-slate-900 font-mono block mt-1">{totalPersonnel.length}</span>
                  <span className="text-[10px] text-slate-500 font-sans mt-1 block">คนลงทะเบียนในระบบ</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="pt-2">
                <div className="flex justify-between text-[10px] text-slate-500 font-sans font-bold mb-1.5">
                  <span>สัดส่วนบุคลากรที่ Active</span>
                  <span>{activePersonnel.length} จาก {totalPersonnel.length} คน</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${totalPersonnel.length > 0 ? (activePersonnel.length / totalPersonnel.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Today's Room Requests section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h4 className="font-sans font-extrabold text-base text-slate-900 leading-none">
                  ห้องที่มีการขอใช้งานวันนี้
                </h4>
                <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider mt-1.5">
                  ROOM REQUESTS SCHEDULED FOR TODAY ({new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })})
                </p>
              </div>
              <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                {roomRequests.filter(req => normalizeDate(req.date) === normalizeDate(new Date().toISOString().split('T')[0])).length} รายการวันนี้
              </span>
            </div>

            <div className="border-t border-slate-100 my-4" />

            {(() => {
              const todayStr = new Date().toISOString().split('T')[0];
              const todayRequests = roomRequests.filter(
                req => normalizeDate(req.date) === normalizeDate(todayStr)
              );

              if (todayRequests.length === 0) {
                return (
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center bg-slate-50/20">
                    <Calendar size={36} className="text-slate-300" />
                    <p className="text-xs text-slate-500 mt-3 font-semibold">
                      ไม่มีการขอใช้งานห้องในวันนี้
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 font-medium">
                      คำขอใช้ห้องในวันนี้จะปรากฏขึ้นที่นี่เมื่อมีผู้ส่งคำขอในระบบ
                    </p>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] text-slate-500 border-b border-slate-200 font-bold uppercase">
                        <th className="py-3 px-4">ห้องปฏิบัติการ/ห้องเรียน</th>
                        <th className="py-3 px-4">ผู้ขอใช้ห้อง</th>
                        <th className="py-3 px-4">ช่วงเวลา</th>
                        <th className="py-3 px-4">วัตถุประสงค์</th>
                        <th className="py-3 px-4 text-center">สถานะ</th>
                        <th className="py-3 px-4 text-center">การดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayRequests.map(req => (
                        <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50/50 text-xs">
                          <td className="py-3.5 px-4 font-bold text-slate-900">{req.room}</td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-800 block">{req.requesterName}</span>
                            <span className="text-[10px] text-slate-400 block font-mono font-semibold uppercase">{req.requesterRole}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-700 font-bold">{req.timeRange}</td>
                          <td className="py-3.5 px-4 text-slate-600 max-w-[200px] truncate" title={req.purpose}>{req.purpose}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block border ${
                              req.maintenanceApproved === 'Approved' 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                : req.maintenanceApproved === 'Rejected'
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {req.maintenanceApproved === 'Approved' ? 'อนุมัติแล้ว' : req.maintenanceApproved === 'Rejected' ? 'ปฏิเสธแล้ว' : 'รอพิจารณา'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex justify-center gap-1.5">
                              <button
                                onClick={() => onViewRequestDoc(req)}
                                className="px-2.5 py-1.5 border border-slate-300 hover:border-slate-900 text-slate-700 hover:text-slate-950 rounded font-bold text-[10px] transition-colors cursor-pointer"
                              >
                                ตรวจสอบเอกสาร
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRoom(req.room);
                                  onSubTabChange('rooms');
                                }}
                                className="px-2.5 py-1.5 bg-slate-950 text-white hover:bg-slate-800 rounded font-bold text-[10px] transition-colors cursor-pointer"
                              >
                                ดูสถานะห้อง
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Subtab content 1: USERS */}
      {subTab === 'users' && (
        <div className="space-y-6">
          {/* Section: Pending request queues */}
          {pendingUsers.length > 0 && (
            <div className="bg-neutral-50 border-2 border-neutral-950 rounded-lg p-4 shadow-sm">
              <h3 className="font-sans font-extrabold text-xs text-neutral-950 flex items-center gap-2 mb-3">
                <ShieldAlert className="text-neutral-950 animate-pulse" size={16} />
                <span>คำขอสิทธิ์เชื่อมต่อระบบความรักษาความปลอดภัย (ค้างอนุมัติ)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingUsers.map(pUser => {
                  const canApprove = () => {
                    if (currentUser.role === 'Admin') {
                      return pUser.role !== 'Instructor' && pUser.role !== 'นักศึกษา';
                    } else if (currentUser.role === 'Training Manager' || currentUser.role === 'Training Staff') {
                      return true; // Manager/Staff can approve students/instructors (implied by previous logic)
                    }
                    return false;
                  };

                  return (
                    <div key={pUser.id} className="bg-white border border-neutral-300 p-3 rounded flex items-center justify-between gap-3 shadow-inner">
                      <div className="flex items-center gap-3">
                        <img src={pUser.photoUrl} alt="avatar" className="w-10 h-12 object-cover border border-neutral-300 rounded" referrerPolicy="no-referrer" />
                        <div>
                          <p className="font-sans font-bold text-neutral-950">{pUser.title ? pUser.title : ''}{pUser.firstNameTh || pUser.firstName} {pUser.lastNameTh || pUser.lastName}</p>
                          <p className="text-[10px] font-mono font-bold text-neutral-500 uppercase">{pUser.role} | ID: {pUser.id}</p>
                          <p className="text-[9px] text-neutral-400 truncate">{pUser.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0 text-right">
                        <div className="flex gap-1.5 justify-end">
                          {pUser.role !== 'นักศึกษา' && (
                            <button
                              type="button"
                              onClick={() => onRejectUser(pUser.id)}
                              className="p-1 px-2 border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded text-[10px] font-sans font-bold transition-colors cursor-pointer"
                            >
                              ปฏิเสธ
                            </button>
                          )}
                          {canApprove() && (
                            <button
                              type="button"
                              onClick={() => onApproveUser(pUser.id)}
                              className="p-1 px-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              อนุมัติสิทธิ์
                            </button>
                          )}
                        </div>
                        <span className="text-[8px] text-emerald-600 font-sans font-bold">✓ อนุญาตสิทธิ์ผู้ดูแลระบบ</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* List of Registered Students & Teachers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* STUDENTS LIST */}
            <div className="bg-white border border-neutral-300 rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-sans font-extrabold text-sm flex items-center gap-2">
                  <Users size={16} />
                  <span>รายชื่อนักศึกษา AMT</span>
                </h4>
                {/* Cohort filters */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-neutral-500 font-sans">กรองตามรุ่น:</span>
                    <select
                      id="studentBatchFilter"
                      value={filterBatch}
                      onChange={(e) => setFilterBatch(e.target.value)}
                      className="border border-neutral-300 px-1 py-0.5 rounded text-[10px] font-mono bg-white font-bold"
                    >
                      {batches.map(b => (
                        <option key={b} value={b}>{b === 'All' ? 'ทุกรุ่น' : `รุ่น ${b}`}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      const filtered = users.filter(u => {
                        if (u.role !== 'นักศึกษา') return false;
                        const studentBatch = String(u.id || '').substring(0, 2);
                        return filterBatch === 'All' || studentBatch === filterBatch;
                      });
                      onViewBulkStudentCards(filtered);
                    }}
                    className="flex items-center gap-1 bg-black text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    <Printer size={10} />
                    <span>พิมพ์บัตร</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-[10px] text-neutral-550 border-b border-neutral-300 font-bold uppercase">
                      <th className="py-2 px-1">รูปถ่าย</th>
                      <th className="py-2 px-1">รหัสการช่าง</th>
                      <th className="py-2 px-1">ชื่อ-สกุล</th>
                      <th className="py-2 px-1">สถานะ</th>
                      <th className="py-2 px-1 text-center font-sans">คีย์บัตรประจำตัว</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter(u => {
                        if (u.role !== 'นักศึกษา') return false;
                        const studentBatch = String(u.id || '').substring(0, 2);
                        return filterBatch === 'All' || studentBatch === filterBatch;
                      })
                      .sort((a, b) => String(a.id || '').localeCompare(String(b.id || ''), undefined, { numeric: true, sensitivity: 'base' }))
                      .map(student => (
                        <tr key={student.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                          <td className="py-2 px-1">
                            <img src={student.photoUrl} alt="img" className="w-8 h-10 object-cover border border-neutral-200 rounded shrink-0 cursor-pointer" onClick={() => onViewStudentCard(student)} title="คลิกเพื่อตรวจดูบัตรประจำตัว" referrerPolicy="no-referrer" />
                          </td>
                          <td className="py-2 px-1 font-mono font-bold text-neutral-900">{student.id}</td>
                          <td className="py-2 px-1 shrink-0">
                            <p className="font-sans font-bold">{student.title ? student.title : ''}{student.firstNameTh || ''} {student.lastNameTh || ''}</p>
                            <p className="text-[9px] text-neutral-450 font-mono">{student.email}</p>
                          </td>
                          <td className="py-2 px-1">
                            <select
                              disabled={student.role === 'นักศึกษา'}
                              value={student.status}
                              onChange={(e) => onUpdateUserStatus(student.id, e.target.value as User['status'])}
                              className="border px-1.5 py-0.5 rounded text-[10px] font-sans font-medium bg-white text-neutral-800 cursor-pointer border-neutral-300 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                            >
                              <option value="Pending">Pending (รออนุมัติ)</option>
                              <option value="Active">Active (พร้อมใช้งาน)</option>
                              <option value="พ้นสภาพ">พ้นสภาพ</option>
                              <option value="พักการเรียน">พักการเรียน</option>
                              <option value="จบการศึกษา">จบการศึกษา</option>
                            </select>
                            <span className="block text-[8px] text-emerald-600 font-sans mt-0.5 font-bold">✓ อนุญาตสิทธิ์ผู้ดูแลระบบ</span>
                          </td>
                          <td className="py-2 px-1 text-center">
                            <button
                              onClick={() => onViewStudentCard(student)}
                              className="font-sans text-[9px] border border-neutral-900 hover:bg-neutral-950 hover:text-white px-2 py-1 rounded transition-colors cursor-pointer"
                            >
                              สร้างบัตร (แนวตั้ง)
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* STAFF / INSTRUCTORS LIST */}
            <div className="bg-white border border-neutral-300 rounded-lg p-4 shadow-sm">
              <h4 className="font-sans font-extrabold text-sm flex items-center gap-2 mb-3">
                <UserCheck size={16} />
                <span>รายชื่อบุคลากร / ครูวิทยากรการช่าง</span>
              </h4>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-[10px] text-neutral-550 border-b border-neutral-300 font-bold uppercase">
                      <th className="py-2 px-1">รูปถ่าย</th>
                      <th className="py-2 px-1">รหัสประจำครู</th>
                      <th className="py-2 px-1">ชื่อ-สกุล / ตำแหน่งหลัก</th>
                      <th className="py-2 px-1">สถานะสิทธิ์</th>
                      <th className="py-2 px-1 text-center">พิมพ์บัตรการช่าง</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter(u => u.role !== 'นักศึกษา' && u.role !== 'Admin')
                      .map(staff => (
                        <tr key={staff.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                          <td className="py-2 px-1">
                            <img src={staff.photoUrl} alt="img" className="w-8 h-10 object-cover border border-neutral-200 rounded shrink-0 cursor-pointer" onClick={() => onViewStudentCard(staff)} referrerPolicy="no-referrer" />
                          </td>
                          <td className="py-2 px-1 font-mono font-bold text-neutral-900">{staff.id}</td>
                          <td className="py-2 px-1">
                            <p className="font-sans font-bold">{staff.title ? staff.title : ''}{staff.firstNameTh || ''} {staff.lastNameTh || ''}</p>
                            <p className="text-[9px] font-mono text-neutral-600 font-bold uppercase">{staff.role}</p>
                            <p className="text-[9px] text-neutral-450">{staff.email}</p>
                          </td>
                          <td className="py-2 px-1">
                            <select
                              value={staff.status}
                              onChange={(e) => onUpdateUserStatus(staff.id, e.target.value as User['status'])}
                              className="border px-1.5 py-0.5 rounded text-[10px] font-sans font-medium bg-white text-neutral-800 cursor-pointer border-neutral-300 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 font-sans"
                            >
                              <option value="Pending">Pending (รออนุมัติ)</option>
                              <option value="Active">Active (พร้อมใช้งาน)</option>
                              <option value="พ้นสภาพ">พ้นสภาพ</option>
                              <option value="จบการศึกษา">จบการศึกษา</option>
                            </select>
                          </td>
                          <td className="py-2 px-1 text-center">
                            <button
                              onClick={() => onViewStudentCard(staff)}
                              className="font-sans text-[9px] border border-neutral-900 hover:bg-neutral-950 hover:text-white px-2 py-1 rounded transition-colors cursor-pointer"
                            >
                              สร้างบัตร (แนวตั้ง)
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtab content 2: TODAY'S ROOM STATUS */}
      {subTab === 'rooms' && (() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayRequests = roomRequests.filter(
          req => req.room === selectedRoom && req.date === todayStr
        );
        const roomHistory = roomRequests.filter(
          req => req.room === selectedRoom
        );

        return (
          <div className="space-y-6">
            {/* Room Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {roomsList.map(room => {
                const status = checkRoomStatus(room);
                const isSelected = selectedRoom === room;
                return (
                  <div
                    key={room}
                    onClick={() => setSelectedRoom(room)}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between h-[120px] cursor-pointer ${
                      isSelected 
                        ? 'bg-neutral-950 border-neutral-950 text-white shadow-lg' 
                        : status.occupied
                          ? 'bg-rose-50 border-rose-300 text-neutral-900 shadow-xs hover:bg-rose-100/50'
                          : 'bg-white border-neutral-200 text-neutral-900 shadow-xs hover:bg-neutral-50/50'
                    }`}
                  >
                    <div className="flex flex-col gap-1">
                      <h5 className={`font-sans font-bold text-xs leading-snug tracking-tight ${isSelected ? 'text-white' : 'text-neutral-900'}`}>
                        {room}
                      </h5>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <span className={`text-[10px] font-bold tracking-wider uppercase ${isSelected ? 'text-neutral-450' : 'text-neutral-400'}`}>
                        STATUS
                      </span>
                      {status.occupied ? (
                        <span className={`font-sans text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          isSelected 
                            ? 'bg-rose-500 text-white font-extrabold' 
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          ไม่ว่าง
                        </span>
                      ) : (
                        <span className={`font-sans text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          isSelected 
                            ? 'bg-emerald-500 text-neutral-950 font-extrabold' 
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          ว่าง
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Room Booking Details Card */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h4 className="font-sans font-extrabold text-base text-neutral-900 leading-none">
                    {selectedRoom}
                  </h4>
                  <p className="text-[10px] text-neutral-400 font-mono font-bold uppercase tracking-wider mt-1.5">
                    ROOM BOOKING HISTORY AND DETAILS
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500 font-bold">สถานะวันนี้:</span>
                  {checkRoomStatus(selectedRoom).occupied ? (
                    <span className="bg-rose-100 text-rose-800 border border-rose-200 font-sans text-xs font-bold px-3 py-1 rounded-full">
                      ไม่ว่าง
                    </span>
                  ) : (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 font-sans text-xs font-bold px-3 py-1 rounded-full">
                      ว่าง
                    </span>
                  )}
                </div>
              </div>

              <div className="border-t border-neutral-100 my-5" />

              <div className="space-y-6">
                {/* Today's requests section */}
                <div className="space-y-3">
                  <h5 className="font-sans font-bold text-xs text-neutral-800 border-l-3 border-neutral-900 pl-2">
                    รายการขอใช้ห้องในวันนี้ ({todayStr})
                  </h5>

                  {todayRequests.length === 0 ? (
                    <div className="border-2 border-dashed border-neutral-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-neutral-50/20">
                      <Calendar size={28} className="text-neutral-300" />
                      <p className="text-xs text-neutral-400 mt-2 font-medium">
                        ไม่มีการจองขอใช้ในวันนี้สำหรับห้องนี้
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-neutral-200 rounded-xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-neutral-50 text-[10px] text-neutral-500 border-b border-neutral-200 font-bold uppercase">
                            <th className="py-2.5 px-3">ผู้ขอใช้ห้อง</th>
                            <th className="py-2.5 px-3">ตำแหน่ง / บทบาท</th>
                            <th className="py-2.5 px-3">ช่วงเวลาการจอง</th>
                            <th className="py-2.5 px-3">วัตถุประสงค์</th>
                            <th className="py-2.5 px-3 text-center">สถานะการอนุญาต</th>
                          </tr>
                        </thead>
                        <tbody>
                          {todayRequests.map(req => (
                            <tr key={req.id} className="border-b border-neutral-100 hover:bg-neutral-50/50 text-xs">
                              <td className="py-3 px-3 font-bold text-neutral-900">{req.requesterName}</td>
                              <td className="py-3 px-3 text-neutral-500">{req.requesterRole}</td>
                              <td className="py-3 px-3 font-mono text-neutral-600">{req.timeRange}</td>
                              <td className="py-3 px-3 text-neutral-600">{req.purpose}</td>
                              <td className="py-3 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  req.maintenanceApproved === 'Approved' 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : req.maintenanceApproved === 'Rejected'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {req.maintenanceApproved === 'Approved' ? 'อนุมัติ' : req.maintenanceApproved === 'Rejected' ? 'ปฏิเสธ' : 'รอพิจารณา'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Booking history section */}
                <div className="space-y-3">
                  <h5 className="font-sans font-bold text-xs text-neutral-800 border-l-3 border-neutral-900 pl-2">
                    รายละเอียดประวัติการขอใช้ห้องทั้งหมด ({roomHistory.length} รายการ)
                  </h5>

                  {roomHistory.length === 0 ? (
                    <div className="border-2 border-dashed border-neutral-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-neutral-50/20">
                      <Folder size={28} className="text-neutral-300" />
                      <p className="text-xs text-neutral-400 mt-2 font-medium">
                        ไม่มีประวัติการจองใด ๆ ในระบบสำหรับห้องนี้
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-neutral-200 rounded-xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-neutral-50 text-[10px] text-neutral-500 border-b border-neutral-200 font-bold uppercase">
                            <th className="py-2.5 px-3">วันที่จอง</th>
                            <th className="py-2.5 px-3">ผู้ขอใช้ห้อง</th>
                            <th className="py-2.5 px-3">ช่วงเวลา</th>
                            <th className="py-2.5 px-3">วัตถุประสงค์</th>
                            <th className="py-2.5 px-3 text-center">สถานะการอนุมัติ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {roomHistory.map(req => (
                            <tr key={req.id} className="border-b border-neutral-100 hover:bg-neutral-50/50 text-xs">
                              <td className="py-3 px-3 font-mono text-neutral-600">{req.date}</td>
                              <td className="py-3 px-3 font-bold text-neutral-900">{req.requesterName}</td>
                              <td className="py-3 px-3 font-mono text-neutral-600">{req.timeRange}</td>
                              <td className="py-3 px-3 text-neutral-600">{req.purpose}</td>
                              <td className="py-3 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  req.maintenanceApproved === 'Approved' 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : req.maintenanceApproved === 'Rejected'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {req.maintenanceApproved === 'Approved' ? 'อนุมัติ' : req.maintenanceApproved === 'Rejected' ? 'ปฏิเสธ' : 'รอพิจารณา'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Subtab content 3: ROOM USAGE RECORDS TLTC-MO-034 */}
      {subTab === 'records' && (
        <div className="space-y-6">
          
          {/* TLTC-MO-034 List */}
          <div className="bg-white border border-neutral-300 p-5 rounded-lg shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div>
                <h4 className="font-sans font-extrabold text-sm text-neutral-950">สมุดคู่มือช่างอากาศยาน TLTC-MO-034</h4>
                <p className="text-[11px] text-neutral-500">บันทึกรายงานสิ่งที่ต้องการซ่อม พัฒนาระบบ และบันทึกสิ่งชำรุดเสียหาย</p>
              </div>
              <button
                id="printMo034Btn"
                onClick={onPrintUsageRecords}
                className="flex items-center gap-1.5 bg-black hover:bg-neutral-800 text-white font-sans text-xs font-bold px-3 py-1.5 rounded transition-all cursor-pointer shadow-sm"
              >
                <Printer size={13} />
                <span>ออกเอกสารเป็น PDF (TLTC-MO-034)</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-100 text-[10px] text-neutral-600 border-b border-neutral-300 font-bold uppercase">
                    <th className="py-2.5 px-2 w-1/12 text-center">ลำดับ</th>
                    <th className="py-2.5 px-2 w-2/12">วัน/เดือน/ปี</th>
                    <th className="py-2.5 px-2 w-2/12">ห้องที่ใช้งาน</th>
                    <th className="py-2.5 px-2 w-2/12">ผู้ร้องขอเข้าใช้งาน</th>
                    <th className="py-2.5 px-2 w-3/12">สิ่งที่ต้องการให้ซ่อม/พัฒนา</th>
                    <th className="py-2.5 px-2 w-1/12 text-center">ฝ่ายตรวจจับมือ</th>
                  </tr>
                </thead>
                <tbody>
                  {roomUsageRecords.map((rec, index) => (
                    <tr key={rec.id} className="border-b border-neutral-100 hover:bg-neutral-50 text-[11px]">
                      <td className="py-2.5 px-2 text-center font-mono text-neutral-500">{index + 1}</td>
                      <td className="py-2.5 px-2 font-mono text-neutral-600">{rec.date}</td>
                      <td className="py-2.5 px-2 font-bold text-neutral-950">{rec.room}</td>
                      <td className="py-2.5 px-2 font-sans font-bold">{rec.requesterName}</td>
                      <td className="py-2.5 px-2 font-sans">{rec.report}</td>
                      <td className="py-2.5 px-2 text-center">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold shadow-xs mx-auto border ${
                            rec.maintenanceOfficerStatus === 'Acknowledged'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                          title="จำกัดสิทธิ์แก้ไขสำหรับแอดมิน"
                        >
                          <span>{rec.maintenanceOfficerStatus === 'Acknowledged' ? 'รับทราบแล้ว' : 'รอรับทราบ'}</span>
                        </div>
                        <span className="block text-[8px] text-rose-600 font-sans mt-0.5 font-bold">🚫 แอดมินสิทธิ์อ่านอย่างเดียว</span>
                      </td>
                    </tr>
                  ))}
                  {roomUsageRecords.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-450 italic">
                        ไม่มีประวัติบันทึกการใช้ห้องในขณะนี้
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* DOCUMENT CHECKLIST TLTC-MO-033 */}
          <div className="bg-white border border-neutral-300 p-5 rounded-lg shadow-sm">
            <h4 className="font-sans font-extrabold text-sm mb-3 text-neutral-950">เอกสารคำขออนุมัติใช้ห้องปฏิบัติการการบิน (TLTC-MO-033)</h4>

            {/* Date selection controls for Bulk printing */}
            <div className="mb-4 bg-neutral-50 p-3.5 rounded-lg border border-neutral-200 flex flex-wrap items-end gap-3 justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-neutral-600 mb-1">เลือกวันที่เริ่มต้น (From Date)</label>
                  <input
                    type="date"
                    value={docStartDate}
                    onChange={(e) => setDocStartDate(e.target.value)}
                    className="bg-white border border-neutral-300 rounded px-2 py-1 text-xs font-mono text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-neutral-600 mb-1">ถึงวันที่ (To Date)</label>
                  <input
                    type="date"
                    value={docEndDate}
                    onChange={(e) => setDocEndDate(e.target.value)}
                    className="bg-white border border-neutral-300 rounded px-2 py-1 text-xs font-mono text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  />
                </div>
                {(docStartDate || docEndDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDocStartDate('');
                      setDocEndDate('');
                    }}
                    className="bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-sans text-[10px] font-bold py-1.5 px-2.5 rounded transition-colors mt-auto cursor-pointer"
                  >
                    ล้างค่า (Clear)
                  </button>
                )}
              </div>

              {onViewBulkRequestDocs && roomRequests.filter(req => {
                if (!docStartDate && !docEndDate) return true;
                if (docStartDate && req.date < docStartDate) return false;
                if (docEndDate && req.date > docEndDate) return false;
                return true;
              }).length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const selectedList = roomRequests
                      .filter(req => {
                        if (!docStartDate && !docEndDate) return true;
                        if (docStartDate && req.date < docStartDate) return false;
                        if (docEndDate && req.date > docEndDate) return false;
                        return true;
                      });
                    onViewBulkRequestDocs(selectedList);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-xs font-bold py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <Printer size={13} />
                  <span>พิมพ์เอกสารตามที่เลือก ({roomRequests.filter(req => {
                    if (!docStartDate && !docEndDate) return true;
                    if (docStartDate && req.date < docStartDate) return false;
                    if (docEndDate && req.date > docEndDate) return false;
                    return true;
                  }).length} ใบ)</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-100 text-[10px] text-neutral-600 border-b border-neutral-300 font-bold uppercase">
                    <th className="py-2.5 px-2">วันที่ยื่นคำขอ</th>
                    <th className="py-2.5 px-2">ผู้ร้องขอสิทธิ์</th>
                    <th className="py-2.5 px-2">ห้องซ่อมบำรุง</th>
                    <th className="py-2.5 px-2">จุดประสงค์กิจกรรม</th>
                    <th className="py-2.5 px-2 text-center">การอนุญาตห้อง</th>
                    <th className="py-2.5 px-2 text-center">ออกรายงาน PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {roomRequests
                    .filter(req => {
                      if (!docStartDate && !docEndDate) return true;
                      if (docStartDate && req.date < docStartDate) return false;
                      if (docEndDate && req.date > docEndDate) return false;
                      return true;
                    })
                    .map(req => (
                      <tr key={req.id} className="border-b border-neutral-100 hover:bg-neutral-50 text-[11px]">
                        <td className="py-2.5 px-2 font-mono">{req.date}</td>
                        <td className="py-2.5 px-2">
                          <p className="font-sans font-bold">{req.requesterName}</p>
                          <p className="text-[9px] text-neutral-500 font-mono">{req.requesterRole}</p>
                        </td>
                        <td className="py-2.5 px-2 font-semibold text-neutral-950">{req.room}</td>
                        <td className="py-2.5 px-2 truncate max-w-xs">{req.purpose}</td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            req.maintenanceApproved === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : req.maintenanceApproved === 'Rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-neutral-200 text-neutral-700'
                          }`}>
                            {req.maintenanceApproved === 'Approved' ? 'อนุมัติความพร้อม' : req.maintenanceApproved === 'Rejected' ? 'ไม่อนุมัติ' : 'รอการตรวจสอบ'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            onClick={() => onViewRequestDoc(req)}
                            className="flex items-center gap-1 bg-neutral-950 hover:bg-neutral-800 text-white font-sans text-[10px] font-semibold py-1 px-2.5 rounded transition-colors mx-auto cursor-pointer"
                          >
                            <Eye size={11} />
                            <span>ดูเอกสาร PDF</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  {roomRequests.filter(req => {
                    if (!docStartDate && !docEndDate) return true;
                    if (docStartDate && req.date < docStartDate) return false;
                    if (docEndDate && req.date > docEndDate) return false;
                    return true;
                  }).length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-450 italic">
                        ไม่มีเอกสารใบคำขอเข้าใช้ห้องซ่อมบำรุงตามที่ระบุในประวัติหรือวันที่เลือก
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TLTC-MO-001 Section: Borrow Records */}
          <div className="bg-white border border-neutral-300 p-5 rounded-lg shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div>
                <h4 className="font-sans font-extrabold text-sm text-neutral-950 flex items-center gap-1.5">
                  <Wrench size={14} className="text-neutral-950" />
                  <span>สมุดทะเบียนการยืม-คืนเครื่องมือช่างอากาศยาน (TLTC-MO-001)</span>
                </h4>
                <p className="text-[11px] text-neutral-500">ประวัติการยืมคืนเครื่องมือช่างและอุปกรณ์ตรวจสอบย้อนกลับ (Traceability Verification Log)</p>
              </div>
              <button
                id="adminPrintMo001Btn"
                onClick={() => setShowTraceabilityDoc(true)}
                className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-750 text-white font-sans text-xs font-bold px-3 py-1.5 rounded transition-all cursor-pointer shadow-sm"
              >
                <Printer size={13} />
                <span>ออกเอกสารเป็น PDF (TLTC-MO-001)</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-100 text-[10px] text-neutral-600 border-b border-neutral-300 font-bold uppercase font-sans">
                    <th className="py-2.5 px-2 w-[15%]">วัน/เวลาที่ยืม</th>
                    <th className="py-2.5 px-2 w-[25%]">ชื่อเครื่องมือ</th>
                    <th className="py-2.5 px-2 w-[15%]">รหัสเครื่องมือ</th>
                    <th className="py-2.5 px-1 w-[8%] text-center">จำนวน</th>
                    <th className="py-2.5 px-2 w-[17%]">ผู้เบิกยืม</th>
                    <th className="py-2.5 px-2 w-[10%] text-center">สถานะ</th>
                    <th className="py-2.5 px-2 w-[15%] text-center font-sans font-bold text-neutral-750">ผู้ตรวจสอบรับคืน</th>
                  </tr>
                </thead>
                <tbody>
                  {borrowRecords.map(rec => (
                    <tr key={rec.id} className="border-b border-neutral-100 hover:bg-neutral-50 text-[11px] font-sans">
                      <td className="py-2.5 px-2 font-mono text-neutral-600 leading-tight">{rec.borrowDate}</td>
                      <td className="py-2.5 px-2 font-bold text-neutral-950 uppercase">{rec.toolName}</td>
                      <td className="py-2.5 px-2 font-mono font-bold text-neutral-700">{rec.equipmentCode}</td>
                      <td className="py-2.5 px-1 font-mono font-bold text-center">{rec.qty}</td>
                      <td className="py-2.5 px-2 font-sans font-semibold text-neutral-800">{rec.borrowerName}</td>
                      <td className="py-2.5 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rec.status === 'Returned'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.status === 'PendingReturn'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {rec.status === 'Returned' ? 'คืนแล้ว' : rec.status === 'PendingReturn' ? 'รออนุมัติคืน' : 'กำลังยืม'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-sans font-bold text-neutral-700">
                        {rec.checkerName || (rec.status === 'Returned' ? 'Inspector' : '-')}
                      </td>
                    </tr>
                  ))}
                  {borrowRecords.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-neutral-450 italic">
                        ไม่มีประวัติการยืมคืนเครื่องมือช่างในขณะนี้
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Subtab content 4: VERIFY STUDENT ID & QR SCANNER */}
      {subTab === 'verify' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          
          {/* Left Hand: Scanner HUD & Search Input */}
          <div className="lg:col-span-6 bg-white border border-neutral-300 rounded-lg p-5 shadow-sm space-y-6">
            <div>
              <h3 className="font-sans font-extrabold text-sm text-neutral-950 flex items-center gap-2">
                <QrCode className="text-neutral-950" size={16} />
                <span>กล้องสแกนคิวอาร์โค้ด & ค้นหาสิทธิ์นักศึกษา</span>
              </h3>
              <p className="text-[10px] text-neutral-500 mt-1">
                ใช้กล้องสมาร์ตโฟนหรือเว็บแคมในการสแกนคิวอาร์โค้ดบน "บัตรประจำตัวนักศึกษา (ID Card)" เพื่อตรวจสถานะ ความปลอดภัย และประวัติตารางเรียนล่าสุดได้ทันที
              </p>
            </div>

            {/* Custom Interactive Camera Viewport */}
            <div className="border border-neutral-300 rounded-lg overflow-hidden bg-neutral-950 p-4 shrink-0">
              <div className="flex items-center justify-between mb-3 text-white text-[10px] font-semibold">
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${isVerifyCameraActive ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
                  {isVerifyCameraActive ? 'กล้องพร้อมสแกนข้อมูลบาร์โค้ด' : 'ปิดระบบกล้องสแกน'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsVerifyCameraActive(!isVerifyCameraActive)}
                  className={`px-3 py-1 rounded text-[10px] font-bold cursor-pointer transition-all duration-200 ${
                    isVerifyCameraActive ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-white text-neutral-950 hover:bg-neutral-100'
                  }`}
                >
                  {isVerifyCameraActive ? 'ปิดใช้งานกล้อง' : 'เปิดรันกล้องสแกน'}
                </button>
              </div>

              {isVerifyCameraActive ? (
                <div className="relative w-full h-64 bg-neutral-900 rounded border border-neutral-800 flex items-center justify-center overflow-hidden">
                  {verifyCameraError ? (
                    <div className="absolute inset-0 p-4 text-center text-rose-400 text-[10.5px] font-bold flex flex-col justify-center items-center bg-rose-950/25">
                      <span>⚠️ {verifyCameraError}</span>
                      <span className="text-neutral-300 font-normal mt-2">กำลังทำงานในโหมดโปรแกรมจำลองด่วน โปรดใช้แถบรายการปุ่มด่วนด้านล่างเพื่อสแกน</span>
                    </div>
                  ) : (
                    <>
                      <div
                        id="admin-verify-reader"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      {/* Laser scanning target square HUD */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 p-2">
                        <div className="w-40 h-40 border border-white/10 rounded-lg relative flex items-center justify-center bg-emerald-500/5">
                          <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-sm animate-pulse" />
                          <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-sm animate-pulse" />
                          <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-sm animate-pulse" />
                          <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br-sm animate-pulse" />
                          
                          <div className="w-full h-0.5 bg-emerald-400 animate-bounce shadow-[0_0_8px_#10b981]" style={{ animationDuration: '2.5s' }} />
                          
                          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-sans font-bold text-emerald-400 tracking-wider text-center uppercase bg-slate-950/95 px-2.5 py-1 rounded border border-emerald-500/30 whitespace-nowrap shadow-md select-none">
                            เล็งคิวอาร์โค้ด (QR CODE) ในกรอบนี้
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="w-full h-64 bg-neutral-900 rounded border border-neutral-800 flex flex-col items-center justify-center text-neutral-500">
                  <Camera size={32} className="opacity-40 mb-2" />
                  <span className="text-[10px] font-bold">กรุณากดปุ่มเพื่อสลับ "เปิดใช้งานกล้อง"</span>
                  <span className="text-[8.5px] font-mono mt-0.5 opacity-60">CAMERA CO-AXIAL INACTIVE</span>
                </div>
              )}

              {/* Simulation triggers */}
              <div className="mt-3.5 pt-3 border-t border-neutral-800">
                <span className="block text-neutral-450 text-[9px] uppercase font-bold tracking-wider mb-2">ปุ่มสแกนจำลองข้อมูล QR สำหรับนักศึกษาเพื่อการทดสอบด่วน:</span>
                <div className="flex flex-wrap gap-1">
                  {users
                    .filter(u => u.role === 'นักศึกษา')
                    .map(stu => (
                      <button
                        key={stu.id}
                        type="button"
                        onClick={() => handleSimulateQRScan(`${getAppOriginForQR()}/?id=${stu.id}`)}
                        className="bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 hover:border-emerald-500 px-2 py-1 rounded text-[9.5px] font-bold font-mono transition-transform duration-100 hover:scale-105 cursor-pointer"
                      >
                        [QR] {stu.firstName}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* Manual input validation search */}
            <form onSubmit={handleManualSearch} className="space-y-4 pt-3 border-t border-neutral-200">
              <h4 className="font-bold text-xs text-neutral-950">หรือระบุเลขรหัสประจำตัวเป็นข้อความ</h4>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-neutral-400" />
                  <input
                    type="text"
                    required
                    placeholder="ป้อนรหัสนักศึกษา (เช่น: 67010214...)"
                    value={verifySearchId}
                    onChange={(e) => setVerifySearchId(e.target.value)}
                    className="w-full border border-neutral-300 pl-8 pr-3 py-2 rounded focus:outline-none text-xs bg-white text-neutral-950 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-[#0F172A] hover:bg-neutral-800 text-white font-sans text-xs font-bold px-4 rounded transition-colors cursor-pointer shrink-0"
                >
                  ค้นหาสิทธิ์
                </button>
              </div>
            </form>
          </div>

          {/* Right Hand: Interactive Student Status Card View */}
          <div className="lg:col-span-6 space-y-6">
            {verifyUser ? (
              <div className="bg-white border border-neutral-300 rounded-lg p-5 shadow-sm space-y-5">
                <div className="flex justify-between items-center border-b pb-3.5">
                  <h4 className="font-sans font-extrabold text-sm text-neutral-955">ผลการวิเคราะห์ตัวตนผู้เรียนเครื่องช่าง (AMT Analytics Profile)</h4>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold ${
                    verifyUser.status === 'Active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    สถานะการเรียน: {verifyUser.status}
                  </span>
                </div>

                {/* Profile card metadata block */}
                <div className="flex gap-4 p-3 bg-stone-50 border border-neutral-205 rounded-lg">
                  <img
                    src={verifyUser.photoUrl}
                    alt="Scan Avatar"
                    className="w-16 h-20 object-cover rounded border border-neutral-400 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="space-y-1 my-auto">
                    <p className="font-sans text-sm font-black text-neutral-950">{verifyUser.title ? verifyUser.title + ' ' : ''}{verifyUser.firstName} {verifyUser.lastName}</p>
                    <p className="text-[10px] text-neutral-600 font-medium">ตำแหน่งหน้าที่: <b>{verifyUser.role}</b> {verifyUser.role === 'นักศึกษา' ? `| รุ่น ${String(verifyUser.id || '').substring(0, 2)}` : (verifyUser.batch ? `| รุ่น ${verifyUser.batch}` : '')}</p>
                    <p className="text-[10px] text-neutral-550 font-mono">อีเมลจดสิทธิ์: {verifyUser.email}</p>
                    <p className="text-[10px] text-neutral-550 font-mono">รหัสประจำตัว: <strong className="text-neutral-900 underline font-bold">{verifyUser.id}</strong></p>
                  </div>
                </div>

                {/* Digital vertical ID Card print block button */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onViewStudentCard(verifyUser)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-neutral-950 hover:bg-neutral-800 text-white font-sans text-xs font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer"
                  >
                    <Printer size={13} />
                    <span>พิมพ์และแสดงบัตรประจำตัวการช่างแนวตั้ง</span>
                  </button>
                </div>

                {/* Verification Checkpoints status indicator */}
                <div className="space-y-3.5">
                  <h5 className="font-bold text-neutral-800 text-xs flex items-center gap-1">
                    <CheckCircle className="text-emerald-600" size={14} />
                    <span>รายการตรวจสอบสิทธิ์เข้าใช้งานสถาบันฝึกบิน (Security Checkpoints)</span>
                  </h5>
                  <div className="space-y-2 text-[10.5px]">
                    <div className="flex items-center justify-between p-2 rounded bg-emerald-50/50 border border-emerald-200">
                      <span className="font-medium text-emerald-950">1. การเข้าใช้โรงงานและโรงช่างใหญ่บำรุงรักษา</span>
                      <span className="font-bold text-emerald-800">✅ APPROVED / ALLOWED</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-emerald-55/50 border border-emerald-200">
                      <span className="font-medium text-emerald-950">2. ใบอนุญาตรับรองระบบความปลอดภัย (Safety Pass)</span>
                      <span className="font-bold text-emerald-800">✅ ACTIVE & REGISTERED</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-emerald-55/50 border border-emerald-200">
                      <span className="font-medium text-emerald-950">3. สิทธิ์การทำรายการยื่นคำขอจองห้องฝึกปฏิบัติ</span>
                      <span className="font-bold text-emerald-800">✅ PERMITTED ({verifyUser.role})</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-neutral-300 rounded-lg p-8 shadow-sm flex flex-col items-center justify-center text-center text-neutral-500 h-96">
                <QrCode size={48} className="opacity-30 mb-3 animate-pulse" />
                <h4 className="font-sans font-bold text-sm text-neutral-950">รอกล้องสแกนหรือค้นหาบันทึกสิทธิ์นักเรียน</h4>
                <p className="text-[10px] text-neutral-550 max-w-xs mt-1 leading-relaxed">
                  เมื่อระบบได้รับรหัสนักเรียนผ่านกล้องวิดีโอหรือป้อนรหัสทางซ้าย แดชบอร์ดจะประมวลผลข้อมูลและดึงประวัติการลงทะเบียน คอร์สเรียนล่าสุดทันที
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Traceability Tools Log modal */}
      {showTraceabilityDoc && (
        <TraceabilityToolsLogDoc 
          records={borrowRecords}
          onClose={() => setShowTraceabilityDoc(false)}
        />
      )}

    </div>
  );
}
