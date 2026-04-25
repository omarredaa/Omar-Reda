
import * as XLSX from 'xlsx';
import { DocumentData } from '../types';

export function exportToExcel(data: DocumentData, fileName: string = 'document_analysis.xlsx') {
  const worksheetData = data.entries.map((entry, index) => ({
    '#': index + 1,
    'نوع المستند': data.documentType,
    'التاريخ': data.date || '',
    'رقم المرجع': data.referenceNumber || '',
    'اسم المنتج': entry.productName,
    'الكمية': entry.quantity,
    'الوحدة': entry.unit || '',
    'ملاحظات': entry.notes || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'البيانات المُستخرجة');

  // Set column widths for RTL/Arabic content
  const maxWidths = [
    { wch: 5 },  // #
    { wch: 15 }, // النوع
    { wch: 15 }, // التاريخ
    { wch: 15 }, // المرجع
    { wch: 30 }, // المنتج
    { wch: 10 }, // الكمية
    { wch: 10 }, // الوحدة
    { wch: 30 }, // ملاحظات
  ];
  worksheet['!cols'] = maxWidths;

  XLSX.writeFile(workbook, fileName);
}
