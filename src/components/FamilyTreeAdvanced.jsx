// src/components/FamilyTreeAdvanced.jsx - شجرة العائلة البسيطة
import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as d3 from 'd3';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Typography, Alert, Snackbar, CircularProgress, 
  Chip, IconButton, Paper, LinearProgress, 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, InputAdornment
} from '@mui/material';

// استيراد الأيقونات بشكل منفصل لتحسين الأداء
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';
import BarChartIcon from '@mui/icons-material/BarChart';

// استيرادات Firebase
import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';

// استيراد المكونات والأدوات المنفصلة
import './FamilyTreeAdvanced.css';
import { MALE_RELATIONS, FEMALE_RELATIONS, RelationUtils, RELATION_COLORS } from '../utils/FamilyRelations.js';
import familyTreeBuilder from '../utils/FamilyTreeBuilder.js';

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
  const [treeData, setTreeData] = useState(null);
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

  const sanitizeMemberData = familyTreeBuilder.sanitizeMemberData;

  // const findFamilyHead = familyTreeBuilder.findFamilyHead; // غير مستخدم حالياً

  // ===========================================================================
  // دوال أساسية useCallback
  // ===========================================================================

  const buildFullName = familyTreeBuilder.buildFullName;

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
  // دوال البناء من الملفات المنفصلة
  // ===========================================================================

  const buildTreeStructure = useCallback((familyMembers) => {
    return familyTreeBuilder.buildTreeStructure(familyMembers);
  }, []);

  const calculateTreeDepth = useCallback((node, currentDepth = 0) => {
    return familyTreeBuilder.calculateTreeDepth(node, currentDepth);
  }, []);

  // ===========================================================================
  // دوال التحميل الرئيسية
  // ===========================================================================

  const loadTree = useCallback(async () => {
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

      const builtTreeData = buildTreeStructure(familyMembers);
      
      setLoadingProgress(100);
      setLoadingStage('اكتمل التحميل');
      
      setTreeData(builtTreeData);
      
      // تسجيل مقاييس الأداء
      const treeDepth = builtTreeData ? calculateTreeDepth(builtTreeData) + 1 : 1;
      const hasFather = familyMembers.some(m => m.relation === 'والد');
      
      monitorPerformance({
        personCount: familyMembers.length,
        maxDepthReached: treeDepth,
        familyCount: 1,
        loadTime: 1000
      });
      
      if (hasFather) {
        showSnackbar(`✅ تم تحميل الشجرة الهرمية: ${familyMembers.length} أفراد (${treeDepth} أجيال)`, 'success');
      } else {
        showSnackbar(`✅ تم تحميل عائلتك: ${familyMembers.length} أفراد (رب العائلة وأولاده)`, 'success');
      }

    } catch {
      setError('فشل في تحميل الشجرة');
      showSnackbar('❌ فشل في تحميل الشجرة', 'error');
    } finally {
      setLoading(false);
    }
  }, [uid, showSnackbar, monitorPerformance, buildTreeStructure, calculateTreeDepth, sanitizeMemberData]);

  // ===========================================================================
  // دوال التحكم
  // ===========================================================================

  const handleRefresh = useCallback(() => {
    // تنظيف البيانات السابقة
    setTreeData(null);
    loadTree();
  }, [loadTree]);

  // ===========================================================================
  // دالة رسم الشجرة
  // ===========================================================================

  // استبدل دالة drawTreeWithD3 بهذا الكود الذي يحافظ على التصميم الأصلي مع أنيميشن بسيط:

const drawTreeWithD3 = useCallback((data) => {
  if (!data || !svgRef.current || !containerRef.current) return;

  const screenWidth = window.innerWidth;

  let cardWidth = 200;  // عرض أقل قليلاً لمزيد من المساحة
  let cardHeight = 100;

  if (screenWidth < 480) {
    cardWidth = 150;    // تقليل للشاشات الصغيرة
    cardHeight = 85;
  } else if (screenWidth < 768) {
    cardWidth = 175;
    cardHeight = 92;
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

  // إعداد الأبعاد
  const container = containerRef.current;
  const width = container.clientWidth;
  const height = container.clientHeight;
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

  // إعدادات الشجرة المحسنة للهيكل الهرمي
  const treeType = data.attributes?.treeType || 'simple';
  const verticalGap = treeType === 'hierarchical' ? 140 : 120; // زيادة المسافة العمودية
  const dynamicHeight = Math.max(verticalGap * maxDepth, 250);
  const dynamicWidth = width - 80; // تقليل الهوامش لمزيد من المساحة

  // إعداد تخطيط الشجرة مع توزيع أفقي أوسع
  const treeLayout = d3.tree()
    .size([dynamicWidth, dynamicHeight])
    .separation((a, b) => {
      // مسافة أكبر بين العقد لإظهار الخطوط بوضوح
      return a.parent === b.parent ? 2.5 : 3;
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
    .style("stroke", "#2196f3")  // لون أزرق أكثر وضوحاً
    .style("stroke-width", 3)        // خط أسمك للوضوح
    .style("stroke-linecap", "round")
    .style("stroke-linejoin", "round")
    .style("opacity", 0) // بدء مخفي للأنيميشن
    .style("filter", "drop-shadow(0 2px 4px rgba(33, 150, 243, 0.3))")  // ظل للخطوط
    .style("stroke-dasharray", "none");

  // أنيميشن بسيط للروابط
  links.transition()
    .delay(500)
    .duration(800)
    .ease(d3.easeQuadOut)
    .style("opacity", 0.9);  // شفافية أقل للوضوح

  // إضافة تأثيرات تفاعلية للروابط
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
  // 🟦 تحديد الألوان حسب الجنس أو النوع من الملف المنفصل
  let colors = RELATION_COLORS.DEFAULT;

  // العقدة الوهمية (الجذر الافتراضي) تصميم خاص
  if (nodeData.isVirtualRoot) {
    colors = RELATION_COLORS.VIRTUAL_ROOT;
    cardWidth = cardWidth * 0.8; // حجم أصغر
    cardHeight = cardHeight * 0.7;
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

  // صورة أو أفاتار (تخطي للعقدة الوهمية)
  if (!nodeData.isVirtualRoot) {
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
  } else {
    nodeGroup.append("text")
      .text(name.length > 22 ? name.slice(0, 20) + '…' : name)
      .attr("x", textStartX)
      .attr("y", nameY)
      .attr("font-size", 13)
      .attr("font-weight", "bold")
      .attr("fill", "#111");

    // العلاقة مع رمز مميز من الملف المنفصل
    const relationIcon = RelationUtils.getRelationIcon(relation, nodeData.isNephewNiece);
    const displayRelation = relationIcon ? `${relationIcon} ${relation}` : relation;
    
    nodeGroup.append("text")
      .text(displayRelation)
      .attr("x", textStartX)
      .attr("y", relationY)
      .attr("font-size", 11)
      .attr("fill", nodeData.isNephewNiece ? "#f59e0b" : "#666");
  }

  // العمر (تخطي للعقدة الوهمية)
  if (age && !nodeData.isVirtualRoot) {
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

  // ✅ الخلفية خلف عدد الأطفال (تخطي للعقدة الوهمية)
  if (d.children && d.children.length > 0 && !nodeData.isVirtualRoot) {
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

  // إضافة تأثيرات تفاعلية للعقد
  nodeGroup
    .on("mouseenter", function() {
      d3.select(this).select("rect.family-node-card")
        .style("transform", "scale(1.05)")
        .style("filter", "drop-shadow(0 6px 12px rgba(0,0,0,0.2))")
        .transition()
        .duration(200);
      
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
    .on("mouseleave", function() {
      d3.select(this).select("rect.family-node-card")
        .style("transform", "scale(1)")
        .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.1))")
        .transition()
        .duration(200);
      
      // إعادة الروابط لحالتها الطبيعية
      d3.selectAll(".link")
        .style("stroke", "#2196f3")
        .style("stroke-width", 3)
        .style("opacity", 0.9);
    })
    .on("click", () => {
      handleNodeClick?.({
        ...nodeData,
        name,
        age,
        children: d.children || []
      });
    });
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
          const scale = Math.min(
            (width * 0.8) / fullWidth,   // مساحة أقل للتمركز لإظهار المسافات
            (height * 0.8) / fullHeight,
            1.0   // حد أقصى أصغر للحفاظ على الوضوح
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

}, [handleNodeClick, searchQuery]);

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

    loadTree();
  }, [uid, navigate, loadTree]);

  // تأثير رسم الشجرة
  useEffect(() => {
    if (treeData && svgRef.current && containerRef.current) {
      const timer = setTimeout(() => {
        drawTreeWithD3(treeData);
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [drawTreeWithD3, treeData]);

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
    const treeTitle = 'شجرة عائلتك';
    
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
        ) : treeData ? (
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
                  🌳 ابنِ شجرة عائلتك
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
             شجرة عائلتك
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
            👨‍👩‍👧‍👦 هيكل كامل: الوالد → رب العائلة والإخوة والزوجات → الأطفال وأبناء الإخوة
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
      <Box sx={{ position: 'absolute', top: 120, left: 0, right: 0, bottom: 0 }}>
        {renderTreeView()}
      </Box>

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
                <Chip label={selectedNode.relation || ''} color="primary" variant="outlined" />
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