// src/components/enhanced/FamilyTreeExporter.jsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
  Alert
} from '@mui/material';
import { Download, Image, PictureAsPdf, TableChart } from '@mui/icons-material';

const FamilyTreeExporter = ({ 
  open, 
  onClose, 
  treeData, 
  familyData 
}) => {
  const [exportFormat, setExportFormat] = useState('png');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  // تصدير كصورة PNG
  const exportAsPNG = async () => {
    try {
      // هنا يمكن إضافة منطق تصدير الشجرة كصورة
      // باستخدام html2canvas أو مكتبة أخرى
      console.log('تصدير PNG');
    } catch (err) {
      setError('فشل في تصدير الصورة');
    }
  };

  // تصدير كـ PDF
  const exportAsPDF = async () => {
    try {
      console.log('تصدير PDF');
    } catch (err) {
      setError('فشل في تصدير PDF');
    }
  };

  // تصدير كـ CSV
  const exportAsCSV = async () => {
    try {
      if (!familyData || familyData.length === 0) {
        setError('لا توجد بيانات للتصدير');
        return;
      }

      const csvHeaders = [
        'الاسم الأول',
        'اسم الأب', 
        'اسم الجد',
        'اللقب',
        'العلاقة',
        'تاريخ الميلاد',
        'الهاتف'
      ];

      const csvRows = familyData.map(person => [
        person.firstName || '',
        person.fatherName || '',
        person.grandfatherName || '',
        person.surname || '',
        person.relation || '',
        person.birthdate || '',
        person.phone || ''
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `شجرة_العائلة_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
    } catch (err) {
      setError('فشل في تصدير CSV');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError('');

    try {
      switch (exportFormat) {
        case 'png':
          await exportAsPNG();
          break;
        case 'pdf':
          await exportAsPDF();
          break;
        case 'csv':
          await exportAsCSV();
          break;
        default:
          throw new Error('تنسيق غير مدعوم');
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Download />
          تصدير شجرة العائلة
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="h6" gutterBottom>
          اختر تنسيق التصدير:
        </Typography>

        <RadioGroup
          value={exportFormat}
          onChange={(e) => setExportFormat(e.target.value)}
        >
          <FormControlLabel
            value="png"
            control={<Radio />}
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <Image />
                صورة PNG - للمشاركة والعرض
              </Box>
            }
          />
          
          <FormControlLabel
            value="pdf"
            control={<Radio />}
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <PictureAsPdf />
                ملف PDF - للطباعة والحفظ
              </Box>
            }
          />
          
          <FormControlLabel
            value="csv"
            control={<Radio />}
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <TableChart />
                جدول CSV - للبيانات والتحليل
              </Box>
            }
          />
        </RadioGroup>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={exporting}>
          إلغاء
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          disabled={exporting}
          startIcon={exporting ? <CircularProgress size={20} /> : <Download />}
        >
          {exporting ? 'جاري التصدير...' : 'تصدير'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FamilyTreeExporter;