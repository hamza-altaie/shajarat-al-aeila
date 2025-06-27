// src/components/FamilyTreeAdvanced.jsx - النسخة المصححة مع الشجرة الموسعة الحقيقية
import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as d3 from 'd3';
import { createRoot } from 'react-dom/client';
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
import EditIcon from '@mui/icons-material/Edit';
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import LinkIcon from '@mui/icons-material/Link';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';

// استيرادات Firebase
import { db } from '../firebase/config';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

// استيراد المكونات
import ExtendedFamilyLinking from './ExtendedFamilyLinking';
import ModernFamilyNodeHTML from './ModernFamilyNodeHTML';
import './FamilyTreeAdvanced.css';
import { useSearchZoom } from '../hooks/useSearchZoom';
import FamilyStatisticsDashboard from './FamilyStatisticsDashboard';
import BarChartIcon from '@mui/icons-material/BarChart';

export default function FamilyTreeAdvanced() {
  // ===========================================================================
  // الحالات الأساسية
  // ===========================================================================
  
  const [showExtendedTree, setShowExtendedTree] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [linkedFamilies, setLinkedFamilies] = useState([]);
  const [showLinkingPanel, setShowLinkingPanel] = useState(false);
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
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showStatistics, setShowStatistics] = useState(false);
  const [error, setError] = useState(null);
  
  const uid = localStorage.getItem('verifiedUid');
  const navigate = useNavigate();
  
  // المراجع للـ D3
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const reactRootsRef = useRef(new Map());

  // Hook للبحث والزووم
  const currentTreeData = showExtendedTree ? extendedTreeData : simpleTreeData;
  const searchZoomHook = useSearchZoom(svgRef, currentTreeData);

  // ===========================================================================
  // دوال مساعدة ثابتة
  // ===========================================================================

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

  const findFamilyHead = (members) => {
    const head = members.find(m => m.relation === 'رب العائلة');
    if (head) return head;
    
    const sorted = [...members].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateA - dateB;
    });
    
    return sorted[0] || members[0];
  };

  // ===========================================================================
  // دوال أساسية useCallback
  // ===========================================================================

  const buildFullName = useCallback((person) => {
    if (!person) return 'غير محدد';

    const parts = [
        person.firstName,
        person.fatherName,
        person.surname
    ].filter(part => part && part.trim() !== '');

    return parts.length > 0 ? parts.join(' ').trim() : 'غير محدد';
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
    setPerformanceMetrics(prev => ({
      ...prev,
      ...metrics
    }));
    
    if (metrics.personCount > 50) {
      showSnackbar(`✅ تم تحميل ${metrics.personCount} شخص بنجاح`, 'success');
    }
    
    if (metrics.familyCount > 1) {
      showSnackbar(`🏛️ تم ربط ${metrics.familyCount} عائلة`, 'info');
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
  }, [buildFullName]);

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

  const loadFamilyData = useCallback(async (familyUid) => {
    try {
      const familySnapshot = await getDocs(collection(db, 'users', familyUid, 'family'));
      const members = [];
      
      familySnapshot.forEach(doc => {
        const memberData = sanitizeMemberData({ 
          ...doc.data(), 
          id: doc.id,
          globalId: `${familyUid}_${doc.id}`,
          familyUid: familyUid,
          isExtended: familyUid !== uid
        });
        
        if (memberData.firstName && memberData.firstName.trim() !== '') {
          members.push(memberData);
        }
      });

      if (members.length > 0) {
        const head = findFamilyHead(members);
        
        return {
          uid: familyUid,
          members,
          head,
          isExtended: familyUid !== uid
        };
      }
      
      return null;
    } catch {
      return null;
    }
  }, [uid]);

  const findAllLinkedFamilies = useCallback(async (startUid) => {
    try {
      const linkedFamilyUids = new Set([startUid]);
      
      // البحث في بيانات المستخدم الحالي
      const userDoc = await getDoc(doc(db, 'users', startUid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // إضافة العائلات من linkedFamilies
        if (userData.linkedFamilies && Array.isArray(userData.linkedFamilies)) {
          userData.linkedFamilies.forEach(link => {
            if (link.targetFamilyUid) {
              linkedFamilyUids.add(link.targetFamilyUid);
            }
          });
        }
        
        // إضافة العائلة الرئيسية إن وجدت
        if (userData.linkedToFamilyHead) {
          linkedFamilyUids.add(userData.linkedToFamilyHead);
        }
      }
      
      // البحث في جميع المستخدمين عن روابط معكوسة
      const allUsersSnapshot = await getDocs(collection(db, 'users'));
      allUsersSnapshot.forEach(userDoc => {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // إذا كان مرتبط بعائلتك
        if (userData.linkedToFamilyHead === startUid) {
          linkedFamilyUids.add(userId);
        }
        
        // إذا كان لديه روابط معك
        if (userData.linkedFamilies && Array.isArray(userData.linkedFamilies)) {
          userData.linkedFamilies.forEach(link => {
            if (link.targetFamilyUid === startUid) {
              linkedFamilyUids.add(userId);
            }
          });
        }
      });
      
      const result = Array.from(linkedFamilyUids);
      return result;
      
    } catch {
      return [startUid]; // إرجاع العائلة الحالية فقط في حالة الخطأ
    }
  }, []);

  const buildExtendedTreeStructure = useCallback((allFamiliesData, rootFamilyUid) => {
    if (!allFamiliesData || allFamiliesData.length === 0) {
      return null;
    }

    // العثور على العائلة الجذر
    const rootFamily = allFamiliesData.find(f => f.uid === rootFamilyUid) || allFamiliesData[0];
    if (!rootFamily || !rootFamily.head) {
      return null;
    }

    // بناء العقدة الجذر
    const rootNode = {
      name: buildFullName(rootFamily.head),
      id: rootFamily.head.globalId,
      avatar: rootFamily.head.avatar || null,
      attributes: {
        ...rootFamily.head,
        isCurrentUser: true,
        treeType: 'extended',
        isExtended: false,
        familyName: 'عائلتك'
      },
      children: []
    };

    // إضافة أطفال العائلة الجذر
    const rootChildren = rootFamily.members.filter(m => 
      (m.relation === 'ابن' || m.relation === 'بنت') && 
      m.globalId !== rootFamily.head.globalId
    );

    rootChildren.forEach(child => {
      const childNode = {
        name: buildFullName(child),
        id: child.globalId,
        avatar: child.avatar || null,
        attributes: {
          ...child,
          treeType: 'extended',
          isExtended: false,
          familyName: 'عائلتك'
        },
        children: []
      };

      // البحث عن أطفال هذا الشخص في العائلات الأخرى
      const childFamily = allFamiliesData.find(f => 
        f.uid !== rootFamilyUid && 
        f.head && 
        buildFullName(f.head) === buildFullName(child)
      );

      if (childFamily) {
        const grandChildren = childFamily.members.filter(m => 
          (m.relation === 'ابن' || m.relation === 'بنت') &&
          m.globalId !== childFamily.head.globalId
        );

        grandChildren.forEach(grandChild => {
          childNode.children.push({
            name: buildFullName(grandChild),
            id: grandChild.globalId,
            avatar: grandChild.avatar || null,
            attributes: {
              ...grandChild,
              treeType: 'extended',
              isExtended: true,
              familyName: `عائلة ${buildFullName(child)}`
            },
            children: []
          });
        });
      }

      rootNode.children.push(childNode);
    });

    // إضافة العائلات المرتبطة كأشقاء
    const otherFamilies = allFamiliesData.filter(f => 
      f.uid !== rootFamilyUid && 
      f.head &&
      !rootChildren.some(child => buildFullName(child) === buildFullName(f.head))
    );

    otherFamilies.forEach(family => {
      const familyNode = {
        name: buildFullName(family.head),
        id: family.head.globalId,
        avatar: family.head.avatar || null,
        attributes: {
          ...family.head,
          treeType: 'extended',
          isExtended: true,
          familyName: `عائلة ${buildFullName(family.head)}`
        },
        children: []
      };

      // إضافة أطفال هذه العائلة
      const familyChildren = family.members.filter(m => 
        (m.relation === 'ابن' || m.relation === 'بنت') && 
        m.globalId !== family.head.globalId
      );

      familyChildren.forEach(child => {
        familyNode.children.push({
          name: buildFullName(child),
          id: child.globalId,
          avatar: child.avatar || null,
          attributes: {
            ...child,
            treeType: 'extended',
            isExtended: true,
            familyName: `عائلة ${buildFullName(family.head)}`
          },
          children: []
        });
      });

      rootNode.children.push(familyNode);
    });

    return rootNode;
  }, [buildFullName]);

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

      const treeData = buildSimpleTreeStructure(familyMembers);
      
      setLoadingProgress(100);
      setLoadingStage('اكتمل التحميل');
      
      setSimpleTreeData(treeData);
      
      // تسجيل مقاييس الأداء
      monitorPerformance({
        personCount: familyMembers.length,
        maxDepthReached: 2,
        familyCount: 1,
        loadTime: 1000
      });
      
      showSnackbar(`✅ تم تحميل عائلتك: ${familyMembers.length} أفراد`, 'success');

    } catch {
      setError('فشل في تحميل الشجرة');
      showSnackbar('❌ فشل في تحميل الشجرة', 'error');
    } finally {
      setLoading(false);
    }
  }, [uid, showSnackbar, monitorPerformance, buildSimpleTreeStructure]);

  const loadExtendedTree = useCallback(async () => {
  if (!uid) return;

  const startTime = Date.now();
  setLoading(true);
  
  // 🔵 يمكنك تغيير هذه النصوص ولونها
  setLoadingStage('🔍 البحث عن العائلات المرتبطة...');
  setLoadingProgress(0);

  try {
    // الخطوة 1: تحميل عائلتك
    setLoadingProgress(10);
    setLoadingStage('📋 تحميل بيانات عائلتك...');
    const myFamilyData = await loadFamilyData(uid);
    
    // الخطوة 2: البحث عن العائلات المرتبطة
    setLoadingProgress(30);
    setLoadingStage('🔗 البحث عن الروابط...');
    const allLinkedFamilies = await findAllLinkedFamilies(uid);
    
    // الخطوة 3: تحميل بيانات جميع العائلات
    setLoadingProgress(50);
    setLoadingStage('🏠 تحميل بيانات العائلات...');
    const allFamiliesData = [];
    
    // إضافة عائلتك
    if (myFamilyData && myFamilyData.members.length > 0) {
      allFamiliesData.push(myFamilyData);
    }
    
    // إضافة العائلات المرتبطة
    for (const familyUid of allLinkedFamilies) {
      if (familyUid !== uid) {
        try {
          const familyData = await loadFamilyData(familyUid);
          if (familyData && familyData.members.length > 0) {
            allFamiliesData.push(familyData);
          }
        } catch {
          // تعذر تحميل العائلة - متابعة صامتة
        }
      }
    }
    
    setLoadingProgress(70);
    setLoadingStage('🌳 بناء الشجرة الموسعة...');
    
    // الخطوة 4: بناء الشجرة الموسعة
    const extendedTree = buildExtendedTreeStructure(allFamiliesData, uid);
    
    setLoadingProgress(90);
    setLoadingStage('⚡ تحسين وتنسيق الشجرة...');
    
    // الخطوة 5: حساب المقاييس
    const totalPersons = allFamiliesData.reduce((sum, family) => sum + family.members.length, 0);
    const endTime = Date.now();
    
    monitorPerformance({
      personCount: totalPersons,
      familyCount: allFamiliesData.length,
      maxDepthReached: calculateTreeDepth(extendedTree),
      loadTime: endTime - startTime
    });
    
    setLoadingProgress(100);
    setLoadingStage('✅ اكتمل التحميل بنجاح!');
    
    setExtendedTreeData(extendedTree);
    
    showSnackbar(`🏛️ تم تحميل ${allFamiliesData.length} عائلة بـ ${totalPersons} شخص`, 'success');

  } catch {
    setError('فشل في تحميل الشجرة الموسعة');
    showSnackbar('❌ فشل في تحميل الشجرة الموسعة', 'error');
  } finally {
    setLoading(false);
  }
  }, [uid, showSnackbar, monitorPerformance, buildExtendedTreeStructure, calculateTreeDepth, loadFamilyData, findAllLinkedFamilies]);

  const loadLinkedFamilies = useCallback(async () => {
    if (!uid) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const linked = userData.linkedFamilies || [];
        setLinkedFamilies(linked);
      }
    } catch {
      // خطأ صامت في تحميل العائلات المرتبطة
    }
  }, [uid]);

  // ===========================================================================
  // دوال التحكم
  // ===========================================================================

  const handleRefresh = useCallback(() => {
    // تنظيف البيانات السابقة
    if (showExtendedTree) {
      setExtendedTreeData(null);
      loadExtendedTree();
    } else {
      setSimpleTreeData(null);
      loadSimpleTree();
    }
  }, [showExtendedTree, loadExtendedTree, loadSimpleTree]);

  const handleTreeTypeToggle = useCallback((event) => {
    const newValue = event.target.checked;
    setShowExtendedTree(newValue);
    
    if (newValue) {
      showSnackbar('🔄 تحميل الشجرة الموسعة...', 'info');
      // تحميل الشجرة الموسعة فوراً
      if (!extendedTreeData) {
        loadExtendedTree();
      }
    } else {
      showSnackbar('✅ تحويل للشجرة العادية', 'info');
    }
  }, [showSnackbar, extendedTreeData, loadExtendedTree]);

  // ===========================================================================
  // دالة رسم الشجرة
  // ===========================================================================

  // استبدل دالة drawTreeWithD3 بهذا الكود الذي يحافظ على التصميم الأصلي مع أنيميشن بسيط:

const drawTreeWithD3 = useCallback((data) => {
  if (!data || !svgRef.current || !containerRef.current) return;

  const svg = d3.select(svgRef.current);
  svg.attr('transform', null); 
  svg.property('__zoom', d3.zoomIdentity); 
  svg.selectAll('*').remove(); 

  // إعداد الأبعاد
  const container = containerRef.current;
  const width = container.clientWidth;
  const height = container.clientHeight;
  svg.attr('width', width).attr('height', height).style('background', 'transparent');

  // إنشاء مجموعة g جديدة
  const g = svg.append('g');
  g.attr('transform', null); 

  // إعداد الـ zoom بدون أي تحريك افتراضي
  const zoom = d3.zoom()
    .scaleExtent([0.1, 3])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });
  svg.call(zoom);
  svg.property('__zoom', d3.zoomIdentity); 

  // إعداد بيانات الشجرة
  const root = d3.hierarchy(data);
  // حساب عمق الشجرة (عدد الأجيال)
  let maxDepth = 1;
  let generationCounts = {};
  let maxBreadth = 1;
  root.each(d => {
    if (d.depth > maxDepth) maxDepth = d.depth;
    generationCounts[d.depth] = (generationCounts[d.depth] || 0) + 1;
    if (generationCounts[d.depth] > maxBreadth) maxBreadth = generationCounts[d.depth];
  });

  // تمييز بين الشجرة العادية والموسعة
  let verticalGap, dynamicHeight, horizontalGap, dynamicWidth;
  if (showExtendedTree) {
    // الشجرة الموسعة: مساحة رأسية أكبر لكن ليست مبالغ فيها، ومسافة أفقية أكبر
    verticalGap = 80; 
    horizontalGap = 220; 
    dynamicHeight = Math.max(verticalGap * maxDepth, 350);
    dynamicWidth = Math.max(horizontalGap * maxBreadth, width - 100);
  } else {
    verticalGap = 55;
    horizontalGap = 180;
    dynamicHeight = Math.max(verticalGap * maxDepth, 180);
    dynamicWidth = width - 100;
  }

  // إعداد تخطيط الشجرة مع توزيع أفقي متساوٍ تماماً (بدون أي تراكب)
  const treeLayout = d3.tree()
    .size([dynamicWidth, dynamicHeight])
    .separation(() => {
      // توزيع أفقي متساوٍ تماماً بين جميع العقد في نفس الجيل (1)
      return 1;
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
    
    // إضافة خاصية highlightMatch بناءً على البحث
    let highlightMatch = false;
    if (searchQuery && searchQuery.length > 1) {
      const q = searchQuery.trim();
      if (
        (nodeData.name && nodeData.name.includes(q)) ||
        (nodeData.firstName && nodeData.firstName.includes(q))
      ) {
        highlightMatch = true;
      }
    }
    
    try {
      const foreignObject = nodeGroup.append("foreignObject")
        .attr("width", 350)
        .attr("height", 200)
        .attr("x", -175)
        .attr("y", -100)
        .style("overflow", "visible");

      const htmlContainer = foreignObject.append("xhtml:div")
        .style("width", "100%")
        .style("height", "100%")
        .style("display", "flex")
        .style("align-items", "center")
        .style("justify-content", "center")
        .style("font-family", "Cairo, sans-serif");

      const reactContainer = htmlContainer.append("xhtml:div")
        .attr("id", `react-node-${uniqueId}`)
        .style("width", "320px")
        .style("height", "180px")
        .style("display", "flex")
        .style("align-items", "center")
        .style("justify-content", "center");

      const reactElement = reactContainer.node();
      if (reactElement) {
        const root = createRoot(reactElement);
        reactRootsRef.current.set(uniqueId, root);
        root.render(
          <ModernFamilyNodeHTML 
            nodeDatum={{
              ...nodeData,
              name: nodeData.name || buildFullName(nodeData),
              isExtended: showExtendedTree && nodeData.isExtended,
              highlightMatch // تمرير خاصية التمييز
            }}
            onNodeClick={handleNodeClick}
            isParent={
              nodeData.relation?.includes('رب العائلة') || 
              nodeData.relation === 'parent' ||
              nodeData.relation === 'الأب' ||
              nodeData.relation === 'الأم'
            }
            isChild={
              nodeData.relation === 'ابن' || 
              nodeData.relation === 'بنت' || 
              nodeData.relation === 'child' ||
              nodeData.relation === 'الابن' ||
              nodeData.relation === 'الابنة'
            }
            isSpouse={
              nodeData.relation === 'زوج' || 
              nodeData.relation === 'زوجة' || 
              nodeData.relation === 'spouse' ||
              nodeData.relation === 'الزوج' ||
              nodeData.relation === 'الزوجة'
            }
          />
        );
      }
    } catch {
      // معالجة صامتة للأخطاء
    }
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
        console.log('تعذر حساب حدود الشجرة للتمركز التلقائي');
      }
    }
  }, 1200);

}, [showExtendedTree, handleNodeClick, buildFullName, searchQuery]);

  // دالة البحث المحلية
  const performSearch = useCallback((query) => {
    
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return [];
    }

    const treeData = showExtendedTree ? extendedTreeData : simpleTreeData;
    if (!treeData) {
      console.warn('❌ لا توجد بيانات شجرة للبحث فيها');
      return [];
    }

    const results = [];
    const normalizedQuery = query.toLowerCase().trim();
    
    function searchInNode(node, depth = 0) {
      if (!node) return;
      
      // استخراج البيانات من مصادر متعددة
      const name = node.name || node.attributes?.name || '';
      const firstName = node.attributes?.firstName || '';
      const relation = node.attributes?.relation || node.relation || '';
      
      // فحص التطابق في الاسم
      if (name.toLowerCase().includes(normalizedQuery) || 
          firstName.toLowerCase().includes(normalizedQuery)) {
        results.push({
          node: node,
          type: 'name',
          score: 3,
          depth: depth
        });
      } 
      // فحص التطابق في العلاقة
      else if (relation.toLowerCase().includes(normalizedQuery)) {
        results.push({
          node: node,
          type: 'relation', 
          score: 2,
          depth: depth
        });
      }
      
      // البحث في الأطفال
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => searchInNode(child, depth + 1));
      }
    }
    
    searchInNode(treeData);
    
    // ترتيب النتائج
    results.sort((a, b) => b.score - a.score || a.depth - b.depth);
    setSearchResults(results);
    return results;
  }, [showExtendedTree, extendedTreeData, simpleTreeData]);

  // ===========================================================================
  // تأثيرات ودورة الحياة
  // ===========================================================================

  useEffect(() => {
    if (!uid) {
      navigate('/login');
      return;
    }

    loadSimpleTree();
    loadLinkedFamilies();
  }, [uid, navigate, loadSimpleTree, loadLinkedFamilies]);

  useEffect(() => {
    if (!uid) return;
    
    if (showExtendedTree && !extendedTreeData) {
      loadExtendedTree();
    }
  }, [showExtendedTree, uid, extendedTreeData, loadExtendedTree]);

  // تأثير رسم الشجرة
  useEffect(() => {
    const currentTreeData = showExtendedTree ? extendedTreeData : simpleTreeData;
    if (currentTreeData && svgRef.current && containerRef.current) {
      const timer = setTimeout(() => {
        drawTreeWithD3(currentTreeData);
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [drawTreeWithD3, showExtendedTree, simpleTreeData, extendedTreeData]);

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
    const currentTreeData = showExtendedTree ? extendedTreeData : simpleTreeData;
    const treeTitle = showExtendedTree ? 'الشجرة الموسعة للقبيلة' : 'شجرة عائلتك';
    
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
                <CircularProgress size={80} sx={{ color: '#1976d2', mb: 3 }} />
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
                      backgroundColor: '#1976d2'
                    }
                  }}
                />
                <Typography variant="body2" sx={{ color: '#1976d2', fontFamily: 'Cairo, sans-serif' }}>
                  {Math.round(loadingProgress)}% مكتمل
                </Typography>
              </Box>
            ) : (
              <Box textAlign="center">
                <AccountTreeIcon sx={{ fontSize: 120, color: '#1976d2', mb: 2 }} />
                <Typography variant="h4" sx={{ mb: 1, fontFamily: 'Cairo, sans-serif' }}>
                  {showExtendedTree ? '🏛️ ابنِ شجرتك الموسعة' : '🌳 ابنِ شجرة عائلتك'}
                </Typography>
                <Typography variant="body1" sx={{ color: '#1976d2', mb: 3, maxWidth: 500, fontFamily: 'Cairo, sans-serif' }}>
                  {showExtendedTree 
                    ? 'اربط عائلتك مع العائلات الأخرى لبناء شجرة موسعة شاملة'
                    : 'أضف أفراد عائلتك لبناء شجرة عائلية جميلة'
                  }
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
                  <Button
                    variant="outlined"
                    sx={{ 
                      borderColor: showExtendedTree ? '#8b5cf6' : '#6366f1',
                      color: '#1976d2',
                      '&:hover': { 
                        borderColor: showExtendedTree ? '#7c3aed' : '#4f46e5',
                        backgroundColor: showExtendedTree ? 'rgba(139, 92, 246, 0.1)' : 'rgba(99, 102,241, 0.1)'
                      },
                      fontFamily: 'Cairo, sans-serif'
                    }}
                    size="large"
                    onClick={() => setShowLinkingPanel(true)}
                    startIcon={<LinkIcon />}
                  >
                    ربط عائلات
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
      elevation={6}
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,249,250,0.95) 100%)',
        backdropFilter: 'blur(20px)',
        borderBottom: '2px solid #e0e0e0'
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography 
          variant="h5" 
          textAlign="center" 
          sx={{ 
            mb: 2, 
            color: '#1976d2',
            fontWeight: 'bold',
            fontFamily: 'Cairo, sans-serif'
          }}
        >
          {showExtendedTree ? '🏛️ الشجرة الموسعة للقبيلة' : '🌳 شجرة عائلتك'}
        </Typography>
        
        {loading && (
          <LinearProgress 
            variant="determinate" 
            value={loadingProgress} 
            sx={{ 
              mb: 2,
              height: 6, 
              borderRadius: 3,
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#1976d2'
              }
            }}
          />
        )}
        
        <Box display="flex" justifyContent="center" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
          <Button variant="contained" size="small" onClick={() => navigate('/family')} disabled={loading} startIcon={<PersonAddIcon />} sx={{ gap: 1 }}>
            إدارة العائلة
          </Button>
          <Button variant="outlined" size="small" onClick={() => setShowLinkingPanel(true)} disabled={loading} startIcon={<LinkIcon />} sx={{ gap: 1 }}>
            ربط
          </Button>
          <Button 
            variant="contained" 
            size="small" 
            onClick={() => setShowStatistics(true)} 
            disabled={loading} 
            startIcon={<BarChartIcon />} 
            sx={{ 
              gap: 1,
              backgroundColor: 'success.main',
              '&:hover': { backgroundColor: 'success.dark' }
            }}
          >
            إحصائيات
          </Button>

          <IconButton size="small" onClick={handleRefresh} disabled={loading} title="إعادة تحميل الصفحة">
            <RefreshIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, position: 'relative' }}>
            <TextField
              size="small"
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setSearchQuery(value);
                performSearch(value);
              }}
              placeholder="ابحث عن شخص للتركيز عليه..."
              variant="outlined"
              sx={{
                minWidth: 250,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: 2,
                  fontFamily: 'Cairo, sans-serif'
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton 
                      size="small" 
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
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
                    >
                      <CloseIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            {/* عرض عدد النتائج */}
            {searchResults.length > 0 && (
              <Chip 
                label={`${searchResults.length} نتيجة`} 
                size="small" 
                color="primary"
                variant="outlined"
              />
            )}
            
            {/* قائمة النتائج المحسنة مع الزوم */}
            {searchQuery.length > 1 && searchResults.length > 0 && (
              <Box sx={{ 
                position: 'absolute', 
                top: '100%', 
                left: 0, 
                right: 0, 
                zIndex: 1000, 
                mt: 1 
              }}>
                <Paper sx={{ 
                  maxHeight: 250, 
                  overflow: 'auto', 
                  backgroundColor: 'rgba(255,255,255,0.98)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 2,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
                }}>
                  {searchResults.slice(0, 6).map((result, index) => (
                    <Box
                      key={index}
                      onClick={() => {
                        const nodeName = result.node?.name || 
                                        result.node?.data?.name || 
                                        result.node?.attributes?.name || 
                                        result.name || '';
                        
                        if (nodeName) {
                          searchZoomHook.searchAndZoom(nodeName);
                          
                          // ثانياً: تحديث حالة البحث بعد تأخير قصير
                          setTimeout(() => {
                            setSearchQuery(nodeName);
                            setSearchResults([]);
                          }, 300);
                        }
                      }}
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        borderBottom: index < Math.min(searchResults.length, 6) - 1 ? '1px solid rgba(0,0,0,0.1)' : 'none',
                        '&:hover': {
                          backgroundColor: 'rgba(33, 150, 243, 0.08)',
                          transform: 'translateX(8px)',
                          borderLeft: '4px solid #2196f3'
                        },
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        fontFamily: 'Cairo, sans-serif'
                      }}
                    >
                      {/* أيقونة نوع النتيجة */}
                      <Box sx={{ 
                        color: result.type === 'name' ? '#2196f3' : '#ff9800',
                        fontSize: '1.2rem'
                      }}>
                        {result.type === 'name' ? '👤' : '🔗'}
                      </Box>
                      
                      {/* معلومات الشخص */}
                      <Box sx={{ flex: 1 }}>
                        <Typography 
                          variant="body2" 
                          fontWeight="bold"
                          sx={{ 
                            color: '#1976d2',
                            mb: 0.5
                          }}
                        >
                          {result.node.name || result.node.attributes?.name || 'غير محدد'}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'text.secondary',
                            fontSize: '0.75rem'
                          }}
                        >
                          📍 {result.node.attributes?.relation || result.node.relation || 'عضو'} • انقر للتركيز 🎯
                        </Typography>
                      </Box>
                      
                      {/* مؤشر نوع النتيجة */}
                      <Chip
                        label={result.type === 'name' ? 'اسم' : 'قرابة'}
                        size="small"
                        color={result.type === 'name' ? 'primary' : 'secondary'}
                        variant="outlined"
                        sx={{ 
                          fontSize: '0.7rem',
                          height: '24px'
                        }}
                      />
                    </Box>
                  ))}
                  
                  {/* عرض عدد النتائج الإضافية */}
                  {searchResults.length > 6 && (
                    <Box sx={{ 
                      p: 1, 
                      textAlign: 'center', 
                      backgroundColor: 'rgba(0,0,0,0.05)',
                      borderTop: '1px solid rgba(0,0,0,0.1)'
                    }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                        و {searchResults.length - 6} نتائج أخرى...
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Box>
            )}
          </Box>
        </Box>

        <Box display="flex" justifyContent="center" sx={{ mb: 1 }}>
          <FormControlLabel
            control={
              <Switch 
                checked={showExtendedTree} 
                onChange={handleTreeTypeToggle} 
                disabled={loading} 
                size="small"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#1976d2',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#1976d2',
                  },
                }}
              />
            }
            label={
              <Typography variant="body2" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                {showExtendedTree ? '🏛️ موسعة' : '🌳 عادية'}
              </Typography>
            }
          />
        </Box>

        {performanceMetrics.personCount > 0 && (
          <Box display="flex" justifyContent="center" gap={1} flexWrap="wrap">
            <Chip size="small" label={`👥 ${performanceMetrics.personCount}`} variant="outlined" />
            {performanceMetrics.familyCount > 1 && (
              <Chip size="small" label={`🏠 ${performanceMetrics.familyCount} عائلة`} variant="outlined" color="primary" />
            )}
            {linkedFamilies.length > 0 && (
              <Chip size="small" label={`🔗 ${linkedFamilies.length}`} variant="outlined" color="success" />
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );

  return (
    <Box className="family-tree-advanced-root" sx={{ width: '100vw', height: '100vh', fontFamily: 'Cairo, sans-serif' }}>
      {renderToolbar()}
      <Box sx={{ position: 'absolute', top: 140, left: 0, right: 0, bottom: 0 }}>
        {renderTreeView()}
      </Box>

      {/* الحوارات */}
      <Dialog open={showLinkingPanel} onClose={() => setShowLinkingPanel(false)} maxWidth="lg" fullWidth>
        <DialogTitle>🔗 ربط العائلات للشجرة الموسعة</DialogTitle>
        <DialogContent>
          <ExtendedFamilyLinking
            currentUserUid={uid}
            onLinkingComplete={() => {
              setShowLinkingPanel(false);
              // إعادة تحميل الشجرة الموسعة
              setExtendedTreeData(null);
              if (showExtendedTree) {
                loadExtendedTree();
              }
              // إعادة تحميل قائمة الروابط
              loadLinkedFamilies();
            }}
            existingLinks={linkedFamilies.map(link => link.targetFamilyUid)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedNode} onClose={() => setSelectedNode(null)} maxWidth="sm" fullWidth>
        <DialogTitle>👤 {selectedNode?.name || 'تفاصيل الشخص'}</DialogTitle>
        <DialogContent>
          {selectedNode && (
            <Box sx={{ p: 1 }}>
              <Typography variant="h6" gutterBottom sx={{ fontFamily: 'Cairo, sans-serif' }}>
                {selectedNode.name || buildFullName(selectedNode) || 'غير محدد'}
              </Typography>
              <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={selectedNode.relation || 'غير محدد'} color="primary" variant="outlined" />
                {selectedNode.isExtended && (
                  <Chip label="عائلة مرتبطة" color="secondary" variant="outlined" />
                )}
                {selectedNode.familyName && (
                  <Chip label={selectedNode.familyName} color="info" variant="outlined" />
                )}
              </Box>
              {selectedNode.age && <Typography variant="body2" sx={{ mb: 1 }}>العمر: {selectedNode.age} سنة</Typography>}
              {selectedNode.phone && <Typography variant="body2" sx={{ mb: 1 }}>الهاتف: {selectedNode.phone}</Typography>}
              {selectedNode.location && (
                <Typography variant="body2">المكان: {selectedNode.location}</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedNode(null)}>إغلاق</Button>
          <Button variant="contained" startIcon={<EditIcon />}>تعديل</Button>
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

      {/* تسجيل تشخيصي */}
      {console.log('🔍 Debug Info:', {
        currentTreeData: currentTreeData,
        simpleTreeData: simpleTreeData,
        extendedTreeData: extendedTreeData,
        showExtendedTree: showExtendedTree
      })}
      
      <FamilyStatisticsDashboard
      open={showStatistics}
      onClose={() => setShowStatistics(false)}
      treeData={currentTreeData}
      familyMembers={(() => {
        // استخراج البيانات من مصادر متعددة
        const members = [];
        
        // من الشجرة المحددة
        if (currentTreeData) {
          const extractMembers = (node) => {
            if (node && node.attributes) {
              members.push({
                id: node.id,
                name: node.name,
                ...node.attributes
              });
            }
            if (node && node.children) {
              node.children.forEach(child => extractMembers(child));
            }
          };
          extractMembers(currentTreeData);
        }
        
        return members;
      })()}
    />

    </Box>
  );
}

