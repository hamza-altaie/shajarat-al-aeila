// src/components/ExtendedFamilyLinking.jsx - مع إصلاحات عرض الهاتف العمودي
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';
import {
  Box, Card, CardContent, Typography, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Autocomplete, Chip,
  Avatar, Alert, LinearProgress, IconButton, CircularProgress,
  InputAdornment, Divider, Grid, Tabs, Tab, Badge
} from '@mui/material';
import {
  Link as LinkIcon, Search as SearchIcon, PersonAdd as PersonAddIcon,
  Close as CloseIcon, Check as CheckIcon, Warning as WarningIcon,
  Groups as GroupsIcon, AccountTree as TreeIcon, Phone as PhoneIcon,
  Person as PersonIcon, LinkOff as UnlinkIcon, Delete as DeleteIcon,
  History as HistoryIcon, Info as InfoIcon
} from '@mui/icons-material';

// استيرادات Firebase
import { 
  collection, getDocs, doc, updateDoc, getDoc, arrayUnion 
} from 'firebase/firestore';
import { db } from '../firebase/config';

export default function ExtendedFamilyLinking({ 
  currentUserUid, 
  onLinkingComplete, 
  existingLinks = [] 
}) {
  // ===========================================================================
  // الحالات الأساسية
  // ===========================================================================
  const [currentTab, setCurrentTab] = useState(0);
  const [availableFamilies, setAvailableFamilies] = useState([]);
  const [linkedFamilies, setLinkedFamilies] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // حوارات
  const [linkingDialogOpen, setLinkingDialogOpen] = useState(false);
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [selectedLinkToRemove, setSelectedLinkToRemove] = useState(null);
  
  // بيانات النماذج
  const [linkType, setLinkType] = useState('');
  const [relationDescription, setRelationDescription] = useState('');
  
  // حالات التحميل والرسائل
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  
  // أنواع الروابط
  const linkTypes = useMemo(() => [
    { value: 'parent-child', label: 'أب-ابن', icon: '👨‍👦', description: 'رابط بين الآباء والأبناء' },
    { value: 'sibling', label: 'أشقاء', icon: '👥', description: 'رابط بين الإخوة والأخوات' },
    { value: 'marriage', label: 'زواج', icon: '💒', description: 'رابط الزواج' },
    { value: 'cousin', label: 'أبناء عم', icon: '👨‍👩‍👧‍👦', description: 'رابط بين أبناء العم' },
    { value: 'extended', label: 'قرابة بعيدة', icon: '🌳', description: 'روابط أخرى' }
  ], []);

  // مراقبة حالة المصادقة
  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      setMessage(''); // امسح أي رسائل خطأ سابقة
    } else {
      console.error('❌ المستخدم غير مصادق');
      setMessage('يجب تسجيل الدخول أولاً للوصول لميزة ربط العائلات');
      setMessageType('warning');
    }
  });
  
  return () => unsubscribe();
}, []);

  // دوال مساعدة
  const sanitizeName = useCallback((firstName, fatherName, surname) => {
    const parts = [firstName, fatherName, surname].filter(part => 
      part && part.trim() && part.trim() !== 'غير محدد'
    );
    return parts.length > 0 ? parts.join(' ').trim() : 'غير محدد';
  }, []);

  const getReverseLinkType = useCallback((linkType) => {
    switch (linkType) {
      case 'parent-child': return 'child-parent';
      case 'child-parent': return 'parent-child';
      case 'sibling': return 'sibling'; // الأشقاء يبقون أشقاء
      case 'marriage': return 'marriage'; // الزواج يبقى زواج
      case 'cousin': return 'cousin'; // أبناء العم يبقون أبناء عم
      case 'extended': return 'extended'; // القرابة البعيدة تبقى بعيدة
      default: return 'extended';
    }
  }, []);

  const getLinkTypeInfo = useCallback((linkType) => {
    return linkTypes.find(type => type.value === linkType) || 
           { label: linkType, icon: '🔗', description: 'نوع رابط غير معروف' };
  }, [linkTypes]);

  // ===========================================================================
  // دوال التحميل
  // ===========================================================================

  // دالة للتحقق من وجود هويات متعددة لنفس الشخص (للدمج وليس للتجاهل)
  const checkForPersonIdentities = useCallback(async (familyMembers, currentUserMembers) => {
    const duplicatePersons = [];
    
    for (const member of familyMembers) {
      const memberName = {
        firstName: member.firstName?.trim().toLowerCase() || '',
        fatherName: member.fatherName?.trim().toLowerCase() || '',
        surname: member.surname?.trim().toLowerCase() || ''
      };
      
      for (const currentMember of currentUserMembers) {
        // تحقق من تطابق الاسم الأول واسم الأب
        if (memberName.firstName === currentMember.firstName && 
            memberName.fatherName === currentMember.fatherName &&
            memberName.firstName !== '' && memberName.fatherName !== '') {
          
          duplicatePersons.push({
            sourceAccount: member,
            targetAccount: currentMember,
            mergedIdentity: {
              firstName: member.firstName || currentMember.firstName,
              fatherName: member.fatherName || currentMember.fatherName,
              surname: member.surname || currentMember.surname,
              // دمج البيانات من كلا الهويتين
              roles: [
                { account: 'source', relation: member.relation || 'عضو' },
                { account: 'target', relation: currentMember.relation || 'عضو' }
              ]
            }
          });
        }
      }
    }
    
    return duplicatePersons; // إرجاع قائمة الهويات المتعددة للدمج
  }, []);

  const loadFamiliesForLinking = useCallback(async () => {
  if (!currentUserUid) {

    setMessage('يجب تسجيل الدخول أولاً');
    setMessageType('warning');
    return;
  }
  
  setInitialLoading(true);
    
    try {
      // التحقق من حالة المصادقة أولاً
      const { auth } = await import('../firebase/config');
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('المستخدم غير مصادق عليه. يرجى تسجيل الدخول مرة أخرى.');
      }
      
      // التحقق من بيانات المستخدم الحالي
      const currentUserDoc = await getDoc(doc(db, 'users', currentUserUid));
      if (!currentUserDoc.exists()) {
        throw new Error('بيانات المستخدم الحالي غير موجودة في قاعدة البيانات');
      }

      // تحميل عائلة المستخدم الحالي للمقارنة
      const currentUserFamilySnapshot = await getDocs(collection(db, 'users', currentUserUid, 'family'));
      const currentUserMembers = [];
      currentUserFamilySnapshot.forEach(doc => {
        const memberData = doc.data();
        if (memberData.firstName && memberData.firstName.trim() !== '') {
          currentUserMembers.push({
            firstName: memberData.firstName.trim().toLowerCase(),
            fatherName: (memberData.fatherName || '').trim().toLowerCase(),
            surname: (memberData.surname || '').trim().toLowerCase()
          });
        }
      });

      const usersSnapshot = await getDocs(collection(db, 'users'));
      const families = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        
        // التحقق من صحة معرف المستخدم
        if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
          console.warn('تجاهل مستخدم بمعرف غير صحيح:', userId);
          continue;
        }
        
        if (userId === currentUserUid || existingLinks.includes(userId)) {
          continue;
        }
        
        try {
          const familySnapshot = await getDocs(collection(db, 'users', userId, 'family'));
          const members = [];
          
          familySnapshot.forEach(doc => {
            const memberData = doc.data();
            if (memberData.firstName && memberData.firstName.trim() !== '') {
              members.push({
                ...memberData,
                id: doc.id,
                globalId: `${userId}_${doc.id}`
              });
            }
          });
          
          if (members.length > 0) {
            // التحقق من الهويات المتعددة للدمج (بدلاً من التجاهل)
            const duplicatePersons = await checkForPersonIdentities(members, currentUserMembers);
            
            const familyHead = members.find(m => m.relation === 'رب العائلة') || members[0];
            const membersCount = members.length;
            
            const familyName = familyHead 
              ? `عائلة ${sanitizeName(familyHead.firstName, familyHead.fatherName, familyHead.surname)}`
              : `عائلة ${userData.displayName || userData.email || 'غير محدد'}`;
            
            // إضافة العائلة مع معلومات الدمج
            families.push({
              uid: userId,
              name: familyName,
              head: familyHead,
              members,
              membersCount,
              phone: userData.phone || familyHead?.phone || 'غير محدد',
              email: userData.email || 'غير محدد',
              userData,
              // إضافة معلومات الهويات المتعددة للدمج
              multipleIdentities: duplicatePersons.length > 0 ? duplicatePersons : null,
              hasSharedPersons: duplicatePersons.length > 0
            });
            
          }
        } catch (error) {
          console.warn(`تجاهل العائلة ${userId}:`, error);
        }
      }
      
      setAvailableFamilies(families);
      setMessage(families.length > 0 
        ? `تم العثور على ${families.length} عائلة متاحة للربط`
        : 'لا توجد عائلات متاحة للربط حالياً'
      );
      setMessageType('info');
      
    } catch (error) {
      console.error('❌ خطأ في تحميل العائلات:', error);
      
      let errorMessage = 'حدث خطأ أثناء تحميل العائلات';
      
      if (error.code === 'permission-denied') {
        errorMessage = 'ليس لديك صلاحية للوصول إلى هذه البيانات. تحقق من إعدادات Firebase وقواعد Firestore.';
      } else if (error.code === 'unauthenticated') {
        errorMessage = 'انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'خدمة Firebase غير متاحة حالياً. حاول مرة أخرى لاحقاً.';
      } else if (error.message.includes('مصادق')) {
        errorMessage = 'انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.';
      } else if (error.message.includes('بيانات المستخدم')) {
        errorMessage = 'لم يتم العثور على بيانات حسابك. تحقق من إعداد الحساب.';
      }
      
      setMessage(errorMessage);
      setMessageType('error');
    } finally {
      setInitialLoading(false);
    }
  }, [currentUserUid, existingLinks, sanitizeName, checkForPersonIdentities]);

  const loadLinkedFamilies = useCallback(async () => {
  if (!currentUserUid) {

    return;
  }
    
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUserUid));
      if (!userDoc.exists()) {
        console.warn('❌ لم يتم العثور على بيانات المستخدم');
        return;
      }
      
      const userData = userDoc.data();
      const linkedFamiliesData = userData?.linkedFamilies || [];
      
      // التحقق من أن linkedFamiliesData هو مصفوفة صحيحة
      if (!Array.isArray(linkedFamiliesData)) {
        console.warn('❌ بيانات العائلات المرتبطة ليست مصفوفة صحيحة:', linkedFamiliesData);
        setLinkedFamilies([]);
        return;
      }
      
      if (linkedFamiliesData.length > 0) {
        const enrichedLinkedFamilies = [];
        
        for (const link of linkedFamiliesData) {
          // التحقق من صحة بيانات الرابط
          if (!link || !link.targetFamilyUid || typeof link.targetFamilyUid !== 'string') {
            console.warn('تجاهل رابط غير صحيح:', link);
            continue;
          }

          try {
            // التأكد من أن targetFamilyUid صالح قبل إرساله لـ Firebase
            if (!link.targetFamilyUid || link.targetFamilyUid.length === 0) {
              console.warn('معرف عائلة فارغ، تجاهل الرابط');
              continue;
            }
            
            const targetDoc = await getDoc(doc(db, 'users', link.targetFamilyUid));
            const targetUserData = targetDoc.data();
            
            if (targetUserData) {
              const familySnapshot = await getDocs(collection(db, 'users', link.targetFamilyUid, 'family'));
              const members = [];
              let targetFamilyHead = null;
              
              familySnapshot.forEach(doc => {
                const memberData = doc.data();
                if (memberData.firstName && memberData.firstName.trim() !== '') {
                  members.push(memberData);
                  if (memberData.relation === 'رب العائلة') {
                    targetFamilyHead = memberData;
                  }
                }
              });
              
              enrichedLinkedFamilies.push({
                ...link,
                targetFamilyHead,
                targetUserData,
                membersCount: members.length,
                phone: targetUserData.phone || 'غير محدد'
              });
            }
          } catch (error) {
            console.warn(`تجاهل الرابط مع ${link?.targetFamilyUid || 'معرف غير صحيح'}:`, error);
          }
        }
        
        setLinkedFamilies(enrichedLinkedFamilies);
      } else {
        // إذا لم توجد عائلات مرتبطة، تعيين مصفوفة فارغة
        setLinkedFamilies([]);
      }
    } catch (error) {
      console.error('❌ خطأ في تحميل العائلات المرتبطة:', error);
      // في حالة الخطأ، تعيين مصفوفة فارغة لمنع أخطاء الواجهة
      setLinkedFamilies([]);
    }
  }, [currentUserUid]);

  // ===========================================================================
  // دوال البحث والتفاعل
  // ===========================================================================

  const searchFamilies = useCallback((searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setSearchQuery('');
      return;
    }
    
    setSearchQuery(searchTerm);
    const results = availableFamilies.filter(family => {
      const searchLower = searchTerm.toLowerCase();
      return (
        family.name.toLowerCase().includes(searchLower) ||
        family.head?.firstName?.toLowerCase().includes(searchLower) ||
        family.head?.surname?.toLowerCase().includes(searchLower) ||
        family.head?.fatherName?.toLowerCase().includes(searchLower) ||
        family.phone?.includes(searchTerm)
      );
    });
    
    setSearchResults(results);
  }, [availableFamilies]);

  const openLinkingDialog = useCallback((family) => {
    setSelectedFamily(family);
    setLinkType('');
    setRelationDescription('');
    setLinkingDialogOpen(true);
  }, []);

  const openUnlinkDialog = useCallback((linkedFamily) => {
    setSelectedLinkToRemove(linkedFamily);
    setUnlinkDialogOpen(true);
  }, []);

  // ===========================================================================
  // دوال الربط وفك الربط
  // ===========================================================================

  // دالة للتحقق من تكرار الأشخاص بين العائلتين
  const checkForDuplicatePersons = useCallback(async (familyUid1, familyUid2) => {
    try {
      // التحقق من صحة معرفات العائلات
      if (!familyUid1 || !familyUid2 || typeof familyUid1 !== 'string' || typeof familyUid2 !== 'string') {
        console.warn('معرفات عائلات غير صحيحة في checkForDuplicatePersons:', { familyUid1, familyUid2 });
        return false;
      }
      
      // تحميل أعضاء العائلة الأولى
      const family1Snapshot = await getDocs(collection(db, 'users', familyUid1, 'family'));
      const family1Members = [];
      family1Snapshot.forEach(doc => {
        const memberData = doc.data();
        if (memberData.firstName && memberData.firstName.trim() !== '') {
          family1Members.push({
            firstName: memberData.firstName.trim().toLowerCase(),
            fatherName: (memberData.fatherName || '').trim().toLowerCase(),
            surname: (memberData.surname || '').trim().toLowerCase()
          });
        }
      });

      // تحميل أعضاء العائلة الثانية
      const family2Snapshot = await getDocs(collection(db, 'users', familyUid2, 'family'));
      const family2Members = [];
      family2Snapshot.forEach(doc => {
        const memberData = doc.data();
        if (memberData.firstName && memberData.firstName.trim() !== '') {
          family2Members.push({
            firstName: memberData.firstName.trim().toLowerCase(),
            fatherName: (memberData.fatherName || '').trim().toLowerCase(),
            surname: (memberData.surname || '').trim().toLowerCase()
          });
        }
      });

      // التحقق من التطابق
      for (const member1 of family1Members) {
        for (const member2 of family2Members) {
          // إذا تطابق الاسم الأول واسم الأب
          if (member1.firstName === member2.firstName && 
              member1.fatherName === member2.fatherName &&
              member1.firstName !== '' && member1.fatherName !== '') {
            console.warn('تم العثور على شخص مكرر:', member1);
            return true;
          }
          
          // تحقق أكثر صرامة: الاسم الكامل
          if (member1.firstName === member2.firstName && 
              member1.fatherName === member2.fatherName &&
              member1.surname === member2.surname &&
              member1.firstName !== '') {
            console.warn('تم العثور على شخص مكرر (الاسم الكامل):', member1);
            return true;
          }
        }
      }

      return false; // لا يوجد تكرار
    } catch (error) {
      console.error('خطأ في التحقق من التكرار:', error);
      return false; // في حالة الخطأ، نسمح بالربط
    }
  }, []);

  const handleCreateLink = useCallback(async () => {
  if (!selectedFamily || !linkType || !currentUserUid) {
    setMessage('يرجى ملء جميع الحقول المطلوبة');
    setMessageType('error');
    return;
  }
  
  setLoading(true);

  try {
    // التحقق من حالة المصادقة أولاً
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى');
    }

    // التحقق من وجود هويات مشتركة (للإعلام وليس للمنع)
    const isDuplicatePerson = await checkForDuplicatePersons(currentUserUid, selectedFamily.uid);
    if (isDuplicatePerson) {

      // لا نوقف الربط، بل نستمر لأن النظام الآن يدعم الدمج
    }

    const linkData = {
      targetFamilyUid: selectedFamily.uid,
      targetFamilyName: selectedFamily.name,
      linkType,
      relationDescription: relationDescription || '',
      establishedAt: new Date().toISOString(),
      establishedBy: currentUserUid
    };
    
    const reverseLinkData = {
      targetFamilyUid: currentUserUid,
      targetFamilyName: 'عائلتك',
      linkType: getReverseLinkType(linkType),
      relationDescription: relationDescription || '',
      establishedAt: new Date().toISOString(),
      establishedBy: currentUserUid
    };
    
    // إضافة الرابط للمستخدم الحالي
    await updateDoc(doc(db, 'users', currentUserUid), {
      linkedFamilies: arrayUnion(linkData)
    });

    // إضافة الرابط العكسي للعائلة المستهدفة
    await updateDoc(doc(db, 'users', selectedFamily.uid), {
      linkedFamilies: arrayUnion(reverseLinkData)
    });

    setMessage(`تم ربط عائلتك مع ${selectedFamily.name} بنجاح!`);
    setMessageType('success');
    setLinkingDialogOpen(false);

    // إعادة تحميل البيانات
    await Promise.all([loadFamiliesForLinking(), loadLinkedFamilies()]);

    // التبديل للعائلات المرتبطة لرؤية النتيجة
    setCurrentTab(1);

    // إشعار المكون الأب لإغلاق الحوار الرئيسي
    if (onLinkingComplete) {
      setTimeout(() => {
        onLinkingComplete();
      }, 1500);
    }
    
  } catch (error) {
    console.error('❌ خطأ في إنشاء الرابط:', error);
    
    let friendlyMessage = 'حدث خطأ أثناء ربط العائلات';
    
    if (error.message.includes('تكرار')) {
      friendlyMessage = error.message;
    } else if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
      friendlyMessage = 'ليس لديك صلاحية للقيام بهذا العمل. تحقق من تسجيل الدخول';
    } else if (error.message.includes('Missing or insufficient permissions')) {
      friendlyMessage = 'أذونات غير كافية. تحقق من قواعد Firestore';
    } else if (error.code === 'unavailable') {
      friendlyMessage = 'الخدمة غير متاحة حالياً. حاول مرة أخرى';
    }
  
    setMessage(friendlyMessage);
    setMessageType('error');
  } finally {
    setLoading(false);
    setLinkingDialogOpen(false);
    setUnlinkDialogOpen(false);
  }
}, [selectedFamily, linkType, relationDescription, currentUserUid, getReverseLinkType, loadFamiliesForLinking, loadLinkedFamilies, onLinkingComplete, checkForDuplicatePersons]);

  const handleRemoveLink = useCallback(async () => {
  if (!selectedLinkToRemove || !currentUserUid) return;
  
  setLoading(true);
  
  try {
    // التحقق من صلاحيات المستخدم أولاً
    const { auth } = await import('../firebase/config');
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.');
    }

    // التحقق من صحة البيانات المطلوبة
    if (!selectedLinkToRemove || !selectedLinkToRemove.targetFamilyUid) {
      throw new Error('بيانات الرابط المراد حذفه غير صحيحة');
    }

    // حذف الرابط من المستخدم الحالي
    const currentUserDoc = await getDoc(doc(db, 'users', currentUserUid));
    if (!currentUserDoc.exists()) {
      throw new Error('لم يتم العثور على بيانات المستخدم');
    }

    const currentUserData = currentUserDoc.data();
    const updatedLinks = (currentUserData?.linkedFamilies || []).filter(
      link => link && link.targetFamilyUid && link.targetFamilyUid !== selectedLinkToRemove.targetFamilyUid
    );
    
    await updateDoc(doc(db, 'users', currentUserUid), {
      linkedFamilies: updatedLinks,
      updatedAt: new Date().toISOString()
    });
    
    // محاولة حذف الرابط العكسي (مع معالجة الأخطاء)
    try {
      const targetUserDoc = await getDoc(doc(db, 'users', selectedLinkToRemove.targetFamilyUid));
      if (targetUserDoc.exists()) {
        const targetUserData = targetUserDoc.data();
        const updatedTargetLinks = (targetUserData?.linkedFamilies || []).filter(
          link => link && link.targetFamilyUid && link.targetFamilyUid !== currentUserUid
        );
        
        await updateDoc(doc(db, 'users', selectedLinkToRemove.targetFamilyUid), {
          linkedFamilies: updatedTargetLinks,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (targetError) {
      console.warn('⚠️ تعذر حذف الرابط العكسي:', targetError);
      // لا نوقف العملية، فالرابط من جانبك تم حذفه بنجاح
    }
    
    // إشعار المكون الأب وإغلاق القائمة
    setMessage(`تم فك الرابط مع ${selectedLinkToRemove.targetFamilyName || selectedLinkToRemove.targetFamilyUid} بنجاح`);
    setMessageType('success');
    setUnlinkDialogOpen(false);

    // إعادة تحميل البيانات
    await Promise.all([loadFamiliesForLinking(), loadLinkedFamilies()]);

    // التبديل للعائلات المتاحة
    setCurrentTab(0);

    // إشعار المكون الأب لإغلاق الحوار الرئيسي
    if (onLinkingComplete) {
      // تأخير قصير للسماح برؤية رسالة النجاح
      setTimeout(() => {
        onLinkingComplete();
      }, 1500);
    }
    
  } catch (error) {
    console.error('❌ خطأ في حذف الرابط:', error);
    
    let errorMessage = 'حدث خطأ أثناء فك الرابط';
    
    if (error.code === 'permission-denied') {
      errorMessage = 'ليس لديك صلاحية لحذف هذا الرابط. تحقق من الإعدادات.';
    } else if (error.code === 'unauthenticated') {
      errorMessage = 'انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.';
    } else if (error.message.includes('مصادق')) {
      errorMessage = 'انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.';
    } else if (error.message.includes('بيانات المستخدم')) {
      errorMessage = 'لم يتم العثور على بيانات حسابك. تحقق من إعداد الحساب.';
    }
    
    setMessage(errorMessage);
    setMessageType('error');
  } finally {
    setLoading(false);
    // إغلاق أي حوارات مفتوحة فوراً
    setLinkingDialogOpen(false);
    setUnlinkDialogOpen(false);
  }
}, [selectedLinkToRemove, currentUserUid, loadFamiliesForLinking, loadLinkedFamilies, onLinkingComplete]);

  // ===========================================================================
  // التأثيرات
  // ===========================================================================

  useEffect(() => {
    if (currentUserUid) {
      Promise.all([loadFamiliesForLinking(), loadLinkedFamilies()]);
    }
  }, [currentUserUid, loadFamiliesForLinking, loadLinkedFamilies]);

  // ===========================================================================
  // مكونات العرض
  // ===========================================================================

  // عرض كارت العائلة المتاحة للربط
  const renderFamilyCard = useCallback((family, showLinkButton = true) => (
    <Card 
      key={family.uid} 
      sx={{ 
        mb: 2, 
        border: '1px solid #e0e0e0',
        borderRadius: 2,
        transition: 'all 0.3s ease',
        '&:hover': { 
          boxShadow: 2,
          borderColor: '#2196f3'
        },
        // إصلاحات خاصة للهواتف
        width: '100%',
        maxWidth: '100%',
        overflow: 'visible'
      }}
    >
      <CardContent sx={{ 
        p: { xs: 2, sm: 3 }, // حشو أقل على الهواتف
        '&:last-child': { pb: { xs: 2, sm: 3 } }
      }}>
        <Box 
          display="flex" 
          flexDirection={{ xs: 'column', sm: 'row' }} // عمودي على الهواتف
          alignItems={{ xs: 'stretch', sm: 'center' }}
          gap={2}
        >
          <Avatar 
            src={family.head?.avatar} 
            sx={{ 
              bgcolor: '#2196f3', 
              width: { xs: 48, sm: 56 }, // أصغر على الهواتف
              height: { xs: 48, sm: 56 },
              fontSize: '1.5rem',
              alignSelf: { xs: 'center', sm: 'flex-start' }
            }}
          >
            {family.head?.firstName?.charAt(0) || '👤'}
          </Avatar>
          
          <Box flex={1} sx={{ minWidth: 0 }}>
            <Typography 
              variant="h6" 
              fontWeight="bold" 
              color="primary" 
              gutterBottom
              sx={{ 
                fontSize: { xs: '1rem', sm: '1.25rem' },
                wordBreak: 'break-word'
              }}
            >
              {family.name}
            </Typography>
            
            {family.head && (
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  mb: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  flexWrap: 'wrap'
                }}
              >
                <PersonIcon sx={{ fontSize: 16 }} />
                رب العائلة: {sanitizeName(
                  family.head.firstName, 
                  family.head.fatherName, 
                  family.head.surname
                )}
              </Typography>
            )}
            
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ mb: 1 }}
            >
              👥 {family.membersCount} فرد
            </Typography>
            
            <Box 
              display="flex" 
              gap={1} 
              mt={1} 
              flexWrap="wrap"
            >
              <Chip 
                size="small" 
                label="متاح للربط" 
                color="success" 
                variant="outlined" 
              />
              {family.head?.relation && (
                <Chip 
                  size="small" 
                  label={family.head.relation} 
                  color="primary" 
                  variant="outlined" 
                />
              )}
            </Box>
          </Box>
          
          {showLinkButton && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<LinkIcon />}
              onClick={() => openLinkingDialog(family)}
              disabled={loading}
              sx={{ 
                minWidth: { xs: '100%', sm: 100 },
                borderRadius: 2,
                gap: 1,
                mt: { xs: 2, sm: 0 }
              }}
            >
              ربط
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  ), [loading, openLinkingDialog, sanitizeName]);

  // عرض كارت العائلة المرتبطة
  const renderLinkedFamilyCard = useCallback((linkedFamily) => {
    const linkTypeInfo = getLinkTypeInfo(linkedFamily.linkType);
    
    return (
      <Card 
        key={`${linkedFamily.targetFamilyUid}_${linkedFamily.establishedAt}`} 
        sx={{ 
          mb: 2,
          border: '1px solid #e3f2fd',
          backgroundColor: '#fafafa',
          borderRadius: 2,
          transition: 'all 0.3s ease',
          '&:hover': { 
            boxShadow: 3,
            borderColor: '#2196f3'
          },
          // إصلاحات خاصة للهواتف
          width: '100%',
          maxWidth: '100%',
          overflow: 'visible'
        }}
      >
        <CardContent sx={{ 
          p: { xs: 2, sm: 3 },
          '&:last-child': { pb: { xs: 2, sm: 3 } }
        }}>
          <Box 
            display="flex" 
            flexDirection={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            gap={2}
          >
            <Avatar 
              src={linkedFamily.targetFamilyHead?.avatar} 
              sx={{ 
                bgcolor: '#2196f3', 
                width: { xs: 48, sm: 56 },
                height: { xs: 48, sm: 56 },
                fontSize: '1.5rem',
                alignSelf: { xs: 'center', sm: 'flex-start' }
              }}
            >
              {linkedFamily.targetFamilyHead?.firstName?.charAt(0) || '🔗'}
            </Avatar>
            
            <Box flex={1} sx={{ minWidth: 0 }}>
              <Typography 
                variant="h6" 
                fontWeight="bold" 
                color="primary" 
                gutterBottom
                sx={{ 
                  fontSize: { xs: '1rem', sm: '1.25rem' },
                  wordBreak: 'break-word'
                }}
              >
                {linkedFamily.targetFamilyName}
              </Typography>
              
              {linkedFamily.targetFamilyHead && (
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    mb: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    flexWrap: 'wrap'
                  }}
                >
                  <PersonIcon sx={{ fontSize: 16 }} />
                  رب العائلة: {sanitizeName(
                    linkedFamily.targetFamilyHead.firstName, 
                    linkedFamily.targetFamilyHead.fatherName, 
                    linkedFamily.targetFamilyHead.surname
                  )}
                </Typography>
              )}
              
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ mb: 1 }}
              >
                👥 {linkedFamily.membersCount} فرد
              </Typography>
              
              <Box 
                display="flex" 
                gap={1} 
                mt={1} 
                flexWrap="wrap"
              >
                <Chip 
                  size="small" 
                  label={`${linkTypeInfo.icon} ${linkTypeInfo.label}`}
                  color="primary" 
                  variant="filled" 
                />
                {linkedFamily.relationDescription && (
                  <Chip 
                    size="small" 
                    label={linkedFamily.relationDescription}
                    color="info" 
                    variant="outlined" 
                  />
                )}
              </Box>
            </Box>
            
            <IconButton
              color="error"
              onClick={() => openUnlinkDialog(linkedFamily)}
              disabled={loading}
              sx={{ 
                alignSelf: { xs: 'center', sm: 'flex-start' },
                mt: { xs: 1, sm: 0 }
              }}
            >
              <UnlinkIcon />
            </IconButton>
          </Box>
        </CardContent>
      </Card>
    );
  }, [getLinkTypeInfo, sanitizeName, loading, openUnlinkDialog]);

  // العرض الرئيسي
  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%',
      overflow: 'auto',
      p: { xs: 1, sm: 2 } // حشو أقل على الهواتف
    }}>
      {message && (
        <Alert 
          severity={messageType} 
          onClose={() => setMessage('')}
          sx={{ mb: 2 }}
        >
          {message}
        </Alert>
      )}

      {/* إحصائيات سريعة */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="primary" fontWeight="bold">
                {availableFamilies.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                عائلة متاحة
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {linkedFamilies.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                رابط نشط
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 3 }} />

      {/* تبويبات محسنة للهواتف */}
      <Box sx={{ mb: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={(e, newValue) => setCurrentTab(newValue)}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              borderRadius: 2,
              margin: { xs: 0.5, sm: 1 },
              minHeight: { xs: 56, sm: 64 },
              padding: { xs: '8px 12px', sm: '12px 16px' },
              fontSize: { xs: '0.875rem', sm: '1rem' }
            },
            '& .MuiTabs-flexContainer': {
              gap: { xs: 0.5, sm: 1 }
            }
          }}
        >
          <Tab 
            label={
              <Box 
                display="flex" 
                alignItems="center" 
                justifyContent="center" 
                gap={1.5}
                sx={{ 
                  flexDirection: { xs: 'column', sm: 'row' },
                  textAlign: 'center',
                  minWidth: 0
                }}
              >
                <LinkIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 'medium', 
                    whiteSpace: 'nowrap',
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                  }}
                >
                  ربط عائلات جديدة
                </Typography>
                <Badge badgeContent={availableFamilies.length} color="primary" />
              </Box>
            }
            value={0}
          />
          <Tab 
            label={
              <Box 
                display="flex" 
                alignItems="center" 
                justifyContent="center" 
                gap={1.5}
                sx={{ 
                  flexDirection: { xs: 'column', sm: 'row' },
                  textAlign: 'center',
                  minWidth: 0
                }}
              >
                <GroupsIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 'medium', 
                    whiteSpace: 'nowrap',
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                  }}
                >
                  العائلات المرتبطة
                </Typography>
                <Badge badgeContent={linkedFamilies.length} color="success" />
              </Box>
            }
            value={1}
          />
        </Tabs>
      </Box>

      {/* المحتوى */}
      <Box sx={{ 
        minHeight: { xs: '60vh', sm: 400 },
        maxHeight: { xs: 'calc(100vh - 300px)', sm: '70vh' },
        overflow: 'auto',
        px: { xs: 0, sm: 1 }
      }}>
        {initialLoading ? (
          <Box display="flex" flexDirection="column" alignItems="center" py={4}>
            <CircularProgress size={60} />
            <Typography variant="body1" sx={{ mt: 2 }}>
              جاري تحميل العائلات...
            </Typography>
          </Box>
        ) : (
          <>
            {currentTab === 0 && (
              <Box>
                {/* شريط البحث */}
                <TextField
                  fullWidth
                  placeholder="ابحث في العائلات المتاحة..."
                  value={searchQuery}
                  onChange={(e) => searchFamilies(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    )
                  }}
                  sx={{ mb: 3 }}
                />

                {/* عرض النتائج */}
                {searchQuery && searchResults.length === 0 ? (
                  <Alert severity="info">
                    لا توجد نتائج للبحث "{searchQuery}"
                  </Alert>
                ) : (
                  <Box>
                    {(searchQuery ? searchResults : availableFamilies).map(family => 
                      renderFamilyCard(family, true)
                    )}
                  </Box>
                )}
              </Box>
            )}

            {currentTab === 1 && (
              <Box>
                {linkedFamilies.length === 0 ? (
                  <Alert severity="info" icon={<InfoIcon />}>
                    لم تقم بربط أي عائلات بعد. انتقل إلى تبويب "ربط عائلات جديدة" لبدء الربط.
                  </Alert>
                ) : (
                  <Box>
                    {linkedFamilies.map(linkedFamily => 
                      renderLinkedFamilyCard(linkedFamily)
                    )}
                  </Box>
                )}
              </Box>
            )}
          </>
        )}
      </Box>

      {/* حوار الربط */}
      <Dialog 
        open={linkingDialogOpen} 
        onClose={() => setLinkingDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={window.innerWidth < 600} // ملء الشاشة على الهواتف الصغيرة
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">
              ربط مع {selectedFamily?.name}
            </Typography>
            <IconButton onClick={() => setLinkingDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Autocomplete
              options={linkTypes}
              getOptionLabel={(option) => `${option.icon} ${option.label}`}
              value={linkTypes.find(type => type.value === linkType) || null}
              onChange={(event, newValue) => setLinkType(newValue?.value || '')}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="نوع القرابة" 
                  required 
                  fullWidth
                  sx={{ mb: 2 }}
                />
              )}
            />

            <TextField
              fullWidth
              label="وصف العلاقة (اختياري)"
              value={relationDescription}
              onChange={(e) => setRelationDescription(e.target.value)}
              multiline
              rows={2}
              placeholder="مثال: أشقاء من نفس الأب، أو أبناء عم من الدرجة الثانية..."
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setLinkingDialogOpen(false)}
            disabled={loading}
          >
            إلغاء
          </Button>
          <Button 
            variant="contained" 
            onClick={handleCreateLink}
            disabled={loading || !linkType}
            startIcon={loading ? <CircularProgress size={20} /> : <CheckIcon />}
          >
            {loading ? 'جاري الربط...' : 'تأكيد الربط'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* حوار فك الربط */}
      <Dialog 
        open={unlinkDialogOpen} 
        onClose={() => setUnlinkDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            <Typography variant="h6">تأكيد فك الرابط</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من رغبتك في فك الرابط مع{' '}
            <strong>{selectedLinkToRemove?.targetFamilyName}</strong>؟
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            سيتم حذف الرابط من كلا الجانبين ولن يظهر في الشجرة الموسعة.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnlinkDialogOpen(false)} disabled={loading}>
            إلغاء
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleRemoveLink}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {loading ? 'جاري الحذف...' : 'فك الرابط'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
