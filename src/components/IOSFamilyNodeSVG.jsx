// src/components/IOSFamilyNodeSVG.jsx
import React from 'react';

const IOSFamilyNodeSVG = ({ 
  nodeDatum, 
  onNodeClick,
  uniqueId 
}) => {
  
  // دالة حساب العمر - نفس ModernFamilyNodeHTML
  const calculateAge = (birthdate) => {
    if (!birthdate) return '';
    
    try {
      const birth = new Date(birthdate);
      const today = new Date();
      
      if (isNaN(birth.getTime())) return '';
      
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      
      if (age === 0) {
        const monthsDiff = today.getMonth() - birth.getMonth() + 
                         (12 * (today.getFullYear() - birth.getFullYear()));
        
        if (monthsDiff < 1) {
          const daysDiff = Math.floor((today - birth) / (1000 * 60 * 60 * 24));
          return `${daysDiff} يوم`;
        } else {
          return `${monthsDiff} شهر`;
        }
      }
      
      return `${age} سنة`;
    } catch {
      return '';
    }
  };

  // دالة الألوان - نفس ModernFamilyNodeHTML بالضبط
  const getNodeColors = () => {
    if (nodeDatum.gender === 'male' || nodeDatum.relation === 'ابن' || nodeDatum.relation === 'ولد') {
      return {
        primary: '#03a9f4',
        border: '#bdbdbd',
        bg: 'linear-gradient(135deg, #4fc3f7 0%, #0288d1 100%)',
        text: '#fff',
        subText: '#e3e3e3'
      };
    }
    if (nodeDatum.gender === 'female' || nodeDatum.relation === 'بنت' || nodeDatum.relation === 'ابنة') {
      return {
        primary: '#ff9800',
        border: '#bdbdbd',
        bg: 'linear-gradient(135deg, #ffb347 0%, #ff5e62 100%)',
        text: '#fff',
        subText: '#fbe9e7'
      };
    }
    return {
      primary: '#6366f1',
      border: '#bdbdbd',
      bg: 'linear-gradient(135deg, #e0e0e0 0%, #bdbdbd 100%)',
      text: '#222',
      subText: '#888'
    };
  };
  
  const colors = getNodeColors();
  const age = calculateAge(nodeDatum.birthdate || nodeDatum.birthDate);
  const highlight = nodeDatum.highlightMatch;

  return (
    <div
      style={{
        width: '220px',
        minWidth: '200px',
        height: '110px',
        minHeight: '90px',
        borderRadius: '14px',
        background: colors.bg,
        border: `2.5px solid ${highlight ? "#ffeb3b" : colors.border}`,
        boxShadow: highlight ? 
          '0 0 0 5px #ffeb3b, 0 4px 18px 2px rgba(0,0,0,0.07)' : 
          '0 4px 18px 2px rgba(0,0,0,0.07)',
        position: 'relative',
        cursor: 'pointer',
        fontFamily: 'Cairo, sans-serif',
        direction: 'rtl',
        display: 'flex',
        alignItems: 'center',
        padding: '10px 12px',
        margin: '12px',
        backgroundClip: 'padding-box',
        overflow: 'visible',
        zIndex: 2,
        transition: 'box-shadow 0.4s, border-color 0.4s'
      }}
      onClick={e => { 
        e.stopPropagation(); 
        onNodeClick && onNodeClick(nodeDatum); 
      }}
      className="ios-family-node-svg family-node-card"
    >
      {/* صورة */}
      <div style={{
        width: 44, 
        height: 44, 
        borderRadius: '50%', 
        background: '#f3f4f6', 
        border: `1.5px solid ${colors.border}`,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginLeft: 10, 
        overflow: 'hidden',
        flexShrink: 0
      }}>
        {nodeDatum.avatar ? (
          <img 
            src={nodeDatum.avatar} 
            alt={nodeDatum.name} 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover', 
              borderRadius: '50%' 
            }} 
          />
        ) : (
          <img 
            src={
              (nodeDatum.gender === 'female' || 
               nodeDatum.relation === 'بنت' || 
               nodeDatum.relation === 'ابنة' || 
               nodeDatum.relation === 'الزوجة' || 
               nodeDatum.relation === 'ربة العائلة') 
               ? '/icons/girl.png' 
               : '/icons/boy.png'
            }
            alt={nodeDatum.name || 'أفاتار'} 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover', 
              borderRadius: '50%' 
            }} 
            onError={(e) => {
              // في حالة فشل تحميل الصورة، استخدم أيقونة احتياطية
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'block';
            }}
          />
        )}
        {/* أيقونة احتياطية في حالة فشل تحميل الصورة */}
        <span style={{ 
          fontSize: 22, 
          color: colors.primary,
          display: 'none' // مخفية افتراضياً
        }}>
          {(nodeDatum.gender === 'female' || 
           nodeDatum.relation === 'بنت' || 
           nodeDatum.relation === 'ابنة' || 
           nodeDatum.relation === 'الزوجة' || 
           nodeDatum.relation === 'ربة العائلة') ? '👩' : '👨'}
        </span>
      </div>
      
      {/* معلومات */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          fontWeight: 700, 
          fontSize: 13, 
          color: colors.text, 
          marginBottom: 2, 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis' 
        }}>
          {nodeDatum.name || 'غير محدد'}
        </div>
        
        {/* القرابة */}
        {nodeDatum.relation && (
          <div style={{ 
            fontSize: 11, 
            color: colors.subText, 
            marginBottom: 2, 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis' 
          }}>
            {nodeDatum.relation}
          </div>
        )}
        
        {/* معلومات إضافية */}
        <div style={{ fontSize: 10, color: colors.subText, display: 'flex', gap: 8 }}>
          {nodeDatum.phone && <span style={{ direction: 'ltr' }}>📱 {nodeDatum.phone.substring(0, 8)}...</span>}
          {nodeDatum.location && <span>📍 {nodeDatum.location}</span>}
        </div>
      </div>
      
      {/* عدد الأطفال */}
      {nodeDatum.children && nodeDatum.children.length > 0 && (
        <div style={{ 
          position: 'absolute', 
          top: 6, 
          left: 8, 
          background: '#f3f4f6', 
          color: colors.primary, 
          borderRadius: 8, 
          fontSize: 10, 
          padding: '1.5px 6px', 
          border: `1px solid ${colors.border}` 
        }}>
          {nodeDatum.children.length} 👶
        </div>
      )}
      
      {/* العمر في الأسفل يسار */}
      {age && (
        <div style={{ 
          position: 'absolute', 
          bottom: 6, 
          left: 8, 
          background: 'rgba(255,255,255,0.9)', 
          color: colors.primary, 
          borderRadius: 10, 
          fontSize: 9, 
          padding: '2px 6px', 
          border: `1px solid ${colors.border}`,
          fontWeight: '600'
        }}>
          {age}
        </div>
      )}
    </div>
  );
};

export default IOSFamilyNodeSVG;