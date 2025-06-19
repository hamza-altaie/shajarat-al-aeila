// src/components/ModernFamilyNodeHTML.jsx - نسخة مصححة
import React from 'react';

const ModernFamilyNodeHTML = ({ 
  nodeDatum, 
  onNodeClick, 
  isParent = false,
  isChild = false,
  isSpouse = false 
}) => {
  
  // تحديد الألوان حسب نوع العضو
  const getNodeColors = () => {
    if (isParent) return { 
      primary: '#6366f1', 
      secondary: '#4f46e5', 
      bg: 'rgba(99, 102, 241, 0.1)',
      glow: 'rgba(99, 102, 241, 0.3)'
    };
    if (isChild) return { 
      primary: '#10b981', 
      secondary: '#059669', 
      bg: 'rgba(16, 185, 129, 0.1)',
      glow: 'rgba(16, 185, 129, 0.3)'
    };
    if (isSpouse) return { 
      primary: '#f59e0b', 
      secondary: '#d97706', 
      bg: 'rgba(245, 158, 11, 0.1)',
      glow: 'rgba(245, 158, 11, 0.3)'
    };
    return { 
      primary: '#6366f1', 
      secondary: '#4f46e5', 
      bg: 'rgba(99, 102, 241, 0.1)',
      glow: 'rgba(99, 102, 241, 0.3)'
    };
  };

  const colors = getNodeColors();
  
  // تحديد النوع للتصنيف
  const getNodeType = () => {
    if (isParent) return 'parent';
    if (isChild) return 'child';
    if (isSpouse) return 'spouse';
    return 'member';
  };

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

  // معالج النقر
  const handleNodeClick = (e) => {
    e.stopPropagation();
    if (onNodeClick) {
      onNodeClick(nodeDatum);
    }
  };

  // معالج الأزرار
  const handleEditClick = (e) => {
    e.stopPropagation();
    if (onNodeClick) {
      onNodeClick({ ...nodeDatum, action: 'edit' });
    }
  };

  const handleViewClick = (e) => {
    e.stopPropagation();
    if (onNodeClick) {
      onNodeClick({ ...nodeDatum, action: 'view' });
    }
  };

  return (
    <>
      {/* إضافة CSS المطلوب */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
          
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          .modern-family-node-html:hover .card-actions {
            opacity: 1 !important;
            transform: translateY(0) !important;
          }
          
          .modern-family-node-html .avatar-ring {
            animation: rotate 8s linear infinite;
          }
          
          .modern-family-node-html .status-indicator {
            animation: pulse 2s infinite;
          }
        `}
      </style>

      <div
        style={{
          width: '320px',
          height: '180px',
          position: 'relative',
          cursor: 'pointer',
          fontFamily: 'Cairo, sans-serif',
          direction: 'rtl',
          transform: 'translateZ(0)', // تسريع الرسومات
        }}
        onClick={handleNodeClick}
        className={`modern-family-node-html ${getNodeType()}`}
      >
        {/* الكارت الأساسي */}
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '20px',
            background: 'rgba(30, 41, 59, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(20px)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.23, 1, 0.320, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-8px)';
            e.currentTarget.style.boxShadow = `0 20px 40px ${colors.glow}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
          }}
        >
          {/* رأس الكارت */}
          <div
            style={{
              width: '100%',
              height: '50px',
              borderRadius: '20px 20px 0 0',
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 20px',
            }}
          >
            {/* شارة الدور */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '10px',
                padding: '4px 12px',
                color: 'white',
                fontSize: '11px',
                fontWeight: '600',
                backdropFilter: 'blur(10px)',
              }}
            >
              {getRole()}
            </div>

            {/* مؤشر الحالة */}
            <div
              className="status-indicator"
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#10b981',
                border: '2px solid white',
                boxShadow: '0 0 10px #10b981',
              }}
            />
          </div>

          {/* الشكل الزخرفي */}
          <div
            style={{
              position: 'absolute',
              top: '40px',
              left: '0',
              right: '0',
              height: '20px',
              background: colors.secondary,
              opacity: 0.3,
              clipPath: 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)',
            }}
          />

          {/* منطقة الصورة الشخصية */}
          <div
            style={{
              position: 'absolute',
              top: '25px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '70px',
              height: '70px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* حلقة متحركة */}
            <div
              className="avatar-ring"
              style={{
                position: 'absolute',
                width: '66px',
                height: '66px',
                borderRadius: '50%',
                border: `2px solid ${colors.primary}`,
                opacity: 0.6,
              }}
            />

            {/* خلفية الصورة */}
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'white',
                border: `3px solid ${colors.primary}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                position: 'relative',
                zIndex: 2,
              }}
            >
              {nodeDatum.avatar ? (
                <img
                  src={nodeDatum.avatar}
                  alt={nodeDatum.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '50%',
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                style={{
                  fontSize: '24px',
                  color: colors.primary,
                  display: nodeDatum.avatar ? 'none' : 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                }}
              >
                👤
              </div>
            </div>
          </div>

          {/* منطقة المعلومات */}
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '15px',
              right: '15px',
              height: '50px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
            }}
          >
            {/* اسم الشخص */}
            <div
              style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#f8fafc',
                textAlign: 'center',
                marginBottom: '4px',
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                lineHeight: 1.2,
              }}
            >
              {getDisplayName(nodeDatum.name)}
            </div>

            {/* معلومات إضافية */}
            <div
              style={{
                display: 'flex',
                gap: '16px',
                fontSize: '12px',
                color: '#cbd5e1',
              }}
            >
              {nodeDatum.age && (
                <span>{nodeDatum.age} سنة</span>
              )}
              {nodeDatum.phone && (
                <span style={{ direction: 'ltr' }}>
                  📱 {nodeDatum.phone.substring(0, 8)}...
                </span>
              )}
            </div>
          </div>

          {/* شارة عدد الأطفال */}
          {nodeDatum.children && nodeDatum.children.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '120px',
                right: '20px',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: '#10b981',
                border: '2px solid white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '11px',
                fontWeight: '600',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            >
              {nodeDatum.children.length}
            </div>
          )}

          {/* شارة الشجرة الموسعة */}
          {nodeDatum.isExtended && (
            <div
              style={{
                position: 'absolute',
                bottom: '75px',
                left: '20px',
                background: '#8b5cf6',
                border: '1px solid white',
                borderRadius: '9px',
                padding: '4px 12px',
                color: 'white',
                fontSize: '10px',
                fontWeight: '500',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            >
              موسع
            </div>
          )}

          {/* أزرار التفاعل */}
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              display: 'flex',
              gap: '8px',
              opacity: 0,
              transform: 'translateY(-10px)',
              transition: 'all 0.3s ease',
            }}
            className="card-actions"
          >
            {/* زر التعديل */}
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.2s ease',
              }}
              onClick={handleEditClick}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <span style={{ color: 'white', fontSize: '14px' }}>✏️</span>
            </div>

            {/* زر العرض */}
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.2s ease',
              }}
              onClick={handleViewClick}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <span style={{ color: 'white', fontSize: '14px' }}>👁️</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModernFamilyNodeHTML;