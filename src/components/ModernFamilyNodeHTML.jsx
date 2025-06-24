import React from 'react';

const ModernFamilyNodeHTML = ({ 
  nodeDatum, 
  onNodeClick
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

  return (
    <div
      style={{
        width: '240px',
        minWidth: '220px',
        height: '140px',          // زيادة الارتفاع لاستيعاب الصورة في الأعلى
        minHeight: '120px',
        borderRadius: '16px',
        background: colors.bg,
        border: `2.5px solid ${colors.border}`,
        boxShadow: highlight ? '0 0 0 5px #ffeb3b, 0 4px 18px 2px rgba(0,0,0,0.07)' : '0 4px 18px 2px rgba(0,0,0,0.07)',
        position: 'relative',
        cursor: 'pointer',
        fontFamily: 'Cairo, sans-serif',
        direction: 'rtl',
        display: 'flex',
        flexDirection: 'column',   // ترتيب عمودي بدلاً من أفقي
        alignItems: 'center',     // توسيط أفقي
        padding: '15px 12px 10px 12px',
        margin: '12px',
        backgroundClip: 'padding-box',
        overflow: 'visible',
        zIndex: 2,
        transition: 'box-shadow 0.4s, border-color 0.4s'
      }}
      onClick={e => { e.stopPropagation(); onNodeClick && onNodeClick(nodeDatum); }}
      className="modern-family-node-html family-node-card"
    >
      {/* صورة في الأعلى والوسط */}
      <div style={{
        width: 56,                // صورة أكبر
        height: 56, 
        borderRadius: '50%', 
        background: '#f3f4f6', 
        border: `2px solid ${colors.border}`,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginBottom: 8,          // مسافة تحت الصورة
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
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
          <span style={{ 
            fontSize: 28,           // أيقونة أكبر
            color: colors.primary 
          }}>
            👤
          </span>
        )}
      </div>

      {/* معلومات تحت الصورة */}
      <div style={{ 
        flex: 1, 
        minWidth: 0, 
        textAlign: 'center',      // توسيط النص
        width: '100%'
      }}>
        {/* اسم الشخص */}
        <div style={{ 
          fontWeight: 700, 
          fontSize: 14,             // خط أكبر قليلاً
          color: colors.text, 
          marginBottom: 4, 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          lineHeight: '1.2'
        }}>
          {nodeDatum.name || 'غير محدد'}
        </div>

        {/* نوع القرابة */}
        <div style={{ 
          fontSize: 12, 
          color: colors.subText, 
          marginBottom: 4, 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          fontWeight: 500
        }}>
          {nodeDatum.relation || 'عضو'}
        </div>

        {/* معلومات إضافية */}
        <div style={{ 
          fontSize: 10, 
          color: colors.subText, 
          display: 'flex', 
          justifyContent: 'center',  // توسيط المعلومات الإضافية
          gap: 8,
          flexWrap: 'wrap'
        }}>
          {nodeDatum.age && <span>{nodeDatum.age} سنة</span>}
          {nodeDatum.phone && (
            <span style={{ direction: 'ltr' }}>
              📱 {nodeDatum.phone.substring(0, 8)}...
            </span>
          )}
        </div>
      </div>

      {/* شارة عدد الأطفال - في الزاوية العلوية اليسرى */}
      {nodeDatum.children && nodeDatum.children.length > 0 && (
        <div style={{ 
          position: 'absolute', 
          top: -8,                  // خارج حدود الكارت قليلاً
          left: 8, 
          background: '#4caf50',    // لون أخضر للأطفال
          color: 'white', 
          borderRadius: 12, 
          fontSize: 10, 
          padding: '3px 8px', 
          border: '2px solid white',
          fontWeight: 600,
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          {nodeDatum.children.length} 👶
        </div>
      )}

      {/* شارة العائلة الموسعة - في الزاوية العلوية اليمنى */}
      {nodeDatum.isExtended && (
        <div style={{ 
          position: 'absolute', 
          top: -8, 
          right: 8, 
          background: '#ff5722',    // لون برتقالي للعائلات الموسعة
          color: 'white', 
          borderRadius: 12, 
          fontSize: 9, 
          padding: '3px 6px', 
          border: '2px solid white',
          fontWeight: 600,
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          🔗
        </div>
      )}
    </div>
  );
};

export default ModernFamilyNodeHTML;