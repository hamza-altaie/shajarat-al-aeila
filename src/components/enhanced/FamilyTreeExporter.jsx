import React, { useState, useRef } from 'react';
import * as d3 from 'd3';

const FamilyTreeExporter = ({ treeData, svgRef }) => {
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('png');
  const [exportQuality, setExportQuality] = useState('high');
  const canvasRef = useRef(null);

  // إعدادات الجودة
  const qualitySettings = {
    low: { scale: 1, quality: 0.7 },
    medium: { scale: 2, quality: 0.8 },
    high: { scale: 3, quality: 0.9 },
    ultra: { scale: 4, quality: 1.0 }
  };

  /**
   * تصدير كـ SVG
   */
  const exportAsSVG = async () => {
    if (!svgRef.current) return;

    try {
      setExporting(true);

      const svgElement = svgRef.current;
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(svgElement);

      // تحسين SVG للتصدير
      svgString = svgString.replace(/&nbsp;/g, ' ');
      svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;

      // إضافة خطوط عربية
      const styleSheet = `
        <defs>
          <style type="text/css">
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
            text { 
              font-family: 'Cairo', 'Tahoma', Arial, sans-serif !important; 
              direction: rtl;
            }
          </style>
        </defs>
      `;
      
      svgString = svgString.replace('<svg', styleSheet + '<svg');

      downloadFile(svgString, 'family-tree.svg', 'image/svg+xml');

    } catch (error) {
      console.error('خطأ في تصدير SVG:', error);
      alert('حدث خطأ أثناء التصدير');
    } finally {
      setExporting(false);
    }
  };

  /**
   * تصدير كصورة PNG
   */
  const exportAsPNG = async () => {
    if (!svgRef.current) return;

    try {
      setExporting(true);

      const svgElement = svgRef.current;
      const settings = qualitySettings[exportQuality];
      
      // إنشاء canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // حساب الأبعاد
      const bbox = svgElement.getBBox();
      const width = (bbox.width + 100) * settings.scale;
      const height = (bbox.height + 100) * settings.scale;
      
      canvas.width = width;
      canvas.height = height;

      // خلفية بيضاء
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // تحويل SVG إلى صورة
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const img = new Image();
      
      await new Promise((resolve, reject) => {
        img.onload = () => {
          ctx.drawImage(img, 50 * settings.scale, 50 * settings.scale);
          resolve();
        };
        img.onerror = reject;
        
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
        img.src = URL.createObjectURL(svgBlob);
      });

      // تصدير النتيجة
      canvas.toBlob((blob) => {
        downloadBlob(blob, 'family-tree.png');
      }, 'image/png', settings.quality);

    } catch (error) {
      console.error('خطأ في تصدير PNG:', error);
      alert('حدث خطأ أثناء التصدير');
    } finally {
      setExporting(false);
    }
  };

  /**
   * تصدير كـ JSON
   */
  const exportAsJSON = () => {
    if (!treeData) return;

    try {
      setExporting(true);

      const jsonData = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0',
          format: 'family-tree-json',
          totalPersons: countPersons(treeData)
        },
        familyTree: treeData
      };

      const jsonString = JSON.stringify(jsonData, null, 2);
      downloadFile(jsonString, 'family-tree.json', 'application/json');

    } catch (error) {
      console.error('خطأ في تصدير JSON:', error);
      alert('حدث خطأ أثناء التصدير');
    } finally {
      setExporting(false);
    }
  };

  /**
   * تصدير كـ CSV
   */
  const exportAsCSV = () => {
    if (!treeData) return;

    try {
      setExporting(true);

      const persons = [];
      
      // تجميع جميع الأشخاص
      const collectPersons = (node, parentName = '', depth = 0) => {
        if (!node) return;

        persons.push({
          name: node.name || '',
          fullName: node.fullName || '',
          relation: node.relation || '',
          parent: parentName,
          depth: depth,
          familyUid: node.familyUid || '',
          phone: node.phone || '',
          birthDate: node.birthDate || '',
          isHead: node.isHead ? 'نعم' : 'لا'
        });

        if (node.children) {
          node.children.forEach(child => 
            collectPersons(child, node.name, depth + 1)
          );
        }
      };

      collectPersons(treeData);

      // تحويل إلى CSV
      const headers = ['الاسم', 'الاسم الكامل', 'العلاقة', 'الوالد', 'المستوى', 'معرف العائلة', 'الهاتف', 'تاريخ الميلاد', 'رب العائلة'];
      const csvContent = [
        headers.join(','),
        ...persons.map(person => [
          `"${person.name}"`,
          `"${person.fullName}"`,
          `"${person.relation}"`,
          `"${person.parent}"`,
          person.depth,
          `"${person.familyUid}"`,
          `"${person.phone}"`,
          `"${person.birthDate}"`,
          `"${person.isHead}"`
        ].join(','))
      ].join('\n');

      // إضافة BOM للدعم العربي
      const csvWithBOM = '\uFEFF' + csvContent;
      downloadFile(csvWithBOM, 'family-tree.csv', 'text/csv');

    } catch (error) {
      console.error('خطأ في تصدير CSV:', error);
      alert('حدث خطأ أثناء التصدير');
    } finally {
      setExporting(false);
    }
  };

  /**
   * تصدير كـ PDF (مبسط)
   */
  const exportAsPDF = async () => {
    try {
      setExporting(true);
      
      // تحويل SVG إلى صورة أولاً ثم إنشاء PDF
      await exportAsPNG();
      
      // هنا يمكن إضافة مكتبة PDF مخصصة لاحقاً
      alert('تم تصدير الصورة. يمكنك تحويلها إلى PDF باستخدام أدوات أخرى.');
      
    } catch (error) {
      console.error('خطأ في تصدير PDF:', error);
      alert('حدث خطأ أثناء التصدير');
    } finally {
      setExporting(false);
    }
  };

  /**
   * تصدير كـ HTML تفاعلي
   */
  const exportAsHTML = () => {
    if (!treeData) return;

    try {
      setExporting(true);

      const htmlTemplate = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>شجرة العائلة</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Cairo', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            direction: rtl;
        }
        .tree-container {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .person-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            margin: 10px;
            border-radius: 10px;
            display: inline-block;
            min-width: 200px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }
        .person-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .person-relation {
            font-size: 14px;
            opacity: 0.9;
        }
        .generation {
            margin: 20px 0;
            border-bottom: 2px solid #eee;
            padding-bottom: 10px;
        }
        .generation-title {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin-bottom: 15px;
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
        }
        .export-info {
            text-align: center;
            color: #666;
            margin-bottom: 20px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="tree-container">
        <h1>🌳 شجرة العائلة</h1>
        <div class="export-info">
            تم التصدير في: ${new Date().toLocaleDateString('ar-EG')} | 
            إجمالي الأشخاص: ${countPersons(treeData)}
        </div>
        ${generateHTMLTree(treeData)}
    </div>
</body>
</html>`;

      downloadFile(htmlTemplate, 'family-tree.html', 'text/html');

    } catch (error) {
      console.error('خطأ في تصدير HTML:', error);
      alert('حدث خطأ أثناء التصدير');
    } finally {
      setExporting(false);
    }
  };

  // دوال مساعدة
  const countPersons = (node) => {
    if (!node) return 0;
    let count = 1;
    if (node.children) {
      count += node.children.reduce((sum, child) => sum + countPersons(child), 0);
    }
    return count;
  };

  const generateHTMLTree = (node, generation = 1) => {
    if (!node) return '';

    let html = `
      <div class="generation">
        <div class="generation-title">الجيل ${generation}</div>
        <div class="person-card">
          <div class="person-name">${node.name}</div>
          <div class="person-relation">${node.relation}</div>
          ${node.phone ? `<div style="font-size: 12px; margin-top: 5px;">📞 ${node.phone}</div>` : ''}
        </div>
      </div>
    `;

    if (node.children && node.children.length > 0) {
      html += node.children.map(child => generateHTMLTree(child, generation + 1)).join('');
    }

    return html;
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    downloadBlob(blob, filename);
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // معالج التصدير الرئيسي
  const handleExport = async () => {
    switch (exportFormat) {
      case 'svg':
        await exportAsSVG();
        break;
      case 'png':
        await exportAsPNG();
        break;
      case 'json':
        exportAsJSON();
        break;
      case 'csv':
        exportAsCSV();
        break;
      case 'html':
        exportAsHTML();
        break;
      case 'pdf':
        await exportAsPDF();
        break;
      default:
        alert('صيغة غير مدعومة');
    }
  };

  return (
    <div style={{
      background: 'white',
      padding: '16px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      maxWidth: '400px'
    }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#333', textAlign: 'center' }}>
        📤 تصدير شجرة العائلة
      </h3>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          صيغة التصدير:
        </label>
        <select 
          value={exportFormat} 
          onChange={(e) => setExportFormat(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          <option value="png">🖼️ صورة PNG</option>
          <option value="svg">📊 ملف SVG</option>
          <option value="json">📋 بيانات JSON</option>
          <option value="csv">📈 جدول CSV</option>
          <option value="html">🌐 صفحة HTML</option>
          <option value="pdf">📄 ملف PDF</option>
        </select>
      </div>

      {(exportFormat === 'png' || exportFormat === 'pdf') && (
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            جودة التصدير:
          </label>
          <select 
            value={exportQuality} 
            onChange={(e) => setExportQuality(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="low">منخفضة (سريع)</option>
            <option value="medium">متوسطة</option>
            <option value="high">عالية (موصى به)</option>
            <option value="ultra">فائقة (بطيء)</option>
          </select>
        </div>
      )}

      <div style={{ marginBottom: '16px', padding: '8px', background: '#f8f9fa', borderRadius: '4px' }}>
        <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.4' }}>
          <strong>معلومات الملف:</strong><br/>
          {exportFormat === 'png' && '• صورة عالية الجودة للطباعة'}
          {exportFormat === 'svg' && '• رسم متجه قابل للتحرير'}
          {exportFormat === 'json' && '• بيانات منظمة للبرمجة'}
          {exportFormat === 'csv' && '• جدول بيانات للاكسل'}
          {exportFormat === 'html' && '• صفحة ويب تفاعلية'}
          {exportFormat === 'pdf' && '• مستند للطباعة والمشاركة'}
        </div>
      </div>

      <button 
        onClick={handleExport}
        disabled={exporting || !treeData}
        style={{
          width: '100%',
          padding: '12px',
          background: exporting ? '#ccc' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: exporting ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s'
        }}
      >
        {exporting ? (
          <span>
            ⏳ جاري التصدير...
          </span>
        ) : (
          <span>
            📥 تصدير ({exportFormat.toUpperCase()})
          </span>
        )}
      </button>

      {!treeData && (
        <div style={{ 
          marginTop: '8px', 
          color: '#ff6b6b', 
          fontSize: '12px', 
          textAlign: 'center' 
        }}>
          ⚠️ لا توجد بيانات للتصدير
        </div>
      )}

      <div style={{ 
        marginTop: '12px', 
        padding: '8px', 
        background: '#e3f2fd', 
        borderRadius: '4px',
        fontSize: '11px',
        color: '#1565c0'
      }}>
        💡 <strong>نصيحة:</strong> استخدم PNG للصور، SVG للتحرير، CSV للبيانات
      </div>
    </div>
  );
};

export default FamilyTreeExporter;