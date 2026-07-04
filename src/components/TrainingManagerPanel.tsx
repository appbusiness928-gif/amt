/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { User, RoomRequest, ClassSchedule, RoomUsageRecord, BorrowRecord, ExamGrade, ExamSchedule } from '../types';
import SignaturePad from './SignaturePad';
import { 
  User as UserIcon, Calendar, CheckSquare, ClipboardList, 
  Search, Eye, EyeOff, Edit2, FileText, Check, ShieldAlert, Printer, Wrench, Edit3, X, GraduationCap, Users2, Home
} from 'lucide-react';
import { alerts as Swal } from '../lib/alerts';
import { TraceabilityToolsLogDoc } from './Documents';
import { compressImage } from '../lib/api';

const TIME_OPTIONS = [
  "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"
];

interface TrainingManagerPanelProps {
  currentUser: User;
  users: User[];
  roomRequests: RoomRequest[];
  classSchedules: ClassSchedule[];
  roomUsageRecords: RoomUsageRecord[];
  borrowRecords: BorrowRecord[];
  examGrades?: ExamGrade[];
  examSchedules?: ExamSchedule[];
  activeButtonTab?: 'home' | 'profile' | 'request' | 'schedules' | 'status' | 'personnel' | 'myDocs' | 'docs' | 'approvals';
  onActiveButtonTabChange?: (tab: 'home' | 'profile' | 'request' | 'schedules' | 'status' | 'personnel' | 'myDocs' | 'docs' | 'approvals') => void;
  onUpdateProfile: (updated: Partial<User>) => void;
  onSubmitRoomRequest: (req: Omit<RoomRequest, 'id' | 'maintenanceApproved' | 'isRoomUsageRecordCreated'>) => boolean;
  onUpdateStudentStatusByStaff: (studentId: string, status: User['status']) => void;
  onApproveStudentStatusByManager?: (studentId: string) => void;
  onViewRequestDoc: (req: RoomRequest) => void;
  onViewBulkRequestDocs?: (reqs: RoomRequest[]) => void;
  onPrintUsageRecords?: () => void;
  onApproveUser?: (userId: string) => void;
  onRejectUser?: (userId: string) => void;
  onAddUsageRecord?: (record: Omit<RoomUsageRecord, 'id' | 'maintenanceOfficerStatus'>) => void;
  onCancelRoomRequest?: (requestId: string) => void;
  onViewStudentCard: (user: User) => void;
  welcomeBanner?: React.ReactNode;
}

import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';

export default function TrainingManagerPanel({
  currentUser,
  users,
  roomRequests,
  classSchedules,
  roomUsageRecords,
  borrowRecords,
  examGrades = [],
  examSchedules = [],
  activeButtonTab: controlledActiveButtonTab,
  onActiveButtonTabChange,
  onUpdateProfile,
  onSubmitRoomRequest,
  onUpdateStudentStatusByStaff,
  onApproveStudentStatusByManager,
  onViewRequestDoc,
  onViewBulkRequestDocs,
  onPrintUsageRecords,
  onApproveUser,
  onRejectUser,
  onAddUsageRecord,
  onCancelRoomRequest,
  onViewStudentCard,
  welcomeBanner
}: TrainingManagerPanelProps) {
  const isManager = currentUser.role === 'Training Manager';
  const [localActiveButtonTab, setLocalActiveButtonTab] = useState<'home' | 'profile' | 'request' | 'schedules' | 'status' | 'personnel' | 'myDocs' | 'docs' | 'approvals'>('home');
  const activeButtonTab = controlledActiveButtonTab !== undefined ? controlledActiveButtonTab : localActiveButtonTab;
  const setActiveButtonTab = (tab: 'home' | 'profile' | 'request' | 'schedules' | 'status' | 'personnel' | 'myDocs' | 'docs' | 'approvals') => {
    if (onActiveButtonTabChange) onActiveButtonTabChange(tab);
    setLocalActiveButtonTab(tab);
  };
  const [showTraceabilityDoc, setShowTraceabilityDoc] = useState(false);

  // Input states for room request
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState('');
  const [requestDate, setRequestDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [selectedRoom, setSelectedRoom] = useState('Practical Area in Hangar');
  const [otherRoomText, setOtherRoomText] = useState('');
  const [requestSignature, setRequestSignature] = useState('');

  // Room Usage Record form states
  const [roomSubForm, setRoomSubForm] = useState<'request' | 'usage'>('request');
  const [usageDate, setUsageDate] = useState(new Date().toISOString().split('T')[0]);
  const [usageRoomName, setUsageRoomName] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [usageReportText, setUsageReportText] = useState('');
  const [usageSignature, setUsageSignature] = useState('');

  // Date range filters for document printing (TLTC-MO-033)
  const [docStartDate, setDocStartDate] = useState('');
  const [docEndDate, setDocEndDate] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<string>('All');

  // Search schedule states
  const [searchStudentId, setSearchStudentId] = useState('');
  const [foundStudent, setFoundStudent] = useState<User | null>(null);
  const [studentSchedules, setStudentSchedules] = useState<ClassSchedule[]>([]);


  // Profile Edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editTitle, setEditTitle] = useState(currentUser.title || '');
  const [editFirstNameTh, setEditFirstNameTh] = useState(currentUser.firstNameTh || '');
  const [editLastNameTh, setEditLastNameTh] = useState(currentUser.lastNameTh || '');
  const [editEmail, setEditEmail] = useState(currentUser.email);
  const [editPassword, setEditPassword] = useState(currentUser.password || '');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editPhoto, setEditPhoto] = useState(currentUser.photoUrl);
  const [editSig, setEditSig] = useState(currentUser.signature);

  const handleCancelEditProfile = () => {
    setEditTitle(currentUser.title || '');
    setEditFirstNameTh(currentUser.firstNameTh || '');
    setEditLastNameTh(currentUser.lastNameTh || '');
    setEditEmail(currentUser.email);
    setEditPassword(currentUser.password || '');
    setEditPhoto(currentUser.photoUrl);
    setEditSig(currentUser.signature);
    setIsEditingProfile(false);
  };

  const handleUpdateProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFirstNameTh.trim() || !editLastNameTh.trim() || !editEmail.trim()) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: 'กรุณากรอกข้อมูลชื่อ-นามสกุลไทย และอีเมลให้ครบถ้วน', confirmButtonColor: '#171717' });
      return;
    }

    if (editFirstNameTh.trim() || editLastNameTh.trim()) {
      const thaiRegex = /^[ก-๙\s.-]+$/;
      if (editFirstNameTh.trim() && !thaiRegex.test(editFirstNameTh.trim())) {
        Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: 'กรุณากรอกชื่อจริงเป็นภาษาไทยเท่านั้น', confirmButtonColor: '#171717' });
        return;
      }
      if (editLastNameTh.trim() && !thaiRegex.test(editLastNameTh.trim())) {
        Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: 'กรุณากรอกนามสกุลเป็นภาษาไทยเท่านั้น', confirmButtonColor: '#171717' });
        return;
      }
    }

    onUpdateProfile({
      title: editTitle.trim(),
      firstNameTh: editFirstNameTh.trim(),
      lastNameTh: editLastNameTh.trim(),
      email: editEmail,
      password: editPassword,
      photoUrl: editPhoto,
      signature: editSig
    });
    setIsEditingProfile(false);
    Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'แก้ไขข้อมูลของฉันเรียบร้อยแล้ว', confirmButtonColor: '#171717' });
  };

  const checkRoomBusy = (roomName: string): boolean => {
    if (!requestDate || !startTime || !endTime) return false;
    if (startTime >= endTime) return false;

    const normalizeDateStr = (dateStr: string): string => {
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
        if (year > 2400) year -= 543;
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
      return trimmed;
    };

    const parseTimeRangeStr = (timeRangeStr: string) => {
      const parts = timeRangeStr.split('-');
      if (parts.length === 2) {
        return {
          startTime: parts[0].trim(),
          endTime: parts[1].trim(),
        };
      }
      return { startTime: '', endTime: '' };
    };

    const targetNormDate = normalizeDateStr(requestDate);

    return roomRequests.some(existing => {
      if (existing.maintenanceApproved === 'Rejected') return false;
      if (existing.room.trim().toLowerCase() !== roomName.trim().toLowerCase()) return false;
      if (normalizeDateStr(existing.date) !== targetNormDate) return false;

      const existTimes = parseTimeRangeStr(existing.timeRange);
      if (!existTimes.startTime || !existTimes.endTime) return false;

      return existTimes.startTime < endTime && startTime < existTimes.endTime;
    });
  };

  const handleRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!department || !phone || !purpose || !requestDate) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: 'กรุณากรอกข้อมูลฟอร์มให้ครบถ้วน', confirmButtonColor: '#171717' });
      return;
    }
    if (!requestSignature) {
      Swal.fire({ icon: 'error', title: 'ต้องการลายเซ็น', text: 'กรุณาเซ็นลายมือรับรองใบคำขอนี้ด้วย', confirmButtonColor: '#171717' });
      return;
    }

    // Validate that startTime < endTime before submitting
    if (startTime >= endTime) {
      Swal.fire({
        icon: 'error',
        title: 'ช่วงเวลาไม่ถูกต้อง',
        text: 'เวลาเริ่มต้นต้องอยู่ก่อนเวลาสิ้นสุด',
        confirmButtonColor: '#171717'
      });
      return;
    }

    const finalRoom = selectedRoom === 'Other' ? otherRoomText : selectedRoom;

    // Direct overlap check before calling submission
    if (checkRoomBusy(finalRoom)) {
      Swal.fire({
        icon: 'error',
        title: 'ห้องไม่ว่างในวันเวลาดังกล่าว',
        text: `ไม่สามารถส่งคำขอจองได้ เนื่องจากห้อง "${finalRoom}" ถูกจองหรือใช้งานแล้วในช่วงเวลาดังกล่าว`,
        confirmButtonColor: '#171717'
      });
      return;
    }

    const success = onSubmitRoomRequest({
      date: requestDate,
      timeRange: `${startTime} - ${endTime}`,
      room: finalRoom,
      requesterId: currentUser.id,
      requesterName: currentUser.firstNameTh && currentUser.lastNameTh 
        ? `${currentUser.title || ''}${currentUser.firstNameTh} ${currentUser.lastNameTh}`.trim()
        : `${currentUser.title ? currentUser.title + ' ' : ''}${currentUser.firstName} ${currentUser.lastName}`.trim(),
      requesterRole: currentUser.role,
      department,
      phone,
      purpose,
      signature: requestSignature,
    });

    if (success) {
      // Reset Form
      setPurpose('');
      setDepartment('');
      setPhone('');
      setRequestSignature('');
      Swal.fire({ icon: 'success', title: 'ส่งคำขอสำเร็จ', text: 'ส่งใบคำขอใช้ห้องปฏิบัติการ เรียบร้อยแล้ว ขณะนี้รอเจ้าหน้าที่ฝ่ายซ่อมบำรุงตราระบุความพร้อม', confirmButtonColor: '#171717' });
    }
  };

  const handleUsageRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usageDate || !usageRoomName || !usageReportText) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: 'กรุณากรอกข้อมูลให้ครบถ้วน', confirmButtonColor: '#171717' });
      return;
    }
    if (!usageSignature) {
      Swal.fire({ icon: 'error', title: 'ต้องการลายเซ็น', text: 'ผู้เข้าใช้ห้องต้องลงลายเซ็นรับรองความรับผิดชอบ', confirmButtonColor: '#171717' });
      return;
    }
    if (onAddUsageRecord) {
      onAddUsageRecord({
        id: selectedRequestId || undefined,
        date: usageDate,
        room: usageRoomName,
        requesterName: currentUser.firstNameTh && currentUser.lastNameTh 
          ? `${currentUser.title || ''}${currentUser.firstNameTh} ${currentUser.lastNameTh}`.trim()
          : `${currentUser.title ? currentUser.title + ' ' : ''}${currentUser.firstName} ${currentUser.lastName}`.trim(),
        report: usageReportText,
        remarks: selectedRequestId ? 'บันทึกเข้าใช้งานห้องปฏิบัติการ (ตามคำขอ)' : 'บันทึกเข้าใช้งานห้องปฏิบัติการ (ไม่ต้องขอจอง)',
        requesterSignature: usageSignature,
      });
      setUsageRoomName('');
      setUsageReportText('');
      setUsageSignature('');
      setSelectedRequestId('');
      Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', text: 'บันทึกประวัติการใช้งานห้องปฏิบัติการ (TLTC-MO-034) เรียบร้อย', confirmButtonColor: '#10b981' });
    }
  };

  const handleRequestSelection = (reqId: string) => {
    setSelectedRequestId(reqId);
    if (reqId === 'other' || reqId === '') {
        setUsageRoomName('');
        setUsageDate(new Date().toISOString().split('T')[0]);
    } else {
        const req = roomRequests.find(r => r.id === reqId);
        if (req) {
            setUsageRoomName(req.room);
            setUsageDate(req.date.split('T')[0]);
        }
    }
  };

  const handleSearchStudentSchedule = () => {
    const student = users.find(u => String(u.id || '').trim() === String(searchStudentId || '').trim() && u.role === 'นักศึกษา');
    if (!student) {
      Swal.fire({ icon: 'error', title: 'ไม่พบรหัสประจำตัว', text: 'ไม่พบประวัตินักศึกษารหัสนี้ในสารบบ', confirmButtonColor: '#171717' });
      setFoundStudent(null);
      setStudentSchedules([]);
      return;
    }
    setFoundStudent(student);
    // Find class schedule matching student's batch (i.e. model prefix or cohort match)
    const batchPrefix = student.batch || String(student.id || '').substring(0, 2);
    const mathcingSchedules = classSchedules.filter(s => s.batch === batchPrefix);
    setStudentSchedules(mathcingSchedules);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-slate-850 font-sans text-xs">
      
      {/* Mobile/Tablet Horizontal Sub-navigation tabs */}
      <div className="hidden bg-white hover:bg-slate-50/50 p-1 rounded-xl border border-slate-200 shadow-sm gap-1 overflow-x-auto shrink-0 no-print">
        <button
          onClick={() => setActiveButtonTab('home')}
          className={`px-4 py-2 rounded-lg font-sans font-bold text-center text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeButtonTab === 'home' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          หน้าแรก
        </button>
        <button
          onClick={() => setActiveButtonTab('schedules')}
          className={`px-4 py-2 rounded-lg font-sans font-bold text-center text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeButtonTab === 'schedules' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          ดูตารางเรียนนักศึกษา
        </button>
        <button
          onClick={() => setActiveButtonTab('status')}
          className={`px-4 py-2 rounded-lg font-sans font-bold text-center text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeButtonTab === 'status' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          ข้อมูลนักศึกษา
        </button>
        <button
          onClick={() => setActiveButtonTab('personnel')}
          className={`px-4 py-2 rounded-lg font-sans font-bold text-center text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeButtonTab === 'personnel' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          ข้อมูลบุคลากร
        </button>
        <button
          onClick={() => setActiveButtonTab('request')}
          className={`px-4 py-2 rounded-lg font-sans font-bold text-center text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeButtonTab === 'request' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          ขอใช้ห้อง/บันทึกการใช้ห้อง
        </button>
        <button
          onClick={() => setActiveButtonTab('myDocs')}
          className={`px-4 py-2 rounded-lg font-sans font-bold text-center text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeButtonTab === 'myDocs' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          เอกสารคำขอของฉัน
        </button>
        {isManager && (
          <button
            onClick={() => setActiveButtonTab('docs')}
            className={`px-4 py-2 rounded-lg font-sans font-bold text-center text-xs transition-all cursor-pointer whitespace-nowrap ${
              activeButtonTab === 'docs' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            เอกสารคำขอทั้งหมด
          </button>
        )}
        <button
          onClick={() => setActiveButtonTab('approvals')}
          className={`px-4 py-2 rounded-lg font-sans font-bold text-center text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeButtonTab === 'approvals' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          อนุมัติสิทธิ์ผู้ใช้งาน
        </button>
        <button
          onClick={() => setActiveButtonTab('profile')}
          className={`px-4 py-2 rounded-lg font-sans font-bold text-center text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeButtonTab === 'profile' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          จัดการข้อมูลส่วนตัว
        </button>
      </div>

      {/* Side menu control button panel */}
      <div className="hidden lg:flex lg:col-span-1 bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex-col gap-1.5">
        <h4 className="font-sans font-extrabold text-[10px] uppercase text-slate-400 mb-2 tracking-widest border-b border-slate-100 pb-1.5 font-bold">
          ระบบควบคุมสำหรับ {currentUser.role}
        </h4>
        
        <button
          id="tmHomeBtn"
          onClick={() => setActiveButtonTab('home')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeButtonTab === 'home' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <Home size={14} />
          <span>หน้าแรก</span>
        </button>

        <button
          id="tmSchedulesBtn"
          onClick={() => setActiveButtonTab('schedules')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeButtonTab === 'schedules' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <Search size={14} />
          <span>ดูตารางเรียนนักศึกษา</span>
        </button>

        <button
          id="tmStatusBtn"
          onClick={() => setActiveButtonTab('status')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeButtonTab === 'status' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <GraduationCap size={14} />
          <span>ข้อมูลนักศึกษา</span>
        </button>

        <button
          id="tmPersonnelBtn"
          onClick={() => setActiveButtonTab('personnel')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeButtonTab === 'personnel' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <Users2 size={14} />
          <span>ข้อมูลบุคลากร</span>
        </button>

        <button
          id="tmRequestBtn"
          onClick={() => setActiveButtonTab('request')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeButtonTab === 'request' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <Calendar size={14} />
          <span>ขอใช้ห้อง/บันทึกการใช้ห้อง</span>
        </button>

        <button
          id="tmMyDocsBtn"
          onClick={() => setActiveButtonTab('myDocs')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeButtonTab === 'myDocs' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <ClipboardList size={14} />
          <span>เอกสารคำขอของฉัน</span>
        </button>

        {isManager && (
          <button
            id="tmDocsBtn"
            onClick={() => setActiveButtonTab('docs')}
            className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeButtonTab === 'docs' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
            }`}
          >
            <ClipboardList size={14} />
            <span>เอกสารคำขอทั้งหมด</span>
          </button>
        )}

        <button
          id="tmApprovalsBtn"
          onClick={() => setActiveButtonTab('approvals')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeButtonTab === 'approvals' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <ShieldAlert size={14} />
          <span>อนุมัติสิทธิ์ผู้ใช้งาน</span>
          {users.filter(u => u.status === 'Pending').length > 0 && (
            <span className="ml-auto bg-rose-600 text-white font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded-full animate-pulse">
              {users.filter(u => u.status === 'Pending').length}
            </span>
          )}
        </button>

        <button
          id="tmProfileBtn"
          onClick={() => setActiveButtonTab('profile')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 border-t border-slate-100 mt-2 pt-2 ${
            activeButtonTab === 'profile' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <UserIcon size={14} />
          <span>จัดการข้อมูลส่วนตัว</span>
        </button>
      </div>

      {/* Main Panel Content screen */}
      <div className="lg:col-span-3 space-y-6">
        {welcomeBanner}
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        
        {/* TAB 0: HOME / DASHBOARD */}
        {activeButtonTab === 'home' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b pb-2">
              <h3 className="font-sans font-extrabold text-sm text-neutral-900 uppercase">
                แผงวิเคราะห์และสถิติด้านการฝึกอบรม (Training Analytics Board)
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">ภาพรวมของนักศึกษา บุคลากร และร้อยละคะแนนเฉลี่ยผลการสอบรายรายวิชาแยกตามรุ่น</p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-slate-350 transition-all duration-200">
                <span className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider">Active Students</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-extrabold text-[#0F172A] font-mono">
                    {users.filter(u => u.role === 'นักศึกษา' && u.status === 'Active').length}
                  </span>
                  <span className="text-slate-500 font-sans text-[10px]">คนกำลังใช้งาน</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-slate-350 transition-all duration-200">
                <span className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider">Active Personnel</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-extrabold text-[#0F172A] font-mono">
                    {users.filter(u => u.role !== 'นักศึกษา' && u.role !== 'Admin' && u.status === 'Active').length}
                  </span>
                  <span className="text-slate-500 font-sans text-[10px]">คนคอยสอน/ตรวจ</span>
                </div>
              </div>

              <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200 shadow-2xs flex flex-col justify-between hover:border-rose-300 transition-all duration-200">
                <span className="text-[9px] text-rose-700 font-mono font-bold uppercase tracking-wider">Pending Approvals</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-extrabold text-rose-900 font-mono">
                    {users.filter(u => u.status === 'Pending').length}
                  </span>
                  <span className="text-rose-700 font-sans text-[10px] font-bold">รออนุมัติสิทธิ์</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-slate-350 transition-all duration-200">
                <span className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider">Documents Summary</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-extrabold text-[#0F172A] font-mono">
                    {roomRequests.length + roomUsageRecords.length}
                  </span>
                  <span className="text-slate-500 font-sans text-[10px]">เอกสารทั้งหมด</span>
                </div>
              </div>
            </div>

            {/* Exam Percentages Analysis */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase font-mono tracking-wide">% คะแนนสอบเฉลี่ยแต่ละวิชาและรุ่น (Exam Success Rates by Subject & Class)</h4>
                  <p className="text-[10px] text-slate-500 font-sans">อัตราคะแนนสอบเฉลี่ยแยกรายหลักสูตร Part-147 ระหว่างรุ่นของนักศึกษา</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border">
                    <span className="w-2.5 h-2.5 rounded bg-sky-500 inline-block"></span> รุ่น 67
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border">
                    <span className="w-2.5 h-2.5 rounded bg-indigo-600 inline-block"></span> รุ่น 68
                  </span>
                </div>
              </div>

              {/* Chart container */}
              <div className="h-64 w-full text-slate-800">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'M01 Math', 'รุ่น 67': 78, 'รุ่น 68': 82 },
                      { name: 'M02 Physics', 'รุ่น 67': 74, 'รุ่น 68': 80 },
                      { name: 'M03 Elec', 'รุ่น 67': 81, 'รุ่น 68': 85 },
                      { name: 'M07 Maintain', 'รุ่น 67': 86, 'รุ่น 68': 89 },
                      { name: 'M11 Aero', 'รุ่น 67': 79, 'รุ่น 68': 83 },
                    ]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B', fontWeight: 'bold' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748B' }} />
                    <Tooltip cursor={{ fill: '#F1F5F9' }} />
                    <Bar dataKey="รุ่น 67" fill="#38BDF8" radius={[4, 4, 0, 0]} barSize={25} />
                    <Bar dataKey="รุ่น 68" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={25} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Passing Rate Indicator Matrix */}
              <div className="mt-6 border-t border-slate-100 pt-4">
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 font-mono">รายละเอียดสัดส่วนวิชาการผ่านเกณฑ์ (75% Minimum Requirement)</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-150">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-slate-800">M01 Mathematics</span>
                      <span className="font-mono text-emerald-600 font-bold">100% Passed</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-150">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-slate-800">M02 Basic Physics</span>
                      <span className="font-mono text-amber-600 font-bold">92% Passed</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: '92%' }}></div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-150">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-slate-800">M11 Turbine Aeroplane</span>
                      <span className="font-mono text-emerald-600 font-bold">96% Passed</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '96%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 0.5: PERSONNEL DIRECTORY */}
        {activeButtonTab === 'personnel' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b pb-2">
              <h3 className="font-sans font-extrabold text-sm text-neutral-900 uppercase">
                ข้อมูลบุคลากรและเจ้าหน้าที่สถาบันอบรม (Personnel & Instructor Directory)
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">ข้อมูลรายชื่อตำแหน่ง ลายมือชื่อ และสถานะความปลอดภัยของบุคลากรผู้ฝึกสอน</p>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] text-slate-500 font-bold border-b border-slate-200 font-mono">
                    <th className="py-3 px-3">รูปถ่าย</th>
                    <th className="py-3 px-3">รหัสพนักงาน</th>
                    <th className="py-3 px-3">ชื่อ - นามสกุล</th>
                    <th className="py-3 px-3">ตำแหน่งหน้าที่</th>
                    <th className="py-3 px-3">อีเมลติดต่อ</th>
                    <th className="py-3 px-3">ตัวอย่างลายเซ็นรับรอง</th>
                    <th className="py-3 px-3 text-center">สถานภาพ</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter(u => u.role !== 'นักศึกษา' && u.role !== 'Admin')
                    .map((person) => (
                      <tr key={person.id} className="border-b border-slate-100 hover:bg-slate-50 text-[11px] transition-colors">
                        <td className="py-2.5 px-3">
                          {person.photoUrl ? (
                            <img src={person.photoUrl} alt="profile" className="w-9 h-11 object-cover border border-slate-200 rounded shadow-3xs" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-9 h-11 bg-slate-100 rounded border border-slate-200 flex items-center justify-center font-bold text-slate-500 text-xs">
                              {person.firstName.charAt(0)}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{person.id}</td>
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-900">
                            {person.title || ''} {person.firstNameTh || person.firstName} {person.lastNameTh || person.lastName}
                          </p>
                          <p className="text-[9px] text-slate-400 font-sans mt-0.5">
                            {person.firstNameTh ? `${person.firstName} ${person.lastName}` : ''}
                          </p>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-800 border">
                            {person.role}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{person.email}</td>
                        <td className="py-2.5 px-3">
                          {person.signature ? (
                            <img src={person.signature} alt="sig" className="max-h-8 max-w-[100px] object-contain opacity-80" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-[10px] italic text-slate-400">ยังไม่ลงทะเบียน</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            person.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {person.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 0.6: MY REQUESTS (Training personal requests) */}
        {activeButtonTab === 'myDocs' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b pb-2 flex justify-between items-center">
              <div>
                <h3 className="font-sans font-extrabold text-sm text-neutral-900 uppercase">
                  เอกสารคำขอใช้ห้องปฏิบัติการของฉัน (My Laboratory Requests)
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">รวมประวัติการส่งใบร้องขอใช้พื้นที่โรงซ่อมเครื่องบินและแล็บต่างๆ ที่ดำเนินการจองโดยคุณ</p>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] text-slate-500 font-bold border-b border-slate-200 font-mono">
                    <th className="py-3 px-3">รหัสเอกสาร</th>
                    <th className="py-3 px-3">วันที่จอง</th>
                    <th className="py-3 px-3">ช่วงเวลา</th>
                    <th className="py-3 px-3">ห้องที่ร้องขอ</th>
                    <th className="py-3 px-3">วัตถุประสงค์</th>
                    <th className="py-3 px-3 text-center">สถานะอนุมัติ</th>
                    <th className="py-3 px-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {roomRequests
                    .filter(req => req.requesterId === currentUser.id)
                    .map((req) => (
                      <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50 text-[11px]">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{req.id}</td>
                        <td className="py-2.5 px-3 font-mono">{req.date}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{req.timeRange}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{req.room}</td>
                        <td className="py-2.5 px-3 text-slate-600 truncate max-w-[150px]">{req.purpose}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                            req.maintenanceApproved === 'Approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                            req.maintenanceApproved === 'Rejected' ? 'bg-rose-50 text-rose-800 border-rose-250' : 'bg-slate-100 text-slate-600 border-slate-200 animate-pulse'
                          }`}>
                            {req.maintenanceApproved === 'Approved' ? 'อนุมัติเรียบร้อย' :
                             req.maintenanceApproved === 'Rejected' ? 'ถูกปฏิเสธ' : 'รอรับรองความพร้อม'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex justify-center gap-1.5">
                            <button
                              onClick={() => onViewRequestDoc(req)}
                              className="text-[10px] bg-slate-100 border px-2 py-1 rounded hover:bg-slate-200 font-bold transition-all text-slate-700 cursor-pointer"
                            >
                              แสดงเอกสาร
                            </button>
                            {req.maintenanceApproved === 'Pending' && onCancelRoomRequest && (
                              <button
                                onClick={() => {
                                  Swal.fire({
                                    title: 'ยืนยันการยกเลิก?',
                                    text: "คุณต้องการยกเลิกคำขอใช้ห้องนี้ใช่หรือไม่?",
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonText: 'ยืนยันยกเลิก',
                                    cancelButtonText: 'ยกเลิก',
                                    confirmButtonColor: '#e11d48'
                                  }).then((result) => {
                                    if (result.isConfirmed) {
                                      onCancelRoomRequest(req.id);
                                    }
                                  });
                                }}
                                className="text-[10px] bg-rose-50 border border-rose-200 px-2 py-1 rounded hover:bg-rose-100 font-bold transition-all text-rose-700 cursor-pointer"
                              >
                                ยกเลิกคำขอ
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  {roomRequests.filter(req => req.requesterId === currentUser.id).length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                        ไม่พบประวัติการยื่นคำขอจองใช้ห้องของคุณในระบบ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 1: PROFILE MANAGEMENT */}
        {activeButtonTab === 'profile' && (
          <form onSubmit={handleUpdateProfileSubmit} className="space-y-4">
            <h3 className="font-sans font-extrabold text-sm mb-4 border-b pb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <UserIcon size={16} />
                <span>จัดการข้อมูลและลายเซ็นของฉัน (My Profile)</span>
              </span>
              {!isEditingProfile && (
                <span className="text-[11px] bg-amber-50 text-amber-800 font-bold border border-amber-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                  โหมดแสดงข้อมูล (Read-Only)
                </span>
              )}
            </h3>

            {!isEditingProfile && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-3.5 my-3 rounded-r-md shadow-xs animate-fade-in select-none">
                <div className="flex gap-2">
                  <span className="text-amber-600 font-bold text-sm">⚠️ แจ้งเตือน:</span>
                  <div className="text-[11.5px] text-amber-900 leading-normal">
                    <p className="font-extrabold">ข้อมูลถูกล็อกป้องกันไม่ให้กรอกหรือแก้ไขโดยไม่ได้ตั้งใจ (Read-Only Mode)</p>
                    <p className="mt-1 font-semibold text-neutral-700">กรุณากดปุ่ม <strong className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">"แก้ไขข้อมูลประจำตัว"</strong> สีเขียวด้านล่างสุดของฟอร์มก่อน จึงจะสามารถแก้ไขชื่อ นามสกุล อีเมล รูปภาพ หรือลายเซ็นประจำตัวผู้สอนได้</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-stone-50 border border-neutral-300 rounded mb-4">
              <div className="w-20 h-20 rounded border-2 border-neutral-800 overflow-hidden shrink-0">
                <img src={editPhoto} alt="img" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="space-y-1.5 w-full">
                <span className="font-bold text-neutral-700 block text-xs">รูปถ่ายประจำตัวผู้สอน:</span>
                {isEditingProfile ? (
                  <input
                    id="profilePhotoUploadInput"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const r = new FileReader();
                        r.onloadend = () => setEditPhoto(r.result as string);
                        r.readAsDataURL(f);
                      }
                    }}
                    className="block text-xs text-neutral-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-neutral-950 file:text-white hover:file:bg-neutral-850 cursor-pointer"
                  />
                ) : (
                  <p className="text-[10px] text-neutral-500 italic">* กดปุ่มแก้ไขข้อมูลเพื่อเลือกไฟล์รูปภาพใหม่</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1">รหัสประจำตำแหน่ง (Locked)</label>
                <input type="text" disabled value={currentUser.id} className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none bg-neutral-100 font-mono text-neutral-550" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1">ตำแหน่งหน้าที่รับผิดชอบ (Locked)</label>
                <input type="text" disabled value={currentUser.role} className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none bg-neutral-100 text-neutral-550" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-700 mb-1">คำนำหน้าชื่อ / ยศ (Title/Prefix) *</label>
                <input 
                  type="text" 
                  required 
                  disabled={true} 
                  value={editTitle} 
                  onChange={(e) => setEditTitle(e.target.value)} 
                  placeholder="เช่น นาย, ว่าที่ ร.ต."
                  className="w-full border px-3 py-2 rounded focus:outline-none focus:border-neutral-900 bg-neutral-100 text-neutral-500 border-neutral-200 cursor-not-allowed" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-700 mb-1">ชื่อจริงภาษาไทย *</label>
                <input 
                  type="text" 
                  required 
                  disabled={!isEditingProfile} 
                  value={editFirstNameTh} 
                  onChange={(e) => setEditFirstNameTh(e.target.value)} 
                  placeholder="ภาษาไทย"
                  className={`w-full border px-3 py-2 rounded focus:outline-none focus:border-neutral-900 ${!isEditingProfile ? 'bg-neutral-100 text-neutral-500 border-neutral-200 cursor-not-allowed' : 'bg-white border-neutral-300'}`} 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-700 mb-1">นามสกุลภาษาไทย *</label>
                <input 
                  type="text" 
                  required 
                  disabled={!isEditingProfile} 
                  value={editLastNameTh} 
                  onChange={(e) => setEditLastNameTh(e.target.value)} 
                  placeholder="ภาษาไทย"
                  className={`w-full border px-3 py-2 rounded focus:outline-none focus:border-neutral-900 ${!isEditingProfile ? 'bg-neutral-100 text-neutral-500 border-neutral-200 cursor-not-allowed' : 'bg-white border-neutral-300'}`} 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-700 mb-1">อีเมลผู้สอน *</label>
                <input 
                  type="email" 
                  required 
                  disabled={!isEditingProfile} 
                  value={editEmail} 
                  onChange={(e) => setEditEmail(e.target.value)} 
                  className={`w-full border px-3 py-2 rounded focus:outline-none focus:border-neutral-900 font-mono ${!isEditingProfile ? 'bg-neutral-100 text-neutral-500 border-neutral-200 cursor-not-allowed' : 'border-neutral-300'}`} 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-700 mb-1">เปลี่ยนรหัสผ่านใหม่ *</label>
                <div className="relative">
                  <input 
                    type={showEditPassword ? "text" : "password"} 
                    required 
                    disabled={!isEditingProfile} 
                    value={editPassword} 
                    onChange={(e) => setEditPassword(e.target.value)} 
                    className={`w-full border pl-3 pr-10 py-2 rounded focus:outline-none focus:border-neutral-900 font-mono ${!isEditingProfile ? 'bg-neutral-100 text-neutral-500 border-neutral-200 cursor-not-allowed' : 'border-neutral-300'}`} 
                  />
                  {isEditingProfile && (
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      {showEditPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-neutral-700">ลายเซ็นรับรองเอกสารช่าง *</label>
              {!isEditingProfile ? (
                <div className="w-full max-w-sm p-4 bg-stone-100/60 border border-neutral-300 rounded flex items-center justify-center min-h-[96px] select-none">
                  {editSig ? (
                    <img src={editSig} alt="Signature Preview" className="max-h-16 object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-[11px] text-neutral-450 italic">ยังไม่มีลายเซ็นลงทะเบียน</span>
                  )}
                </div>
              ) : (
                <div className="w-full max-w-md">
                  <SignaturePad onSave={(data) => setEditSig(data)} defaultValue={editSig} />
                </div>
              )}
            </div>

            <div className="pt-3 border-t flex justify-end gap-2.5">
              {!isEditingProfile ? (
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(true)}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold cursor-pointer shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <Edit3 size={14} />
                  <span>แก้ไขข้อมูลประจำตัว</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEditProfile}
                    className="px-4 py-2 bg-neutral-200 hover:bg-neutral-350 text-neutral-800 rounded font-bold cursor-pointer transition-colors flex items-center gap-1"
                  >
                    <X size={14} />
                    <span>ยกเลิก (Cancel)</span>
                  </button>
                  <button 
                    id="saveProfileBtn" 
                    type="submit" 
                    className="px-6 py-2 bg-[#0F172A] text-white rounded font-bold hover:bg-neutral-850 cursor-pointer shadow flex items-center gap-1.5 transition-colors"
                  >
                    <span>บันทึกการแก้ไขข้อมูลของฉัน</span>
                  </button>
                </>
              )}
            </div>
          </form>
        )}

        {/* TAB 2: REQUEST ROOM USE OR DIRECT USAGE RECORD */}
        {activeButtonTab === 'request' && (
          <div className="space-y-6">
            {/* Switcher pills */}
            <div className="flex gap-2 p-1 bg-neutral-100 rounded-lg w-full max-w-md no-print">
              <button
                type="button"
                onClick={() => setRoomSubForm('request')}
                className={`flex-1 text-center py-2 rounded-md font-sans font-bold text-[11px] transition-all cursor-pointer ${
                  roomSubForm === 'request'
                    ? 'bg-white text-neutral-950 shadow-xs border border-neutral-200'
                    : 'text-neutral-500 hover:text-neutral-850'
                }`}
              >
                1. ขอใช้พื้นที่ห้องปฏิบัติการ (TLTC-MO-033)
              </button>
              <button
                type="button"
                onClick={() => setRoomSubForm('usage')}
                className={`flex-1 text-center py-2 rounded-md font-sans font-bold text-[11px] transition-all cursor-pointer ${
                  roomSubForm === 'usage'
                    ? 'bg-white text-neutral-950 shadow-xs border border-neutral-200'
                    : 'text-neutral-500 hover:text-neutral-850'
                }`}
              >
                2. บันทึกการใช้งานห้อง (TLTC-MO-034)
              </button>
            </div>

            {roomSubForm === 'request' ? (
              <form onSubmit={handleRoomSubmit} className="space-y-4">
                <h3 className="font-sans font-extrabold text-sm border-b pb-2 text-neutral-950 uppercase">
                  ยื่นใบร้องขอขอใช้โรงซ่อมและห้องปฏิบัติการ (TLTC-MO-033)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-neutral-50 rounded border border-neutral-250 mb-2">
                  <div>
                    <span className="block text-neutral-500 text-[10px]">ชื่อผู้ร้องเข้าใช้</span>
                    <span className="font-bold">{currentUser.firstName} {currentUser.lastName}</span>
                  </div>
                  <div>
                    <span className="block text-neutral-500 text-[10px]">ตำแหน่งทางวิชาการ</span>
                    <span className="font-bold">{currentUser.role}</span>
                  </div>
                  <div>
                    <span className="block text-neutral-500 text-[10px]">รหัสประจำตัว</span>
                    <span className="font-bold font-mono">{currentUser.id}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 mb-1">สังกัด / แผนกวิชาที่เรียนหรือรับผิดชอบ *</label>
                    <input
                      id="reqDeptInput"
                      type="text"
                      required
                      placeholder="เช่น ช่างบำรุงรักษาอากาศยาน ปี 2"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 mb-1">เบอร์ติดต่อกรณีเร่งด่วน *</label>
                    <input
                      id="reqPhoneInput"
                      type="text"
                      required
                      placeholder="เช่น 081-xxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 mb-1">วันที่ต้องการเข้าใช้งาน *</label>
                    <input
                      id="reqDateInput"
                      type="date"
                      required
                      value={requestDate}
                      onChange={(e) => setRequestDate(e.target.value)}
                      className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900 font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 mb-1">เวลาการจอง (ชั่วโมง) *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[8px] font-bold text-neutral-450 mb-0.5">ตั้งแต่เวลา</label>
                        <select
                          id="reqStartTimeSelect"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full border border-neutral-300 px-2 py-2 rounded bg-white text-xs font-semibold"
                        >
                          {TIME_OPTIONS.map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold text-neutral-450 mb-0.5">ถึงเวลา</label>
                        <select
                          id="reqEndTimeSelect"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full border border-neutral-300 px-2 py-2 rounded bg-white text-xs font-semibold"
                        >
                          {TIME_OPTIONS.map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 mb-1">ห้องที่มีความประสงค์จองใช้ *</label>
                    <select
                      id="reqRoomSelect"
                      value={selectedRoom}
                      onChange={(e) => setSelectedRoom(e.target.value)}
                      className={`w-full border px-2 py-2 rounded focus:outline-none bg-white font-medium ${
                        selectedRoom !== 'Other' && checkRoomBusy(selectedRoom) 
                          ? 'border-rose-450 text-rose-600 bg-rose-50' 
                          : 'border-neutral-300'
                      }`}
                    >
                      {[
                        "Practical Area in Hangar",
                        "Meeting Room",
                        "Theoretical Classroom",
                        "Library Room",
                        "Workshop 1",
                        "Workshop 2",
                        "Fiberglass Workshop",
                        "Examination Room",
                        "Aerodynamic Room",
                        "Electrical Room"
                      ].map(room => {
                        const isBusy = checkRoomBusy(room);
                        const isDateTimeFilled = !!(requestDate && startTime && endTime && (startTime < endTime));
                        const statusSuffix = isDateTimeFilled ? (isBusy ? " (ไม่ว่าง)" : " (ว่าง)") : " (ว่าง)";
                        return (
                          <option key={room} value={room} disabled={isBusy}>
                            {room}{statusSuffix}
                          </option>
                        );
                      })}
                      <option value="Other">อื่นๆ (ระบุห้องด้านล่าง)</option>
                    </select>
                    {selectedRoom !== 'Other' && checkRoomBusy(selectedRoom) && (
                      <p className="text-[9px] text-rose-600 font-semibold mt-1">⚠️ ห้องนี้ถูกจองใช้ในช่วงเวลาดังกล่าวแล้ว</p>
                    )}
                  </div>
                </div>

                {selectedRoom === 'Other' && (
                  <div className="mt-4">
                    <label className="block text-[10px] font-bold text-neutral-700 mb-1">กรอกข้อมูลระบุชื่อห้องอื่น *</label>
                    <input
                      id="reqOtherRoomInput"
                      type="text"
                      required
                      placeholder="เช่น ห้องล้างเครื่องยนต์"
                      value={otherRoomText}
                      onChange={(e) => setOtherRoomText(e.target.value)}
                      className={`w-full border px-3 py-2 rounded focus:outline-none focus:border-neutral-900 ${
                        checkRoomBusy(otherRoomText) ? 'border-rose-450 text-rose-600 bg-rose-50' : 'border-neutral-300'
                      }`}
                    />
                    {checkRoomBusy(otherRoomText) && (
                      <p className="text-[9px] text-rose-600 font-semibold mt-1">⚠️ ห้องระบุดังกล่าวไม่ว่างในช่วงเวลาที่เลือก</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-neutral-700 mb-1">บอกจุดประสงค์ในการขอใช้ห้องและสิ่งที่ต้องการพัฒนาฝึกปฏิบัติ *</label>
                  <textarea
                    id="reqPurposeTextarea"
                    required
                    rows={3}
                    placeholder="อธิบายกิจกรรมการปฏิบัติงานของช่างอากาศยาน เช่น ตรวจซ่อมระบบไฟปีกเครื่องบิน หรือ ร้อยลวดน็อคฟล็อคฝาสูบเครื่องบิน"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-neutral-750">ลงนามลายมือผู้กรอกขอใช้ห้อง *</label>
                  <div className="w-full max-w-sm">
                    <SignaturePad 
                      onSave={async (val) => {
                        if (val) {
                          const compressed = await compressImage(val, 240, 70, 0.5);
                          setRequestSignature(compressed);
                        } else {
                          setRequestSignature('');
                        }
                      }} 
                    />
                  </div>
                </div>

                <div className="pt-2 border-t flex justify-end">
                  <button id="sendRoomRequestBtn" type="submit" className="px-6 py-2.5 bg-neutral-950 hover:bg-neutral-850 text-white font-extrabold rounded shadow-sm text-xs cursor-pointer">
                    ส่งเอกสารขอจองห้องคลังบำรุง
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleUsageRecordSubmit} className="space-y-4 max-w-2xl bg-white border border-neutral-300 p-5 rounded-lg shadow-xs">
                <h3 className="font-sans font-extrabold text-xs border-b pb-2 text-neutral-900 uppercase">
                  แบบฟอร์มบันทึกการเข้าใช้งานห้องปฏิบัติการ (TLTC-MO-034 logs)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 mb-1">เลือกรายการขอใช้ห้องที่อนุมัติแล้ว *</label>
                    <select
                      value={selectedRequestId}
                      onChange={(e) => handleRequestSelection(e.target.value)}
                      className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900 text-xs"
                    >
                      <option value="">เลือกรายการ (หรืออื่นๆ)</option>
                      {roomRequests.filter(req => req.requesterId === currentUser.id && req.maintenanceApproved === 'Approved' && !req.isRoomUsageRecordCreated).map(req => (
                        <option key={req.id} value={req.id}>{req.room} ({req.date.split('T')[0]})</option>
                      ))}
                      <option value="other">อื่นๆ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 mb-1">พิมพ์ระบุชื่อห้อง / พื้นที่ห้องปฏิบัติการที่เข้าใช้ *</label>
                    <input
                      id="usageRoomNameInput"
                      type="text"
                      required
                      placeholder="พิมพ์ชื่อห้อง เช่น Workshop 1 หรือ theoretical Classroom"
                      value={usageRoomName}
                      onChange={(e) => { setUsageRoomName(e.target.value); setSelectedRequestId('other'); }}
                      className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 mb-1">วันที่เข้าปฏิบัติงานจริง *</label>
                    <input
                      id="usageDateInput"
                      type="date"
                      required
                      value={usageDate}
                      onChange={(e) => { setUsageDate(e.target.value); setSelectedRequestId('other'); }}
                      className="w-full border border-neutral-300 px-3 py-1.5 rounded focus:outline-none font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-700 mb-1">รายงานสิ่งที่ต้องการพัฒนา (ข้อสังเกต/อุปกรณ์ชำรุด/ความคิดเห็น) *</label>
                  <textarea
                    id="usageReportTextarea"
                    required
                    rows={3}
                    placeholder="ระบุ เช่น เพิ่มสายดินหรืออุปกรณ์ความสว่าง, แอร์เสีย 1 เครื่อง หรือความพร้อมสมบูรณ์ดี..."
                    value={usageReportText}
                    onChange={(e) => setUsageReportText(e.target.value)}
                    className="w-full border border-neutral-300 px-3 py-2 rounded text-xs focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-neutral-750">ผู้เข้าปฏิบัติงานลงลายเซ็นรับรอง *</label>
                  <div className="w-full max-w-sm">
                    <SignaturePad onSave={(data) => setUsageSignature(data)} placeholder="วาดลายลายเซ็นอิเล็กทรอนิกส์..." />
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t">
                  <button id="saveDirectRoomUsageBtn" type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 rounded cursor-pointer text-xs transition-all shadow-3xs uppercase tracking-wide">
                    บันทึกข้อมูลการใช้ห้องและเซ็นชื่อ
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 3: CHECK STUDENT SCHEDULE */}
        {activeButtonTab === 'schedules' && (
          <div className="space-y-6">
            <h3 className="font-sans font-extrabold text-sm mb-2 border-b pb-2">
              ตรวจสอบตารางเรียนและการเข้าเรียนรายบุคคล
            </h3>

            <div className="flex gap-2 max-w-md">
              <input
                id="searchStudentIdInput"
                type="text"
                placeholder="ระบุรหัสนักศึกษา (เช่น 67010214)"
                value={searchStudentId}
                onChange={(e) => setSearchStudentId(e.target.value)}
                className="flex-1 border border-neutral-350 rounded px-3 py-2 font-mono text-xs focus:outline-none"
              />
              <button
                id="searchStudentBtn"
                onClick={handleSearchStudentSchedule}
                className="px-4 py-2 bg-black text-white hover:bg-neutral-850 font-bold rounded cursor-pointer"
              >
                ค้นหาตารางเรียน
              </button>
            </div>

            {foundStudent && (
              <div className="bg-stone-50 border border-neutral-300 p-4 rounded space-y-4 animate-fade-in">
                <div className="flex items-center gap-4">
                  <img src={foundStudent.photoUrl} alt="student" className="w-12 h-16 object-cover border border-neutral-300 rounded" referrerPolicy="no-referrer" />
                  <div>
                    <h4 className="font-bold text-neutral-900 text-sm">{foundStudent.firstName} {foundStudent.lastName}</h4>
                    <p className="font-mono text-neutral-500 font-bold uppercase">ID: {foundStudent.id} | รุ่น {foundStudent.batch}</p>
                    <p className="font-sans text-[10px] text-neutral-600">สถานภาพนักศึกษา: <b>{foundStudent.status}</b></p>
                  </div>
                </div>

                <div className="border-t border-neutral-300 pt-3">
                  <h5 className="font-bold text-xs mb-2">ตารางเรียนประจำปีของชั้นเรียนนักศึกษา</h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left bg-white border border-neutral-200">
                      <thead>
                        <tr className="bg-neutral-100 text-[10px] text-neutral-650 font-bold uppercase border-b border-neutral-200">
                          <th className="py-2 px-3">วัน</th>
                          <th className="py-2 px-3">รหัสวิชา</th>
                          <th className="py-2 px-3">ชื่อหลักสูตรวิชา</th>
                          <th className="py-2 px-3">ช่วงวันที่เรียน</th>
                          <th className="py-2 px-3">ครูผู้สอน</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentSchedules.map((schedule) => (
                          <tr key={schedule.id} className="border-b border-neutral-100 text-[11px]">
                            <td className="py-2 px-3 font-bold text-neutral-950 font-sans">{schedule.dayOfWeek}</td>
                            <td className="py-2 px-3 font-mono text-neutral-600">{schedule.subjectCode}</td>
                            <td className="py-2 px-3 font-semibold text-neutral-800">{schedule.subjectName}</td>
                            <td className="py-2 px-3 font-mono">{schedule.startDate} ถึง {schedule.endDate}</td>
                            <td className="py-2 px-3 font-sans">{schedule.instructorName}</td>
                          </tr>
                        ))}
                        {studentSchedules.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-neutral-450 italic">
                              ไม่มีวิชาเรียนลงทะเบียนสำหรับรุ่นนักศึกษารายนี้
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: EDIT/APPROVE STUDENT STATUS */}
        {activeButtonTab === 'status' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
              <h3 className="font-sans font-extrabold text-sm text-neutral-900">
                สถานภาพนักศึกษา (Student Directory)
              </h3>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-neutral-500 uppercase">กรองตามรุ่น:</label>
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="border border-neutral-300 px-2 py-1 rounded text-[11px] font-mono"
                >
                  <option value="All">ทั้งหมด</option>
                  {useMemo(() => Array.from(new Set(
                    users
                      .filter(u => u.role === 'นักศึกษา' && u.status === 'Active')
                      .map(u => String(u.id || '').substring(0, 2))
                  )).sort().map(batch => (
                    <option key={batch} value={batch}>รุ่น {batch}</option>
                  )), [users])}
                </select>
              </div>
            </div>

            <p className="text-[11px] text-neutral-500">
              * เจ้าหน้าที่ฝ่ายอบรม (Staff) สามารถแนะนำหรือแก้ไขสถานะได้ โดย Training Manager จะเป็นคนกดยืนยันการเปลี่ยนแปลงเพื่อความปลอดภัยสิทธิ์การเข้าใช้งาน
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 text-[10px] text-neutral-500 font-bold border-b border-neutral-200">
                    <th className="py-2 px-2">รูปถ่าย</th>
                    <th className="py-2 px-2">รหัสนักศึกษา</th>
                    <th className="py-2 px-2">ชื่อ - นามสกุล</th>
                    <th className="py-2 px-2">สถานะปัจจุบัน</th>
                    <th className="py-2 px-2">แก้ไขสถานะ (Staff)</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter(u => u.role === 'นักศึกษา')
                    .filter(u => selectedBatch === 'All' || String(u.id || '').substring(0, 2) === selectedBatch)
                    .sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')))
                    .map((student) => (
                      <tr key={student.id} className="border-b border-neutral-150 hover:bg-neutral-50 text-[11px]">
                        <td className="py-2 px-2">
                          <img src={student.photoUrl} alt="t" className="w-8 h-10 object-cover border border-neutral-200 rounded" referrerPolicy="no-referrer" />
                        </td>
                        <td className="py-2 px-2 font-mono font-bold text-neutral-800">{student.id}</td>
                        <td className="py-2 px-2 font-bold">
                          {student.title || ''} {student.firstNameTh || student.firstName} {student.lastNameTh || student.lastName}
                        </td>
                        <td className="py-2 px-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            student.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
                          }`}>
                            {student.status}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <select
                            id={`statusStaffSelect_${student.id}`}
                            value={student.status}
                            onChange={(e) => onUpdateStudentStatusByStaff(student.id, e.target.value as User['status'])}
                            className="border border-neutral-300 px-1 py-0.5 rounded text-[10.5px]"
                          >
                            <option value="Active">Active (ปกติ)</option>
                            <option value="พ้นสภาพ">พ้นสภาพ</option>
                            <option value="พักการเรียน">พักการเรียน</option>
                            <option value="จบการศึกษา">จบการศึกษา</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  {users.filter(u => u.role === 'นักศึกษา' && (selectedBatch === 'All' || String(u.id || '').substring(0, 2) === selectedBatch)).length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-neutral-450 italic">
                        ไม่พบข้อมูลนักศึกษาในสารบบ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: DOCUMENT REQUEST MANAGEMENT */}
        {activeButtonTab === 'docs' && (
          <div className="space-y-6">
            
            {/* TLTC-MO-034 List */}
            <div className="bg-white border border-neutral-300 p-5 rounded-lg shadow-sm font-sans">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div>
                  <h4 className="font-sans font-extrabold text-sm text-neutral-950">สมุดคู่มือช่างอากาศยาน TLTC-MO-034</h4>
                  <p className="text-[11px] text-neutral-500 font-sans">บันทึกรายงานสิ่งที่ต้องการซ่อม พัฒนาระบบ และบันทึกสิ่งชำรุดเสียหาย</p>
                </div>
                {onPrintUsageRecords && (
                  <button
                    id="trainingPrintMo034Btn"
                    type="button"
                    onClick={onPrintUsageRecords}
                    className="flex items-center gap-1.5 bg-black hover:bg-neutral-800 text-white font-sans text-xs font-bold px-3 py-1.5 rounded transition-all cursor-pointer shadow-sm animate-fade-in"
                  >
                    <Printer size={13} />
                    <span>ออกเอกสารเป็น PDF (TLTC-MO-034)</span>
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 text-[10px] text-neutral-600 border-b border-neutral-300 font-bold uppercase font-sans">
                      <th className="py-2.5 px-2 w-1/12 text-center font-bold">ลำดับ</th>
                      <th className="py-2.5 px-2 w-2/12 font-bold font-sans">วัน/เดือน/ปี</th>
                      <th className="py-2.5 px-2 w-2/12 font-bold font-sans">ห้องที่ใช้งาน</th>
                      <th className="py-2.5 px-2 w-2/12 font-bold font-sans">ผู้ร้องขอเข้าใช้งาน</th>
                      <th className="py-2.5 px-2 w-3/12 font-bold font-sans">สิ่งที่ต้องการให้ซ่อม/พัฒนา</th>
                      <th className="py-2.5 px-2 w-2/12 text-center font-bold font-sans">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomUsageRecords.map((rec, index) => (
                      <tr key={rec.id} className="border-b border-neutral-100 hover:bg-neutral-50 text-[11px] font-sans">
                        <td className="py-2.5 px-2 text-center font-mono text-neutral-500">{index + 1}</td>
                        <td className="py-2.5 px-2 font-mono text-neutral-600">{rec.date}</td>
                        <td className="py-2.5 px-2 font-bold text-neutral-950 font-sans">{rec.room}</td>
                        <td className="py-2.5 px-2 font-sans font-bold">{rec.requesterName}</td>
                        <td className="py-2.5 px-2 font-sans">{rec.report}</td>
                        <td className="py-2.5 px-2 text-center font-sans">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold border ${
                            rec.maintenanceOfficerStatus === 'Acknowledged'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-rose-50 text-rose-800 border-rose-250 animate-pulse'
                          }`}>
                            {rec.maintenanceOfficerStatus === 'Acknowledged' ? 'รับทราบแล้ว' : 'รอตรวจสอบ'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {roomUsageRecords.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-neutral-450 italic font-sans">
                          ไม่มีประวัติบันทึกการใช้ห้องในขณะนี้
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DOCUMENT CHECKLIST TLTC-MO-033 */}
            <div className="bg-white border border-neutral-300 p-5 rounded-lg shadow-sm font-sans">
              <h3 className="font-sans font-extrabold text-sm mb-3 border-b pb-2 text-neutral-950">
                เอกสารคำขออนุมัติใช้ห้องปฏิบัติการการบิน (TLTC-MO-033)
              </h3>

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

                {onViewBulkRequestDocs && roomRequests.filter(req => isManager ? true : req.requesterId === currentUser.id).filter(req => {
                  if (!docStartDate && !docEndDate) return true;
                  if (docStartDate && req.date < docStartDate) return false;
                  if (docEndDate && req.date > docEndDate) return false;
                  return true;
                }).length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const selectedList = roomRequests
                        .filter(req => isManager ? true : req.requesterId === currentUser.id)
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
                    <span>พิมพ์เอกสารตามที่เลือก ({roomRequests.filter(req => isManager ? true : req.requesterId === currentUser.id).filter(req => {
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
                    <tr className="bg-neutral-50 text-[10px] text-neutral-600 font-bold border-b border-neutral-200 uppercase font-sans">
                      <th className="py-2.5 px-3">วันที่ยื่นเรื่อง</th>
                      <th className="py-2.5 px-3">ผู้ขอสิทธิ์</th>
                      <th className="py-2.5 px-3">โรงงาน / ห้อง</th>
                      <th className="py-2.5 px-3">จุดประสงค์ฝึกช่าง</th>
                      <th className="py-2.5 px-3 text-center">การตรวจสอบ</th>
                      <th className="py-2.5 px-3 text-center">การดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomRequests
                      .filter(req => isManager ? true : req.requesterId === currentUser.id)
                      .filter(req => {
                        if (!docStartDate && !docEndDate) return true;
                        if (docStartDate && req.date < docStartDate) return false;
                        if (docEndDate && req.date > docEndDate) return false;
                        return true;
                      })
                      .map((req) => (
                        <tr key={req.id} className="border-b border-neutral-100 hover:bg-neutral-50 text-[11px] font-sans">
                          <td className="py-2.5 px-3 font-mono">{req.date}</td>
                          <td className="py-2.5 px-3">
                            <p className="font-sans font-bold">{req.requesterName}</p>
                            <p className="text-[10px] text-neutral-500 font-mono italic">{req.requesterId}</p>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-neutral-905">{req.room}</td>
                          <td className="py-2.5 px-3 max-w-xs truncate">{req.purpose}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              req.maintenanceApproved === 'Approved'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                : req.maintenanceApproved === 'Rejected'
                                ? 'bg-rose-50 text-rose-800'
                                : 'bg-neutral-100 text-neutral-600'
                            }`}>
                              {req.maintenanceApproved === 'Approved' ? 'รับรองความพร้อมแล้ว' : req.maintenanceApproved === 'Rejected' ? 'ปฏิเสธห้อง' : 'รอฝ่ายห้องตรวจวัด'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            <div className="flex justify-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => onViewRequestDoc(req)}
                                className="bg-black hover:bg-neutral-800 text-white font-sans text-[10px] font-bold py-1 px-2.5 rounded transition-colors cursor-pointer"
                              >
                                พิมพ์ PDF
                              </button>
                              {onCancelRoomRequest && req.requesterId === currentUser.id && req.maintenanceApproved === 'Pending' && (
                                <button
                                  type="button"
                                  onClick={() => onCancelRoomRequest(req.id)}
                                  className="bg-rose-600 hover:bg-rose-700 text-white font-sans text-[10px] font-bold py-1 px-2.5 rounded transition-colors cursor-pointer"
                                >
                                  ยกเลิก
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    {roomRequests.filter(req => isManager ? true : req.requesterId === currentUser.id).filter(req => {
                      if (!docStartDate && !docEndDate) return true;
                      if (docStartDate && req.date < docStartDate) return false;
                      if (docEndDate && req.date > docEndDate) return false;
                      return true;
                    }).length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-neutral-450 italic font-sans">
                          ไม่มีเอกสารใบคำร้องขอใช้ห้องฝึกช่างตามที่ระบุในประวัติหรือวันที่เลือก
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TLTC-MO-001 Section: Borrow Records */}
            <div className="bg-white border border-neutral-300 p-5 rounded-lg shadow-sm font-sans">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div>
                  <h4 className="font-sans font-extrabold text-sm text-neutral-950 flex items-center gap-1.5 font-sans">
                    <Wrench size={14} className="text-neutral-950" />
                    <span>สมุดทะเบียนการยืม-คืนเครื่องมือช่างอากาศยาน (TLTC-MO-001)</span>
                  </h4>
                  <p className="text-[11px] text-neutral-500 font-sans">ประวัติการยืมคืนเครื่องมือช่างและอุปกรณ์ตรวจสอบย้อนกลับ (Traceability Verification Log)</p>
                </div>
                <button
                  id="trainingPrintMo001Btn"
                  type="button"
                  onClick={() => setShowTraceabilityDoc(true)}
                  className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-750 text-white font-sans text-xs font-bold px-3 py-1.5 rounded transition-all cursor-pointer shadow-sm animate-fade-in"
                >
                  <Printer size={13} />
                  <span>ออกเอกสารเป็น PDF (TLTC-MO-001)</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 text-[10px] text-neutral-600 border-b border-neutral-300 font-bold uppercase font-sans">
                      <th className="py-2.5 px-2 w-[15%] font-bold">วัน/เวลาที่ยืม</th>
                      <th className="py-2.5 px-2 w-[25%] font-bold">ชื่อเครื่องมือ</th>
                      <th className="py-2.5 px-2 w-[15%] font-bold">รหัสเครื่องมือ</th>
                      <th className="py-2.5 px-1 w-[8%] text-center font-bold">จำนวน</th>
                      <th className="py-2.5 px-2 w-[17%] font-bold">ผู้เบิกยืม</th>
                      <th className="py-2.5 px-2 w-[10%] text-center font-bold">สถานะ</th>
                      <th className="py-2.5 px-2 w-[15%] text-blank font-bold text-center">ผู้รับประกันคืน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {borrowRecords.map(rec => (
                      <tr key={rec.id} className="border-b border-neutral-100 hover:bg-neutral-50 text-[11px] font-sans">
                        <td className="py-2 px-2 font-mono">{rec.borrowDate}</td>
                        <td className="py-2 px-2 font-sans font-bold">
                          <p className="text-neutral-950">{rec.toolName}</p>
                        </td>
                        <td className="py-2 px-2 font-mono font-bold text-neutral-500">{rec.equipmentCode}</td>
                        <td className="py-2 px-1 text-center font-mono font-bold">{rec.qty}</td>
                        <td className="py-2 px-2">
                          <p className="font-sans font-semibold text-neutral-800">{rec.borrowerName}</p>
                          <p className="text-[9px] text-neutral-400 font-mono">ID: {rec.borrowerId}</p>
                        </td>
                        <td className="py-2 px-2 text-center font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            rec.status === 'Returned'
                              ? 'bg-emerald-200 text-emerald-800'
                              : 'bg-rose-250 text-rose-800 animate-pulse'
                          }`}>
                            {rec.status === 'Returned' ? 'คืนสะอาด' : 'ยังไม่คืน'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center text-[10px] font-sans font-bold text-neutral-600">
                          {rec.status === 'Returned' ? `✓ ${rec.checkerName || 'ผู้ประสานงาน'}` : '-'}
                        </td>
                      </tr>
                    ))}
                    {borrowRecords.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-neutral-450 italic font-sans">
                          ไม่มีประวัติการยืมคืนบันทึกขณะนี้
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 6: PENDING USER APPROVALS */}
        {activeButtonTab === 'approvals' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b pb-2">
              <h3 className="font-sans font-extrabold text-sm text-neutral-900 flex items-center gap-2">
                <ShieldAlert className="text-neutral-900" size={16} />
                <span>คำขอพิจารณาอนุมัติสิทธิ์ผู้ใช้งานเข้าสู่ระบบ (Pending Approvals)</span>
              </h3>
              <p className="text-[11px] text-neutral-500 mt-1">
                รายชื่อบุคคลหรือผู้ใช้งานที่สมัครเข้าสู่ระบบใหม่และอยู่ระหว่างรอเจ้าหน้าที่ฝ่ายฝึกอบรมอนุมัติสิทธิ์เพื่อเปิดสิทธิ์การใช้งาน
              </p>
            </div>

            {users.filter(u => u.status === 'Pending').length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {users.filter(u => u.status === 'Pending').map(pUser => (
                  <div key={pUser.id} className="bg-neutral-50 border border-neutral-200 p-4 rounded-lg flex items-center justify-between gap-3 shadow-3xs hover:border-neutral-350 transition-all">
                    <div className="flex items-center gap-3">
                      <img src={pUser.photoUrl} alt="avatar" className="w-12 h-14 object-cover border border-neutral-300 rounded shadow-3xs" referrerPolicy="no-referrer" />
                      <div>
                        <p className="font-sans font-bold text-neutral-950 text-xs sm:text-sm">{pUser.title || ''}{pUser.firstNameTh || ''} {pUser.lastNameTh || ''}</p>
                        <p className="text-[10px] font-mono font-bold text-neutral-500 uppercase mt-0.5">
                          ตำแหน่ง: <span className="text-indigo-600 font-sans">{pUser.role}</span> {pUser.role === 'นักศึกษา' ? `| รุ่น ${String(pUser.id || '').substring(0, 2)}` : (pUser.batch ? `| รุ่น ${pUser.batch}` : '')}
                        </p>
                        <p className="text-[10px] text-neutral-550 font-mono mt-0.5">รหัส: {pUser.id}</p>
                        <p className="text-[9px] text-neutral-400 truncate mt-0.5">{pUser.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0 text-right">
                      <div className="flex gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => onRejectUser && onRejectUser(pUser.id)}
                          className="p-1 px-2.5 border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded text-[10px] font-sans font-bold transition-colors cursor-pointer"
                        >
                          ปฏิเสธ
                        </button>
                        <button
                          type="button"
                          onClick={() => onApproveUser && onApproveUser(pUser.id)}
                          className="p-1 px-3 bg-emerald-600 text-white hover:bg-emerald-700 rounded text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          อนุมัติสิทธิ์
                        </button>
                      </div>
                      <span className="text-[8px] text-emerald-600 font-sans font-bold">✓ อนุญาตเชื่อมต่อระบบ</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-neutral-200 rounded-lg bg-neutral-50/50">
                <p className="text-neutral-400 italic text-[11px] font-sans">ไม่มีคำขออนุมัติสิทธิ์ค้างอยู่ในสารบบ ณ ขณะนี้</p>
              </div>
            )}
          </div>
        )}

        </div>
      </div>
    </div>
  );
}
