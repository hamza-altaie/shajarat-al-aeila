import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Firebase imports - الاستيرادات الحقيقية
import { db } from '../firebase/config';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

// Auth context - الاستيراد الحقيقي
import { useAuth } from '../AuthContext';

// 🎨 مكون الكرت الجميل مثل Balkan
const FamilyCard = ({ person, onClick, isSelected, style, searchQuery }) => {
  const getCardColor = () => {
    if (person?.relation === 'رب العائلة') {
      return {
        bg: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
        border: '#1b5e20'
      };
    }
    
    if (person?.gender === 'male' || person?.relation === 'ابن') {
      return {
        bg: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
        border: '#1565c0'
      };
    }
    
    return {
      bg: 'linear-gradient(135deg, #f57c00 0%, #ff9800 100%)',
      border: '#ef6c00'
    };
  };

  if (!person || !style) return null;

  const colors = getCardColor();
  const displayName = person.name || 
    `${person.firstName || ''} ${person.fatherName || ''}`.trim() || 
    'غير محدد';
  
  const age = person.birthDate ? 
    new Date().getFullYear() - new Date(person.birthDate).getFullYear() : null;

  const highlightText = (text, query) => {
    if (!query || !text) return text;
    try {
      const parts = text.split(new RegExp(`(${query})`, 'gi'));
      return parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? 
          <span key={i} style={{ backgroundColor: 'yellow', color: 'black' }}>{part}</span> : part
      );
    } catch (error) {
      return text;
    }
  };

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) onClick(person);
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: (style?.x || 0) - 150,
        top: (style?.y || 0) - 50,
        width: 300,
        height: 100,
        background: colors.bg,
        borderRadius: 12,
        border: `3px solid ${isSelected ? '#fff' : colors.border}`,
        boxShadow: isSelected 
          ? '0 8px 32px rgba(0,0,0,0.3)' 
          : '0 4px 16px rgba(0,0,0,0.15)',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
        zIndex: isSelected ? 1000 : 100,
        display: 'flex',
        alignItems: 'center',
        padding: '16px',
        color: 'white',
        fontFamily: '"Cairo", "Segoe UI", sans-serif',
        pointerEvents: 'auto'
      }}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.transform = 'scale(1.02)';
          e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.2)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
        }
      }}
    >
      {/* المعلومات النصية */}
      <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
        <div style={{
          fontSize: 16,
          fontWeight: 700,
          marginBottom: 4,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {highlightText(displayName, searchQuery)}
        </div>
        
        <div style={{
          fontSize: 12,
          opacity: 0.9,
          marginBottom: 2
        }}>
          {person.relation || 'عضو'}
        </div>
        
        {age && (
          <div style={{
            fontSize: 11,
            opacity: 0.8
          }}>
            {age} سنة
          </div>
        )}
      </div>

      {/* الصورة الدائرية - على اليمين */}
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)',
          border: '3px solid rgba(255,255,255,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0
        }}
      >
        {person.avatar ? (
          <img 
            src={person.avatar} 
            alt={displayName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
              const nextSibling = e.target.nextElementSibling;
              if (nextSibling) {
                nextSibling.style.display = 'flex';
              }
            }}
          />
        ) : null}
        <span style={{ 
          fontSize: 30, 
          color: 'rgba(255,255,255,0.8)',
          display: person.avatar ? 'none' : 'flex'
        }}>
          {person.relation === 'رب العائلة' ? '👑' : 
           person.gender === 'male' || person.relation === 'ابن' ? '👤' : '👩'}
        </span>
      </div>

      {/* أيقونة المنصب */}
      {person.relation === 'رب العائلة' && (
        <div style={{
          position: 'absolute',
          top: -10,
          right: -10,
          width: 24,
          height: 24,
          background: '#ffd700',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid white',
          fontSize: 12
        }}>
          👑
        </div>
      )}

      {/* شارة الشجرة الموسعة */}
      {person.isExtended && (
        <div style={{
          position: 'absolute',
          top: -8,
          left: -8,
          width: 24,
          height: 24,
          background: '#9c27b0',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid white',
          fontSize: 10,
          fontWeight: 'bold',
          color: 'white'
        }}>
          🔗
        </div>
      )}

      {/* عداد الأطفال */}
      {(person.childrenCount || 0) > 0 && (
        <div style={{
          position: 'absolute',
          bottom: -8,
          right: 16,
          background: '#4caf50',
          color: 'white',
          borderRadius: 12,
          padding: '2px 8px',
          fontSize: 11,
          fontWeight: 600,
          border: '2px solid white'
        }}>
          {person.childrenCount}
        </div>
      )}
    </div>
  );
};

// 🔗 مكون الروابط بين الكروت
const FamilyConnection = ({ from, to, isHighlighted }) => {
  if (!from || !to || typeof from.x !== 'number' || typeof from.y !== 'number' || 
      typeof to.x !== 'number' || typeof to.y !== 'number') {
    return null;
  }

  const x1 = from.x;
  const y1 = from.y + 50;
  const x2 = to.x;
  const y2 = to.y - 50;
  const midY = y1 + (y2 - y1) / 2;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 50
      }}
    >
      <path
        d={`M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`}
        stroke={isHighlighted ? '#4caf50' : '#ffffff'}
        strokeWidth={isHighlighted ? 3 : 2}
        fill="none"
        opacity={0.8}
        style={{
          transition: 'all 0.3s ease',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
        }}
      />
      
      <circle
        cx={x1}
        cy={y1}
        r={4}
        fill={isHighlighted ? '#4caf50' : '#ffffff'}
        opacity={0.9}
        style={{ 
          transition: 'all 0.3s ease',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
        }}
      />
      <circle
        cx={x2}
        cy={y2}
        r={4}
        fill={isHighlighted ? '#4caf50' : '#ffffff'}
        opacity={0.9}
        style={{ 
          transition: 'all 0.3s ease',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
        }}
      />
    </svg>
  );
};

// 🎛️ شريط التحكم العلوي
const TreeControls = ({ 
  onZoomIn, onZoomOut, onReset, onRefresh, 
  showExtended, onToggleExtended, searchQuery, onSearchChange,
  isLoading, stats, onNavigateToFamily
}) => (
  <div style={{
    position: 'fixed',
    top: 20,
    left: 20,
    right: 20,
    zIndex: 10000,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    background: 'rgba(255,255,255,0.98)',
    padding: '16px 24px',
    borderRadius: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.2)',
    pointerEvents: 'auto'
  }}>
    {/* شريط البحث */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder="ابحث عن شخص..."
          value={searchQuery || ''}
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          style={{
            padding: '8px 12px 8px 40px',
            minWidth: 250,
            border: '2px solid #e0e0e0',
            borderRadius: 8,
            fontSize: 14,
            fontFamily: '"Cairo", sans-serif',
            outline: 'none',
            transition: 'border-color 0.3s ease',
            background: 'white'
          }}
          onFocus={(e) => e.target.style.borderColor = '#1976d2'}
          onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
        />
        <span style={{
          position: 'absolute',
          left: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 16,
          color: '#666'
        }}>🔍</span>
      </div>
    </div>

    {/* إحصائيات سريعة */}
    <div style={{ display: 'flex', gap: 8 }}>
      <span style={{
        background: '#1976d2',
        color: 'white',
        padding: '6px 12px',
        borderRadius: 16,
        fontSize: 12,
        fontWeight: 600
      }}>
        👥 {stats?.total || 0} شخص
      </span>
      <span style={{
        background: '#9c27b0',
        color: 'white',
        padding: '6px 12px',
        borderRadius: 16,
        fontSize: 12,
        fontWeight: 600
      }}>
        🌳 {stats?.generations || 0} جيل
      </span>
    </div>

    {/* أدوات التحكم */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <label style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 8,
        fontSize: 14,
        fontWeight: 500,
        cursor: 'pointer',
        padding: '4px 8px',
        borderRadius: 8,
        background: showExtended ? '#e3f2fd' : 'transparent'
      }}>
        <input
          type="checkbox"
          checked={showExtended || false}
          onChange={onToggleExtended}
          style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
        />
        الشجرة الموسعة
      </label>
      
      <div style={{ display: 'flex', gap: 4 }}>
        {[
          { icon: '🔍+', title: 'تكبير', onClick: onZoomIn },
          { icon: '🔍-', title: 'تصغير', onClick: onZoomOut },
          { icon: '🎯', title: 'إعادة تعيين', onClick: onReset },
          { icon: '🔄', title: 'تحديث', onClick: onRefresh },
          { icon: '👨‍👩‍👧‍👦', title: 'إدارة العائلة', onClick: onNavigateToFamily }
        ].map((btn, index) => (
          <button
            key={index}
            onClick={() => btn.onClick && btn.onClick()}
            disabled={isLoading}
            title={btn.title}
            style={{
              width: 38,
              height: 38,
              border: 'none',
              background: isLoading ? '#f0f0f0' : '#f5f5f5',
              borderRadius: 8,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.background = '#e0e0e0';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.target.style.background = '#f5f5f5';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }
            }}
          >
            {btn.icon}
          </button>
        ))}
      </div>
    </div>
  </div>
);

// 🌳 المكون الرئيسي للشجرة
export default function FamilyTreeAdvanced() {
  const navigate = useNavigate();
  const { userId: uid } = useAuth(); // الاستخدام الحقيقي للـ Auth
  
  // الحالات الأساسية
  const [familyData, setFamilyData] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExtended, setShowExtended] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // إعدادات الشجرة والأداء
  const [treeSettings] = useState({
    maxDepth: 15,
    maxPersonsPerLevel: 50,
    maxTotalPersons: 2000,
    enableSmartLimits: true,
    showDepthWarning: true,
    autoOptimize: true
  });
  
  const [performanceMetrics, setPerformanceMetrics] = useState({
    loadTime: 0,
    personCount: 0,
    maxDepthReached: 0,
    memoryUsage: 0
  });

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  
  const containerRef = useRef(null);

  // ===========================================================================
  // دوال مساعدة لمعالجة البيانات - من الكود الأصلي
  // ===========================================================================

  const sanitizeMemberData = useCallback((member) => {
    if (!member) return null;
    
    return {
      ...member,
      firstName: member.firstName?.trim() || '',
      fatherName: member.fatherName?.trim() || '',
      grandfatherName: member.grandfatherName?.trim() || '',
      surname: member.surname?.trim() || '',
      relation: member.relation?.trim() || 'عضو',
      avatar: member.avatar || null,
      birthDate: member.birthDate || null,
      name: member.name || `${member.firstName || ''} ${member.fatherName || ''}`.trim() || 'غير محدد',
      globalId: member.globalId || `${member.familyUid || 'unknown'}_${member.id || Math.random()}`
    };
  }, []);

  const buildFullName = useCallback((person) => {
    if (!person) return 'غير محدد';
    
    const parts = [
      person.firstName,
      person.fatherName,
      person.grandfatherName,
      person.surname
    ].filter(part => part && part.trim() !== '');
    
    return parts.length > 0 ? parts.join(' ').trim() : 'غير محدد';
  }, []);

  const findFamilyHead = useCallback((members) => {
    if (!members || !Array.isArray(members)) return null;
    
    const head = members.find(m => m.relation === 'رب العائلة');
    if (head) return head;
    
    const sorted = [...members].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateA - dateB;
    });
    
    return sorted[0] || members[0];
  }, []);

  // مراقبة الأداء أثناء بناء الشجرة
  const monitorPerformance = useCallback((metrics) => {
    setPerformanceMetrics(prev => ({
      ...prev,
      ...metrics
    }));
    
    // تحذيرات تلقائية
    if (metrics.personCount > 1000) {
      showSnackbar('⚠️ الشجرة كبيرة - قد يتأثر الأداء', 'warning');
    }
    
    if (metrics.maxDepthReached > 12) {
      showSnackbar('📏 تم الوصول لعمق كبير في الشجرة', 'info');
    }
    
    if (metrics.loadTime > 10000) { // 10 ثواني
      showSnackbar('🐌 التحميل بطيء - فكر في تقليل العمق', 'warning');
    }
  }, []);

  // ===========================================================================
  // 🔥 بناء الشجرة الهرمية الصحيحة - المحرك الجديد!
  // ===========================================================================

  const buildHierarchicalTree = useCallback((members, headMember) => {
    if (!headMember || !members || !Array.isArray(members)) return [];

    const processedIds = new Set();

    // 🎯 الدالة الأساسية لبناء العقد - محسنة للتخطيط الهرمي الصحيح
    const buildPersonNode = (person, level = 0, parentId = null) => {
      if (!person || processedIds.has(person.globalId)) return null;
      if (level > treeSettings.maxDepth) return null;
      if (parentId && person.globalId === parentId) return null; // منع الدائرة المرجعية
      
      processedIds.add(person.globalId);

      // 🔍 البحث عن الأطفال المباشرين فقط - هذا هو المفتاح!
      const directChildren = members.filter(member => 
        member && 
        member.fatherName === person.firstName && 
        member.grandfatherName === person.fatherName &&
        member.globalId !== person.globalId &&
        (member.relation === 'ابن' || member.relation === 'بنت') &&
        !processedIds.has(member.globalId)
      );

      // 🏗️ بناء عقد الأطفال تكرارياً
      const childNodes = directChildren
        .map(child => buildPersonNode(child, level + 1, person.globalId))
        .filter(Boolean);

      const node = {
        ...person,
        level,
        childrenCount: childNodes.length,
        children: childNodes,
        name: buildFullName(person)
      };

      return node;
    };

    const rootNode = buildPersonNode(headMember);
    
    // 📊 حساب المقاييس
    const metrics = {
      personCount: processedIds.size,
      maxDepthReached: 0
    };
    
    // حساب العمق الأقصى
    const calculateMaxDepth = (node, currentDepth = 0) => {
      metrics.maxDepthReached = Math.max(metrics.maxDepthReached, currentDepth);
      if (node && node.children) {
        node.children.forEach(child => calculateMaxDepth(child, currentDepth + 1));
      }
    };
    
    if (rootNode) {
      calculateMaxDepth(rootNode);
    }
    
    setPerformanceMetrics(prev => ({ ...prev, ...metrics }));
    
    return rootNode ? [rootNode] : [];
  }, [treeSettings.maxDepth, buildFullName]);

  // ===========================================================================
  // 🏛️ بناء الشجرة الموسعة الذكية - من الكود الأصلي محسن
  // ===========================================================================

  const buildExtendedTreeStructure = useCallback(async (allMembers, headMember) => {
    console.log('🏗️ بناء الشجرة الموسعة الذكية...');
    
    if (!headMember || !allMembers || !Array.isArray(allMembers)) {
      throw new Error('لم يتم العثور على البيانات المطلوبة');
    }

    const processedPersons = new Set();
    const globalPersonMap = new Map();

    // الخطوة 1: إنشاء خريطة شاملة للأشخاص - إصلاح النسب
    allMembers.forEach(member => {
      // استخدام globalId بدلاً من الاسم لتجنب الخلط بين الأشخاص
      const personKey = member.globalId;
      
      if (!globalPersonMap.has(personKey)) {
        globalPersonMap.set(personKey, {
          ...member,
          roles: [member.relation], 
          families: [member.familyUid], 
          isMultiRole: false,
          originalFamily: member.familyUid
        });
      } else {
        const existingPerson = globalPersonMap.get(personKey);
        existingPerson.roles.push(member.relation);
        if (!existingPerson.families.includes(member.familyUid)) {
          existingPerson.families.push(member.familyUid);
        }
        existingPerson.isMultiRole = true;
        
        if (member.relation === 'رب العائلة') {
          existingPerson.globalId = member.globalId;
          existingPerson.familyUid = member.familyUid;
          existingPerson.primaryFamily = member.familyUid;
        }
      }
    });

    console.log('🗺️ تم إنشاء خريطة الأشخاص');

    // الخطوة 2: بناء الهيكل الهرمي - إصلاح منطق الربط
    const buildPersonNode = (person, depth = 0, parentId = null) => {
      const personKey = person.globalId; // استخدام globalId
      
      // فحص الحدود الذكية
      if (processedPersons.has(personKey)) {
        return null;
      }
      
      if (depth > treeSettings.maxDepth) {
        console.log(`⚠️ توقف عند العمق ${depth}`);
        return null;
      }
      
      if (processedPersons.size > treeSettings.maxTotalPersons) {
        console.log(`⚠️ تجاوز الحد الأقصى للأشخاص`);
        return null;
      }
      
      if (parentId && person.globalId === parentId) {
        console.log(`🚫 منع الدائرة المرجعية`);
        return null;
      }
      
      processedPersons.add(personKey);
      const globalPerson = globalPersonMap.get(personKey);
      
      const node = {
        name: buildFullName(person),
        id: person.globalId,
        avatar: person.avatar || null,
        level: depth,
        childrenCount: 0,
        children: [],
        ...person,
        roles: globalPerson.roles,
        isMultiRole: globalPerson.isMultiRole,
        familyUids: globalPerson.families,
        isExtended: person.familyUid !== uid,
        treeType: 'extended',
        familyLevel: person.level || 0,
        generationDepth: depth,
        primaryRole: globalPerson.roles.includes('رب العائلة') ? 'رب العائلة' : globalPerson.roles[0]
      };

      // إضافة الأطفال المباشرين فقط - إصلاح منطق البحث
      const directChildren = allMembers.filter(member => 
        member && 
        member.fatherName === person.firstName && 
        member.grandfatherName === person.fatherName &&
        member.familyUid === person.familyUid && // نفس العائلة فقط لتجنب الخلط
        member.globalId !== person.globalId &&
        (member.relation === 'ابن' || member.relation === 'بنت') &&
        !processedPersons.has(member.globalId)
      );

      directChildren.forEach(child => {
        const childNode = buildPersonNode(child, depth + 1, person.globalId);
        if (childNode) {
          node.children.push(childNode);
        }
      });
      
      node.childrenCount = node.children.length;
      return node;
    };

    // بناء الشجرة من الجذر
    let maxDepthReached = 0;
    let totalPersonsProcessed = 0;
    
    const rootNode = buildPersonNode(headMember);
    
    totalPersonsProcessed = processedPersons.size;
    
    // حساب العمق الأقصى
    const calculateMaxDepth = (node, currentDepth = 0) => {
      maxDepthReached = Math.max(maxDepthReached, currentDepth);
      if (node && node.children) {
        node.children.forEach(child => calculateMaxDepth(child, currentDepth + 1));
      }
    };
    
    if (rootNode) {
      calculateMaxDepth(rootNode);
    }
    
    const metrics = {
      personCount: totalPersonsProcessed,
      maxDepthReached,
      familyCount: [...new Set(allMembers.map(m => m.familyUid))].length
    };
    
    console.log(`📊 المقاييس: ${metrics.personCount} شخص، عمق أقصى: ${metrics.maxDepthReached}`);
    
    return { treeData: rootNode ? [rootNode] : [], metrics };
  }, [treeSettings.maxDepth, treeSettings.maxTotalPersons, buildFullName, uid]);

  // ===========================================================================
  // 📐 حساب المواضع الهرمية - محرك التخطيط الجديد
  // ===========================================================================

  const calculateHierarchicalLayout = useCallback((data) => {
    if (!data || !Array.isArray(data) || data.length === 0) return [];
    
    const layout = [];
    
    // 🎯 توزيع العقد بشكل هرمي صحيح
    const layoutNode = (node, x, y, level, siblingIndex = 0, totalSiblings = 1) => {
      if (!node) return;
      
      // إضافة العقدة الحالية
      layout.push({
        ...node,
        x: x,
        y: y,
        level: level
      });

      // ترتيب الأطفال
      if (node.children && node.children.length > 0) {
        const childrenCount = node.children.length;
        const childrenSpacing = 450; // المسافة بين الأطفال - زيادة لتجنب التراكب
        const childrenWidth = (childrenCount - 1) * childrenSpacing;
        const startX = x - (childrenWidth / 2);
        const childY = y + 250; // المسافة العمودية بين الأجيال - زيادة

        node.children.forEach((child, index) => {
          const childX = startX + (index * childrenSpacing);
          layoutNode(child, childX, childY, level + 1, index, childrenCount);
        });
      }
    };

    // بدء التخطيط من الجذر
    layoutNode(data[0], 600, 200, 0);

    return layout;
  }, []);

  // ===========================================================================
  // تحميل البيانات - مدمج مع Firebase الحقيقي
  // ===========================================================================

  const loadSimpleTree = useCallback(async () => {
    if (!uid) return;
    
    try {
      setIsLoading(true);
      setLoadingStage('جاري تحميل عائلتك...');
      setError(null);

      console.log('🌳 تحميل الشجرة العادية...');
      
      const familySnapshot = await getDocs(collection(db, 'users', uid, 'family'));
      const members = [];
      
      familySnapshot.forEach(doc => {
        const memberData = sanitizeMemberData({ 
          ...doc.data(), 
          id: doc.id,
          globalId: `${uid}_${doc.id}`,
          familyUid: uid
        });
        
        if (memberData && memberData.firstName && memberData.firstName.trim() !== '') {
          members.push(memberData);
        }
      });

      if (members.length === 0) {
        setError('لا توجد أفراد في العائلة');
        setFamilyData([]);
        return;
      }

      const head = findFamilyHead(members);
      if (!head) {
        setError('لم يتم العثور على رب العائلة');
        setFamilyData([]);
        return;
      }

      // 🎯 استخدام المحرك الجديد!
      const treeData = buildHierarchicalTree(members, head);
      setFamilyData(treeData || []);
      
      console.log(`✅ تم تحميل ${members.length} فرد من العائلة`);
      showSnackbar(`تم تحميل عائلتك: ${members.length} أفراد`, 'success');
      
    } catch (error) {
      console.error('خطأ في تحميل الشجرة البسيطة:', error);
      setError('فشل في تحميل بيانات العائلة');
      setFamilyData([]);
    } finally {
      setIsLoading(false);
      setLoadingStage('');
    }
  }, [uid, sanitizeMemberData, findFamilyHead, buildHierarchicalTree]);

  // ===========================================================================
  // تحميل الشجرة الموسعة - كامل من الكود الأصلي
  // ===========================================================================

  const loadExtendedTree = useCallback(async () => {
    if (!uid) return;

    console.log('🏛️ تحميل الشجرة الموسعة...');
    
    const startTime = Date.now();
    setIsLoading(true);
    setError(null);
    setLoadingStage('البحث عن الجذر الأساسي...');

    try {
      const rootUid = await findFamilyRoot(uid);
      setLoadingStage('جمع العائلات المرتبطة...');
      
      const allFamilies = await collectAllLinkedFamilies(rootUid);
      setLoadingStage('بناء الشجرة الموسعة الذكية...');
      
      // جمع جميع الأعضاء من جميع العائلات
      const allMembers = [];
      allFamilies.forEach(family => {
        family.members.forEach(member => {
          allMembers.push({
            ...member,
            familyUid: family.uid,
            level: family.level,
            parentFamilyUid: family.parentFamilyUid
          });
        });
      });

      // البحث عن رب العائلة الجذر
      const rootFamily = allFamilies.find(f => f.uid === rootUid);
      if (!rootFamily || !rootFamily.head) {
        throw new Error('لم يتم العثور على العائلة الجذر');
      }

      const { treeData, metrics } = await buildExtendedTreeStructure(allMembers, rootFamily.head);
      
      // تسجيل المقاييس
      const endTime = Date.now();
      const finalMetrics = {
        ...metrics,
        loadTime: endTime - startTime
      };
      
      monitorPerformance(finalMetrics);
      
      setLoadingStage('اكتمل التحميل الموسع');
      setFamilyData(treeData || []);
      
      console.log(`✅ تم تحميل الشجرة الموسعة: ${allFamilies.length} عائلة`);
      showSnackbar(`تم تحميل الشجرة الموسعة: ${allFamilies.length} عائلة، ${metrics.personCount} شخص`, 'success');

    } catch (error) {
      console.error('❌ خطأ في تحميل الشجرة الموسعة:', error);
      setError(error.message);
      showSnackbar('فشل في تحميل الشجرة الموسعة', 'error');
    } finally {
      setIsLoading(false);
      setLoadingStage('');
    }
  }, [uid, buildExtendedTreeStructure, monitorPerformance]);

  // ===========================================================================
  // دوال مساعدة للشجرة الموسعة - من الكود الأصلي
  // ===========================================================================

  const findFamilyRoot = async (startUid) => {
    console.log('🔍 البحث عن جذر القبيلة من:', startUid);
    
    let currentUid = startUid;
    let maxDepth = 10;
    const visited = new Set();

    while (maxDepth > 0 && !visited.has(currentUid)) {
      visited.add(currentUid);
      
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUid));
        if (!userDoc.exists()) break;
        
        const userData = userDoc.data();
        const linkedToHead = userData.linkedToFamilyHead;
        
        if (!linkedToHead || linkedToHead === currentUid) {
          console.log('🏛️ جذر القبيلة:', currentUid);
          return currentUid;
        }
        
        console.log(`⬆️ الانتقال من ${currentUid} إلى ${linkedToHead}`);
        currentUid = linkedToHead;
        maxDepth--;
      } catch (error) {
        console.error(`خطأ في فحص ${currentUid}:`, error);
        break;
      }
    }
    
    console.log('🏛️ اعتماد', startUid, 'كجذر');
    return startUid;
  };

  const collectAllLinkedFamilies = async (rootUid) => {
    const allFamilies = new Map();
    const toProcess = [{ uid: rootUid, level: 0, parentUid: null }];
    const processed = new Set();

    while (toProcess.length > 0) {
      const { uid, level, parentUid } = toProcess.shift();
      
      if (processed.has(uid)) continue;
      processed.add(uid);

      try {
        const familyData = await loadFamilyData(uid, level, parentUid);
        if (familyData) {
          allFamilies.set(uid, familyData);
          console.log(`👨‍👩‍👧‍👦 عائلة ${uid}`);
          
          const linkedChildren = await findLinkedChildren(uid);
          linkedChildren.forEach(childUid => {
            if (!processed.has(childUid)) {
              toProcess.push({ uid: childUid, level: level + 1, parentUid: uid });
            }
          });
        }
      } catch (error) {
        console.error(`خطأ في معالجة العائلة ${uid}:`, error);
      }
    }

    return Array.from(allFamilies.values());
  };

  const loadFamilyData = async (familyUid, level, parentUid) => {
    try {
      const familySnapshot = await getDocs(collection(db, 'users', familyUid, 'family'));
      const members = [];
      
      familySnapshot.forEach(doc => {
        const memberData = sanitizeMemberData({ 
          ...doc.data(), 
          id: doc.id,
          globalId: `${familyUid}_${doc.id}`,
          familyUid,
          level,
          parentFamilyUid: parentUid
        });
        
        if (memberData.firstName && memberData.firstName.trim() !== '') {
          members.push(memberData);
        }
      });

      if (members.length > 0) {
        const head = findFamilyHead(members);
        
        return {
          uid: familyUid,
          level,
          parentFamilyUid: parentUid,
          members,
          head
        };
      }
      
      return null;
    } catch (error) {
      console.error(`خطأ في تحميل عائلة ${familyUid}:`, error);
      return null;
    }
  };

  const findLinkedChildren = async (parentUid) => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const children = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        if (userId === parentUid) continue;
        
        if (userData.linkedToFamilyHead === parentUid) {
          children.push(userId);
        }
        
        const linkedFamilies = userData.linkedFamilies || [];
        const hasLink = linkedFamilies.some(link => 
          link.targetFamilyUid === parentUid && 
          (link.linkType === 'child-parent' || link.linkType === 'parent-child')
        );
        
        if (hasLink && !children.includes(userId)) {
          children.push(userId);
        }
      }
      
      return children;
    } catch (error) {
      console.error('خطأ في البحث عن الأطفال:', error);
      return [];
    }
  };

  // البحث في الأشخاص
  const filteredData = familyData.filter(person =>
    person && person.name && 
    person.name.toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  // حساب التخطيط النهائي
  const layoutData = calculateHierarchicalLayout(searchQuery ? filteredData : familyData);

  // حساب الروابط بين العقد
  const connections = [];
  const addConnections = (node) => {
    if (!node || !node.children || !Array.isArray(node.children)) return;
    
    node.children.forEach(child => {
      if (!child) return;
      
      const parentNode = layoutData.find(p => p && p.globalId === node.globalId);
      const childNode = layoutData.find(p => p && p.globalId === child.globalId);
      
      if (parentNode && childNode) {
        connections.push({
          from: parentNode,
          to: childNode,
          isHighlighted: selectedPerson && 
            (selectedPerson.globalId === parentNode.globalId || selectedPerson.globalId === childNode.globalId)
        });
      }
      
      addConnections(child);
    });
  };

  familyData.forEach(addConnections);

  // إحصائيات
  const stats = {
    total: layoutData.length,
    generations: layoutData.length > 0 ? Math.max(...layoutData.map(p => (p && p.level) || 0)) + 1 : 0
  };

  // دوال مساعدة
  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  // معالجات الأحداث
  const handlePersonClick = useCallback((person) => {
    if (!person) return;
    setSelectedPerson(selectedPerson?.globalId === person.globalId ? null : person);
  }, [selectedPerson]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.1, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  }, []);
  
  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedPerson(null);
    setSearchQuery('');
  }, []);

  const handleRefresh = useCallback(() => {
    if (showExtended) {
      setFamilyData([]);
      loadExtendedTree();
    } else {
      setFamilyData([]);
      loadSimpleTree();
    }
  }, [showExtended, loadExtendedTree, loadSimpleTree]);

  const handleToggleExtended = useCallback((e) => {
    const newValue = e.target.checked;
    setShowExtended(newValue);
    
    // إعادة تعيين البيانات لإجبار إعادة التحميل
    setFamilyData([]);
    setSelectedPerson(null);
    setSearchQuery('');
    
    if (newValue) {
      loadExtendedTree();
    } else {
      loadSimpleTree();
    }
  }, [loadExtendedTree, loadSimpleTree]);

  // معالجات السحب والإفلات
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.family-card') || e.target.closest('.tree-controls')) {
      return;
    }
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - pan.x,
      y: e.clientY - pan.y
    });
  }, [pan]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.5, Math.min(2, prev + delta)));
  }, []);

  // إضافة مستمعات الأحداث
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleWheel]);

  // تحميل البيانات عند بدء التشغيل
  useEffect(() => {
    if (!uid) {
      navigate('/login');
      return;
    }

    loadSimpleTree();
  }, [uid, navigate, loadSimpleTree]);

  // التحقق من تسجيل الدخول
  if (!uid) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #263238 0%, #37474f 100%)',
        color: 'white'
      }}>
        جاري التحقق من تسجيل الدخول...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        background: showExtended 
          ? 'linear-gradient(135deg, #263238 0%, #37474f 100%)'
          : 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
        overflow: 'hidden',
        fontFamily: '"Cairo", "Segoe UI", sans-serif',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
    >
      {/* أدوات التحكم */}
      <div className="tree-controls">
        <TreeControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleReset}
          onRefresh={handleRefresh}
          showExtended={showExtended}
          onToggleExtended={handleToggleExtended}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isLoading={isLoading}
          stats={stats}
          onNavigateToFamily={() => navigate('/family')}
        />
      </div>

      {/* مؤشر التحميل */}
      {isLoading && (
        <div style={{
          position: 'fixed',
          top: 100,
          left: 20,
          right: 20,
          zIndex: 9999
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            padding: '12px 20px',
            borderRadius: 8,
            textAlign: 'center',
            marginBottom: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            {loadingStage}
          </div>
          <div style={{
            height: 4,
            background: '#e0e0e0',
            borderRadius: 2,
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, #1976d2, #42a5f5)',
              width: '30%',
              animation: 'loading 2s infinite'
            }} />
          </div>
        </div>
      )}

      {/* رسالة الخطأ */}
      {error && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(244, 67, 54, 0.95)',
          color: 'white',
          padding: '20px 30px',
          borderRadius: 8,
          fontSize: 16,
          zIndex: 9999,
          textAlign: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
        }}>
          <div style={{ marginBottom: 10 }}>⚠️ {error}</div>
          <button
            onClick={() => setError(null)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '8px 16px',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            إغلاق
          </button>
        </div>
      )}

      {/* منطقة الشجرة - المحرك المخصص! */}
      {!error && layoutData.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.3s ease',
            pointerEvents: 'none'
          }}
        >
          {/* رسم الروابط */}
          {connections.map((connection, index) => (
            <FamilyConnection
              key={`connection-${index}`}
              from={connection.from}
              to={connection.to}
              isHighlighted={connection.isHighlighted}
            />
          ))}

          {/* رسم الكروت */}
          {layoutData.map(person => (
            person && (
              <div key={person.globalId || `person-${Math.random()}`} className="family-card">
                <FamilyCard
                  person={person}
                  onClick={handlePersonClick}
                  isSelected={selectedPerson?.globalId === person.globalId}
                  style={{ x: person.x, y: person.y }}
                  searchQuery={searchQuery}
                />
              </div>
            )
          ))}
        </div>
      )}

      {/* لوحة تفاصيل الشخص المختار */}
      {selectedPerson && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          width: 320,
          padding: 20,
          background: 'rgba(255,255,255,0.98)',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          backdropFilter: 'blur(10px)',
          zIndex: 9999,
          border: '1px solid rgba(255,255,255,0.3)'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>
            {selectedPerson.name}
          </h3>
          <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: 14 }}>
            {selectedPerson.relation}
          </p>
          {selectedPerson.birthDate && (
            <p style={{ margin: '0 0 8px 0', color: '#888', fontSize: 13 }}>
              المواليد: {new Date(selectedPerson.birthDate).getFullYear()}
            </p>
          )}
          {selectedPerson.isExtended && (
            <p style={{ margin: '0 0 8px 0', color: '#9c27b0', fontSize: 12, fontWeight: 600 }}>
              🔗 من الشجرة الموسعة
            </p>
          )}
          {selectedPerson.childrenCount > 0 && (
            <p style={{ margin: '0 0 16px 0', color: '#4caf50', fontSize: 12, fontWeight: 600 }}>
              👶 {selectedPerson.childrenCount} أطفال
            </p>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              style={{
                background: '#1976d2',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 6,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'background 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = '#1565c0'}
              onMouseLeave={(e) => e.target.style.background = '#1976d2'}
              onClick={() => {
                showSnackbar(`تفاصيل ${selectedPerson.name}: ${selectedPerson.relation}`, 'info');
              }}
            >
              ✏️ تفاصيل
            </button>
            <button
              style={{
                background: '#f5f5f5',
                color: '#333',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 6,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'background 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = '#e0e0e0'}
              onMouseLeave={(e) => e.target.style.background = '#f5f5f5'}
              onClick={() => setSelectedPerson(null)}
            >
              ✖️ إغلاق
            </button>
          </div>
        </div>
      )}

      {/* رسالة عدم وجود نتائج */}
      {searchQuery && filteredData.length === 0 && !isLoading && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(33, 150, 243, 0.95)',
          color: 'white',
          padding: '16px 24px',
          borderRadius: 8,
          fontSize: 16,
          zIndex: 9999,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
        }}>
          لم يتم العثور على نتائج للبحث "{searchQuery}"
        </div>
      )}

      {/* رسالة عدم وجود بيانات */}
      {!isLoading && !error && layoutData.length === 0 && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255,255,255,0.98)',
          padding: '30px',
          borderRadius: 12,
          textAlign: 'center',
          zIndex: 9999,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌳</div>
          <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>لا توجد بيانات</h3>
          <p style={{ margin: '0 0 20px 0', color: '#666' }}>
            لم يتم العثور على أفراد في العائلة
          </p>
          <button
            onClick={() => navigate('/family')}
            style={{
              background: '#1976d2',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 8,
              fontSize: 16,
              cursor: 'pointer'
            }}
          >
            إدارة العائلة
          </button>
        </div>
      )}

      {/* Snackbar للرسائل */}
      {snackbarOpen && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          background: snackbarSeverity === 'error' ? '#f44336' : 
                      snackbarSeverity === 'warning' ? '#ff9800' : 
                      snackbarSeverity === 'success' ? '#4caf50' : '#2196f3',
          color: 'white',
          padding: '12px 20px',
          borderRadius: 8,
          zIndex: 10000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <span>{snackbarMessage}</span>
          <button
            onClick={() => setSnackbarOpen(false)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '4px 8px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            ✖
          </button>
        </div>
      )}

      {/* إضافة CSS للحركة */}
      <style>
        {`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(0%); }
            100% { transform: translateX(100%); }
          }
          
          .family-card {
            pointer-events: auto;
          }
          
          .tree-controls {
            pointer-events: auto;
          }
        `}
      </style>
    </div>
  );
}