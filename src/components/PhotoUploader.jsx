// src/components/PhotoUploader.jsx
// مكون رفع وعرض صور الأشخاص

import React, { useState, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Badge from '@mui/material/Badge';
import Alert from '@mui/material/Alert';
import CameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import MaleIcon from '@mui/icons-material/Male';
import FemaleIcon from '@mui/icons-material/Female';
import ZoomIcon from '@mui/icons-material/ZoomIn';
import CloseIcon from '@mui/icons-material/Close';

import {
  validateImageFile,
  uploadAndUpdatePersonPhoto,
  deletePersonPhoto,
  getDefaultAvatar
} from '../services/imageService';

// =============================================
// 🎨 الأنماط
// =============================================
const styles = {
  container: {
    position: 'relative',
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1
  },
  avatarWrapper: {
    position: 'relative',
    cursor: 'pointer',
    '&:hover .photo-overlay': {
      opacity: 1
    }
  },
  avatar: {
    width: 120,
    height: 120,
    border: '3px solid',
    borderColor: 'primary.main',
    boxShadow: 2,
    fontSize: '2.5rem',
    transition: 'all 0.3s ease'
  },
  avatarSmall: {
    width: 60,
    height: 60,
    fontSize: '1.5rem'
  },
  avatarLarge: {
    width: 180,
    height: 180,
    fontSize: '4rem'
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.3s ease'
  },
  hiddenInput: {
    display: 'none'
  },
  actionButtons: {
    display: 'flex',
    gap: 0.5,
    mt: 1
  }
};

// =============================================
// 🖼️ المكون الرئيسي
// =============================================
export default function PhotoUploader({
  person,
  tribeId,
  size = 'medium', // small, medium, large
  editable = true,
  onPhotoChange,
  showName = false
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  const fileInputRef = useRef(null);
  
  // تحديد حجم الـ Avatar
  const avatarSize = {
    small: styles.avatarSmall,
    medium: {},
    large: styles.avatarLarge
  }[size] || {};
  
  // الحصول على الصورة الافتراضية
  const defaultAvatar = getDefaultAvatar(person?.gender, person?.first_name);
  
  // =============================================
  // 📤 رفع الصورة
  // =============================================
  const handleFileSelect = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // إعادة تعيين input للسماح برفع نفس الملف مرة أخرى
    event.target.value = '';
    
    // التحقق من الملف
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.errors.join(', '));
      return;
    }
    
    setError(null);
    setUploading(true);
    
    try {
      const newUrl = await uploadAndUpdatePersonPhoto(tribeId, person.id, file);
      
      // إعلام المكون الأب
      if (onPhotoChange) {
        onPhotoChange(newUrl);
      }
      
    } catch (err) {
      console.error('خطأ في رفع الصورة:', err);
      setError(err.message || 'فشل في رفع الصورة');
    } finally {
      setUploading(false);
    }
  }, [tribeId, person?.id, onPhotoChange]);
  
  // =============================================
  // 🗑️ حذف الصورة
  // =============================================
  const handleDelete = useCallback(async () => {
    setConfirmDelete(false);
    setUploading(true);
    
    try {
      // استخراج مسار الملف من الرابط
      const photoPath = person?.photo_url ? 
        new URL(person.photo_url).pathname.split('/').slice(-3).join('/') : null;
      
      await deletePersonPhoto(tribeId, person.id, photoPath);
      
      if (onPhotoChange) {
        onPhotoChange(null);
      }
      
    } catch (err) {
      console.error('خطأ في حذف الصورة:', err);
      setError(err.message || 'فشل في حذف الصورة');
    } finally {
      setUploading(false);
    }
  }, [tribeId, person?.id, person?.photo_url, onPhotoChange]);
  
  // =============================================
  // 🖱️ معالجة النقر
  // =============================================
  const handleAvatarClick = () => {
    if (person?.photo_url) {
      setPreviewOpen(true);
    } else if (editable) {
      fileInputRef.current?.click();
    }
  };
  
  const handleUploadClick = (e) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };
  
  // =============================================
  // 🎨 العرض
  // =============================================
  return (
    <Box sx={styles.container}>
      {/* خطأ */}
      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          sx={{ mb: 1, maxWidth: 250 }}
        >
          {error}
        </Alert>
      )}
      
      {/* الصورة */}
      <Box sx={styles.avatarWrapper} onClick={handleAvatarClick}>
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          badgeContent={
            editable && !uploading ? (
              <Tooltip title="تغيير الصورة">
                <IconButton
                  size="small"
                  onClick={handleUploadClick}
                  sx={{
                    backgroundColor: 'primary.main',
                    color: 'white',
                    width: size === 'small' ? 24 : 32,
                    height: size === 'small' ? 24 : 32,
                    '&:hover': {
                      backgroundColor: 'primary.dark'
                    }
                  }}
                >
                  <CameraIcon sx={{ fontSize: size === 'small' ? 14 : 18 }} />
                </IconButton>
              </Tooltip>
            ) : null
          }
        >
          <Avatar
            src={person?.photo_url}
            sx={{
              ...styles.avatar,
              ...avatarSize,
              bgcolor: defaultAvatar.bgColor,
              color: defaultAvatar.color,
              borderColor: person?.gender === 'F' ? '#e91e63' : '#2196f3'
            }}
          >
            {uploading ? (
              <CircularProgress size={size === 'small' ? 20 : 40} color="inherit" />
            ) : person?.photo_url ? null : (
              person?.gender === 'F' ? <FemaleIcon sx={{ fontSize: 'inherit' }} /> :
              person?.gender === 'M' ? <MaleIcon sx={{ fontSize: 'inherit' }} /> :
              defaultAvatar.initial
            )}
          </Avatar>
        </Badge>
        
        {/* Overlay للتكبير */}
        {person?.photo_url && (
          <Box className="photo-overlay" sx={styles.overlay}>
            <ZoomIcon sx={{ color: 'white', fontSize: 32 }} />
          </Box>
        )}
      </Box>
      
      {/* الاسم */}
      {showName && person?.first_name && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {person.first_name}
        </Typography>
      )}
      
      {/* أزرار الإجراءات */}
      {editable && person?.photo_url && !uploading && (
        <Box sx={styles.actionButtons}>
          <Tooltip title="حذف الصورة">
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(true);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
      
      {/* input مخفي للملف */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        style={styles.hiddenInput}
      />
      
      {/* نافذة المعاينة */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography>
            {person?.first_name} {person?.father_name}
          </Typography>
          <IconButton onClick={() => setPreviewOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box
            component="img"
            src={person?.photo_url}
            alt={person?.first_name}
            sx={{
              maxWidth: '100%',
              maxHeight: '70vh',
              objectFit: 'contain',
              borderRadius: 2
            }}
          />
        </DialogContent>
        {editable && (
          <DialogActions>
            <Button
              startIcon={<CameraIcon />}
              onClick={() => {
                setPreviewOpen(false);
                fileInputRef.current?.click();
              }}
            >
              تغيير الصورة
            </Button>
            <Button
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => {
                setPreviewOpen(false);
                setConfirmDelete(true);
              }}
            >
              حذف
            </Button>
          </DialogActions>
        )}
      </Dialog>
      
      {/* تأكيد الحذف */}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>حذف الصورة؟</DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف صورة {person?.first_name}؟
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>
            إلغاء
          </Button>
          <Button color="error" onClick={handleDelete}>
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// =============================================
// 🖼️ مكون عرض الصورة فقط (بدون تحرير)
// =============================================
export function PersonAvatar({ person, size = 'medium', onClick }) {
  const defaultAvatar = getDefaultAvatar(person?.gender, person?.first_name);
  
  const sizeMap = {
    small: { width: 40, height: 40, fontSize: '1rem' },
    medium: { width: 56, height: 56, fontSize: '1.5rem' },
    large: { width: 80, height: 80, fontSize: '2rem' }
  };
  
  const avatarSize = sizeMap[size] || sizeMap.medium;
  
  return (
    <Avatar
      src={person?.photo_url}
      onClick={onClick}
      sx={{
        ...avatarSize,
        bgcolor: defaultAvatar.bgColor,
        color: defaultAvatar.color,
        cursor: onClick ? 'pointer' : 'default',
        border: '2px solid',
        borderColor: person?.gender === 'F' ? '#e91e63' : '#2196f3'
      }}
    >
      {person?.photo_url ? null : (
        person?.gender === 'F' ? <FemaleIcon sx={{ fontSize: avatarSize.fontSize }} /> :
        person?.gender === 'M' ? <MaleIcon sx={{ fontSize: avatarSize.fontSize }} /> :
        defaultAvatar.initial
      )}
    </Avatar>
  );
}
