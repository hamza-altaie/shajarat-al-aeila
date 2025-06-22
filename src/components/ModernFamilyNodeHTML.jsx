// src/components/ModernFamilyNodeHTML.jsx - نسخة مصححة
import React from 'react';

const ModernFamilyNodeHTML = ({ 
  nodeDatum, 
  onNodeClick, 
  isParent = false,
  isChild = false,
  isSpouse = false 
}) => {
  
  // ألوان حسب النوع
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

  // تمييز البحث
  const highlight = nodeDatum.highlightMatch;
  
  // تحديد الدور
  const getRole = () => {
    if (isParent) return 'الوالد';
    if (isChild) return 'الابن/الابنة';
    if (isSpouse) return 'الزوج/الزوجة';
    return nodeDatum.relation || 'عضو';
  };

  // اختصار الأسماء الطويلة
  const getDisplayName = (name) => {
    if (!name || name === 'غير محدد') return 'غير محدد';
    return name.length > 20 ? name.substring(0, 18) + '...' : name;
  };

  // إصلاح تحذيرات React Hooks
  const handleNodeClick = (nodeId) => {
    console.log(`تم النقر على العقدة: ${nodeId}`);
    onNodeClick(nodeId);
  };

  const handleEditClick = (nodeId) => {
    console.log(`تم تحرير العقدة: ${nodeId}`);
    // تنفيذ منطق التحرير
  };

  const handleViewClick = (nodeId) => {
    console.log(`عرض تفاصيل العقدة: ${nodeId}`);
    // تنفيذ منطق العرض
  };

  return (
    <div
      style={{
        width: '220px',
        minWidth: '200px',
        height: '110px',
        minHeight: '90px',
        borderRadius: '14px',
        background: colors.bg,
        border: `2.5px solid ${colors.border}`,
        boxShadow: highlight ? '0 0 0 5px #ffeb3b, 0 4px 18px 2px rgba(0,0,0,0.07)' : '0 4px 18px 2px rgba(0,0,0,0.07)',
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
      onClick={e => { e.stopPropagation(); onNodeClick && onNodeClick(nodeDatum); }}
      className="modern-family-node-html family-node-card"
    >
      {/* صورة */}
      <div style={{
        width: 44, height: 44, borderRadius: '50%', background: '#f3f4f6', border: `1.5px solid ${colors.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 10, overflow: 'hidden',
        flexShrink: 0
      }}>
        {nodeDatum.avatar ? (
          <img src={nodeDatum.avatar} alt={nodeDatum.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
        ) : (
          <span style={{ fontSize: 22, color: colors.primary }}>👤</span>
        )}
      </div>
      {/* معلومات */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: colors.text, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {nodeDatum.name || 'غير محدد'}
        </div>
        <div style={{ fontSize: 11, color: colors.subText, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {nodeDatum.relation || 'عضو'}
        </div>
        <div style={{ fontSize: 10, color: colors.subText, display: 'flex', gap: 8 }}>
          {nodeDatum.age && <span>{nodeDatum.age} سنة</span>}
          {nodeDatum.phone && <span style={{ direction: 'ltr' }}>📱 {nodeDatum.phone.substring(0, 8)}...</span>}
        </div>
      </div>
      {/* عدد الأطفال */}
      {nodeDatum.children && nodeDatum.children.length > 0 && (
        <div style={{ position: 'absolute', top: 6, left: 8, background: '#f3f4f6', color: colors.primary, borderRadius: 8, fontSize: 10, padding: '1.5px 6px', border: `1px solid ${colors.border}` }}>
          {nodeDatum.children.length} 👶
        </div>
      )}
    </div>
  );
};

export default ModernFamilyNodeHTML;