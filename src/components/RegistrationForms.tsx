/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import SignaturePad from './SignaturePad';
import { UserPlus, Image as ImageIcon, Key, Mail, UserCheck, ShieldAlert, Eye, EyeOff, Loader2 } from 'lucide-react';
import { alerts as Swal } from '../lib/alerts';

interface RegistrationFormsProps {
  onRegisterSuccess: (user: Omit<User, 'status' | 'createdAt'>) => void;
  onCancel: () => void;
  existingUsers: User[];
  language?: 'TH' | 'EN';
}

interface RankInfo {
  id: string;
  category: 'civilian' | 'army' | 'navy' | 'airforce' | 'police' | 'academic';
  thAbbrev: string;
  enAbbrev: string;
  thFullName: string;
}

const CIVILIAN_TITLES: RankInfo[] = [
  { id: 'mr', category: 'civilian', thAbbrev: 'นาย', enAbbrev: 'Mr.', thFullName: 'นาย' },
  { id: 'miss', category: 'civilian', thAbbrev: 'นางสาว', enAbbrev: 'Miss', thFullName: 'นางสาว' },
  { id: 'mrs', category: 'civilian', thAbbrev: 'นาง', enAbbrev: 'Mrs.', thFullName: 'นาง' },
];

const ARMY_RANKS: RankInfo[] = [
  { id: 'army_gen', category: 'army', thAbbrev: 'พล.อ.', enAbbrev: 'GEN', thFullName: 'พลเอก' },
  { id: 'army_ltg', category: 'army', thAbbrev: 'พล.ท.', enAbbrev: 'LT GEN', thFullName: 'พลโท' },
  { id: 'army_mjg', category: 'army', thAbbrev: 'พล.ต.', enAbbrev: 'MAJ GEN', thFullName: 'พลตรี' },
  { id: 'army_col', category: 'army', thAbbrev: 'พ.อ.', enAbbrev: 'COL', thFullName: 'พันเอก' },
  { id: 'army_ltc', category: 'army', thAbbrev: 'พ.ท.', enAbbrev: 'LT COL', thFullName: 'พันโท' },
  { id: 'army_maj', category: 'army', thAbbrev: 'พ.ต.', enAbbrev: 'MAJ', thFullName: 'พันตรี' },
  { id: 'army_capt', category: 'army', thAbbrev: 'ร.อ.', enAbbrev: 'CAPT', thFullName: 'ร้อยเอก' },
  { id: 'army_lt', category: 'army', thAbbrev: 'ร.ท.', enAbbrev: 'LT', thFullName: 'ร้อยโท' },
  { id: 'army_sublt', category: 'army', thAbbrev: 'ร.ต.', enAbbrev: 'SUB LT', thFullName: 'ร้อยตรี' },
  { id: 'army_acting_sublt', category: 'army', thAbbrev: 'ว่าที่ ร.ต.', enAbbrev: 'Acting Sub-Lt.', thFullName: 'ว่าที่ ร้อยตรี' },
  { id: 'army_sm1', category: 'army', thAbbrev: 'จ.ส.อ.', enAbbrev: 'S M 1', thFullName: 'จ่าสิบเอก' },
  { id: 'army_sm2', category: 'army', thAbbrev: 'จ.ส.ท.', enAbbrev: 'S M 2', thFullName: 'จ่าสิบโท' },
  { id: 'army_sm3', category: 'army', thAbbrev: 'จ.ส.ต.', enAbbrev: 'S M 3', thFullName: 'จ่าสิบตรี' },
  { id: 'army_sgt', category: 'army', thAbbrev: 'ส.อ.', enAbbrev: 'SGT', thFullName: 'สิบเอก' },
  { id: 'army_cpl', category: 'army', thAbbrev: 'ส.ท.', enAbbrev: 'CPL', thFullName: 'สิบโท' },
  { id: 'army_pfc', category: 'army', thAbbrev: 'ส.ต.', enAbbrev: 'PFC', thFullName: 'สิบตรี' },
  { id: 'army_pvt', category: 'army', thAbbrev: 'พลฯ', enAbbrev: 'PVT', thFullName: 'พลทหาร' },
];

const NAVY_RANKS: RankInfo[] = [
  { id: 'navy_adm', category: 'navy', thAbbrev: 'พล.ร.อ.', enAbbrev: 'ADM', thFullName: 'พลเรือเอก' },
  { id: 'navy_vadm', category: 'navy', thAbbrev: 'พล.ร.ท.', enAbbrev: 'V ADM', thFullName: 'พลเรือโท' },
  { id: 'navy_radm', category: 'navy', thAbbrev: 'พล.ร.ต.', enAbbrev: 'R ADM', thFullName: 'พลเรือตรี' },
  { id: 'navy_capt', category: 'navy', thAbbrev: 'น.อ. ร.น.', enAbbrev: 'CAPT', thFullName: 'นาวาเอก ร.น.' },
  { id: 'navy_cdr', category: 'navy', thAbbrev: 'น.ท. ร.น.', enAbbrev: 'CDR', thFullName: 'นาวาโท ร.น.' },
  { id: 'navy_lcdr', category: 'navy', thAbbrev: 'น.ต. ร.น.', enAbbrev: 'L CDR', thFullName: 'นาวาตรี ร.น.' },
  { id: 'navy_lt', category: 'navy', thAbbrev: 'ร.อ. ร.น.', enAbbrev: 'LT', thFullName: 'เรือเอก ร.น.' },
  { id: 'navy_ltjg', category: 'navy', thAbbrev: 'ร.ท. ร.น.', enAbbrev: 'LT JG', thFullName: 'เรือโท ร.น.' },
  { id: 'navy_sublt', category: 'navy', thAbbrev: 'ร.ต. ร.น.', enAbbrev: 'SUB LT', thFullName: 'เรือตรี ร.น.' },
  { id: 'navy_cpo1', category: 'navy', thAbbrev: 'พ.จ.อ.', enAbbrev: 'CPO 1', thFullName: 'พันจ่าเอก' },
  { id: 'navy_cpo2', category: 'navy', thAbbrev: 'พ.จ.ท.', enAbbrev: 'CPO 2', thFullName: 'พันจ่าโท' },
  { id: 'navy_cpo3', category: 'navy', thAbbrev: 'พ.จ.ต.', enAbbrev: 'CPO 3', thFullName: 'พันจ่าตรี' },
  { id: 'navy_po1', category: 'navy', thAbbrev: 'จ.อ.', enAbbrev: 'PO 1', thFullName: 'จ่าเอก' },
  { id: 'navy_po2', category: 'navy', thAbbrev: 'จ.ท.', enAbbrev: 'PO 2', thFullName: 'จ่าโท' },
  { id: 'navy_po3', category: 'navy', thAbbrev: 'จ.ต.', enAbbrev: 'PO 3', thFullName: 'จ่าตรี' },
  { id: 'navy_seaman', category: 'navy', thAbbrev: 'พลฯ ร.น.', enAbbrev: 'SEA-MAN', thFullName: 'พลทหาร ร.น.' },
];

const AIRFORCE_RANKS: RankInfo[] = [
  { id: 'airforce_acm', category: 'airforce', thAbbrev: 'พล.อ.อ.', enAbbrev: 'ACM', thFullName: 'พลอากาศเอก' },
  { id: 'airforce_am', category: 'airforce', thAbbrev: 'พล.อ.ท.', enAbbrev: 'AM', thFullName: 'พลอากาศโท' },
  { id: 'airforce_avm', category: 'airforce', thAbbrev: 'พล.อ.ต.', enAbbrev: 'AVM', thFullName: 'พลอากาศตรี' },
  { id: 'airforce_gp_capt', category: 'airforce', thAbbrev: 'น.อ.', enAbbrev: 'GP CAPT', thFullName: 'นาวาอากาศเอก' },
  { id: 'airforce_wg_cdr', category: 'airforce', thAbbrev: 'น.ท.', enAbbrev: 'WG CDR', thFullName: 'นาวาอากาศโท' },
  { id: 'airforce_sqn_ldr', category: 'airforce', thAbbrev: 'น.ต.', enAbbrev: 'SQN LDR', thFullName: 'นาวาอากาศตรี' },
  { id: 'airforce_flt_lt', category: 'airforce', thAbbrev: 'ร.อ.', enAbbrev: 'FLT LT', thFullName: 'เรืออากาศเอก' },
  { id: 'airforce_flg_off', category: 'airforce', thAbbrev: 'ร.ท.', enAbbrev: 'FLG OFF', thFullName: 'เรืออากาศโท' },
  { id: 'airforce_plt_off', category: 'airforce', thAbbrev: 'ร.ต.', enAbbrev: 'PLT OFF', thFullName: 'เรืออากาศตรี' },
  { id: 'airforce_fs1', category: 'airforce', thAbbrev: 'พ.อ.อ.', enAbbrev: 'FS 1', thFullName: 'พันจ่าอากาศเอก' },
  { id: 'airforce_fs2', category: 'airforce', thAbbrev: 'พ.อ.ท.', enAbbrev: 'FS 2', thFullName: 'พันจ่าอากาศโท' },
  { id: 'airforce_fs3', category: 'airforce', thAbbrev: 'พ.อ.ต.', enAbbrev: 'FS 3', thFullName: 'พันจ่าอากาศตรี' },
  { id: 'airforce_sgt', category: 'airforce', thAbbrev: 'จ.อ.', enAbbrev: 'SGT', thFullName: 'จ่าอากาศเอก' },
  { id: 'airforce_cpl', category: 'airforce', thAbbrev: 'จ.ท.', enAbbrev: 'CPL', thFullName: 'จ่าอากาศโท' },
  { id: 'airforce_lac', category: 'airforce', thAbbrev: 'จ.ต.', enAbbrev: 'LAC', thFullName: 'จ่าอากาศตรี' },
  { id: 'airforce_amn', category: 'airforce', thAbbrev: 'พลฯ อ.อ.', enAbbrev: 'AMN', thFullName: 'พลทหาร ทอ.' },
];

const POLICE_RANKS: RankInfo[] = [
  { id: 'police_gen', category: 'police', thAbbrev: 'พล.ต.อ.', enAbbrev: 'POL GEN', thFullName: 'พลตำรวจเอก' },
  { id: 'police_ltg', category: 'police', thAbbrev: 'พล.ต.ท.', enAbbrev: 'POL LT GEN', thFullName: 'พลตำรวจโท' },
  { id: 'police_mjg', category: 'police', thAbbrev: 'พล.ต.ต.', enAbbrev: 'POL MAJ GEN', thFullName: 'พลตำรวจตรี' },
  { id: 'police_col', category: 'police', thAbbrev: 'พ.ต.อ.', enAbbrev: 'POL COL', thFullName: 'พันตำรวจเอก' },
  { id: 'police_ltc', category: 'police', thAbbrev: 'พ.ต.ท.', enAbbrev: 'POL LT COL', thFullName: 'พันตำรวจโท' },
  { id: 'police_maj', category: 'police', thAbbrev: 'พ.ต.ต.', enAbbrev: 'POL MAJ', thFullName: 'พันตำรวจตรี' },
  { id: 'police_capt', category: 'police', thAbbrev: 'ร.ต.อ.', enAbbrev: 'POL CAPT', thFullName: 'ร้อยตำรวจเอก' },
  { id: 'police_lt', category: 'police', thAbbrev: 'ร.ต.ท.', enAbbrev: 'POL LT', thFullName: 'ร้อยตำรวจโท' },
  { id: 'police_sublt', category: 'police', thAbbrev: 'ร.ต.ต.', enAbbrev: 'POL SUB LT', thFullName: 'ร้อยตำรวจตรี' },
  { id: 'police_sen_sgt_maj', category: 'police', thAbbrev: 'ด.ต.', enAbbrev: 'POL SEN SGT MAJ', thFullName: 'นายดาบตำรวจ' },
  { id: 'police_sgt_maj', category: 'police', thAbbrev: 'จ.ส.ต.', enAbbrev: 'POL SGT MAJ', thFullName: 'จ่าสิบตำรวจ' },
  { id: 'police_sgt', category: 'police', thAbbrev: 'ส.ต.อ.', enAbbrev: 'POL SGT', thFullName: 'สิบตำรวจเอก' },
  { id: 'police_cpl', category: 'police', thAbbrev: 'ส.ต.ท.', enAbbrev: 'POL CPL', thFullName: 'สิบตำรวจโท' },
  { id: 'police_lc', category: 'police', thAbbrev: 'ส.ต.ต.', enAbbrev: 'POL L/C', thFullName: 'สิบตำรวจตรี' },
  { id: 'police_const', category: 'police', thAbbrev: 'พลฯ ต.ต.', enAbbrev: 'POL CONST', thFullName: 'พลตำรวจ' },
];

const ACADEMIC_TITLES: RankInfo[] = [
  { id: 'academic_dr', category: 'academic', thAbbrev: 'ดร.', enAbbrev: 'Dr.', thFullName: 'ดร.' },
  { id: 'academic_asstprof', category: 'academic', thAbbrev: 'ผศ.', enAbbrev: 'Asst. Prof.', thFullName: 'ผศ.' },
  { id: 'academic_assocprof', category: 'academic', thAbbrev: 'รศ.', enAbbrev: 'Assoc. Prof.', thFullName: 'รศ.' },
  { id: 'academic_prof', category: 'academic', thAbbrev: 'ศ.', enAbbrev: 'Prof.', thFullName: 'ศ.' },
];

const ALL_RANKS: RankInfo[] = [
  ...CIVILIAN_TITLES,
  ...ARMY_RANKS,
  ...NAVY_RANKS,
  ...AIRFORCE_RANKS,
  ...POLICE_RANKS,
  ...ACADEMIC_TITLES,
];

export default function RegistrationForms({ onRegisterSuccess, onCancel, existingUsers, language = 'TH' }: RegistrationFormsProps) {
  const [tab, setTab] = useState<'student' | 'instructor'>('student');
  const [step, setStep] = useState(1);
  
  // Registration States
  const [id, setId] = useState('');
  const [selectedTitleId, setSelectedTitleId] = useState('mr');
  const [selectedSubTitleId, setSelectedSubTitleId] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState<'army' | 'navy' | 'airforce' | 'police' | 'academic'>('army');
  const [title, setTitle] = useState('นาย');
  const [customTitle, setCustomTitle] = useState('');
  const setTitleEn = (val: string) => {};
  const [firstNameTh, setFirstNameTh] = useState('');
  const [lastNameTh, setLastNameTh] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [signature, setSignature] = useState('');
  const [instructorRole, setInstructorRole] = useState<UserRole>('Training Staff');
  const [loadingButton, setLoadingButton] = useState<'next' | 'back' | 'submit' | null>(null);

  const staffRoles: UserRole[] = [
    'Training Manager',
    'Examination Manager',
    'Maintenance Manager',
    'Office Manager',
    'Training Staff',
    'Examination Staff',
    'Maintenance Staff',
    'Instructor'
  ];

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: 'รูปภาพมีขนาดใหญ่เกินไป',
        text: 'กรุณาอัพโหลดรูปภาพขนาดไม่เกิน 1MB เพื่อลดการใช้ข้อมูลและทำให้การโหลดหน้าบอร์ดเสถียร',
        confirmButtonColor: '#171717'
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const getFormErrors = (currentStep?: number): string | null => {
    if (currentStep === undefined || currentStep === 2) {
      if (!id.trim()) return language === 'TH' ? 'กรุณาระบุรหัสประจำตัว หรือรหัสนักศึกษา' : 'Please specify security User ID or Student ID.';
      const duplicate = existingUsers.some(u => String(u.id || '').toLowerCase().trim() === id.toLowerCase().trim());
      if (duplicate) {
        return language === 'TH' ? 'รหัสประจำตัวนี้เคยลงทะเบียนไว้ในระบบแล้ว กรุณาใช้รหัสส่วนตัวอื่นของคุณ' : 'This ID is already registered in the system.';
      }
      if (!photoUrl) return language === 'TH' ? 'กรุณาอัพโหลดรูปถ่ายผู้ใช้งานเพื่อสร้างบัตรประจำตัวการช่าง' : 'Please upload a photo for your digital ID card.';
    }
    
    if (currentStep === undefined || currentStep === 3) {
      if (!firstNameTh.trim() || !lastNameTh.trim()) return language === 'TH' ? 'กรุณากรอกชื่อและนามสกุลจริงภาษาไทย' : 'Please enter first and last name in Thai.';
      
      const thaiRegex = /^[ก-๙\s.-]+$/;
      if (!thaiRegex.test(firstNameTh.trim())) {
        return language === 'TH' ? 'กรุณากรอกชื่อจริงเป็นภาษาไทยเท่านั้น' : 'Please enter first name in Thai characters only.';
      }
      if (!thaiRegex.test(lastNameTh.trim())) {
        return language === 'TH' ? 'กรุณากรอกนามสกุลเป็นภาษาไทยเท่านั้น' : 'Please enter last name in Thai characters only.';
      }
      if (selectedTitleId === 'other' && !selectedSubTitleId) {
        return language === 'TH' ? 'กรุณาเลือกยศหรือคำนำหน้าชื่อเพิ่มเติม' : 'Please select an additional rank or prefix.';
      }
      if (title === 'อื่น ๆ (โปรดระบุ)' && !customTitle.trim()) {
        return language === 'TH' ? 'กรุณาระบุคำนำหน้า หรือยศอื่น ๆ ของคุณ' : 'Please specify your custom title/rank.';
      }
      if (!signature) return language === 'TH' ? 'กรุณาวาดลายเซ็นของคุณ' : 'Please sign with your digital signature.';
    }
    
    if (currentStep === undefined || currentStep === 4) {
      if (!email.trim() || !email.includes('@')) return language === 'TH' ? 'กรุณากรอกอีเมลที่ถูกต้อง' : 'Please enter a valid email address.';
      if (password.length < 4) return language === 'TH' ? 'รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร' : 'Password must be at least 4 characters.';
      if (password !== confirmPassword) {
        return language === 'TH' ? 'รหัสผ่านทั้งสองช่องไม่ตรงกัน กรุณากรอกยืนยันรหัสผ่านใหม่อีกครั้ง' : 'Passwords do not match. Please re-enter passwords.';
      }
    }
    
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loadingButton) return;

    const errorMsg = getFormErrors();
    if (errorMsg) {
      Swal.fire({
        icon: 'error',
        title: 'ข้อมูลไม่ครบถ้วน',
        text: errorMsg,
        confirmButtonColor: '#171717'
      });
      return;
    }

    setLoadingButton('submit');
    setTimeout(() => {
      const role: UserRole = tab === 'student' ? 'นักศึกษา' : instructorRole;
      
      // Auto calculate batch for student
      const calculatedBatch = tab === 'student' ? id.slice(0, 2) : undefined;
      
      const finalTitle = title === 'อื่น ๆ (โปรดระบุ)' ? customTitle.trim() : title;

      onRegisterSuccess({
        id: id.trim(),
        title: finalTitle,
        firstNameTh: firstNameTh.trim(),
        lastNameTh: lastNameTh.trim(),
        email: email.trim(),
        password,
        photoUrl,
        signature,
        role,
        batch: calculatedBatch,
      });
      setLoadingButton(null);
    }, 1000);
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white border border-neutral-300 rounded-lg shadow-md p-6 sm:p-8 animate-fade-in text-neutral-900">
      
      {/* Title & Step Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-sans font-extrabold text-lg sm:text-xl tracking-tight text-neutral-950">
          {language === 'TH' ? 'ลงทะเบียนสมาชิกใหม่' : 'New Member Registration'}
        </h2>
        <div className="bg-neutral-100 text-neutral-600 px-3 py-1 rounded-full text-xs font-bold font-mono">
          {language === 'TH' ? `ขั้นตอน ${step} / 5` : `Step ${step} / 5`}
        </div>
      </div>

      {/* Progress Dots */}
      <div className="flex justify-center gap-2 mb-8">
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className={`h-2 rounded-full transition-all duration-300 ${
              step >= s ? 'bg-neutral-900 w-8' : 'bg-neutral-200 w-2'
            }`}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 font-sans text-xs">
        
        {/* Step 1: User Role Selection */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-bold text-neutral-800 text-sm">
              {language === 'TH' ? 'เลือกประเภทผู้ใช้งาน' : 'Select User Role'}
            </h3>
            
            <button
              type="button"
              onClick={() => { setTab('student'); setId(''); }}
              className={`w-full p-4 border rounded-xl text-left transition-all ${
                tab === 'student' ? 'border-neutral-900 shadow-md' : 'border-neutral-200 hover:border-neutral-400'
              }`}
            >
              <div className="font-bold text-base mb-1">{language === 'TH' ? 'นักศึกษา (Student)' : 'Student'}</div>
              <div className="text-neutral-500 text-xs">
                {language === 'TH' ? 'เข้าใช้งานในฐานะนักศึกษาเพื่อเข้าเรียน ตรวจสอบตาราง และจองอุปกรณ์/ห้องเรียน' : 'Access as a student to attend classes, check schedules, and book equipment/rooms.'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => { setTab('instructor'); setId(''); }}
              className={`w-full p-4 border rounded-xl text-left transition-all ${
                tab === 'instructor' ? 'border-neutral-900 shadow-md' : 'border-neutral-200 hover:border-neutral-400'
              }`}
            >
              <div className="font-bold text-base mb-1">{language === 'TH' ? 'บุคลากร / อาจารย์ (Staff)' : 'Staff / Instructor'}</div>
              <div className="text-neutral-500 text-xs">
                {language === 'TH' ? 'เจ้าหน้าที่สถาบัน, ผู้ดูแลส่วนงาน หรืออาจารย์ที่ต้องการบริหารจัดการดูแลระบบ' : 'Institute staff, administrators, or instructors managing the system.'}
              </div>
            </button>
            
            <div className="grid grid-cols-2 gap-4 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="w-full p-4 border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 rounded-xl font-bold transition-all text-xs cursor-pointer flex items-center justify-center"
              >
                {language === 'TH' ? 'มีบัญชีอยู่แล้ว?' : 'Already have an account?'}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  if (!tab || loadingButton) return;
                  setLoadingButton('next');
                  setTimeout(() => {
                    setStep(2);
                    setLoadingButton(null);
                  }, 600);
                }}
                disabled={!tab || loadingButton !== null}
                className={`w-full p-4 bg-[#171717] text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  !tab || loadingButton !== null ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black cursor-pointer'
                }`}
              >
                {loadingButton === 'next' && <Loader2 className="animate-spin" size={16} />}
                <span>{language === 'TH' ? 'ถัดไป →' : 'Next →'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Photo, ID & Position */}
        {step === 2 && (
            <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h3 className="font-bold text-neutral-800 text-sm">
                    {language === 'TH' ? 'อัปโหลดรูปภาพประจำตัว (หน้าตรง)' : 'Upload Profile Picture'}
                  </h3>
                  <label className="block w-40 h-40 mx-auto rounded-full border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center cursor-pointer hover:border-neutral-500 hover:bg-neutral-50 transition-all">
                    {photoUrl ? (
                      <img src={photoUrl} alt="Preview" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <>
                        <ImageIcon className="text-neutral-400 mb-2" size={32} />
                        <span className="font-bold text-neutral-500 text-xs">
                          {language === 'TH' ? 'เลือกรูปภาพ' : 'Select Photo'}
                        </span>
                      </>
                    )}
                    <input
                      id="photoUploadInput"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </label>
                  <p className="text-[10px] text-neutral-400">
                    {language === 'TH' ? 'ภาพนามสกุล JPG, JPEG, PNG' : 'JPG, JPEG, PNG files'}
                  </p>
                </div>

                <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                      {tab === 'student' 
                        ? (language === 'TH' ? 'รหัสนักศึกษา *' : 'Student ID *')
                        : (language === 'TH' ? 'รหัสประจำตัวบุคลากร *' : 'Staff ID *')
                      }
                    </label>
                    <input
                      id="regIdInput"
                      type="text"
                      required
                      placeholder={tab === 'student' ? 'XX3140500XX (เช่น 67314050012)' : 'STAFFXX (เช่น STAFF01)'}
                      value={id}
                      onChange={(e) => setId(e.target.value)}
                      className="w-full border border-neutral-300 px-4 py-3 rounded-lg focus:outline-none focus:border-neutral-900 font-mono text-sm"
                    />
                    <p className="text-[10px] text-neutral-500 mt-1">
                      {tab === 'student' 
                        ? (language === 'TH' ? 'รูปแบบรหัสนักศึกษา: XX3140500XX (เช่น 67314050012)' : 'Student ID Format: XX3140500XX (e.g. 67314050012)')
                        : (language === 'TH' ? 'รูปแบบรหัสบุคลากร: STAFFXX (เช่น STAFF01)' : 'Staff ID Format: STAFFXX (e.g. STAFF01)')
                      }
                    </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1 font-sans">
                    {language === 'TH' ? 'ตำแหน่ง (Position) *' : 'Position *'}
                  </label>
                  {tab === 'student' ? (
                    <input
                      type="text"
                      readOnly
                      value={language === 'TH' ? 'นักศึกษา' : 'Student'}
                      className="w-full border border-neutral-200 bg-neutral-50 px-4 py-3 rounded-lg text-neutral-500 font-sans text-sm outline-none"
                    />
                  ) : (
                    <select
                      value={instructorRole}
                      onChange={(e) => setInstructorRole(e.target.value as UserRole)}
                      className="w-full border border-neutral-300 px-4 py-3 rounded-lg focus:outline-none focus:border-neutral-900 font-sans text-sm bg-white text-neutral-800"
                    >
                      {staffRoles.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  )}
                </div>
            </div>
        )}

        {/* Step 3: Personal Details */}
        {step === 3 && (
            <div className="space-y-6">
                {/* Thai Details */}
                <div className="space-y-3">
                  <h3 className="font-bold text-neutral-600 text-xs uppercase tracking-wider">
                    {language === 'TH' ? 'ข้อมูลภาษาไทย (THAI DETAILS)' : 'THAI DETAILS'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative font-sans" id="titleDropdownContainer">
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">คำนำหน้า</label>
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full border border-neutral-300 px-3 py-2.5 rounded-lg bg-white font-sans text-xs h-[42px] flex items-center justify-between cursor-pointer focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all text-neutral-900 animate-fade-in"
                      >
                        <span className="font-semibold truncate text-left w-full text-neutral-800">
                          {selectedTitleId === 'mr' && 'นาย'}
                          {selectedTitleId === 'miss' && 'นางสาว'}
                          {selectedTitleId === 'mrs' && 'นาง'}
                          {selectedTitleId === 'other' && (
                            selectedSubTitleId
                              ? (selectedSubTitleId === 'custom'
                                ? `${customTitle ? customTitle : 'อื่น ๆ (โปรดระบุ)'}`
                                : `${title}`)
                              : 'อื่น ๆ / มียศ / วิชาการ'
                          )}
                        </span>
                        <svg className={`w-4 h-4 text-neutral-500 transition-transform flex-shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Backdrop to dismiss dropdown when clicked outside */}
                      {isDropdownOpen && (
                        <div
                          className="fixed inset-0 z-40 bg-transparent"
                          onClick={() => setIsDropdownOpen(false)}
                        />
                      )}

                      {/* Dropdown Popover */}
                      {isDropdownOpen && (
                        <div className="absolute z-50 left-0 top-full mt-1.5 w-[280px] sm:w-[500px] md:w-[600px] bg-white border border-neutral-200 rounded-xl shadow-2xl p-4 space-y-4 max-h-[480px] overflow-y-auto animate-fade-in text-neutral-900">
                          {/* Top Quick Choices (Civilian) */}
                          <div>
                            <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                              {language === 'TH' ? 'คำนำหน้าทั่วไป' : 'General Prefix'}
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                              {[
                                { id: 'mr', label: 'นาย' },
                                { id: 'miss', label: 'นางสาว' },
                                { id: 'mrs', label: 'นาง' },
                                { id: 'other', label: 'อื่น ๆ / มียศ' }
                              ].map((opt) => (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedTitleId(opt.id);
                                    if (opt.id !== 'other') {
                                      setSelectedSubTitleId('');
                                      const civilian = CIVILIAN_TITLES.find(c => c.id === opt.id);
                                      if (civilian) {
                                        setTitle(civilian.thAbbrev);
                                        setTitleEn(civilian.enAbbrev);
                                      }
                                      setIsDropdownOpen(false); // Auto close for quick options
                                    } else {
                                      setSelectedSubTitleId('');
                                      setTitle('อื่น ๆ (โปรดระบุ)');
                                      setTitleEn('');
                                    }
                                  }}
                                  className={`py-2 px-1 text-center rounded-lg border font-bold text-xs cursor-pointer transition-all ${
                                    (selectedTitleId === opt.id)
                                      ? 'bg-neutral-950 text-white border-neutral-950 shadow-sm'
                                      : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                                  }`}
                                >
                                  <div>{opt.label}</div>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Extra Ranks & Prefix Selection when 'other' is selected */}
                          {selectedTitleId === 'other' && (
                            <div className="border-t border-neutral-100 pt-3 space-y-3">
                              <div className="flex items-center justify-between pb-1 border-b border-neutral-100">
                                <span className="font-bold text-neutral-800 text-[11px]">
                                  {language === 'TH' ? 'เลือกยศ / ยศทหาร / ยศตำรวจ / ตำแหน่งวิชาการ' : 'Select Rank / Military / Police / Academic Title'}
                                </span>
                              </div>

                              {/* Categories Tabs */}
                              <div className="flex flex-wrap gap-1 bg-neutral-100 p-1 rounded-lg">
                                {[
                                  { id: 'army', label: 'ทหารบก' },
                                  { id: 'navy', label: 'ทหารเรือ' },
                                  { id: 'airforce', label: 'ทหารอากาศ' },
                                  { id: 'police', label: 'ตำรวจ' },
                                  { id: 'academic', label: 'วิชาการ / อื่น ๆ' },
                                ].map((cat) => (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setActiveCategoryTab(cat.id as any)}
                                    className={`flex-1 min-w-[55px] sm:min-w-[70px] text-center py-1.5 px-1 rounded-md font-bold text-[10px] transition-all cursor-pointer ${
                                      activeCategoryTab === cat.id
                                        ? 'bg-neutral-950 text-white shadow-sm'
                                        : 'text-neutral-500 hover:text-neutral-800'
                                    }`}
                                  >
                                    {cat.label}
                                  </button>
                                ))}
                              </div>

                              {/* Rank Grid */}
                              <div className="max-h-[200px] overflow-y-auto pr-1">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                                  {/* Render ranks belonging to current active tab */}
                                  {activeCategoryTab === 'army' && ARMY_RANKS.map(rank => (
                                    <button
                                      key={rank.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedSubTitleId(rank.id);
                                        setTitle(rank.thAbbrev);
                                        setTitleEn(rank.enAbbrev);
                                        setCustomTitle('');
                                        setIsDropdownOpen(false); // Close dropdown
                                      }}
                                      className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all cursor-pointer ${
                                        selectedSubTitleId === rank.id
                                          ? 'bg-neutral-955 text-white border-neutral-950 shadow-sm bg-neutral-950'
                                          : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between w-full">
                                        <span className="font-bold text-[11px] truncate max-w-[90px]">{rank.thFullName}</span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${selectedSubTitleId === rank.id ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-100 text-neutral-500'}`}>
                                          {rank.thAbbrev}
                                        </span>
                                      </div>
                                    </button>
                                  ))}
                                  {activeCategoryTab === 'navy' && NAVY_RANKS.map(rank => (
                                    <button
                                      key={rank.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedSubTitleId(rank.id);
                                        setTitle(rank.thAbbrev);
                                        setTitleEn(rank.enAbbrev);
                                        setCustomTitle('');
                                        setIsDropdownOpen(false); // Close dropdown
                                      }}
                                      className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all cursor-pointer ${
                                        selectedSubTitleId === rank.id
                                          ? 'bg-neutral-955 text-white border-neutral-950 shadow-sm bg-neutral-950'
                                          : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between w-full">
                                        <span className="font-bold text-[11px] truncate max-w-[90px]">{rank.thFullName}</span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${selectedSubTitleId === rank.id ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-100 text-neutral-500'}`}>
                                          {rank.thAbbrev}
                                        </span>
                                      </div>
                                    </button>
                                  ))}
                                  {activeCategoryTab === 'airforce' && AIRFORCE_RANKS.map(rank => (
                                    <button
                                      key={rank.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedSubTitleId(rank.id);
                                        setTitle(rank.thAbbrev);
                                        setTitleEn(rank.enAbbrev);
                                        setCustomTitle('');
                                        setIsDropdownOpen(false); // Close dropdown
                                      }}
                                      className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all cursor-pointer ${
                                        selectedSubTitleId === rank.id
                                          ? 'bg-neutral-955 text-white border-neutral-950 shadow-sm bg-neutral-950'
                                          : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between w-full">
                                        <span className="font-bold text-[11px] truncate max-w-[90px]">{rank.thFullName}</span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${selectedSubTitleId === rank.id ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-100 text-neutral-500'}`}>
                                          {rank.thAbbrev}
                                        </span>
                                      </div>
                                    </button>
                                  ))}
                                  {activeCategoryTab === 'police' && POLICE_RANKS.map(rank => (
                                    <button
                                      key={rank.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedSubTitleId(rank.id);
                                        setTitle(rank.thAbbrev);
                                        setTitleEn(rank.enAbbrev);
                                        setCustomTitle('');
                                        setIsDropdownOpen(false); // Close dropdown
                                      }}
                                      className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all cursor-pointer ${
                                        selectedSubTitleId === rank.id
                                          ? 'bg-neutral-955 text-white border-neutral-950 shadow-sm bg-neutral-950'
                                          : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between w-full">
                                        <span className="font-bold text-[11px] truncate max-w-[90px]">{rank.thFullName}</span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${selectedSubTitleId === rank.id ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-100 text-neutral-500'}`}>
                                          {rank.thAbbrev}
                                        </span>
                                      </div>
                                    </button>
                                  ))}
                                  {activeCategoryTab === 'academic' && (
                                    <>
                                      {ACADEMIC_TITLES.map(rank => (
                                        <button
                                          key={rank.id}
                                          type="button"
                                          onClick={() => {
                                            setSelectedSubTitleId(rank.id);
                                            setTitle(rank.thAbbrev);
                                            setTitleEn(rank.enAbbrev);
                                            setCustomTitle('');
                                            setIsDropdownOpen(false); // Close dropdown
                                          }}
                                          className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all cursor-pointer ${
                                            selectedSubTitleId === rank.id
                                              ? 'bg-neutral-955 text-white border-neutral-950 shadow-sm bg-neutral-950'
                                              : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between w-full">
                                            <span className="font-bold text-[11px] truncate max-w-[90px]">{rank.thFullName}</span>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${selectedSubTitleId === rank.id ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-100 text-neutral-500'}`}>
                                              {rank.thAbbrev}
                                            </span>
                                          </div>
                                        </button>
                                      ))}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedSubTitleId('custom');
                                          setTitle('อื่น ๆ (โปรดระบุ)');
                                          setTitleEn('');
                                        }}
                                        className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all cursor-pointer ${
                                          selectedSubTitleId === 'custom'
                                            ? 'bg-neutral-950 text-white border-neutral-950 shadow-sm'
                                            : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between w-full">
                                          <span className="font-bold text-[11px] truncate max-w-[90px]">{language === 'TH' ? 'ระบุเอง' : 'Custom'}</span>
                                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${selectedSubTitleId === 'custom' ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-100 text-neutral-500'}`}>
                                            ...
                                          </span>
                                        </div>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Custom Input Fields */}
                              {selectedSubTitleId === 'custom' && (
                                <div className="grid grid-cols-1 gap-3 p-3 bg-white rounded-lg border border-neutral-200 animate-fade-in">
                                  <div>
                                    <label className="block text-[10px] font-bold text-neutral-600 mb-1">
                                      {language === 'TH' ? 'ระบุคำนำหน้าอื่น ๆ (ไทย) *' : 'Custom Prefix (TH) *'}
                                    </label>
                                    <input
                                      type="text"
                                      required
                                      placeholder="เช่น ดร.ทพ. / ซิสเตอร์"
                                      value={customTitle}
                                      onChange={(e) => {
                                        setCustomTitle(e.target.value);
                                        setTitle('อื่น ๆ (โปรดระบุ)');
                                      }}
                                      className="w-full border border-neutral-300 px-3 py-1.5 rounded-md focus:outline-none focus:border-neutral-950 text-xs"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Selected Preview Banner */}
                              {selectedSubTitleId && selectedSubTitleId !== 'custom' && (
                                <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-neutral-200 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-neutral-500">{language === 'TH' ? 'เลือกแล้ว:' : 'Selected:'}</span>
                                    <span className="font-extrabold text-neutral-950 text-[12px] bg-neutral-100 px-2 py-0.5 rounded">
                                      {title}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">ชื่อจริง</label>
                      <input
                        id="firstNameThInput"
                        type="text"
                        required
                        placeholder={language === 'TH' ? 'ชื่อจริง (ภาษาไทย)' : 'First Name (Thai)'}
                        value={firstNameTh}
                        onChange={(e) => setFirstNameTh(e.target.value)}
                        className="w-full border border-neutral-300 px-4 py-2.5 rounded-lg focus:outline-none focus:border-neutral-900 text-xs"
                      />
                    </div>

                    {/* Additional Prefix Panel when selection is 'other' - Moved inside the custom dropdown popover */}
                    {false && selectedTitleId === 'other' && (
                      <div className="col-span-1 sm:col-span-2 bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-4 animate-fade-in text-neutral-900">
                        <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                          <span className="font-bold text-neutral-800 text-xs">
                            {language === 'TH' ? 'เลือกยศ / ยศทหาร / ยศตำรวจ / ตำแหน่งวิชาการ' : 'Select Rank / Military / Police / Academic Title'}
                          </span>
                          <span className="text-[10px] text-neutral-500 bg-white px-2 py-0.5 rounded-full border border-neutral-200 font-bold">
                            {language === 'TH' ? 'ดร. และอื่น ๆ' : 'Dr. and others'}
                          </span>
                        </div>

                        {/* Categories Tabs */}
                        <div className="flex flex-wrap gap-1 bg-neutral-100 p-1 rounded-lg">
                          {[
                            { id: 'army', label: 'ทหารบก', count: ARMY_RANKS.length },
                            { id: 'navy', label: 'ทหารเรือ', count: NAVY_RANKS.length },
                            { id: 'airforce', label: 'ทหารอากาศ', count: AIRFORCE_RANKS.length },
                            { id: 'police', label: 'ตำรวจ', count: POLICE_RANKS.length },
                            { id: 'academic', label: 'วิชาการ / อื่น ๆ', count: ACADEMIC_TITLES.length + 1 },
                          ].map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setActiveCategoryTab(cat.id as any)}
                              className={`flex-1 min-w-[70px] text-center py-1.5 px-2 rounded-md font-bold text-[10px] transition-all cursor-pointer ${
                                activeCategoryTab === cat.id
                                  ? 'bg-neutral-900 text-white shadow-sm'
                                  : 'text-neutral-500 hover:text-neutral-800'
                              }`}
                            >
                              {cat.label}
                            </button>
                          ))}
                        </div>

                        {/* Rank Grid */}
                        <div className="max-h-[220px] overflow-y-auto pr-1 space-y-2">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {/* Render ranks belonging to current active tab */}
                            {activeCategoryTab === 'army' && ARMY_RANKS.map(rank => (
                              <button
                                key={rank.id}
                                type="button"
                                onClick={() => {
                                  setSelectedSubTitleId(rank.id);
                                  setTitle(rank.thAbbrev);
                                  setTitleEn(rank.enAbbrev);
                                  setCustomTitle('');
                                }}
                                className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all cursor-pointer ${
                                  selectedSubTitleId === rank.id
                                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                                    : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="font-bold text-[11px] truncate max-w-[90px]">{rank.thFullName}</span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${selectedSubTitleId === rank.id ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-100 text-neutral-500'}`}>
                                    {rank.thAbbrev}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between w-full mt-1 border-t border-neutral-100 pt-0.5">
                                  <span className={`text-[9px] ${selectedSubTitleId === rank.id ? 'text-neutral-300' : 'text-neutral-400'} font-mono`}>
                                    EN: {rank.enAbbrev}
                                  </span>
                                </div>
                              </button>
                            ))}
                            {activeCategoryTab === 'navy' && NAVY_RANKS.map(rank => (
                              <button
                                key={rank.id}
                                type="button"
                                onClick={() => {
                                  setSelectedSubTitleId(rank.id);
                                  setTitle(rank.thAbbrev);
                                  setTitleEn(rank.enAbbrev);
                                  setCustomTitle('');
                                }}
                                className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all cursor-pointer ${
                                  selectedSubTitleId === rank.id
                                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                                    : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="font-bold text-[11px] truncate max-w-[90px]">{rank.thFullName}</span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${selectedSubTitleId === rank.id ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-100 text-neutral-500'}`}>
                                    {rank.thAbbrev}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between w-full mt-1 border-t border-neutral-100 pt-0.5">
                                  <span className={`text-[9px] ${selectedSubTitleId === rank.id ? 'text-neutral-300' : 'text-neutral-400'} font-mono`}>
                                    EN: {rank.enAbbrev}
                                  </span>
                                </div>
                              </button>
                            ))}
                            {activeCategoryTab === 'airforce' && AIRFORCE_RANKS.map(rank => (
                              <button
                                key={rank.id}
                                type="button"
                                onClick={() => {
                                  setSelectedSubTitleId(rank.id);
                                  setTitle(rank.thAbbrev);
                                  setTitleEn(rank.enAbbrev);
                                  setCustomTitle('');
                                }}
                                className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all cursor-pointer ${
                                  selectedSubTitleId === rank.id
                                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                                    : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="font-bold text-[11px] truncate max-w-[90px]">{rank.thFullName}</span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${selectedSubTitleId === rank.id ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-100 text-neutral-500'}`}>
                                    {rank.thAbbrev}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between w-full mt-1 border-t border-neutral-100 pt-0.5">
                                  <span className={`text-[9px] ${selectedSubTitleId === rank.id ? 'text-neutral-300' : 'text-neutral-400'} font-mono`}>
                                    EN: {rank.enAbbrev}
                                  </span>
                                </div>
                              </button>
                            ))}
                            {activeCategoryTab === 'police' && POLICE_RANKS.map(rank => (
                              <button
                                key={rank.id}
                                type="button"
                                onClick={() => {
                                  setSelectedSubTitleId(rank.id);
                                  setTitle(rank.thAbbrev);
                                  setTitleEn(rank.enAbbrev);
                                  setCustomTitle('');
                                }}
                                className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all cursor-pointer ${
                                  selectedSubTitleId === rank.id
                                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                                    : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="font-bold text-[11px] truncate max-w-[90px]">{rank.thFullName}</span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${selectedSubTitleId === rank.id ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-100 text-neutral-500'}`}>
                                    {rank.thAbbrev}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between w-full mt-1 border-t border-neutral-100 pt-0.5">
                                  <span className={`text-[9px] ${selectedSubTitleId === rank.id ? 'text-neutral-300' : 'text-neutral-400'} font-mono`}>
                                    EN: {rank.enAbbrev}
                                  </span>
                                </div>
                              </button>
                            ))}
                            {activeCategoryTab === 'academic' && (
                              <>
                                {ACADEMIC_TITLES.map(rank => (
                                  <button
                                    key={rank.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedSubTitleId(rank.id);
                                      setTitle(rank.thAbbrev);
                                      setTitleEn(rank.enAbbrev);
                                      setCustomTitle('');
                                    }}
                                    className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all cursor-pointer ${
                                      selectedSubTitleId === rank.id
                                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span className="font-bold text-[11px] truncate max-w-[90px]">{rank.thFullName}</span>
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${selectedSubTitleId === rank.id ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-100 text-neutral-500'}`}>
                                        {rank.thAbbrev}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between w-full mt-1 border-t border-neutral-100 pt-0.5">
                                      <span className={`text-[9px] ${selectedSubTitleId === rank.id ? 'text-neutral-300' : 'text-neutral-400'} font-mono`}>
                                        EN: {rank.enAbbrev}
                                      </span>
                                    </div>
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSubTitleId('custom');
                                    setTitle('อื่น ๆ (โปรดระบุ)');
                                    setTitleEn('');
                                  }}
                                  className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all cursor-pointer ${
                                    selectedSubTitleId === 'custom'
                                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                                      : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className="font-bold text-[11px] truncate max-w-[90px]">{language === 'TH' ? 'ระบุเอง' : 'Custom'}</span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${selectedSubTitleId === 'custom' ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-100 text-neutral-500'}`}>
                                      ...
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between w-full mt-1 border-t border-neutral-100 pt-0.5">
                                    <span className={`text-[9px] ${selectedSubTitleId === 'custom' ? 'text-neutral-300' : 'text-neutral-400'}`}>
                                      {language === 'TH' ? 'ระบุข้อความเอง' : 'Specify title'}
                                    </span>
                                  </div>
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Custom Input Fields */}
                        {selectedSubTitleId === 'custom' && (
                          <div className="p-3 bg-white rounded-lg border border-neutral-200 animate-fade-in">
                            <div>
                              <label className="block text-[10px] font-bold text-neutral-600 mb-1">
                                {language === 'TH' ? 'ระบุคำนำหน้าอื่น ๆ (ไทย) *' : 'Custom Prefix (TH) *'}
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="เช่น ดร.ทพ. / ซิสเตอร์"
                                value={customTitle}
                                onChange={(e) => {
                                  setCustomTitle(e.target.value);
                                  setTitle('อื่น ๆ (โปรดระบุ)');
                                }}
                                className="w-full border border-neutral-300 px-3 py-1.5 rounded-md focus:outline-none focus:border-neutral-900 text-xs"
                              />
                            </div>
                          </div>
                        )}

                        {/* Selected Preview Banner */}
                        {selectedSubTitleId && selectedSubTitleId !== 'custom' && (
                          <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-neutral-200 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-neutral-500">{language === 'TH' ? 'เลือกแล้ว:' : 'Selected:'}</span>
                              <span className="font-extrabold text-neutral-950 text-[12px] bg-neutral-100 px-2 py-0.5 rounded">
                                {title}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">นามสกุล</label>
                    <input
                      id="lastNameThInput"
                      type="text"
                      required
                      placeholder={language === 'TH' ? 'นามสกุล (ภาษาไทย)' : 'Last Name (Thai)'}
                      value={lastNameTh}
                      onChange={(e) => setLastNameTh(e.target.value)}
                      className="w-full border border-neutral-300 px-4 py-2.5 rounded-lg focus:outline-none focus:border-neutral-900 text-xs"
                    />
                  </div>
                </div>

                {/* Contact Phone & Digital Signature */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                      {language === 'TH' ? 'เบอร์ติดต่อ (ไม่บังคับ)' : 'Contact Phone (Optional)'}
                    </label>
                    <input
                      type="tel"
                      placeholder={language === 'TH' ? 'เช่น 0891234567' : 'e.g., 0891234567'}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full border border-neutral-300 px-4 py-2.5 rounded-lg focus:outline-none focus:border-neutral-900 text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-neutral-700">
                      {language === 'TH' ? 'เซ็นลายเซ็นอิเล็กทรอนิกส์ (Digital Signature Drawing) *' : 'Draw Digital Signature *'}
                    </label>
                    <SignaturePad 
                      onSave={(dataUrl) => setSignature(dataUrl)}
                      placeholder={language === 'TH' ? 'โปรดบรรจงเขียนลายเซ็นของคุณบนพื้นที่สี่เหลี่ยมด้านล่างเพื่อรับรองบัตรการช่าง' : 'Please draw your signature in the box below to verify your digital credentials'}
                    />
                  </div>
                </div>
                
            </div>
        )}

        {/* Step 4: Account Details */}
        {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-bold text-neutral-800 text-sm">
                {language === 'TH' ? 'ข้อมูลบัญชีผู้ใช้' : 'Account Details'}
              </h3>
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  {language === 'TH' ? 'อีเมลผู้ติดต่อ (Email) *' : 'Contact Email *'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                    <Mail size={12} />
                  </span>
                  <input
                    id="regEmailInput"
                    type="email"
                    required
                    placeholder={language === 'TH' ? 'เช่น student@amt.ac.th' : 'e.g. user@amt.ac.th'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-neutral-300 pl-8 pr-3 py-2.5 rounded-lg focus:outline-none focus:border-neutral-900 text-xs font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    {language === 'TH' ? 'รหัสผ่านล็อกอิน *' : 'Login Password *'}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                      <Key size={12} />
                    </span>
                    <input
                      id="regPasswordInput"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder={language === 'TH' ? 'อย่างต่ำ 4 หลัก' : 'Min 4 characters'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border border-neutral-300 pl-8 pr-10 py-2.5 rounded-lg focus:outline-none focus:border-neutral-900 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    {language === 'TH' ? 'ยืนยันรหัสผ่านอีกครั้ง *' : 'Confirm Password *'}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                      <Key size={12} />
                    </span>
                    <input
                      id="regConfirmPasswordInput"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      placeholder={language === 'TH' ? 'พิมพ์รหัสอีกครั้ง' : 'Recheck password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full border border-neutral-300 pl-8 pr-10 py-2.5 rounded-lg focus:outline-none focus:border-neutral-900 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* Step 5: Review Data */}
        {step === 5 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="font-bold text-neutral-800 text-sm">
              {language === 'TH' ? 'ตรวจสอบข้อมูลก่อนลงทะเบียน' : 'Review Information Before Submitting'}
            </h3>
            <div className="bg-neutral-50 p-5 rounded-xl border border-neutral-200 text-xs space-y-4">
              <div className="flex items-center gap-4 border-b border-neutral-200 pb-4">
                {photoUrl ? (
                  <img src={photoUrl} alt="Preview" className="w-20 h-20 object-cover rounded-full border border-neutral-300 shadow-sm" />
                ) : (
                  <div className="w-20 h-20 bg-neutral-200 rounded-full flex items-center justify-center text-neutral-400">No Photo</div>
                )}
                <div className="space-y-1">
                  <p className="text-sm font-bold text-neutral-900">{title} {firstNameTh} {lastNameTh}</p>
                  <p className="text-[11px] text-neutral-500 font-mono">ID: {id}</p>
                  <p className="text-[11px] bg-neutral-900 text-white px-2.5 py-0.5 rounded-full inline-block font-sans font-bold">
                    {tab === 'student' ? (language === 'TH' ? 'นักศึกษา' : 'Student') : instructorRole}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-neutral-500 block">{language === 'TH' ? 'อีเมลผู้ติดต่อ:' : 'Contact Email:'}</span>
                  <strong className="text-neutral-800 font-mono">{email}</strong>
                </div>
                <div>
                  <span className="text-neutral-500 block">{language === 'TH' ? 'เบอร์ติดต่อ:' : 'Phone:'}</span>
                  <strong className="text-neutral-800">{phone || '-'}</strong>
                </div>
              </div>

              {signature && (
                <div className="border-t border-neutral-200 pt-3">
                  <span className="text-neutral-500 block mb-1">{language === 'TH' ? 'ลายเซ็นรับรองความถูกต้อง:' : 'Verified Signature:'}</span>
                  <div className="bg-white border border-neutral-200 rounded-lg p-2 flex justify-center max-w-[180px]">
                    <img src={signature} alt="Signature" className="max-h-16" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 items-start p-3 bg-neutral-100 rounded-lg text-[10px] text-neutral-600 border border-neutral-200 mt-4 animate-fade-in">
              <ShieldAlert className="text-neutral-700 shrink-0 mt-0.5" size={14} />
              <p>
                {language === 'TH' 
                  ? '* ข้อมูลรหัสประจำตัวจะไม่สามารถเปลี่ยนภายหลังได้ เมื่อส่งข้อมูลแล้ว ระบบแอดมินจะต้องดำเนินการกดยอมรับแบบฟอร์มสัญญานี้ก่อน คุณถึงจะมีสิทธิ์เข้าใช้ระบบ AMT Connect' 
                  : '* Identification details cannot be altered after submission. Once submitted, collegiate administrators must verify & approve this registration form before you gain systems access to AMT Connect.'}
              </p>
            </div>
          </div>
        )}

        {/* Navigation & Submit Buttons */}
        {step !== 1 && (
            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={() => {
                  if (loadingButton) return;
                  setLoadingButton('back');
                  setTimeout(() => {
                    setStep(s => s - 1);
                    setLoadingButton(null);
                  }, 400);
                }}
                disabled={loadingButton !== null}
                className={`flex-1 px-4 py-3 bg-white border border-neutral-300 text-neutral-700 rounded-xl font-bold transition-all text-xs animate-fade-in flex items-center justify-center gap-2 ${
                  loadingButton !== null ? 'opacity-50 cursor-not-allowed' : 'hover:bg-neutral-100 cursor-pointer'
                }`}
              >
                {loadingButton === 'back' && <Loader2 className="animate-spin" size={14} />}
                <span>{language === 'TH' ? 'ย้อนกลับ' : 'Back'}</span>
              </button>
              
              {step < 5 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (loadingButton) return;
                    const err = getFormErrors(step);
                    if (err) {
                        Swal.fire({ icon: 'error', title: 'ข้อมูลไม่ครบถ้วน', text: err, confirmButtonColor: '#171717' });
                    } else {
                        setLoadingButton('next');
                        setTimeout(() => {
                            setStep(s => s + 1);
                            setLoadingButton(null);
                        }, 600);
                    }
                  }}
                  disabled={loadingButton !== null}
                  className={`flex-1 px-4 py-3 bg-[#171717] text-white rounded-xl font-bold shadow transition-all text-xs flex items-center justify-center gap-2 ${
                    loadingButton !== null ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black cursor-pointer'
                  }`}
                >
                  {loadingButton === 'next' && <Loader2 className="animate-spin" size={14} />}
                  <span>{language === 'TH' ? 'ถัดไป →' : 'Next →'}</span>
                </button>
              ) : (
                <button
                  id="submitRegBtn"
                  type="submit"
                  disabled={loadingButton !== null}
                  className={`flex-1 px-4 py-3 bg-[#171717] text-white rounded-xl font-bold shadow transition-all text-xs flex items-center justify-center gap-1.5 ${
                    loadingButton !== null ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black cursor-pointer'
                  }`}
                >
                  {loadingButton === 'submit' ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <UserCheck size={14} />
                  )}
                  <span>{language === 'TH' ? 'ส่งใบลงทะเบียน' : 'Submit Registration'}</span>
                </button>
              )}
            </div>
        )}
      </form>
    </div>
  );
}
