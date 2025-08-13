// src/components/FamilyTreeAdvanced.jsx - النسخة المصححة مع الشجرة الموسعة الحقيقية
import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as d3 from 'd3';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Typography, Alert, Snackbar, CircularProgress, 
  Chip, IconButton, Tooltip, Paper, LinearProgress, 
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, 
  FormControlLabel, Switch, TextField, InputAdornment
} from '@mui/material';

// استيراد الأيقونات بشكل منفصل لتحسين الأداء
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import LinkIcon from '@mui/icons-material/Link';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';

// استيرادات Firebase
import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';

// استيراد المكونات
import './FamilyTreeAdvanced.css';
import BarChartIcon from '@mui/icons-material/BarChart';

export default function FamilyTreeAdvanced() {
  // ===========================================================================
  // الحالات الأساسية
  // ===========================================================================
  
  const [selectedNode, setSelectedNode] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    loadTime: 0,
    personCount: 0,
    maxDepthReached: 0,
    memoryUsage: 0
  });
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  const [simpleTreeData, setSimpleTreeData] = useState(null);
  const [extendedTreeData, setExtendedTreeData] = useState(null);
  const [isExtendedView, setIsExtendedView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  
  const uid = localStorage.getItem('verifiedUid');
  const navigate = useNavigate();
  
  // المراجع للـ D3
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const reactRootsRef = useRef(new Map());

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

  const sanitizeMemberData = (memberData) => {
    return {
      ...memberData,
      firstName: memberData.firstName?.trim() || '',
      fatherName: memberData.fatherName?.trim() || '',
      grandfatherName: memberData.grandfatherName?.trim() || '',
      surname: memberData.surname?.trim() || '',
      relation: memberData.relation?.trim() || 'عضو'
    };
  };

  const findFamilyHead = useCallback((members) => {
    const head = members.find(m => m.relation === 'رب العائلة');
    if (head) return head;
    
    const sorted = [...members].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateA - dateB;
    });
    
    return sorted[0] || members[0];
  }, []);

  // ===========================================================================
  // دوال أساسية useCallback
  // ===========================================================================

  const buildFullName = useCallback((person) => {
    if (!person) return '';

    const parts = [
        person.firstName,
        person.fatherName,
        person.surname
    ].filter(part => part && part.trim() !== '');

    return parts.length > 0 ? parts.join(' ').trim() : '';
  }, []);

  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  const handleNodeClick = useCallback((nodeData) => {
    if (nodeData.action === 'edit') {
      // منطق التعديل
    } else if (nodeData.action === 'view') {
      // منطق العرض
    }
    
    setSelectedNode(nodeData);
  }, []);

  const monitorPerformance = useCallback((metrics) => {
    // دمج الإحصائيات من النافذة العامة إن وجدت
    const globalMetrics = window.familyTreeMetrics || {};
    
    setPerformanceMetrics(prev => ({
      ...prev,
      ...metrics,
      maxDepthReached: Math.max(prev.maxDepthReached || 0, globalMetrics.maxDepthReached || 0, metrics.maxDepthReached || 0)
    }));
    
    // رسائل تحسينية بناءً على الأداء
    if (metrics.personCount > 100) {
      showSnackbar(`🚀 أداء استثنائي! تم تحميل ${metrics.personCount} شخص بنجاح`, 'success');
    } else if (metrics.personCount > 50) {
      showSnackbar(`✅ تم تحميل ${metrics.personCount} شخص بنجاح`, 'success');
    }
    
    if (metrics.familyCount > 5) {
      showSnackbar(`🏛️ شجرة كبيرة: تم ربط ${metrics.familyCount} عائلة`, 'info');
    } else if (metrics.familyCount > 1) {
      showSnackbar(`🏛️ تم ربط ${metrics.familyCount} عائلة`, 'info');
    }
    
    // تتبع العمق المحقق مع تقييم متقدم للأجيال
    const actualDepth = globalMetrics.maxDepthReached || metrics.maxDepthReached;
    if (actualDepth >= 15) {
      showSnackbar(`🏛️ شجرة قبيلة عظيمة! ${actualDepth} جيل - نظام متقدم جداً`, 'success');
    } else if (actualDepth >= 10) {
      showSnackbar(`🌳 شجرة عميقة ممتازة: ${actualDepth} جيل`, 'success');
    } else if (actualDepth >= 5) {
      showSnackbar(`🌿 عمق جيد: ${actualDepth} أجيال`, 'info');
    } else if (actualDepth >= 2) {
      showSnackbar(`👨‍👩‍👧‍👦 شجرة عائلية: ${actualDepth} أجيال`, 'info');
    }
    
  }, [showSnackbar]);

  // ===========================================================================
  // دوال البناء
  // ===========================================================================

  const buildSimpleTreeStructure = useCallback((familyMembers) => {
    if (!familyMembers || familyMembers.length === 0) {
      return null;
    }

    const head = findFamilyHead(familyMembers);
    if (!head) {
      return null;
    }

    const rootNode = {
      name: buildFullName(head),
      id: head.globalId,
      avatar: head.avatar || null,
      attributes: {
        ...head,
        isCurrentUser: true,
        treeType: 'simple',
        isExtended: false
      },
      children: []
    };

    const children = familyMembers.filter(m => 
      (m.relation === 'ابن' || m.relation === 'بنت' || m.relation === 'child') && 
      m.globalId !== head.globalId
    );

    children.forEach(child => {
      rootNode.children.push({
        name: buildFullName(child),
        id: child.globalId,
        avatar: child.avatar || null,
        attributes: {
          ...child,
          treeType: 'simple',
          isExtended: false
        },
        children: []
      });
    });

    return rootNode;
  }, [buildFullName, findFamilyHead]);

  // دالة جديدة لبناء الشجرة الموسعة مع جميع العلاقات
  const buildExtendedTreeStructure = useCallback((familyMembers) => {
    if (!familyMembers || familyMembers.length === 0) {
      return null;
    }

    const head = findFamilyHead(familyMembers);
    if (!head) {
      return null;
    }

    // تصنيف الأعضاء حسب العلاقة والجيل
    const membersByRelation = {};
    familyMembers.forEach(member => {
      const relation = member.relation || 'غير محدد';
      if (!membersByRelation[relation]) {
        membersByRelation[relation] = [];
      }
      membersByRelation[relation].push(member);
    });

    // بناء الجذر (رب العائلة)
    const rootNode = {
      name: buildFullName(head),
      id: head.globalId,
      avatar: head.avatar || null,
      attributes: {
        ...head,
        isCurrentUser: true,
        treeType: 'extended',
        isExtended: true,
        generation: 0
      },
      children: [],
      parents: [],
      siblings: [],
      spouse: null
    };

    // إضافة الوالدين (الأب والأم)
    const parents = membersByRelation['الأب'] || [];
    const mothers = membersByRelation['الأم'] || [];
    
    rootNode.parents = [
      ...parents.map(p => ({
        name: buildFullName(p),
        id: p.globalId,
        avatar: p.avatar,
        attributes: { ...p, treeType: 'extended', generation: -1 },
        children: []
      })),
      ...mothers.map(m => ({
        name: buildFullName(m),
        id: m.globalId,
        avatar: m.avatar,
        attributes: { ...m, treeType: 'extended', generation: -1 },
        children: []
      }))
    ];

    // إضافة الزوجة
    const spouses = membersByRelation['زوجة رب العائلة'] || [];
    if (spouses.length > 0) {
      rootNode.spouse = {
        name: buildFullName(spouses[0]),
        id: spouses[0].globalId,
        avatar: spouses[0].avatar,
        attributes: { ...spouses[0], treeType: 'extended', generation: 0 }
      };
    }

    // إضافة الإخوة والأخوات
    const brothers = membersByRelation['أخ'] || [];
    const sisters = membersByRelation['أخت'] || [];
    
    rootNode.siblings = [
      ...brothers.map(b => ({
        name: buildFullName(b),
        id: b.globalId,
        avatar: b.avatar,
        attributes: { ...b, treeType: 'extended', generation: 0 },
        children: []
      })),
      ...sisters.map(s => ({
        name: buildFullName(s),
        id: s.globalId,
        avatar: s.avatar,
        attributes: { ...s, treeType: 'extended', generation: 0 },
        children: []
      }))
    ];

    // إضافة الأولاد
    const sons = membersByRelation['ابن'] || [];
    const daughters = membersByRelation['بنت'] || [];
    
    rootNode.children = [
      ...sons.map(son => ({
        name: buildFullName(son),
        id: son.globalId,
        avatar: son.avatar,
        attributes: { ...son, treeType: 'extended', generation: 1 },
        children: [],
        spouse: null
      })),
      ...daughters.map(daughter => ({
        name: buildFullName(daughter),
        id: daughter.globalId,
        avatar: daughter.avatar,
        attributes: { ...daughter, treeType: 'extended', generation: 1 },
        children: [],
        spouse: null
      }))
    ];

    // إضافة الأحفاد
    const grandsons = membersByRelation['حفيد'] || [];
    const granddaughters = membersByRelation['حفيدة'] || [];
    
    [...grandsons, ...granddaughters].forEach(grandchild => {
      // محاولة ربط الحفيد بوالده المناسب
      const parentId = grandchild.parentId;
      const parent = rootNode.children.find(child => child.id === parentId);
      
      if (parent) {
        parent.children.push({
          name: buildFullName(grandchild),
          id: grandchild.globalId,
          avatar: grandchild.avatar,
          attributes: { ...grandchild, treeType: 'extended', generation: 2 },
          children: []
        });
      }
    });

    // إضافة الأعمام والعمات كفرع منفصل
    const uncles = membersByRelation['عم'] || [];
    const aunts = membersByRelation['عمة'] || [];
    
    if (uncles.length > 0 || aunts.length > 0) {
      rootNode.unclesAunts = [
        ...uncles.map(uncle => ({
          name: buildFullName(uncle),
          id: uncle.globalId,
          avatar: uncle.avatar,
          attributes: { ...uncle, treeType: 'extended', generation: 0 },
          children: []
        })),
        ...aunts.map(aunt => ({
          name: buildFullName(aunt),
          id: aunt.globalId,
          avatar: aunt.avatar,
          attributes: { ...aunt, treeType: 'extended', generation: 0 },
          children: []
        }))
      ];
    }

    // إضافة الأخوال والخالات كفرع منفصل
    const motherUncles = membersByRelation['خال'] || [];
    const motherAunts = membersByRelation['خالة'] || [];
    
    if (motherUncles.length > 0 || motherAunts.length > 0) {
      rootNode.motherSide = [
        ...motherUncles.map(uncle => ({
          name: buildFullName(uncle),
          id: uncle.globalId,
          avatar: uncle.avatar,
          attributes: { ...uncle, treeType: 'extended', generation: 0 },
          children: []
        })),
        ...motherAunts.map(aunt => ({
          name: buildFullName(aunt),
          id: aunt.globalId,
          avatar: aunt.avatar,
          attributes: { ...aunt, treeType: 'extended', generation: 0 },
          children: []
        }))
      ];
    }

    return rootNode;
  }, [buildFullName, findFamilyHead]);

  // دالة مشتركة لرسم الكارت بنفس التصميم الأصلي
  const drawNodeCard = useCallback((nodeGroup, nodeData, name, relation, uniqueId, cardWidth, cardHeight, padding, avatarSize, textStartX) => {
    const nameY = -cardHeight / 2 + padding + 14;
    const relationY = nameY + 18;
    const ageBoxWidth = 40;
    const ageBoxHeight = 16;
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
    const age = calculateAge(nodeData.birthdate || nodeData.birthDate);

    // تحديد الألوان حسب الجنس
    let cardFill = "#f3f4f6";
    let cardStroke = "#cbd5e1";

    if (nodeData.gender === "male" || relation.includes("ابن") || relation.includes("أب") || relation.includes("جد") || relation.includes("عم") || relation.includes("خال")) {
      cardFill = "#e3f2fd";
      cardStroke = "#2196f3";
    } else if (nodeData.gender === "female" || relation.includes("بنت") || relation.includes("أم") || relation.includes("جدة") || relation.includes("عمة") || relation.includes("خالة") || relation.includes("زوجة")) {
      cardFill = "#fce4ec";
      cardStroke = "#e91e63";
    }

    // الكارت الرئيسي
    nodeGroup.append("rect")
      .attr("width", cardWidth)
      .attr("height", cardHeight)
      .attr("x", -cardWidth / 2)
      .attr("y", -cardHeight / 2)
      .attr("rx", 14)
      .attr("fill", cardFill)
      .attr("stroke", cardStroke)
      .attr("stroke-width", 2)
      .attr("class", "family-node-card");

    // دائرة خلفية الصورة
    nodeGroup.append("circle")
      .attr("cx", -cardWidth / 2 + padding + avatarSize / 2)
      .attr("cy", -cardHeight / 2 + padding + avatarSize / 2)
      .attr("r", avatarSize / 2)
      .attr("fill", "#fff")
      .attr("stroke", "#ddd")
      .attr("stroke-width", 1.5);

    // ClipPath دائري للصورة
    nodeGroup.append("clipPath")
      .attr("id", `avatar-circle-${uniqueId}`)
      .append("circle")
      .attr("cx", -cardWidth / 2 + padding + avatarSize / 2)
      .attr("cy", -cardHeight / 2 + padding + avatarSize / 2)
      .attr("r", avatarSize / 2);

    // صورة داخل الدائرة
    nodeGroup.append("image")
      .attr("href",
        nodeData.avatar ||
        (nodeData.gender === "female" || relation.includes("بنت") || relation.includes("أم") || relation.includes("جدة") || relation.includes("عمة") || relation.includes("خالة") || relation.includes("زوجة")
          ? "/icons/girl.png"
          : "/icons/boy.png")
      )
      .attr("x", -cardWidth / 2 + padding)
      .attr("y", -cardHeight / 2 + padding)
      .attr("width", avatarSize)
      .attr("height", avatarSize)
      .attr("clip-path", `url(#avatar-circle-${uniqueId})`)
      .attr("preserveAspectRatio", "xMidYMid slice");

    // الاسم
    nodeGroup.append("text")
      .text(name.length > 22 ? name.slice(0, 20) + '…' : name)
      .attr("x", textStartX)
      .attr("y", nameY)
      .attr("font-size", 13)
      .attr("font-weight", "bold")
      .attr("fill", "#111");

    // العلاقة
    nodeGroup.append("text")
      .text(relation)
      .attr("x", textStartX)
      .attr("y", relationY)
      .attr("font-size", 11)
      .attr("fill", "#666");

    if (age) {
      // خلفية العمر
      nodeGroup.append("rect")
        .attr("x", ageBoxX)
        .attr("y", ageBoxY)
        .attr("width", ageBoxWidth)
        .attr("height", ageBoxHeight)
        .attr("rx", 8)
        .attr("fill", "rgba(25, 118, 210, 0.08)")
        .attr("stroke", "rgba(25, 118, 210, 0.2)")
        .attr("stroke-width", 1);

      // نص العمر
      nodeGroup.append("text")
        .text(`${age} سنة`)
        .attr("x", ageTextX)
        .attr("y", ageTextY)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", 9)
        .attr("font-weight", "500")
        .attr("fill", "#1976d2");
    }
  }, []);

  const calculateTreeDepth = useCallback((node, currentDepth = 0) => {
    if (!node || !node.children || node.children.length === 0) {
      return currentDepth;
    }
    
    let maxDepth = currentDepth;
    node.children.forEach(child => {
      const childDepth = calculateTreeDepth(child, currentDepth + 1);
      maxDepth = Math.max(maxDepth, childDepth);
    });
    
    return maxDepth;
  }, []);

  // ===========================================================================
  // دوال التحميل الرئيسية
  // ===========================================================================

  const loadSimpleTree = useCallback(async () => {
    if (!uid) {
      return;
    }
    
    setLoading(true);
    setLoadingStage('تحميل عائلتك...');
    setLoadingProgress(0);

    try {
      const familySnapshot = await getDocs(collection(db, 'users', uid, 'family'));
      const familyMembers = [];
      
      setLoadingProgress(30);
      
      familySnapshot.forEach(doc => {
        const memberData = sanitizeMemberData({ 
          ...doc.data(), 
          id: doc.id,
          globalId: `${uid}_${doc.id}`,
          familyUid: uid
        });
        
        if (memberData.firstName && memberData.firstName.trim() !== '') {
          familyMembers.push(memberData);
        }
      });

      setLoadingProgress(60);
      setLoadingStage('بناء الشجرة...');

      const simpleTree = buildSimpleTreeStructure(familyMembers);
      const extendedTree = buildExtendedTreeStructure(familyMembers);
      
      setLoadingProgress(100);
      setLoadingStage('اكتمل التحميل');
      
      setSimpleTreeData(simpleTree);
      setExtendedTreeData(extendedTree);
      
      // تسجيل مقاييس الأداء
      monitorPerformance({
        personCount: familyMembers.length,
        maxDepthReached: isExtendedView ? 3 : 2,
        familyCount: 1,
        loadTime: 1000
      });
      
      showSnackbar(`✅ تم تحميل عائلتك: ${familyMembers.length} أفراد (${isExtendedView ? 'شجرة موسعة' : 'رب العائلة وأولاده'})`, 'success');

    } catch {
      setError('فشل في تحميل الشجرة');
      showSnackbar('❌ فشل في تحميل الشجرة', 'error');
    } finally {
      setLoading(false);
    }
  }, [uid, showSnackbar, monitorPerformance, buildSimpleTreeStructure, buildExtendedTreeStructure, isExtendedView]);

  // ===========================================================================
  // دوال التحكم
  // ===========================================================================

  const handleRefresh = useCallback(() => {
    setSimpleTreeData(null);
    loadSimpleTree();
  }, [loadSimpleTree]);

  // ===========================================================================
  // دالة رسم الشجرة
  // ===========================================================================

  // استبدل دالة drawTreeWithD3 بهذا الكود الذي يحافظ على التصميم الأصلي مع أنيميشن بسيط:

const drawTreeWithD3 = useCallback((data) => {
  if (!data || !svgRef.current || !containerRef.current) return;

  const screenWidth = window.innerWidth;

  let cardWidth = 220;
  let cardHeight = 110;

  if (screenWidth < 480) {
    cardWidth = 160;
    cardHeight = 90;
  } else if (screenWidth < 768) {
    cardWidth = 190;
    cardHeight = 100;
  }

  const avatarSize = cardHeight * 0.45;
  const padding = 10;
  const textStartX = padding + avatarSize + 16;

  const svg = d3.select(svgRef.current);
  // ✅ إصلاح زووم iPhone
  svg
    .style("touch-action", "none")         // يمنع سحب الصفحة في iOS
    .style("overflow", "visible");         // يسمح للخريطة بالخروج من svg

  svg.attr('transform', null); 
  svg.property('__zoom', d3.zoomIdentity); 
  svg.selectAll('*').remove(); 

  // إعداد بيانات الشجرة وتحديد النوع
  const root = d3.hierarchy(data);
  const isExtended = data.attributes?.treeType === 'extended';

  // إعداد الأبعاد - توسيع للشجرة الموسعة
  const container = containerRef.current;
  const baseWidth = container.clientWidth;
  const baseHeight = container.clientHeight;
  
  // توسيع أبعاد SVG للشجرة الموسعة لاستيعاب العقد الإضافية
  const width = isExtended ? Math.max(baseWidth, 1400) : baseWidth;
  const height = isExtended ? Math.max(baseHeight, 800) : baseHeight;
  
  svg.attr('width', width).attr('height', height).style('background', 'transparent');

  // ✅ أنشئ g ثم فعّل الزووم عليه
  const g = svg.append('g');
  g
    .attr('transform', null)
    .style("touch-action", "manipulation")
    .style("will-change", "transform");

  // إعداد الزووم وربطه على g فقط
  const zoom = d3.zoom()
    .scaleExtent([0.1, 3])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });
    svg.call(zoom);
    svg.property('__zoom', d3.zoomIdentity); 

  // حساب عمق الشجرة (عدد الأجيال)
  let maxDepth = 1;
  let generationCounts = {};
  let maxBreadth = 1;
  root.each(d => {
    if (d.depth > maxDepth) maxDepth = d.depth;
    generationCounts[d.depth] = (generationCounts[d.depth] || 0) + 1;
    if (generationCounts[d.depth] > maxBreadth) maxBreadth = generationCounts[d.depth];
  });

  // إعداد المسافات حسب نوع الشجرة
  const verticalGap = isExtended ? 70 : 55;
  const dynamicHeight = Math.max(verticalGap * maxDepth, 180);
  const dynamicWidth = width - 100;

  // إعداد تخطيط الشجرة مع توزيع أفقي متساوٍ تماماً (بدون أي تراكب)
  const treeLayout = d3.tree()
    .size([dynamicWidth, dynamicHeight])
    .separation(() => {
      // توزيع أفقي متساوٍ تماماً بين جميع العقد في نفس الجيل (1)
      return 1;
    }); 

  treeLayout(root);

  // رسم الروابط الإضافية للشجرة الموسعة بنفس نمط الشجرة الأصلية
  if (isExtended && data.parents && data.parents.length > 0) {
    const parentX = root.x; // الوالد في نفس المحور الأفقي لصاحب الحساب
    const parentY = root.y - 200; // الوالد أعلى من صاحب الحساب
    
    // إذا كان هناك أشقاء، ارسم نظام خطوط كامل
    if (data.siblings && data.siblings.length > 0) {
      // تحديد مواقع الأشقاء
      const siblingPositions = data.siblings.map((sibling, index) => {
        if (data.siblings.length === 1) {
          return root.x + (index === 0 ? -350 : 350);
        } else if (data.siblings.length === 2) {
          return root.x + (index === 0 ? -350 : 350);
        } else {
          const spacing = 300;
          const totalWidth = (data.siblings.length - 1) * spacing;
          const startX = root.x - totalWidth / 2;
          return startX + (index * spacing);
        }
      });
      
      // جميع المواقع (الأشقاء + صاحب الحساب)
      const allPositions = [...siblingPositions, root.x].sort((a, b) => a - b);
      const leftmost = allPositions[0];
      const rightmost = allPositions[allPositions.length - 1];
      const horizontalLineY = root.y - 50; // مستوى الخط الأفقي
      
      // 1. خط عمودي من الوالد إلى الخط الأفقي
      g.append("path")
        .attr("class", "parent-to-horizontal-line")
        .attr("d", `M${parentX},${parentY + cardHeight/2} L${parentX},${horizontalLineY}`)
        .style("fill", "none")
        .style("stroke", "#cbd5e1")
        .style("stroke-width", 2)
        .style("stroke-linecap", "round")
        .style("opacity", 0)
        .transition()
        .delay(600)
        .duration(600)
        .ease(d3.easeQuadOut)
        .style("opacity", 0.85);
      
      // 2. خط أفقي يربط جميع الأشقاء مع صاحب الحساب
      g.append("path")
        .attr("class", "horizontal-siblings-line")
        .attr("d", `M${leftmost},${horizontalLineY} L${rightmost},${horizontalLineY}`)
        .style("fill", "none")
        .style("stroke", "#cbd5e1")
        .style("stroke-width", 2)
        .style("stroke-linecap", "round")
        .style("opacity", 0)
        .transition()
        .delay(700)
        .duration(600)
        .ease(d3.easeQuadOut)
        .style("opacity", 0.85);
      
      // 3. خط عمودي من الخط الأفقي إلى صاحب الحساب
      g.append("path")
        .attr("class", "horizontal-to-owner")
        .attr("d", `M${root.x},${horizontalLineY} L${root.x},${root.y - cardHeight/2}`)
        .style("fill", "none")
        .style("stroke", "#cbd5e1")
        .style("stroke-width", 2)
        .style("stroke-linecap", "round")
        .style("opacity", 0)
        .transition()
        .delay(800)
        .duration(400)
        .ease(d3.easeQuadOut)
        .style("opacity", 0.85);
      
      // 4. خطوط عمودية من الخط الأفقي إلى كل شقيق
      data.siblings.forEach((sibling, index) => {
        let siblingX;
        if (data.siblings.length === 1) {
          siblingX = root.x + (index === 0 ? -350 : 350);
        } else if (data.siblings.length === 2) {
          siblingX = root.x + (index === 0 ? -350 : 350);
        } else {
          const spacing = 300;
          const totalWidth = (data.siblings.length - 1) * spacing;
          const startX = root.x - totalWidth / 2;
          siblingX = startX + (index * spacing);
        }
        
        g.append("path")
          .attr("class", `horizontal-to-sibling-${index}`)
          .attr("d", `M${siblingX},${horizontalLineY} L${siblingX},${root.y - cardHeight/2}`)
          .style("fill", "none")
          .style("stroke", "#cbd5e1")
          .style("stroke-width", 2)
          .style("stroke-linecap", "round")
          .style("opacity", 0)
          .transition()
          .delay(800 + index * 100)
          .duration(400)
          .ease(d3.easeQuadOut)
          .style("opacity", 0.85);
      });
    } else {
      // إذا لم يكن هناك أشقاء، ارسم خط مباشر من الوالد إلى صاحب الحساب
      g.append("path")
        .attr("class", "parent-to-owner-direct")
        .attr("d", () => {
          const midY = root.y + (parentY - root.y) / 2;
          const radius = 18;
          return `M${root.x},${root.y - cardHeight/2}
                  L${root.x},${midY - radius}
                  Q${root.x},${midY} ${root.x},${midY}
                  L${root.x},${midY + radius}
                  L${root.x},${parentY + cardHeight/2}`;
        })
        .style("fill", "none")
        .style("stroke", "#cbd5e1")
        .style("stroke-width", 2)
        .style("stroke-linecap", "round")
        .style("stroke-linejoin", "round")
        .style("opacity", 0)
        .transition()
        .delay(600)
        .duration(800)
        .ease(d3.easeQuadOut)
        .style("opacity", 0.85);
    }
  }

  if (isExtended && data.unclesAunts) {
    // رسم خطوط للأعمام والعمات بنفس النمط
    data.unclesAunts.forEach((uncleAunt, index) => {
      const uncleAuntX = root.x + (index % 2 === 0 ? -200 : 200);
      const uncleAuntY = root.y - 200;
      
      g.append("path")
        .attr("class", "uncle-aunt-link")
        .attr("d", () => {
          const midY = root.y + (uncleAuntY - root.y) / 2;
          const radius = 18;
          return `M${root.x},${root.y - cardHeight/2}
                  L${root.x},${midY - radius}
                  Q${root.x},${midY} ${root.x + (uncleAuntX > root.x ? radius : -radius)},${midY}
                  L${uncleAuntX - (uncleAuntX > root.x ? radius : -radius)},${midY}
                  Q${uncleAuntX},${midY} ${uncleAuntX},${midY + radius}
                  L${uncleAuntX},${uncleAuntY + cardHeight/2}`;
        })
        .style("fill", "none")
        .style("stroke", "#cbd5e1")
        .style("stroke-width", 2)
        .style("stroke-linecap", "round")
        .style("stroke-linejoin", "round")
        .style("opacity", 0)
        .transition()
        .delay(1000)
        .duration(800)
        .ease(d3.easeQuadOut)
        .style("opacity", 0.85);
    });
  }

  if (isExtended && data.motherSide) {
    // رسم خطوط للأخوال والخالات بنفس النمط
    data.motherSide.forEach((motherSide, index) => {
      const motherSideX = root.x + (index % 2 === 0 ? -500 : 500);
      
      g.append("path")
        .attr("class", "mother-side-link")
        .attr("d", () => {
          const midY = root.y - 25;
          return `M${root.x + (motherSideX > root.x ? cardWidth/2 : -cardWidth/2)},${root.y}
                  L${root.x + (motherSideX > root.x ? 120 : -120)},${root.y}
                  Q${root.x + (motherSideX > root.x ? 140 : -140)},${root.y} ${root.x + (motherSideX > root.x ? 140 : -140)},${midY}
                  L${motherSideX + (motherSideX > root.x ? -140 : 140)},${midY}
                  Q${motherSideX + (motherSideX > root.x ? -120 : 120)},${midY} ${motherSideX + (motherSideX > root.x ? -cardWidth/2 : cardWidth/2)},${root.y - 50}`;
        })
        .style("fill", "none")
        .style("stroke", "#cbd5e1")
        .style("stroke-width", 2)
        .style("stroke-linecap", "round")
        .style("stroke-linejoin", "round")
        .style("opacity", 0)
        .transition()
        .delay(1200)
        .duration(800)
        .ease(d3.easeQuadOut)
        .style("opacity", 0.85);
    });
  }

  // رسم الروابط مع أنيميشن بسيط - نفس النمط للشجرة العادية والموسعة
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
    .style("stroke", "#cbd5e1")
    .style("stroke-width", 2)
    .style("stroke-linecap", "round")
    .style("stroke-linejoin", "round")
    .style("opacity", 0) // بدء مخفي للأنيميشن
    .style("filter", "none")
    .style("stroke-dasharray", "none");

  // أنيميشن بسيط للروابط
  links.transition()
    .delay(500)
    .duration(800)
    .ease(d3.easeQuadOut)
    .style("opacity", 0.85);

  // رسم العقد مع أنيميشن بسيط
  const nodes = g.selectAll(".node")
    .data(root.descendants())
    .enter().append("g")
    .attr("class", "node")
    .attr("data-depth", d => d.depth) // للأنيميشن CSS
    .attr("transform", d => `translate(${d.x},${d.y})`)
    .style("opacity", 0); // بدء مخفي للأنيميشن

  // أنيميشن بسيط للعقد
  nodes.transition()
    .delay((d, i) => d.depth * 200 + i * 50)
    .duration(600)
    .ease(d3.easeBackOut)
    .style("opacity", 1);

  // إضافة محتوى العقد - نفس التصميم الأصلي تماماً
  nodes.each(function(d) {
  const nodeGroup = d3.select(this);
  const nodeData = d.data.attributes || d.data;
  
  const uniqueId = nodeData.id || nodeData.globalId || Math.random().toString(36).substring(7);
  const name = nodeData.name || `${nodeData.firstName || ''} ${nodeData.fatherName || ''}`.trim() || '';
  const relation = nodeData.relation || 'عضو';
  const nameY = -cardHeight / 2 + padding + 14;
  const relationY = nameY + 18;
  const childBoxWidth = 40;
  const childBoxHeight = 16;
  const childBoxX = -cardWidth / 2 + padding;
  const childBoxY = cardHeight / 2 - childBoxHeight - 4;
  const childTextX = childBoxX + childBoxWidth / 2;
  const childTextY = childBoxY + childBoxHeight / 2 + 1.5;
  const ageBoxWidth = 40;
  const ageBoxHeight = 16;
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
  const age = calculateAge(nodeData.birthdate || nodeData.birthDate);

  // الكارت
  // 🟦 تحديد الألوان حسب الجنس
  let cardFill = "#f3f4f6";
  let cardStroke = "#cbd5e1";

  if (nodeData.gender === "male" || relation.includes("ابن")) {
    cardFill = "#e3f2fd";
    cardStroke = "#2196f3";
  } else if (nodeData.gender === "female" || relation.includes("بنت")) {
    cardFill = "#fce4ec";
    cardStroke = "#e91e63";
  }

  nodeGroup.append("rect")
    .attr("width", cardWidth)
    .attr("height", cardHeight)
    .attr("x", -cardWidth / 2)
    .attr("y", -cardHeight / 2)
    .attr("rx", 14)
    .attr("fill", cardFill)
    .attr("stroke", cardStroke)
    .attr("stroke-width", 2)
    .attr("class", "family-node-card");

  // صورة أو أفاتار
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
    nodeData.avatar ||
    (nodeData.gender === "female" || relation.includes("بنت")
      ? "/icons/girl.png"
      : "/icons/boy.png")
  )
  .attr("x", -cardWidth / 2 + padding)
  .attr("y", -cardHeight / 2 + padding)
  .attr("width", avatarSize)
  .attr("height", avatarSize)
  .attr("clip-path", `url(#avatar-circle-${uniqueId})`)
  .attr("preserveAspectRatio", "xMidYMid slice");

  // الاسم
  nodeGroup.append("text")
    .text(name.length > 22 ? name.slice(0, 20) + '…' : name)
    .attr("x", textStartX)
    .attr("y", nameY)
    .attr("font-size", 13)
    .attr("font-weight", "bold")
    .attr("fill", "#111");

  // العلاقة
  nodeGroup.append("text")
    .text(relation)
    .attr("x", textStartX)
    .attr("y", relationY)
    .attr("font-size", 11)
    .attr("fill", "#666");

  if (age) {
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
  .text(age + " سنة") // إضافة كلمة سنة بجانب العمر
  .attr("x", ageTextX)
  .attr("y", ageTextY)
  .attr("font-size", 10)
  .attr("fill", "#1976d2")
  .attr("font-weight", "600")
  .attr("text-anchor", "middle")
  .attr("dominant-baseline", "middle");
}

  // ✅ الخلفية خلف عدد الأطفال
  if (d.children && d.children.length > 0) {
    const childText = ` ${d.children.length}`;
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
    .attr("font-size", 10)
    .attr("fill", "#4caf50")
    .attr("font-weight", "600")
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle");
}

if (searchQuery.length > 1 && name.toLowerCase().includes(searchQuery.toLowerCase())) {
  nodeGroup.select("rect.family-node-card")
    .transition()
    .duration(600)
    .attr("stroke", "#f59e0b")
    .attr("stroke-width", 3);
}

  // عند الضغط
  nodeGroup.on("click", () => {
    handleNodeClick?.({
      ...nodeData,
      name,
      age,
      children: d.children || []
    });
  });
});

  // معالجة تداخل العقد - نفس الطريقة الأصلية
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
      // إذا كان هناك تداخل أو تقاطع بين الكروت، نحرك العقدة الحالية يميناً
      const minDistance = 340; 
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
          const scale = Math.min(
            (width * 0.9) / fullWidth,
            (height * 0.9) / fullHeight,
            1.2
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
    
    // رسم العُقد الإضافية للشجرة الموسعة بنفس التصميم الأصلي
    if (isExtended) {
      // رسم عُقد الوالدين
      if (data.parents) {
        data.parents.forEach((parent, index) => {
          const parentNode = g.append("g")
            .attr("class", "node extended-node parent-node")
            .attr("transform", `translate(${root.x}, ${root.y - 200})`)
            .style("cursor", "pointer")
            .style("opacity", 0);
            
          // رسم الكارت باستخدام الدالة المشتركة
          const nodeData = parent.attributes || parent;
          const name = nodeData.name || parent.name || '';
          const relation = nodeData.relation || 'والد';
          const uniqueId = nodeData.id || nodeData.globalId || `parent_${index}`;
          
          drawNodeCard(parentNode, nodeData, name, relation, uniqueId, cardWidth, cardHeight, padding, avatarSize, textStartX);
          
          // أنيميشن الظهور
          parentNode.transition()
            .delay(800)
            .duration(600)
            .ease(d3.easeBackOut)
            .style("opacity", 1);
        });
      }
      
      // رسم عُقد الإخوة والأخوات
      if (data.siblings) {
        data.siblings.forEach((sibling, index) => {
          // توزيع أفضل للأشقاء - تجنب التداخل
          let siblingX;
          if (data.siblings.length === 1) {
            siblingX = root.x + (index === 0 ? -350 : 350);
          } else if (data.siblings.length === 2) {
            siblingX = root.x + (index === 0 ? -350 : 350);
          } else {
            // للأشقاء الأكثر من 2 - توزيع متوازن
            const spacing = 300;
            const totalWidth = (data.siblings.length - 1) * spacing;
            const startX = root.x - totalWidth / 2;
            siblingX = startX + (index * spacing);
          }
          
          const siblingNode = g.append("g")
            .attr("class", "node extended-node sibling-node")
            .attr("transform", `translate(${siblingX}, ${root.y})`)
            .style("cursor", "pointer")
            .style("opacity", 0);
            
          // رسم الكارت باستخدام الدالة المشتركة
          const nodeData = sibling.attributes || sibling;
          const name = nodeData.name || sibling.name || '';
          const relation = nodeData.relation || 'شقيق';
          const uniqueId = nodeData.id || nodeData.globalId || `sibling_${index}`;
          
          drawNodeCard(siblingNode, nodeData, name, relation, uniqueId, cardWidth, cardHeight, padding, avatarSize, textStartX);
            
          // أنيميشن الظهور
          siblingNode.transition()
            .delay(1000 + index * 100)
            .duration(600)
            .ease(d3.easeBackOut)
            .style("opacity", 1);
        });
      }
      
      // رسم عُقد الأعمام والعمات
      if (data.unclesAunts) {
        data.unclesAunts.forEach((uncleAunt, index) => {
          const uncleAuntNode = g.append("g")
            .attr("class", "node extended-node uncle-aunt-node")
            .attr("transform", `translate(${root.x + (index % 2 === 0 ? -200 : 200)}, ${root.y - 200})`)
            .style("cursor", "pointer")
            .style("opacity", 0);
            
          // رسم الكارت باستخدام الدالة المشتركة
          const nodeData = uncleAunt.attributes || uncleAunt;
          const name = nodeData.name || uncleAunt.name || '';
          const relation = nodeData.relation || 'عم';
          const uniqueId = nodeData.id || nodeData.globalId || `uncle_${index}`;
          
          drawNodeCard(uncleAuntNode, nodeData, name, relation, uniqueId, cardWidth, cardHeight, padding, avatarSize, textStartX);
            
          // أنيميشن الظهور
          uncleAuntNode.transition()
            .delay(1200 + index * 100)
            .duration(600)
            .ease(d3.easeBackOut)
            .style("opacity", 1);
        });
      }
      
      // رسم عُقد الأخوال والخالات
      if (data.motherSide) {
        data.motherSide.forEach((motherSide, index) => {
          const motherSideNode = g.append("g")
            .attr("class", "node extended-node mother-side-node")
            .attr("transform", `translate(${root.x + (index % 2 === 0 ? -500 : 500)}, ${root.y - 50})`)
            .style("cursor", "pointer")
            .style("opacity", 0);
            
          // رسم الكارت باستخدام الدالة المشتركة
          const nodeData = motherSide.attributes || motherSide;
          const name = nodeData.name || motherSide.name || '';
          const relation = nodeData.relation || 'خال';
          const uniqueId = nodeData.id || nodeData.globalId || `mother_side_${index}`;
          
          drawNodeCard(motherSideNode, nodeData, name, relation, uniqueId, cardWidth, cardHeight, padding, avatarSize, textStartX);
            
          // أنيميشن الظهور
          motherSideNode.transition()
            .delay(1400 + index * 100)
            .duration(600)
            .ease(d3.easeBackOut)
            .style("opacity", 1);
        });
      }
      
      // رسم عُقدة الزوجة
      if (data.spouse) {
        const spouseNode = g.append("g")
          .attr("class", "node extended-node spouse-node")
          .attr("transform", `translate(${root.x + 250}, ${root.y})`)
          .style("cursor", "pointer")
          .style("opacity", 0);
          
        // رسم الكارت باستخدام الدالة المشتركة
        const nodeData = data.spouse.attributes || data.spouse;
        const name = nodeData.name || data.spouse.name || '';
        const relation = nodeData.relation || 'زوجة';
        const uniqueId = nodeData.id || nodeData.globalId || 'spouse';
        
        drawNodeCard(spouseNode, nodeData, name, relation, uniqueId, cardWidth, cardHeight, padding, avatarSize, textStartX);
          
        // رمز القلب للزواج
        spouseNode.append("text")
          .attr("x", cardWidth / 2 - 20)
          .attr("y", -cardHeight / 2 + 20)
          .style("font-size", "16px")
          .style("fill", "#ec4899")
          .text("💕");
          
        // أنيميشن الظهور
        spouseNode.transition()
          .delay(600)
          .duration(600)
          .ease(d3.easeBackOut)
          .style("opacity", 1);
          
        // خط الربط للزوجة بنفس النمط
        g.append("path")
          .attr("class", "spouse-link")
          .attr("d", () => {
            const midX = root.x + 125;
            const radius = 18;
            return `M${root.x + cardWidth/2},${root.y}
                    L${midX - radius},${root.y}
                    Q${midX},${root.y} ${midX},${root.y}
                    L${midX},${root.y}
                    Q${midX},${root.y} ${midX + radius},${root.y}
                    L${root.x + 250 - cardWidth/2},${root.y}`;
          })
          .style("fill", "none")
          .style("stroke", "#cbd5e1")
          .style("stroke-width", 2)
          .style("stroke-linecap", "round")
          .style("stroke-linejoin", "round")
          .style("opacity", 0)
          .transition()
          .delay(400)
          .duration(800)
          .ease(d3.easeQuadOut)
          .style("opacity", 0.85);
      }
    }
  }, 1200);

}, [handleNodeClick, searchQuery, drawNodeCard]);

  // دالة البحث المحلية - مبسطة
  const performSearch = useCallback((query) => {
    if (!query || query.trim().length < 2) {
      // إزالة التميز إذا كان البحث فارغ
      if (svgRef.current) {
        const svg = d3.select(svgRef.current);
        svg.selectAll('.node rect')
          .style('stroke', '#ddd')
          .style('stroke-width', '2px');
        svg.selectAll('.node text')
          .style('font-weight', 'normal');
      }
      return;
    }
    
    const queryLower = query.trim().toLowerCase();
    
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      
      // إعادة تعيين كل العقد لحالتها الطبيعية أولاً
      svg.selectAll('.node rect')
        .style('stroke', '#ddd')
        .style('stroke-width', '2px');
      svg.selectAll('.node text')
        .style('font-weight', 'normal');
      
      // البحث وتميز العقد المطابقة
      svg.selectAll('.node').each(function(d) {
        const name = d.data?.name?.toLowerCase() || '';
        if (name.includes(queryLower)) {
          // تميز العقدة المطابقة
          d3.select(this).select('rect')
            .style('stroke', '#ffeb3b')
            .style('stroke-width', '4px');
          d3.select(this).select('text')
            .style('font-weight', 'bold');
        }
      });
    }
  }, []);

  // ===========================================================================
  // تأثيرات ودورة الحياة
  // ===========================================================================

  useEffect(() => {
    if (!uid) {
      navigate('/login');
      return;
    }

    loadSimpleTree();
  }, [uid, navigate, loadSimpleTree]);

  // تأثير رسم الشجرة
  useEffect(() => {
    const currentTreeData = isExtendedView ? extendedTreeData : simpleTreeData;
    if (currentTreeData && svgRef.current && containerRef.current) {
      const timer = setTimeout(() => {
        drawTreeWithD3(currentTreeData);
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [drawTreeWithD3, simpleTreeData, extendedTreeData, isExtendedView]);

  // تأثير البحث
  useEffect(() => {
    performSearch(searchQuery);
  }, [searchQuery, performSearch]);

  // تنظيف عند إلغاء التحميل
  useEffect(() => {
    const currentReactRoots = reactRootsRef.current;
    return () => {
      currentReactRoots.forEach(root => {
        try {
          if (!ReactDOM.unstable_isNewReconciler) {
            root.unmount();
          }
        } catch {
          // Silent cleanup
        }
      });
      currentReactRoots.clear();
    };
  }, []);

  // ===========================================================================
  // واجهة المستخدم
  // ===========================================================================

  const renderTreeView = () => {
    const currentTreeData = isExtendedView ? extendedTreeData : simpleTreeData;
    const treeTitle = isExtendedView ? 'الشجرة الموسعة - جميع العلاقات' : 'شجرة عائلتك';
    
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
        ) : currentTreeData ? (
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            style={{ 
              cursor: 'grab', 
              userSelect: 'none',
              background: 'transparent'
            }}
            onMouseDown={(e) => e.currentTarget.style.cursor = 'grabbing'}
            onMouseUp={(e) => e.currentTarget.style.cursor = 'grab'}
            onMouseLeave={(e) => e.currentTarget.style.cursor = 'grab'}
          />
        ) : (
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            height="100%"
            sx={{ color: '#f8fafc', textAlign: 'center' }}
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
                   ابنِ شجرة عائلتك
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, maxWidth: 500, fontFamily: 'Cairo, sans-serif' }}>
                  ‍👩‍👧‍👦 أضف أفراد عائلتك المباشرين: رب العائلة وأولاده وبناته
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
            🌳 شجرة عائلتك
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
            👨‍👩‍👧‍👦 عرض بسيط لرب العائلة وأولاده المباشرين
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
          gap: { xs: 0.5, sm: 1 }, 
          flexWrap: 'wrap', 
          mb: 1,
          alignItems: 'center'
        }}>
          {/* زر التبديل بين الشجرة البسيطة والموسعة */}
          <Button 
            variant={isExtendedView ? "contained" : "outlined"}
            size={window.innerWidth < 600 ? "small" : "medium"}
            onClick={() => setIsExtendedView(!isExtendedView)}
            disabled={loading || (!simpleTreeData && !extendedTreeData)}
            sx={{
              fontFamily: 'Cairo, sans-serif',
              backgroundColor: isExtendedView ? '#2196f3' : 'transparent',
              color: isExtendedView ? 'white' : '#2196f3',
              '&:hover': {
                backgroundColor: isExtendedView ? '#1976d2' : 'rgba(33, 150, 243, 0.1)'
              }
            }}
          >
            {isExtendedView ? '🌲 الشجرة الموسعة' : '🌳 الشجرة البسيطة'}
          </Button>

          {/* أزرار الإجراءات الأساسية */}
          <Button 
            variant="contained" 
            size={window.innerWidth < 600 ? "small" : "medium"}
            onClick={() => navigate('/family')} 
            disabled={loading} 
            startIcon={<PersonAddIcon />} 
            sx={{ 
              px: { xs: 1, sm: 1.5 },
              py: { xs: 0.25, sm: 0.5 },
              fontSize: { xs: '0.7rem', sm: '0.8rem' },
              borderRadius: 2,
              background: 'linear-gradient(45deg, #1976d2 0%, #1565c0 100%)',
              boxShadow: '0 2px 8px rgba(25,118,210,0.25)',
              '&:hover': { 
                background: 'linear-gradient(45deg, #1565c0 0%, #0d47a1 100%)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(25,118,210,0.3)'
              },
              transition: 'all 0.2s ease'
            }}
          >
            إدارة العائلة
          </Button>

          <Button 
            variant="contained" 
            size={window.innerWidth < 600 ? "small" : "medium"}
            onClick={() => navigate('/statistics')}
            disabled={loading} 
            startIcon={<BarChartIcon />} 
            sx={{ 
              px: { xs: 1, sm: 1.5 },
              py: { xs: 0.25, sm: 0.5 },
              fontSize: { xs: '0.7rem', sm: '0.8rem' },
              borderRadius: 2,
              background: 'linear-gradient(45deg, #10b981 0%, #059669 100%)',
              boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
              '&:hover': { 
                background: 'linear-gradient(45deg, #059669 0%, #047857 100%)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
              },
              transition: 'all 0.2s ease'
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
          display: 'flex', 
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
              performSearch(value);
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
            
            {performanceMetrics.maxDepthReached > 0 && (
              <Chip 
                size="small" 
                label={`📊 ${performanceMetrics.maxDepthReached + 1} جيل`} 
                variant="outlined" 
                color="info"
                sx={{
                  fontSize: { xs: '0.6rem', sm: '0.7rem' },
                  height: { xs: 20, sm: 24 }
                }}
              />
            )}
            
            <Chip 
              size="small" 
              label="🌳 شجرة بسيطة" 
              variant="outlined" 
              color="success"
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
      <Box sx={{ position: 'absolute', top: 120, left: 0, right: 0, bottom: 0 }}>
        {renderTreeView()}
      </Box>

      {/* حوار تفاصيل الشخص */}
      <Dialog open={!!selectedNode} onClose={() => setSelectedNode(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#1976d2', fontWeight: 'bold', fontFamily: 'Cairo, sans-serif' }}>
          {(selectedNode?.gender === 'female' || selectedNode?.relation === 'بنت') ? '♀️' : '♂️'} {selectedNode?.name || 'تفاصيل الشخص'}
        </DialogTitle>
        <DialogContent>
          {selectedNode && (
            <Box sx={{ p: 1 }}>
              <Typography variant="h6" gutterBottom sx={{ fontFamily: 'Cairo, sans-serif' }}>
                {selectedNode.name || buildFullName(selectedNode) || ''}
              </Typography>
              <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={selectedNode.relation || ''} color="primary" variant="outlined" />
                {selectedNode.isExtended && (
                  <Chip label="عائلة مرتبطة" color="secondary" variant="outlined" />
                )}
                {selectedNode.familyName && (
                  <Chip label={selectedNode.familyName} color="info" variant="outlined" />
                )}
              </Box>
              {selectedNode.age && <Typography variant="body2" sx={{ mb: 1 }}>العمر: {selectedNode.age} سنة</Typography>}
              {/* أضف هذا الجزء هنا - عدد الأطفال */}
                    {(selectedNode.relation === 'رب العائلة' && selectedNode.children && selectedNode.children.length > 0) && (
                      <Typography variant="body2" sx={{ mb: 1, color: '#4caf50', fontWeight: 'bold' }}>
                         عدد الأطفال: {selectedNode.children.length}
                      </Typography>
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
