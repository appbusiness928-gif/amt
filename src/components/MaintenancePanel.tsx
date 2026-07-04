/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, RoomRequest, RoomUsageRecord, Equipment, BorrowRecord } from '../types';
import { CustomQRCode, PrintQRCodeSheet } from './AviationQRCodes';
import SignaturePad from './SignaturePad';
import { TraceabilityToolsLogDoc } from './Documents';
import { 
  Building, Wrench, CheckCircle, Clock, Plus, Tag, 
  Settings, Key, AlertTriangle, ShieldCheck, Printer, Calendar,
  User as UserIcon, Eye, EyeOff, FileText, Edit3, X, Home, ClipboardList
} from 'lucide-react';
import { alerts as Swal } from '../lib/alerts';

interface MaintenancePanelProps {
  currentUser: User;
  roomRequests: RoomRequest[];
  roomUsageRecords: RoomUsageRecord[];
  equipments: Equipment[];
  borrowRecords: BorrowRecord[];
  activeButtonTab?: 'home' | 'profile' | 'certify' | 'equipment' | 'returns' | 'calibration' | 'documents' | 'request' | 'myDocs';
  onActiveButtonTabChange?: (tab: 'home' | 'profile' | 'certify' | 'equipment' | 'returns' | 'calibration' | 'documents' | 'request' | 'myDocs') => void;
  onCertifyRoomRequest: (requestId: string, status: 'Approved' | 'Rejected', note: string, officerName: string, officerSignature?: string) => void;
  onAcknowledgeUsageRecord: (recordId: string) => void;
  onAddEquipment: (newTool: Equipment) => void;
  onCheckReturnEquipment: (borrowId: string) => void;
  onUpdateCalibration: (toolCode: string, calDate: string, status: Equipment['status']) => void;
  onUpdateEquipment?: (toolCode: string, fields: Partial<Equipment>) => void;
  onUpdateProfile: (updated: Partial<User>) => void;
  onSubmitRoomRequest?: (req: Omit<RoomRequest, 'id' | 'maintenanceApproved' | 'isRoomUsageRecordCreated'>) => boolean;
  onCancelRoomRequest?: (requestId: string) => void;
  onPrintUsageRecords?: () => void;
  onViewRequestDoc?: (req: RoomRequest) => void;
  onViewBulkRequestDocs?: (reqs: RoomRequest[]) => void;
  welcomeBanner?: React.ReactNode;
}

export default function MaintenancePanel({
  currentUser,
  roomRequests,
  roomUsageRecords,
  equipments,
  borrowRecords,
  activeButtonTab: controlledActiveButtonTab,
  onActiveButtonTabChange,
  onCertifyRoomRequest,
  onAcknowledgeUsageRecord,
  onAddEquipment,
  onCheckReturnEquipment,
  onUpdateCalibration,
  onUpdateEquipment,
  onUpdateProfile,
  onSubmitRoomRequest,
  onCancelRoomRequest,
  onPrintUsageRecords,
  onViewRequestDoc,
  onViewBulkRequestDocs,
  welcomeBanner
}: MaintenancePanelProps) {
  const [localActiveButtonTab, setLocalActiveButtonTab] = useState<'home' | 'profile' | 'certify' | 'equipment' | 'returns' | 'calibration' | 'documents' | 'request' | 'myDocs'>('home');
  const activeButtonTab = controlledActiveButtonTab !== undefined ? controlledActiveButtonTab : localActiveButtonTab;
  const setActiveButtonTab = (tab: 'home' | 'profile' | 'certify' | 'equipment' | 'returns' | 'calibration' | 'documents' | 'request' | 'myDocs') => {
    if (onActiveButtonTabChange) onActiveButtonTabChange(tab);
    setLocalActiveButtonTab(tab);
  };
  const [showQRCodeSheet, setShowQRCodeSheet] = useState(false);
  const [showTraceabilityDoc, setShowTraceabilityDoc] = useState(false);

  // Room booking states
  const [reqDepartment, setReqDepartment] = useState('');
  const [reqPhone, setReqPhone] = useState('');
  const [reqPurpose, setReqPurpose] = useState('');
  const [reqDate, setReqDate] = useState('');
  const [reqStartTime, setReqStartTime] = useState('09:00');
  const [reqEndTime, setReqEndTime] = useState('12:00');
  const [reqRoom, setReqRoom] = useState('Avionics Lab');

  // Date range filters for document printing (TLTC-MO-033)
  const [docStartDate, setDocStartDate] = useState('');
  const [docEndDate, setDocEndDate] = useState('');

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

  // Add equipment state
  const [toolName, setToolName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [toolCode, setToolCode] = useState('');
  const [qty, setQty] = useState(1);
  const [location, setLocation] = useState('');
  const [remark, setRemark] = useState('');
  const [calDateInput, setCalDateInput] = useState('');
  const [docType, setDocType] = useState('TLTC-MO-007');

  // Selected tool code for individual QR code popup preview
  const [previewQRCodeVal, setPreviewQRCodeVal] = useState<string | null>(null);

  // Certify Room note input state
  const [certifyNote, setCertifyNote] = useState('');

  // Selected Room Request for review document and sign off
  const [reviewingRequest, setReviewingRequest] = useState<any | null>(null);
  const [mgrOpinion, setMgrOpinion] = useState('');
  const [mgrSignature, setMgrSignature] = useState('');

  const handleAddEquipmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolName || !toolCode) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: 'กรุณากรอกชื่อเครื่องมือและรหัสคิวอาร์โค้ดอุปกรณ์', confirmButtonColor: '#171717' });
      return;
    }

    // Check code duplication
    const dup = equipments.some(eq => eq.code.toLowerCase() === toolCode.toLowerCase());
    if (dup) {
      Swal.fire({ icon: 'warning', title: 'คิวอาร์โค้ดซ้ำ', text: 'รหัสคิวอาร์โค้ดสัญญลักษณ์นี้เคยระบุไปแล้วในคลังคราด', confirmButtonColor: '#171717' });
      return;
    }

    const nextNo = (equipments.length + 1).toString();
    onAddEquipment({
      no: nextNo,
      toolName,
      partNumber,
      serialNumber,
      code: toolCode,
      qty,
      location,
      status: 'Ready',
      remark,
      calibrationDate: calDateInput || undefined,
      documentType: docType,
    });

    // Reset Inputs
    setToolName('');
    setPartNumber('');
    setSerialNumber('');
    setToolCode('');
    setQty(1);
    setLocation('');
    setRemark('');
    setCalDateInput('');
    setDocType('TLTC-MO-007');
    Swal.fire({ icon: 'success', title: 'เพิ่มเรียบร้อย', text: 'เพิ่มอุปกรณ์ใหม่เข้าบัญชีช่างเรียบร้อยเพื่อพิมพ์คิวอาร์โค้ดสติกเกอร์', confirmButtonColor: '#171717' });
  };

  const handlePromptCertify = (requestId: string, status: 'Approved' | 'Rejected') => {
    if (status === 'Approved' && !currentUser.signature) {
      Swal.fire({
        icon: 'warning',
        title: 'ไม่พบลายเซ็นรับรอง (Signature Required)',
        text: 'กรุณาตั้งค่าและวาดลายเซ็นของคุณในแท็บ "ข้อมูลของฉัน" เพื่อใช้ลงนามกำกับในเอกสารความปลอดภัยของแผนกซ่อมบำรุงก่อนรับรองว่าห้องปฏิบัติการย่อยเป็น "พร้อมใช้งาน"',
        confirmButtonColor: '#171717'
      });
      setActiveButtonTab('profile');
      return;
    }

    Swal.fire({
      title: status === 'Approved' ? 'รับรองความพร้อมใช้งานของห้อง' : 'ปฏิเสธคำขอใช้ห้องปฏิบัติการ',
      input: 'text',
      inputLabel: 'ระบุบันทึกรายละเอียดเพิ่มเติม/คำแนะนำความปลอดภัย (เช่น ตรวจถังดับเพลิงและใส่รองเท้าเซฟตี้เรียบร้อย)',
      inputValue: certifyNote || 'ห้องเรือนช่างเครื่องบินจัดความพร้อมแล้ว',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันข้อตกลง',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#171717',
    }).then((result) => {
      if (result.isConfirmed) {
        onCertifyRoomRequest(
          requestId,
          status,
          result.value || '',
          currentUser.firstNameTh && currentUser.lastNameTh 
            ? `${currentUser.title || ''}${currentUser.firstNameTh} ${currentUser.lastNameTh}`.trim()
            : `${currentUser.title ? currentUser.title + ' ' : ''}${currentUser.firstName} ${currentUser.lastName}`.trim(),
          currentUser.signature
        );
        Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', text: 'เปลี่ยนคำสั่งรับรองความปลอดภัยของห้องแล้ว', confirmButtonColor: '#171717' });
      }
    });
  };

  const handleReviewCertifySubmit = (status: 'Approved' | 'Rejected') => {
    if (!reviewingRequest) return;
    
    // Check signature
    const sigToUse = mgrSignature || currentUser.signature;
    if (!sigToUse && status === 'Approved') {
      Swal.fire({
        icon: 'warning',
        title: 'จำเป็นต้องลงลายมือเขียน',
        text: 'กรุณาวาดลายเซ็นหรือยอมรับลายเซ็นของท่านเพื่อประกอบการรับรองความพร้อมใช้งานของอู่และโรงช่าง',
        confirmButtonColor: '#171717'
      });
      return;
    }

    onCertifyRoomRequest(
      reviewingRequest.id,
      status,
      mgrOpinion || 'ผ่านการตรวจตราและประเมินความปลอดภัยแล้ว',
      currentUser.firstNameTh && currentUser.lastNameTh 
        ? `${currentUser.title || ''}${currentUser.firstNameTh} ${currentUser.lastNameTh}`.trim()
        : `${currentUser.title ? currentUser.title + ' ' : ''}${currentUser.firstName} ${currentUser.lastName}`.trim(),
      sigToUse
    );

    Swal.fire({
      icon: 'success',
      title: status === 'Approved' ? 'รับรองความพร้อมสำเร็จ' : 'ปฏิเสธห้องเรียนแล้ว',
      text: status === 'Approved' 
        ? 'ห้องปฏิบัติการย่อยพร้อมเปิดรับการเรียนการสอนและฝึกปฏิบัติการรอยร้าวอากาศยาน' 
        : 'ได้ทำการปฏิเสธคำขอเข้าใช้ระบุในสารบบแล้ว',
      confirmButtonColor: '#10b981',
      timer: 2000
    });

    setReviewingRequest(null);
    setMgrOpinion('');
    setMgrSignature('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-slate-850 font-sans text-xs animate-fade-in">
      
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
        <button
          onClick={() => setActiveButtonTab('certify')}
          className={`px-4 py-2 rounded-lg font-sans font-bold text-center text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeButtonTab === 'certify' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          ความพร้อมของห้อง
        </button>
        <button
          onClick={() => setActiveButtonTab('equipment')}
          className={`px-4 py-2 rounded-lg font-sans font-bold text-center text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeButtonTab === 'equipment' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          ข้อมูลอุปกรณ์
        </button>
        <button
          onClick={() => setActiveButtonTab('returns')}
          className={`px-4 py-2 rounded-lg font-sans font-bold text-center text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeButtonTab === 'returns' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          ตรวจรับอุปกรณ์คืน
        </button>
        <button
          onClick={() => setActiveButtonTab('calibration')}
          className={`px-4 py-2 rounded-lg font-sans font-bold text-center text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeButtonTab === 'calibration' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Calibrate อุปกรณ์
        </button>
        <button
          onClick={() => setActiveButtonTab('documents')}
          className={`px-4 py-2 rounded-lg font-sans font-bold text-center text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeButtonTab === 'documents' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          เอกสารคำขอทั้งหมด
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

      {/* Sidebar Control panels */}
      <div className="hidden lg:flex lg:col-span-1 bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex-col gap-1.5 no-print">
        <h4 className="font-sans font-extrabold text-[10px] uppercase text-slate-400 mb-2 tracking-widest border-b border-slate-100 pb-1.5 font-bold">
          แผนกซ่อมบำรุงและอู่เครื่องบิน
        </h4>

        <button
          id="maintHomeTabBtn"
          onClick={() => setActiveButtonTab('home')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeButtonTab === 'home' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <Home size={14} />
          <span>หน้าแรก</span>
        </button>

        <button
          id="maintRequestTabBtn"
          onClick={() => setActiveButtonTab('request')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeButtonTab === 'request' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <Calendar size={14} />
          <span>ขอใช้ห้อง/บันทึกการใช้ห้อง</span>
        </button>

        <button
          id="maintMyDocsTabBtn"
          onClick={() => setActiveButtonTab('myDocs')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeButtonTab === 'myDocs' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <ClipboardList size={14} />
          <span>เอกสารคำขอของฉัน</span>
        </button>

        <button
          id="maintCertifyTabBtn"
          onClick={() => setActiveButtonTab('certify')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 border-t border-slate-100 pt-1.5 ${
            activeButtonTab === 'certify' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <Building size={14} />
          <span>ความพร้อมของห้อง</span>
        </button>

        <button
          id="maintEquipmentTabBtn"
          onClick={() => setActiveButtonTab('equipment')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeButtonTab === 'equipment' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <Wrench size={14} />
          <span>ข้อมูลอุปกรณ์</span>
        </button>

        <button
          id="maintReturnsTabBtn"
          onClick={() => setActiveButtonTab('returns')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeButtonTab === 'returns' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <CheckCircle size={14} />
          <span>ตรวจรับอุปกรณ์คืน</span>
        </button>

        <button
          id="maintCalibrationTabBtn"
          onClick={() => setActiveButtonTab('calibration')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeButtonTab === 'calibration' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <Calendar size={14} />
          <span>Calibrate อุปกรณ์</span>
        </button>

        <button
          id="maintDocsTabBtn"
          onClick={() => setActiveButtonTab('documents')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeButtonTab === 'documents' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <FileText size={14} />
          <span>เอกสารคำขอทั้งหมด</span>
        </button>

        <button
          id="maintProfileTabBtn"
          onClick={() => setActiveButtonTab('profile')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 border-t border-slate-100 mt-2 pt-2 ${
            activeButtonTab === 'profile' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <UserIcon size={14} />
          <span>จัดการข้อมูลส่วนตัว</span>
        </button>
      </div>

      {/* Main Tab Panel Display */}
      <div className="lg:col-span-3 space-y-6">
        {welcomeBanner}
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        
        {/* TAB -1: HOME / DASHBOARD */}
        {activeButtonTab === 'home' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b pb-2 flex justify-between items-center">
              <div>
                <h3 className="font-sans font-extrabold text-sm text-neutral-900 uppercase">
                  หน้าแรก: สารบบตรวจสอบอู่และเครื่องมือช่าง (Maintenance Dashboard)
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">ภาพรวมข้อมูลการยืม-คืนอุปกรณ์ และรายการเครื่องมือที่กำลังส่งสอบเทียบหรือชำรุด</p>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                <span className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider">Currently Borrowed</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-extrabold text-[#0F172A] font-mono">
                    {borrowRecords.filter(b => b.status === 'Borrowed' || b.status === 'PendingReturn').length}
                  </span>
                  <span className="text-slate-500 font-sans text-[10px]">รายการเครื่องมือช่างที่เบิกอยู่</span>
                </div>
              </div>

              <div className="bg-amber-50 border-amber-200 p-4 rounded-xl border flex flex-col justify-between">
                <span className="text-[9px] text-amber-700 font-mono font-bold uppercase tracking-wider">Maintenance / Calibrating</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-extrabold text-amber-900 font-mono animate-pulse">
                    {equipments.filter(e => e.status === 'Calibrating' || e.status === 'Damaged' || e.status === 'NotReady').length}
                  </span>
                  <span className="text-amber-700 font-sans text-[10px] font-bold">เครื่องมือที่กำลังสอบเทียบ/ชำรุด</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between col-span-2 md:col-span-1">
                <span className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider">Total Inventory Types</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-extrabold text-[#0F172A] font-mono">
                    {equipments.length}
                  </span>
                  <span className="text-slate-500 font-sans text-[10px]">ชนิดเครื่องมือช่างในระบบ</span>
                </div>
              </div>
            </div>

            {/* Borrowed Equipment Row */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
              <h4 className="font-bold text-slate-900 text-xs uppercase font-mono tracking-wide mb-3 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-indigo-500 inline-block"></span>
                <span>รายการเครื่องมือช่างที่ถูกเบิกใช้งานอยู่ในปัจจุบัน (Borrowed Tools Log)</span>
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] text-slate-500 font-bold border-b border-slate-250 font-mono">
                      <th className="py-2.5 px-3">รหัสเครื่องมือ</th>
                      <th className="py-2.5 px-3">ชื่อเครื่องมือ</th>
                      <th className="py-2.5 px-3">ผู้เบิกอุปกรณ์</th>
                      <th className="py-2.5 px-3">วันที่ยืม</th>
                      <th className="py-2.5 px-3 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {borrowRecords
                      .filter(b => b.status === 'Borrowed' || b.status === 'PendingReturn')
                      .map((rec) => (
                        <tr key={rec.id} className="border-b border-slate-100 hover:bg-slate-50 text-[11px] transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{rec.equipmentCode}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{rec.toolName}</td>
                          <td className="py-2.5 px-3 font-sans">
                            <p className="font-bold">{rec.borrowerName}</p>
                            <p className="text-[9px] text-slate-400 font-mono">{rec.borrowerId}</p>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{rec.borrowDate}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              rec.status === 'PendingReturn' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-sky-100 text-sky-800 border border-sky-200'
                            }`}>
                              {rec.status === 'PendingReturn' ? 'รอตรวจรับคืน' : 'กำลังยืมใช้งาน'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    {borrowRecords.filter(b => b.status === 'Borrowed' || b.status === 'PendingReturn').length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 italic font-sans">
                          ไม่มีการเบิกเครื่องมือใช้งานอยู่ในขณะนี้
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calibration Alert Section */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
              <h4 className="font-bold text-slate-900 text-xs uppercase font-mono tracking-wide mb-3 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block"></span>
                <span>รายการเครื่องมือที่กำลังส่งสอบเทียบหรือต้องการตรวจสอบ (Tools Under Inspection)</span>
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] text-slate-500 font-bold border-b border-slate-250 font-mono">
                      <th className="py-2.5 px-3">รหัสอุปกรณ์</th>
                      <th className="py-2.5 px-3">ชื่อรายการเครื่องมือ</th>
                      <th className="py-2.5 px-3">ตำแหน่งจัดเก็บ</th>
                      <th className="py-2.5 px-3">การสอบเทียบล่าสุด</th>
                      <th className="py-2.5 px-3 text-center">สถานภาพ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipments
                      .filter(e => e.status === 'Calibrating' || e.status === 'Damaged' || e.status === 'NotReady')
                      .slice(0, 8)
                      .map((eq) => (
                        <tr key={eq.code} className="border-b border-slate-100 hover:bg-slate-50 text-[11px] transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{eq.code}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{eq.toolName}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{eq.location}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{eq.calibrationDate || '-'}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              eq.status === 'Calibrating' ? 'bg-amber-100 text-amber-800' :
                              eq.status === 'Damaged' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'
                            }`}>
                              {eq.status === 'Calibrating' ? 'กำลังส่งสอบเทียบ' :
                               eq.status === 'Damaged' ? 'ชำรุด' : 'ไม่พร้อมใช้งาน'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    {equipments.filter(e => e.status === 'Calibrating' || e.status === 'Damaged' || e.status === 'NotReady').length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                          ไม่มีเครื่องมือชำรุดหรือเครื่องมือที่อยู่ระหว่างสอบเทียบในระบบ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB -0.7: ROOM REQUEST BOOKING FORM */}
        {activeButtonTab === 'request' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b pb-2">
              <h3 className="font-sans font-extrabold text-sm text-neutral-900 uppercase">
                แบบคำร้องขอเข้าใช้พื้นที่ห้องปฏิบัติการอู่ซ่อมเครื่องบิน (Laboratory Booking Form)
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">กรอกแบบฟอร์มเพื่อเสนอเรื่องยื่นความประสงค์จองสิทธิ์เข้าปฏิบัติการในโรงซ่อมอากาศยาน</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!onSubmitRoomRequest) return;
                if (!reqDepartment.trim() || !reqPhone.trim() || !reqPurpose.trim() || !reqDate) {
                  Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูลให้ครบถ้วน', text: 'กรุณากรอกแผนก เบอร์โทรศัพท์ และเหตุผลความจำเป็นในการเข้าใช้', confirmButtonColor: '#0F172A' });
                  return;
                }
                const success = onSubmitRoomRequest({
                  requesterId: currentUser.id,
                  requesterName: currentUser.firstNameTh && currentUser.lastNameTh 
                    ? `${currentUser.title || ''}${currentUser.firstNameTh} ${currentUser.lastNameTh}`.trim()
                    : `${currentUser.title ? currentUser.title + ' ' : ''}${currentUser.firstName} ${currentUser.lastName}`.trim(),
                  requesterRole: currentUser.role,
                  department: reqDepartment.trim(),
                  phone: reqPhone.trim(),
                  room: reqRoom,
                  date: reqDate,
                  timeRange: `${reqStartTime} - ${reqEndTime}`,
                  purpose: reqPurpose.trim(),
                  signature: currentUser.signature || ''
                });

                if (success) {
                  Swal.fire({ icon: 'success', title: 'ส่งคำขอสำเร็จ', text: 'ส่งฟอร์ม TLTC-MO-033 ให้ระบบแผนกซ่อมบำรุงตรวจรับรองความพร้อมเรียบร้อยแล้ว', confirmButtonColor: '#0F172A' });
                  setReqDepartment('');
                  setReqPhone('');
                  setReqPurpose('');
                  setReqDate('');
                }
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">ห้องปฏิบัติการย่อยที่ประสงค์จอง</label>
                  <select
                    value={reqRoom}
                    onChange={(e) => setReqRoom(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 bg-white text-xs font-bold text-slate-800"
                  >
                    <option value="Avionics Lab">Avionics Lab</option>
                    <option value="Sheet Metal & Composite Lab">Sheet Metal & Composite Lab</option>
                    <option value="Engine Workshop">Engine Workshop</option>
                    <option value="Non-Destructive Testing (NDT) Lab">Non-Destructive Testing (NDT) Lab</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">วันที่ต้องการเข้าปฏิบัติงาน</label>
                  <input
                    type="date"
                    value={reqDate}
                    onChange={(e) => setReqDate(e.target.value)}
                    className="w-full border border-slate-300 rounded p-1.5 text-xs font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">เวลาเริ่มต้น</label>
                  <input
                    type="time"
                    value={reqStartTime}
                    onChange={(e) => setReqStartTime(e.target.value)}
                    className="w-full border border-slate-300 rounded p-1.5 text-xs font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">เวลาสิ้นสุด</label>
                  <input
                    type="time"
                    value={reqEndTime}
                    onChange={(e) => setReqEndTime(e.target.value)}
                    className="w-full border border-slate-300 rounded p-1.5 text-xs font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">สังกัดแผนก / ฝ่าย</label>
                  <input
                    type="text"
                    value={reqDepartment}
                    onChange={(e) => setReqDepartment(e.target.value)}
                    placeholder="เช่น แผนกซ่อมอากาศยาน"
                    className="w-full border border-slate-300 rounded p-1.5 text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">เบอร์โทรศัพท์ติดต่อกลับ</label>
                  <input
                    type="text"
                    value={reqPhone}
                    onChange={(e) => setReqPhone(e.target.value)}
                    placeholder="เช่น 081-xxxxxxx"
                    className="w-full border border-slate-300 rounded p-1.5 text-xs bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">วัตถุประสงค์ในการเข้าใช้และเครื่องมือที่ต้องการเบิกใช้ร่วม</label>
                <textarea
                  rows={3}
                  value={reqPurpose}
                  onChange={(e) => setReqPurpose(e.target.value)}
                  placeholder="กรุณาระบุวัตถุประสงค์ความสำคัญของการเข้าใช้ห้องปฏิบัติการช่างอย่างละเอียด"
                  className="w-full border border-slate-300 rounded p-2 text-xs bg-white leading-relaxed"
                />
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="bg-[#0F172A] hover:bg-neutral-850 text-white font-sans text-xs font-bold px-5 py-2 rounded shadow transition-all cursor-pointer"
                >
                  ส่งความประสงค์เข้าใช้ห้องปฏิบัติการ (TLTC-MO-033)
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB -0.8: MY REQUESTS LIST */}
        {activeButtonTab === 'myDocs' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b pb-2">
              <h3 className="font-sans font-extrabold text-sm text-neutral-900 uppercase">
                เอกสารคำร้องจองสิทธิ์ห้องปฏิบัติการของฉัน (My Room Requests)
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">ตรวจสอบสถานะการอนุมัติและรับรองความปลอดภัยของใบคลังคำร้องของคุณ</p>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] text-slate-500 font-bold border-b border-slate-200 font-mono">
                    <th className="py-3 px-3">รหัสจอง</th>
                    <th className="py-3 px-3">วันที่จอง</th>
                    <th className="py-3 px-3">ช่วงเวลา</th>
                    <th className="py-3 px-3">ห้องที่ร้องขอ</th>
                    <th className="py-3 px-3">วัตถุประสงค์</th>
                    <th className="py-3 px-3 text-center">สถานะรับรอง</th>
                    <th className="py-3 px-3 text-center">ตัวเลือก</th>
                  </tr>
                </thead>
                <tbody>
                  {roomRequests
                    .filter(req => req.requesterId === currentUser.id)
                    .map((req) => (
                      <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50 text-[11px] transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{req.id}</td>
                        <td className="py-2.5 px-3 font-mono">{req.date}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{req.timeRange}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{req.room}</td>
                        <td className="py-2.5 px-3 text-slate-600 truncate max-w-[150px]">{req.purpose}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                            req.maintenanceApproved === 'Approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                            req.maintenanceApproved === 'Rejected' ? 'bg-rose-50 text-rose-800 border-rose-250' : 'bg-slate-100 text-slate-600 border-slate-200 animate-pulse'
                          }`}>
                            {req.maintenanceApproved === 'Approved' ? 'ผ่านการรับรอง' :
                             req.maintenanceApproved === 'Rejected' ? 'ปฏิเสธ' : 'รอแผนกตรวจสอบ'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex justify-center gap-1.5">
                            {onViewRequestDoc && (
                              <button
                                onClick={() => onViewRequestDoc(req)}
                                className="text-[10px] bg-slate-100 border px-2 py-1 rounded hover:bg-slate-200 font-bold text-slate-700 cursor-pointer"
                              >
                                พิมพ์เอกสาร
                              </button>
                            )}
                            {req.maintenanceApproved === 'Pending' && onCancelRoomRequest && (
                              <button
                                onClick={() => {
                                  Swal.fire({
                                    title: 'ยืนยันการยกเลิก?',
                                    text: "คุณต้องการยกเลิกคำร้องขอนี้ใช่หรือไม่?",
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
                                className="text-[10px] bg-rose-50 border border-rose-200 px-2 py-1 rounded hover:bg-rose-100 font-bold text-rose-700 cursor-pointer"
                              >
                                ยกเลิก
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  {roomRequests.filter(req => req.requesterId === currentUser.id).length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                        ไม่พบประวัติการยื่นคำร้องของคุณ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 0: PROFILE MANAGEMENT */}
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

            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-stone-50 border border-neutral-300 rounded mb-4">
              <div className="w-20 h-20 rounded border-2 border-neutral-800 overflow-hidden shrink-0">
                <img src={editPhoto} alt="img" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="space-y-1.5 w-full">
                <span className="font-bold text-neutral-700 block text-xs">รูปถ่ายประจำตำแหน่ง:</span>
                {isEditingProfile ? (
                  <input
                    id="maintPhotoUploadInput"
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
                <label className="block text-[10px] font-bold text-neutral-700 mb-1">อีเมลสื่อสาร *</label>
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
                    id="saveMaintProfileBtn" 
                    type="submit" 
                    className="px-6 py-2 bg-[#0F172A] text-white rounded font-bold hover:bg-neutral-800 cursor-pointer shadow flex items-center gap-1.5 transition-colors"
                  >
                    <span>บันทึกการแก้ไขข้อมูลของฉัน</span>
                  </button>
                </>
              )}
            </div>
          </form>
        )}

        {/* TAB 1: CERTIFY ROOMS REQUEST & USAGE ACKNOWLEDGE */}
        {activeButtonTab === 'certify' && (
          <div className="space-y-6">
            
            {/* Certify pending room requests */}
            <div>
              <h3 className="font-sans font-extrabold text-sm mb-1 text-neutral-950 uppercase">
                รับการขอใช้ห้องเพื่อรับรองความพร้อมใช้งานของอู่และโรงช่าง
              </h3>
              <p className="text-[11px] text-neutral-500 mb-4">* ตรวจรับความปลอดภัยระดับช่างอากาศยานก่อนลงนามอนุมัติให้ครูผู้รับผิดชอบหรือนักศึกษาเข้าพื้นที่</p>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-[10px] text-neutral-555 font-bold border-b border-neutral-200">
                      <th className="py-2.5 px-2">วันที่จองใช้</th>
                      <th className="py-2.5 px-2">ผู้ส่งเรื่องขอสิทธิ์</th>
                      <th className="py-2.5 px-2">ห้องช่างที่ประสงค์จอง</th>
                      <th className="py-2.5 px-2">ความสำคัญของงาน</th>
                      <th className="py-2.5 px-2 text-center">ตัดสินใจ (Action)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomRequests.map((req) => (
                      <tr key={req.id} className="border-b border-neutral-100 hover:bg-neutral-50 text-[11px]">
                        <td className="py-2.5 px-2 font-mono">{req.date} ({req.timeRange})</td>
                        <td className="py-2.5 px-2">
                          <p className="font-sans font-bold">{req.requesterName}</p>
                          <p className="text-[10px] text-neutral-500 font-mono italic">{req.requesterRole}</p>
                        </td>
                        <td className="py-2.5 px-2 font-bold text-neutral-900">{req.room}</td>
                        <td className="py-2.5 px-2 truncate max-w-xs">{req.purpose}</td>
                        <td className="py-2.5 px-2">
                          <div className="flex gap-1.5 justify-center">
                            {req.maintenanceApproved === 'Pending' ? (
                              <button
                                id={`reviewAndCertifyBtn_${req.id}`}
                                onClick={() => {
                                  setReviewingRequest(req);
                                  setMgrOpinion('');
                                  setMgrSignature('');
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded text-[10px] shadow transition-all cursor-pointer flex items-center gap-1"
                              >
                                <span>📄 ตรวจเอกสารและรับรอง</span>
                              </button>
                            ) : (
                              <span className={`px-2 py-1 rounded font-bold text-[10px] ${
                                req.maintenanceApproved === 'Approved' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}>
                                {req.maintenanceApproved === 'Approved' ? '✅ พร้อมใช้งานแล้ว' : '❌ ปฏิเสธการเข้าใช้'}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {roomRequests.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-neutral-450 italic">
                          ไม่มีการจองใช้ห้องค้างตรวจสอบในตอนนี้
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Acknowledge Usage (TLTC-MO-034 logs) */}
            <div className="border-t border-neutral-200 pt-6">
              <h3 className="font-sans font-extrabold text-sm mb-1 text-neutral-950 uppercase">
                แสดงประวัติการใช้สมุดรายงาน TLTC-MO-034 เพื่อกดรับทราบสถานภาพ
              </h3>
              <p className="text-[11px] text-neutral-500 mb-4">* ตรวจรับความคิดเห็นของครูผู้นำสอนว่าต้องการปรับปรุงอะไร ทาสี หรือซื้ออะไรเสริม แล้วกดรับคำสั่ง</p>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-[10px] text-neutral-555 font-bold border-b border-neutral-200">
                      <th className="py-2.5 px-2">วันบันทึก</th>
                      <th className="py-2.5 px-2">ห้อง</th>
                      <th className="py-2.5 px-2">ผู้ส่งรายการ</th>
                      <th className="py-2.5 px-2">สิ่งที่ต้องการให้ช่างดำเนินการซ่อม/พัฒนา</th>
                      <th className="py-2.5 px-2 text-center">รับรองความพร้อม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomUsageRecords.map(rec => (
                      <tr key={rec.id} className="border-b border-neutral-100 hover:bg-neutral-50 text-[11px]">
                        <td className="py-2.5 px-2 font-mono">{rec.date}</td>
                        <td className="py-2.5 px-2 font-bold text-neutral-950">{rec.room}</td>
                        <td className="py-2.5 px-2 font-sans font-bold text-neutral-650">{rec.requesterName}</td>
                        <td className="py-2.5 px-2 text-neutral-700">{rec.report}</td>
                        <td className="py-2.5 px-2 text-center">
                          {rec.maintenanceOfficerStatus === 'Acknowledged' ? (
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold px-2 py-1 rounded text-[10px]">
                              รับทราบข้อมูลแล้ว
                            </span>
                          ) : (
                            <button
                              id={`ackUsageBtn_${rec.id}`}
                              onClick={() => {
                                onAcknowledgeUsageRecord(rec.id);
                                Swal.fire({ icon: 'success', title: 'ตกลงรับทราบ', text: 'บันทึกสมุดรายงานแล้ว', confirmButtonColor: '#171717' });
                              }}
                              className="bg-black hover:bg-neutral-850 text-white font-bold px-2 py-1 rounded text-[10px] cursor-pointer"
                            >
                              กดเพื่อเซ็นรับทราบ
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {roomUsageRecords.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-neutral-450 italic">
                          ไม่มีการบันทึกรายงานสมุดบันทึกค้างไว้ในโรงช่าง
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EQUIPMENT INVENTORY & CREATOR */}
        {activeButtonTab === 'equipment' && (
          <div className="space-y-6">
            
            {/* Header action button for QR code print sheets */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-neutral-100 p-4 rounded-lg border border-neutral-300">
              <div>
                <h4 className="font-sans font-extrabold text-xs text-neutral-950 uppercase">หนังสือรายงานคิวอาร์โค้ดอุปกรณ์ทั้งหมด</h4>
                <p className="text-[10.5px] text-neutral-500">พิมพ์แผ่นสติ๊กเกอร์คิวอาร์โค้ดขนาดมาตรฐาน A4 เพื่อนำไปติดประดับที่กล่องแกนเครื่องมือ</p>
              </div>
              <button
                id="openAllQRCodeBookBtn"
                onClick={() => setShowQRCodeSheet(true)}
                className="flex items-center gap-1 bg-neutral-950 hover:bg-neutral-850 text-white font-sans font-extrabold text-xs py-2 px-4 rounded transition-all cursor-pointer shadow-xs whitespace-nowrap"
              >
                <Printer size={13} />
                <span>สร้าง PDF คิวอาร์โค้ดสติกเกอร์ทั้งหมด</span>
              </button>
            </div>

            {/* Inventory table */}
            <div className="border border-neutral-300 rounded p-4">
              <h4 className="font-sans font-bold text-neutral-900 border-b pb-2 mb-3">บัญชีเครื่องมือช่างอากาศยานปัจจุบัน</h4>
              
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-[10px] text-neutral-500 font-bold border-b border-neutral-300 uppercase">
                      <th className="py-2 px-1">Code/QR-Code</th>
                      <th className="py-2 px-2">ชื่ออุปกรณ์ (P/N & S/N)</th>
                      <th className="py-2 px-2">ที่เก็บอุปกรณ์</th>
                      <th className="py-2.5 px-2 text-center">คงเหลือ (EA)</th>
                      <th className="py-2 px-2 text-center">สถานภาพ</th>
                      <th className="py-2 px-2 text-center">ทำป้าย</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipments.map((tool) => (
                      <tr key={tool.code} className="border-b border-neutral-100 hover:bg-neutral-50 text-[11px]">
                        <td className="py-2 px-1 font-mono font-bold text-neutral-950">{tool.code}</td>
                        <td className="py-2 px-2">
                          <p className="font-sans font-bold text-neutral-900">{tool.toolName}</p>
                          <p className="text-[9px] text-neutral-500 font-mono">P/N: {tool.partNumber || '-'} | S/N: {tool.serialNumber || '-'}</p>
                        </td>
                        <td className="py-2 px-2 font-mono text-neutral-550">{tool.location}</td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-neutral-900">{tool.qty}</td>
                        <td className="py-2 px-2 text-center">
                          {tool.qty === 0 || tool.status === 'NotReady' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-sans font-bold border bg-rose-50 text-rose-700 border-rose-300">
                              ไม่พร้อมใช้งาน
                            </span>
                          ) : tool.status === 'Ready' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-sans font-bold border bg-emerald-50 text-emerald-800 border-emerald-300">
                              พร้อมใช้งาน
                            </span>
                          ) : tool.status === 'Calibrating' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-sans font-bold border bg-amber-50 text-amber-800 border-amber-300">
                              กำลังสอบเทียบ
                            </span>
                          ) : tool.status === 'Damaged' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-sans font-bold border bg-rose-50 text-rose-800 border-rose-300">
                              ชำรุด
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-sans font-bold border bg-blue-50 text-blue-800 border-blue-300 font-mono">
                              {tool.status}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              id={`inspectQRCodeBtn_${tool.code}`}
                              onClick={() => setPreviewQRCodeVal(tool.code)}
                              className="bg-neutral-100 border border-neutral-300 hover:bg-neutral-200 px-2 py-1 rounded text-[10px] font-sans font-semibold cursor-pointer"
                            >
                              ดูคิวอาร์โค้ด
                            </button>
                            {onUpdateEquipment && (
                              <button
                                id={`editToolActionBtn_${tool.code}`}
                                onClick={() => {
                                  Swal.fire({
                                    title: 'แก้ไขข้อมูลอุปกรณ์',
                                    html: `
                                      <div class="text-left font-sans text-xs space-y-3">
                                        <div>
                                          <label class="block font-bold mb-1">ชื่อเครื่องมือ:</label>
                                          <input id="swalEditToolName" class="w-full border border-neutral-300 rounded px-2 py-1.5 focus:outline-none" value="${tool.toolName}" />
                                        </div>
                                        <div class="grid grid-cols-2 gap-2">
                                          <div>
                                            <label class="block font-bold mb-1">จำนวนคงคลัง (QTY):</label>
                                            <input type="number" id="swalEditToolQty" class="w-full border border-neutral-300 rounded px-2 py-1.5 font-mono focus:outline-none" min="0" value="${tool.qty}" />
                                          </div>
                                          <div>
                                            <label class="block font-bold mb-1">ห้องจัดเก็บ / ชั้นวาง:</label>
                                            <input id="swalEditToolLoc" class="w-full border border-neutral-300 rounded px-2 py-1.5 focus:outline-none" value="${tool.location}" />
                                          </div>
                                        </div>
                                        <div>
                                          <label class="block font-bold mb-1">สถานะ (ถ้า QTY > 0):</label>
                                          <select id="swalEditToolStatus" class="w-full border border-neutral-300 rounded px-2 py-1.5 focus:outline-none">
                                            <option value="Ready" ${tool.status === 'Ready' ? 'selected' : ''}>พร้อมใช้งาน (Ready)</option>
                                            <option value="Calibrating" ${tool.status === 'Calibrating' ? 'selected' : ''}>กำลังสอบเทียบ (Calibrating)</option>
                                            <option value="Damaged" ${tool.status === 'Damaged' ? 'selected' : ''}>ชำรุด (Damaged)</option>
                                          </select>
                                        </div>
                                      </div>
                                    `,
                                    showCancelButton: true,
                                    confirmButtonText: 'บันทึก',
                                    cancelButtonText: 'ยกเลิก',
                                    confirmButtonColor: '#171717',
                                    preConfirm: () => {
                                      const name = (document.getElementById('swalEditToolName') as HTMLInputElement).value;
                                      const qtyVal = parseInt((document.getElementById('swalEditToolQty') as HTMLInputElement).value) || 0;
                                      const loc = (document.getElementById('swalEditToolLoc') as HTMLInputElement).value;
                                      const stat = (document.getElementById('swalEditToolStatus') as HTMLSelectElement).value as Equipment['status'];
                                      return { name, qtyVal, loc, stat };
                                    }
                                  }).then((result) => {
                                    if (result.isConfirmed && result.value) {
                                      const { name, qtyVal, loc, stat } = result.value;
                                      onUpdateEquipment(tool.code, {
                                        toolName: name,
                                        qty: qtyVal,
                                        location: loc,
                                        status: qtyVal === 0 ? 'NotReady' : stat
                                      });
                                      Swal.fire({
                                        icon: 'success',
                                        title: 'บันทึกข้อมูลเรียบร้อย',
                                        confirmButtonColor: '#10b981'
                                      });
                                    }
                                  });
                                }}
                                className="bg-neutral-900 text-white hover:bg-neutral-800 px-2 py-1 rounded text-[10px] font-sans font-semibold cursor-pointer"
                              >
                                แก้ไข
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add Equipment Form */}
            <form onSubmit={handleAddEquipmentSubmit} className="bg-neutral-50/50 border border-neutral-300 p-5 rounded-lg space-y-4">
              <h4 className="font-sans font-extrabold text-neutral-950 border-b pb-2 flex items-center gap-1.5 text-xs">
                <Plus size={14} />
                <span>ลงทะเบียนเพิ่มเครื่องมือกล่องใหม่เข้าระบบคลังช่าง</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-700 mb-1">ชื่อเครื่องมือ (Tool Name) *</label>
                  <input
                    id="addToolNameInput"
                    type="text"
                    required
                    placeholder="เช่น Safety Wire Hand Pliers"
                    value={toolName}
                    onChange={(e) => setToolName(e.target.value)}
                    className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-700 mb-1">Part Number (P/N)</label>
                  <input
                    id="addToolPnInput"
                    type="text"
                    placeholder="เช่น P/N-ST9901"
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                    className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-700 mb-1">Serial Number (S/N)</label>
                  <input
                    id="addToolSnInput"
                    type="text"
                    placeholder="เช่น S/N-2026-33924"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-700 mb-1">คิวอาร์โค้ดระบุรหัส (Code ID) *</label>
                  <input
                    id="addToolCodeInput"
                    type="text"
                    required
                    placeholder="เช่น AMT-TL-015"
                    value={toolCode}
                    onChange={(e) => setToolCode(e.target.value)}
                    className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-700 mb-1">จำนวนหน่วยยืม (QTY EA) *</label>
                  <input
                    id="addToolQtyInput"
                    type="number"
                    min={0}
                    required
                    value={qty}
                    onChange={(e) => setQty(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-700 mb-1">ห้องจัดเก็บ / ชั้นวางหิ้ง *</label>
                  <input
                    id="addToolLocInput"
                    type="text"
                    required
                    placeholder="เช่น Hangar Crib A"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-700 mb-1">วัน Calibrate (ถ้ามีเครื่องวัด)</label>
                  <input
                    id="addToolCalInput"
                    type="date"
                    value={calDateInput}
                    onChange={(e) => setCalDateInput(e.target.value)}
                    className="w-full border border-neutral-300 px-3 py-1.5 rounded focus:outline-none focus:border-neutral-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-700 mb-1">เอกสารอ้างอิง (Document Type) *</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900 font-mono text-sm"
                  >
                    {['TLTC-MO-007', 'TLTC-MO-008', 'TLTC-MO-009', 'TLTC-MO-010', 'TLTC-MO-011', 'TLTC-MO-012', 'TLTC-MO-013', 'TLTC-MO-014', 'TLTC-MO-015', 'TLTC-MO-016', 'TLTC-MO-018', 'TLTC-MO-019', 'TLTC-MO-020', 'TLTC-MO-027', 'TLTC-MO-028', 'TLTC-MO-030'].map((doc) => (
                      <option key={doc} value={doc}>{doc}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-700 mb-1">หมายเหตุเครื่องมือช่างและวิธีการใช้</label>
                <input
                  id="addToolRemarkInput"
                  type="text"
                  placeholder="เช่น เก็บรักษาในกล่องบุฟองน้ำกันความชื้นกระแทก"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="flex justify-end pt-2 border-t">
                <button
                  id="submitAddToolBtn"
                  type="submit"
                  className="bg-black hover:bg-neutral-850 text-white font-extrabold px-6 py-2 rounded shadow text-xs cursor-pointer"
                >
                  บันทึกข้อมูลและออกรหัสคิวอาร์โค้ด
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: CHECK EQUIPMENT RETURNS FROM STUDENTS */}
        {activeButtonTab === 'returns' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-neutral-200 pb-3">
              <div>
                <h3 className="font-sans font-extrabold text-sm mb-1 text-neutral-950 uppercase flex items-center gap-1.5">
                  <Wrench size={16} className="text-neutral-800" />
                  <span>หน้าต่างอนุมัติเซ็นรับคืนเครื่องมือเครื่องใช้</span>
                </h3>
                <p className="text-[11px] text-neutral-500">* หลังจากนักศึกษานำคีมล็อก ตัวตัด หรือ Torque Wrench มาส่งคืนเจ้าหน้าที่สลักบำรุง ให้ตรวจเช็คความชำรุด แล้วคลิกอนุมัติเซ็นลงสารบบ</p>
              </div>
              <button
                id="printTraceabilityLogBtn"
                onClick={() => setShowTraceabilityDoc(true)}
                className="flex items-center gap-2 bg-rose-650 hover:bg-rose-750 text-white font-sans font-extrabold text-[10.5px] px-3.5 py-2 rounded shadow-xs cursor-pointer select-none transition-transform duration-100 active:scale-95 text-center"
              >
                <Printer size={13} />
                <span>พิมพ์สมุดทะเบียนคุมเครื่องมือ (TLTC-MO-001)</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 text-[10px] text-neutral-550 border-b border-neutral-200 font-bold uppercase">
                    <th className="py-2.5 px-3">วันเวลาเบิกออก</th>
                    <th className="py-2.5 px-3">คิวอาร์โค้ดเครื่องมือ</th>
                    <th className="py-2.5 px-3">ชื่อรายการเครื่องมือ</th>
                    <th className="py-2.5 px-3">วัตถุประสงค์ / JOB Card</th>
                    <th className="py-2.5 px-3">ผู้เบิกใช้ (ID / ชื่อ)</th>
                    <th className="py-2.5 px-3 text-center">หน่วยเบิก (EA)</th>
                    <th className="py-2.5 px-3 text-center">สถานะ</th>
                    <th className="py-2.5 px-3 text-center">ตรวจความคมชัด</th>
                  </tr>
                </thead>
                <tbody>
                  {borrowRecords
                    .filter(rec => rec.status === 'Borrowed' || rec.status === 'PendingReturn')
                    .map((rec) => (
                      <tr key={rec.id} className={`border-b border-neutral-100 hover:bg-neutral-50 text-[11px] ${rec.status === 'PendingReturn' ? 'bg-amber-50/40' : ''}`}>
                        <td className="py-2.5 px-3 font-mono">{rec.borrowDate}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-neutral-905">{rec.equipmentCode}</td>
                        <td className="py-2.5 px-3 font-semibold text-neutral-800">{rec.toolName}</td>
                        <td className="py-2.5 px-3 text-neutral-550 font-medium">{rec.purpose || '-'}</td>
                        <td className="py-2.5 px-3">
                          <p className="font-bold">{rec.borrowerName}</p>
                          <p className="text-[10px] text-neutral-450 font-mono">{rec.borrowerId} ({rec.borrowerRole})</p>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">{rec.qty}</td>
                        <td className="py-2.5 px-3 text-center">
                          {rec.status === 'PendingReturn' ? (
                            <span className="bg-amber-50 text-amber-800 border border-amber-300 font-sans font-extrabold text-[9px] px-2 py-1 rounded inline-flex items-center gap-1 animate-pulse">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                              ส่งคืนแล้ว (รอตรวจ)
                            </span>
                          ) : (
                            <span className="bg-neutral-100 text-neutral-600 border border-neutral-300 font-sans font-bold text-[9px] px-2 py-0.5 rounded">
                              กำลังยืมใช้
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            id={`verifyReturnActionBtn_${rec.id}`}
                            onClick={() => {
                              onCheckReturnEquipment(rec.id);
                              Swal.fire({ icon: 'success', title: 'คืนอุปกรณ์เสร็จสมบูรณ์', text: 'เครื่องมือช่างสแกนคืนคลังเรียบร้อย และปรับสถานภาพเป็น Ready', confirmButtonColor: '#171717' });
                            }}
                            className={`font-sans font-bold text-[10px] py-1 px-3 rounded transition-colors cursor-pointer ${
                              rec.status === 'PendingReturn'
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                : 'bg-neutral-950 hover:bg-neutral-800 text-white'
                            }`}
                          >
                            {rec.status === 'PendingReturn' ? 'อนุมัติรับคืนคลัง' : 'รับรองคืนสลักแล้ว'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  {borrowRecords.filter(rec => rec.status === 'Borrowed' || rec.status === 'PendingReturn').length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-neutral-450 italic">
                        ไม่มีค้างชำระหรือรายการนักตากยืมในสารบบขณะนี้
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: CALIBRATION MANAGEMENT */}
        {activeButtonTab === 'calibration' && (
          <div className="space-y-4">
            <h3 className="font-sans font-extrabold text-sm mb-1 text-neutral-950 uppercase">
              งานเทียบมาตรฐานเครื่องวัดชั้นสูงของอู่ช่างการบิน (Calibrate)
            </h3>
            <p className="text-[11px] text-neutral-500 mb-4">
              เครื่องวัดประเภทประแจปอนด์ (Torque Wrench), ไมโครมิเตอร์ และเวอร์เนียคาลิเปอร์ จะต้องได้รับการสอบเทียบตรวจวัดความแม่นยำตามเกณฑ์มาตรฐานความปลอดภัย Part-147 เสมอ
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 text-[10px] text-neutral-550 border-b border-neutral-200 font-bold uppercase">
                    <th className="py-2 px-2">QR Code</th>
                    <th className="py-2 px-2">ชื่ออุปกรณ์/เครื่องวัด</th>
                    <th className="py-2 px-2">วันสอบเทียบล่าสุด</th>
                    <th className="py-2 px-2">สถานะเกณฑ์</th>
                    <th className="py-2 px-2 text-center">ปรับแต่งการสอบเทียบ</th>
                  </tr>
                </thead>
                <tbody>
                  {equipments
                    .filter(tool => tool.calibrationDate)
                    .map((tool) => {
                      const calDays = tool.calibrationDate ? new Date(tool.calibrationDate).getTime() : 0;
                      const isOverdue = Date.now() - calDays > 365 * 24 * 60 * 60 * 1000; // Over 1 year

                      return (
                        <tr key={tool.code} className="border-b border-neutral-100 hover:bg-neutral-50 text-[11px]">
                          <td className="py-3 px-2 font-mono font-bold text-neutral-950">{tool.code}</td>
                          <td className="py-3 px-2">
                            <p className="font-bold">{tool.toolName}</p>
                            <p className="text-[9px] text-neutral-450 font-mono">P/N: {tool.partNumber}</p>
                          </td>
                          <td className="py-3 px-2 font-mono text-neutral-600">
                            {tool.calibrationDate || 'ไม่ระบุ'}
                          </td>
                          <td className="py-3 px-2">
                            {isOverdue ? (
                              <span className="flex items-center gap-1 text-rose-700 font-sans font-bold">
                                <AlertTriangle size={12} />
                                <span>สอบเทียบหมดประกัน (Overdue)</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-emerald-800 font-sans font-bold">
                                <ShieldCheck size={12} />
                                <span>อยู่ในเกณฑ์ปลอดภัย</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <button
                              id={`updateCalBtn_${tool.code}`}
                              onClick={() => {
                                Swal.fire({
                                  title: 'แก้ไขใบอัปเดตวันสอบเทียบ (Calibration)',
                                  html: `
                                    <div class="text-xs text-left text-neutral-600 mb-2">ระบุวันสอบเทียบครั้งล่าสุด:</div>
                                    <input type="date" id="swalCalDateInput" class="swal2-input text-xs" font-family="monospace" value="${new Date().toISOString().split('T')[0]}">
                                  `,
                                  showCancelButton: true,
                                  confirmButtonText: 'บันทึกเข้าเซิร์ฟเวอร์',
                                  cancelButtonText: 'ปิดกติกา',
                                  confirmButtonColor: '#171717',
                                }).then((res) => {
                                  if (res.isConfirmed) {
                                    const dateVal = (document.getElementById('swalCalDateInput') as HTMLInputElement).value;
                                    if (dateVal) {
                                      onUpdateCalibration(tool.code, dateVal, 'Ready');
                                      Swal.fire({ icon: 'success', title: 'อัปเดตสำเร็จ', text: 'เครื่องมือได้รับการบันทึกวันเทียบประกันใหม่', confirmButtonColor: '#171717' });
                                    }
                                  }
                                });
                              }}
                              className="bg-neutral-950 hover:bg-neutral-850 text-white font-sans text-[10px] font-semibold py-1 px-3 rounded transition-colors cursor-pointer"
                            >
                              ปรับวัน Calibrate
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: ALL DOCUMENTS (เหมือนแอดมิน) */}
        {activeButtonTab === 'documents' && (
          <div className="space-y-6">
            
            {/* TLTC-MO-034 List */}
            <div className="bg-white border border-neutral-300 p-5 rounded-lg shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div>
                  <h4 className="font-sans font-extrabold text-sm text-neutral-950">สมุดคู่มือช่างอากาศยาน TLTC-MO-034</h4>
                  <p className="text-[11px] text-neutral-500">บันทึกรายงานสิ่งที่ต้องการซ่อม พัฒนาระบบ และบันทึกสิ่งชำรุดเสียหาย</p>
                </div>
                {onPrintUsageRecords && (
                  <button
                    id="maintPrintMo034Btn"
                    type="button"
                    onClick={onPrintUsageRecords}
                    className="flex items-center gap-1.5 bg-black hover:bg-neutral-800 text-white font-sans text-xs font-bold px-3 py-1.5 rounded transition-all cursor-pointer shadow-sm"
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
                      <th className="py-2.5 px-2 w-1/12 text-center">ลำดับ</th>
                      <th className="py-2.5 px-2 w-2/12">วัน/เดือน/ปี</th>
                      <th className="py-2.5 px-2 w-2/12">ห้องที่ใช้งาน</th>
                      <th className="py-2.5 px-2 w-2/12">ผู้ร้องขอเข้าใช้งาน</th>
                      <th className="py-2.5 px-2 w-3/12">สิ่งที่ต้องการให้ซ่อม/พัฒนา</th>
                      <th className="py-2.5 px-2 w-2/12 text-center">การจัดการ</th>
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
                        <td className="py-2.5 px-2 text-center font-sans">
                          <button
                            type="button"
                            onClick={() => {
                              onAcknowledgeUsageRecord(rec.id);
                              Swal.fire({
                                icon: 'success',
                                title: 'ทำรายการสำเร็จ',
                                text: 'ได้ทำรายการลงนามรับทราบสมบูรณ์',
                                confirmButtonColor: '#171717'
                              });
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold shadow-xs mx-auto border transition-all cursor-pointer ${
                              rec.maintenanceOfficerStatus === 'Acknowledged'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-rose-600 hover:bg-rose-750 text-white border-rose-700'
                            }`}
                          >
                            <span>{rec.maintenanceOfficerStatus === 'Acknowledged' ? 'รับทราบแล้ว' : 'กดรับทราบเรื่อง'}</span>
                          </button>
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
                <table className="w-full text-left border-collapse font-sans">
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
                            {onViewRequestDoc && (
                              <button
                                type="button"
                                onClick={() => onViewRequestDoc(req)}
                                className="flex items-center gap-1 bg-neutral-950 hover:bg-neutral-800 text-white font-sans text-[10px] font-semibold py-1 px-2.5 rounded transition-colors mx-auto cursor-pointer"
                              >
                                <Eye size={11} />
                                <span>ดูเอกสาร PDF</span>
                              </button>
                            )}
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
                        <td colSpan={6} className="py-8 text-center text-neutral-450 italic font-sans animate-fade-in">
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
                  id="maintPrintMo001Btn"
                  type="button"
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
                      <tr key={rec.id} className="border-b border-neutral-100 hover:bg-neutral-50 text-[11px]">
                        <td className="py-2 px-2 font-mono">{rec.borrowDate}</td>
                        <td className="py-2 px-2">
                          <p className="font-bold text-neutral-950 font-sans">{rec.toolName}</p>
                        </td>
                        <td className="py-2 px-2 font-mono font-bold text-neutral-500">{rec.equipmentCode}</td>
                        <td className="py-2 px-1 text-center font-mono font-bold">{rec.qty}</td>
                        <td className="py-2 px-2">
                          <p className="font-sans font-semibold text-neutral-800">{rec.borrowerName}</p>
                          <p className="text-[9px] text-neutral-400 font-mono">ID: {rec.borrowerId}</p>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            rec.status === 'Returned'
                              ? 'bg-emerald-200 text-emerald-800'
                              : 'bg-rose-250 text-rose-800 font-black animate-pulse'
                          }`}>
                            {rec.status === 'Returned' ? 'คืนสะอาด' : 'ยังไม่คืน'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center text-[10px] font-sans font-bold text-[#4B5563]">
                          {rec.status === 'Returned' ? (
                            <span className="text-neutral-900 border border-neutral-300 bg-neutral-100 px-2 py-0.5 rounded font-sans">
                              ✓ {rec.checkerName || 'เจ้าหน้าที่อู่'}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                onCheckReturnEquipment(rec.id);
                                Swal.fire({ icon: 'success', title: 'รับคืนสำเร็จ', text: 'เครื่องมือช่างได้สลักคืนสารบบสมบูรณ์แล้ว', confirmButtonColor: '#171717' });
                              }}
                              className="bg-black hover:bg-neutral-800 text-white font-sans text-[10px] font-semibold py-1 px-2.5 rounded transition-colors mx-auto cursor-pointer block"
                            >
                              ตรวจรับคืนที่นี่
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {borrowRecords.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-neutral-450 italic">
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

        </div>
      </div>

      {/* Pop up individual visual QR code label scanner preview */}
      {previewQRCodeVal && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print animate-fade-in">
          <div className="bg-white p-6 rounded-lg w-full max-w-xs border border-neutral-300 shadow-xl flex flex-col items-center gap-4 text-center">
            <h4 className="font-sans font-bold text-neutral-900 text-xs uppercase">คิวอาร์โค้ดสลักบัญชีเครื่องมือ</h4>
            
            <CustomQRCode value={previewQRCodeVal} />

            <button
              onClick={() => setPreviewQRCodeVal(null)}
              className="w-full bg-neutral-950 text-white py-1.5 rounded font-sans font-bold text-xs hover:bg-neutral-850 transition-colors cursor-pointer"
            >
              ปิดหน้าต่างตรวจ
            </button>
          </div>
        </div>
      )}

      {/* QR Code A4 compilation print frame */}
      {showQRCodeSheet && (
        <PrintQRCodeSheet 
          equipments={equipments} 
          onClose={() => setShowQRCodeSheet(false)} 
        />
      )}

      {/* Traceability Tools Log modal */}
      {showTraceabilityDoc && (
        <TraceabilityToolsLogDoc 
          records={borrowRecords}
          onClose={() => setShowTraceabilityDoc(false)}
        />
      )}

      {/* Maintenance Manager Document Review & Certification Modal */}
      {reviewingRequest && (
        <div className="fixed inset-0 z-50 bg-neutral-900/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-neutral-300 flex flex-col my-8 animate-fade-in">
            {/* Header */}
            <div className="bg-neutral-950 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
              <div>
                <h3 className="font-sans font-extrabold text-sm tracking-wide uppercase">กระบวนการตรวจสอบและรับรองความพร้อมใช้งานภัย</h3>
                <p className="text-[10px] text-neutral-405 font-mono">DOCUMENT ID: {reviewingRequest.id}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReviewingRequest(null);
                  setMgrOpinion('');
                  setMgrSignature('');
                }}
                className="text-neutral-400 hover:text-white font-extrabold text-sm hover:underline cursor-pointer"
              >
                ปิดหน้าต่าง (Close)
              </button>
            </div>

            {/* Document Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
              <div className="border-4 border-double border-neutral-300 p-5 space-y-4">
                <div className="text-center font-sans">
                  <h4 className="font-extrabold text-neutral-950 text-xs tracking-tight">ใบคำขออนุญาตเข้าใช้พื้นที่ปฏิบัติการห้องปฏิบัติการวิเคราะห์รอยร้าวอากาศยาน</h4>
                  <p className="text-[9px] text-neutral-500 font-mono">FORM: TLTC-MO-034 (REVISED VERSION)</p>
                </div>

                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs font-sans text-neutral-800 border-t border-neutral-200 pt-3">
                  <div>
                    <span className="font-semibold text-neutral-500 block text-[9px] uppercase">วันที่ประสงค์ขอใช้ห้อง</span>
                    <span className="font-bold text-neutral-950">{reviewingRequest.date}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-neutral-500 block text-[9px] uppercase">ขอบเขตช่วงเวลาเข้าเรียน</span>
                    <span className="font-bold text-neutral-950">{reviewingRequest.timeRange || '09:00 - 12:00'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-neutral-500 block text-[9px] uppercase">ชื่อผู้เขียนรายงานประสงค์</span>
                    <span className="font-bold text-neutral-900">{reviewingRequest.requesterName}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-neutral-500 block text-[9px] uppercase">สังกัด/แผนกรอยตราภาควิชา</span>
                    <span className="font-bold text-neutral-900">{reviewingRequest.department || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-semibold text-slate-500 block text-[9px] uppercase">ห้องที่ส่งเรื่องขอจอง</span>
                    <span className="font-bold text-neutral-950 bg-neutral-100 px-2 py-0.5 rounded text-xs inline-block mt-0.5 border">
                      🏫 {reviewingRequest.room}
                    </span>
                  </div>
                  <div className="col-span-2 border-t pt-2 mt-1">
                    <span className="font-semibold text-neutral-500 block text-[9px] uppercase">วัตถุประสงค์โดยระเอียดเด่นชัด</span>
                    <div className="p-2.5 bg-neutral-50 border border-neutral-250 rounded font-sans leading-relaxed text-xs text-neutral-900 mt-1 whitespace-pre-wrap">
                      {reviewingRequest.purpose}
                    </div>
                  </div>
                </div>

                {reviewingRequest.signature && (
                  <div className="col-span-2 flex flex-col items-end border-t border-dashed border-neutral-250 pt-3 mt-1.5 font-sans">
                    <div className="text-right">
                      <p className="text-[9px] text-neutral-450 uppercase font-semibold">ลายเซ็นดิจิทัลผู้ขอใช้ห้อง (Requester Signature)</p>
                      <img
                        src={reviewingRequest.signature}
                        alt="Requester Signature"
                        referrerPolicy="no-referrer"
                        className="h-10 object-contain ml-auto border border-neutral-200 rounded p-0.5 bg-white scale-95 mt-1"
                      />
                      <p className="text-[9px] font-mono text-neutral-500 mt-0.5">ผู้รับรองสัญญลักษณ์: {reviewingRequest.requesterName}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Maintenance Manager Decision Section */}
              <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-200/80 space-y-4">
                <div className="flex items-center gap-1.5 text-emerald-900 font-sans font-bold">
                  <span className="text-sm">🛠️</span>
                  <span>ส่วนการพิจารณาตรวจสอบโดยหัวหน้าช่างซ่อมบำรุง / MAINTENANCE MANAGER</span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-800 mb-1">
                      ลงความเห็นเพิ่มเติม / คำแนะนำด้านความปลอดภัยการบินและการใช้เครื่องมือช่าง (Opinion / Notes)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="ระบุความเห็นเพิ่มเติม เช่น ตรวจเช็คเครื่องมือวัด แว่นตานิรภัย และสารเคมี NDT ครบถ้วน พร้อมเปิดใช้งาน"
                      value={mgrOpinion}
                      onChange={(e) => setMgrOpinion(e.target.value)}
                      className="w-full border border-neutral-300 px-3 py-2 rounded text-xs font-sans focus:outline-none focus:border-neutral-900 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-bold text-neutral-800">
                        เซ็นลงลายมือชื่อรับรองความพร้อมใช้งานของห้องปฏิบัติการ * (Signature Required)
                      </label>
                      {currentUser.signature && (
                        <button
                          type="button"
                          onClick={() => setMgrSignature(currentUser.signature)}
                          className="text-[9.5px] text-emerald-800 font-sans font-bold hover:underline"
                        >
                          ✓ ใช้ลายมือชื่อเริ่มต้นจากโปรไฟล์ของฉัน
                        </button>
                      )}
                    </div>
                    
                    <div className="w-full bg-white border border-neutral-300 rounded p-2 flex flex-col items-center">
                      {mgrSignature ? (
                        <div className="relative w-full h-24 bg-white border border-neutral-200 rounded flex items-center justify-center">
                          <img
                            src={mgrSignature}
                            alt="Manager Seal Signature"
                            referrerPolicy="no-referrer"
                            className="h-20 object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => setMgrSignature('')}
                            className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white text-[9px] px-1.5 py-0.5 rounded"
                          >
                            ล้างลายเซ็นและเซ็นใหม่
                          </button>
                        </div>
                      ) : (
                        <div className="w-full flex flex-col items-center">
                          <SignaturePad onSave={(data) => setMgrSignature(data)} placeholder="กวาดเซ็นลายเซ็นคุณตรงนี้..." />
                          <p className="text-[8.5px] text-neutral-450 font-sans font-medium mt-1">กรุณาลากเมาส์หรือใช้นิ้วเขียนลายเซ็นเพื่ออนุมัติ</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="px-6 py-4 bg-neutral-50 rounded-b-xl border-t border-neutral-200 flex flex-col sm:flex-row gap-2 justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setReviewingRequest(null);
                  setMgrOpinion('');
                  setMgrSignature('');
                }}
                className="bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-bold px-4 py-2 rounded text-xs cursor-pointer select-none"
              >
                ย้อนกลับ
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleReviewCertifySubmit('Rejected')}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-4 py-2.5 rounded text-xs shadow cursor-pointer transition-colors"
                >
                  ⚠️ ห้องไม่ถูกต้อง/เลื่อนสิทธิ (Reject)
                </button>
                <button
                  type="button"
                  onClick={() => handleReviewCertifySubmit('Approved')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2.5 rounded text-xs shadow-md cursor-pointer transition-colors"
                >
                  🚀 อนุมัติ: ห้องพร้อมใช้งาน (Approve & Ready)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
