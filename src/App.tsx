/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, RoomRequest, RoomUsageRecord, Equipment, BorrowRecord, ClassSchedule, ExamSchedule, ExamGrade } from './types';
import { APIService, getAppOriginForQR, pullFromGoogleSheets, syncWithGoogleSheets, clearLocalStorageData } from './lib/api';
import RegistrationForms from './components/RegistrationForms';
import AdminPanel from './components/AdminPanel';
import TrainingManagerPanel from './components/TrainingManagerPanel';
import MaintenancePanel from './components/MaintenancePanel';
import ExamOfficeStudentPanel from './components/ExamOfficeStudentPanel';
import { StudentIdCard, RoomRequestDoc, RoomUsageRecordDoc, BulkRoomRequestsDoc, BulkStudentIdCards, ThalangLogo } from './components/Documents';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogIn, LogOut, ShieldAlert, Key, Users, BookOpen, 
  Settings, RefreshCw, Mail, CheckCircle, Info, Plane, Wrench,
  Camera, QrCode, Loader2, Eye, EyeOff, Lock, User as UserIcon, Menu, X,
  Home, Calendar, ClipboardList, FileText, MoreHorizontal, CheckSquare, FolderOpen, GraduationCap
} from 'lucide-react';

import { alerts as Swal } from './lib/alerts';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const getTimeBasedGreeting = (lang: 'TH' | 'EN') => {
  const hours = new Date().getHours();
  if (lang === 'TH') {
    if (hours >= 5 && hours < 11) return 'สวัสดีตอนเช้า';
    if (hours >= 11 && hours < 13) return 'สวัสดีตอนเที่ยง';
    if (hours >= 13 && hours < 17) return 'สวัสดีตอนบ่าย';
    if (hours >= 17 && hours < 19) return 'สวัสดีตอนเย็น';
    return 'สวัสดีตอนค่ำ';
  } else {
    if (hours >= 5 && hours < 11) return 'Good Morning';
    if (hours >= 11 && hours < 13) return 'Good Noon';
    if (hours >= 13 && hours < 17) return 'Good Afternoon';
    if (hours >= 17 && hours < 19) return 'Good Evening';
    return 'Good Night';
  }
};

export default function App() {
  // Database state
  const [db, setDb] = useState<ReturnType<typeof APIService.getDb>>(APIService.getDb());
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Load data from Google Sheets first on startup
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchInitialData = async () => {
      const startTime = Date.now();
      try {
        const fetchedData = await pullFromGoogleSheets();
        if (!active) return;
        
        if (fetchedData && typeof fetchedData === 'object') {
          const currentDb = APIService.getDb();
          const mergedDb = {
            users: fetchedData.users || currentDb.users,
            roomRequests: fetchedData.roomRequests || currentDb.roomRequests,
            roomUsageRecords: fetchedData.roomUsageRecords || currentDb.roomUsageRecords,
            equipment: fetchedData.equipment || currentDb.equipment,
            borrowRecords: fetchedData.borrowRecords || currentDb.borrowRecords,
            schedules: fetchedData.schedules || currentDb.schedules,
            examSchedules: fetchedData.examSchedules || currentDb.examSchedules,
            examGrades: fetchedData.examGrades || currentDb.examGrades,
          };
          APIService.saveDb(mergedDb);
          setDb(mergedDb);
        }
      } catch (err) {
        console.warn('Initial pull from Google Sheets failed:', err);
      } finally {
        if (active) {
          const elapsedTime = Date.now() - startTime;
          const remainingTime = Math.max(0, 5000 - elapsedTime);
          setTimeout(() => {
            if (active) {
              setIsInitialLoading(false);
            }
          }, remainingTime);
        }
      }
    };
    
    fetchInitialData();
    return () => {
      active = false;
    };
  }, []);

  // App navigation state: 'home' | 'dashboard' | 'register'
  const [currentScreen, setCurrentScreen] = useState<'home' | 'dashboard' | 'register'>('home');
  const [adminSubTab, setAdminSubTab] = useState<'home' | 'users' | 'rooms' | 'records' | 'verify'>('home');
  const [studentActiveTab, setStudentActiveTab] = useState<'home' | 'profile' | 'action' | 'schedule' | 'scheduleTeach' | 'examSchedule' | 'examGrade' | 'academic' | 'borrow' | 'roster' | 'requests'>('home');
  const [instActionTab, setInstActionTab] = useState<'schedule' | 'room'>('schedule');
  const [maintActiveTab, setMaintActiveTab] = useState<'home' | 'profile' | 'certify' | 'equipment' | 'returns' | 'calibration' | 'documents' | 'request' | 'myDocs'>('home');
  const [trainingActiveTab, setTrainingActiveTab] = useState<'home' | 'profile' | 'request' | 'schedules' | 'status' | 'personnel' | 'myDocs' | 'docs' | 'approvals'>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const mobileTabs = React.useMemo(() => {
    if (!currentUser || currentScreen === 'home') return [];

    const role = currentUser.role;

    if (role === 'Admin') {
      return [
        {
          id: 'home',
          labelTh: 'หน้าแรก',
          labelEn: 'Home',
          icon: <Home size={18} />,
          action: () => setAdminSubTab('home'),
          isActive: adminSubTab === 'home',
        },
        {
          id: 'users',
          labelTh: 'ผู้ใช้งาน',
          labelEn: 'Users',
          icon: <Users size={18} />,
          action: () => setAdminSubTab('users'),
          isActive: adminSubTab === 'users',
        },
        {
          id: 'rooms',
          labelTh: 'ข้อมูลห้อง',
          labelEn: 'Rooms',
          icon: <BookOpen size={18} />,
          action: () => setAdminSubTab('rooms'),
          isActive: adminSubTab === 'rooms',
        },
        {
          id: 'records',
          labelTh: 'เอกสาร',
          labelEn: 'Docs',
          icon: <FileText size={18} />,
          action: () => setAdminSubTab('records'),
          isActive: adminSubTab === 'records',
        },
      ];
    }

    if (role === 'Maintenance Manager' || role === 'Maintenance Staff') {
      return [
        {
          id: 'home',
          labelTh: 'หน้าแรก',
          labelEn: 'Home',
          icon: <Home size={18} />,
          action: () => setMaintActiveTab('home'),
          isActive: maintActiveTab === 'home',
        },
        {
          id: 'request',
          labelTh: 'ขอใช้ห้อง',
          labelEn: 'Request',
          icon: <ClipboardList size={18} />,
          action: () => setMaintActiveTab('request'),
          isActive: maintActiveTab === 'request',
        },
        {
          id: 'myDocs',
          labelTh: 'คำขอของฉัน',
          labelEn: 'My Requests',
          icon: <FileText size={18} />,
          action: () => setMaintActiveTab('myDocs'),
          isActive: maintActiveTab === 'myDocs',
        },
        {
          id: 'returns',
          labelTh: 'ตรวจรับคืน',
          labelEn: 'Returns',
          icon: <CheckCircle size={18} />,
          action: () => setMaintActiveTab('returns'),
          isActive: maintActiveTab === 'returns',
        },
        {
          id: 'certify',
          labelTh: 'ความพร้อมห้อง',
          labelEn: 'Readiness',
          icon: <CheckSquare size={18} />,
          action: () => setMaintActiveTab('certify'),
          isActive: maintActiveTab === 'certify',
        },
        {
          id: 'equipment',
          labelTh: 'อุปกรณ์',
          labelEn: 'Equipment',
          icon: <Wrench size={18} />,
          action: () => setMaintActiveTab('equipment'),
          isActive: maintActiveTab === 'equipment',
        },
        {
          id: 'calibration',
          labelTh: 'Calibrate',
          labelEn: 'Calibration',
          icon: <RefreshCw size={18} />,
          action: () => setMaintActiveTab('calibration'),
          isActive: maintActiveTab === 'calibration',
        },
        {
          id: 'documents',
          labelTh: 'คำขอทั้งหมด',
          labelEn: 'All Requests',
          icon: <FolderOpen size={18} />,
          action: () => setMaintActiveTab('documents'),
          isActive: maintActiveTab === 'documents',
        },
      ];
    }

    if (role === 'Training Manager') {
      return [
        {
          id: 'home',
          labelTh: 'หน้าแรก',
          labelEn: 'Home',
          icon: <Home size={18} />,
          action: () => setTrainingActiveTab('home'),
          isActive: trainingActiveTab === 'home',
        },
        {
          id: 'schedules',
          labelTh: 'ตารางเรียน',
          labelEn: 'Schedules',
          icon: <Calendar size={18} />,
          action: () => setTrainingActiveTab('schedules'),
          isActive: trainingActiveTab === 'schedules',
        },
        {
          id: 'request',
          labelTh: 'ขอใช้ห้อง',
          labelEn: 'Request',
          icon: <ClipboardList size={18} />,
          action: () => setTrainingActiveTab('request'),
          isActive: trainingActiveTab === 'request',
        },
        {
          id: 'myDocs',
          labelTh: 'คำขอของฉัน',
          labelEn: 'My Requests',
          icon: <FileText size={18} />,
          action: () => setTrainingActiveTab('myDocs'),
          isActive: trainingActiveTab === 'myDocs',
        },
        {
          id: 'status',
          labelTh: 'ข้อมูล นศ.',
          labelEn: 'Students',
          icon: <Users size={18} />,
          action: () => setTrainingActiveTab('status'),
          isActive: trainingActiveTab === 'status',
        },
        {
          id: 'personnel',
          labelTh: 'บุคลากร',
          labelEn: 'Personnel',
          icon: <Users size={18} />,
          action: () => setTrainingActiveTab('personnel'),
          isActive: trainingActiveTab === 'personnel',
        },
        {
          id: 'docs',
          labelTh: 'คำขอทั้งหมด',
          labelEn: 'All Requests',
          icon: <FolderOpen size={18} />,
          action: () => setTrainingActiveTab('docs'),
          isActive: trainingActiveTab === 'docs',
        },
        {
          id: 'approvals',
          labelTh: 'อนุมัติสิทธิ์',
          labelEn: 'Approvals',
          icon: <Key size={18} />,
          action: () => setTrainingActiveTab('approvals'),
          isActive: trainingActiveTab === 'approvals',
        },
      ];
    }

    if (role === 'Training Staff') {
      return [
        {
          id: 'home',
          labelTh: 'หน้าแรก',
          labelEn: 'Home',
          icon: <Home size={18} />,
          action: () => setTrainingActiveTab('home'),
          isActive: trainingActiveTab === 'home',
        },
        {
          id: 'schedules',
          labelTh: 'ตารางเรียน',
          labelEn: 'Schedules',
          icon: <Calendar size={18} />,
          action: () => setTrainingActiveTab('schedules'),
          isActive: trainingActiveTab === 'schedules',
        },
        {
          id: 'request',
          labelTh: 'ขอใช้ห้อง',
          labelEn: 'Request',
          icon: <ClipboardList size={18} />,
          action: () => setTrainingActiveTab('request'),
          isActive: trainingActiveTab === 'request',
        },
        {
          id: 'myDocs',
          labelTh: 'คำขอของฉัน',
          labelEn: 'My Requests',
          icon: <FileText size={18} />,
          action: () => setTrainingActiveTab('myDocs'),
          isActive: trainingActiveTab === 'myDocs',
        },
        {
          id: 'status',
          labelTh: 'ข้อมูล นศ.',
          labelEn: 'Students',
          icon: <Users size={18} />,
          action: () => setTrainingActiveTab('status'),
          isActive: trainingActiveTab === 'status',
        },
        {
          id: 'personnel',
          labelTh: 'บุคลากร',
          labelEn: 'Personnel',
          icon: <Users size={18} />,
          action: () => setTrainingActiveTab('personnel'),
          isActive: trainingActiveTab === 'personnel',
        },
        {
          id: 'approvals',
          labelTh: 'อนุมัติสิทธิ์',
          labelEn: 'Approvals',
          icon: <Key size={18} />,
          action: () => setTrainingActiveTab('approvals'),
          isActive: trainingActiveTab === 'approvals',
        },
      ];
    }

    if (role === 'Office Manager' || role === 'Office Staff') {
      return [
        {
          id: 'home',
          labelTh: 'หน้าแรก',
          labelEn: 'Home',
          icon: <Home size={18} />,
          action: () => setStudentActiveTab('home'),
          isActive: studentActiveTab === 'home',
        },
        {
          id: 'schedule',
          labelTh: 'จัดตาราง',
          labelEn: 'Schedules',
          icon: <Calendar size={18} />,
          action: () => { setStudentActiveTab('action'); setInstActionTab('schedule'); },
          isActive: studentActiveTab === 'action' && instActionTab === 'schedule',
        },
        {
          id: 'room',
          labelTh: 'ขอใช้ห้อง',
          labelEn: 'Request',
          icon: <ClipboardList size={18} />,
          action: () => { setStudentActiveTab('action'); setInstActionTab('room'); },
          isActive: studentActiveTab === 'action' && instActionTab === 'room',
        },
        {
          id: 'requests',
          labelTh: 'คำขอของฉัน',
          labelEn: 'My Requests',
          icon: <FileText size={18} />,
          action: () => setStudentActiveTab('requests'),
          isActive: studentActiveTab === 'requests',
        },
      ];
    }

    if (role === 'Examination Manager' || role === 'Examination Staff') {
      return [
        {
          id: 'home',
          labelTh: 'หน้าแรก',
          labelEn: 'Home',
          icon: <Home size={18} />,
          action: () => setStudentActiveTab('home'),
          isActive: studentActiveTab === 'home',
        },
        {
          id: 'academic',
          labelTh: 'ตารางเรียน',
          labelEn: 'Schedules',
          icon: <Calendar size={18} />,
          action: () => setStudentActiveTab('academic'),
          isActive: studentActiveTab === 'academic',
        },
        {
          id: 'exam',
          labelTh: 'นัดสอบ/คะแนน',
          labelEn: 'Exams',
          icon: <GraduationCap size={18} />,
          action: () => { setStudentActiveTab('action'); setInstActionTab('schedule'); },
          isActive: studentActiveTab === 'action' && instActionTab !== 'room',
        },
        {
          id: 'room',
          labelTh: 'ขอใช้ห้อง',
          labelEn: 'Request',
          icon: <ClipboardList size={18} />,
          action: () => { setStudentActiveTab('action'); setInstActionTab('room'); },
          isActive: studentActiveTab === 'action' && instActionTab === 'room',
        },
        {
          id: 'requests',
          labelTh: 'คำขอของฉัน',
          labelEn: 'My Requests',
          icon: <FileText size={18} />,
          action: () => setStudentActiveTab('requests'),
          isActive: studentActiveTab === 'requests',
        },
      ];
    }

    if (role === 'นักศึกษา') {
      return [
        {
          id: 'home',
          labelTh: 'หน้าแรก',
          labelEn: 'Home',
          icon: <Home size={18} />,
          action: () => setStudentActiveTab('home'),
          isActive: studentActiveTab === 'home',
        },
        {
          id: 'borrow',
          labelTh: 'เบิก/คืน',
          labelEn: 'Borrow',
          icon: <Wrench size={18} />,
          action: () => setStudentActiveTab('borrow'),
          isActive: studentActiveTab === 'borrow',
        },
        {
          id: 'roster',
          labelTh: 'เพื่อนร่วมรุ่น',
          labelEn: 'Classmates',
          icon: <Users size={18} />,
          action: () => setStudentActiveTab('roster'),
          isActive: studentActiveTab === 'roster',
        },
        {
          id: 'action',
          labelTh: 'ขอใช้ห้อง',
          labelEn: 'Request',
          icon: <ClipboardList size={18} />,
          action: () => setStudentActiveTab('action'),
          isActive: studentActiveTab === 'action',
        },
        {
          id: 'requests',
          labelTh: 'คำขอของฉัน',
          labelEn: 'My Requests',
          icon: <FileText size={18} />,
          action: () => setStudentActiveTab('requests'),
          isActive: studentActiveTab === 'requests',
        },
      ];
    }

    if (role === 'Instructor') {
      return [
        {
          id: 'home',
          labelTh: 'หน้าแรก',
          labelEn: 'Home',
          icon: <Home size={18} />,
          action: () => setStudentActiveTab('home'),
          isActive: studentActiveTab === 'home',
        },
        {
          id: 'borrow',
          labelTh: 'เบิก/คืน',
          labelEn: 'Borrow',
          icon: <Wrench size={18} />,
          action: () => setStudentActiveTab('borrow'),
          isActive: studentActiveTab === 'borrow',
        },
        {
          id: 'roster',
          labelTh: 'บุคลากร',
          labelEn: 'Personnel',
          icon: <Users size={18} />,
          action: () => setStudentActiveTab('roster'),
          isActive: studentActiveTab === 'roster',
        },
        {
          id: 'action',
          labelTh: 'ขอใช้ห้อง',
          labelEn: 'Request',
          icon: <ClipboardList size={18} />,
          action: () => { setStudentActiveTab('action'); setInstActionTab('room'); },
          isActive: studentActiveTab === 'action',
        },
        {
          id: 'requests',
          labelTh: 'คำขอของฉัน',
          labelEn: 'My Requests',
          icon: <FileText size={18} />,
          action: () => setStudentActiveTab('requests'),
          isActive: studentActiveTab === 'requests',
        },
      ];
    }

    return [];
  }, [currentUser, currentScreen, adminSubTab, maintActiveTab, trainingActiveTab, studentActiveTab, instActionTab]);

  const isHomeActive = React.useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === 'Admin') return adminSubTab === 'home';
    if (currentUser.role === 'Maintenance Manager' || currentUser.role === 'Maintenance Staff') return maintActiveTab === 'home';
    if (currentUser.role === 'Training Manager' || currentUser.role === 'Training Staff') return trainingActiveTab === 'home';
    return studentActiveTab === 'home';
  }, [currentUser, adminSubTab, maintActiveTab, trainingActiveTab, studentActiveTab]);

  // Current app display language
  const [appLanguage, setAppLanguage] = useState<'TH' | 'EN'>(() => {
    return (localStorage.getItem('appLanguage') as 'TH' | 'EN') || 'TH';
  });

  useEffect(() => {
    localStorage.setItem('appLanguage', appLanguage);
  }, [appLanguage]);

  // Floating printable dialog overlays state
  const [activeCardUser, setActiveCardUser] = useState<User | null>(null);
  const [bulkCardUsers, setBulkCardUsers] = useState<User[] | null>(null);
  const [activeRequestDoc, setActiveRequestDoc] = useState<RoomRequest | null>(null);
  const [bulkRequestDocs, setBulkRequestDocs] = useState<RoomRequest[] | null>(null);
  const [showUsageRecordDoc, setShowUsageRecordDoc] = useState(false);

  const welcomeBanner = React.useMemo(() => {
    if (!currentUser || !isHomeActive) return null;
    return (
      <div className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs">
        <div>
          <span className="bg-slate-100 text-slate-700 uppercase tracking-widest font-mono text-[9px] font-extrabold px-2.5 py-1 rounded-full border border-slate-200 shadow-3xs">
            {currentUser.role} AREA BOARD
          </span>
          <h3 className="font-sans font-extrabold text-slate-900 text-base sm:text-lg mt-1.5">
            {getTimeBasedGreeting(appLanguage)}, {currentUser.languagePreference === 'EN' && currentUser.firstName ? `${currentUser.title || ''} ${currentUser.firstName} ${currentUser.lastName}` : `${currentUser.title || ''} ${currentUser.firstNameTh || currentUser.firstName} ${currentUser.lastNameTh || currentUser.lastName}`}
          </h3>
        </div>
        {currentUser.role !== 'Admin' && (
          <button 
            onClick={() => setActiveCardUser(currentUser)}
            className="text-[10px] bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 font-bold transition-all text-slate-700 shadow-3xs"
          >
            {appLanguage === 'TH' ? 'บัตรประจำตัวของฉัน' : 'My ID Card'}
          </button>
        )}
      </div>
    );
  }, [currentUser, isHomeActive, appLanguage]);

  // Input states for login screen
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState(false);

  // Login QR code Scanner interface states
  const [loginMethod, setLoginMethod] = useState<'password' | 'qr'>('password');
  const [isLoginCameraActive, setIsLoginCameraActive] = useState(false);
  const [loginCameraFacingMode, setLoginCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [loginCameraError, setLoginCameraError] = useState<string | null>(null);
  const [scannedUser, setScannedUser] = useState<User | null>(null);

  // Parse QR link verification from search query parameters or direct URL pathname segment on app load
  useEffect(() => {
    if (isInitialLoading) return;
    const params = new URLSearchParams(window.location.search);
    let idParam = params.get('id') || params.get('verifyId') || params.get('data');

    // Extrapolate the ID from the pathname if no valid query parameter is passed
    if (!idParam) {
      const pathSegment = window.location.pathname.replace(/^\/|\/$/g, '').trim();
      const reservedPaths = ['home', 'register', 'dashboard', 'index.html'];
      if (pathSegment && !reservedPaths.includes(pathSegment.toLowerCase())) {
        idParam = pathSegment;
      }
    }

    if (idParam) {
      const cleanId = idParam.trim().replace(/^['"]|['"]$/g, '').trim();
      
      // A. Check if the ID belongs to a registered User
      const foundUser = db.users.find(u => {
        const uIdClean = String(u.id || '').trim().toLowerCase();
        const scannedIdClean = cleanId.toLowerCase();
        return uIdClean === scannedIdClean || uIdClean === scannedIdClean.replace(/\D/g, '') || scannedIdClean === uIdClean.replace(/\D/g, '');
      });

      if (foundUser) {
        // Safe clean url to keep URL tidy as a real-world system
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);

        // Strict security status checks
        if (foundUser.status === 'Pending') {
          Swal.fire({
            icon: 'warning',
            title: 'บัญชีอยู่ระหว่างรออนุมัติ',
            text: 'สถานะของท่าน: กำลังรอการอนุมัติโปรดติดต่อผู้บริหารระบบ',
            confirmButtonColor: '#0F172A'
          });
          return;
        }
        if (foundUser.status === 'พ้นสภาพ') {
          Swal.fire({
            icon: 'error',
            title: 'บัญชีผู้ใช้นี้พ้นสภาพแล้ว',
            text: 'สถานะของท่าน: พ้นสภาพนักศึกษา/บุคคลากร และไม่สามารถเข้าสู่ระบบได้ โปรดติดต่อแผนกทะเบียน',
            confirmButtonColor: '#0F172A'
          });
          return;
        }
        if (foundUser.status === 'พักการเรียน') {
          Swal.fire({
            icon: 'error',
            title: 'บัญชีถูกระงับชั่วคราว',
            text: 'สถานะของท่าน: พักการเรียน และไม่สามารถเข้าสู่ระบบได้',
            confirmButtonColor: '#0F172A'
          });
          return;
        }
        if (foundUser.status === 'จบการศึกษา') {
          Swal.fire({
            icon: 'error',
            title: 'บัญชีพ้นฐานพอร์ทัลหลัก',
            text: 'สถานะของท่าน: จบการศึกษา และไม่สามารถเข้าใช้งานระบบควบคุมได้',
            confirmButtonColor: '#0F172A'
          });
          return;
        }

        // Automatic secure login redirection
        setCurrentUser(foundUser);
        setCurrentScreen('dashboard');

        // Automatically trigger complete document Student/Staff ID Card popup overlay on top!
        setActiveCardUser(foundUser);

        let statusBg = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold';
        let statusText = 'อนุมัติเรียบร้อย (Active)';

        Swal.fire({
          title: '📌 เข้าสู่ระบบสำเร็จ (TLTC Verified)',
          html: `
            <div class="flex flex-col items-center text-center space-y-4 font-sans select-none my-2 p-1">
              ${foundUser.photoUrl ? `
                <img src="${foundUser.photoUrl}" alt="Photo" class="w-24 h-28 object-cover rounded-lg border-2 border-slate-900 shadow-md" referrerPolicy="no-referrer" />
              ` : `
                <div class="w-24 h-28 bg-slate-200 rounded-lg flex items-center justify-center text-slate-500 font-extrabold text-3xl border border-slate-300">
                  ${(foundUser.firstNameTh || foundUser.firstName || 'U').charAt(0)}
                </div>
              `}
              <div class="space-y-1">
                <h4 class="font-bold text-base text-slate-950">${foundUser.title || ''}${foundUser.firstNameTh || ''} ${foundUser.lastNameTh || ''}</h4>
                <p class="text-xs text-slate-500 font-mono">ID: ${foundUser.id}</p>
                <p class="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-250 inline-block mt-1">${foundUser.role}</p>
              </div>

              <div class="w-full border-t border-neutral-200 my-1 pt-3.5 space-y-2 text-left">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-neutral-500">สถานภาพความมั่นคง:</span>
                  <span class="px-2 py-0.5 rounded border text-[11px] ${statusBg}">${statusText}</span>
                </div>
                ${foundUser.batch ? `
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-neutral-500">รุ่น/ห้องเรียน:</span>
                    <span class="font-mono text-neutral-800 font-bold">Class ${foundUser.batch}</span>
                  </div>
                ` : ''}
                <div class="flex items-center justify-between text-xs">
                  <span class="text-neutral-500 font-sans">ลงทะเบียน ณ วันที่:</span>
                  <span class="font-mono text-neutral-800">${foundUser.createdAt}</span>
                </div>
              </div>

              <p class="text-[9.5px] text-slate-400 font-sans text-center leading-normal max-w-[280px]">
                สแกนแผงตรวจสอบความเสถียร ระบบได้ทำการยืนยันสิทธิ์และเปิดใช้งานแดชบอร์ดตามฐานสิทธิ์เรียบร้อยแล้ว
              </p>
            </div>
          `,
          confirmButtonText: 'เข้าชมพอร์ทัลระบบของฉัน',
          confirmButtonColor: '#0F172A'
        });
        return;
      }

      // B. Check if the ID belongs to a Room Request
      const foundRequest = db.roomRequests.find(r => {
        const rIdClean = String(r.id || '').trim().toLowerCase();
        const scannedIdClean = cleanId.toLowerCase();
        return rIdClean === scannedIdClean;
      });

      if (foundRequest) {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);

        // Open Room Request document directly!
        setActiveRequestDoc(foundRequest);

        // Find associated user to set as current logged-in context if possible
        const associatedUser = db.users.find(u => u.id === foundRequest.requesterId);
        if (associatedUser) {
          setCurrentUser(associatedUser);
          setCurrentScreen('dashboard');
        }
        return;
      }

      // C. Otherwise, clean parameters and raise an errors alert
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      Swal.fire({
        icon: 'error',
        title: 'ไม่พบคิวอาร์หรือรหัสคีย์สิทธิ์นี้',
        text: `ข้อมูลรหัสประจำสิทธิ์หรือใบขอใช้อาคารไม่ถูกต้อง: ${cleanId}`,
        confirmButtonColor: '#0F172A'
      });
    }
  }, [db, isInitialLoading]);

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    let isMounted = true;
    let lastScannedText = '';
    let lastScanTime = 0;

    if (isLoginCameraActive && loginMethod === 'qr') {
      setLoginCameraError(null);
      
      const startScanner = async () => {
        // Wait briefly for React to render the scanner container div
        await new Promise((resolve) => setTimeout(resolve, 300));
        if (!isMounted) return;

        try {
          const container = document.getElementById('login-qr-reader');
          if (!container) {
            throw new Error('ไม่พบตำแหน่งแผงแสดงผลกล้องเครื่องสแกน');
          }
          
          html5QrCode = new Html5Qrcode('login-qr-reader');
          await html5QrCode.start(
            { facingMode: { exact: loginCameraFacingMode } },
            {
              fps: 15,
              qrbox: (w, h) => {
                const size = Math.max(120, Math.min(w, h, 250));
                return { width: size, height: size };
              }
            },
            (decodedText) => {
              const now = Date.now();
              if (decodedText === lastScannedText && now - lastScanTime < 3000) {
                return; // Prevent repeating scans of the same item within 3s
              }
              lastScannedText = decodedText;
              lastScanTime = now;
              handleQRLoginSubmit(decodedText);
            },
            () => {
              // Quietly bypass non-matches
            }
          );
        } catch (err: any) {
          console.error('Error starting Login Html5Qrcode engine:', err);
          setLoginCameraError(err.message || 'ไม่สามารถเข้าถึงอุปกรณ์กล้องได้ โปรดอนุมัติสิทธิ์การใช้งานกล้องในเบราว์เซอร์');
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
  }, [isLoginCameraActive, loginMethod, loginCameraFacingMode]);

  const handleQRLoginSubmit = async (qrData: string) => {
    const cleanQR = qrData.trim();
    let parsedId = '';

    // Show high-end loading popup to pull latest database entries before verifying credentials
    Swal.fire({
      title: 'กำลังตรวจสอบระบบความปลอดภัย...',
      text: 'ระบบกำลังดึงข้อมูลรายชื่อผู้เข้าใช้และสิทธิ์การอนุมัติล่าสุดจาก Google Sheets โปรดรอสักครู่...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Synchronously pull latest database state
    await pullLatestData(true);

    Swal.close();

    // Advanced Robust URL & Parameter parsing
    // 1. Try standard browser URL parsing first (extremely reliable for full verification links)
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
        console.error("Standard URL parsing error, falling back to regex regex:", e);
      }
    }

    // 2. Regular expression fallback if standard URL parsing didn't find the ID
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
        console.error("Regex extraction error:", e);
      }
    }

    // 3. Last path segment fallback (e.g. https://domain/user/67010214)
    if (!parsedId) {
      if (cleanQR.includes('/') && !cleanQR.endsWith('/')) {
        const lastSlash = cleanQR.lastIndexOf('/');
        const segment = cleanQR.substring(lastSlash + 1).trim();
        if (segment && segment.length >= 4 && !segment.includes('?') && !segment.includes('&')) {
          parsedId = segment;
        }
      }
    }

    // 4. Default to the whole scanned QR string if no URL syntax found
    if (!parsedId) {
      parsedId = cleanQR;
    }

    // 5. Clean legacy prefixes
    if (parsedId.toUpperCase().includes('AMT-CONNECT-VERIFY:')) {
      const parts = parsedId.split(/AMT-CONNECT-VERIFY:/i);
      if (parts && parts[1]) {
        parsedId = parts[1];
      }
    }

    // Trim and clean possible enclosing quotes
    parsedId = parsedId.trim().replace(/^['"\[\]]|['"\[\]]$/g, '').trim();

    // Re-verify the DB from disk just to be absolutely sure we're checking against fresh sync results
    const freshDb = APIService.getDb();
    const found = freshDb.users.find(u => {
      const uIdClean = String(u.id || '').trim().toLowerCase();
      const scannedIdClean = parsedId.toLowerCase();
      return uIdClean === scannedIdClean || uIdClean === scannedIdClean.replace(/\D/g, '') || scannedIdClean === uIdClean.replace(/\D/g, '');
    });

    if (found) {
      // Ensure we validate their account security status first
      if (found.status === 'Pending') {
        Swal.fire({
          icon: 'warning',
          title: 'บัญชีอยู่ระหว่างรออนุมัติ',
          text: 'สถานะของท่าน: กำลังรอการอนุมัติโปรดติดต่อผู้บริหารระบบ',
          confirmButtonColor: '#0F172A'
        });
        return;
      }
      if (found.status === 'พ้นสภาพ') {
        Swal.fire({
          icon: 'error',
          title: 'บัญชีผู้ใช้นี้พ้นสภาพแล้ว',
          text: 'สถานะของท่าน: พ้นสภาพนักศึกษา/บุคคลากร และไม่สามารถเข้าสู่ระบบได้',
          confirmButtonColor: '#0F172A'
        });
        return;
      }
      if (found.status === 'พักการเรียน') {
        Swal.fire({
          icon: 'error',
          title: 'บัญชีถูกระงับชั่วคราว',
          text: 'สถานะของท่าน: พักการเรียน และไม่สามารถเข้าสู่ระบบได้',
          confirmButtonColor: '#0F172A'
        });
        return;
      }
      if (found.status === 'จบการศึกษา') {
        Swal.fire({
          icon: 'error',
          title: 'บัญชีพ้นฐานพอร์ทัลหลัก',
          text: 'สถานะของท่าน: จบการศึกษา และไม่สามารถเข้าใช้งานระบบควบคุมได้',
          confirmButtonColor: '#0F172A'
        });
        return;
      }

      // Prompt confirmation before logging in to verify user identity
      Swal.fire({
        title: 'ยืนยันตัวตนผู้ใช้ระบบ',
        html: `
          <div class="flex flex-col items-center space-y-4 font-sans select-none my-2 p-1 text-center">
            ${found.photoUrl ? `
              <img src="${found.photoUrl}" alt="Profile" class="w-24 h-24 rounded-full object-cover border-4 border-slate-100 shadow-md" referrerPolicy="no-referrer" />
            ` : `
              <div class="w-24 h-24 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center border border-dashed border-slate-300">
                <span class="text-xs uppercase font-extrabold text-slate-500">${found.firstName.charAt(0)}</span>
              </div>
            `}
            <div>
              <h3 class="text-sm font-bold text-slate-800">คุณคือ ${found.title || ''} ${(found.firstNameTh || found.firstName) ? `${found.firstNameTh || found.firstName} ${found.lastNameTh || found.lastName || ''}` : 'ผู้ใช้งาน'} ใช่หรือไม่?</h3>
              <p class="text-xs text-slate-500 mt-1">ตำแหน่ง: <span class="font-bold text-slate-700">${found.role}</span> | รหัส: <span class="font-mono text-slate-700">${found.id}</span></p>
            </div>
            <p class="text-[10px] text-slate-400 font-sans tracking-wide leading-normal max-w-[280px]">
              โปรดยืนยันตัวตนของคุณเพื่อความปลอดภัยก่อนเข้าใช้งานแดชบอร์ดพอร์ทัล
            </p>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ใช่, ฉันเอง',
        cancelButtonText: 'ไม่ใช่ฉัน',
        confirmButtonColor: '#0F172A',
        cancelButtonColor: '#64748B'
      }).then((result) => {
        if (result.isConfirmed) {
          setIsLoginCameraActive(false);
          setScannedUser(null);
          setCurrentUser(found);
          setCurrentScreen('dashboard');

          Swal.fire({
            icon: 'success',
            title: 'เข้าสู่ระบบสำเร็จผ่านคิวอาร์โค้ด',
            text: `ยินดีต้อนรับคุณ ${found.title ? found.title + ' ' : ''}${found.firstName} ${found.lastName} (${found.role})`,
            timer: 1800,
            showConfirmButton: false
          });
        }
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'ไม่พบคิวอาร์โค้ดสิทธิ์นี้',
        html: `
          <div class="text-left text-xs space-y-2 select-text font-sans">
            <p><strong>รหัสประจำตัวที่ถอดความได้:</strong> <code class="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono text-xs font-bold">${parsedId || 'ว่างเปล่า'}</code></p>
            <p class="text-slate-500 text-[11px] leading-relaxed">
              ไม่พบรหัสคิวอาร์นี้ในฐานข้อมูลโรงเรียนช่างการบินชลบุรี หรือรูปแบบข้อมูลคิวอาร์ไม่ได้รับสิทธิ์ตรวจสอบ
            </p>
            <p class="text-slate-400 text-[10px] break-all font-mono">ข้อมูลสแกนดิบ (Raw): "${qrData}"</p>
          </div>
        `,
        confirmButtonColor: '#0F172A'
      });
    }
  };

  // Overlays state values synced early

  // Sync state polling
  const [syncStatus, setSyncStatus] = useState(APIService.getLastSyncStatus());

  useEffect(() => {
    // Sync status checker loop
    const interval = setInterval(() => {
      setSyncStatus(APIService.getLastSyncStatus());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Real-time data polling loop (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentUser) {
        pullLatestData(true);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Update central state and auto-save
  const updateDb = async (newDb: typeof db) => {
    setDb(newDb);
    APIService.saveDb(newDb);

    try {
      await syncWithGoogleSheets(newDb);
    } catch (err) {
      console.warn('Background sync on update failed:', err);
    }
  };

  const pullLatestData = async (quiet = false): Promise<boolean> => {
    if (!quiet) {
      Swal.fire({
        title: 'กำลังเตรียม Form เพื่อลงทะเบียน',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
    }

    try {
      const fetchedData = await pullFromGoogleSheets();
      if (fetchedData && typeof fetchedData === 'object') {
        const currentDb = APIService.getDb();
        const mergedDb = {
          ...currentDb,
          users: fetchedData.users || currentDb.users,
          roomRequests: fetchedData.roomRequests || currentDb.roomRequests,
          roomUsageRecords: fetchedData.roomUsageRecords || currentDb.roomUsageRecords,
          equipment: fetchedData.equipment || currentDb.equipment,
          borrowRecords: fetchedData.borrowRecords || currentDb.borrowRecords,
          schedules: fetchedData.schedules || currentDb.schedules,
          examSchedules: fetchedData.examSchedules || currentDb.examSchedules,
          examGrades: fetchedData.examGrades || currentDb.examGrades,
        };
        APIService.saveDb(mergedDb);
        setDb(mergedDb);
        return true;
      }
    } catch (err) {
      console.warn('Pulling latest user data failed, using cached database:', err);
    } finally {
      if (!quiet) {
        Swal.close();
      }
    }
    return false;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const idClean = loginId.trim();

    setIsLoggingIn(true);
    setLoginError(false);

    try {
      // Synchronously pull latest database state
      await pullLatestData(true);

      // 1. Admin bypass check
      if (idClean.toLowerCase() === 'admin' && loginPassword === 'admin1234') {
        const adminObject: User = {
          id: 'ADMIN',
          photoUrl: 'https://cdn.phototourl.com/free/2026-06-30-bd752cd8-9d40-44d8-8825-ebbfda73203c.jpg',
          firstName: 'Admin',
          lastName: 'Manager',
          role: 'Admin',
          signature: 'ADMIN_SIGNATURE',
          email: 'admin@amtconnect.com',
          status: 'Active',
          createdAt: '2569/06/11'
        };
        
        setCurrentUser(adminObject);
        setCurrentScreen('dashboard');
        Swal.fire({
          icon: 'success',
          title: 'ผู้บริหารระบบเข้าใช้งาน',
          text: 'ยินดีต้อนรับเข้าสูู่บอร์ดแอดมิน AMT Connect',
          timer: 1500,
          showConfirmButton: false
        });
        return;
      }

      // 2. Normal check using APIService
      const res = APIService.login(idClean, loginPassword);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        setCurrentScreen('dashboard');
        Swal.fire({
          icon: 'success',
          title: 'ลงชื่อเข้าใช้สำเร็จ',
          text: `ยินดีต้อนรับคุณ ${res.user.title ? res.user.title + ' ' : ''}${res.user.firstName} ${res.user.lastName} (${res.user.role}) เข้าใช้งานระบบ`,
          timer: 1500,
          showConfirmButton: false
        });
      } else {
        setLoginError(true);
        Swal.fire({
          icon: 'error',
          title: 'ไม่สามารถเข้าสู่ระบบได้เนื่องจากรหัสผ่านไม่ถูกต้อง',
          text: res.message,
          confirmButtonColor: '#171717'
        });
      }
    } catch (err) {
      console.error('Login process failed:', err);
      Swal.fire({
        icon: 'error',
        title: 'ระบบผิดพลาด',
        text: 'ไม่สามารถดำเนินการเข้าระบบได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
        confirmButtonColor: '#171717'
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegisterSuccess = (candidate: Omit<User, 'status' | 'createdAt'>) => {
    const res = APIService.register(candidate);
    if (res.success) {
      const currentDb = APIService.getDb();
      setDb(currentDb); // reload from disk helper
      
      Swal.fire({
        icon: 'success',
        title: 'ยื่นใบลงทะเบียนสำเร็จ',
        text: 'ข้อมูลใบสมัครและลายเซ็นของท่านได้รับการบันทึกบนอุปกรณ์นี้แล้ว และกำลังซิงค์ขึ้นระบบ Google Sheets ในพื้นหลังเฉกเช่นคลาเวย์ โปรดรอผู้ประสานงาน/แอดมินวิทยาลัยตรวจสอบและคำนุมัติสิทธิ์เข้าใช้',
        confirmButtonColor: '#0F172A'
      });

      // Synchronize in the background immediately
      syncWithGoogleSheets(currentDb).catch((err) => {
        console.warn('Background registration sheet sync status:', err);
      });

      setCurrentScreen('home');
      setLoginId('');
      setLoginPassword('');
    } else {
      Swal.fire({
        icon: 'error',
        title: 'ลงทะเบียนติดขัด',
        text: res.message,
        confirmButtonColor: '#171717'
      });
    }
  };

  const handleProfileClick = () => {
    if (!currentUser) return;
    if (currentUser.role.includes('Training')) {
      setTrainingActiveTab('profile');
    } else if (currentUser.role === 'Maintenance Manager' || currentUser.role === 'Maintenance Staff') {
      setMaintActiveTab('profile');
    } else if (currentUser.role === 'Admin') {
      setAdminSubTab('users');
      Swal.fire({
        title: appLanguage === 'TH' ? 'ข้อมูลผู้ดูแลระบบ' : 'Administrator Profile',
        html: `
          <div class="text-left font-sans text-xs space-y-2 p-2">
            <p><strong>ชื่อ-นามสกุล:</strong> ${currentUser.firstName} ${currentUser.lastName}</p>
            <p><strong>อีเมล:</strong> ${currentUser.email}</p>
            <p><strong>บทบาท:</strong> ${currentUser.role}</p>
            <p class="text-slate-500 text-[10px]">หมายเหตุ: บัญชีผู้ดูแลระบบจัดการข้อมูลผ่านแท็บผู้ใช้งานในระบบหลัก</p>
          </div>
        `,
        confirmButtonColor: '#0F172A',
        confirmButtonText: appLanguage === 'TH' ? 'ตกลง' : 'OK'
      });
    } else {
      setStudentActiveTab('profile');
    }
  };

  const handleLogout = () => {
    const isTh = appLanguage === 'TH';
    Swal.fire({
      title: isTh ? 'ยืนยันการออกจากระบบ?' : 'Confirm Logout?',
      text: isTh ? 'คุณต้องการออกจากระบบควบคุมหลักใช่หรือไม่?' : 'Are you sure you want to log out from the system?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: isTh ? 'ใช่, ออกจากระบบ' : 'Yes, Log out',
      cancelButtonText: isTh ? 'ยกเลิก' : 'Cancel',
      confirmButtonColor: '#DC2626',
      cancelButtonColor: '#64748B',
    }).then((result) => {
      if (result.isConfirmed) {
        setCurrentUser(null);
        setCurrentScreen('home');
        setLoginId('');
        setLoginPassword('');
        Swal.fire({
          icon: 'success',
          title: isTh ? 'ออกจากระบบสำเร็จ' : 'Logged Out Successfully',
          text: isTh ? 'ขอบคุณที่ใช้งานระบบตรวจห้องและอุปกรณ์ AMT Connect' : 'Thank you for using AMT Connect System',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  const handleClearLocalStorage = () => {
    const isTh = appLanguage === 'TH';
    Swal.fire({
      title: isTh ? 'ยืนยันการลบข้อมูลสำรองในเครื่อง?' : 'Confirm clearing Local Storage?',
      text: isTh 
        ? 'การดำเนินการนี้จะลบข้อมูลที่บันทึกไว้ในเบราว์เซอร์นี้ทั้งหมด และเริ่มต้นระบบใหม่ด้วยค่าเริ่มต้น คุณแน่ใจใช่หรือไม่?' 
        : 'This action will wipe all data saved on this browser and refresh the application to defaults. Are you sure?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: isTh ? 'ใช่, ลบข้อมูลทั้งหมด' : 'Yes, clear all data',
      cancelButtonText: isTh ? 'ยกเลิก' : 'Cancel',
      confirmButtonColor: '#DC2626',
      cancelButtonColor: '#64748B',
    }).then((result) => {
      if (result.isConfirmed) {
        clearLocalStorageData();
        Swal.fire({
          icon: 'success',
          title: isTh ? 'ลบข้อมูลสำเร็จ' : 'Data Cleared Successfully',
          text: isTh ? 'ระบบกำลังเริ่มทำงานใหม่...' : 'The system is reloading...',
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          window.location.reload();
        });
      }
    });
  };


  const forceTriggerSync = () => {
    Swal.fire({
      title: 'กำลังอัพเดตข้อมูลไปยังคลาวด์ชีต...',
      text: 'ติดต่อระบบประมวลผล Google Apps Script',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    APIService.saveDb(db);
    setTimeout(() => {
      Swal.close();
      Swal.fire({
        icon: 'success',
        title: 'อัปเดตระบบชีตสมบูรณ์',
        text: 'ประวัติ อุปกรณ์ และตารางสอบ ได้อัพโหลดขึ้น Google Sheet เรียบร้อยแล้ว',
        confirmButtonColor: '#171717'
      });
    }, 1500);
  };

  // --- ACTIONS FOR ADMIN ---
  const handleApproveUser = (userId: string) => {
    const userToApprove = db.users.find(u => u.id === userId);
    if (!userToApprove) return;

    if (currentUser?.role === 'Admin') {
      if (userToApprove.role === 'Instructor' || userToApprove.role === 'นักศึกษา') {
        Swal.fire('ไม่สามารถอนุมัติได้', 'Admin ไม่สามารถอนุมัติ Instructor หรือ นักศึกษาได้', 'error');
        return;
      }
    } else if (currentUser?.role === 'Training Manager' || currentUser?.role === 'Training Staff') {
      if (userToApprove.role !== 'นักศึกษา' && userToApprove.role !== 'Instructor') {
        Swal.fire('ไม่สามารถอนุมัติได้', 'ฝ่าย Training สามารถอนุมัติได้เฉพาะ นักศึกษา และ Instructor เท่านั้น', 'error');
        return;
      }
    }

    const nextUsers = db.users.map(u => u.id === userId ? { ...u, status: 'Active' as const } : u);
    updateDb({ ...db, users: nextUsers });
    Swal.fire('อนุมัติแล้ว', `อนุมัติสิทธิ์ความปลอดภัยผู้ใช้นี้เรียบร้อย`, 'success');
  };

  const handleRejectUser = (userId: string) => {
    const nextUsers = db.users.filter(u => u.id !== userId);
    updateDb({ ...db, users: nextUsers });
    Swal.fire('ปฏิเสธคำขอสำเร็จ', 'นำผู้ใช้งานออกจากบัญชีคิวคำขอลงทะเบียนแล้ว', 'info');
  };

  const handleUpdateStudentStatus = (userId: string, newStatus: User['status']) => {
    const nextUsers = db.users.map(u => u.id === userId ? { ...u, status: newStatus } : u);
    updateDb({ ...db, users: nextUsers });
  };

  const handleToggleRecordStatus = (recId: string) => {
    const nextRecords = db.roomUsageRecords.map(r => 
      r.id === recId 
        ? { ...r, maintenanceOfficerStatus: (r.maintenanceOfficerStatus === 'Acknowledged' ? 'Pending' : 'Acknowledged') as any } 
        : r
    );
    updateDb({ ...db, roomUsageRecords: nextRecords });
    Swal.fire('อัปเดตบันทึกห้องสำเร็จ', 'เปลี่ยนสถานภาพยอมรับลายเซ็นสมุดส่งตรวจเสร็จสิ้น', 'success');
  };

  // --- ACTIONS FOR TRAINING STAFF/MANAGER ---
  const handleUpdateProfile = (updatedProfile: Partial<User>) => {
    if (!currentUser) return;
    const nextUsers = db.users.map(u => u.id === currentUser.id ? { ...u, ...updatedProfile } : u);
    const updatedUser = { ...currentUser, ...updatedProfile };
    setCurrentUser(updatedUser);
    updateDb({ ...db, users: nextUsers });
  };

  const handleSubmitRoomRequest = (newRequest: Omit<RoomRequest, 'id' | 'maintenanceApproved' | 'isRoomUsageRecordCreated'>): boolean => {
    // 1. Validate date
    if (!newRequest.date) {
      Swal.fire({
        icon: 'error',
        title: 'ข้อมูลไม่ถูกต้อง',
        text: 'กรุณาระบุวันที่ต้องการจองใช้ห้อง',
        confirmButtonColor: '#171717'
      });
      return false;
    }

    // Helper functions for validation
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
        // Correct Thai Buddhist Era (B.E.) years to C.E. if necessary
        if (year > 2400) {
          year -= 543;
        }
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
      return trimmed;
    };

    const parseTimeRange = (timeRangeStr: string) => {
      const parts = timeRangeStr.split('-');
      if (parts.length === 2) {
        return {
          startTime: parts[0].trim(),
          endTime: parts[1].trim(),
        };
      }
      return { startTime: '', endTime: '' };
    };

    // 2. Parse and validate requested times
    const newTimes = parseTimeRange(newRequest.timeRange);
    if (!newTimes.startTime || !newTimes.endTime) {
      Swal.fire({
        icon: 'error',
        title: 'รูปแบบเวลาไม่ถูกต้อง',
        text: 'การระบุช่วงเวลาการจองไม่ครบคู่สมบูรณ์',
        confirmButtonColor: '#171717'
      });
      return false;
    }

    if (newTimes.startTime >= newTimes.endTime) {
      Swal.fire({
        icon: 'error',
        title: 'ช่วงเวลาไม่ถูกต้อง',
        text: 'เวลาเริ่มต้นต้องเร็วกว่าเวลาสิ้นสุด',
        confirmButtonColor: '#171717'
      });
      return false;
    }

    // 3. Collision check: Cannot book same room, same date, overlapping time if not Rejected
    const currentNormDate = normalizeDate(newRequest.date);
    const hasOverlap = db.roomRequests.some(existing => {
      if (existing.maintenanceApproved === 'Rejected') return false;
      if (existing.room.trim().toLowerCase() !== newRequest.room.trim().toLowerCase()) return false;
      if (normalizeDate(existing.date) !== currentNormDate) return false;

      const existTimes = parseTimeRange(existing.timeRange);
      if (!existTimes.startTime || !existTimes.endTime) return false;

      // Check range overlap: S1 < E2 and S2 < E1
      return existTimes.startTime < newTimes.endTime && newTimes.startTime < existTimes.endTime;
    });

    if (hasOverlap) {
      Swal.fire({
        icon: 'error',
        title: 'การจองซ้อนทับกัน',
        text: `ห้อง "${newRequest.room}" ถูกจองในช่วงเวลาดังกล่าวแล้วในวันที่ระบุ กรุณาปรับเปลี่ยนเวลาหรือห้องปฏิบัติการใหม่`,
        confirmButtonColor: '#171717'
      });
      return false;
    }

    const freshRequest: RoomRequest = {
      ...newRequest,
      id: `REQ-${Date.now()}`,
      maintenanceApproved: 'Pending' as const,
      isRoomUsageRecordCreated: false,
    };
    const nextReqs = [...db.roomRequests, freshRequest];
    updateDb({ ...db, roomRequests: nextReqs });
    return true;
  };

  const handleCancelRoomRequest = (requestId: string) => {
    Swal.fire({
      title: 'ต้องการยกเลิกคำขอใช้ห้องปฏิบัติการนี้?',
      text: 'คุณต้องการยกเลิกคำขอใช้ห้องแบบฟอร์มนี้ใช่หรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#525252',
      confirmButtonText: 'ใช่, ดำเนินการยกเลิก',
      cancelButtonText: 'ย้อนกลับ'
    }).then((result) => {
      if (result.isConfirmed) {
        const nextReqs = db.roomRequests.filter(r => r.id !== requestId);
        updateDb({ ...db, roomRequests: nextReqs });
        Swal.fire('ยกเลิกแล้ว!', 'ทำการยกเลิกและนำการขอจองห้องดังกล่าวออกจากระบบแล้ว', 'success');
      }
    });
  };

  const handleUpdateStudentStatusByStaff = (studentId: string, status: User['status']) => {
    const nextUsers = db.users.map(u => u.id === studentId ? { ...u, status } : u);
    updateDb({ ...db, users: nextUsers });
    Swal.fire('สำเร็จ', 'ส่งข้อเสนอเปลี่ยนแปลงสถานะนักศึกษาเข้าสู่ระบบบริหารพิจารณาแล้ว', 'success');
  };

  const handleApproveStudentStatusByManager = (studentId: string) => {
    Swal.fire('ผู้บริหารอนุมัติ', 'อนุมัติยืนยันสถานะนักศึกษาเข้าบอร์ดทะเบียนเรียบร้อย', 'success');
  };

  // --- ACTIONS FOR MAINTENANCE ---
  const handleCertifyRoomRequest = (requestId: string, status: 'Approved' | 'Rejected', note: string, officerName: string, officerSignature?: string) => {
    const reqObj = db.roomRequests.find(r => r.id === requestId);
    if (!reqObj) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const nextRequests = db.roomRequests.map(r => 
      r.id === requestId 
        ? { 
            ...r, 
            maintenanceApproved: status, 
            maintenanceOfficerName: officerName, 
            maintenanceOfficerSignature: officerSignature, 
            maintenanceCertifiedDate: status === 'Approved' ? todayStr : undefined,
            maintenanceNote: note, 
            isRoomUsageRecordCreated: status === 'Approved' 
          } 
        : r
    );

    // Do not automatically generate room usage record upon approval anymore as requester must self-record
    updateDb({
      ...db,
      roomRequests: nextRequests
    });
  };

  const handleAddEquipment = (newTool: Equipment) => {
    const adjustedTool = {
      ...newTool,
      status: (newTool.qty === 0) ? ('NotReady' as const) : newTool.status
    };
    const nextEquipments = [...db.equipment, adjustedTool];
    updateDb({ ...db, equipment: nextEquipments });
  };

  const handleCheckReturnEquipment = (borrowId: string) => {
    const borrowObj = db.borrowRecords.find(b => b.id === borrowId);
    if (!borrowObj) return;

    // Mark borrow returned, save check signature and name
    const nextBorrowRecords = db.borrowRecords.map(b => 
      b.id === borrowId 
        ? { 
            ...b, 
            status: 'Returned' as const, 
            returnDate: new Date().toLocaleDateString('th-TH') + ' ' + new Date().toLocaleTimeString('th-TH'),
            checkSignature: currentUser?.signature || '',
            checkerName: currentUser ? `${currentUser.title ? currentUser.title + ' ' : ''}${currentUser.firstName} ${currentUser.lastName}` : 'Maintenance Officer'
          } 
        : b
    );

    // Increase equipment stock
    const nextEquipment = db.equipment.map(eq => 
      eq.code === borrowObj.equipmentCode 
        ? { 
            ...eq, 
            qty: eq.qty + borrowObj.qty,
            status: (eq.qty + borrowObj.qty > 0 && eq.status === 'NotReady') ? ('Ready' as const) : eq.status
          } 
        : eq
    );

    updateDb({
      ...db,
      borrowRecords: nextBorrowRecords,
      equipment: nextEquipment
    });
  };

  const handleUpdateCalibration = (toolCode: string, calDate: string, status: Equipment['status']) => {
    const nextEquipment = db.equipment.map(eq => 
      eq.code === toolCode 
        ? { 
            ...eq, 
            calibrationDate: calDate, 
            status: eq.qty === 0 ? ('NotReady' as const) : status 
          } 
        : eq
    );
    updateDb({ ...db, equipment: nextEquipment });
  };

  const handleUpdateEquipment = (toolCode: string, fields: Partial<Equipment>) => {
    const nextEquipment = db.equipment.map(eq => {
      if (eq.code === toolCode) {
        const nextQty = fields.qty !== undefined ? fields.qty : eq.qty;
        const nextStatus = nextQty === 0 ? ('NotReady' as const) : (fields.status !== undefined ? fields.status : eq.status);
        return {
          ...eq,
          ...fields,
          qty: nextQty,
          status: nextStatus
        };
      }
      return eq;
    });
    updateDb({ ...db, equipment: nextEquipment });
  };

  // --- ACTIONS FOR OFFICE / EXAMS ---
  const handleAddSchedule = (s: ClassSchedule) => {
    const nextSch = [...db.schedules, s];
    updateDb({ ...db, schedules: nextSch });
  };

  const handleAddExam = (ex: ExamSchedule) => {
    const nextEx = [...db.examSchedules, ex];
    updateDb({ ...db, examSchedules: nextEx });
  };

  const handleAddGrade = (grade: ExamGrade) => {
    const nextGr = [...db.examGrades, grade];
    updateDb({ ...db, examGrades: nextGr });
  };

  const handleRecordUsageFromDoc = (requestId: string, reportText: string, customRoom?: string, signature?: string) => {
    const reqObj = db.roomRequests.find(r => r.id === requestId);
    if (!reqObj) return;

    const freshRecord: RoomUsageRecord = {
      id: `REC-${Date.now()}`,
      date: reqObj.date,
      room: customRoom || reqObj.room,
      requesterName: reqObj.requesterName,
      report: reportText,
      maintenanceOfficerStatus: 'Pending',
      remarks: `บันทึกเพิ่มเติมจากเอกสาร ${reqObj.id}`,
      requesterSignature: signature || reqObj.signature
    };

    updateDb({
      ...db,
      roomUsageRecords: [...db.roomUsageRecords, freshRecord]
    });

    Swal.fire({
      icon: 'success',
      title: 'บันทึกรายงานสำเร็จ',
      text: 'ระบบบันทึกรายงานการใช้ห้อง (สิ่งที่ต้องการพัฒนา) เรียบร้อยแล้ว',
      confirmButtonColor: '#10b981',
      timer: 2000,
      showConfirmButton: false
    });
  };

  const handleAddUsageRecord = (record: Omit<RoomUsageRecord, 'id' | 'maintenanceOfficerStatus'>) => {
    const freshRecord: RoomUsageRecord = {
      id: `REC-${Date.now()}`,
      ...record,
      maintenanceOfficerStatus: 'Pending',
    };

    updateDb({
      ...db,
      roomUsageRecords: [...db.roomUsageRecords, freshRecord]
    });

    Swal.fire({
      icon: 'success',
      title: 'บันทึกการใช้ห้องสำเร็จ',
      text: 'บันทึกข้อมูลการเข้าใช้ห้องปฏิบัติการ (TLTC-MO-034) เรียบร้อยแล้ว',
      confirmButtonColor: '#10b981',
    });
  };

  // --- ACTIONS FOR BORROWING ---
  const handleBorrowEquipment = (items: { code: string; qty: number }[], purpose: string, sigImage: string) => {
    if (!currentUser) return;
    
    const freshBorrows: BorrowRecord[] = [];
    const updatedEquipment = [...db.equipment];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const toolIdx = updatedEquipment.findIndex(eq => eq.code === item.code);
      if (toolIdx === -1) continue;
      const tool = updatedEquipment[toolIdx];

      const fullName = currentUser.firstNameTh && currentUser.lastNameTh 
        ? `${currentUser.title ? currentUser.title : ''}${currentUser.firstNameTh} ${currentUser.lastNameTh}`
        : `${currentUser.title ? currentUser.title + ' ' : ''}${currentUser.firstName} ${currentUser.lastName}`;

      const freshBorrow: BorrowRecord = {
        id: `BRW-${Date.now()}-${i}`,
        equipmentCode: item.code,
        toolName: tool.toolName,
        borrowerId: currentUser.id,
        borrowerName: fullName,
        borrowerRole: currentUser.role,
        qty: item.qty,
        borrowDate: new Date().toLocaleDateString('th-TH') + ' ' + new Date().toLocaleTimeString('th-TH'),
        status: 'Borrowed',
        borrowSignature: sigImage,
        toolLocation: tool.location,
        purpose: purpose,
      };
      freshBorrows.push(freshBorrow);

      // Deduct stock Qty
      updatedEquipment[toolIdx] = {
        ...tool,
        qty: Math.max(0, tool.qty - item.qty),
        status: tool.qty - item.qty <= 0 ? ('NotReady' as const) : tool.status
      };
    }

    if (freshBorrows.length === 0) return;

    updateDb({
      ...db,
      borrowRecords: [...db.borrowRecords, ...freshBorrows],
      equipment: updatedEquipment
    });
  };

  const handleReturnEquipment = (borrowId: string) => {
    const nextBorrowRecords = db.borrowRecords.map(b => {
      if (b.id === borrowId) {
        const studentUser = db.users.find(u => u.id === b.borrowerId);
        return { 
          ...b, 
          status: 'PendingReturn' as const,
          returnSignature: studentUser?.signature || b.borrowSignature || ''
        };
      }
      return b;
    });
    updateDb({
      ...db,
      borrowRecords: nextBorrowRecords
    });
  };

  return (
    <div className={`min-h-screen ${currentScreen === 'home' ? 'bg-[#F5F5F5]' : 'bg-[#F8FAFC]'} flex flex-col justify-between font-sans selection:bg-slate-900 selection:text-white`}>
      
      {/* 1. Header component */}
      {currentScreen !== 'home' && (
        <header className="bg-white text-slate-800 shadow-xs no-print border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-row justify-between items-center gap-4">
            
            {/* Logo & title brand matching screenshot */}
            <div className="flex items-center gap-3">
              <div className="block">
                <ThalangLogo className="w-9 h-9 sm:w-10 sm:h-10 object-contain" />
              </div>
              <div className="flex flex-col">
                <h1 className="font-sans font-bold text-base sm:text-lg text-slate-900 tracking-tight leading-none">
                  AMT Connect
                </h1>
                <p className="font-mono text-[9px] text-slate-400 font-bold tracking-[0.15em] uppercase mt-1 leading-none">
                  ROOMS & TOOLKITS
                </p>
              </div>
            </div>

            {/* User profile signature & session controls */}
            <div className="flex items-center gap-4">
              {currentUser && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleProfileClick}
                    className="flex items-center gap-2.5 text-left hover:bg-slate-50 p-1.5 -m-1.5 rounded-lg transition-all cursor-pointer group"
                    title={appLanguage === 'TH' ? 'ดูและแก้ไขข้อมูลส่วนตัว' : 'View and Edit Profile'}
                  >
                    {currentUser.photoUrl ? (
                      <img 
                        src={currentUser.photoUrl} 
                        alt="avatar" 
                        className="w-10 h-10 rounded-full border border-slate-200/60 object-cover bg-slate-50 shadow-xs group-hover:border-slate-300 transition-all" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-450 shadow-xs group-hover:border-slate-300 transition-all">
                        <UserIcon size={18} />
                      </div>
                    )}
                    <div className="text-left font-sans hidden sm:block">
                      <span className="block font-bold text-slate-800 text-xs sm:text-sm leading-tight truncate max-w-[160px] group-hover:text-black">
                        {currentUser.languagePreference === 'EN' && currentUser.firstName
                          ? `${currentUser.title || ''} ${currentUser.firstName} ${currentUser.lastName}` 
                          : `${currentUser.title || ''} ${currentUser.firstNameTh || currentUser.firstName} ${currentUser.lastNameTh || currentUser.lastName}`}
                      </span>
                      <span className="block text-[8px] text-slate-400 uppercase font-bold tracking-[0.12em] mt-0.5 leading-none">
                        {currentUser.role}
                      </span>
                    </div>
                  </button>

                  <button
                    id="headerLogoutBtn"
                    onClick={handleLogout}
                    className="p-2.5 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center"
                    title={appLanguage === 'TH' ? 'ออกจากระบบการช่าง' : 'Log Out of AMT Connect'}
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Mobile Bottom Navigation Bar */}
      {currentUser && currentScreen !== 'home' && mobileTabs.length > 0 && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/90 z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] px-2 py-2 flex justify-around items-center no-print pb-safe">
          {(() => {
            const hasMore = mobileTabs.length > 5;
            const displayedTabs = hasMore ? mobileTabs.slice(0, 4) : mobileTabs;
            
            return (
              <>
                {displayedTabs.map((tab) => {
                  const isTabActive = tab.isActive;
                  return (
                    <button
                      key={tab.id}
                      onClick={tab.action}
                      className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                        isTabActive 
                          ? 'text-slate-950 font-extrabold scale-105' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <div className={`p-1.5 rounded-xl transition-colors ${isTabActive ? 'bg-slate-100 text-slate-950' : ''}`}>
                        {tab.icon}
                      </div>
                      <span className="text-[9px] font-bold mt-1 tracking-tight truncate max-w-[64px]">
                        {appLanguage === 'TH' ? tab.labelTh : tab.labelEn}
                      </span>
                    </button>
                  );
                })}
                
                {hasMore && (
                  <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                      isMobileMenuOpen 
                        ? 'text-slate-950 font-extrabold scale-105' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <div className={`p-1.5 rounded-xl transition-colors ${isMobileMenuOpen ? 'bg-slate-100 text-slate-950' : ''}`}>
                      <MoreHorizontal size={18} />
                    </div>
                    <span className="text-[9px] font-bold mt-1 tracking-tight truncate">
                      {appLanguage === 'TH' ? 'อื่น ๆ' : 'More'}
                    </span>
                  </button>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Mobile More Sheet Modal */}
      <AnimatePresence>
        {isMobileMenuOpen && currentScreen !== 'home' && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black z-40 sm:hidden"
            />
            {/* Bottom Sheet */}
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-x-0 bottom-0 bg-white border-t border-slate-200 rounded-t-3xl shadow-2xl z-50 p-6 sm:hidden flex flex-col space-y-4 max-h-[85vh] overflow-y-auto pb-8"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div className="flex flex-col">
                  <h2 className="font-sans font-extrabold text-base text-slate-900">
                    {appLanguage === 'TH' ? 'เมนูเพิ่มเติม' : 'More Menu'}
                  </h2>
                  <p className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider mt-0.5">
                    AMT CONNECT OPTIONS
                  </p>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Grid of remaining options */}
              <div className="grid grid-cols-1 gap-2.5 py-2">
                {mobileTabs.length > 5 && mobileTabs.slice(4).map((tab) => {
                  const isTabActive = tab.isActive;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { tab.action(); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3.5 p-3 rounded-xl border transition-all text-left ${
                        isTabActive
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200/60 hover:bg-slate-100/80 hover:border-slate-300'
                      }`}
                    >
                      <div className={`p-2 rounded-lg transition-colors ${isTabActive ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}>
                        {tab.icon}
                      </div>
                      <span className="text-xs font-bold">{appLanguage === 'TH' ? tab.labelTh : tab.labelEn}</span>
                    </button>
                  );
                })}
              </div>

              {/* Log out option at the bottom */}
              <button 
                onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} 
                className="w-full flex items-center gap-3.5 p-3 rounded-xl border border-red-100 bg-red-50/50 hover:bg-red-50 text-red-600 transition-all text-left mt-2"
              >
                <div className="p-2 rounded-lg bg-white border border-red-100 text-red-500">
                  <LogOut size={18} />
                </div>
                <span className="text-xs font-bold">{appLanguage === 'TH' ? 'ออกจากระบบ (Logout)' : 'Log Out'}</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 2. Main Page content viewport switch */}
      <main className={`flex-1 ${currentScreen === 'home' ? 'max-w-md flex flex-col justify-center items-center py-4' : 'max-w-7xl pb-24 sm:pb-8'} w-full mx-auto p-4 sm:p-6 lg:p-8 no-print`}>
        
        {/* VIEW 1: HOME PAGE (WELCOME TO AMT - AUTH FORM) */}
        {currentScreen === 'home' && (
          <div className="max-w-md w-full mx-auto py-4 sm:py-8 flex flex-col justify-center items-center relative">
            
            {isInitialLoading ? (
              <div className="bg-white border border-neutral-200 rounded-3xl p-8 shadow-xs text-center flex flex-col items-center justify-center space-y-6 animate-fade-in select-none w-full border-t-8 border-[#171717]">
                <div className="relative flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-emerald-600 animate-spin"></div>
                  <div className="absolute p-3 bg-emerald-50 text-emerald-600 rounded-full">
                    <RefreshCw size={24} className="animate-spin text-emerald-500" style={{ animationDuration: '4s' }} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-sans font-extrabold text-slate-900 text-base tracking-wide">AMT Connect</h4>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed font-sans max-w-sm">
                    {appLanguage === 'TH' ? 'กำลังอัพเดตข้อมูล' : 'Synchronizing registry and room datastores...'}
                  </p>
                </div>
              </div>
            ) : (
              /* Login Frame card */
              <div className="bg-white border border-neutral-200/80 rounded-3xl p-8 sm:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border-t-8 border-[#171717] w-full space-y-6 animate-fade-in relative overflow-hidden">
                


                {/* Brand and Application Info */}
                <div className="text-center space-y-1">
                  <h3 className="font-sans font-black text-slate-900 text-xl tracking-[0.2em] leading-none">
                    AMT CONNECT
                  </h3>
                  <p className="text-[8.5px] text-neutral-400 font-bold uppercase tracking-[0.2em] font-sans">
                    AVIATION ACADEMY MANAGEMENT
                  </p>
                </div>

                {/* Subtitle */}
                <div className="text-center">
                  <h4 className="font-sans font-extrabold text-neutral-800 text-base">
                    {appLanguage === 'TH' ? 'เข้าสู่ระบบใช้งาน' : 'Secure Authorization Gateway'}
                  </h4>
                </div>

                {loginMethod === 'password' ? (
                  <form onSubmit={handleLoginSubmit} className="space-y-4 animate-fade-in text-xs">
                    {/* User ID input */}
                    <div className="space-y-1.5 text-left">
                      <label className="block text-[11px] font-bold text-neutral-600">
                        {appLanguage === 'TH' ? 'รหัสประจำตัว หรือ อีเมล' : 'Student/Instructor ID or Email'}
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                          <UserIcon size={16} />
                        </span>
                        <input
                          id="loginIdInput"
                          type="text"
                          required
                          placeholder={appLanguage === 'TH' ? 'รหัสประจำตัว หรือ อีเมล' : 'User ID or Email'}
                          value={loginId}
                          onChange={(e) => { setLoginId(e.target.value); setLoginError(false); }}
                          className={`w-full bg-[#FAFAFA] border ${loginError ? 'border-red-500' : 'border-neutral-200'} pl-10 pr-4 py-3 rounded-xl text-xs sm:text-sm font-sans focus:outline-none focus:border-neutral-400 focus:bg-white transition-all text-neutral-800`}
                        />
                      </div>
                    </div>

                    {/* Password input */}
                    <div className="space-y-1.5 text-left">
                      <label className="block text-[11px] font-bold text-neutral-600">
                        {appLanguage === 'TH' ? 'รหัสผ่าน' : 'Password'}
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                          <Lock size={16} />
                        </span>
                        <input
                          id="loginPasswordInput"
                          type={showLoginPassword ? "text" : "password"}
                          required
                          placeholder={appLanguage === 'TH' ? 'รหัสผ่าน' : 'Password'}
                          value={loginPassword}
                          onChange={(e) => { setLoginPassword(e.target.value); setLoginError(false); }}
                          className={`w-full bg-[#FAFAFA] border ${loginError ? 'border-red-500' : 'border-neutral-200'} pl-10 pr-10 py-3 rounded-xl text-xs sm:text-sm font-sans focus:outline-none focus:border-neutral-400 focus:bg-white transition-all text-neutral-800`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                          title={appLanguage === 'TH' ? 'แสดง/ซ่อนรหัสผ่าน' : 'Show/Hide Password'}
                        >
                          {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Submit black button */}
                    <div className="pt-2">
                      <button
                        id="loginSubmitBtn"
                        type="submit"
                        disabled={isLoggingIn}
                        className="w-full bg-[#171717] hover:bg-black text-white font-extrabold py-3 rounded-xl shadow-xs text-xs sm:text-sm transition-colors tracking-wide cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isLoggingIn ? (
                          <>
                            <Loader2 className="animate-spin" size={14} />
                            <span>{appLanguage === 'TH' ? 'กำลังเข้าสู่ระบบ...' : 'Authorizing...'}</span>
                          </>
                        ) : (
                          <>
                            <LogIn size={14} />
                            <span>{appLanguage === 'TH' ? 'เข้าสู่ระบบ' : 'Log In'}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* QR Code login button */}
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginMethod('qr');
                          setIsLoginCameraActive(true);
                        }}
                        className="w-full bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 font-bold py-3 rounded-xl text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <QrCode size={15} />
                        <span>{appLanguage === 'TH' ? 'สแกน QR Code เข้าใช้งาน' : 'Scan QR Code to Login'}</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4 animate-fade-in text-xs">
                    {scannedUser ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center space-y-4 animate-fade-in">
                        <div className="text-slate-600 font-bold text-xs uppercase tracking-wider mb-1 flex items-center justify-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>{appLanguage === 'TH' ? 'ตรวจพบข้อมูลสิทธิ์เข้าใช้งาน' : 'User profile signature identified'}</span>
                        </div>
                        
                        <div className="flex flex-col items-center space-y-2">
                          {scannedUser.photoUrl ? (
                            <img
                              src={scannedUser.photoUrl}
                              alt={`${scannedUser.firstName} Profile`}
                              className="w-20 h-20 rounded-full border-2 border-slate-800 object-cover shadow-xs"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-full bg-slate-200 border-2 border-slate-300 flex items-center justify-center text-slate-500 font-extrabold text-2xl select-none">
                              {scannedUser.firstName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <h4 className="font-sans font-extrabold text-slate-950 text-sm">
                              {scannedUser.languagePreference === 'EN' ? `${scannedUser.title || ''} ${scannedUser.firstName} ${scannedUser.lastName}` : `${scannedUser.title || ''} ${scannedUser.firstNameTh || scannedUser.firstName} ${scannedUser.lastNameTh || scannedUser.lastName}`}
                            </h4>
                            <p className="text-[10px] text-slate-450 font-mono mt-0.5">
                              ID: {scannedUser.id}
                            </p>
                          </div>
                          
                          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] bg-slate-900 text-slate-100 font-bold border border-slate-705">
                            {scannedUser.role}
                          </div>
                        </div>

                        <div className="pt-2.5 border-t border-slate-200 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setScannedUser(null);
                              setIsLoginCameraActive(true);
                            }}
                            className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-[11px] rounded-lg cursor-pointer transition-colors"
                          >
                            {appLanguage === 'TH' ? 'สแกนใหม่ (Cancel)' : 'Rescan / Cancel'}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              const confirmedUser = scannedUser;
                              setScannedUser(null);
                              setCurrentUser(confirmedUser);
                              setCurrentScreen('dashboard');
                              setIsLoginCameraActive(false);
                              Swal.fire({
                                icon: 'success',
                                title: appLanguage === 'TH' ? 'เข้าสู่ระบบสำเร็จ' : 'Logged in, Access Granted',
                                text: appLanguage === 'TH' 
                                  ? `ยินดีต้อนรับคุณ ${confirmedUser.title ? confirmedUser.title + ' ' : ''}${confirmedUser.firstNameTh || confirmedUser.firstName} ${confirmedUser.lastNameTh || confirmedUser.lastName} (${confirmedUser.role})`
                                  : `Welcome ${confirmedUser.languagePreference === 'EN' ? `${confirmedUser.title || ''} ${confirmedUser.firstName} ${confirmedUser.lastName}` : `${confirmedUser.title || ''} ${confirmedUser.firstNameTh || confirmedUser.firstName} ${confirmedUser.lastNameTh || confirmedUser.lastName}`} (${confirmedUser.role})`,
                                timer: 1500,
                                showConfirmButton: false
                              });
                            }}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-lg cursor-pointer shadow-sm transition-colors"
                          >
                            {appLanguage === 'TH' ? 'ยืนยันเข้าสู่ระบบ' : 'Confirm & Log In'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="border border-slate-200 bg-slate-950 rounded-2xl p-3 text-center text-white relative">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-mono tracking-widest text-emerald-400 flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${isLoginCameraActive ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
                              QR SCANNER
                            </span>
                            <div className="flex items-center gap-1.5">
                              {isLoginCameraActive && (
                                <button
                                  type="button"
                                  onClick={() => setLoginCameraFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                                  className="bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/30 text-emerald-300 text-[8.5px] px-2.5 py-0.5 rounded cursor-pointer font-bold flex items-center gap-1 active:scale-95 transition-all"
                                >
                                  <RefreshCw size={10} />
                                  <span>{appLanguage === 'TH' ? `สลับกล้อง (${loginCameraFacingMode === 'environment' ? 'หลัง' : 'หน้า'})` : `Toggle Camera (${loginCameraFacingMode === 'environment' ? 'Rear' : 'Front'})`}</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setIsLoginCameraActive(!isLoginCameraActive)}
                                className="bg-white/10 hover:bg-white/20 text-white text-[8.5px] px-2 py-0.5 rounded cursor-pointer"
                              >
                                {isLoginCameraActive 
                                  ? (appLanguage === 'TH' ? 'พักกล้อง' : 'Standby Mode') 
                                  : (appLanguage === 'TH' ? 'เปิดทำงาน' : 'Enable Camera')}
                              </button>
                            </div>
                          </div>

                          {isLoginCameraActive ? (
                            <div>
                              {loginCameraError ? (
                                <div className="text-rose-400 text-[10px] p-2 bg-rose-950/40 rounded border border-rose-900/40 select-none">
                                  ⚠️ {loginCameraError}
                                </div>
                              ) : (
                                <div className="relative w-full h-64 bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800 flex items-center justify-center">
                                  <div
                                    id="login-qr-reader"
                                    className="absolute inset-0 w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 p-2">
                                    <div className="w-40 h-40 border border-white/10 rounded-lg relative flex items-center justify-center bg-emerald-500/5">
                                      <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-sm animate-pulse" />
                                      <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-sm animate-pulse" />
                                      <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-sm animate-pulse" />
                                      <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br-sm animate-pulse" />
                                      <div className="w-full h-0.5 bg-emerald-400 animate-bounce shadow-[0_0_8px_#10b981]" style={{ animationDuration: '2.5s' }} />
                                      <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-sans font-bold text-emerald-400 tracking-wider text-center uppercase bg-slate-950/95 px-2.5 py-1 rounded border border-emerald-500/30 whitespace-nowrap shadow-md select-none">
                                        {appLanguage === 'TH' ? 'เล็งคิวอาร์โค้ด (QR CODE) ในกรอบนี้' : 'Position QR Code inside this square'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="h-64 bg-slate-900 rounded flex flex-col items-center justify-center text-slate-500 border border-slate-800">
                              <Camera size={26} className="opacity-45 mb-1.5" />
                              <span className="text-[10px] font-bold">{appLanguage === 'TH' ? 'กล้องปิดการทำงานชั่วคราว' : 'Applet Camera Intermission'}</span>
                              <span className="text-[8.5px] font-mono opacity-55 uppercase mt-0.5">CAMERA INTERFACE STANDBY</span>
                            </div>
                          )}
                        </div>

                        {/* Back to password option */}
                        <button
                          type="button"
                          onClick={() => {
                            setLoginMethod('password');
                            setIsLoginCameraActive(false);
                          }}
                          className="w-full bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 font-bold py-3 rounded-xl text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          {appLanguage === 'TH' ? 'ย้อนกลับไปใช้รหัสผ่าน' : 'Back to password login'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Divider for registration option */}
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-neutral-100"></div>
                  <span className="flex-shrink mx-4 text-[11px] font-bold text-neutral-400">
                    {appLanguage === 'TH' ? 'ยังไม่มีบัญชี?' : 'No account yet?'}
                  </span>
                  <div className="flex-grow border-t border-neutral-100"></div>
                </div>

                {/* White Button Register */}
                <div>
                  <button
                    id="goRegisterBtn"
                    disabled={isRegisterLoading}
                    onClick={async () => {
                      setIsRegisterLoading(true);
                      try {
                        await pullLatestData(true);
                        setCurrentScreen('register');
                      } catch (err) {
                        console.error('Error in register transition:', err);
                      } finally {
                        setIsRegisterLoading(false);
                      }
                    }}
                    className={`w-full border font-bold py-3.5 rounded-xl text-xs sm:text-sm transition-all text-center flex items-center justify-center gap-2 ${
                      isRegisterLoading
                        ? 'bg-neutral-50 border-neutral-200 text-neutral-400 cursor-not-allowed'
                        : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50 cursor-pointer'
                    }`}
                  >
                    {isRegisterLoading && <Loader2 className="animate-spin" size={16} />}
                    <span>{appLanguage === 'TH' ? 'ลงทะเบียนใหม่' : 'Register New Account'}</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* VIEW 2: REGISTER PROFILE PAGE */}
        {currentScreen === 'register' && (
          <div className="py-6 sm:py-12">
            <RegistrationForms 
              onRegisterSuccess={handleRegisterSuccess} 
              onCancel={() => setCurrentScreen('home')} 
              existingUsers={db.users}
              language={appLanguage}
            />
          </div>
        )}

        {/* VIEW 3: SYSTEM DASHBOARD (ACCORDING TO DIFFERENT LOGGED ROLES) */}
        {currentScreen === 'dashboard' && currentUser && (
          <div className="space-y-6">
            
            {/* Desktop & Tablet Sub-navigation tabs (rendered above Area Board box as requested) */}
            {mobileTabs.length > 0 && (
              <div className={`${
                currentUser.role === 'Admin' ? 'hidden sm:flex' : 'hidden sm:flex lg:hidden'
              } bg-white hover:bg-slate-50/50 p-1 rounded-xl border border-slate-200 shadow-sm gap-1 overflow-x-auto shrink-0 no-print`}>
                {mobileTabs.map((tab) => {
                  const isTabActive = tab.isActive;
                  return (
                    <button
                      key={tab.id}
                      onClick={tab.action}
                      className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-lg font-sans font-bold text-center text-xs transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                        isTabActive 
                          ? 'bg-[#0F172A] text-white shadow-xs' 
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      {tab.icon}
                      <span>{appLanguage === 'TH' ? tab.labelTh : tab.labelEn}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Display profile welcome overlay and screen navigation alerts removed from here to be placed inside specific panels */}

            {/* ROUTE INDIVIDUAL DASHBOARD ROOT DEPENDING ON USER POSITION ROLE */}
            {currentUser.role === 'Admin' ? (
              <AdminPanel
                currentUser={currentUser}
                users={db.users}
                roomRequests={db.roomRequests}
                roomUsageRecords={db.roomUsageRecords}
                borrowRecords={db.borrowRecords}
                subTab={adminSubTab}
                onSubTabChange={setAdminSubTab}
                onApproveUser={handleApproveUser}
                onRejectUser={handleRejectUser}
                onUpdateUserStatus={handleUpdateStudentStatus}
                onToggleRecordStatus={handleToggleRecordStatus}
                onViewStudentCard={(user) => setActiveCardUser(user)}
                onViewBulkStudentCards={(users) => setBulkCardUsers(users)}
                onViewRequestDoc={(req) => setActiveRequestDoc(req)}
                onViewBulkRequestDocs={(reqs) => setBulkRequestDocs(reqs)}
                onPrintUsageRecords={() => setShowUsageRecordDoc(true)}
                onReloadDb={() => setDb(APIService.getDb())}
                welcomeBanner={welcomeBanner}
              />
            ) : currentUser.role === 'Training Manager' || currentUser.role === 'Training Staff' ? (
                <TrainingManagerPanel
                currentUser={currentUser}
                users={db.users}
                roomRequests={db.roomRequests}
                classSchedules={db.schedules}
                roomUsageRecords={db.roomUsageRecords}
                borrowRecords={db.borrowRecords}
                activeButtonTab={trainingActiveTab}
                onActiveButtonTabChange={setTrainingActiveTab}
                onUpdateProfile={handleUpdateProfile}
                onSubmitRoomRequest={handleSubmitRoomRequest}
                onUpdateStudentStatusByStaff={handleUpdateStudentStatusByStaff}
                onApproveStudentStatusByManager={handleApproveStudentStatusByManager}
                onViewRequestDoc={(req) => setActiveRequestDoc(req)}
                onViewBulkRequestDocs={(reqs) => setBulkRequestDocs(reqs)}
                onPrintUsageRecords={() => setShowUsageRecordDoc(true)}
                onApproveUser={handleApproveUser}
                onRejectUser={handleRejectUser}
                onAddUsageRecord={handleAddUsageRecord}
                onCancelRoomRequest={handleCancelRoomRequest}
                onViewStudentCard={(user) => setActiveCardUser(user)}
                welcomeBanner={welcomeBanner}
              />
            ) : currentUser.role === 'Maintenance Manager' || currentUser.role === 'Maintenance Staff' ? (
              <MaintenancePanel
                currentUser={currentUser}
                roomRequests={db.roomRequests}
                roomUsageRecords={db.roomUsageRecords}
                equipments={db.equipment}
                borrowRecords={db.borrowRecords}
                activeButtonTab={maintActiveTab}
                onActiveButtonTabChange={setMaintActiveTab}
                onCertifyRoomRequest={handleCertifyRoomRequest}
                onAcknowledgeUsageRecord={handleToggleRecordStatus}
                onAddEquipment={handleAddEquipment}
                onCheckReturnEquipment={handleCheckReturnEquipment}
                onUpdateCalibration={handleUpdateCalibration}
                onUpdateEquipment={handleUpdateEquipment}
                onUpdateProfile={handleUpdateProfile}
                onSubmitRoomRequest={handleSubmitRoomRequest}
                onCancelRoomRequest={handleCancelRoomRequest}
                onPrintUsageRecords={() => setShowUsageRecordDoc(true)}
                onViewRequestDoc={(req) => setActiveRequestDoc(req)}
                onViewBulkRequestDocs={(reqs) => setBulkRequestDocs(reqs)}
                welcomeBanner={welcomeBanner}
              />
            ) : (
              /* Office Manager, Exam Staff, Students and general Instructors Panel */
              <ExamOfficeStudentPanel
                currentUser={currentUser}
                users={db.users}
                roomRequests={db.roomRequests}
                classSchedules={db.schedules}
                examSchedules={db.examSchedules}
                examGrades={db.examGrades}
                equipments={db.equipment}
                borrowRecords={db.borrowRecords}
                activeTab={studentActiveTab}
                onActiveTabChange={setStudentActiveTab}
                instActionTab={instActionTab}
                onInstActionTabChange={setInstActionTab}
                onAddSchedule={handleAddSchedule}
                onAddExam={handleAddExam}
                onAddGrade={handleAddGrade}
                onBorrowEquipment={handleBorrowEquipment}
                onReturnEquipment={handleReturnEquipment}
                onSubmitRoomRequest={handleSubmitRoomRequest}
                onViewRequestDoc={(req) => setActiveRequestDoc(req)}
                onViewBulkRequestDocs={(reqs) => setBulkRequestDocs(reqs)}
                onUpdateProfile={handleUpdateProfile}
                onAddUsageRecord={handleAddUsageRecord}
                onCancelRoomRequest={handleCancelRoomRequest}
                onViewStudentCard={(user) => setActiveCardUser(user)}
                welcomeBanner={welcomeBanner}
              />
            )}

          </div>
        )}

      </main>

      {/* 3. Footer markup */}
      {currentScreen === 'home' && (
        <footer className="bg-white border-t border-slate-200 py-6 text-center select-none no-print">
          <p className="font-sans text-[11px] text-slate-500 font-bold uppercase tracking-wider">
            ระบบ AMT Connect I ผู้พัฒนา นายซัยฟูลลอฮ อาแวบือราเฮง และนาย เลิศภพ เสตะพะ
          </p>
          <p className="font-mono text-[9px] text-slate-400 mt-1.5 uppercase font-semibold">
            © {new Date().getFullYear()} AMT THALANG COMPLIANT PART-147 AVIATION SCHOOL INFRASTRUCTURE
          </p>
        </footer>
      )}

      {/* --- PRINT FLOATING PORTABLES OVERLAYS FRAME SECTION --- */}
      {activeCardUser && (
        <StudentIdCard 
          user={activeCardUser} 
          onClose={() => setActiveCardUser(null)} 
        />
      )}

      {bulkCardUsers && (
        <BulkStudentIdCards 
          users={bulkCardUsers} 
          onClose={() => setBulkCardUsers(null)} 
        />
      )}

      {activeRequestDoc && (
        <RoomRequestDoc 
          request={activeRequestDoc} 
          onClose={() => setActiveRequestDoc(null)} 
          onRecordUsage={handleRecordUsageFromDoc}
          currentUser={currentUser || undefined}
        />
      )}

      {bulkRequestDocs && (
        <BulkRoomRequestsDoc 
          requests={bulkRequestDocs} 
          onClose={() => setBulkRequestDocs(null)} 
          currentUser={currentUser || undefined}
        />
      )}

      {showUsageRecordDoc && (
        <RoomUsageRecordDoc 
          records={db.roomUsageRecords} 
          roomRequests={db.roomRequests}
          onClose={() => setShowUsageRecordDoc(false)} 
        />
      )}

    </div>
  );
}
