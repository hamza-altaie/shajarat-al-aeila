// src/components/FamilyTreeAdvanced.jsx - شجرة العائلة البسيطة
import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as d3 from 'd3';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
// ✅ html2canvas يتم تحميله ديناميكياً عند الحاجة فقط (توفير ~500KB)
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import LinearProgress from '@mui/material/LinearProgress';
import Fab from '@mui/material/Fab';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
import Divider from '@mui/material/Divider';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

// استيراد الأيقونات بشكل منفصل لتحسين الأداء
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';
import BarChartIcon from '@mui/icons-material/BarChart';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import DownloadIcon from '@mui/icons-material/Download';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { getTribeTree } from "../services/tribeService";
import { useTribe } from '../contexts/TribeContext';
import { useAuth } from '../AuthContext';

// استيراد المكونات والأدوات المنفصلة
import './FamilyTreeAdvanced.css';
import { MALE_RELATIONS, FEMALE_RELATIONS, RelationUtils, RELATION_COLORS } from '../utils/FamilyRelations.js';
import familyTreeBuilder from '../utils/FamilyTreeBuilder.js';

// =============================================
// ✅ ثوابت أبعاد البطاقات حسب حجم الشاشة
// =============================================
const CARD_DIMENSIONS = {
  mobile: { width: 120, height: 70 },     // الموبايل
  tablet: { width: 150, height: 80 },     // التابلت
  fold: { width: 170, height: 85 },       // أجهزة فولد
  desktop: { width: 200, height: 100 },   // سطح المكتب
};

const TREE_CONFIG = {
  searchDebounceMs: 300,      // تأخير البحث
  animationDuration: 300,     // مدة الأنيميشن
  zoomExtent: [0.1, 3],       // حدود التكبير/التصغير
  exportScale: 2,             // جودة التصدير
};

export default function FamilyTreeAdvanced() {
  // ===========================================================================
  // الحالات الأساسية
  // ===========================================================================
  
  const { tribe, membership, loading: tribeLoading } = useTribe();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [selectedNode, setSelectedNode] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [performanceMetrics, setPerformanceMetrics] = useState({
    loadTime: 0,
    personCount: 0,
    maxDepthReached: 0,
    memoryUsage: 0
  });
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  
  // ✅ حالة العقد المطوية (Collapsed nodes)
  const [collapsedNodes, setCollapsedNodes] = useState(new Set());
  
  // استخدام useAuth بدلاً من localStorage
  const { user, isAuthenticated } = useAuth();
  
  const navigate = useNavigate();
  
  // المراجع للـ D3
  const svgRef = useRef(null);
  const svgContainerRef = useRef(null); // حاوية SVG المنفصلة
  const containerRef = useRef(null);
  const reactRootsRef = useRef(new Map());
  const isMountedRef = useRef(true); // لتتبع حالة التحميل
  const zoomRef = useRef(null); // حفظ zoom behavior لإعادة التركيز
  
  // مراجع لحل مشكلة الحلقة اللانهائية
  const handleNodeClickRef = useRef(null);
  const searchQueryRef = useRef('');
  const drawTreeRef = useRef(null);
  const loadTreeRef = useRef(null);
  
  // ✅ مرجع لـ debounce البحث
  const searchDebounceRef = useRef(null);
  
  // ✅ مرجع للعقد المطوية
  const collapsedNodesRef = useRef(collapsedNodes);
  useEffect(() => {
    collapsedNodesRef.current = collapsedNodes;
  }, [collapsedNodes]);

  // تتبع حالة تحميل المكون
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // تحديث المراجع عند تغيير القيم
  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  // ===========================================================================
  // دوال مساعدة ثابتة
  // ===========================================================================

// 🔧 إصلاح بسيط لـ iPhone
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      const style = document.createElement('style');
      style.textContent = `
        svg {
          transform: translateZ(0) !important;
          opacity: 1 !important;
          visibility: visible !important;
          overflow: visible !important;
        }
        svg g, svg text, svg rect, svg circle {
          opacity: 1 !important;
          visibility: visible !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // تنظيف الموارد عند إلغاء تحميل المكون
  useEffect(() => {
    const currentReactRoots = reactRootsRef.current;
    const currentSvg = svgRef.current;
    
    return () => {
      // تنظيف ReactDOM roots
      if (currentReactRoots) {
        currentReactRoots.forEach((root) => {
          try {
            if (root && root.unmount) {
              root.unmount();
            }
          } catch {
            // تجاهل أخطاء التنظيف
          }
        });
        currentReactRoots.clear();
      }
      
      // تنظيف SVG
      if (currentSvg) {
        d3.select(currentSvg).selectAll('*').remove();
      }
    };
  }, []);

  // ===========================================================================
  // دوال أساسية useCallback
  // ===========================================================================

  const buildFullName = familyTreeBuilder.buildFullName;

  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  // ✅ دالة طي/فتح العقدة
  const toggleNodeCollapse = useCallback((nodeId) => {
    setCollapsedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  // دالة إعادة التركيز على الشجرة - للزر العائم
  const resetTreeView = useCallback(() => {
    if (svgRef.current && treeData && zoomRef.current) {
      try {
        const svg = d3.select(svgRef.current);
        const g = svg.select('g');
        
        if (g.empty()) return;
        
        const container = containerRef.current;
        if (!container) return;
        
        const width = container.clientWidth;
        const height = container.clientHeight || 600;
        
        // حساب حدود الشجرة الفعلية
        const gNode = g.node();
        if (!gNode) return;
        
        const bounds = gNode.getBBox();
        const fullWidth = bounds.width;
        const fullHeight = bounds.height;
        
        if (fullWidth > 0 && fullHeight > 0) {
          // حساب scale للتمركز
          const scale = Math.min(
            (width * 0.8) / fullWidth,
            (height * 0.8) / fullHeight,
            1.0
          );
          
          // حساب الموقع المركزي
          const centerX = bounds.x + fullWidth / 2;
          const centerY = bounds.y + fullHeight / 2;
          const targetX = width / 2 - centerX * scale;
          const targetY = height / 2 - centerY * scale;
          
          const newTransform = d3.zoomIdentity
            .translate(targetX, targetY)
            .scale(scale);
          
          svg.transition()
            .duration(750)
            .ease(d3.easeCubicInOut)
            .call(zoomRef.current.transform, newTransform);
          
          showSnackbar('تم إعادة التركيز على الشجرة', 'success');
        }
      } catch (err) {
        console.error('خطأ في إعادة التركيز:', err);
      }
    }
  }, [treeData, showSnackbar]);

  // حالة تصدير الصورة
  const [exporting, setExporting] = useState(false);

  // =============================================
  // 📸 تصدير الشجرة كصورة
  // =============================================
  // دالة تحويل صورة URL إلى base64
  const imageToBase64 = useCallback(async (url) => {
    try {
      const response = await fetch(url, { mode: 'cors' });
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      // إذا فشل الـ fetch، نرسم دائرة ملونة كبديل
      return null;
    }
  }, []);

  // إنشاء avatar SVG كبديل
  const createAvatarSVG = useCallback((gender, size = 50) => {
    const bgColor = gender === 'female' ? '#f8bbd9' : '#bbdefb';
    const fgColor = gender === 'female' ? '#c2185b' : '#1976d2';
    
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="${bgColor}"/>
        <circle cx="${size/2}" cy="${size*0.35}" r="${size*0.2}" fill="${fgColor}"/>
        <ellipse cx="${size/2}" cy="${size*0.85}" rx="${size*0.35}" ry="${size*0.25}" fill="${fgColor}"/>
      </svg>
    `)}`;
  }, []);

  const exportTreeAsImage = useCallback(async () => {
    if (!svgRef.current || !containerRef.current) {
      showSnackbar('لا توجد شجرة لتصديرها', 'warning');
      return;
    }

    setExporting(true);
    showSnackbar('جاري تجهيز الصورة...', 'info');

    try {
      // ✅ تحميل html2canvas ديناميكياً عند الحاجة فقط (توفير ~500KB في التحميل الأولي)
      const { default: html2canvas } = await import('html2canvas');
      
      // إعادة ضبط الزووم مؤقتاً للتصدير
      const svg = svgRef.current;
      const g = svg.querySelector('g');
      
      // الحصول على حدود الشجرة
      const bounds = g?.getBBox();
      if (!bounds) {
        throw new Error('لا يمكن تحديد حدود الشجرة');
      }

      // حساب الأبعاد المطلوبة
      const padding = 60;
      const titleHeight = 50;
      const width = Math.max(bounds.width + padding * 2, 800);
      const height = Math.max(bounds.height + padding * 2 + titleHeight, 600);

      // إنشاء SVG جديد للتصدير
      const exportSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      exportSvg.setAttribute('width', width);
      exportSvg.setAttribute('height', height);
      exportSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      
      // إضافة تعريفات CSS داخل SVG
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      style.textContent = `
        text { font-family: 'Cairo', 'Segoe UI', Arial, sans-serif; }
      `;
      defs.appendChild(style);
      exportSvg.appendChild(defs);
      
      // خلفية
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bg.setAttribute('width', '100%');
      bg.setAttribute('height', '100%');
      bg.setAttribute('fill', '#f8faf8');
      exportSvg.appendChild(bg);
      
      // عنوان
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      title.setAttribute('x', width / 2);
      title.setAttribute('y', 35);
      title.setAttribute('text-anchor', 'middle');
      title.setAttribute('font-size', '24');
      title.setAttribute('font-weight', 'bold');
      title.setAttribute('fill', '#2e7d32');
      title.textContent = '🌳 شجرة العائلة';
      exportSvg.appendChild(title);
      
      // نسخ محتوى الشجرة
      const gClone = g.cloneNode(true);
      gClone.setAttribute('transform', `translate(${-bounds.x + padding}, ${-bounds.y + padding + titleHeight})`);
      exportSvg.appendChild(gClone);
      
      // معالجة الصور في النسخة
      const images = gClone.querySelectorAll('image');
      showSnackbar(`جاري معالجة ${images.length} صورة...`, 'info');
      
      for (const img of images) {
        let href = img.getAttribute('href') || img.getAttribute('xlink:href');
        if (href && !href.startsWith('data:')) {
          if (href.startsWith('/')) {
            href = window.location.origin + href;
          }
          
          const isGirlIcon = href.includes('girl') || href.includes('female');
          const parentRect = img.parentElement?.querySelector('rect[fill]');
          const rectFill = parentRect?.getAttribute('fill') || '';
          const isFemaleByColor = rectFill.includes('f8bbd') || rectFill.includes('fce4ec');
          const isFemale = isGirlIcon || isFemaleByColor;
          
          try {
            const base64 = await imageToBase64(href);
            if (base64) {
              img.setAttribute('href', base64);
            } else {
              img.setAttribute('href', createAvatarSVG(isFemale ? 'female' : 'male', 50));
            }
          } catch {
            img.setAttribute('href', createAvatarSVG(isFemale ? 'female' : 'male', 50));
          }
          img.removeAttribute('xlink:href');
        }
      }
      
      // إنشاء container مؤقت للتصدير
      const tempContainer = document.createElement('div');
      tempContainer.style.cssText = 'position: fixed; left: -9999px; top: 0; background: #f8faf8;';
      tempContainer.appendChild(exportSvg);
      document.body.appendChild(tempContainer);
      
      // استخدام html2canvas
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f8faf8',
        width: width,
        height: height,
        logging: false
      });
      
      // إزالة الـ container المؤقت
      document.body.removeChild(tempContainer);
      
      // تحميل الصورة
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toLocaleDateString('ar-IQ').replace(/\//g, '-');
        link.download = `شجرة_العائلة_${date}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        
        setExporting(false);
        showSnackbar('✅ تم تصدير الشجرة بنجاح!', 'success');
      }, 'image/png', 1.0);

    } catch (err) {
      console.error('خطأ في تصدير الشجرة:', err);
      setExporting(false);
      showSnackbar('❌ حدث خطأ أثناء التصدير', 'error');
    }
  }, [showSnackbar, imageToBase64, createAvatarSVG]);

  const handleNodeClick = useCallback((nodeData) => {
    if (nodeData.action === 'edit') {
      // منطق التعديل
    } else if (nodeData.action === 'view') {
      // منطق العرض
    }
    
    setSelectedNode(nodeData);
  }, []);

  // تحديث مرجع handleNodeClick
  useEffect(() => {
    handleNodeClickRef.current = handleNodeClick;
  }, [handleNodeClick]);

  // ===========================================================================
  // 🌳 بناء الشجرة من العلاقات (parent_id) - محسّن بـ useMemo
  // ===========================================================================
  const buildTreeFromRelations = useCallback((persons) => {
    if (!persons || persons.length === 0) return null;

    // =====================================================
    // 🔄 دمج الأشخاص المتشابهين (في العرض فقط)
    // =====================================================
    const normalizeArabic = (str) => {
      if (!str) return '';
      return str.trim()
        .replace(/أ|إ|آ/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .toLowerCase();
    };
    
    const getPersonKey = (p) => {
      return `${normalizeArabic(p.firstName)}_${normalizeArabic(p.fatherName)}_${normalizeArabic(p.grandfatherName || '')}`;
    };
    
    // تجميع الأشخاص المتشابهين
    const personGroups = new Map(); // key -> [persons]
    for (const p of persons) {
      const key = getPersonKey(p);
      if (!personGroups.has(key)) {
        personGroups.set(key, []);
      }
      personGroups.get(key).push(p);
    }
    
    // دمج المجموعات: اختيار شخص رئيسي ودمج بيانات الآخرين
    const mergedPersons = [];
    const idMapping = new Map(); // old_id -> merged_id
    
    for (const [, group] of personGroups) {
      if (group.length === 1) {
        // شخص واحد فقط - لا دمج
        mergedPersons.push(group[0]);
        idMapping.set(group[0].id, group[0].id);
      } else {
        // عدة أشخاص متشابهين - دمج
        // اختيار الشخص الرئيسي: الأقدم أو من له is_root أو من له أكثر بيانات
        const primary = group.reduce((best, current) => {
          // أولوية لـ is_root
          if (current.is_root && !best.is_root) return current;
          if (best.is_root && !current.is_root) return best;
          // أولوية للأقدم
          if (current.generation < best.generation) return current;
          if (best.generation < current.generation) return best;
          // أولوية لمن له صورة
          if (current.photo_url && !best.photo_url) return current;
          return best;
        });
        
        // دمج البيانات من كل المتشابهين
        const merged = { ...primary };
        
        // جمع كل العلاقات الأبوية
        const allParentIds = group.map(p => p.parentId).filter(Boolean);
        if (allParentIds.length > 0 && !merged.parentId) {
          merged.parentId = allParentIds[0];
        }
        
        // جمع الـ IDs الأصلية للرجوع إليها
        merged.mergedIds = group.map(p => p.id);
        merged.mergedCount = group.length;
        
        mergedPersons.push(merged);
        
        // تعيين كل الـ IDs القديمة للـ ID الجديد
        for (const p of group) {
          idMapping.set(p.id, merged.id);
        }
      }
    }
    
    // تحديث الـ parentId ليشير للأشخاص المدمجين
    for (const p of mergedPersons) {
      if (p.parentId && idMapping.has(p.parentId)) {
        p.parentId = idMapping.get(p.parentId);
      }
    }
    
    // استخدام الأشخاص المدمجين بدلاً من الأصليين
    const processedPersons = mergedPersons;
    // =====================================================

    // استخدام Map للوصول O(1) بدلاً من filter O(n)
    const personsMap = new Map();
    const childrenMap = new Map(); // parent_id -> children[]
    const hasParent = new Set();
    const personByCreator = new Map(); // created_by (firebase_uid) -> person
    
    // معالجة واحدة لكل البيانات
    for (const p of processedPersons) {
      personsMap.set(p.id, {
        ...p,
        globalId: p.id,
        children: []
      });
      
      if (p.parentId) {
        hasParent.add(p.id);
        if (!childrenMap.has(p.parentId)) {
          childrenMap.set(p.parentId, []);
        }
        childrenMap.get(p.parentId).push(p);
      }
      
      // ✅ تتبع الشخص حسب من أنشأه (للربط لاحقاً)
      if (p.created_by) {
        // نحفظ الشخص الذي أنشأه هذا المستخدم (ليس الزوجة)
        if (p.relation !== 'زوجة' && !p.relation?.includes('زوجة')) {
          if (!personByCreator.has(p.created_by)) {
            personByCreator.set(p.created_by, p);
          }
        }
      }
    }

    // بناء الاسم الكامل
    const buildFullName = (p) => {
      const parts = [p.firstName, p.fatherName, p.surname].filter(Boolean);
      return parts.join(' ') || 'غير معروف';
    };

    // ✅ فصل الزوجات عن باقي الأشخاص (لربطها بأزواجها لاحقاً)
    const wifeRelations = ['زوجة', 'زوجة ثانية', 'زوجة ثالثة', 'زوجة رابعة'];
    const wives = new Map(); // husband_id -> [wives]
    const nonWives = [];
    
    for (const p of processedPersons) {
      if (wifeRelations.includes(p.relation)) {
        // الزوجة - نبحث عن زوجها عبر parentId فقط
        const husbandId = p.parentId || p.parent_id;
        
        if (husbandId) {
          if (!wives.has(husbandId)) {
            wives.set(husbandId, []);
          }
          wives.get(husbandId).push(p);
        }
        // إذا لم يكن لها parentId، لا نضيفها (ستُضاف يدوياً من قاعدة البيانات)
      } else {
        nonWives.push(p);
      }
    }

    // الجذور هم من ليس لديهم والد (باستثناء الزوجات)
    const roots = [];
    for (const p of nonWives) {
      if (!hasParent.has(p.id) && !p.parentId) {
        roots.push(p);
      }
    }

    // ترتيب الجذور: الأولوية لـ is_root ثم للجيل الأقدم
    roots.sort((a, b) => {
      if (a.is_root && !b.is_root) return -1;
      if (!a.is_root && b.is_root) return 1;
      return (a.generation || 0) - (b.generation || 0);
    });

    // دالة تكرارية لبناء الشجرة (مع منع التكرار)
    const builtNodes = new Set(); // لمنع بناء نفس العقدة مرتين
    
    // دالة لعرض العلاقة المناسبة
    const getDisplayRelation = (person) => {
      // إذا كانت العلاقة "أنا" أو "رب العائلة" ولكن ليس سجل المستخدم الحالي
      // نعرض العلاقة المناسبة حسب الجنس
      if (person.relation === 'أنا' || person.relation === 'رب العائلة') {
        // إذا كان هذا سجل المستخدم الحالي، نعرض "أنا"
        if (membership?.person_id && String(person.id) === String(membership.person_id)) {
          return 'أنا';
        }
        // وإلا نعرض العلاقة حسب الجنس
        return person.gender === 'F' ? 'بنت' : 'ابن';
      }
      return person.relation || '';
    };
    
    const buildNode = (person) => {
      // منع التكرار
      if (builtNodes.has(person.id)) {
        return null;
      }
      builtNodes.add(person.id);
      
      const children = childrenMap.get(person.id) || [];
      const displayRelation = getDisplayRelation(person);
      
      // ✅ البحث عن كل زوجات هذا الشخص
      const personWives = wives.get(person.id) || [];
      
      // إضافة كل الزوجات للـ builtNodes لمنع إضافتها مرة أخرى
      personWives.forEach(wife => {
        builtNodes.add(wife.id);
      });
      
      return {
        name: buildFullName(person),
        id: person.id,
        avatar: person.photo_url || person.avatar || null,
        attributes: {
          ...person,
          firstName: person.firstName,
          fatherName: person.fatherName,
          surname: person.surname,
          gender: person.gender,
          relation: displayRelation,
          isRoot: person.is_root
        },
        // ✅ دعم الزوجات المتعددة - مصفوفة
        spouses: personWives.map(wife => ({
          name: buildFullName(wife),
          id: wife.id,
          avatar: wife.photo_url || wife.avatar || null,
          attributes: {
            ...wife,
            firstName: wife.firstName,
            fatherName: wife.fatherName,
            surname: wife.surname,
            gender: wife.gender,
            relation: wife.relation,
            isSpouse: true
          }
        })),
        // للتوافق مع الكود القديم
        spouse: personWives[0] ? {
          name: buildFullName(personWives[0]),
          id: personWives[0].id,
          avatar: personWives[0].photo_url || personWives[0].avatar || null,
          attributes: {
            ...personWives[0],
            firstName: personWives[0].firstName,
            fatherName: personWives[0].fatherName,
            surname: personWives[0].surname,
            gender: personWives[0].gender,
            relation: personWives[0].relation,
            isSpouse: true
          }
        } : null,
        children: children
          .map(child => buildNode(child))
          .filter(node => node !== null) // إزالة العقد الفارغة (المكررة)
      };
    };

    // إذا كان هناك جذر واحد
    if (roots.length === 1) {
      return buildNode(roots[0]);
    }

    // إذا كان هناك عدة جذور، ننشئ جذراً افتراضياً
    if (roots.length > 1) {
      return {
        name: '🏛️ العائلة',
        id: 'family-root',
        avatar: null,
        attributes: {
          isVirtualRoot: true,
          relation: 'عائلة'
        },
        children: roots.map(root => buildNode(root))
      };
    }

    // إذا لم يكن هناك جذور، نختار أول شخص
    if (roots.length === 0 && persons.length > 0) {
      console.warn('⚠️ لم يتم العثور على جذر، استخدام أول شخص');
      return buildNode(persons[0]);
    }

    return null;
  }, []);

  // ===========================================================================
  // دوال التحميل الرئيسية
  // ===========================================================================

  // ✅ التعديل الثاني: تحديث دالة التحميل
  const loadTree = useCallback(async () => {
    if (!tribe?.id || tribeLoading) {
      return;
    }

    setLoading(true);
    setLoadingStage('جاري تحميل سجل القبيلة...');
    setLoadingProgress(10);

    try {
      // 1. جلب البيانات من Supabase Tribe
      const response = await getTribeTree(tribe.id); 
      setLoadingProgress(50);
      
      let rawData = [];

      // 2. معالجة البيانات القادمة (Supabase يعيد persons و relations منفصلين)
      if (response.persons && response.relations) {
        setLoadingStage('معالجة العلاقات...');
        
        // تحويل مصفوفة الأشخاص إلى Map للوصول السريع
        const personsMap = new Map(response.persons.map(p => {
          return [p.id, { 
            ...p,
            // تحويل أسماء الحقول من Supabase إلى التنسيق المتوقع
            firstName: p.first_name || '',
            fatherName: p.father_name || '',
            surname: p.family_name || '',
            relation: p.relation || (p.is_root ? 'رب العائلة' : (p.gender === 'M' ? 'ابن' : 'بنت')),
            grandfatherName: p.grandfather_name || '',
            parentId: null
          }];
        }));

        // ✅ إزالة العلاقات المكررة - كل طفل له والد واحد فقط
        const processedChildren = new Set();
        const uniqueRelations = response.relations.filter(rel => {
          if (processedChildren.has(rel.child_id)) {
            console.warn(`⚠️ علاقة مكررة للطفل ${rel.child_id} - تم تجاهلها`);
            return false;
          }
          processedChildren.add(rel.child_id);
          return true;
        });

        // دمج العلاقات: نضع parent_id داخل كائن الابن
        uniqueRelations.forEach(rel => {
          const child = personsMap.get(rel.child_id);
          if (child) {
            // إضافة خاصية parent_id التي يعتمد عليها كود بناء الشجرة القديم لديك
            child.parent_id = rel.parent_id;
            child.parentId = rel.parent_id;
          }
        });

        // إرجاع المصفوفة المدمجة
        rawData = Array.from(personsMap.values());

      } else if (Array.isArray(response)) {
        // احتياط: في حال كانت البيانات مصفوفة واحدة
        rawData = response.map(p => ({
          ...p,
          firstName: p.first_name || p.firstName || '',
          fatherName: p.father_name || p.fatherName || '',
          surname: p.family_name || p.surname || '',
          relation: p.gender === 'M' ? 'ابن' : 'بنت',
          grandfatherName: '',
          parentId: p.parent_id || p.parentId || null
        }));
      }

      // التحقق من وجود بيانات
      if (rawData.length === 0) {
         setLoading(false);
         showSnackbar('⚠️ لم يتم العثور على بيانات', 'warning');
         return;
      }

      setLoadingStage('بناء هيكل العلاقات...');

      // 3. بناء الشجرة بناءً على parent_id و is_root
      const builtTreeData = buildTreeFromRelations(rawData);
      
      setTreeData(builtTreeData);
      setLoadingProgress(100);
      
      showSnackbar(`✅ تم تحميل ${rawData.length} عضو بنجاح`, 'success');

    } catch (err) {
      console.error('خطأ في تحميل الشجرة:', err);
      setError('تعذر الاتصال بقاعدة البيانات');
      showSnackbar('❌ فشل الاتصال بالخادم', 'error');
    } finally {
      setLoading(false);
    }
  }, [tribe?.id, tribeLoading, showSnackbar, buildTreeFromRelations]);

  // تحديث مرجع loadTree
  useEffect(() => {
    loadTreeRef.current = loadTree;
  }, [loadTree]);

  // ===========================================================================
  // دوال التحكم
  // ===========================================================================

  const handleRefresh = useCallback(() => {
    // مسح الـ cache عند التحديث اليدوي
    if (window.__treeCache && tribe?.id) {
      delete window.__treeCache[`tree_${tribe.id}`];
    }
    // تنظيف البيانات السابقة
    setTreeData(null);
    loadTree();
  }, [loadTree, tribe?.id]);

  // ===========================================================================
  // دالة رسم الشجرة
  // ===========================================================================

  // استبدل دالة drawTreeWithD3 بهذا الكود الذي يحافظ على التصميم الأصلي مع أنيميشن بسيط:

const drawTreeWithD3 = useCallback((data) => {
  // التحقق من حالة التحميل أولاً
  if (!isMountedRef.current) {
    return;
  }
  
  if (!data || !svgContainerRef.current || !containerRef.current) {
    return;
  }

  // ✅ تنظيف شامل للموارد السابقة قبل الرسم الجديد
  try {
    // تنظيف ReactDOM roots السابقة
    if (reactRootsRef.current) {
      reactRootsRef.current.forEach((root) => {
        try {
          if (root && root.unmount) {
            root.unmount();
          }
        } catch {
          // تجاهل أخطاء التنظيف
        }
      });
      reactRootsRef.current.clear();
    }
    
    // ✅ إزالة SVG القديم تماماً وإنشاء واحد جديد
    const svgContainer = d3.select(svgContainerRef.current);
    svgContainer.selectAll('*').remove();
    
    // إنشاء SVG جديد بواسطة D3 (ليس React)
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    const svg = svgContainer
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('cursor', 'grab')
      .style('user-select', 'none')
      .style('background', 'transparent')
      .style('touch-action', 'none')
      .style('overflow', 'visible');
    
    // حفظ المرجع
    svgRef.current = svg.node();
    
  } catch {
    // تجاهل أخطاء التنظيف
  }

  const screenWidth = window.innerWidth;
  const isMobile = screenWidth < 480;
  const isTablet = screenWidth >= 480 && screenWidth < 768;
  const isFoldOrSmallTablet = screenWidth >= 768 && screenWidth < 1024; // فولد وأجهزة لوحية صغيرة
  const isLargeTablet = screenWidth >= 1024 && screenWidth < 1280; // أجهزة لوحية كبيرة

  // ✅ استخدام الثوابت بدلاً من الأرقام السحرية
  let cardWidth = CARD_DIMENSIONS.desktop.width;
  let cardHeight = CARD_DIMENSIONS.desktop.height;

  if (isMobile) {
    cardWidth = CARD_DIMENSIONS.mobile.width;
    cardHeight = CARD_DIMENSIONS.mobile.height;
  } else if (isTablet) {
    cardWidth = CARD_DIMENSIONS.tablet.width;
    cardHeight = CARD_DIMENSIONS.tablet.height;
  } else if (isFoldOrSmallTablet) {
    cardWidth = CARD_DIMENSIONS.fold.width;
    cardHeight = CARD_DIMENSIONS.fold.height + 5;
  } else if (isLargeTablet) {
    cardWidth = CARD_DIMENSIONS.desktop.width - 15;
    cardHeight = CARD_DIMENSIONS.desktop.height - 5;
  }

  const avatarSize = isMobile ? cardHeight * 0.4 : cardHeight * 0.45;
  const padding = isMobile ? 6 : 10;
  const textStartX = padding + avatarSize + (isMobile ? 8 : 16);

  const svg = d3.select(svgRef.current);
  
  // إعداد الأبعاد
  const container = containerRef.current;
  const width = container.clientWidth;
  const height = container.clientHeight;
  // ✅ أنشئ g ثم فعّل الزووم عليه
  const g = svg.append('g');
  g
    .attr('transform', null)
    .style("touch-action", "manipulation")
    .style("will-change", "transform");

  // إعداد الزووم وربطه على g فقط - محسّن للأداء
  const zoom = d3.zoom()
    .scaleExtent([0.1, 3])
    .filter(event => {
      // تجاهل أحداث معينة لتحسين الأداء
      return !event.ctrlKey && !event.button;
    })
    .on('zoom', (event) => {
      // استخدام requestAnimationFrame لأداء أفضل
      requestAnimationFrame(() => {
        g.attr('transform', event.transform);
      });
    });
    
    // حفظ zoom في ref لاستخدامه في إعادة التركيز
    zoomRef.current = zoom;
    
    svg.call(zoom);
    svg.property('__zoom', d3.zoomIdentity); 

  // إعداد بيانات الشجرة
  const root = d3.hierarchy(data);
  
  // حساب إحصائيات الشجرة بحلقة واحدة
  let maxDepth = 0;
  let totalNodes = 0;
  const generationCounts = {};
  
  root.each(d => {
    totalNodes++;
    if (d.depth > maxDepth) maxDepth = d.depth;
    generationCounts[d.depth] = (generationCounts[d.depth] || 0) + 1;
  });
  
  // eslint-disable-next-line no-unused-vars
  const maxBreadth = Math.max(...Object.values(generationCounts));
  
  // تقليل الأنيميشن للشجرات الكبيرة (أكثر من 100 عقدة)
  const isLargeTree = totalNodes > 100;
  const animationDuration = isLargeTree ? 300 : 600;
  const linkAnimationDelay = isLargeTree ? 100 : 500;

  // إعدادات الشجرة المحسنة للهيكل الهرمي
  const treeType = data.attributes?.treeType || 'simple';
  
  // ✅ المسافة العمودية حسب نوع الجهاز - زيادة المسافة بين الأجيال
  let verticalGap;
  if (isMobile) {
    verticalGap = 130;
  } else if (isTablet) {
    verticalGap = 150;
  } else if (isFoldOrSmallTablet) {
    verticalGap = 170;
  } else if (isLargeTablet) {
    verticalGap = 190;
  } else {
    verticalGap = treeType === 'hierarchical' ? 210 : 200;
  }
  const dynamicHeight = Math.max(verticalGap * maxDepth, 250);
  
  // حساب العرض المطلوب بناءً على عدد العقد في كل مستوى
  // ✅ زيادة المسافة لمنع التداخل حسب نوع الجهاز
  const maxNodesInLevel = Math.max(...Object.values(generationCounts));
  
  let minWidthPerNode;
  if (isMobile) {
    minWidthPerNode = cardWidth * 2 + 50; // ✅ مضاعفة لاستيعاب الزوجة
  } else if (isTablet) {
    minWidthPerNode = cardWidth * 2 + 70;
  } else if (isFoldOrSmallTablet) {
    minWidthPerNode = cardWidth * 2 + 80;
  } else if (isLargeTablet) {
    minWidthPerNode = cardWidth * 2 + 90;
  } else {
    minWidthPerNode = cardWidth * 2 + 100;
  }
  
  const calculatedWidth = maxNodesInLevel * minWidthPerNode;
  
  let widthMultiplier;
  if (isMobile) {
    widthMultiplier = 2.5;
  } else if (isTablet) {
    widthMultiplier = 2.0;
  } else if (isFoldOrSmallTablet) {
    widthMultiplier = 1.8;
  } else if (isLargeTablet) {
    widthMultiplier = 1.5;
  } else {
    widthMultiplier = 1.2;
  }
  const dynamicWidth = Math.max(calculatedWidth, width * widthMultiplier);

  // إعداد تخطيط الشجرة مع توزيع أفقي أوسع
  const treeLayout = d3.tree()
    .size([dynamicWidth, dynamicHeight])
    .separation((a, b) => {
      // ✅ مسافة أكبر بين العقد لاستيعاب الزوجات المتعددة
      const aSpousesCount = a.data.spouses?.length || (a.data.spouse ? 1 : 0);
      const bSpousesCount = b.data.spouses?.length || (b.data.spouse ? 1 : 0);
      const maxSpouses = Math.max(aSpousesCount, bSpousesCount);
      
      // زيادة المسافة بناءً على عدد الزوجات
      const spouseMultiplier = 1 + (maxSpouses * 0.8);
      
      if (isMobile) {
        return (a.parent === b.parent ? 1.8 : 2.2) * spouseMultiplier;
      } else if (isTablet || isFoldOrSmallTablet) {
        return (a.parent === b.parent ? 2.2 : 2.6) * spouseMultiplier;
      } else if (isLargeTablet) {
        return (a.parent === b.parent ? 2.6 : 3.2) * spouseMultiplier;
      }
      return (a.parent === b.parent ? 3.2 : 4.0) * spouseMultiplier;
    }); 

  treeLayout(root);

  // رسم الروابط مع أنيميشن بسيط
  const links = g.selectAll(".link")
    .data(root.links())
    .enter().append("path")
    .attr("class", "link")
    .style("fill", "none")
    .attr("d", d => {
        const source = d.source;
        const target = d.target;
        const midY = source.y + (target.y - source.y) / 2;
        const radius = 18;
        return `M${source.x},${source.y}
                L${source.x},${midY - radius}
                Q${source.x},${midY} ${source.x + (target.x > source.x ? radius : -radius)},${midY}
                L${target.x - (target.x > source.x ? radius : -radius)},${midY}
                Q${target.x},${midY} ${target.x},${midY + radius}
                L${target.x},${target.y}`;
      })
    .style("stroke", "#2196f3")
    .style("stroke-width", 3)
    .style("stroke-linecap", "round")
    .style("stroke-linejoin", "round")
    .style("opacity", 0)
    .style("filter", isLargeTree ? "none" : "drop-shadow(0 2px 4px rgba(33, 150, 243, 0.3))")
    .style("stroke-dasharray", "none");

  // أنيميشن للروابط - محسّن
  links.transition()
    .delay(linkAnimationDelay)
    .duration(animationDuration)
    .ease(d3.easeQuadOut)
    .style("opacity", 0.9);

  // تأثيرات تفاعلية للروابط - فقط للشجرات الصغيرة
  if (!isLargeTree) {
    links
      .on("mouseenter", function() {
        d3.select(this)
          .style("stroke-width", 4)
          .style("opacity", 1)
          .style("stroke", "#1976d2");
      })
      .on("mouseleave", function() {
        d3.select(this)
          .style("stroke-width", 3)
          .style("opacity", 0.9)
          .style("stroke", "#2196f3");
      });
  }

  // رسم العقد - محسّن
  const nodes = g.selectAll(".node")
    .data(root.descendants())
    .enter().append("g")
    .attr("class", "node")
    .attr("data-depth", d => d.depth)
    .attr("transform", d => `translate(${d.x},${d.y})`)
    .style("opacity", 0);

  // أنيميشن للعقد - محسّن للشجرات الكبيرة
  nodes.transition()
    .delay((d, i) => isLargeTree ? Math.min(d.depth * 50, 200) : d.depth * 200 + i * 50)
    .duration(animationDuration)
    .ease(isLargeTree ? d3.easeQuadOut : d3.easeBackOut)
    .style("opacity", 1);

  // ✅ دالة مساعدة لرسم بطاقة شخص (زوج أو زوجة)
  const drawPersonCard = (nodeGroup, nodeData, offsetX = 0, isSpouseCard = false) => {
    const uniqueId = nodeData.id || nodeData.globalId || Math.random().toString(36).substring(7);
    const name = nodeData.name || `${nodeData.firstName || ''} ${nodeData.fatherName || ''}`.trim() || '';
    const relation = nodeData.relation || 'عضو';
    
    // تعديل حجم النص للموبايل
    const nameFontSize = isMobile ? 10 : 13;
    const relationFontSize = isMobile ? 9 : 11;
    const ageFontSize = isMobile ? 8 : 10;
    const maxNameLength = isMobile ? 10 : 14; // ✅ تقليل الحد الأقصى للاسم
    
    // ✅ حساب موقع الكارت بشكل صحيح
    const cardStartX = offsetX - cardWidth / 2; // بداية الكارت من اليسار
    const nameY = -cardHeight / 2 + padding + (isMobile ? 10 : 14);
    const relationY = nameY + (isMobile ? 14 : 18);
    
    // حساب العمر
    const calculateAge = (birthdate) => {
      if (!birthdate) return '';
      const birth = new Date(birthdate);
      const today = new Date();
      if (isNaN(birth.getTime())) return '';
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      return age > 0 ? age : '';
    };
    const age = calculateAge(nodeData.birth_date || nodeData.birthdate || nodeData.birthDate);
    
    // تحديد الألوان
    let colors = RELATION_COLORS.DEFAULT;
    if (isSpouseCard || relation === 'زوجة' || RelationUtils.isAdditionalWife(relation)) {
      colors = RELATION_COLORS.FEMALE;
    } else if (RelationUtils.isMaleRelation(relation) || nodeData.gender === "male") {
      colors = RELATION_COLORS.MALE;
    } else if (RelationUtils.isFemaleRelation(relation) || nodeData.gender === "female") {
      colors = RELATION_COLORS.FEMALE;
    }
    
    // الكارت
    nodeGroup.append("rect")
      .attr("width", cardWidth)
      .attr("height", cardHeight)
      .attr("x", cardStartX)
      .attr("y", -cardHeight / 2)
      .attr("rx", 14)
      .attr("fill", colors.fill)
      .attr("stroke", colors.stroke)
      .attr("stroke-width", isSpouseCard ? 2 : 2.5)
      .attr("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.1))")
      .attr("class", isSpouseCard ? "family-spouse-card" : "family-node-card");
    
    // صورة أو أفاتار
    nodeGroup.append("circle")
      .attr("cx", cardStartX + padding + avatarSize / 2)
      .attr("cy", -cardHeight / 2 + padding + avatarSize / 2)
      .attr("r", avatarSize / 2)
      .attr("fill", "#fff")
      .attr("stroke", "#ddd")
      .attr("stroke-width", 1.5);

    nodeGroup.append("clipPath")
      .attr("id", `avatar-circle-${uniqueId}`)
      .append("circle")
      .attr("cx", cardStartX + padding + avatarSize / 2)
      .attr("cy", -cardHeight / 2 + padding + avatarSize / 2)
      .attr("r", avatarSize / 2);

    nodeGroup.append("image")
      .attr("href",
        nodeData.photo_url ||
        nodeData.avatar ||
        (nodeData.gender === "female" || FEMALE_RELATIONS.includes(relation) || isSpouseCard
          ? "/icons/girl.png"
          : "/icons/boy.png")
      )
      .attr("x", cardStartX + padding)
      .attr("y", -cardHeight / 2 + padding)
      .attr("width", avatarSize)
      .attr("height", avatarSize)
      .attr("clip-path", `url(#avatar-circle-${uniqueId})`)
      .attr("preserveAspectRatio", "xMidYMid slice");
    
    // الاسم - ✅ وضع النص في منتصف المساحة المتاحة
    const textCenterX = cardStartX + padding + avatarSize + (cardWidth - padding - avatarSize) / 2;
    
    // ✅ قص الاسم ليناسب عرض الكارت
    const truncatedName = name.length > maxNameLength ? name.slice(0, maxNameLength) + '…' : name;
    
    nodeGroup.append("text")
      .text(truncatedName)
      .attr("x", textCenterX)
      .attr("y", nameY)
      .attr("font-size", nameFontSize)
      .attr("font-weight", "bold")
      .attr("fill", "#111")
      .attr("text-anchor", "middle");
    
    // العلاقة (للزوجة فقط)
    if (isSpouseCard) {
      nodeGroup.append("text")
        .text("💍 زوجة")
        .attr("x", textCenterX)
        .attr("y", relationY)
        .attr("font-size", relationFontSize)
        .attr("fill", "#e91e63")
        .attr("text-anchor", "middle");
    }
    
    // العمر
    if (age) {
      const ageBoxWidth = isMobile ? 32 : 40;
      const ageBoxHeight = isMobile ? 14 : 16;
      const ageBoxX = cardStartX + cardWidth - padding - ageBoxWidth;
      const ageBoxY = cardHeight / 2 - ageBoxHeight - 4;
      
      nodeGroup.append("rect")
        .attr("x", ageBoxX)
        .attr("y", ageBoxY)
        .attr("width", ageBoxWidth)
        .attr("height", ageBoxHeight)
        .attr("rx", 8)
        .attr("fill", "rgba(25, 118, 210, 0.08)")
        .attr("stroke", "#1976d2")
        .attr("stroke-width", 0.8);

      nodeGroup.append("text")
        .text(isMobile ? age : age + " سنة")
        .attr("x", ageBoxX + ageBoxWidth / 2)
        .attr("y", ageBoxY + ageBoxHeight / 2 + 1.5)
        .attr("font-size", ageFontSize)
        .attr("fill", "#1976d2")
        .attr("font-weight", "600")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle");
    }
    
    return { name, age, relation };
  };

  // إضافة محتوى العقد - نفس التصميم الأصلي تماماً
  nodes.each(function(d) {
  const nodeGroup = d3.select(this);
  const nodeData = d.data.attributes || d.data;
  // ✅ دعم الزوجات المتعددة - تحويل للمصفوفة للتوافق
  const spousesData = d.data.spouses || (d.data.spouse ? [d.data.spouse] : []);
  
  const uniqueId = nodeData.id || nodeData.globalId || Math.random().toString(36).substring(7);
  const name = nodeData.name || `${nodeData.firstName || ''} ${nodeData.fatherName || ''}`.trim() || '';
  const relation = nodeData.relation || 'عضو';
  
  // تعديل حجم النص للموبايل
  const nameFontSize = isMobile ? 10 : 13;
  const relationFontSize = isMobile ? 9 : 11;
  const ageFontSize = isMobile ? 8 : 10;
  const maxNameLength = isMobile ? 12 : 18;
  
  const nameY = -cardHeight / 2 + padding + (isMobile ? 10 : 14);
  const relationY = nameY + (isMobile ? 14 : 18);
  const childBoxWidth = isMobile ? 30 : 40;
  const childBoxHeight = isMobile ? 14 : 16;
  const childBoxX = -cardWidth / 2 + padding;
  const childBoxY = cardHeight / 2 - childBoxHeight - 4;
  const childTextX = childBoxX + childBoxWidth / 2;
  const childTextY = childBoxY + childBoxHeight / 2 + 1.5;
  const ageBoxWidth = isMobile ? 32 : 40;
  const ageBoxHeight = isMobile ? 14 : 16;
  const ageBoxX = cardWidth / 2 - padding - ageBoxWidth;
  const ageBoxY = cardHeight / 2 - ageBoxHeight - 4;
  const ageTextX = ageBoxX + ageBoxWidth / 2;
  const ageTextY = ageBoxY + ageBoxHeight / 2 + 1.5;
  // عمر محسوب
  const calculateAge = (birthdate) => {
    if (!birthdate) return '';
    const birth = new Date(birthdate);
    const today = new Date();
    if (isNaN(birth.getTime())) return '';
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age > 0 ? age : '';
  };
  const age = calculateAge(nodeData.birth_date || nodeData.birthdate || nodeData.birthDate);

  // الكارت
  // 🟦 تحديد الألوان حسب الجنس أو النوع من الملف المنفصل
  let colors = RELATION_COLORS.DEFAULT;

  // العقدة الوهمية (الجذر الافتراضي) تصميم خاص
  if (nodeData.isVirtualRoot) {
    colors = RELATION_COLORS.VIRTUAL_ROOT;
    cardWidth = cardWidth * 0.8; // حجم أصغر
    cardHeight = cardHeight * 0.7;
  } else if (nodeData.isVirtualGrandfather) {
    // الجد الافتراضي
    colors = RELATION_COLORS.VIRTUAL_GRANDFATHER;
  } else if (nodeData.isGrandfather || relation === 'جد') {
    // الجد الحقيقي
    colors = RELATION_COLORS.GRANDFATHER;
  } else if (relation === 'جدة') {
    // الجدة
    colors = RELATION_COLORS.GRANDMOTHER;
  } else if (nodeData.isGrandchild || relation === 'حفيد') {
    // الحفيد
    colors = RELATION_COLORS.GRANDCHILD_MALE;
  } else if (relation === 'حفيدة') {
    // الحفيدة
    colors = RELATION_COLORS.GRANDCHILD_FEMALE;
  } else if (nodeData.isNephewNiece) {
    // تمييز أبناء الإخوة والأخوات بلون مختلف
    if (RelationUtils.isMaleRelation(relation) || nodeData.gender === "male") {
      colors = RELATION_COLORS.NEPHEW_NIECE_MALE;
    } else if (RelationUtils.isFemaleRelation(relation) || nodeData.gender === "female") {
      colors = RELATION_COLORS.NEPHEW_NIECE_FEMALE;
    } else {
      colors = RELATION_COLORS.NEPHEW_NIECE_MALE; // افتراضي للذكور
    }
  } else {
    // العلاقات العادية
    if (RelationUtils.isMaleRelation(relation) || nodeData.gender === "male") {
      colors = RELATION_COLORS.MALE;
    } else if (RelationUtils.isFemaleRelation(relation) || nodeData.gender === "female") {
      colors = RELATION_COLORS.FEMALE;
    }
  }

  nodeGroup.append("rect")
    .attr("width", cardWidth)
    .attr("height", cardHeight)
    .attr("x", -cardWidth / 2)
    .attr("y", -cardHeight / 2)
    .attr("rx", 14)
    .attr("fill", colors.fill)
    .attr("stroke", colors.stroke)
    .attr("stroke-width", 2.5)  // إطار أسمك للوضوح
    .attr("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.1))")  // ظل للكروت
    .attr("class", "family-node-card");

  // صورة أو أفاتار (تخطي للعقدة الوهمية والجد الافتراضي)
  if (!nodeData.isVirtualRoot && !nodeData.isVirtualGrandfather) {
    // ⭕️ دائرة خلفية الصورة
    nodeGroup.append("circle")
      .attr("cx", -cardWidth / 2 + padding + avatarSize / 2)
      .attr("cy", -cardHeight / 2 + padding + avatarSize / 2)
      .attr("r", avatarSize / 2)
      .attr("fill", "#fff")
      .attr("stroke", "#ddd")
      .attr("stroke-width", 1.5);

    // 🟢 ClipPath دائري للصورة
    nodeGroup.append("clipPath")
      .attr("id", `avatar-circle-${uniqueId}`)
      .append("circle")
      .attr("cx", -cardWidth / 2 + padding + avatarSize / 2)
      .attr("cy", -cardHeight / 2 + padding + avatarSize / 2)
      .attr("r", avatarSize / 2);

    // 🖼️ صورة داخل الدائرة مع تقطيع وتوسيط
    nodeGroup.append("image")
      .attr("href",
        nodeData.photo_url ||
        nodeData.avatar ||
        (nodeData.gender === "female" || FEMALE_RELATIONS.includes(relation)
          ? "/icons/girl.png"
          : "/icons/boy.png")
      )
      .attr("x", -cardWidth / 2 + padding)
      .attr("y", -cardHeight / 2 + padding)
      .attr("width", avatarSize)
      .attr("height", avatarSize)
      .attr("clip-path", `url(#avatar-circle-${uniqueId})`)
      .attr("preserveAspectRatio", "xMidYMid slice");
  }

  // الاسم (مع منطق خاص للعقدة الوهمية)
  if (nodeData.isVirtualRoot) {
    // العقدة الوهمية تظهر بشكل مبسط أو مخفي
    nodeGroup.append("text")
      .text("🏠") // أيقونة بيت بدلاً من النص
      .attr("x", 0)
      .attr("y", 5)
      .attr("font-size", 20)
      .attr("text-anchor", "middle")
      .attr("fill", "#94a3b8");
  } else if (nodeData.isVirtualGrandfather) {
    // الجد الافتراضي
    nodeGroup.append("text")
      .text("👴") // أيقونة جد
      .attr("x", -cardWidth / 2 + padding + avatarSize / 2)
      .attr("y", -cardHeight / 2 + padding + avatarSize / 2 + 8)
      .attr("font-size", 24)
      .attr("text-anchor", "middle")
      .attr("fill", "#d97706");
    
    nodeGroup.append("text")
      .text(name.length > maxNameLength ? name.slice(0, maxNameLength - 2) + '…' : name)
      .attr("x", textStartX)
      .attr("y", nameY)
      .attr("font-size", nameFontSize)
      .attr("font-weight", "bold")
      .attr("fill", "#92400e");

    nodeGroup.append("text")
      .text("👑 " + relation)
      .attr("x", textStartX)
      .attr("y", relationY)
      .attr("font-size", relationFontSize)
      .attr("fill", "#d97706");
  } else {
    nodeGroup.append("text")
      .text(name.length > maxNameLength + 4 ? name.slice(0, maxNameLength + 2) + '…' : name)
      .attr("x", textStartX)
      .attr("y", nameY)
      .attr("font-size", nameFontSize)
      .attr("font-weight", "bold")
      .attr("fill", "#111");

    // ✅ إزالة عرض العلاقة - الخطوط توضح العلاقات بشكل طبيعي
    // فقط نعرض العلاقة لرب العائلة (الجذر)
    if (nodeData.isRoot || relation === 'رب العائلة' || relation === 'جد') {
      const relationIcon = RelationUtils.getRelationIcon(relation, nodeData.isNephewNiece);
      const displayRelation = relationIcon ? `${relationIcon} ${relation}` : relation;
      
      nodeGroup.append("text")
        .text(displayRelation)
        .attr("x", textStartX)
        .attr("y", relationY)
        .attr("font-size", relationFontSize)
        .attr("fill", "#666");
    }
  }

  // العمر (تخطي للعقدة الوهمية والجد الافتراضي)
  if (age && !nodeData.isVirtualRoot && !nodeData.isVirtualGrandfather) {
    // الخلفية
    nodeGroup.append("rect")
      .attr("x", ageBoxX)
      .attr("y", ageBoxY)
      .attr("width", ageBoxWidth)
      .attr("height", ageBoxHeight)
      .attr("rx", 8)
      .attr("fill", "rgba(25, 118, 210, 0.08)")
      .attr("stroke", "#1976d2")
      .attr("stroke-width", 0.8);

    // النص في المنتصف تمامًا
    nodeGroup.append("text")
      .text(isMobile ? age : age + " سنة") // فقط الرقم للموبايل
      .attr("x", ageTextX)
      .attr("y", ageTextY)
      .attr("font-size", ageFontSize)
      .attr("fill", "#1976d2")
      .attr("font-weight", "600")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle");
  }

  // ✅ الخلفية خلف عدد الأبناء (تخطي للعقدة الوهمية والجد الافتراضي)
  if (d.children && d.children.length > 0 && !nodeData.isVirtualRoot && !nodeData.isVirtualGrandfather) {
    let childText = ` ${d.children.length}`;
    let hasGrandchildren = false;
    let grandchildrenCount = 0;
    
    // حساب عدد الأحفاد
    d.children.forEach(child => {
      if (child.children && child.children.length > 0) {
        hasGrandchildren = true;
        grandchildrenCount += child.children.length;
      }
    });

    // إذا كان هناك أحفاد، اعرض الرقمين مع لون مميز
    if (hasGrandchildren) {
      childText = isMobile ? `${d.children.length}` : ` ${d.children.length}/${grandchildrenCount}`;
      
      nodeGroup.append("rect")
        .attr("x", childBoxX)
        .attr("y", childBoxY)
        .attr("width", childBoxWidth)
        .attr("height", childBoxHeight)
        .attr("rx", 8)
        .attr("fill", "rgba(33, 150, 243, 0.08)") // لون أزرق للإشارة للأحفاد
        .attr("stroke", "#2196f3")
        .attr("stroke-width", 0.8);

      nodeGroup.append("text")
        .text(childText)
        .attr("x", childTextX)
        .attr("y", childTextY)
        .attr("font-size", ageFontSize)
        .attr("fill", "#2196f3")
        .attr("font-weight", "600")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle");
    } else {
      // عرض عادي للأطفال فقط
      nodeGroup.append("rect")
        .attr("x", childBoxX)
        .attr("y", childBoxY)
        .attr("width", childBoxWidth)
        .attr("height", childBoxHeight)
        .attr("rx", 8)
        .attr("fill", "rgba(76, 175, 80, 0.08)")
        .attr("stroke", "#4caf50")
        .attr("stroke-width", 0.8);

      nodeGroup.append("text")
        .text(childText)
        .attr("x", childTextX)
        .attr("y", childTextY)
        .attr("font-size", ageFontSize)
        .attr("fill", "#4caf50")
        .attr("font-weight", "600")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle");
    }
  }

if (searchQueryRef.current.length > 1 && name.toLowerCase().includes(searchQueryRef.current.toLowerCase())) {
  nodeGroup.select("rect.family-node-card")
    .transition()
    .duration(600)
    .attr("stroke", "#f59e0b")
    .attr("stroke-width", 3);
}

  // ✅ رسم بطاقات الزوجات بجانب الزوج (دعم تعدد الزوجات)
  if (spousesData && spousesData.length > 0) {
    const baseSpouseOffset = cardWidth + (isMobile ? 15 : 25); // المسافة بين الزوج والزوجة الأولى
    
    spousesData.forEach((spouseData, spouseIndex) => {
      if (!spouseData || !spouseData.attributes) return;
      
      const spouseAttrs = spouseData.attributes;
      const spouseOffset = baseSpouseOffset + (spouseIndex * (cardWidth + (isMobile ? 10 : 15))); // كل زوجة بعد الأخرى
      
      // رسم خط الزواج (رابط أفقي بين الزوج والزوجة)
      const linkStartX = spouseIndex === 0 ? cardWidth / 2 : baseSpouseOffset + ((spouseIndex - 1) * (cardWidth + (isMobile ? 10 : 15))) + cardWidth / 2;
      nodeGroup.insert("path", ":first-child")
        .attr("class", "marriage-link")
        .attr("d", `M${linkStartX},0 L${spouseOffset - cardWidth / 2},0`)
        .style("stroke", "#9c27b0")
        .style("stroke-width", 2)
        .style("fill", "none");
      
      // ✅ رمز الزواج الرسمي (حلقتين متشابكتين) - يظهر فوق الخط
      const linkCenterX = (linkStartX + spouseOffset - cardWidth / 2) / 2;
      nodeGroup.append("text")
        .attr("class", "marriage-symbol")
        .text("⚭")
        .attr("x", linkCenterX)
        .attr("y", 5)
        .attr("font-size", isMobile ? 14 : 18)
        .attr("text-anchor", "middle")
        .attr("fill", "#9c27b0");
      
      // رسم بطاقة الزوجة مع انميشن الظهور
      const spouseGroup = nodeGroup.append("g")
        .attr("class", "spouse-group")
        .style("opacity", 0)
        .style("cursor", "pointer");
      
      // انميشن ظهور كارت الزوجة
      spouseGroup.transition()
        .delay(300 + (spouseIndex * 150)) // تأخير متدرج لكل زوجة
        .duration(500)
        .ease(d3.easeBackOut)
        .style("opacity", 1);
      
      // رسم بطاقة الزوجة داخل المجموعة
      drawPersonCard(spouseGroup, spouseAttrs, spouseOffset, true);
      
      // ✅ نفس إعدادات hover الكاردات الأخرى بالضبط
      spouseGroup
        .style("cursor", "pointer")
        .on("mouseenter", function(event) {
          event.stopPropagation();
          d3.select(this)
            .transition()
            .duration(200)
            .style("transform", `translate(${spouseOffset}px, 0) scale(1.05) translate(${-spouseOffset}px, 0)`)
            .style("filter", "drop-shadow(0 6px 12px rgba(0,0,0,0.2))");
        })
        .on("mouseleave", function(event) {
          event.stopPropagation();
          d3.select(this)
            .transition()
            .duration(200)
            .style("transform", "scale(1)")
            .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.1))");
        })
        .on("click", (event) => {
          event.stopPropagation();
          handleNodeClickRef.current?.({
            ...spouseAttrs,
            name: spouseData.name,
            children: []
          });
        });
    });
  }

  // إضافة تأثيرات تفاعلية للعقد - فقط لكارت الزوج
  nodeGroup.select("rect.family-node-card")
    .style("cursor", "pointer")
    .on("mouseenter", function(event) {
      event.stopPropagation();
      d3.select(this)
        .transition()
        .duration(200)
        .style("transform", "scale(1.05)")
        .style("filter", "drop-shadow(0 6px 12px rgba(0,0,0,0.2))");
      
      // تمييز الروابط المتصلة
      d3.selectAll(".link")
        .filter(linkData => 
          linkData.source.data.id === d.data.id || 
          linkData.target.data.id === d.data.id
        )
        .style("stroke", "#1976d2")
        .style("stroke-width", 4)
        .style("opacity", 1);
    })
    .on("mouseleave", function(event) {
      event.stopPropagation();
      d3.select(this)
        .transition()
        .duration(200)
        .style("transform", "scale(1)")
        .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.1))");
      
      // إعادة الروابط لحالتها الطبيعية
      d3.selectAll(".link")
        .style("stroke", "#2196f3")
        .style("stroke-width", 3)
        .style("opacity", 0.9);
    })
    .on("click", (event) => {
      event.stopPropagation();
      // تجنب عرض تفاصيل الجد الافتراضي إذا لم يكن له معلومات كافية
      if (nodeData.isVirtualGrandfather && !nodeData.avatar && !nodeData.phone) {
        return; // لا تفعل شيئاً للجد الافتراضي
      }
      
      handleNodeClickRef.current?.({
        ...nodeData,
        name,
        age,
        children: d.children || []
      });
    });

  // ✅ زر طي/فتح الفروع (لمن لديه أبناء)
  const hasChildren = d.children && d.children.length > 0;
  
  if (hasChildren && !nodeData.isVirtualRoot && !nodeData.isVirtualGrandfather) {
    const collapseButtonSize = isMobile ? 20 : 24;
    const buttonY = cardHeight / 2 + 8;
    
    // مجموعة الزر
    const collapseGroup = nodeGroup.append("g")
      .attr("class", "collapse-button")
      .attr("transform", `translate(0, ${buttonY})`)
      .style("cursor", "pointer");
    
    // خلفية الزر - أخضر دائماً في البداية
    collapseGroup.append("circle")
      .attr("r", collapseButtonSize / 2)
      .attr("fill", "#4caf50")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.2))");
    
    // الرمز - للفتح دائماً في البداية
    collapseGroup.append("text")
      .text("−")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", isMobile ? 16 : 18)
      .attr("font-weight", "bold")
      .attr("fill", "#fff");
    
    // حدث النقر - إخفاء/إظهار الفرع مباشرة بدون إعادة رسم
    collapseGroup.on("click", (event) => {
      event.stopPropagation();
      const nodeId = nodeData.id || nodeData.globalId;
      if (!nodeId) return;
      
      // جمع كل العقد الأبناء (descendants)
      const descendantIds = new Set();
      const collectDescendants = (node) => {
        if (node.children) {
          node.children.forEach(child => {
            const childId = child.data?.attributes?.id || child.data?.id;
            if (childId) descendantIds.add(childId);
            collectDescendants(child);
          });
        }
      };
      collectDescendants(d);
      
      // تحقق من الحالة الحالية
      const isCurrentlyCollapsed = collapsedNodesRef.current.has(nodeId);
      
      if (isCurrentlyCollapsed) {
        // ✅ فتح الفرع - إظهار العناصر
        descendantIds.forEach(descId => {
          // إظهار العقد
          g.selectAll(".node")
            .filter(function() {
              const nodeData = d3.select(this).datum()?.data;
              const id = nodeData?.attributes?.id || nodeData?.id;
              return id === descId;
            })
            .transition()
            .duration(300)
            .style("opacity", 1)
            .style("pointer-events", "auto");
          
          // إظهار الروابط
          g.selectAll(".link")
            .filter(linkData => {
              const sourceId = linkData.source?.data?.attributes?.id || linkData.source?.data?.id;
              const targetId = linkData.target?.data?.attributes?.id || linkData.target?.data?.id;
              return descId === sourceId || descId === targetId;
            })
            .transition()
            .duration(300)
            .style("opacity", 0.9);
        });
        
        // تغيير مظهر الزر
        collapseGroup.select("circle")
          .transition()
          .duration(200)
          .attr("fill", "#4caf50");
        collapseGroup.select("text")
          .text("−");
        collapseGroup.selectAll("text").filter((_, i) => i === 1).remove();
        
      } else {
        // ✅ طي الفرع - إخفاء العناصر
        descendantIds.forEach(descId => {
          // إخفاء العقد
          g.selectAll(".node")
            .filter(function() {
              const nodeData = d3.select(this).datum()?.data;
              const id = nodeData?.attributes?.id || nodeData?.id;
              return id === descId;
            })
            .transition()
            .duration(300)
            .style("opacity", 0)
            .style("pointer-events", "none");
          
          // إخفاء الروابط
          g.selectAll(".link")
            .filter(linkData => {
              const sourceId = linkData.source?.data?.attributes?.id || linkData.source?.data?.id;
              const targetId = linkData.target?.data?.attributes?.id || linkData.target?.data?.id;
              return descId === sourceId || descId === targetId;
            })
            .transition()
            .duration(300)
            .style("opacity", 0);
        });
        
        // تغيير مظهر الزر
        collapseGroup.select("circle")
          .transition()
          .duration(200)
          .attr("fill", "#ff9800");
        collapseGroup.select("text")
          .text("+");
        
        // إضافة عدد الأبناء المخفيين
        if (d.children && d.children.length > 0) {
          collapseGroup.append("text")
            .text(d.children.length)
            .attr("x", collapseButtonSize / 2 + 4)
            .attr("y", 0)
            .attr("text-anchor", "start")
            .attr("dominant-baseline", "central")
            .attr("font-size", isMobile ? 10 : 12)
            .attr("font-weight", "bold")
            .attr("fill", "#ff9800")
            .style("opacity", 0)
            .transition()
            .duration(200)
            .style("opacity", 1);
        }
      }
      
      // تحديث الحالة
      toggleNodeCollapse(nodeId);
    });
    
    // تأثيرات hover
    collapseGroup
      .on("mouseenter", function() {
        d3.select(this).select("circle")
          .transition()
          .duration(150)
          .attr("r", collapseButtonSize / 2 + 3);
      })
      .on("mouseleave", function() {
        d3.select(this).select("circle")
          .transition()
          .duration(150)
          .attr("r", collapseButtonSize / 2);
      });
  }
  });

  // معالجة تداخل العقد المحسنة للهيكل الهرمي
  const nodesByDepth = {};
  root.each(d => {
    if (!nodesByDepth[d.depth]) nodesByDepth[d.depth] = [];
    nodesByDepth[d.depth].push(d);
  });
  
  Object.values(nodesByDepth).forEach(nodes => {
    nodes.sort((a, b) => a.x - b.x);
    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1];
      const curr = nodes[i];
      // مسافة أكبر بكثير لإظهار الخطوط والعلاقات بوضوح
      const minDistance = treeType === 'hierarchical' ? 280 : 260; 
      if (curr.x - prev.x < minDistance) {
        const shift = minDistance - (curr.x - prev.x);
        curr.x += shift;
        // إعادة ضبط x لجميع الأبناء أيضاً
        function shiftChildren(node, delta) {
          if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
              child.x += delta;
              shiftChildren(child, delta);
            });
          }
        }
        shiftChildren(curr, shift);
      }
    }
  });

  // تمركز تلقائي بسيط (اختياري)
  setTimeout(() => {
    if (svgRef.current && containerRef.current) {
      const svg = d3.select(svgRef.current);
      const g = svg.select('g');
      
      try {
        const bounds = g.node().getBBox();
        const fullWidth = bounds.width;
        const fullHeight = bounds.height;
        
        if (fullWidth > 0 && fullHeight > 0) {
          // تحديد الـ scale بناءً على حجم الشاشة
          let maxScale = 1.0;
          if (isMobile) {
            maxScale = 0.6; // تصغير أكثر للموبايل لعرض الشجرة كاملة
          } else if (isTablet) {
            maxScale = 0.8;
          }
          
          const scale = Math.min(
            (width * 0.85) / fullWidth,
            (height * 0.85) / fullHeight,
            maxScale
          );
          
          const centerX = bounds.x + fullWidth / 2;
          const centerY = bounds.y + fullHeight / 2;
          const targetX = width / 2 - centerX * scale;
          const targetY = height / 2 - centerY * scale;
          
          svg.transition()
            .duration(1500)
            .ease(d3.easeCubicInOut)
            .call(
              zoom.transform,
              d3.zoomIdentity
                .translate(targetX, targetY)
                .scale(scale)
            );
        }
      } catch {
        // Removed unused 'error'
      }
    }
  }, 1200);

}, []); // إزالة dependencies لمنع الحلقة اللانهائية

  // تحديث مرجع drawTreeWithD3
  useEffect(() => {
    drawTreeRef.current = drawTreeWithD3;
  }, [drawTreeWithD3]);

  // دالة البحث المحلية - مع ميزة الزوم على النتيجة
  const performSearch = useCallback((query) => {
    if (!query || query.trim().length < 2) {
      // إزالة التميز إذا كان البحث فارغ
      if (svgRef.current) {
        const svg = d3.select(svgRef.current);
        svg.selectAll('.node rect.family-node-card')
          .transition()
          .duration(300)
          .style('stroke', null)
          .style('stroke-width', null);
      }
      return;
    }
    
    const queryLower = query.trim().toLowerCase();
    
    if (svgRef.current && zoomRef.current) {
      const svg = d3.select(svgRef.current);
      const g = svg.select('g');
      
      // إعادة تعيين كل العقد لحالتها الطبيعية أولاً
      svg.selectAll('.node rect.family-node-card')
        .transition()
        .duration(200)
        .style('stroke', null)
        .style('stroke-width', null);
      
      // البحث وتميز العقد المطابقة
      let foundNode = null;
      let foundX = 0;
      let foundY = 0;
      
      svg.selectAll('.node').each(function(d) {
        const nodeData = d.data?.attributes || d.data;
        const name = nodeData?.name?.toLowerCase() || 
                     `${nodeData?.firstName || ''} ${nodeData?.fatherName || ''}`.toLowerCase();
        
        if (name.includes(queryLower)) {
          // تميز العقدة المطابقة بلون ذهبي مميز
          d3.select(this).select('rect.family-node-card')
            .transition()
            .duration(300)
            .style('stroke', '#f59e0b')
            .style('stroke-width', '4px');
          
          // حفظ أول نتيجة للزوم عليها
          if (!foundNode) {
            foundNode = this;
            foundX = d.x;
            foundY = d.y;
          }
        }
      });
      
      // ✅ زوم على أول نتيجة بحث (مثل الكاميرا)
      if (foundNode && containerRef.current) {
        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        // حساب الـ transform للتركيز على العقدة
        const scale = 1.2; // تكبير قليل للتركيز
        const targetX = width / 2 - foundX * scale;
        const targetY = height / 2 - foundY * scale;
        
        // أنيميشن الزوم للعقدة
        svg.transition()
          .duration(750)
          .ease(d3.easeCubicInOut)
          .call(
            zoomRef.current.transform,
            d3.zoomIdentity
              .translate(targetX, targetY)
              .scale(scale)
          );
        
        // تأثير نبض على العقدة المستهدفة
        d3.select(foundNode).select('rect.family-node-card')
          .transition()
          .delay(750)
          .duration(200)
          .style('transform', 'scale(1.1)')
          .transition()
          .duration(200)
          .style('transform', 'scale(1)')
          .transition()
          .duration(200)
          .style('transform', 'scale(1.05)')
          .transition()
          .duration(200)
          .style('transform', 'scale(1)');
      }
    }
  }, []);

  // ===========================================================================
  // تأثيرات ودورة الحياة
  // ===========================================================================

  useEffect(() => {
    if (!tribe?.id || tribeLoading) {
      return;
    }

    loadTree();
  }, [tribe?.id, tribeLoading, loadTree]);

  // تأثير رسم الشجرة
  useEffect(() => {
    if (treeData && svgContainerRef.current && containerRef.current) {
      const timer = setTimeout(() => {
        try {
          drawTreeRef.current?.(treeData);
        } catch (err) {
          console.error('❌ خطأ في رسم الشجرة:', err);
        }
      }, 300); // زيادة التأخير قليلاً لضمان استقرار DOM
      
      const currentContainer = svgContainerRef.current;
      return () => {
        clearTimeout(timer);
        // تنظيف عند تغيير البيانات
        if (currentContainer) {
          try {
            d3.select(currentContainer).selectAll('*').interrupt();
          } catch {
            // تجاهل
          }
        }
      };
    }
  }, [treeData]); // استخدام المرجع بدلاً من drawTreeWithD3

  // تأثير البحث
  useEffect(() => {
    performSearch(searchQuery);
  }, [searchQuery, performSearch]);

  // تنظيف عند إلغاء التحميل
  useEffect(() => {
    const currentReactRoots = reactRootsRef.current;
    const currentSvgContainer = svgContainerRef.current;
    
    return () => {
      // 1. إيقاف جميع الأنيميشن
      if (currentSvgContainer) {
        try {
          d3.select(currentSvgContainer).selectAll('*').interrupt();
          d3.select(currentSvgContainer).selectAll('*').remove();
        } catch {
          // Silent cleanup
        }
      }
      
      // 2. تنظيف React roots بعد إزالة DOM
      setTimeout(() => {
        currentReactRoots.forEach(root => {
          try {
            root.unmount();
          } catch {
            // Silent cleanup
          }
        });
        currentReactRoots.clear();
      }, 0);
    };
  }, []);

  // تحميل البيانات تلقائياً عند تحميل المكون - تم نقل المنطق إلى useEffect الخاص بـ tribe?.id
  useEffect(() => {
    // التحقق من المصادقة مباشرة من useAuth
    if (!isAuthenticated || !user?.uid) {
      navigate('/login');
      return;
    }
    // لا نحمّل هنا - يتم التحميل في useEffect الخاص بـ tribe?.id
  }, [isAuthenticated, user?.uid, navigate]);

  // ===========================================================================
  // واجهة المستخدم
  // ===========================================================================

  const renderTreeView = () => {
    const treeTitle = 'شجرة قبيلتك';
    
    return (
      <Box
        ref={containerRef}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          background: '#fff', 
          fontFamily: 'Cairo, sans-serif'
        }}
      >
        {error ? (
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            height="100%"
            sx={{ color: '#ef4444', textAlign: 'center' }}
          >
            <WarningIcon sx={{ fontSize: 80, mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 2, fontFamily: 'Cairo, sans-serif' }}>
              حدث خطأ في التحميل
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, fontFamily: 'Cairo, sans-serif' }}>
              {error}
            </Typography>
            <Button 
              variant="contained" 
              onClick={handleRefresh}
              startIcon={<RefreshIcon />}
              sx={{ fontFamily: 'Cairo, sans-serif' }}
            >
              إعادة المحاولة
            </Button>
          </Box>
        ) : (
          <>
            {/* SVG Container - دائماً موجود لتجنب مشاكل React/D3 */}
            <div
              key="d3-svg-container"
              ref={svgContainerRef}
              style={{ 
                width: '100%',
                height: '100%',
                cursor: 'grab', 
                userSelect: 'none',
                background: 'transparent',
                display: treeData ? 'block' : 'none'
              }}
              onMouseDown={(e) => e.currentTarget.style.cursor = 'grabbing'}
              onMouseUp={(e) => e.currentTarget.style.cursor = 'grab'}
              onMouseLeave={(e) => e.currentTarget.style.cursor = 'grab'}
            />
            {/* Loading/Empty state */}
            {!treeData && (
              <Box
                display="flex"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                height="100%"
                sx={{ 
                  color: '#f8fafc', 
                  textAlign: 'center',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0
                }}
              >
                {loading ? (
                  <Box textAlign="center" maxWidth={600}>
                    <CircularProgress size={80} sx={{ color: '#10b981', mb: 3 }} />
                    <Typography variant="h5" sx={{ mb: 2, fontFamily: 'Cairo, sans-serif' }}>
                      {loadingStage || `جاري تحميل ${treeTitle}...`}
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={loadingProgress} 
                      sx={{ 
                        width: '100%', 
                        height: 8, 
                        borderRadius: 4, 
                        mb: 2,
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: '#10b981'
                        }
                      }}
                    />
                    <Typography variant="body2" sx={{ color: '#10b981', fontFamily: 'Cairo, sans-serif' }}>
                      {Math.round(loadingProgress)}% مكتمل
                    </Typography>
                  </Box>
                ) : (
                  <Box textAlign="center">
                    <AccountTreeIcon sx={{ fontSize: 120, color: '#10b981', mb: 2 }} />
                    <Typography variant="h4" sx={{ mb: 1, fontFamily: 'Cairo, sans-serif', color: '#10b981' }}>
                      🌳 ابنِ شجرة قبيلتك
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, maxWidth: 500, fontFamily: 'Cairo, sans-serif' }}>
                      👨‍👩‍👧‍👦 أضف أفراد عائلتك: الوالد، رب العائلة، الأطفال، الإخوة، والأقارب
                    </Typography>
                    <Box display="flex" gap={2} justifyContent="center">
                      <Button
                        variant="contained"
                        sx={{ 
                          backgroundColor: '#10b981',
                          '&:hover': { backgroundColor: '#059669' },
                          fontFamily: 'Cairo, sans-serif'
                        }}
                        size="large"
                        onClick={() => navigate('/family')}
                        startIcon={<PersonIcon />}
                      >
                        إضافة أفراد العائلة
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </>
        )}
      </Box>
    );
  };

  const renderToolbar = () => (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(249,250,251,0.98) 50%, rgba(243,244,246,0.98) 100%)',
        backdropFilter: 'blur(25px)',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
        '&::before': {
          content: '""',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
          transition: 'all 0.3s ease'
        }
      }}
    >
      {/* Container الرئيسي مع تصميم متجاوب وارتفاع مقلل */}
      <Box sx={{ 
        px: { xs: 1, sm: 2, md: 3 }, 
        py: { xs: 0.5, sm: 1 },
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        
        {/* العنوان والوصف - ارتفاع مقلل */}
        <Box sx={{ textAlign: 'center', mb: 1 }}>
          <Typography 
            variant="h5" 
            sx={{ 
              mb: 0,
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
              color: '#10b981',
              fontWeight: 700,
              fontFamily: 'Cairo, sans-serif',
              transition: 'all 0.3s ease',
              textShadow: '0 1px 2px rgba(0,0,0,0.1)',
              background: 'linear-gradient(45deg, #10b981 0%, #059669 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
             شجرة قبيلتك
          </Typography>
          
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'text.secondary',
              fontFamily: 'Cairo, sans-serif',
              fontSize: { xs: '0.7rem', sm: '0.75rem' },
              opacity: 0.8,
              maxWidth: '600px',
              margin: '0 auto',
              display: 'block'
            }}
          >
          </Typography>
        </Box>

        {/* شريط التحميل - ارتفاع مقلل */}
        {loading && (
          <LinearProgress 
            variant="determinate" 
            value={loadingProgress} 
            sx={{ 
              mb: 1,
              height: 6, 
              borderRadius: 3,
              backgroundColor: 'rgba(0,0,0,0.06)',
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                borderRadius: 3,
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
              }
            }}
          />
        )}

        {/* الأزرار الرئيسية - أحجام مقللة */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: { xs: 1, sm: 1.5 }, 
          flexWrap: 'wrap', 
          mb: 1,
          alignItems: 'center'
        }}>
          {/* أزرار الإجراءات الأساسية */}
          <Button 
            variant="contained" 
            size={window.innerWidth < 600 ? "small" : "medium"}
            onClick={() => navigate('/family')} 
            disabled={loading} 
            startIcon={<PersonAddIcon sx={{ fontSize: { xs: '1rem', sm: '1.2rem' } }} />} 
            sx={{ 
              px: { xs: 1.5, sm: 2 },
              py: { xs: 0.5, sm: 0.75 },
              fontSize: { xs: '0.75rem', sm: '0.85rem' },
              minWidth: { xs: 'auto', sm: 120 },
              gap: 0.5,
              borderRadius: 2,
              background: 'linear-gradient(45deg, #1976d2 0%, #1565c0 100%)',
              boxShadow: '0 2px 8px rgba(25,118,210,0.25)',
              '&:hover': { 
                background: 'linear-gradient(45deg, #1565c0 0%, #0d47a1 100%)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(25,118,210,0.3)'
              },
              transition: 'all 0.2s ease',
              '& .MuiButton-startIcon': {
                marginLeft: { xs: 0.5, sm: 1 },
                marginRight: { xs: -0.25, sm: 0 }
              }
            }}
          >
            إدارة القبيلة
          </Button>

          <Button 
            variant="contained" 
            size={window.innerWidth < 600 ? "small" : "medium"}
            onClick={() => navigate('/statistics')}
            disabled={loading} 
            startIcon={<BarChartIcon sx={{ fontSize: { xs: '1rem', sm: '1.2rem' } }} />} 
            sx={{ 
              px: { xs: 1.5, sm: 2 },
              py: { xs: 0.5, sm: 0.75 },
              fontSize: { xs: '0.75rem', sm: '0.85rem' },
              minWidth: { xs: 'auto', sm: 120 },
              gap: 0.5,
              borderRadius: 2,
              background: 'linear-gradient(45deg, #10b981 0%, #059669 100%)',
              boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
              '&:hover': { 
                background: 'linear-gradient(45deg, #059669 0%, #047857 100%)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
              },
              transition: 'all 0.2s ease',
              '& .MuiButton-startIcon': {
                marginLeft: { xs: 0.5, sm: 1 },
                marginRight: { xs: -0.25, sm: 0 }
              }
            }}
          >
            الإحصائيات
          </Button>

          {/* زر التحديث */}
          <IconButton 
            onClick={handleRefresh} 
            disabled={loading} 
            size={window.innerWidth < 600 ? "small" : "medium"}
            sx={{ 
              ml: 0.5,
              borderRadius: 1.5,
              background: 'rgba(0,0,0,0.04)',
              '&:hover': {
                background: 'rgba(0,0,0,0.08)',
                transform: 'rotate(180deg) scale(1.05)',
              },
              transition: 'all 0.2s ease'
            }}
            title="إعادة تحميل الشجرة"
          >
            <RefreshIcon />
          </IconButton>
        </Box>

        {/* شريط البحث المحسن - ارتفاع مقلل */}
        <Box sx={{ 
          justifyContent: 'center', 
          mb: 1,
          px: { xs: 1, sm: 0 }
        }}>
          <TextField
            size="small"
            value={searchQuery}
            onChange={(e) => {
              const value = e.target.value;
              setSearchQuery(value);
              // ✅ استخدام debounce لتحسين الأداء (300ms)
              if (searchDebounceRef.current) {
                clearTimeout(searchDebounceRef.current);
              }
              searchDebounceRef.current = setTimeout(() => {
                performSearch(value);
              }, 300);
            }}
            placeholder="🔍 ابحث عن أي شخص في الشجرة للتركيز عليه..."
            variant="outlined"
            sx={{
              width: { xs: '100%', sm: '350px', md: '450px' },
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                borderRadius: 3,
                fontFamily: 'Cairo, sans-serif',
                fontSize: { xs: '0.8rem', sm: '0.9rem' },
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(0,0,0,0.08)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
                },
                '&.Mui-focused': {
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 0 0 2px rgba(16,185,129,0.2)',
                  borderColor: '#10b981'
                },
                transition: 'all 0.2s ease'
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton 
                    size="small" 
                    onClick={() => {
                      setSearchQuery('');
                      if (svgRef.current) {
                        const svg = d3.select(svgRef.current);
                        const g = svg.select('g');
                        g.selectAll('.node').classed('search-highlight', false);
                        g.selectAll('.node foreignObject > div')
                          .classed('search-highlight', false)
                          .style('transform', null)
                          .style('border', null)
                          .style('box-shadow', null)
                          .style('background', null);
                      }
                    }}
                    sx={{ 
                      '&:hover': { 
                        backgroundColor: 'rgba(244,67,54,0.1)',
                        color: '#f44336'
                      } 
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Box>

        {/* إحصائيات الأداء - أحجام مقللة */}
        {performanceMetrics.personCount > 0 && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: { xs: 0.5, sm: 0.75 }, 
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <Chip 
              size="small" 
              label={`👥 ${performanceMetrics.personCount} شخص`} 
              variant="outlined"
              sx={{
                fontSize: { xs: '0.6rem', sm: '0.7rem' },
                height: { xs: 20, sm: 24 }
              }}
            />
            
            <Chip 
              size="small" 
              label={
                treeData?.attributes?.treeType === 'hierarchical' 
                  ? `🏛️ شجرة هرمية (${performanceMetrics.maxDepthReached} أجيال)` 
                  : `🌳 شجرة بسيطة (${performanceMetrics.maxDepthReached} أجيال)`
              }
              variant="outlined" 
              color={treeData?.attributes?.treeType === 'hierarchical' ? 'primary' : 'success'}
              sx={{
                fontSize: { xs: '0.6rem', sm: '0.7rem' },
                height: { xs: 20, sm: 24 }
              }}
            />
          </Box>
        )}
      </Box>
    </Paper>
  );

  return (
    <Box className="family-tree-advanced-root" sx={{ width: '100vw', height: '100vh', fontFamily: 'Cairo, sans-serif' }}>
      {renderToolbar()}
      <Box sx={{ position: 'absolute', top: 110, left: 0, right: 0, bottom: isMobile ? 80 : 0, minHeight: 400 }}>
        {renderTreeView()}
      </Box>

      {/* زر إعادة التركيز العائم - يظهر على الهاتف فقط */}
      {treeData && (
        <>
          <Fab
            color="primary"
            size={isMobile ? "medium" : "small"}
            onClick={resetTreeView}
            sx={{
              position: 'fixed',
              bottom: isMobile ? 90 : 20,
              left: 20,
              zIndex: 1100,
              background: 'linear-gradient(45deg, #10b981 0%, #059669 100%)',
              boxShadow: '0 4px 15px rgba(16,185,129,0.4)',
              '&:hover': {
                background: 'linear-gradient(45deg, #059669 0%, #047857 100%)',
                transform: 'scale(1.1)',
              },
              transition: 'all 0.3s ease',
            }}
            title="إعادة التركيز على الشجرة"
          >
            <CenterFocusStrongIcon />
          </Fab>
          
          {/* ✅ زر طي/فتح كل الفروع */}
          <Fab
            color="warning"
            size={isMobile ? "medium" : "small"}
            onClick={() => {
              const svg = d3.select(svgRef.current);
              const g = svg.select('g');
              
              if (collapsedNodes.size > 0) {
                // ✅ فتح الكل - إظهار جميع العناصر
                g.selectAll(".node")
                  .transition()
                  .duration(400)
                  .style("opacity", 1)
                  .style("pointer-events", "auto");
                
                g.selectAll(".link")
                  .transition()
                  .duration(400)
                  .style("opacity", 0.9);
                
                // إعادة تعيين أزرار الطي
                g.selectAll(".collapse-button circle")
                  .transition()
                  .duration(200)
                  .attr("fill", "#4caf50");
                g.selectAll(".collapse-button text")
                  .filter((_, i, nodes) => i === 0)
                  .text("−");
                
                setCollapsedNodes(new Set());
                showSnackbar('✅ تم فتح جميع الفروع', 'success');
              } else {
                // ✅ طي المستوى الثاني وما بعده
                if (treeData) {
                  const nodesToCollapse = new Set();
                  const nodesToHide = new Set();
                  
                  // جمع العقد للطي (المستوى الأول الذي له أبناء)
                  const collectNodes = (node, depth) => {
                    const nodeId = node.attributes?.id || node.id;
                    if (depth === 1 && node.children && node.children.length > 0 && nodeId) {
                      nodesToCollapse.add(nodeId);
                      // جمع كل الأحفاد للإخفاء
                      const collectDescendants = (n) => {
                        if (n.children) {
                          n.children.forEach(child => {
                            const childId = child.attributes?.id || child.id;
                            if (childId) nodesToHide.add(childId);
                            collectDescendants(child);
                          });
                        }
                      };
                      collectDescendants(node);
                    }
                    if (node.children) {
                      node.children.forEach(child => collectNodes(child, depth + 1));
                    }
                  };
                  collectNodes(treeData, 0);
                  
                  // إخفاء العقد
                  nodesToHide.forEach(hideId => {
                    g.selectAll(".node")
                      .filter(function() {
                        const nodeData = d3.select(this).datum()?.data;
                        const id = nodeData?.attributes?.id || nodeData?.id;
                        return id === hideId;
                      })
                      .transition()
                      .duration(400)
                      .style("opacity", 0)
                      .style("pointer-events", "none");
                    
                    g.selectAll(".link")
                      .filter(linkData => {
                        const sourceId = linkData.source?.data?.attributes?.id || linkData.source?.data?.id;
                        const targetId = linkData.target?.data?.attributes?.id || linkData.target?.data?.id;
                        return hideId === sourceId || hideId === targetId;
                      })
                      .transition()
                      .duration(400)
                      .style("opacity", 0);
                  });
                  
                  // تحديث أزرار الطي للعقد المطوية
                  nodesToCollapse.forEach(collapseId => {
                    g.selectAll(".node")
                      .filter(function() {
                        const nodeData = d3.select(this).datum()?.data;
                        const id = nodeData?.attributes?.id || nodeData?.id;
                        return id === collapseId;
                      })
                      .select(".collapse-button circle")
                      .transition()
                      .duration(200)
                      .attr("fill", "#ff9800");
                  });
                  
                  setCollapsedNodes(nodesToCollapse);
                  showSnackbar(`📂 تم طي ${nodesToCollapse.size} فرع`, 'info');
                }
              }
            }}
            sx={{
              position: 'fixed',
              bottom: isMobile ? 90 : 20,
              left: 140,
              zIndex: 1100,
              background: collapsedNodes.size > 0
                ? 'linear-gradient(45deg, #ff9800 0%, #f57c00 100%)'
                : 'linear-gradient(45deg, #9c27b0 0%, #7b1fa2 100%)',
              boxShadow: collapsedNodes.size > 0
                ? '0 4px 15px rgba(255,152,0,0.4)'
                : '0 4px 15px rgba(156,39,176,0.4)',
              '&:hover': {
                background: collapsedNodes.size > 0
                  ? 'linear-gradient(45deg, #f57c00 0%, #e65100 100%)'
                  : 'linear-gradient(45deg, #7b1fa2 0%, #6a1b9a 100%)',
                transform: 'scale(1.1)',
              },
              transition: 'all 0.3s ease',
            }}
            title={collapsedNodes.size > 0 ? "فتح كل الفروع" : "طي الفروع"}
          >
            {collapsedNodes.size > 0 ? <UnfoldMoreIcon /> : <UnfoldLessIcon />}
          </Fab>
          
          {/* زر تصدير الشجرة كصورة */}
          <Fab
            color="secondary"
            size={isMobile ? "medium" : "small"}
            onClick={exportTreeAsImage}
            disabled={exporting}
            sx={{
              position: 'fixed',
              bottom: isMobile ? 90 : 20,
              left: 80,
              zIndex: 1100,
              background: exporting 
                ? '#9e9e9e'
                : 'linear-gradient(45deg, #1976d2 0%, #1565c0 100%)',
              boxShadow: '0 4px 15px rgba(25,118,210,0.4)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1565c0 0%, #0d47a1 100%)',
                transform: exporting ? 'none' : 'scale(1.1)',
              },
              transition: 'all 0.3s ease',
            }}
            title="تصدير الشجرة كصورة"
          >
            {exporting ? <CircularProgress size={24} color="inherit" /> : <DownloadIcon />}
          </Fab>
        </>
      )}

      {/* الحوارات */}
      <Dialog open={!!selectedNode} onClose={() => setSelectedNode(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#1976d2', fontWeight: 'bold', fontFamily: 'Cairo, sans-serif' }}>
          {(selectedNode?.gender === 'female' || (selectedNode?.relation && FEMALE_RELATIONS.includes(selectedNode?.relation))) ? '♀️' : '♂️'} {selectedNode?.name || 'تفاصيل الشخص'}
        </DialogTitle>
        <DialogContent>
          {selectedNode && (
            <Box sx={{ p: 1 }}>
              <Typography variant="h6" gutterBottom sx={{ fontFamily: 'Cairo, sans-serif' }}>
                {selectedNode.name || buildFullName(selectedNode) || ''}
              </Typography>
              <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {selectedNode.id === membership?.person_id && (
                  <Chip 
                    label="أنا (رب العائلة)"
                    color="success" 
                    variant="outlined" 
                  />
                )}
                {selectedNode.isNephewNiece && (
                  <Chip label="👶 ابن/بنت الأخ/الأخت" color="warning" variant="outlined" />
                )}
                {selectedNode.isExtended && (
                  <Chip label="عائلة مرتبطة" color="secondary" variant="outlined" />
                )}
                {selectedNode.familyName && (
                  <Chip label={selectedNode.familyName} color="info" variant="outlined" />
                )}
              </Box>
              {selectedNode.age && <Typography variant="body2" sx={{ mb: 1 }}>العمر: {selectedNode.age} سنة</Typography>}
              {/* عدد الأبناء والأحفاد */}
              {(selectedNode.children && selectedNode.children.length > 0) && (
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, color: '#4caf50', fontWeight: 'bold' }}>
                    عدد الأبناء: {selectedNode.children.length}
                  </Typography>
                  {(() => {
                    let grandchildrenCount = 0;
                    selectedNode.children.forEach(child => {
                      if (child.children && child.children.length > 0) {
                        grandchildrenCount += child.children.length;
                      }
                    });
                    if (grandchildrenCount > 0) {
                      return (
                        <Typography variant="body2" sx={{ mb: 1, color: '#2196f3', fontWeight: 'bold' }}>
                          عدد الأحفاد: {grandchildrenCount}
                        </Typography>
                      );
                    }
                    return null;
                  })()}
                </Box>
              )}

              {selectedNode.phone && <Typography variant="body2" sx={{ mb: 1 }}>الهاتف: {selectedNode.phone}</Typography>}
              {selectedNode.location && (
                <Typography variant="body2">المكان: {selectedNode.location}</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedNode(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={4000} 
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ fontFamily: 'Cairo, sans-serif' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

    </Box>
  );
}