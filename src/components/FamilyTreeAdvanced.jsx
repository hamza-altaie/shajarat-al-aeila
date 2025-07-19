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
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

// استيراد المكونات
import ExtendedFamilyLinking from './ExtendedFamilyLinking';
import './FamilyTreeAdvanced.css';
import { useSearchZoom } from '../hooks/useSearchZoom';
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
  const [error, setError] = useState(null);
  const [isZoomedToNode, setIsZoomedToNode] = useState(false);
  
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
    
    // تقرير تفصيلي للإحصائيات المتقدمة
    if (globalMetrics.maxDepthReached) {
      console.log(`📏 التقرير النهائي: ${globalMetrics.maxDepthReached} جيل تم بناؤه بنجاح`);
      console.log(`🏆 تقييم النظام: ${actualDepth >= 15 ? 'قبيلة عظيمة' : actualDepth >= 10 ? 'متقدم جداً' : actualDepth >= 5 ? 'جيد جداً' : 'عائلة بسيطة'}`);
      console.log(`💡 الإمكانيات: يدعم حتى 15+ جيل مع أداء محسّن`);
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
    // إضافة تحميل بيانات المستخدم
    const userDoc = await getDoc(doc(db, 'users', familyUid));
    const userData = userDoc.exists() ? userDoc.data() : null;
    
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
          userData, // إضافة هذا السطر
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

  // دالة دمج الهويات المتعددة لنفس الشخص
  const mergePersonIdentities = useCallback((allFamiliesData) => {
    const personMap = new Map(); // خريطة الأشخاص بالاسم الكامل
    const mergedFamilies = [];

    allFamiliesData.forEach(familyData => {
      familyData.members.forEach(member => {
        const fullName = `${member.firstName?.trim() || ''}_${member.fatherName?.trim() || ''}`.toLowerCase();
        
        if (personMap.has(fullName)) {
          // هذا الشخص موجود بالفعل - دمج البيانات
          const existingPerson = personMap.get(fullName);
          
          // دمج الأدوار والمعلومات
          const mergedPerson = {
            ...existingPerson,
            // إبقاء أحدث المعلومات أو الأكثر تفصيلاً
            avatar: member.avatar || existingPerson.avatar,
            birthdate: member.birthdate || existingPerson.birthdate,
            phone: member.phone || existingPerson.phone,
            
            // دمج الأدوار من كلا الحسابين
            multipleRoles: [
              ...(existingPerson.multipleRoles || [{ 
                familyUid: existingPerson.familyUid, 
                relation: existingPerson.relation,
                isPrimary: true 
              }]),
              { 
                familyUid: familyData.uid, 
                relation: member.relation,
                isPrimary: false 
              }
            ],
            
            // تحديد الهوية الأساسية (عادة رب العائلة له الأولوية)
            primaryRole: member.relation === 'رب العائلة' ? {
              familyUid: familyData.uid,
              relation: member.relation
            } : existingPerson.primaryRole
          };
          
          personMap.set(fullName, mergedPerson);
          
          console.log(`🔗 دمج هوية: ${member.firstName} ${member.fatherName}`);
          console.log(`   📋 الأدوار المدموجة: ${mergedPerson.multipleRoles.map(r => `${r.relation} (${r.familyUid.slice(0,8)})`).join(', ')}`);
          
        } else {
          // شخص جديد - إضافته للخريطة
          const newPerson = {
            ...member,
            primaryRole: {
              familyUid: familyData.uid,
              relation: member.relation
            }
          };
          
          personMap.set(fullName, newPerson);
        }
      });

      // معالجة العائلة مع الأعضاء المدموجين - الحفاظ على العلاقة الأصلية لكل عائلة
      const updatedMembers = familyData.members.map(member => {
        const fullName = `${member.firstName?.trim() || ''}_${member.fatherName?.trim() || ''}`.toLowerCase();
        const mergedPerson = personMap.get(fullName);
        
        // إرجاع نسخة من الشخص المدموج مع الحفاظ على العلاقة الأصلية في هذه العائلة
        return {
          ...mergedPerson,
          relation: member.relation, // الحفاظ على العلاقة الأصلية في هذه العائلة
          familyUid: familyData.uid // الحفاظ على معرف العائلة الحالي
        };
      });

      mergedFamilies.push({
        ...familyData,
        members: updatedMembers
      });
    });

    return mergedFamilies;
  }, []);

  // إصلاح دالة buildExtendedTreeStructure في FamilyTreeAdvanced.jsx

  const buildExtendedTreeStructure = useCallback((allFamiliesData, rootFamilyUid) => {
    if (!allFamiliesData || allFamiliesData.length === 0) {
      return null;
    }

    // خطوة 1: دمج الهويات المتعددة لنفس الأشخاص
    console.log('🔄 دمج الهويات المتعددة...');
    console.log(`📊 عدد العائلات قبل الدمج: ${allFamiliesData.length}`);
    allFamiliesData.forEach((family, index) => {
      console.log(`   🏠 العائلة ${index + 1}: ${family.name || family.uid.slice(0,8)} (${family.members.length} أفراد)`);
    });
    
    const mergedFamiliesData = mergePersonIdentities(allFamiliesData);
    
    console.log(`✅ تم الدمج! عدد العائلات بعد الدمج: ${mergedFamiliesData.length}`);
    mergedFamiliesData.forEach((family, index) => {
      const mergedPersons = family.members.filter(m => m.multipleRoles);
      if (mergedPersons.length > 0) {
        console.log(`   🔗 العائلة ${index + 1}: ${mergedPersons.length} أشخاص مدموجين`);
        mergedPersons.forEach(person => {
          console.log(`      👤 ${person.firstName} ${person.fatherName}: ${person.multipleRoles.map(r => r.relation).join(' + ')}`);
        });
      }
    });

    // **خطوة جديدة: البحث المتقدم عن جميع الأجيال**
    
    // دالة للبحث عن جميع الأجداد (تصاعدي) - محسنة للأعماق الكبيرة
    function findAllAncestors(startFamily, maxDepth = 15) {
      console.log('🔍 البحث عن جميع الأجداد...');
      console.log(`   📊 البحث حتى عمق: ${maxDepth} أجيال`);
      
      const ancestors = [];
      const visitedFamilies = new Set(); // تجنب الدورات اللانهائية
      let currentFamily = startFamily;
      let depth = 0;
      
      while (currentFamily && depth < maxDepth) {
        // تجنب الدورات اللانهائية
        if (visitedFamilies.has(currentFamily.uid)) {
          console.log(`   ⚠️ تم اكتشاف دورة في العائلة: ${currentFamily.head?.firstName} - توقف البحث`);
          break;
        }
        visitedFamilies.add(currentFamily.uid);
        
        // البحث عن أب هذه العائلة
        const parentFamily = mergedFamiliesData.find(family => {
          return family.members.some(member => 
            member.multipleRoles && 
            member.multipleRoles.some(role => 
              role.familyUid === currentFamily.uid && 
              (role.relation === 'رب العائلة' || role.relation === 'child')
            ) &&
            member.multipleRoles.some(role => 
              role.familyUid === family.uid && 
              (role.relation === 'ابن' || role.relation === 'بنت')
            )
          );
        });
        
        if (parentFamily && parentFamily.uid !== currentFamily.uid && !visitedFamilies.has(parentFamily.uid)) {
          // تحسين تسمية الأجداد للأعماق الكبيرة - إصدار موسع
          let relationName;
          switch(depth) {
            case 0:
              relationName = 'أب';
              break;
            case 1:
              relationName = 'جد';
              break;
            case 2:
              relationName = 'جد الجد';
              break;
            case 3:
              relationName = 'جد الأجداد';
              break;
            case 4:
              relationName = 'جد الجيل الخامس';
              break;
            case 5:
              relationName = 'جد الجيل السادس';
              break;
            case 6:
              relationName = 'جد الجيل السابع';
              break;
            case 7:
              relationName = 'جد الجيل الثامن';
              break;
            case 8:
              relationName = 'جد الجيل التاسع';
              break;
            case 9:
              relationName = 'جد الجيل العاشر';
              break;
            case 10:
              relationName = 'جد الجيل الحادي عشر';
              break;
            case 11:
              relationName = 'جد الجيل الثاني عشر';
              break;
            case 12:
              relationName = 'جد الجيل الثالث عشر';
              break;
            case 13:
              relationName = 'جد الجيل الرابع عشر';
              break;
            case 14:
              relationName = 'جد الجيل الخامس عشر';
              break;
            default:
              if (depth < 20) {
                relationName = `جد الجيل ${depth + 1}`;
              } else {
                relationName = `جد الأسلاف الجيل ${depth + 1}`;
              }
          }
          
          ancestors.push({
            family: parentFamily,
            depth: depth + 1,
            relation: relationName
          });
          
          console.log(`   👴 وجد ${relationName}: ${parentFamily.head?.firstName} (عمق: ${depth + 1})`);
          currentFamily = parentFamily;
          depth++;
        } else {
          if (parentFamily && visitedFamilies.has(parentFamily.uid)) {
            console.log(`   ⚠️ توقف: العائلة الأب موجودة مسبقاً في المسار - تجنب الدورة`);
          }
          break;
        }
      }
      
      if (depth >= maxDepth) {
        console.log(`   ⚠️ تم الوصول للحد الأقصى للبحث: ${maxDepth} أجيال`);
      }
      
      console.log(`✅ تم العثور على ${ancestors.length} من الأجداد (حتى الجيل ${depth})`);
      return ancestors;
    }
    
    // دالة للبحث عن جميع الأحفاد (تنازلي) - محسنة للأعماق الكبيرة
    function findAllDescendants(personFamily, maxDepth = 15) {
      console.log(`🔍 البحث عن جميع أحفاد ${personFamily.head?.firstName}...`);
      console.log(`   📊 البحث حتى عمق: ${maxDepth} أجيال`);
      
      const descendants = [];
      const visitedFamilies = new Set(); // تجنب الدورات اللانهائية
      
      function searchDeeper(currentFamily, currentDepth) {
        if (currentDepth >= maxDepth) {
          console.log(`   ⚠️ تم الوصول للحد الأقصى للعمق: ${maxDepth} - توقف البحث`);
          return;
        }
        
        // تجنب الدورات اللانهائية
        if (visitedFamilies.has(currentFamily.uid)) {
          console.log(`   ⚠️ تم اكتشاف دورة في العائلة: ${currentFamily.head?.firstName} - تجاهل`);
          return;
        }
        visitedFamilies.add(currentFamily.uid);
        
        // البحث عن عائلات الأطفال
        const childrenFamilies = mergedFamiliesData.filter(family => {
          return family.members.some(member => 
            member.multipleRoles && 
            member.multipleRoles.some(role => 
              role.familyUid === currentFamily.uid && 
              (role.relation === 'ابن' || role.relation === 'بنت')
            ) &&
            member.multipleRoles.some(role => 
              role.familyUid === family.uid && 
              role.relation === 'رب العائلة'
            )
          ) && !visitedFamilies.has(family.uid);
        });
        
        childrenFamilies.forEach(childFamily => {
          if (childFamily.uid !== currentFamily.uid) {
            // تحسين تسمية الأحفاد للأعماق الكبيرة - إصدار موسع
            let relationName;
            switch(currentDepth) {
              case 0:
                relationName = 'ابن';
                break;
              case 1:
                relationName = 'حفيد';
                break;
              case 2:
                relationName = 'حفيد الحفيد';
                break;
              case 3:
                relationName = 'ابن الجيل الرابع';
                break;
              case 4:
                relationName = 'ابن الجيل الخامس';
                break;
              case 5:
                relationName = 'ابن الجيل السادس';
                break;
              case 6:
                relationName = 'ابن الجيل السابع';
                break;
              case 7:
                relationName = 'ابن الجيل الثامن';
                break;
              case 8:
                relationName = 'ابن الجيل التاسع';
                break;
              case 9:
                relationName = 'ابن الجيل العاشر';
                break;
              case 10:
                relationName = 'ابن الجيل الحادي عشر';
                break;
              case 11:
                relationName = 'ابن الجيل الثاني عشر';
                break;
              case 12:
                relationName = 'ابن الجيل الثالث عشر';
                break;
              case 13:
                relationName = 'ابن الجيل الرابع عشر';
                break;
              case 14:
                relationName = 'ابن الجيل الخامس عشر';
                break;
              default:
                if (currentDepth < 20) {
                  relationName = `ابن الجيل ${currentDepth + 1}`;
                } else {
                  relationName = `من ذرية الجيل ${currentDepth + 1}`;
                }
            }
            
            descendants.push({
              family: childFamily,
              depth: currentDepth + 1,
              relation: relationName
            });
            
            console.log(`   👶 وجد ${relationName}: ${childFamily.head?.firstName} (عمق: ${currentDepth + 1})`);
            
            // البحث التكراري للمستوى التالي
            searchDeeper(childFamily, currentDepth + 1);
          }
        });
      }
      
      searchDeeper(personFamily, 0);
      console.log(`✅ تم العثور على ${descendants.length} من الأحفاد`);
      return descendants;
    }
    
    // دالة للبحث عن جميع الأقارب الجانبيين
    function findAllCousinsAndRelatives(ancestors) {
      console.log('🔍 البحث عن جميع الأقارب الجانبيين...');
      const relatives = [];
      
      ancestors.forEach(ancestor => {
        // البحث عن إخوة هذا الجد
        const uncles = mergedFamiliesData.filter(family => {
          return family.members.some(member => 
            member.multipleRoles && 
            member.multipleRoles.some(role => 
              role.familyUid === ancestor.family.uid && 
              (role.relation === 'ابن' || role.relation === 'بنت')
            ) &&
            member.multipleRoles.some(role => 
              role.familyUid === family.uid && 
              role.relation === 'رب العائلة'
            )
          ) && family.uid !== ancestor.family.uid;
        });
        
        uncles.forEach(uncle => {
          const relationName = ancestor.depth === 1 ? 'عم' : 
                             ancestor.depth === 2 ? 'عم الأب' : 
                             `عم الجد ${ancestor.depth - 1}`;
          
          relatives.push({
            family: uncle,
            depth: ancestor.depth,
            relation: relationName,
            ancestorDepth: ancestor.depth
          });
          
          console.log(`   👨‍👦‍👦 وجد ${relationName}: ${uncle.head?.firstName}`);
          
          // البحث عن أطفال العم (أبناء العم)
          const cousinDescendants = findAllDescendants(uncle, 5);
          cousinDescendants.forEach(cousin => {
            const cousinRelation = ancestor.depth === 1 ? 
              (cousin.depth === 1 ? 'ابن عم' : `حفيد العم ${cousin.depth - 1}`) :
              `ابن عم الجد ${ancestor.depth - 1}`;
              
            relatives.push({
              family: cousin.family,
              depth: ancestor.depth + cousin.depth,
              relation: cousinRelation,
              ancestorDepth: ancestor.depth
            });
          });
        });
      });
      
      console.log(`✅ تم العثور على ${relatives.length} من الأقارب الجانبيين`);
      return relatives;
    }

    const currentUserFamily = mergedFamiliesData.find(f => f.uid === rootFamilyUid);
    
    // **البحث الشامل عن جميع الأجيال والأقارب**
    console.log('🌳 بناء الشجرة الشاملة للقبيلة...');
    
    // العثور على جميع الأجداد
    const allAncestors = findAllAncestors(currentUserFamily, 10);
    
    // العثور على جميع الأقارب الجانبيين
    const allRelatives = findAllCousinsAndRelatives(allAncestors);
    
    // تحديد الجذر الأقدم (أعلى جد في السلسلة)
    const oldestAncestor = allAncestors.length > 0 ? 
      allAncestors[allAncestors.length - 1] : 
      { family: currentUserFamily, depth: 0, relation: 'أنت' };
    
    console.log(`👴 الجد الأقدم: ${oldestAncestor.family.head?.firstName} (عمق: ${oldestAncestor.depth})`);
    console.log(`📊 إجمالي الأجداد: ${allAncestors.length}`);
    console.log(`📊 إجمالي الأقارب: ${allRelatives.length}`);
    
    // تحليل الروابط وتصنيفها - إصلاح محسن
    let relationships = {
      oldestRoot: oldestAncestor.family,        // الجذر الأقدم
      ancestors: allAncestors,                  // جميع الأجداد
      directParent: null,                       // الأب المباشر  
      siblings: [],                             // الإخوة
      uncles: [],                               // الأعمام
      cousins: [],                              // أبناء العم
      descendants: [],                          // الأحفاد
      relatives: allRelatives,                  // جميع الأقارب الجانبيين
      others: []                                // باقي الأقارب
    };

    // **خطوة 1: البحث عن الأب المباشر والإخوة من خلال الهويات المدموجة**
    console.log('🔍 البحث عن الأب المباشر والإخوة...');
    
    // البحث عن الأب المباشر (الجيل السابق مباشرة)
    const directParent = allAncestors.length > 0 ? allAncestors[0] : null;
    if (directParent) {
      relationships.directParent = directParent.family;
      console.log(`👨 تم العثور على الأب المباشر: ${directParent.family.head?.firstName}`);
    }
    
    // البحث عن الإخوة في عائلة الأب المباشرة
    if (relationships.directParent) {
      console.log(`🏠 عائلة الأب: ${relationships.directParent.uid.slice(0,8)} - عدد الأعضاء: ${relationships.directParent.members.length}`);
      console.log(`👤 المستخدم الحالي: ${currentUserFamily.head.firstName} (${currentUserFamily.head.globalId || currentUserFamily.head.id})`);
      
      // طباعة جميع أعضاء عائلة الأب
      relationships.directParent.members.forEach((member, index) => {
        console.log(`   عضو ${index + 1}: ${member.firstName} - علاقة: ${member.relation} - ID: ${member.globalId || member.id}`);
      });
      
      // البحث عن الإخوة في عائلة الأب المباشرة
      const siblingsInParentFamily = relationships.directParent.members.filter(member => 
        (member.relation === 'ابن' || member.relation === 'بنت') &&
        member.globalId !== currentUserFamily.head.globalId && // ليس المستخدم الحالي
        member.id !== currentUserFamily.head.id
      );
      
      console.log(`🔍 عدد الإخوة المحتملين في عائلة الأب: ${siblingsInParentFamily.length}`);
      
      // إضافة كل أخ كعائلة منفصلة للشجرة
      siblingsInParentFamily.forEach(sibling => {
        console.log(`🔍 معالجة الأخ: ${sibling.firstName}`);
        
        // البحث عن عائلة هذا الأخ (إذا كان له عائلة منفصلة)
        const siblingFamily = mergedFamiliesData.find(family => 
          family.head.globalId === sibling.globalId || 
          family.head.id === sibling.id
        );
        
        if (siblingFamily && siblingFamily.uid !== rootFamilyUid) {
          console.log(`👨‍👦 تم العثور على أخ له عائلة منفصلة: ${sibling.firstName} (${siblingFamily.uid.slice(0,8)})`);
          relationships.siblings.push(siblingFamily);
        } else {
          // إنشاء عائلة وهمية للأخ إذا لم يكن له عائلة منفصلة
          console.log(`👨‍👦 إنشاء عائلة وهمية للأخ: ${sibling.firstName}`);
          const virtualSiblingFamily = {
            uid: `virtual_${sibling.globalId || sibling.id}`,
            head: sibling,
            members: [sibling],
            userData: {},
            isVirtual: true
          };
          relationships.siblings.push(virtualSiblingFamily);
        }
      });
    }
    
    // **خطوة 2: تصنيف الأقارب الجانبيين**
    console.log('🔍 تصنيف الأقارب الجانبيين...');
    
    // تصنيف الأعمام وأبناء العم
    allRelatives.forEach(relative => {
      if (relative.relation.includes('عم') && !relative.relation.includes('ابن')) {
        relationships.uncles.push(relative.family);
        console.log(`👨‍👨‍👦 تم تصنيف عم: ${relative.family.head?.firstName} (${relative.relation})`);
      } else if (relative.relation.includes('ابن عم') || relative.relation.includes('حفيد العم')) {
        relationships.cousins.push(relative.family);
        console.log(`👥 تم تصنيف ابن عم: ${relative.family.head?.firstName} (${relative.relation})`);
      } else {
        relationships.others.push({family: relative.family, type: relative.relation});
        console.log(`👤 تم تصنيف قريب آخر: ${relative.family.head?.firstName} (${relative.relation})`);
      }
    });
    
    // **خطوة 3: البحث عن جميع الأحفاد**
    console.log('🔍 البحث عن جميع الأحفاد...');
    relationships.descendants = findAllDescendants(currentUserFamily, 10);
    
    console.log(`👶 تم العثور على ${relationships.descendants.length} من الأحفاد`);
    relationships.descendants.forEach(descendant => {
      console.log(`   👶 ${descendant.relation}: ${descendant.family.head?.firstName} (عمق: ${descendant.depth})`);
    });

    // **خطوة 4: معالجة الروابط التقليدية إذا لم نجد ما يكفي من الهويات المدموجة**
    if ((!relationships.directParent || relationships.siblings.length === 0) && currentUserFamily?.userData?.linkedFamilies) {
      console.log('🔗 معالجة الروابط التقليدية...');
      currentUserFamily.userData.linkedFamilies.forEach(link => {
        const linkedFamily = mergedFamiliesData.find(f => f.uid === link.targetFamilyUid);
        
        if (linkedFamily?.head) {
          console.log(`🔗 معالجة رابط: ${link.linkType} مع ${linkedFamily.head.firstName}`);
          
          switch (link.linkType) {
            case 'child-parent':
              if (!relationships.directParent) {
                relationships.directParent = linkedFamily;
                console.log(`👨 تعيين أب مباشر من الروابط: ${linkedFamily.head.firstName}`);
              }
              break;
              
            case 'sibling':
              if (!relationships.siblings.some(s => s.uid === linkedFamily.uid)) {
                relationships.siblings.push(linkedFamily);
              }
              break;
              
            case 'cousin':
              if (!relationships.cousins.some(c => c.uid === linkedFamily.uid)) {
                relationships.cousins.push(linkedFamily);
              }
              break;
              
            case 'extended': {
              // تحديد إذا كان عم أم قريب عادي
              const isUncle = link.relationDescription?.includes('عم') || 
                            link.relationDescription?.includes('uncle') ||
                            linkedFamily.head.surname === currentUserFamily.head.surname;
              
              if (isUncle && !relationships.uncles.some(u => u.uid === linkedFamily.uid)) {
                relationships.uncles.push(linkedFamily);
              } else {
                relationships.others.push({family: linkedFamily, type: 'extended'});
              }
              break;
            }
              
            default:
              relationships.others.push({family: linkedFamily, type: link.linkType});
          }
        }
      });
    }

    console.log('📊 تحليل العلاقات النهائي الشامل:');
    console.log(`   � الجذر الأقدم: ${relationships.oldestRoot ? relationships.oldestRoot.head?.firstName : 'لا يوجد'}`);
    console.log(`   📈 عدد الأجداد: ${relationships.ancestors.length}`);
    console.log(`   �👨 أب مباشر: ${relationships.directParent ? relationships.directParent.head?.firstName : 'لا يوجد'}`);
    console.log(`   👨‍👦 إخوة: ${relationships.siblings.length}`);
    console.log(`   👨‍👨‍👦 أعمام: ${relationships.uncles.length}`);
    console.log(`   👥 أبناء عم: ${relationships.cousins.length}`);
    console.log(`   👶 أحفاد: ${relationships.descendants.length}`);
    console.log(`   👤 أقارب آخرين: ${relationships.others.length}`);
    
    if (relationships.siblings.length > 0) {
      relationships.siblings.forEach((sibling, index) => {
        console.log(`      👤 أخ ${index + 1}: ${sibling.head?.firstName} (${sibling.isVirtual ? 'وهمي' : sibling.uid?.slice(0,8)})`);
      });
    }

    // خريطة للعقد المنشأة لتجنب التكرار
    const createdNodes = new Map();
    
    // دالة مساعدة لإنشاء عقدة شخص بدون إضافة الأطفال تلقائياً
    function createPersonNodeWithoutChildren(familyData, familyLabel, relationLabel, isCurrentUser = false) {
      const person = familyData.head;
      const personKey = person.globalId || person.id;
      
      // التحقق من وجود العقدة مسبقاً لتجنب التكرار
      if (createdNodes.has(personKey)) {
        const existingNode = createdNodes.get(personKey);
        
        // تحديث العلاقة إذا كانت أكثر أهمية
        const currentRelationPriority = getRelationPriority(relationLabel);
        const existingRelationPriority = getRelationPriority(existingNode.attributes.actualRelation);
        
        if (currentRelationPriority > existingRelationPriority) {
          existingNode.attributes.actualRelation = relationLabel;
          existingNode.attributes.familyName = familyLabel;
          
          // تحديث حالة المستخدم الحالي إذا لزم الأمر
          if (isCurrentUser) {
            existingNode.attributes.isCurrentUser = true;
          }
        }
        
        // إضافة الدور الجديد إلى القائمة (تجنب التكرار)
        if (person.multipleRoles) {
          const existingRoleIds = new Set(existingNode.attributes.allRoles.map(r => `${r.familyUid}_${r.relation}`));
          const newRoles = person.multipleRoles.filter(role => 
            !existingRoleIds.has(`${role.familyUid}_${role.relation}`)
          );
          
          existingNode.attributes.allRoles = [
            ...existingNode.attributes.allRoles,
            ...newRoles
          ];
          existingNode.attributes.hasMultipleRoles = existingNode.attributes.allRoles.length > 1;
        }
        
        console.log(`🔄 استخدام العقدة الموجودة: ${existingNode.name} - الدور المحدث: ${existingNode.attributes.actualRelation}`);
        return existingNode;
      }
      
      // تحديد الاسم والدور المناسب
      const displayName = buildFullName(person);
      
      // تحديد العلاقة الأساسية (أولوية للأب > رب العائلة > ابن)
      let primaryRelation = relationLabel;
      if (person.multipleRoles) {
        const relationPriorities = person.multipleRoles.map(r => ({
          relation: r.relation,
          priority: getRelationPriority(r.relation)
        }));
        
        const highestPriorityRole = relationPriorities.reduce((prev, current) => 
          current.priority > prev.priority ? current : prev
        );
        
        primaryRelation = highestPriorityRole.relation;
      }
      
      const node = {
        name: displayName,
        id: personKey,
        avatar: person.avatar || null,
        attributes: {
          ...person,
          isCurrentUser,
          treeType: 'extended',
          isExtended: !isCurrentUser,
          familyName: familyLabel,
          actualRelation: primaryRelation,
          // إضافة معلومات الأدوار المتعددة
          hasMultipleRoles: !!person.multipleRoles,
          allRoles: person.multipleRoles || [{ familyUid: familyData.uid, relation: relationLabel }]
        },
        children: []
      };

      // حفظ العقدة في الخريطة
      createdNodes.set(personKey, node);
      console.log(`✅ إنشاء عقدة جديدة (بدون أطفال): ${displayName} - الدور: ${primaryRelation}`);

      return node;
    }
    
    // دالة لإضافة الأطفال فقط من عائلة الشخص نفسه
    function addChildrenToNode(node, familyData) {
      const person = familyData.head;
      const children = familyData.members.filter(m => 
        (m.relation === 'ابن' || m.relation === 'بنت') && 
        (m.globalId !== person.globalId && m.id !== person.id)
      );

      console.log(`   🔍 البحث عن أطفال ${person.firstName} في عائلته (${familyData.uid.slice(0,8)})`);
      console.log(`   📊 عدد الأطفال الفعليين في العائلة: ${children.length}`);

      children.forEach(child => {
        const childKey = child.globalId || child.id;
        
        // تجنب إضافة الطفل إذا كان موجود بالفعل في أي مكان من الشجرة
        if (!createdNodes.has(childKey)) {
          // تحقق إذا كان هذا الطفل له عائلة منفصلة (وبالتالي سيظهر في مستوى منفصل)
          const hasOwnFamily = mergedFamiliesData.some(family => 
            (family.head.globalId === child.globalId || family.head.id === child.id) &&
            family.uid !== familyData.uid
          );
          
          if (!hasOwnFamily) {
            // فقط إضافة الأطفال الذين ليس لهم عائلات منفصلة
            const childDisplayRelation = child.multipleRoles 
              ? getHighestPriorityRelation(child.multipleRoles)
              : child.relation;
              
            const childNode = {
              name: buildFullName(child),
              id: childKey,
              avatar: child.avatar || null,
              attributes: {
                ...child,
                isCurrentUser: false,
                treeType: 'extended',
                isExtended: true,
                familyName: `أطفال ${node.attributes.familyName}`,
                actualRelation: childDisplayRelation,
                hasMultipleRoles: !!child.multipleRoles,
                allRoles: child.multipleRoles || [{ familyUid: familyData.uid, relation: child.relation }]
              },
              children: []
            };
            
            createdNodes.set(childKey, childNode);
            node.children.push(childNode);
            console.log(`   👶 إضافة طفل فعلي (بدون عائلة منفصلة): ${buildFullName(child)} - الدور: ${childDisplayRelation}`);
          } else {
            console.log(`   ⏩ تجاهل طفل له عائلة منفصلة: ${buildFullName(child)} (سيظهر في مستوى منفصل)`);
          }
        } else {
          console.log(`   ⚠️ تجاهل طفل موجود مسبقاً: ${buildFullName(child)}`);
        }
      });
      
      console.log(`   ✅ تم إضافة ${node.children.length} أطفال فعليين لـ ${person.firstName}`);
    }

    // دالة لتحديد أولوية العلاقات
    function getRelationPriority(relation) {
      const priorities = {
        'جد': 100,
        'أب': 90,
        'عم': 80,
        'رب العائلة': 70,
        'ابن': 60,
        'بنت': 60,
        'أخ': 50,
        'أخت': 50,
        'ابن عم': 40,
        'قريب': 30
      };
      return priorities[relation] || 20;
    }
    
    // دالة للحصول على العلاقة ذات الأولوية الأعلى
    function getHighestPriorityRelation(roles) {
      return roles.reduce((prev, current) => 
        getRelationPriority(current.relation) > getRelationPriority(prev.relation) ? current : prev
      ).relation;
    }

    // **السيناريو الجديد: الشجرة الشاملة من الجذر الأقدم**
    console.log('🌳 بناء الشجرة الشاملة...');
    
    // إذا وُجد جذر أقدم، ابنِ الشجرة من الأعلى
    if (relationships.ancestors.length > 0) {
      console.log('🏛️ بناء شجرة شاملة من الجد الأقدم');
      
      // بناء الشجرة من الجذر الأقدم للأسفل
      function buildComprehensiveTree() {
        const rootNode = createPersonNodeWithoutChildren(
          relationships.oldestRoot, 
          `الجد الأكبر`, 
          `جد القبيلة`
        );
        
        // بناء الشجرة بشكل تدريجي من الأعلى للأسفل - محسن للأجيال العميقة
        function buildGenerationLevel(parentNode, parentFamily, currentDepth, maxDepth = 15) {
          if (currentDepth >= maxDepth) {
            console.log(`⚠️ تم الوصول للحد الأقصى للعمق: ${maxDepth} - توقف البناء`);
            return;
          }
          
          console.log(`🔄 بناء المستوى ${currentDepth} للعائلة: ${parentFamily.head?.firstName}`);
          console.log(`   📊 العمق الحالي: ${currentDepth}/${maxDepth-1} - عدد العائلات المتاحة: ${mergedFamiliesData.length}`);
          
          // البحث عن أطفال هذا المستوى (الذين لهم عائلات منفصلة)
          console.log(`   🔍 البحث في ${mergedFamiliesData.length} عائلة عن أطفال ${parentFamily.head?.firstName} (${parentFamily.uid.slice(0,8)})`);
          
          // إعادة تصميم منطق البحث - البحث مباشرة عن العائلات التي يكون فيها شخص رب عائلة وابن الوالد
          const childrenAtThisLevel = [];
          
          console.log(`   🔍 البحث المباشر عن الأطفال بعائلات منفصلة...`);
          
          // البحث في عائلة الوالد عن الأطفال الذين لهم عائلات منفصلة
          parentFamily.members.forEach(member => {
            console.log(`     🔍 فحص عضو عائلة الوالد: ${member.firstName}`);
            
            if (member.multipleRoles && (member.relation === 'ابن' || member.relation === 'بنت')) {
              console.log(`       ✅ ${member.firstName} له أدوار متعددة وهو طفل للوالد`);
              
              // البحث عن العائلة التي يكون فيها رب عائلة
              const separateFamily = mergedFamiliesData.find(family => {
                return member.multipleRoles.some(role => 
                  role.familyUid === family.uid && role.relation === 'رب العائلة'
                );
              });
              
              if (separateFamily && separateFamily.uid !== parentFamily.uid) {
                console.log(`       ✅ وُجدت عائلة منفصلة لـ ${member.firstName}: ${separateFamily.uid.slice(0,8)}`);
                console.log(`       � أدوار ${member.firstName}: ${member.multipleRoles.map(r => `${r.relation} في ${r.familyUid.slice(0,8)}`).join(', ')}`);
                
                // التأكد من عدم الإضافة المكررة
                if (!childrenAtThisLevel.some(child => child.uid === separateFamily.uid)) {
                  childrenAtThisLevel.push(separateFamily);
                  console.log(`       ➕ تمت إضافة ${separateFamily.head?.firstName} للأطفال المحتملين`);
                } else {
                  console.log(`       ⚠️ تجاهل الإضافة المكررة لـ ${separateFamily.head?.firstName}`);
                }
              } else {
                console.log(`       ❌ لم توجد عائلة منفصلة لـ ${member.firstName}`);
              }
            } else {
              console.log(`       ❌ ${member.firstName} ليس له أدوار متعددة أو ليس طفل`);
            }
          });
          
          console.log(`   👶 وجد ${childrenAtThisLevel.length} أطفال بعائلات منفصلة في المستوى ${currentDepth}`);
          
          childrenAtThisLevel.forEach((childFamily, index) => {
            console.log(`   🔄 معالجة الطفل ${index + 1}: ${childFamily.head?.firstName} - عائلة: ${childFamily.uid.slice(0,8)}`);
            console.log(`   🔍 فحص الشرط: ${childFamily.uid} !== ${parentFamily.uid} = ${childFamily.uid !== parentFamily.uid}`);
            
            if (childFamily.uid !== parentFamily.uid) {
              console.log(`   ✅ تمرير شرط العائلة المختلفة`);
              
              // تحسين تسمية الأجيال للأعماق الكبيرة - إصدار موسع
              let relationName, displayLabel;
              
              switch(currentDepth) {
                case 0:
                  relationName = 'ابن';
                  displayLabel = 'ابن';
                  break;
                case 1:
                  relationName = 'حفيد';
                  displayLabel = 'حفيد';
                  break;
                case 2:
                  relationName = 'حفيد الحفيد';
                  displayLabel = 'حفيد الحفيد';
                  break;
                case 3:
                  relationName = 'ابن الجيل الرابع';
                  displayLabel = 'الجيل الرابع';
                  break;
                case 4:
                  relationName = 'ابن الجيل الخامس';
                  displayLabel = 'الجيل الخامس';
                  break;
                case 5:
                  relationName = 'ابن الجيل السادس';
                  displayLabel = 'الجيل السادس';
                  break;
                case 6:
                  relationName = 'ابن الجيل السابع';
                  displayLabel = 'الجيل السابع';
                  break;
                case 7:
                  relationName = 'ابن الجيل الثامن';
                  displayLabel = 'الجيل الثامن';
                  break;
                case 8:
                  relationName = 'ابن الجيل التاسع';
                  displayLabel = 'الجيل التاسع';
                  break;
                case 9:
                  relationName = 'ابن الجيل العاشر';
                  displayLabel = 'الجيل العاشر';
                  break;
                case 10:
                  relationName = 'ابن الجيل الحادي عشر';
                  displayLabel = 'الجيل الحادي عشر';
                  break;
                case 11:
                  relationName = 'ابن الجيل الثاني عشر';
                  displayLabel = 'الجيل الثاني عشر';
                  break;
                case 12:
                  relationName = 'ابن الجيل الثالث عشر';
                  displayLabel = 'الجيل الثالث عشر';
                  break;
                case 13:
                  relationName = 'ابن الجيل الرابع عشر';
                  displayLabel = 'الجيل الرابع عشر';
                  break;
                case 14:
                  relationName = 'ابن الجيل الخامس عشر';
                  displayLabel = 'الجيل الخامس عشر';
                  break;
                default:
                  if (currentDepth < 20) {
                    relationName = `ابن الجيل ${currentDepth + 1}`;
                    displayLabel = `الجيل ${currentDepth + 1}`;
                  } else {
                    relationName = `من نسل الجيل ${currentDepth + 1}`;
                    displayLabel = `نسل الجيل ${currentDepth + 1}`;
                  }
              }
              
              const isCurrentUser = childFamily.uid === rootFamilyUid;
              if (isCurrentUser) {
                displayLabel = 'أنت';
              }
              
              console.log(`   🏗️ إنشاء عقدة للطفل: ${childFamily.head?.firstName} بعلاقة: ${relationName} (${displayLabel}) - العمق: ${currentDepth + 1}`);
              
              const childNode = createPersonNodeWithoutChildren(
                childFamily,
                displayLabel,
                relationName,
                isCurrentUser
              );
              
              // إضافة معلومات العمق للعقدة
              childNode.attributes.generationDepth = currentDepth + 1;
              childNode.attributes.generationLevel = `الجيل ${currentDepth + 1}`;
              
              console.log(`   📦 العقدة المُنشأة: ${childNode.name} - العمق: ${childNode.attributes.generationDepth}`);
              
              parentNode.children.push(childNode);
              console.log(`   ✅ أضيف طفل بعائلة منفصلة: ${childFamily.head?.firstName} (${relationName})`);
              console.log(`   📊 عدد أطفال الوالد الآن: ${parentNode.children.length}`);
              
              // إضافة الأطفال الفعليين من عائلة هذا الشخص
              addChildrenToNode(childNode, childFamily);
              
              // تتبع العمق الحقيقي للشجرة
              const currentActualDepth = currentDepth + 1;
              if (currentActualDepth > (window.familyTreeMetrics?.maxDepthReached || 0)) {
                window.familyTreeMetrics = window.familyTreeMetrics || {};
                window.familyTreeMetrics.maxDepthReached = currentActualDepth;
                console.log(`📏 عمق جديد تم الوصول إليه: ${currentActualDepth} أجيال`);
              }
              
              // الاستمرار في البناء للمستوى التالي مع حماية من التكرار اللانهائي
              console.log(`   🔄 الاستمرار للمستوى ${currentDepth + 1}...`);
              buildGenerationLevel(childNode, childFamily, currentDepth + 1, maxDepth);
            } else {
              console.log(`   ❌ تجاهل: نفس العائلة`);
            }
          });
        }
        
        console.log(`🏗️ بناء الشجرة من الجذر: ${relationships.oldestRoot.head?.firstName}`);
        
        // إضافة أطفال الجذر الفعليين أولاً (الذين ليس لهم عائلات منفصلة)
        addChildrenToNode(rootNode, relationships.oldestRoot);
        
        // ثم بناء المستوى الأول (الأطفال بعائلات منفصلة)
        buildGenerationLevel(rootNode, relationships.oldestRoot, 0);
        
        console.log(`✅ تم بناء شجرة شاملة من الجد الأقدم:`);
        console.log(`   👤 الجذر: ${rootNode.name} - أطفال مباشرين: ${rootNode.children.length}`);
        
        // إحصائيات شاملة للشجرة المبنية
        const treeStats = {
          totalNodes: createdNodes.size,
          maxDepthReached: window.familyTreeMetrics?.maxDepthReached || 0,
          generationsCovered: relationships.ancestors.length + relationships.descendants.length + 1,
          ancestorGenerations: relationships.ancestors.length,
          descendantGenerations: relationships.descendants.length,
          lateralRelatives: relationships.siblings.length + relationships.uncles.length + relationships.cousins.length
        };
        
        // تحديث المتغيرات العامة للتتبع
        window.familyTreeMetrics = window.familyTreeMetrics || {};
        window.familyTreeMetrics.totalNodes = treeStats.totalNodes;
        window.familyTreeMetrics.actualMembersCount = treeStats.totalNodes; // العدد الفعلي للعقد
        
        console.log(`📊 إحصائيات الشجرة النهائية الشاملة:`);
        console.log(`   🔢 إجمالي العقد: ${treeStats.totalNodes}`);
        console.log(`   📏 أقصى عمق تم بناؤه: ${treeStats.maxDepthReached} جيل`);
        console.log(`   🌳 الأجيال المغطاة: ${treeStats.generationsCovered} جيل`);
        console.log(`   📈 أجيال الأجداد: ${treeStats.ancestorGenerations}`);
        console.log(`   📉 أجيال الأحفاد: ${treeStats.descendantGenerations}`);
        console.log(`   👥 الأقارب الجانبيون: ${treeStats.lateralRelatives}`);
        
        // طباعة معلومات التحديث العام
        console.log(`🌍 تحديث المتغيرات العامة:`);
        console.log(`   window.familyTreeMetrics.totalNodes = ${window.familyTreeMetrics.totalNodes}`);
        console.log(`   window.familyTreeMetrics.actualMembersCount = ${window.familyTreeMetrics.actualMembersCount}`);
        
        // تقييم كفاءة النظام
        if (treeStats.maxDepthReached >= 10) {
          console.log(`🏆 النظام يعمل بكفاءة عالية - شجرة عميقة (${treeStats.maxDepthReached} جيل)`);
        } else if (treeStats.maxDepthReached >= 5) {
          console.log(`✅ النظام يعمل بشكل جيد - شجرة متوسطة (${treeStats.maxDepthReached} جيل)`);
        } else {
          console.log(`ℹ️ شجرة بسيطة - العمق: ${treeStats.maxDepthReached} جيل`);
        }
        
        // عرض تنبيه للمستخدم حول حالة الشجرة
        if (treeStats.totalNodes >= 50) {
          console.log(`🎯 شجرة كبيرة: ${treeStats.totalNodes} عضو - أداء ممتاز!`);
        } else if (treeStats.totalNodes >= 20) {
          console.log(`👍 شجرة متوسطة: ${treeStats.totalNodes} عضو - أداء جيد`);
        } else {
          console.log(`📝 شجرة بسيطة: ${treeStats.totalNodes} عضو - يمكن إضافة المزيد`);
        }
        
        // طباعة تفاصيل الأطفال
        rootNode.children.forEach((child, index) => {
          console.log(`   👶 طفل ${index + 1}: ${child.name} (${child.attributes.actualRelation}) - أطفاله: ${child.children.length}`);
          child.children.forEach((grandchild, gcIndex) => {
            console.log(`      👶👶 حفيد ${gcIndex + 1}: ${grandchild.name} (${grandchild.attributes.actualRelation})`);
          });
        });
        
        return rootNode;
      }
      
      return buildComprehensiveTree();
    }
    
    // **السيناريو 1: يوجد أب وعم - إنشاء جد وهمي**
    if (relationships.directParent && relationships.uncles.length > 0) {
      
      const grandparentNode = {
        name: "الجد",
        id: "virtual_grandparent",
        avatar: null,
        attributes: {
          isCurrentUser: false,
          treeType: 'extended',
          isExtended: false,
          familyName: 'الجد',
          actualRelation: 'جد',
          relation: 'جد'
        },
        children: []
      };

      // إنشاء عقدة الأب بدون أطفال
      const parentNode = createPersonNodeWithoutChildren(relationships.directParent, 'الأب', 'أب');
      
      // إضافة المستخدم الحالي والإخوة تحت الأب
      const userNode = createPersonNodeWithoutChildren(currentUserFamily, 'أنت', 'ابن', true);
      
      // التحقق من أن المستخدم ليس هو نفسه الأب
      if (userNode.id !== parentNode.id) {
        parentNode.children.push(userNode);
      }
      
      relationships.siblings.forEach(sibling => {
        const siblingNode = createPersonNodeWithoutChildren(sibling, 'أخ', 'ابن');
        
        // تجنب إضافة الأخ إذا كان هو نفسه الأب أو المستخدم
        if (siblingNode.id !== parentNode.id && siblingNode.id !== userNode.id) {
          parentNode.children.push(siblingNode);
        }
      });

      // إضافة الأب تحت الجد
      grandparentNode.children.push(parentNode);
      
      // إضافة جميع الأعمام تحت الجد
      relationships.uncles.forEach((uncle, index) => {
        const uncleNode = createPersonNodeWithoutChildren(uncle, `العم ${index + 1}`, 'عم');
        
        // تجنب إضافة العم إذا كان هو نفسه الأب
        if (uncleNode.id !== parentNode.id) {
          grandparentNode.children.push(uncleNode);
          
          // إضافة أطفال العم
          addChildrenToNode(uncleNode, uncle);
        }
      });
      
      // إضافة أطفال كل عقدة من عائلتها المنفصلة
      addChildrenToNode(parentNode, relationships.directParent);
      
      if (userNode.id !== parentNode.id) {
        addChildrenToNode(userNode, currentUserFamily);
      }
      
      relationships.siblings.forEach((sibling) => {
        const siblingNode = parentNode.children.find(child => 
          child.id === (sibling.head.globalId || sibling.head.id)
        );
        if (siblingNode) {
          addChildrenToNode(siblingNode, sibling);
        }
      });

      return grandparentNode;
    }

    // **سيناريو 2: يوجد أب فقط - الأب هو الجذر**
    else if (relationships.directParent) {
      
      // إنشاء عقدة الأب بدون إضافة الأطفال تلقائياً
      const parentNode = createPersonNodeWithoutChildren(relationships.directParent, 'الأب', 'أب');
      
      // إضافة المستخدم الحالي والإخوة يدوياً
      const userNode = createPersonNodeWithoutChildren(currentUserFamily, 'أنت', 'ابن', true);
      
      // التحقق من أن المستخدم ليس هو نفسه الأب
      if (userNode.id !== parentNode.id) {
        parentNode.children.push(userNode);
      }
      
      relationships.siblings.forEach(sibling => {
        const siblingNode = createPersonNodeWithoutChildren(sibling, 'أخ', 'ابن');
        
        // تجنب إضافة الأخ إذا كان هو نفسه الأب أو المستخدم
        if (siblingNode.id !== parentNode.id && siblingNode.id !== userNode.id) {
          parentNode.children.push(siblingNode);
        }
      });

      // الآن فقط إضافة أطفال كل شخص من عائلاتهم المنفصلة
      // إضافة أطفال الأب من عائلته
      addChildrenToNode(parentNode, relationships.directParent);
      
      // إضافة أطفال المستخدم من عائلته
      if (userNode.id !== parentNode.id) {
        addChildrenToNode(userNode, currentUserFamily);
      }
      
      // إضافة أطفال الإخوة من عائلاتهم
      relationships.siblings.forEach((sibling) => {
        const siblingNode = parentNode.children.find(child => 
          child.id === (sibling.head.globalId || sibling.head.id)
        );
        if (siblingNode) {
          addChildrenToNode(siblingNode, sibling);
        }
      });

      return parentNode;
    }

    // **السيناريو 3: يوجد عم فقط - العم هو الجذر**
    else if (relationships.uncles.length > 0) {
      
      // إذا كان هناك عم واحد
      if (relationships.uncles.length === 1) {
        const uncleNode = createPersonNodeWithoutChildren(relationships.uncles[0], 'العم', 'عم');
        
        // إضافة المستخدم الحالي والإخوة كأبناء أخ
        const userNode = createPersonNodeWithoutChildren(currentUserFamily, 'أنت', 'ابن أخ', true);
        
        // التحقق من أن المستخدم ليس هو نفسه العم
        if (userNode.id !== uncleNode.id) {
          uncleNode.children.push(userNode);
        }
        
        relationships.siblings.forEach(sibling => {
          const siblingNode = createPersonNodeWithoutChildren(sibling, 'أخ', 'ابن أخ');
          
          // تجنب إضافة الأخ إذا كان هو نفسه العم أو المستخدم
          if (siblingNode.id !== uncleNode.id && siblingNode.id !== userNode.id) {
            uncleNode.children.push(siblingNode);
          }
        });

        // إضافة أطفال كل عقدة من عائلتها المنفصلة
        addChildrenToNode(uncleNode, relationships.uncles[0]);
        
        if (userNode.id !== uncleNode.id) {
          addChildrenToNode(userNode, currentUserFamily);
        }
        
        relationships.siblings.forEach((sibling) => {
          const siblingNode = uncleNode.children.find(child => 
            child.id === (sibling.head.globalId || sibling.head.id)
          );
          if (siblingNode) {
            addChildrenToNode(siblingNode, sibling);
          }
        });

        return uncleNode;
      } else {
        // عدة أعمام - إنشاء جذر وهمي
        const virtualRoot = {
          name: "عائلة الأعمام",
          id: "virtual_uncles_root",
          avatar: null,
          attributes: {
            isCurrentUser: false,
            treeType: 'extended',
            isExtended: false,
            familyName: 'عائلة الأعمام',
            actualRelation: 'جذر عائلي',
            relation: 'جذر عائلي'
          },
          children: []
        };
        
        // إضافة جميع الأعمام
        relationships.uncles.forEach((uncle, index) => {
          const uncleNode = createPersonNodeWithoutChildren(uncle, `العم ${index + 1}`, 'عم');
          virtualRoot.children.push(uncleNode);
          addChildrenToNode(uncleNode, uncle);
        });
        
        // إضافة المستخدم والإخوة تحت العم الأول
        if (relationships.uncles.length > 0) {
          const firstUncle = virtualRoot.children[0];
          const userNode = createPersonNodeWithoutChildren(currentUserFamily, 'أنت', 'ابن أخ', true);
          firstUncle.children.push(userNode);
          addChildrenToNode(userNode, currentUserFamily);
          
          relationships.siblings.forEach(sibling => {
            const siblingNode = createPersonNodeWithoutChildren(sibling, 'أخ', 'ابن أخ');
            firstUncle.children.push(siblingNode);
            addChildrenToNode(siblingNode, sibling);
          });
        }
        
        return virtualRoot;
      }
    }

    // **سيناريو 4: لا يوجد أب أو عم - التحقق من الحاجة للجذر الوهمي**
    else {
      console.log('⚠️ لا يوجد أب مباشر أو عم - تقييم الحاجة للجذر الوهمي');
      
      // إذا كان لديك إخوة أو أقارب آخرين، استخدم جذر وهمي
      if (relationships.siblings.length > 0 || relationships.cousins.length > 0 || relationships.others.length > 0) {
        console.log('🌳 إنشاء جذر وهمي بسبب وجود أقارب متعددين');
        
        const virtualRoot = {
          name: "العائلة",
          id: "virtual_family_root",
          avatar: null,
          attributes: {
            isCurrentUser: false,
            treeType: 'extended',
            isExtended: false,
            familyName: 'العائلة',
            actualRelation: 'جذر عائلي',
            relation: 'جذر عائلي'
          },
          children: []
        };

        // إضافة المستخدم الحالي
        const userNode = createPersonNodeWithoutChildren(currentUserFamily, 'أنت', 'رب عائلة', true);
        virtualRoot.children.push(userNode);

        // إضافة الإخوة بجانب المستخدم الحالي
        relationships.siblings.forEach(sibling => {
          const siblingNode = createPersonNodeWithoutChildren(sibling, 'أخ', 'رب عائلة');
          
          // تجنب إضافة الأخ إذا كان هو نفسه المستخدم
          if (siblingNode.id !== userNode.id) {
            virtualRoot.children.push(siblingNode);
          }
        });

        // إضافة أبناء العم بجانب الإخوة أيضاً
        relationships.cousins.forEach(cousin => {
          const cousinNode = createPersonNodeWithoutChildren(cousin, 'ابن عم', 'ابن عم');
          
          // تجنب التكرار
          if (!virtualRoot.children.some(child => child.id === cousinNode.id)) {
            virtualRoot.children.push(cousinNode);
          }
        });

        // إضافة الأقارب الآخرين
        relationships.others.forEach(otherRel => {
          const otherNode = createPersonNodeWithoutChildren(otherRel.family, 'قريب', 'قريب');
          
          // تجنب التكرار
          if (!virtualRoot.children.some(child => child.id === otherNode.id)) {
            virtualRoot.children.push(otherNode);
          }
        });

        // إضافة أطفال كل عقدة من عائلتها المنفصلة
        addChildrenToNode(userNode, currentUserFamily);
        
        relationships.siblings.forEach((sibling) => {
          const siblingNode = virtualRoot.children.find(child => 
            child.id === (sibling.head.globalId || sibling.head.id)
          );
          if (siblingNode) {
            addChildrenToNode(siblingNode, sibling);
          }
        });
        
        relationships.cousins.forEach((cousin) => {
          const cousinNode = virtualRoot.children.find(child => 
            child.id === (cousin.head.globalId || cousin.head.id)
          );
          if (cousinNode) {
            addChildrenToNode(cousinNode, cousin);
          }
        });
        
        relationships.others.forEach((otherRel) => {
          const otherNode = virtualRoot.children.find(child => 
            child.id === (otherRel.family.head.globalId || otherRel.family.head.id)
          );
          if (otherNode) {
            addChildrenToNode(otherNode, otherRel.family);
          }
        });

        return virtualRoot;
      } else {
        // لا توجد أقارب آخرين - أرجع المستخدم الحالي كجذر مباشر
        console.log('🎯 لا توجد أقارب - إرجاع المستخدم كجذر مباشر');
        const userNode = createPersonNodeWithoutChildren(currentUserFamily, 'أنت', 'رب العائلة', true);
        addChildrenToNode(userNode, currentUserFamily);
        return userNode;
      }
    }

  }, [buildFullName, mergePersonIdentities]);


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
      
      showSnackbar(`✅ تم تحميل عائلتك: ${familyMembers.length} أفراد (رب العائلة وأولاده)`, 'success');

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
    
    showSnackbar(`🏛️ تم تحميل ${allFamiliesData.length} عائلة بـ ${totalPersons} شخص في الشجرة الموسعة`, 'success');

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
      showSnackbar('🏛️ تحميل الشجرة الموسعة للقبيلة...', 'info');
      // تحميل الشجرة الموسعة فوراً
      if (!extendedTreeData) {
        loadExtendedTree();
      }
    } else {
      showSnackbar('🌳 تحويل للشجرة العادية (رب العائلة وأولاده)', 'info');
    }
  }, [showSnackbar, extendedTreeData, loadExtendedTree]);

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
  const name = nodeData.name || `${nodeData.firstName || ''} ${nodeData.fatherName || ''}`.trim() || 'غير محدد';
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
    if (isZoomedToNode) return; // لا تعيد التمركز إذا الكاميرا مقفلة على كارت
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
  }, 1200);

}, [showExtendedTree, handleNodeClick, searchQuery, isZoomedToNode]);

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
      if (!node) return null;
      
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
                <CircularProgress size={80} sx={{ color: showExtendedTree ? '#8b5cf6' : '#10b981', mb: 3 }} />
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
                      backgroundColor: showExtendedTree ? '#8b5cf6' : '#10b981'
                    }
                  }}
                />
                <Typography variant="body2" sx={{ color: showExtendedTree ? '#8b5cf6' : '#10b981', fontFamily: 'Cairo, sans-serif' }}>
                  {Math.round(loadingProgress)}% مكتمل
                </Typography>
              </Box>
            ) : (
              <Box textAlign="center">
                <AccountTreeIcon sx={{ fontSize: 120, color: showExtendedTree ? '#8b5cf6' : '#10b981', mb: 2 }} />
                <Typography variant="h4" sx={{ mb: 1, fontFamily: 'Cairo, sans-serif', color: showExtendedTree ? '#8b5cf6' : '#10b981' }}>
                  {showExtendedTree ? '🏛️ ابنِ شجرة قبيلتك الموسعة' : '🌳 ابنِ شجرة عائلتك'}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, maxWidth: 500, fontFamily: 'Cairo, sans-serif' }}>
                  {showExtendedTree 
                    ? '🔗 اربط عائلتك مع العائلات الأخرى لبناء شجرة قبيلة شاملة تضم جميع الأقارب والفروع'
                    : '👨‍👩‍👧‍👦 أضف أفراد عائلتك المباشرين: رب العائلة وأولاده وبناته'
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
                      borderColor: showExtendedTree ? '#8b5cf6' : '#10b981',
                      color: showExtendedTree ? '#8b5cf6' : '#10b981',
                      '&:hover': { 
                        borderColor: showExtendedTree ? '#7c3aed' : '#059669',
                        backgroundColor: showExtendedTree ? 'rgba(139, 92, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)'
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
            color: showExtendedTree ? '#8b5cf6' : '#10b981',
            fontWeight: 'bold',
            fontFamily: 'Cairo, sans-serif',
            transition: 'color 0.3s ease'
          }}
        >
          {showExtendedTree ? '🏛️ الشجرة الموسعة للقبيلة' : '🌳 شجرة عائلتك'}
        </Typography>
        
        {/* إضافة وصف توضيحي */}
        <Typography 
          variant="body2" 
          textAlign="center" 
          sx={{ 
            mb: 1, 
            color: 'text.secondary',
            fontFamily: 'Cairo, sans-serif',
            fontStyle: 'italic'
          }}
        >
          {showExtendedTree 
            ? '📊 عرض جميع العائلات المرتبطة في شجرة موحدة' 
            : '👨‍👩‍👧‍👦 رب العائلة وأولاده فقط'
          }
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
            onClick={() => navigate('/statistics')}  // ← التغيير هنا: الانتقال للصفحة المستقلة
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
                        setIsZoomedToNode(false); // إرجاع الكاميرا للوضع الافتراضي
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
                        // ابحث عن الـ node object المطابق في الشجرة
                        const treeData = showExtendedTree ? extendedTreeData : simpleTreeData;
                        let foundNode = null;
                        function findNode(node) {
                          if (!node) return null;
                          const name = node.name || node.attributes?.name || node.data?.name;
                          if (name === (result.node?.name || result.node?.attributes?.name || result.node?.data?.name)) {
                            foundNode = node;
                            return;
                          }
                          if (node.children && Array.isArray(node.children)) {
                            node.children.forEach(findNode);
                          }
                        }
                        findNode(treeData);
                        if (foundNode) {
                          searchZoomHook.zoomToPerson(foundNode);
                        }
                        setTimeout(() => {
                          setSearchQuery(result.node?.name || result.node?.attributes?.name || result.node?.data?.name || '');
                          setSearchResults([]);
                        }, 300);
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
                    color: '#8b5cf6',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#8b5cf6',
                  },
                }}
              />
            }
            label={
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" sx={{ fontFamily: 'Cairo, sans-serif', fontWeight: 'bold' }}>
                  {showExtendedTree ? '🏛️ الشجرة الموسعة (القبيلة)' : '🌳 الشجرة العادية (العائلة)'}
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'Cairo, sans-serif', color: 'text.secondary' }}>
                  {showExtendedTree ? 'جميع العائلات المرتبطة' : 'رب العائلة وأولاده فقط'}
                </Typography>
              </Box>
            }
          />
        </Box>

        {performanceMetrics.personCount > 0 && (
          <Box display="flex" justifyContent="center" gap={1} flexWrap="wrap">
            <Chip size="small" label={`👥 ${performanceMetrics.personCount}`} variant="outlined" />
            {showExtendedTree ? (
              <>
                {performanceMetrics.familyCount > 1 && (
                  <Chip size="small" label={`�️ ${performanceMetrics.familyCount} عائلة`} variant="outlined" color="secondary" />
                )}
                {linkedFamilies.length > 0 && (
                  <Chip size="small" label={`🔗 ${linkedFamilies.length} رابط`} variant="outlined" color="primary" />
                )}
                {performanceMetrics.maxDepthReached > 0 && (
                  <Chip size="small" label={`📊 ${performanceMetrics.maxDepthReached + 1} أجيال`} variant="outlined" color="info" />
                )}
              </>
            ) : (
              <Chip size="small" label={`🌳 شجرة بسيطة (جيلين)`} variant="outlined" color="success" />
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
              setExtendedTreeData(null);
              // تحديث قائمة العائلات المرتبطة
              loadLinkedFamilies();
              if (showExtendedTree) {
                loadExtendedTree();
              }
            }}
            existingLinks={linkedFamilies.map(link => link.targetFamilyUid)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedNode} onClose={() => setSelectedNode(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#1976d2', fontWeight: 'bold', fontFamily: 'Cairo, sans-serif' }}>
          {(selectedNode?.gender === 'female' || selectedNode?.relation === 'بنت') ? '♀️' : '♂️'} {selectedNode?.name || 'تفاصيل الشخص'}
        </DialogTitle>
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

