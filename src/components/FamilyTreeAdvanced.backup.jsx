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
    // التحقق من صحة معرف العائلة
    if (!familyUid || typeof familyUid !== 'string' || familyUid.trim().length === 0) {
      console.warn('معرف عائلة غير صحيح في loadFamilyData:', familyUid);
      return null;
    }
    
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

  // دالة مساعدة للتحقق من أن المستخدم ذكر
  const checkIfMaleUser = useCallback(async (userUid) => {
    try {
      // التحقق من صحة معرف المستخدم
      if (!userUid || typeof userUid !== 'string' || userUid.trim().length === 0) {
        console.warn('معرف مستخدم غير صحيح في checkIfMaleUser:', userUid);
        return false;
      }
      
      console.log(`🔍 فحص جنس المستخدم: ${userUid}`);
      
      const familySnapshot = await getDocs(collection(db, 'users', userUid, 'family'));
      
      // البحث عن رب العائلة
      for (const doc of familySnapshot.docs) {
        const memberData = doc.data();
        if (memberData.relation === 'رب العائلة') {
          // في النظام الذكوري، رب العائلة يجب أن يكون ذكر
          // يمكننا أيضاً التحقق من الجنس إذا كان متوفراً
          const isMale = memberData.gender === 'male' || 
                         memberData.gender === 'ذكر' ||
                         memberData.relation === 'رب العائلة'; // افتراض أن رب العائلة ذكر
          
          console.log(`👤 رب العائلة ${userUid}:`, {
            name: memberData.firstName,
            gender: memberData.gender,
            relation: memberData.relation,
            isMale
          });
          
          return isMale;
        }
      }
      
      // إذا لم يجد رب عائلة، البحث عن أي عضو ذكر
      for (const doc of familySnapshot.docs) {
        const memberData = doc.data();
        if (memberData.relation === 'ابن' || 
            memberData.gender === 'male' || 
            memberData.gender === 'ذكر') {
          console.log(`👤 عضو ذكر في العائلة ${userUid}:`, {
            name: memberData.firstName,
            gender: memberData.gender,
            relation: memberData.relation
          });
          return true;
        }
      }
      
      console.log(`❌ لا يوجد ذكور في العائلة ${userUid}`);
      return false; // إذا لم يجد أي ذكر
    } catch (error) {
      console.warn(`تعذر التحقق من جنس المستخدم ${userUid}:`, error);
      return false;
    }
  }, []);

  const findAllLinkedFamilies = useCallback(async (startUid) => {
    try {
      const linkedFamilyUids = new Set([startUid]);
      const processedUids = new Set(); // منع التكرار في البحث
      const foundLinks = []; // لتتبع الروابط المكتشفة
      
      console.log('🔍 بدء البحث المبسط عن العائلات المرتبطة للمستخدم:', startUid);
      
      // تحميل جميع بيانات المستخدمين مرة واحدة
      const allUsersSnapshot = await getDocs(collection(db, 'users'));
      const allUsersData = new Map();
      
      for (const userDoc of allUsersSnapshot.docs) {
        allUsersData.set(userDoc.id, userDoc.data());
      }
      
      console.log(`� تم تحميل ${allUsersData.size} مستخدم للتحليل`);
      
      // دالة للبحث في شبكة الروابط
      const exploreConnections = async (currentUid, depth = 0) => {
        if (depth >= 3 || processedUids.has(currentUid)) return;
        processedUids.add(currentUid);
        
        const userData = allUsersData.get(currentUid);
        if (!userData) return;
        
        console.log(`🔍 استكشاف الروابط (عمق ${depth}) للمستخدم: ${currentUid}`);
        
        // فحص الروابط المباشرة من linkedFamilies
        if (userData.linkedFamilies && Array.isArray(userData.linkedFamilies)) {
          for (const link of userData.linkedFamilies) {
            const targetId = link.targetFamilyUid || link.targetUid;
            if (targetId && allUsersData.has(targetId) && !linkedFamilyUids.has(targetId)) {
              
              // التحقق من أن العائلة المستهدفة ذكورية
              const isTargetMale = await checkIfMaleUser(targetId);
              if (isTargetMale) {
                linkedFamilyUids.add(targetId);
                foundLinks.push({
                  from: currentUid,
                  to: targetId,
                  relation: link.relation || link.linkType || 'غير محدد',
                  depth: depth,
                  type: 'direct'
                });
                console.log(`✅ عائلة مكتشفة (عمق ${depth}): ${targetId} - العلاقة: ${link.relation || link.linkType}`);
                
                // البحث التوسعي من العائلة الجديدة
                await exploreConnections(targetId, depth + 1);
              }
            }
          }
        }
        
        // فحص linkedToFamilyHead
        if (userData.linkedToFamilyHead && !linkedFamilyUids.has(userData.linkedToFamilyHead)) {
          const isParentMale = await checkIfMaleUser(userData.linkedToFamilyHead);
          if (isParentMale) {
            linkedFamilyUids.add(userData.linkedToFamilyHead);
            foundLinks.push({
              from: currentUid,
              to: userData.linkedToFamilyHead,
              relation: 'linkedToFamilyHead',
              depth: depth,
              type: 'parent'
            });
            console.log(`✅ رابط أب مكتشف (عمق ${depth}): ${userData.linkedToFamilyHead}`);
            
            await exploreConnections(userData.linkedToFamilyHead, depth + 1);
          }
        }
      };
      
      // البحث عن الروابط المعكوسة
      const findReverseLinks = async () => {
        console.log('� البحث عن الروابط المعكوسة...');
        let foundCount = 0;
        
        for (const [userId, userData] of allUsersData) {
          if (userId === startUid || linkedFamilyUids.has(userId)) continue;
          
          // التحقق من أن المستخدم ذكر
          const isMale = await checkIfMaleUser(userId);
          if (!isMale) continue;
          
          let foundReverseLink = false;
          
          // فحص linkedToFamilyHead معكوس
          if (userData.linkedToFamilyHead === startUid) {
            linkedFamilyUids.add(userId);
            foundLinks.push({
              from: userId,
              to: startUid,
              relation: 'linkedToFamilyHead معكوس',
              depth: 0,
              type: 'reverse'
            });
            foundReverseLink = true;
            console.log(`🔗 رابط معكوس (linkedToFamilyHead): ${userId} → ${startUid}`);
          }
          
          // فحص linkedFamilies معكوس
          if (userData.linkedFamilies && Array.isArray(userData.linkedFamilies)) {
            for (const link of userData.linkedFamilies) {
              const targetId = link.targetFamilyUid || link.targetUid;
              if (targetId === startUid) {
                if (!linkedFamilyUids.has(userId)) {
                  linkedFamilyUids.add(userId);
                  foundLinks.push({
                    from: userId,
                    to: startUid,
                    relation: link.relation || link.linkType || 'غير محدد',
                    depth: 0,
                    type: 'reverse'
                  });
                  foundReverseLink = true;
                  console.log(`🔗 رابط معكوس (linkedFamilies): ${userId} → ${startUid} (${link.relation || link.linkType})`);
                }
              }
            }
          }
          
          // فحص الروابط لجميع العائلات المكتشفة
          for (const discoveredFamily of linkedFamilyUids) {
            if (userData.linkedFamilies && Array.isArray(userData.linkedFamilies)) {
              for (const link of userData.linkedFamilies) {
                const targetId = link.targetFamilyUid || link.targetUid;
                if (targetId === discoveredFamily && !linkedFamilyUids.has(userId)) {
                  linkedFamilyUids.add(userId);
                  foundLinks.push({
                    from: userId,
                    to: discoveredFamily,
                    relation: link.relation || link.linkType || 'غير محدد',
                    depth: 1,
                    type: 'indirect'
                  });
                  foundReverseLink = true;
                  console.log(`🌐 رابط غير مباشر: ${userId} → ${discoveredFamily} (${link.relation || link.linkType})`);
                }
              }
            }
          }
          
          if (foundReverseLink) foundCount++;
        }
        
        console.log(`📈 تم العثور على ${foundCount} رابط معكوس/غير مباشر`);
      };
      
      // تسلسل البحث
      console.log('🚀 بدء البحث من المستخدم الرئيسي...');
      await exploreConnections(startUid, 0);
      
      console.log('🔄 البحث عن الروابط المعكوسة...');
      await findReverseLinks();
      
      console.log('🌐 البحث التوسعي من العائلات المكتشفة...');
      const currentFamilies = Array.from(linkedFamilyUids);
      for (const familyUid of currentFamilies) {
        if (familyUid !== startUid) {
          await exploreConnections(familyUid, 1);
        }
      }
      
      // إعادة البحث المعكوس للعائلات الجديدة
      console.log('🔄 إعادة البحث المعكوس للعائلات الجديدة...');
      await findReverseLinks();
      
      // 🆕 البحث الإضافي عن جميع المستخدمين الذكور (تأكد من عدم فقدان أي عائلة)
      console.log('🔍 البحث النهائي عن جميع الذكور المرتبطين بالشبكة...');
      for (const [userId, userData] of allUsersData) {
        if (!linkedFamilyUids.has(userId)) {
          const isMale = await checkIfMaleUser(userId);
          if (isMale) {
            // فحص إذا كان هذا المستخدم مرتبط بأي من العائلات المكتشفة
            let hasConnectionToNetwork = false;
            
            // فحص الروابط المباشرة
            if (userData.linkedFamilies && Array.isArray(userData.linkedFamilies)) {
              for (const link of userData.linkedFamilies) {
                const targetId = link.targetFamilyUid || link.targetUid;
                if (linkedFamilyUids.has(targetId)) {
                  hasConnectionToNetwork = true;
                  break;
                }
              }
            }
            
            // فحص linkedToFamilyHead
            if (userData.linkedToFamilyHead && linkedFamilyUids.has(userData.linkedToFamilyHead)) {
              hasConnectionToNetwork = true;
            }
            
            // فحص الروابط المعكوسة (من العائلات المكتشفة إليه)
            for (const familyUid of linkedFamilyUids) {
              const familyData = allUsersData.get(familyUid);
              if (familyData) {
                if (familyData.linkedToFamilyHead === userId) {
                  hasConnectionToNetwork = true;
                  break;
                }
                if (familyData.linkedFamilies && Array.isArray(familyData.linkedFamilies)) {
                  for (const link of familyData.linkedFamilies) {
                    const targetId = link.targetFamilyUid || link.targetUid;
                    if (targetId === userId) {
                      hasConnectionToNetwork = true;
                      break;
                    }
                  }
                }
              }
              if (hasConnectionToNetwork) break;
            }
            
            if (hasConnectionToNetwork) {
              linkedFamilyUids.add(userId);
              foundLinks.push({
                from: 'network',
                to: userId,
                relation: 'network_discovery',
                depth: 2,
                type: 'final_sweep'
              });
              console.log(`🆕 اكتشف عائلة إضافية في البحث النهائي: ${userId}`);
            }
          }
        }
      }
      
      const result = Array.from(linkedFamilyUids);
      
      // 🔍 تسجيل دقيق للعائلة الثالثة المفقودة
      console.log('🔍 فحص العائلة الثالثة المفقودة:');
      console.log('🔹 Set linkedFamilyUids حالياً:', Array.from(linkedFamilyUids));
      console.log('🔹 هل العائلة الثالثة في Set؟', linkedFamilyUids.has('zsL0ZrJNpsdBMNv2tS2LgمRdqZ93'));
      console.log('🔹 Array النهائي:', result);
      console.log('🔹 هل العائلة الثالثة في Array؟', result.includes('zsL0ZrJNpsdBMNv2tS2LgمRdqZ93'));
      
      console.log('🏆 نتائج البحث المبسط في findAllLinkedFamilies:', {
        startUid,
        foundFamilies: result,
        totalCount: result.length,
        totalUsersScanned: allUsersData.size,
        foundLinksCount: foundLinks.length,
        linksByType: {
          direct: foundLinks.filter(l => l.type === 'direct').length,
          reverse: foundLinks.filter(l => l.type === 'reverse').length,
          indirect: foundLinks.filter(l => l.type === 'indirect').length,
          parent: foundLinks.filter(l => l.type === 'parent').length
        }
      });
      
      // تفاصيل العائلات المكتشفة
      console.log('📋 تفاصيل العائلات المكتشفة:');
      result.forEach((familyId, index) => {
        const relatedLinks = foundLinks.filter(l => l.to === familyId || l.from === familyId);
        console.log(`${index + 1}. ${familyId} - روابط: ${relatedLinks.length}`, relatedLinks.map(l => `${l.from}→${l.to} (${l.relation})`));
      });
      
      return result;
      
    } catch (error) {
      console.error('خطأ في البحث المبسط عن العائلات المرتبطة:', error);
      return [startUid]; // إرجاع العائلة الحالية فقط في حالة الخطأ
    }
  }, [checkIfMaleUser]);

  // بناء شجرة النسب المستمرة عبر الأجيال (النظام الأبوي)
  const buildExtendedTreeStructure = useCallback((allFamiliesData, rootFamilyUid) => {
    if (!allFamiliesData || allFamiliesData.length === 0) {
      return null;
    }

    console.log('🏗️ بناء شجرة النسب المستمرة عبر الأجيال:', {
      totalFamilies: allFamiliesData.length,
      allFamilyHeads: allFamiliesData.map(f => ({
        uid: f.uid,
        name: f.head?.firstName,
        fatherName: f.head?.fatherName
      }))
    });

    // خريطة لجميع الأشخاص الذكور مع معلومات أجدادهم
    const malePersonsMap = new Map();
    
    // جمع جميع الذكور من كل العائلات
    allFamiliesData.forEach(family => {
      family.members.forEach(member => {
        if (member.relation === 'رب العائلة' || member.relation === 'ابن') {
          const personKey = `${member.firstName}_${member.fatherName}_${member.surname}`;
          malePersonsMap.set(personKey, {
            ...member,
            familyUid: family.uid,
            isCurrentUser: family.uid === rootFamilyUid && member.relation === 'رب العائلة'
          });
        }
      });
    });

    console.log('👥 الذكور المكتشفون:', Array.from(malePersonsMap.keys()));

    // دالة للعثور على الأب لشخص معين
    const findFather = (person) => {
      if (!person.fatherName) return null;
      
      // البحث عن شخص اسمه الأول = اسم أبي الشخص الحالي
      for (const [key, candidate] of malePersonsMap) {
        if (candidate.firstName === person.fatherName) {
          // تحقق إضافي: هل الجد متطابق؟
          if (person.grandfatherName && candidate.fatherName) {
            if (candidate.fatherName === person.grandfatherName) {
              return candidate;
            }
          } else if (!person.grandfatherName || !candidate.fatherName) {
            // إذا لم تكن معلومات الجد متوفرة، نعتمد على الاسم فقط
            return candidate;
          }
        }
      }
      return null;
    };

    // إنشاء خريطة العلاقات الأبوية
    const parentChildMap = new Map();
    const childParentMap = new Map();
    
    malePersonsMap.forEach((person, key) => {
      const father = findFather(person);
      if (father) {
        const fatherKey = `${father.firstName}_${father.fatherName}_${father.surname}`;
        
        // إضافة الطفل للأب
        if (!parentChildMap.has(fatherKey)) {
          parentChildMap.set(fatherKey, []);
        }
        parentChildMap.get(fatherKey).push(person);
        
        // إضافة الأب للطفل
        childParentMap.set(key, father);
        
        console.log(`� علاقة أبوية: ${father.firstName} ← ${person.firstName}`);
      }
    });

    // العثور على الجذر (أقدم جد - ليس له أب في النظام)
    let rootPerson = null;
    const currentUser = Array.from(malePersonsMap.values()).find(p => p.isCurrentUser);
    
    if (currentUser) {
      // البحث عن أقدم جد للمستخدم الحالي
      let ancestor = currentUser;
      let generation = 0;
      const maxGenerations = 10; // منع الحلقة اللانهائية
      
      while (generation < maxGenerations) {
        const ancestorKey = `${ancestor.firstName}_${ancestor.fatherName}_${ancestor.surname}`;
        const parent = childParentMap.get(ancestorKey);
        
        if (!parent) {
          rootPerson = ancestor;
          break;
        }
        ancestor = parent;
        generation++;
      }
    }

    // إذا لم نجد جذر من المستخدم الحالي، نأخذ أي شخص ليس له أب
    if (!rootPerson) {
      for (const [key, person] of malePersonsMap) {
        if (!childParentMap.has(key)) {
          rootPerson = person;
          break;
        }
      }
    }

    if (!rootPerson) {
      console.warn('⚠️ لم يتم العثور على جذر للشجرة');
      return null;
    }

    console.log('🌳 جذر الشجرة:', rootPerson.firstName);

    // دالة لبناء العقدة مع أطفالها
    const buildNode = (person, depth = 0, maxDepth = 10) => {
      if (depth > maxDepth) return null; // منع العمق المفرط
      
      const personKey = `${person.firstName}_${person.fatherName}_${person.surname}`;
      const children = parentChildMap.get(personKey) || [];
      
      const node = {
        name: `${person.firstName} ${person.fatherName || ''}`.trim(),
        id: person.globalId || personKey,
        avatar: person.avatar || null,
        attributes: {
          ...person,
          treeType: 'extended',
          generation: depth,
          actualRelation: depth === 0 ? 'الجد الأكبر' : 
                          person.isCurrentUser ? 'أنت' : 
                          `الجيل ${depth}`
        },
        children: []
      };

      // إضافة الأطفال الذكور
      children.forEach(child => {
        const childNode = buildNode(child, depth + 1, maxDepth);
        if (childNode) {
          node.children.push(childNode);
        }
      });

      // إضافة البنات كأوراق نهائية (إذا وجدن في نفس العائلة)
      const fatherFamily = allFamiliesData.find(f => f.uid === person.familyUid);
      if (fatherFamily) {
        const daughters = fatherFamily.members.filter(m => 
          m.relation === 'بنت' && 
          m.fatherName === person.firstName
        );
        
        daughters.forEach(daughter => {
          node.children.push({
            name: `${daughter.firstName} ${daughter.fatherName || ''}`.trim(),
            id: daughter.globalId || `${daughter.firstName}_daughter`,
            avatar: daughter.avatar || null,
            attributes: {
              ...daughter,
              treeType: 'extended',
              generation: depth + 1,
              actualRelation: 'ابنة',
              canContinue: false // البنات لا يستمرن
            },
            children: []
          });
        });
      }

      return node;
    };

    const treeRoot = buildNode(rootPerson);
    
    if (treeRoot) {
      console.log('✅ تم بناء شجرة النسب بنجاح');
      console.log('📊 إحصائيات الشجرة:', {
        rootName: rootPerson.firstName,
        totalPersons: malePersonsMap.size,
        parentChildRelations: parentChildMap.size
      });
    }

    return treeRoot;
  }, [buildFullName]);

  // ===========================================================================
  // دوال التحميل الرئيسية
  // ===========================================================================

  const loadSimpleTree = useCallback(async () => {
                
              case 'cousin':
                if (!processedPersons.has(linkedFamily.head.globalId)) {
                  relationships.cousins.push(linkedFamily);
                  processedPersons.add(linkedFamily.head.globalId);
                  console.log('✅ تم إضافة ابن عم:', linkedFamily.head.firstName);
                }
                break;
                
              case 'extended': {
                // تحديد إذا كان عم أم قريب عادي
                const isUncle = link.relationDescription?.includes('عم') || 
                              link.relationDescription?.includes('uncle') ||
                              linkedFamily.head.surname === currentUserFamily.head.surname;
                
                if (isUncle && !relationships.uncle && !processedPersons.has(linkedFamily.head.globalId)) {
                  relationships.uncle = linkedFamily;
                  processedPersons.add(linkedFamily.head.globalId);
                  console.log('✅ تم تعيين العم:', linkedFamily.head.firstName);
                } else if (!processedPersons.has(linkedFamily.head.globalId)) {
                  relationships.others.push({family: linkedFamily, type: 'extended'});
                  processedPersons.add(linkedFamily.head.globalId);
                  console.log('✅ تم إضافة قريب آخر:', linkedFamily.head.firstName);
                }
                break;
              }
              default:
                // للروابط الأخرى، نحاول تخمين النوع من خلال الوصف
                if (!processedPersons.has(linkedFamily.head.globalId)) {
                  const description = link.relationDescription?.toLowerCase() || '';
                  
                  if (description.includes('أب') || description.includes('والد')) {
                    if (!relationships.directParent) {
                      relationships.directParent = linkedFamily;
                      processedPersons.add(linkedFamily.head.globalId);
                      console.log('✅ تم تعيين الأب (من الوصف):', linkedFamily.head.firstName);
                    }
                  } else if (description.includes('أخ') || description.includes('شقيق')) {
                    relationships.siblings.push(linkedFamily);
                    processedPersons.add(linkedFamily.head.globalId);
                    console.log('✅ تم إضافة أخ (من الوصف):', linkedFamily.head.firstName);
                  } else if (description.includes('عم')) {
                    if (!relationships.uncle) {
                      relationships.uncle = linkedFamily;
                      processedPersons.add(linkedFamily.head.globalId);
                      console.log('✅ تم تعيين العم (من الوصف):', linkedFamily.head.firstName);
                    }
                  } else if (description.includes('ابن عم') || description.includes('ابن العم')) {
                    relationships.cousins.push(linkedFamily);
                    processedPersons.add(linkedFamily.head.globalId);
                    console.log('✅ تم إضافة ابن عم (من الوصف):', linkedFamily.head.firstName);
                  } else {
                    // إذا لم نستطع تحديد النوع، نضعه في الإخوة افتراضياً
                    relationships.siblings.push(linkedFamily);
                    processedPersons.add(linkedFamily.head.globalId);
                    console.log('✅ تم إضافة كأخ (افتراضي):', linkedFamily.head.firstName);
                  }
                }
            }
          }
        }
      });
    }

    // فحص العائلات التي لم تُربط بعد (قد تكون مرتبطة من جهتها)
    allFamiliesData.forEach(family => {
      if (family.uid !== rootFamilyUid && !processedPersons.has(family.head?.globalId)) {
        // فحص إذا كانت هذه العائلة مرتبطة بك من جهتها
        if (family.userData?.linkedFamilies && Array.isArray(family.userData.linkedFamilies)) {
          const linkToMe = family.userData.linkedFamilies.find(link => {
            const targetId = link.targetFamilyUid || link.targetUid;
            return link && targetId && targetId === rootFamilyUid;
          });
          if (linkToMe) {
            console.log('🔗 رابط معكوس من:', family.head.firstName, 'نوع الرابط:', linkToMe.linkType);
            
            // تعيين العلاقة المعكوسة
            if ((linkToMe.linkType === 'child-parent' || linkToMe.linkType === 'parent-child') && !relationships.directParent) {
              // إذا كان الرابط من نوع parent-child، فهذا يعني أن العائلة الأخرى هي الوالد
              relationships.directParent = family;
              processedPersons.add(family.head.globalId);
              console.log('✅ تم تعيين الأب (رابط معكوس):', family.head.firstName);
            } else if (linkToMe.linkType === 'sibling') {
              relationships.siblings.push(family);
              processedPersons.add(family.head.globalId);
              console.log('✅ تم إضافة أخ (رابط معكوس):', family.head.firstName);
            } else if (!processedPersons.has(family.head.globalId)) {
              // إضافة باقي العائلات كإخوة افتراضياً
              relationships.siblings.push(family);
              processedPersons.add(family.head.globalId);
              console.log('✅ تم إضافة كأخ (رابط معكوس افتراضي):', family.head.firstName);
            }
          }
        } else if (!processedPersons.has(family.head?.globalId)) {
          // إذا لم يكن هناك رابط واضح، نضع العائلة كأخ افتراضياً
          relationships.siblings.push(family);
          processedPersons.add(family.head.globalId);
          console.log('✅ تم إضافة كأخ (بدون رابط واضح):', family.head.firstName);
        }
      }
    });

    console.log('📊 نتائج تحليل العلاقات:', {
      directParent: relationships.directParent?.head?.firstName || 'لا يوجد',
      uncle: relationships.uncle?.head?.firstName || 'لا يوجد',
      siblings: relationships.siblings.map(s => s.head?.firstName || 'غير محدد'),
      cousins: relationships.cousins.map(c => c.head?.firstName || 'غير محدد'),
      others: relationships.others.map(o => o.family?.head?.firstName || 'غير محدد')
    });

    // دالة مساعدة لإنشاء عقدة شخص مع أطفاله (الذكور فقط يستمرون)
    function createPersonNode(familyData, familyLabel, relationLabel, isCurrentUser = false) {
      if (processedPersons.has(familyData.head.globalId) && !isCurrentUser) {
        return null; // منع التكرار
      }
      
      if (!isCurrentUser) {
        processedPersons.add(familyData.head.globalId);
      }

      const node = {
        name: buildFullName(familyData.head),
        id: familyData.head.globalId,
        avatar: familyData.head.avatar || null,
        attributes: {
          ...familyData.head,
          isCurrentUser,
          treeType: 'extended',
          isExtended: !isCurrentUser,
          familyName: familyLabel,
          actualRelation: relationLabel
        },
        children: []
      };

      // إضافة أطفال هذا الشخص (الذكور فقط يستمرون في الشجرة)
      const maleChildren = familyData.members.filter(m => 
        (m.relation === 'ابن') && // الذكور فقط
        m.globalId !== familyData.head.globalId &&
        !processedPersons.has(m.globalId)
      );

      // إضافة البنات كأوراق (لا يستمرن في الشجرة)
      const femaleChildren = familyData.members.filter(m => 
        (m.relation === 'بنت') && 
        m.globalId !== familyData.head.globalId &&
        !processedPersons.has(m.globalId)
      );

      // الذكور يستمرون في بناء الشجرة
      maleChildren.forEach(child => {
        processedPersons.add(child.globalId);
        node.children.push({
          name: buildFullName(child),
          id: child.globalId,
          avatar: child.avatar || null,
          attributes: {
            ...child,
            isCurrentUser: false,
            treeType: 'extended',
            isExtended: !isCurrentUser,
            familyName: `أطفال ${familyLabel}`,
            actualRelation: child.relation,
            canContinue: true // الذكور يمكنهم الاستمرار
          },
          children: [] // سيتم ملؤها لاحقاً إذا كان لديه عائلة
        });
      });

      // البنات كأوراق نهائية
      femaleChildren.forEach(child => {
        processedPersons.add(child.globalId);
        node.children.push({
          name: buildFullName(child),
          id: child.globalId,
          avatar: child.avatar || null,
          attributes: {
            ...child,
            isCurrentUser: false,
            treeType: 'extended',
            isExtended: !isCurrentUser,
            familyName: `أطفال ${familyLabel}`,
            actualRelation: child.relation,
            canContinue: false // البنات لا يستمرن في الشجرة
          },
          children: [] // البنات لا يستمرن
        });
      });

      return node;
    }

    // **سيناريو 1: يوجد أب وعم - إنشاء جد وهمي**
    if (relationships.directParent && relationships.uncle) {
      
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

      // إنشاء عقدة الأب
      const parentNode = createPersonNode(relationships.directParent, 'الأب', 'الأب');
      
      if (parentNode) {
        // إضافة المستخدم الحالي والإخوة تحت الأب
        const userNode = createPersonNode(currentUserFamily, 'أنت', 'ابن', true);
        if (userNode) {
          parentNode.children.push(userNode);
        }
        
        relationships.siblings.forEach(sibling => {
          const siblingNode = createPersonNode(sibling, 'أخ', 'أخ');
          if (siblingNode) {
            parentNode.children.push(siblingNode);
          }
        });

        // إضافة الأب والعم تحت الجد
        grandparentNode.children.push(parentNode);
      }
      
      const uncleNode = createPersonNode(relationships.uncle, 'العم', 'عم');
      if (uncleNode) {
        grandparentNode.children.push(uncleNode);
      }

      return grandparentNode;
    }

    // **سيناريو 2: يوجد أب فقط - الأب هو الجذر**
    else if (relationships.directParent) {
      
      const parentNode = createPersonNode(relationships.directParent, 'الأب', 'الأب');
      
      if (parentNode) {
        // إضافة المستخدم الحالي والإخوة
        const userNode = createPersonNode(currentUserFamily, 'أنت', 'ابن', true);
        if (userNode) {
          parentNode.children.push(userNode);
        }
        
        relationships.siblings.forEach(sibling => {
          const siblingNode = createPersonNode(sibling, 'أخ', 'أخ');
          if (siblingNode) {
            parentNode.children.push(siblingNode);
          }
        });
      }

      return parentNode;
    }

    // **سيناريو 3: يوجد عم فقط - العم هو الجذر**
    else if (relationships.uncle) {
      
      const uncleNode = createPersonNode(relationships.uncle, 'العم', 'عم');
      
      if (uncleNode) {
        // إضافة المستخدم الحالي والإخوة كأبناء أخ
        const userNode = createPersonNode(currentUserFamily, 'أنت', 'ابن أخ', true);
        if (userNode) {
          uncleNode.children.push(userNode);
        }
        
        relationships.siblings.forEach(sibling => {
          const siblingNode = createPersonNode(sibling, 'أخ', 'ابن أخ');
          if (siblingNode) {
            uncleNode.children.push(siblingNode);
          }
        });
      }

      return uncleNode;
    }

    // **سيناريو 4: لا يوجد أب أو عم - جذر وهمي مع الإخوة بجانب بعض**
    else {
      
      const virtualRoot = {
        name: "العائلة",
        id: "virtual_family_root",
        avatar: null,
        attributes: {
          isCurrentUser: false,
          treeType: 'extended',
          isExtended: false,
          familyName: 'العائلة',
          actualRelation: 'جذر غير محدد',
          relation: 'جذر غير محدد'
        },
        children: []
      };

      // إضافة المستخدم الحالي
      const userNode = createPersonNode(currentUserFamily, 'أنت', 'رب عائلة', true);
      if (userNode) {
        virtualRoot.children.push(userNode);
      }

      // إضافة الإخوة بجانب المستخدم الحالي
      relationships.siblings.forEach(sibling => {
        const siblingNode = createPersonNode(sibling, 'أخ', 'رب عائلة');
        if (siblingNode) {
          virtualRoot.children.push(siblingNode);
        }
      });

      // إضافة أبناء العم بجانب الإخوة أيضاً
      relationships.cousins.forEach(cousin => {
        const cousinNode = createPersonNode(cousin, 'ابن عم', 'ابن عم');
        if (cousinNode) {
          virtualRoot.children.push(cousinNode);
        }
      });

      // إضافة الأقارب الآخرين
      relationships.others.forEach(otherRel => {
        const otherNode = createPersonNode(otherRel.family, 'قريب', 'قريب');
        if (otherNode) {
          virtualRoot.children.push(otherNode);
        }
      });

      return virtualRoot;
    }

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

  // دالة للبحث عن عائلة منفصلة لشخص معين
  const findSeparateFamilyForPerson = useCallback(async (personNode, allFamiliesData) => {
    const personName = personNode.name;
    const personFirstName = personNode.attributes?.firstName;
    const personFatherName = personNode.attributes?.fatherName;
    
    // البحث في العائلات المحملة عن عائلة يكون فيها هذا الشخص رب عائلة
    return allFamiliesData.find(family => {
      if (family.head && family.head.relation === 'رب العائلة') {
        const headFullName = buildFullName(family.head);
        return (
          headFullName === personName ||
          (family.head.firstName === personFirstName && family.head.fatherName === personFatherName)
        );
      }
      return false;
    });
  }, [buildFullName]);

  // دالة لربط الأطفال الذكور بعائلاتهم المنفصلة
  const linkMaleChildrenToTheirFamilies = useCallback(async (treeNode, allFamiliesData) => {
    if (!treeNode || !treeNode.children) return;

    // مرور عبر جميع العقد في الشجرة
    const processNode = async (node) => {
      if (node.children && node.children.length > 0) {
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          
          // إذا كان الطفل ذكر (ابن) ويمكنه الاستمرار
          if (child.attributes?.relation === 'ابن' && child.attributes?.canContinue) {
            // البحث عن عائلة منفصلة لهذا الشخص
            const separateFamily = await findSeparateFamilyForPerson(child, allFamiliesData);
            
            if (separateFamily && separateFamily.members.length > 1) {
              // إضافة أطفال هذا الشخص من عائلته المنفصلة
              const grandchildren = separateFamily.members.filter(m => 
                (m.relation === 'ابن' || m.relation === 'بنت') && 
                m.globalId !== separateFamily.head.globalId
              );
              
              grandchildren.forEach(grandchild => {
                child.children.push({
                  name: buildFullName(grandchild),
                  id: grandchild.globalId,
                  avatar: grandchild.avatar || null,
                  attributes: {
                    ...grandchild,
                    isCurrentUser: false,
                    treeType: 'extended',
                    isExtended: true,
                    familyName: `أطفال ${child.attributes.familyName}`,
                    actualRelation: grandchild.relation,
                    canContinue: grandchild.relation === 'ابن' // الذكور فقط
                  },
                  children: []
                });
              });
            }
          }
          
          // المرور عبر أطفال هذا العقدة
          await processNode(child);
        }
      }
    };

    await processNode(treeNode);
  }, [buildFullName, findSeparateFamilyForPerson]);

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
    
    console.log('🔗 العائلات المرتبطة الموجودة:', allLinkedFamilies);
    
    // الخطوة 3: تحميل بيانات جميع العائلات
    setLoadingProgress(50);
    setLoadingStage('🏠 تحميل بيانات العائلات...');
    const allFamiliesData = [];
    const uniqueFamilyUids = new Set(); // منع تكرار العائلات
    
    console.log('📊 بدء تحميل بيانات العائلات:', {
      totalFamiliesToLoad: allLinkedFamilies.length,
      familyUids: allLinkedFamilies
    });
    
    // إضافة عائلتك
    if (myFamilyData && myFamilyData.members.length > 0) {
      allFamiliesData.push(myFamilyData);
      uniqueFamilyUids.add(uid);
    }
    
    // إضافة العائلات المرتبطة (مع منع التكرار)
    for (const familyUid of allLinkedFamilies) {
      // 🔍 تسجيل دقيق لكل عائلة
      console.log(`🔍 معالجة العائلة: ${familyUid}`);
      
      // التحقق من صحة معرف العائلة قبل معالجته
      if (!familyUid || typeof familyUid !== 'string' || familyUid.length === 0) {
        console.warn('تجاهل معرف عائلة غير صحيح:', familyUid);
        continue;
      }
      
      if (familyUid !== uid && !uniqueFamilyUids.has(familyUid)) {
        console.log(`🔄 محاولة تحميل العائلة: ${familyUid}`);
        try {
          const familyData = await loadFamilyData(familyUid);
          if (familyData && familyData.members.length > 0) {
            // التحقق من عدم وجود نفس الأشخاص في عائلات أخرى
            const isUniqueFamilyHead = !allFamiliesData.some(existingFamily => 
              existingFamily.head.firstName === familyData.head.firstName &&
              existingFamily.head.fatherName === familyData.head.fatherName &&
              existingFamily.head.surname === familyData.head.surname
            );
            
            console.log('🔍 فحص تكرار العائلة:', {
              familyUid,
              headName: `${familyData.head.firstName} ${familyData.head.fatherName} ${familyData.head.surname}`,
              isUnique: isUniqueFamilyHead,
              existingFamilies: allFamiliesData.map(f => `${f.head.firstName} ${f.head.fatherName} ${f.head.surname}`)
            });
            
            if (isUniqueFamilyHead) {
              allFamiliesData.push(familyData);
              uniqueFamilyUids.add(familyUid);
              console.log(`✅ تم إضافة العائلة: ${familyData.head.firstName} (${familyUid})`);
            } else {
              console.log(`❌ تم تجاهل العائلة بسبب التكرار: ${familyData.head.firstName} (${familyUid})`);
            }
          } else {
            console.log(`❌ فشل تحميل بيانات العائلة: ${familyUid}`);
          }
        } catch (error) {
          console.warn(`❌ خطأ في تحميل العائلة ${familyUid}:`, error);
          // تعذر تحميل العائلة - متابعة صامتة
        }
      } else {
        console.log(`⏭️ تجاهل العائلة (مكررة أو عائلتك): ${familyUid}`);
      }
    }
    
    setLoadingProgress(70);
    setLoadingStage('🌳 بناء الشجرة الموسعة...');
    
    // الخطوة 4: بناء الشجرة الموسعة مع منع التكرار
    const extendedTree = buildExtendedTreeStructure(allFamiliesData, uid);
    
    // الخطوة 5: ربط الأطفال الذكور بعائلاتهم المنفصلة
    if (extendedTree) {
      await linkMaleChildrenToTheirFamilies(extendedTree, allFamiliesData);
    }
    
    setLoadingProgress(90);
    setLoadingStage('⚡ تحسين وتنسيق الشجرة...');
    
    // الخطوة 6: حساب المقاييس
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

  } catch (error) {
    console.error('خطأ في تحميل الشجرة الموسعة:', error);
    setError('فشل في تحميل الشجرة الموسعة');
    showSnackbar('❌ فشل في تحميل الشجرة الموسعة', 'error');
  } finally {
    setLoading(false);
  }
  }, [uid, showSnackbar, monitorPerformance, buildExtendedTreeStructure, calculateTreeDepth, loadFamilyData, findAllLinkedFamilies, linkMaleChildrenToTheirFamilies]);

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

