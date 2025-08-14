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

  // دالة مساعدة لمطابقة أسماء الأشقاء مع أبنائهم
  const findMatchingSibling = useCallback((nephewNiece, siblings, rootAttributes) => {
    if (!siblings || !nephewNiece.parentName) return null;
    
    const parentName = nephewNiece.parentName.trim();
    const fatherName = rootAttributes.fatherName || '';
    const grandfatherName = rootAttributes.grandfatherName || '';
    
    // البحث المتقدم عن الأخ المطابق
    return siblings.find(sibling => {
      const siblingName = sibling.name || '';
      const siblingFullName = siblingName.trim();
      
      // مطابقة مباشرة للاسم الأول
      if (siblingFullName.includes(parentName)) return true;
      
      // مطابقة الاسم الكامل
      const expectedFullName = `${parentName} ${fatherName}`.trim();
      if (siblingFullName === expectedFullName) return true;
      
      // مطابقة بالاسم الثلاثي
      const expectedTripleName = `${parentName} ${fatherName} ${grandfatherName}`.trim();
      if (siblingFullName === expectedTripleName) return true;
      
      // مطابقة عكسية - إذا كان اسم الأخ يحتوي على اسم الأب
      const siblingFirstName = siblingFullName.split(' ')[0];
      if (siblingFirstName === parentName) return true;
      
      return false;
    });
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

    // إضافة أولاد الإخوة والأخوات (أبناء الأشقاء) مع ربطهم بآبائهم الصحيحين
    const nephews = membersByRelation['ابن الأخ'] || [];
    const nieces = membersByRelation['بنت الأخ'] || [];
    const sisterSons = membersByRelation['ابن الأخت'] || [];
    const sisterDaughters = membersByRelation['بنت الأخت'] || [];
    
    // إنشاء خريطة لربط كل ابن أخ بأخيه الصحيح
    const nephewToSiblingMap = new Map();
    
    if (nephews.length > 0 || nieces.length > 0 || sisterSons.length > 0 || sisterDaughters.length > 0) {
      const allNephewsNieces = [
        ...nephews.map(nephew => ({
          name: buildFullName(nephew),
          id: nephew.globalId,
          avatar: nephew.avatar,
          attributes: { ...nephew, treeType: 'extended', generation: 1 },
          children: [],
          parentName: nephew.fatherName, // اسم الأب (الأخ)
          parentRelation: 'أخ'
        })),
        ...nieces.map(niece => ({
          name: buildFullName(niece),
          id: niece.globalId,
          avatar: niece.avatar,
          attributes: { ...niece, treeType: 'extended', generation: 1 },
          children: [],
          parentName: niece.fatherName, // اسم الأب (الأخ)
          parentRelation: 'أخ'
        })),
        ...sisterSons.map(son => ({
          name: buildFullName(son),
          id: son.globalId,
          avatar: son.avatar,
          attributes: { ...son, treeType: 'extended', generation: 1 },
          children: [],
          parentName: son.fatherName, // اسم الأب
          parentRelation: 'أخت'
        })),
        ...sisterDaughters.map(daughter => ({
          name: buildFullName(daughter),
          id: daughter.globalId,
          avatar: daughter.avatar,
          attributes: { ...daughter, treeType: 'extended', generation: 1 },
          children: [],
          parentName: daughter.fatherName, // اسم الأب
          parentRelation: 'أخت'
        }))
      ];
      
      // ربط كل ابن أخ بأخيه الصحيح باستخدام الدالة المحسنة
      allNephewsNieces.forEach(nephewNiece => {
        const matchingSibling = findMatchingSibling(nephewNiece, rootNode.siblings, rootNode.attributes);
        
        if (matchingSibling) {
          nephewToSiblingMap.set(nephewNiece.id, matchingSibling.id);
          console.log(`🔗 ربط ${nephewNiece.name} بـ ${matchingSibling.name}`);
        } else {
          console.warn(`⚠️ لم يتم العثور على أخ مطابق لـ ${nephewNiece.name} (أب: ${nephewNiece.parentName})`);
        }
      });
      
      rootNode.nephewsNieces = allNephewsNieces;
      rootNode.nephewToSiblingMap = nephewToSiblingMap;
    }

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
  }, [buildFullName, findFamilyHead, findMatchingSibling]);

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

    // الكارت الرئيسي مع تحسينات التنسيق
    nodeGroup.append("rect")
      .attr("width", cardWidth)
      .attr("height", cardHeight)
      .attr("x", -cardWidth / 2)
      .attr("y", -cardHeight / 2)
      .attr("rx", 16)
      .attr("fill", cardFill)
      .attr("stroke", cardStroke)
      .attr("stroke-width", 3)
      .attr("class", "family-node-card")
      .style("filter", "drop-shadow(0 4px 12px rgba(0,0,0,0.15))")
      .style("cursor", "pointer");

    // إضافة نقاط الربط المرئية مع تأثيرات
    // نقطة الربط العلوية
    const topPoint = nodeGroup.append("circle")
      .attr("cx", 0)
      .attr("cy", -cardHeight / 2)
      .attr("r", 4)
      .attr("fill", cardStroke)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("class", "connection-point top-point")
      .style("opacity", 0.7)
      .style("cursor", "pointer");

    // نقطة الربط السفلية
    const bottomPoint = nodeGroup.append("circle")
      .attr("cx", 0)
      .attr("cy", cardHeight / 2)
      .attr("r", 4)
      .attr("fill", cardStroke)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("class", "connection-point bottom-point")
      .style("opacity", 0.7)
      .style("cursor", "pointer");

    // تأثيرات التفاعل لنقاط الربط
    [topPoint, bottomPoint].forEach(point => {
      point.on("mouseenter", function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", 6)
          .style("opacity", 1)
          .attr("stroke-width", 3);
      })
      .on("mouseleave", function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", 4)
          .style("opacity", 0.7)
          .attr("stroke-width", 2);
      });
    });

    // دائرة خلفية الصورة مع تحسينات
    nodeGroup.append("circle")
      .attr("cx", -cardWidth / 2 + padding + avatarSize / 2)
      .attr("cy", -cardHeight / 2 + padding + avatarSize / 2)
      .attr("r", avatarSize / 2 + 2)
      .attr("fill", "#fff")
      .attr("stroke", cardStroke)
      .attr("stroke-width", 2)
      .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");

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

    // الاسم مع تحسين التنسيق
    nodeGroup.append("text")
      .text(name.length > 20 ? name.slice(0, 18) + '…' : name)
      .attr("x", textStartX)
      .attr("y", nameY)
      .attr("font-size", 14)
      .attr("font-weight", "bold")
      .attr("fill", "#1a1a1a")
      .style("text-shadow", "0 1px 2px rgba(0,0,0,0.1)");

    // العلاقة مع تحسين التنسيق
    nodeGroup.append("text")
      .text(relation)
      .attr("x", textStartX)
      .attr("y", relationY)
      .attr("font-size", 12)
      .attr("font-weight", "500")
      .attr("fill", "#4a4a4a");

    if (age) {
      // خلفية العمر مع تحسينات
      nodeGroup.append("rect")
        .attr("x", ageBoxX)
        .attr("y", ageBoxY)
        .attr("width", ageBoxWidth)
        .attr("height", ageBoxHeight)
        .attr("rx", 10)
        .attr("fill", "rgba(25, 118, 210, 0.1)")
        .attr("stroke", "rgba(25, 118, 210, 0.3)")
        .attr("stroke-width", 1.5)
        .style("filter", "drop-shadow(0 1px 3px rgba(0,0,0,0.1))");

      // نص العمر مع تحسينات
      nodeGroup.append("text")
        .text(`${age} سنة`)
        .attr("x", ageTextX)
        .attr("y", ageTextY)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", 10)
        .attr("font-weight", "600")
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
      
      showSnackbar(`✅ تم تحميل عائلتك: ${familyMembers.length} أفراد (${isExtendedView ? 'شجرة موسعة' : 'رب العائلة وأولاده'})`, 'success');

    } catch {
      setError('فشل في تحميل الشجرة');
      showSnackbar('❌ فشل في تحميل الشجرة', 'error');
    } finally {
      setLoading(false);
    }
  }, [uid, showSnackbar, buildSimpleTreeStructure, buildExtendedTreeStructure, isExtendedView]);

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
  const screenHeight = window.innerHeight;

  // تحديد أحجام الكروت والمسافات حسب حجم الشاشة
  let cardWidth, cardHeight, horizontalGap, verticalGap, parentChildGap;

  if (screenWidth < 480) {
    // هواتف صغيرة
    cardWidth = 160;
    cardHeight = 90;
    horizontalGap = 40;
    verticalGap = 60;
    parentChildGap = 180;
  } else if (screenWidth < 768) {
    // هواتف كبيرة وتابلت صغير
    cardWidth = 190;
    cardHeight = 100;
    horizontalGap = 60;
    verticalGap = 70;
    parentChildGap = 200;
  } else if (screenWidth < 1024) {
    // تابلت
    cardWidth = 220;
    cardHeight = 110;
    horizontalGap = 80;
    verticalGap = 80;
    parentChildGap = 220;
  } else if (screenWidth < 1440) {
    // شاشات متوسطة
    cardWidth = 240;
    cardHeight = 120;
    horizontalGap = 100;
    verticalGap = 90;
    parentChildGap = 250;
  } else {
    // شاشات كبيرة
    cardWidth = 260;
    cardHeight = 130;
    horizontalGap = 120;
    verticalGap = 100;
    parentChildGap = 280;
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
  const width = isExtended ? Math.max(baseWidth, screenWidth * 1.5) : baseWidth;
  const height = isExtended ? Math.max(baseHeight, screenHeight * 1.2) : baseHeight;
  
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

  // إعداد المسافات حسب نوع الشجرة - استخدام المتغيرات المتجاوبة
  const dynamicHeight = Math.max(verticalGap * maxDepth, 180);
  const dynamicWidth = width - 100;

  // إعداد تخطيط الشجرة مع توزيع أفقي متجاوب
  const treeLayout = d3.tree()
    .size([dynamicWidth, dynamicHeight])
    .separation((a, b) => {
      // مسافة أفقية متجاوبة حسب حجم الشاشة
      const baseSeparation = horizontalGap / cardWidth;
      return a.parent === b.parent ? baseSeparation : baseSeparation * 1.2;
    }); 

  treeLayout(root);

  // ===========================================================================
  // نظام موحد لرسم خطوط الاتصال
  // ===========================================================================
  
  // إعدادات خطوط الاتصال الموحدة
  const CONNECTION_STYLES = {
    // جميع الخطوط بنفس النمط الموحد للشجرة البسيطة
    primary: {
      stroke: "#6366f1",
      strokeWidth: 3,
      opacity: 0.8,
      isDashed: false
    },
    sibling: {
      stroke: "#6366f1",
      strokeWidth: 3,
      opacity: 0.8,
      isDashed: false
    },
    relative: {
      stroke: "#6366f1",
      strokeWidth: 3,
      opacity: 0.8,
      isDashed: false
    },
    spouse: {
      stroke: "#6366f1",
      strokeWidth: 3,
      opacity: 0.8,
      isDashed: false
    },
    secondary: {
      stroke: "#6366f1",
      strokeWidth: 3,
      opacity: 0.8,
      isDashed: false
    }
  };

  // دالة موحدة لرسم خط منحني مع أنماط محددة مسبقاً
  const drawUnifiedLine = (g, startX, startY, endX, endY, className, styleType = 'primary', delay = 0, duration = 400, customStyle = null) => {
    // التأكد من وجود النمط، وإلا استخدم النمط الأساسي
    const style = customStyle || CONNECTION_STYLES[styleType] || CONNECTION_STYLES.primary;
    
    // التحقق من صحة البيانات
    if (!style || !g) {
      console.warn('DrawUnifiedLine: Missing required parameters', { style, g, styleType });
      return null;
    }
    
    // كيرف ناعم لجميع الخطوط
    let pathData;
    
    // حساب نقاط التحكم للكيرف
    const dx = endX - startX;
    const dy = endY - startY;
    const curveStrength = Math.min(Math.abs(dx), Math.abs(dy)) * 0.5;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      // خط أفقي أكثر - كيرف أفقي
      const controlPoint1X = startX + curveStrength;
      const controlPoint2X = endX - curveStrength;
      
      pathData = `M${startX},${startY} 
                  C${controlPoint1X},${startY} ${controlPoint2X},${endY} ${endX},${endY}`;
    } else {
      // خط عمودي أكثر - كيرف عمودي
      const controlPoint1Y = startY + curveStrength;
      const controlPoint2Y = endY - curveStrength;
      
      pathData = `M${startX},${startY} 
                  C${startX},${controlPoint1Y} ${endX},${controlPoint2Y} ${endX},${endY}`;
    }
    
    const line = g.append("path")
      .attr("class", `unified-connection-line ${className}`)
      .attr("d", pathData)
      .style("fill", "none")
      .style("stroke", style.stroke || "#6366f1")
      .style("stroke-width", style.strokeWidth || 2)
      .style("stroke-linecap", "round")
      .style("stroke-linejoin", "round")
      .style("opacity", 0)
      .style("filter", "drop-shadow(0 2px 6px rgba(0,0,0,0.15))")
      .style("stroke-dasharray", function() {
        const totalLength = this.getTotalLength();
        return `${totalLength} ${totalLength}`;
      })
      .style("stroke-dashoffset", function() {
        return this.getTotalLength();
      });

    if (style.isDashed) {
      line.style("stroke-dasharray", "8,6");
    }

    // أنيميشن رسم الخط مع تأثير متدرج
    line.transition()
      .delay(delay || 0)
      .duration(duration || 800)
      .ease(d3.easeQuadInOut)
      .style("stroke-dashoffset", 0)
      .style("opacity", style.opacity || 0.8)
      .on("end", function() {
        // إزالة الـ dash array بعد انتهاء الأنيميشن
        if (!style.isDashed) {
          d3.select(this).style("stroke-dasharray", "none");
        }
      });    // تأثير التفاعل عند التحويم مع تحسينات
    line.on("mouseenter", function() {
      d3.select(this)
        .transition()
        .duration(300)
        .style("stroke-width", (style.strokeWidth || 2) + 2)
        .style("opacity", Math.min((style.opacity || 0.8) + 0.2, 1))
        .style("filter", "drop-shadow(0 4px 12px rgba(0,0,0,0.3))")
        .style("stroke", d3.color(style.stroke || "#6366f1").brighter(0.3));
    })
    .on("mouseleave", function() {
      d3.select(this)
        .transition()
        .duration(300)
        .style("stroke-width", style.strokeWidth || 2)
        .style("opacity", style.opacity || 0.8)
        .style("filter", "drop-shadow(0 2px 6px rgba(0,0,0,0.15))")
        .style("stroke", style.stroke || "#6366f1");
    });
    
    return line;
  };

  // دالة مساعدة للحصول على نوع العلاقة المناسب (مستقبلية)
  // const getRelationshipType = (relationshipContext) => {
  //   switch (relationshipContext) {
  //     case 'parent-child':
  //       return 'primary';
  //     case 'sibling':
  //       return 'sibling';
  //     case 'uncle-aunt':
  //     case 'nephew-niece':
  //       return 'relative';
  //     case 'spouse':
  //       return 'spouse';
  //     case 'horizontal-connector':
  //       return 'secondary';
  //     default:
  //       return 'primary';
  //   }
  // };

  // رسم الروابط الإضافية للشجرة الموسعة بنفس نمط الشجرة الأصلية
  if (isExtended && data.parents && data.parents.length > 0) {
    const parentX = root.x; // الوالد في نفس المحور الأفقي لصاحب الحساب
    const parentY = root.y - parentChildGap; // استخدام المسافة المتجاوبة
    
    // إذا كان هناك أشقاء، ارسم نظام خطوط كامل
    if (data.siblings && data.siblings.length > 0) {
      // تحديد مواقع الأشقاء باستخدام المسافة المتجاوبة
      const siblingPositions = data.siblings.map((sibling, index) => {
        if (data.siblings.length === 1) {
          return root.x + (index === 0 ? -(cardWidth + horizontalGap) : (cardWidth + horizontalGap));
        } else if (data.siblings.length === 2) {
          return root.x + (index === 0 ? -(cardWidth + horizontalGap) : (cardWidth + horizontalGap));
        } else {
          const spacing = cardWidth + horizontalGap;
          const totalWidth = (data.siblings.length - 1) * spacing;
          const startX = root.x - totalWidth / 2;
          return startX + (index * spacing);
        }
      });
      
      // جميع المواقع (الأشقاء + صاحب الحساب)
      const allPositions = [...siblingPositions, root.x].sort((a, b) => a - b);
      const leftmost = allPositions[0];
      const rightmost = allPositions[allPositions.length - 1];
      const horizontalLineY = root.y - (verticalGap * 0.7); // مستوى الخط الأفقي متجاوب
      
      // 1. خط عمودي من الوالد إلى الخط الأفقي - موحد
      drawUnifiedLine(g, parentX, parentY + cardHeight/2, parentX, horizontalLineY, "parent-to-horizontal-line", "primary", 600, 600);
      
      // 2. خط أفقي يربط جميع الأشقاء مع صاحب الحساب - موحد
      drawUnifiedLine(g, leftmost, horizontalLineY, rightmost, horizontalLineY, "horizontal-siblings-line", "secondary", 700, 600);
      
      // 3. خط عمودي من الخط الأفقي إلى صاحب الحساب - موحد  
      drawUnifiedLine(g, root.x, horizontalLineY, root.x, root.y - cardHeight/2, "horizontal-to-owner", "sibling", 800, 400);
      
      // 4. خطوط عمودية من الخط الأفقي إلى كل شقيق - موحدة
      data.siblings.forEach((sibling, index) => {
        let siblingX;
        if (data.siblings.length === 1) {
          siblingX = root.x + (index === 0 ? -(cardWidth + horizontalGap) : (cardWidth + horizontalGap));
        } else if (data.siblings.length === 2) {
          siblingX = root.x + (index === 0 ? -(cardWidth + horizontalGap) : (cardWidth + horizontalGap));
        } else {
          const spacing = cardWidth + horizontalGap;
          const totalWidth = (data.siblings.length - 1) * spacing;
          const startX = root.x - totalWidth / 2;
          siblingX = startX + (index * spacing);
        }
        
        drawUnifiedLine(g, siblingX, horizontalLineY, siblingX, root.y - cardHeight/2, `horizontal-to-sibling-${index}`, "sibling", 800 + index * 100, 400);
      });
    } else {
      // إذا لم يكن هناك أشقاء، ارسم خط مباشر من الوالد إلى صاحب الحساب
      drawUnifiedLine(g, root.x, parentY + cardHeight/2, root.x, root.y - cardHeight/2, "parent-to-owner-direct", "primary", 600, 800);
    }
  }

  // رسم خطوط ربط لأولاد الإخوة والأخوات - مربوطين بآبائهم الصحيحين
  if (isExtended && data.nephewsNieces && data.nephewsNieces.length > 0 && data.siblings && data.siblings.length > 0) {
    data.nephewsNieces.forEach((nephewNiece, index) => {
      const nephewY = root.y + parentChildGap;
      
      // العثور على الأخ المرتبط بهذا ابن الأخ
      const linkedSiblingId = data.nephewToSiblingMap?.get(nephewNiece.id);
      let parentSiblingX = root.x; // موقع افتراضي
      
      if (linkedSiblingId && data.siblings) {
        const siblingIndex = data.siblings.findIndex(s => s.id === linkedSiblingId);
        if (siblingIndex !== -1) {
          // حساب موقع الأخ المحدد
          if (data.siblings.length === 1) {
            parentSiblingX = root.x + (siblingIndex === 0 ? -(cardWidth + horizontalGap) : (cardWidth + horizontalGap));
          } else if (data.siblings.length === 2) {
            parentSiblingX = root.x + (siblingIndex === 0 ? -(cardWidth + horizontalGap) : (cardWidth + horizontalGap));
          } else {
            const spacing = cardWidth + horizontalGap;
            const totalWidth = (data.siblings.length - 1) * spacing;
            const startX = root.x - totalWidth / 2;
            parentSiblingX = startX + (siblingIndex * spacing);
          }
        }
      }
      
      // موقع ابن الأخ - تحت أخيه مباشرة
      const nephewX = parentSiblingX;
      
      // خط ربط مباشر من الأخ إلى ابنه
      const siblingBottomY = root.y + cardHeight/2;
      drawUnifiedLine(g, parentSiblingX, siblingBottomY, nephewX, nephewY - cardHeight/2, `nephew-to-parent-${index}`, "relative", 1200 + index * 150, 400);
      
      // إضافة تسمية للخط (اختيارية)
      g.append("text")
        .attr("x", nephewX + 10)
        .attr("y", (siblingBottomY + nephewY - cardHeight/2) / 2)
        .attr("font-size", "10px")
        .attr("fill", "#666")
        .attr("opacity", 0.7)
        .text(`↳ ${nephewNiece.parentRelation}`);
    });
  }

  if (isExtended && data.unclesAunts && data.parents && data.parents.length > 0) {
    // رسم خطوط للأعمام والعمات - كأشقاء للوالد
    const parentY = root.y - parentChildGap;
    const parentX = root.x;
    
    // تحديد مواقع الأعمام باستخدام المسافة المتجاوبة
    const unclePositions = data.unclesAunts.map((uncle, index) => {
      const uncleSpacing = (cardWidth + horizontalGap) * 1.5;
      return root.x + (index % 2 === 0 ? -uncleSpacing : uncleSpacing);
    });
    
    // جميع المواقع (الأعمام + الوالد) في نفس المستوى
    const allParentLevelPositions = [...unclePositions, parentX].sort((a, b) => a - b);
    const leftmost = allParentLevelPositions[0];
    const rightmost = allParentLevelPositions[allParentLevelPositions.length - 1];
    const horizontalLineY = parentY - (verticalGap * 0.7); // خط أفقي أعلى مستوى الوالد والأعمام
    
    // 1. خط أفقي يربط الوالد مع الأعمام (كأشقاء) - موحد
    drawUnifiedLine(g, leftmost, horizontalLineY, rightmost, horizontalLineY, "parent-uncles-horizontal-line", "secondary", 900, 600);
    
    // 2. خط عمودي من الخط الأفقي إلى الوالد - موحد
    drawUnifiedLine(g, parentX, horizontalLineY, parentX, parentY, "horizontal-to-parent", "primary", 950, 400);
    
    // 3. خطوط عمودية من الخط الأفقي إلى كل عم - موحدة
    data.unclesAunts.forEach((uncle, index) => {
      const uncleSpacing = (cardWidth + horizontalGap) * 1.5;
      const uncleX = root.x + (index % 2 === 0 ? -uncleSpacing : uncleSpacing);
      
      drawUnifiedLine(g, uncleX, horizontalLineY, uncleX, parentY, `horizontal-to-uncle-${index}`, "relative", 950 + index * 100, 400);
    });
  }

  if (isExtended && data.motherSide && data.parents && data.parents.length > 0) {
    // رسم خطوط للأخوال والخالات - كأشقاء للأم
    const parentY = root.y - parentChildGap;
    
    // إذا كان هناك أم، فالأخوال يرتبطون بها كأشقاء
    // نفترض أن الأم في موقع مختلف قليلاً عن الأب للتمييز
    const motherX = root.x + (horizontalGap * 1.2); // الأم بجانب الأب
    
    // تحديد مواقع الأخوال باستخدام المسافة المتجاوبة
    const maternalUnclePositions = data.motherSide.map((uncle, index) => {
      const maternalSpacing = (cardWidth + horizontalGap) * 2.5;
      return root.x + (index % 2 === 0 ? -maternalSpacing : maternalSpacing);
    });
    
    // خط أفقي منفصل للأخوال والأم
    const allMaternalPositions = [...maternalUnclePositions, motherX].sort((a, b) => a - b);
    const leftmostMaternal = allMaternalPositions[0];
    const rightmostMaternal = allMaternalPositions[allMaternalPositions.length - 1];
    const maternalHorizontalLineY = parentY - 80; // مستوى منفصل للجانب الأمومي
    
    // 1. خط أفقي يربط الأم مع الأخوال (كأشقاء) - موحد
    drawUnifiedLine(g, leftmostMaternal, maternalHorizontalLineY, rightmostMaternal, maternalHorizontalLineY, "maternal-horizontal-line", "spouse", 1100, 600);
    
    // 2. خط عمودي من الخط الأفقي إلى الأم - موحد
    drawUnifiedLine(g, motherX, maternalHorizontalLineY, motherX, parentY, "horizontal-to-mother", "spouse", 1150, 400);
    
    // 3. خطوط عمودية من الخط الأفقي إلى كل خال - موحدة
    data.motherSide.forEach((uncle, index) => {
      const uncleSpacing = (cardWidth + horizontalGap) * 2.5;
      const uncleX = root.x + (index % 2 === 0 ? -uncleSpacing : uncleSpacing);
      
      drawUnifiedLine(g, uncleX, maternalHorizontalLineY, uncleX, parentY, `horizontal-to-maternal-uncle-${index}`, "spouse", 1150 + index * 100, 400);
    });
  }

  // رسم الروابط مع أنيميشن بسيط - استخدام النظام الموحد للشجرة العادية والموسعة
  const links = g.selectAll(".link")
    .data(root.links())
    .enter().append("path")
    .attr("class", "link unified-connection-line")
    .style("fill", "none")
    .attr("d", d => {
        const source = d.source;
        const target = d.target;
        const midY = source.y + (target.y - source.y) / 2;
        const radius = 20; // نصف قطر موحد
        return `M${source.x},${source.y}
                L${source.x},${midY - radius}
                Q${source.x},${midY} ${source.x + (target.x > source.x ? radius : -radius)},${midY}
                L${target.x - (target.x > source.x ? radius : -radius)},${midY}
                Q${target.x},${midY} ${target.x},${midY + radius}
                L${target.x},${target.y}`;
      })
    .style("stroke", CONNECTION_STYLES.primary?.stroke || "#6366f1")
    .style("stroke-width", CONNECTION_STYLES.primary?.strokeWidth || 3)
    .style("stroke-linecap", "round")
    .style("stroke-linejoin", "round")
    .style("opacity", 0) // بدء مخفي للأنيميشن
    .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.15))")
    .style("stroke-dasharray", "none");

  // أنيميشن موحد للروابط مع تأثيرات التفاعل
  links.transition()
    .delay(500)
    .duration(800)
    .ease(d3.easeQuadOut)
    .style("opacity", CONNECTION_STYLES.primary?.opacity || 0.8)
    .on("end", function() {
      // إضافة تأثيرات التفاعل بعد الانتهاء من الأنيميشن
      d3.select(this)
        .on("mouseenter", function() {
          d3.select(this)
            .transition()
            .duration(200)
            .style("stroke-width", (CONNECTION_STYLES.primary?.strokeWidth || 2) + 1)
            .style("opacity", Math.min((CONNECTION_STYLES.primary?.opacity || 0.8) + 0.2, 1))
            .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.25))");
        })
        .on("mouseleave", function() {
          d3.select(this)
            .transition()
            .duration(200)
            .style("stroke-width", CONNECTION_STYLES.primary?.strokeWidth || 2)
            .style("opacity", CONNECTION_STYLES.primary?.opacity || 0.8)
            .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.15))");
        });
    });

  // رسم العقد مع أنيميشن محسن
  const nodes = g.selectAll(".node")
    .data(root.descendants())
    .enter().append("g")
    .attr("class", "node")
    .attr("data-depth", d => d.depth)
    .attr("transform", d => `translate(${d.x},${d.y - 20}) scale(0.8)`) // بدء من أعلى وأصغر حجماً
    .style("opacity", 0);

  // أنيميشن متدرج وجميل للعقد
  nodes.transition()
    .delay((d, i) => d.depth * 150 + i * 100)
    .duration(800)
    .ease(d3.easeBackOut.overshoot(1.2))
    .style("opacity", 1)
    .attr("transform", d => `translate(${d.x},${d.y}) scale(1)`);

  // إضافة محتوى العقد مع أنيميشن إضافي
  nodes.each(function(d) {
    const nodeGroup = d3.select(this);
    const nodeData = d.data.attributes || d.data;
    
    const uniqueId = nodeData.id || nodeData.globalId || Math.random().toString(36).substring(7);
    const name = nodeData.name || `${nodeData.firstName || ''} ${nodeData.fatherName || ''}`.trim() || '';
    const relation = nodeData.relation || 'عضو';
    
    // استخدام الدالة الموحدة لرسم الكارت
    drawNodeCard(nodeGroup, nodeData, name, relation, uniqueId, cardWidth, cardHeight, padding, avatarSize, textStartX);

    // إضافة تأثير hover للكارت
    nodeGroup.select(".family-node-card")
      .on("mouseenter", function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("transform", "scale(1.05)")
          .style("filter", "drop-shadow(0 8px 25px rgba(0,0,0,0.2))");
      })
      .on("mouseleave", function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("transform", "scale(1)")
          .style("filter", "drop-shadow(0 4px 12px rgba(0,0,0,0.15))");
      });

    // إضافة تأثير البحث إذا وجد
    if (searchQuery.length > 1 && name.toLowerCase().includes(searchQuery.toLowerCase())) {
      nodeGroup.select("rect.family-node-card")
        .transition()
        .duration(600)
        .attr("stroke", "#f59e0b")
        .attr("stroke-width", 4)
        .style("filter", "drop-shadow(0 4px 15px rgba(245,158,11,0.4))");
    }

    // عند الضغط مع تأثير
    nodeGroup.on("click", function() {
      // تأثير النقر
      d3.select(this)
        .transition()
        .duration(150)
        .style("transform", "scale(0.95)")
        .transition()
        .duration(150)
        .style("transform", "scale(1)");
        
      handleNodeClick?.({
        ...nodeData,
        name,
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
            .attr("transform", `translate(${root.x}, ${root.y - parentChildGap - 30}) scale(0.7)`)
            .style("cursor", "pointer")
            .style("opacity", 0);
            
          // رسم الكارت باستخدام الدالة المشتركة
          const nodeData = parent.attributes || parent;
          const name = nodeData.name || parent.name || '';
          const relation = nodeData.relation || 'والد';
          const uniqueId = nodeData.id || nodeData.globalId || `parent_${index}`;
          
          drawNodeCard(parentNode, nodeData, name, relation, uniqueId, cardWidth, cardHeight, padding, avatarSize, textStartX);
          
          // إضافة تأثيرات التفاعل
          parentNode.select(".family-node-card")
            .on("mouseenter", function() {
              d3.select(this)
                .transition()
                .duration(200)
                .attr("transform", "scale(1.08)")
                .style("filter", "drop-shadow(0 10px 30px rgba(0,0,0,0.25))");
            })
            .on("mouseleave", function() {
              d3.select(this)
                .transition()
                .duration(200)
                .attr("transform", "scale(1)")
                .style("filter", "drop-shadow(0 4px 12px rgba(0,0,0,0.15))");
            });
          
          // أنيميشن الظهور محسن
          parentNode.transition()
            .delay(800 + index * 200)
            .duration(800)
            .ease(d3.easeBackOut.overshoot(1.3))
            .style("opacity", 1)
            .attr("transform", `translate(${root.x}, ${root.y - parentChildGap}) scale(1)`);
        });
      }
      
      // رسم عُقد الإخوة والأخوات
      if (data.siblings) {
        data.siblings.forEach((sibling, index) => {
          // توزيع أفضل للأشقاء - تجنب التداخل باستخدام المسافات المتجاوبة
          let siblingX;
          const siblingSpacing = cardWidth + horizontalGap;
          if (data.siblings.length === 1) {
            siblingX = root.x + (index === 0 ? -siblingSpacing : siblingSpacing);
          } else if (data.siblings.length === 2) {
            siblingX = root.x + (index === 0 ? -siblingSpacing : siblingSpacing);
          } else {
            // للأشقاء الأكثر من 2 - توزيع متوازن
            const totalWidth = (data.siblings.length - 1) * siblingSpacing;
            const startX = root.x - totalWidth / 2;
            siblingX = startX + (index * siblingSpacing);
          }
          
          const siblingNode = g.append("g")
            .attr("class", "node extended-node sibling-node")
            .attr("transform", `translate(${siblingX}, ${root.y + 20}) scale(0.8)`)
            .style("cursor", "pointer")
            .style("opacity", 0);
            
          // رسم الكارت باستخدام الدالة المشتركة
          const nodeData = sibling.attributes || sibling;
          const name = nodeData.name || sibling.name || '';
          const relation = nodeData.relation || 'شقيق';
          const uniqueId = nodeData.id || nodeData.globalId || `sibling_${index}`;
          
          drawNodeCard(siblingNode, nodeData, name, relation, uniqueId, cardWidth, cardHeight, padding, avatarSize, textStartX);
          
          // إضافة تأثيرات التفاعل
          siblingNode.select(".family-node-card")
            .on("mouseenter", function() {
              d3.select(this)
                .transition()
                .duration(200)
                .attr("transform", "scale(1.08)")
                .style("filter", "drop-shadow(0 10px 30px rgba(0,0,0,0.25))");
            })
            .on("mouseleave", function() {
              d3.select(this)
                .transition()
                .duration(200)
                .attr("transform", "scale(1)")
                .style("filter", "drop-shadow(0 4px 12px rgba(0,0,0,0.15))");
            });
            
          // أنيميشن الظهور محسن
          siblingNode.transition()
            .delay(1000 + index * 150)
            .duration(700)
            .ease(d3.easeBackOut.overshoot(1.2))
            .style("opacity", 1)
            .attr("transform", `translate(${siblingX}, ${root.y}) scale(1)`);
        });
      }
      
      // رسم عُقد أولاد الإخوة والأخوات (أبناء الأشقاء) - تحت آبائهم الصحيحين
      if (data.nephewsNieces) {
        data.nephewsNieces.forEach((nephewNiece, index) => {
          const baseY = root.y + parentChildGap; // أسفل مستوى صاحب الحساب
          
          // العثور على الأخ المرتبط بهذا ابن الأخ
          const linkedSiblingId = data.nephewToSiblingMap?.get(nephewNiece.id);
          let nephewX = root.x; // موقع افتراضي
          
          if (linkedSiblingId && data.siblings) {
            const siblingIndex = data.siblings.findIndex(s => s.id === linkedSiblingId);
            if (siblingIndex !== -1) {
              // حساب موقع الأخ المحدد
              if (data.siblings.length === 1) {
                nephewX = root.x + (siblingIndex === 0 ? -(cardWidth + horizontalGap) : (cardWidth + horizontalGap));
              } else if (data.siblings.length === 2) {
                nephewX = root.x + (siblingIndex === 0 ? -(cardWidth + horizontalGap) : (cardWidth + horizontalGap));
              } else {
                const spacing = cardWidth + horizontalGap;
                const totalWidth = (data.siblings.length - 1) * spacing;
                const startX = root.x - totalWidth / 2;
                nephewX = startX + (siblingIndex * spacing);
              }
              
              // إذا كان للأخ أكثر من طفل، نوزعهم حول موقعه
              const siblingChildren = data.nephewsNieces.filter(nn => 
                data.nephewToSiblingMap?.get(nn.id) === linkedSiblingId
              );
              
              if (siblingChildren.length > 1) {
                const childIndex = siblingChildren.findIndex(child => child.id === nephewNiece.id);
                const childSpacing = 100; // مسافة بين أطفال نفس الأخ
                const totalChildWidth = (siblingChildren.length - 1) * childSpacing;
                const startChildX = nephewX - totalChildWidth / 2;
                nephewX = startChildX + (childIndex * childSpacing);
              }
            }
          }
          
          const nephewNode = g.append("g")
            .attr("class", "node extended-node nephew-niece-node")
            .attr("transform", `translate(${nephewX}, ${baseY})`)
            .style("cursor", "pointer")
            .style("opacity", 0);
            
          // رسم الكارت باستخدام الدالة المشتركة
          const nodeData = nephewNiece.attributes || nephewNiece;
          const name = nodeData.name || nephewNiece.name || '';
          const relation = nodeData.relation || 'ابن/بنت الأخ/الأخت';
          const uniqueId = nodeData.id || nodeData.globalId || `nephew_niece_${index}`;
          
          drawNodeCard(nephewNode, nodeData, name, relation, uniqueId, cardWidth, cardHeight, padding, avatarSize, textStartX);
            
          // أنيميشن الظهور
          nephewNode.transition()
            .delay(1200 + index * 150)
            .duration(600)
            .ease(d3.easeBackOut)
            .style("opacity", 1);
        });
      }
      
      // رسم عُقد الأعمام والعمات
      if (data.unclesAunts) {
        data.unclesAunts.forEach((uncleAunt, index) => {
          const uncleSpacing = (cardWidth + horizontalGap) * 1.5;
          const uncleAuntNode = g.append("g")
            .attr("class", "node extended-node uncle-aunt-node")
            .attr("transform", `translate(${root.x + (index % 2 === 0 ? -uncleSpacing : uncleSpacing)}, ${root.y - parentChildGap})`)
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
        const spouseX = root.x + (cardWidth + horizontalGap);
        const spouseNode = g.append("g")
          .attr("class", "node extended-node spouse-node")
          .attr("transform", `translate(${spouseX}, ${root.y})`)
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
          
        // خط الربط للزوجة بالنمط الموحد
        drawUnifiedLine(g, root.x + cardWidth/2, root.y, spouseX - cardWidth/2, root.y, "spouse-link", "spouse", 400, 800);
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

        {/* الأزرار الرئيسية - تصميم متناسق */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: { xs: 1, sm: 1.5, md: 2 }, 
          flexWrap: 'wrap', 
          mb: 2,
          alignItems: 'center',
          px: { xs: 1, sm: 2 }
        }}>
          {/* زر التبديل بين الشجرة البسيطة والموسعة */}
          <Button 
            variant="contained"
            size="medium"
            onClick={() => setIsExtendedView(!isExtendedView)}
            disabled={loading || (!simpleTreeData && !extendedTreeData)}
            sx={{
              fontFamily: 'Cairo, sans-serif',
              px: { xs: 1.5, sm: 2 },
              py: { xs: 0.5, sm: 0.75 },
              fontSize: { xs: '0.75rem', sm: '0.85rem' },
              borderRadius: 2,
              minWidth: { xs: '120px', sm: '140px' },
              background: isExtendedView 
                ? 'linear-gradient(45deg, #2196f3 0%, #1976d2 100%)' 
                : 'linear-gradient(45deg, #4caf50 0%, #388e3c 100%)',
              boxShadow: isExtendedView 
                ? '0 2px 8px rgba(33,150,243,0.25)' 
                : '0 2px 8px rgba(76,175,80,0.25)',
              '&:hover': {
                background: isExtendedView 
                  ? 'linear-gradient(45deg, #1976d2 0%, #1565c0 100%)' 
                  : 'linear-gradient(45deg, #388e3c 0%, #2e7d32 100%)',
                transform: 'translateY(-1px)',
                boxShadow: isExtendedView 
                  ? '0 4px 12px rgba(33,150,243,0.3)' 
                  : '0 4px 12px rgba(76,175,80,0.3)'
              },
              transition: 'all 0.2s ease'
            }}
          >
            {isExtendedView ? '🌲 الشجرة الموسعة' : '🌳 الشجرة البسيطة'}
          </Button>

          {/* أزرار الإجراءات الأساسية */}
          <Button 
            variant="contained" 
            size="medium"
            onClick={() => navigate('/family')} 
            disabled={loading} 
            startIcon={<PersonAddIcon />} 
            sx={{ 
              fontFamily: 'Cairo, sans-serif',
              px: { xs: 1.5, sm: 2 },
              py: { xs: 0.5, sm: 0.75 },
              fontSize: { xs: '0.75rem', sm: '0.85rem' },
              borderRadius: 2,
              minWidth: { xs: '120px', sm: '140px' },
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
            size="medium"
            onClick={() => navigate('/statistics')}
            disabled={loading} 
            startIcon={<BarChartIcon />} 
            sx={{ 
              fontFamily: 'Cairo, sans-serif',
              px: { xs: 1.5, sm: 2 },
              py: { xs: 0.5, sm: 0.75 },
              fontSize: { xs: '0.75rem', sm: '0.85rem' },
              borderRadius: 2,
              minWidth: { xs: '120px', sm: '140px' },
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
