
import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  FileSpreadsheet, 
  Trash2, 
  Plus, 
  Loader2, 
  Camera, 
  History as HistoryIcon,
  LayoutDashboard,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { analyzeDocument } from '../services/geminiService';
import { exportToExcel } from '../services/excelService';
import { DocumentData, DocumentEntry, HistoryRecord } from '../types';

export default function Dashboard() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<DocumentData | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [error, setError] = useState<string | null>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('basira_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('basira_history', JSON.stringify(history));
  }, [history]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setCurrentFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setExtractedData(null);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png'] },
    multiple: false
  });

  const handleAnalyze = async () => {
    if (!previewUrl) return;
    
    setIsAnalyzing(true);
    setError(null);
    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      
      const base64 = await base64Promise;
      const result = await analyzeDocument(base64, blob.type);
      setExtractedData(result);

      // Add to history
      const newRecord: HistoryRecord = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        fileName: currentFile?.name || 'مستند مصور',
        data: result,
        imageUrl: previewUrl
      };
      setHistory(prev => [newRecord, ...prev]);
    } catch (err: any) {
      console.error(err);
      setError("حدث خطأ أثناء تحليل المستند. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExport = () => {
    if (extractedData) {
      const fileName = `بصيرة_${extractedData.documentType}_${extractedData.referenceNumber || Date.now()}.xlsx`;
      exportToExcel(extractedData, fileName);
    }
  };

  const updateEntry = (id: string, field: keyof DocumentEntry, value: string) => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      entries: extractedData.entries.map(e => e.id === id ? { ...e, [field]: value } : e)
    });
  };

  const addEntry = () => {
    if (!extractedData) return;
    const newEntry: DocumentEntry = {
      id: `entry-${Date.now()}`,
      productName: '',
      quantity: '',
      unit: '',
      notes: ''
    };
    setExtractedData({
      ...extractedData,
      entries: [...extractedData.entries, newEntry]
    });
  };

  const removeEntry = (id: string) => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      entries: extractedData.entries.filter(e => e.id !== id)
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900" dir="rtl">
      {/* Sidebar / Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white px-4 py-2 md:relative md:top-0 md:flex md:h-16 md:items-center md:justify-between md:border-b md:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <FileText size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">بصيرة</span>
        </div>
        
        <div className="mt-2 flex justify-around gap-2 md:mt-0">
          <button 
            onClick={() => setActiveTab('new')}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === 'new' ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            <LayoutDashboard size={18} />
            <span>مسح جديد</span>
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === 'history' ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            <HistoryIcon size={18} />
            <span>السجل</span>
          </button>
        </div>
      </nav>

      <main className="container mx-auto max-w-6xl p-4 pb-24 md:p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'new' ? (
            <motion.div
              key="new-scan"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid gap-8 lg:grid-cols-12"
            >
              {/* Left Column: Upload & Preview */}
              <div className="lg:col-span-5 space-y-6">
                <div 
                  {...getRootProps()} 
                  className={cn(
                    "relative flex aspect-[4/3] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all",
                    isDragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-white hover:border-blue-400"
                  )}
                >
                  <input {...getInputProps()} />
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="h-full w-full rounded-2xl object-contain p-2" />
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-center p-6">
                      <div className="rounded-full bg-slate-100 p-4 text-slate-400">
                        <Upload size={32} />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-slate-700">اسحب الصورة هنا أو اضغط للاختيار</p>
                        <p className="text-sm text-slate-500 mt-1">يدعم JPEG, PNG وبصور واضحة</p>
                      </div>
                    </div>
                  )}
                  
                  {previewUrl && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setPreviewUrl(null); setCurrentFile(null); setExtractedData(null); }}
                      className="absolute top-4 right-4 rounded-full bg-white/80 p-2 text-red-500 shadow-sm hover:bg-white"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    disabled={!previewUrl || isAnalyzing}
                    onClick={handleAnalyze}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 font-semibold text-white shadow-lg transition-all hover:bg-blue-700 active:scale-95 disabled:bg-slate-300"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        <span>جاري التحليل...</span>
                      </>
                    ) : (
                      <>
                        <Camera size={20} />
                        <span>تحليل المستند</span>
                      </>
                    )}
                  </button>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-red-600">
                    <AlertCircle size={20} />
                    <p className="text-sm">{error}</p>
                  </div>
                )}
              </div>

              {/* Right Column: Results */}
              <div className="lg:col-span-7">
                <div className="rounded-2xl border bg-white p-6 shadow-sm">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">بيانات المستند</h2>
                      <p className="text-sm text-slate-500">راجع البيانات المستخرجة وقم بتعديلها إذا لزم الأمر</p>
                    </div>
                    {extractedData && (
                      <button 
                        onClick={handleExport}
                        className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100"
                      >
                        <Download size={18} />
                        <span>تصدير إكسيل</span>
                      </button>
                    )}
                  </div>

                  {!extractedData && !isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                      <FileSpreadsheet size={64} strokeWidth={1} />
                      <p className="mt-4">ارفع صورة لبدء التحليل التلقائي</p>
                    </div>
                  ) : isAnalyzing ? (
                    <div className="space-y-4 py-10">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100"></div>
                      <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100"></div>
                      <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100"></div>
                      <div className="h-32 w-full animate-pulse rounded bg-slate-100"></div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">نوع المستند</label>
                          <select 
                            value={extractedData!.documentType} 
                            onChange={(e) => setExtractedData({...extractedData!, documentType: e.target.value as any})}
                            className="mt-1 w-full rounded-lg border-slate-200 bg-slate-50 p-2 text-sm focus:ring-blue-500"
                          >
                            <option value="صرف">إذن صرف</option>
                            <option value="استلام">إذن استلام</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">التاريخ</label>
                          <input 
                            type="text" 
                            value={extractedData!.date} 
                            onChange={(e) => setExtractedData({...extractedData!, date: e.target.value})}
                            className="mt-1 w-full rounded-lg border-slate-200 bg-slate-50 p-2 text-sm focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">رقم المرجع</label>
                          <input 
                            type="text" 
                            value={extractedData!.referenceNumber} 
                            onChange={(e) => setExtractedData({...extractedData!, referenceNumber: e.target.value})}
                            className="mt-1 w-full rounded-lg border-slate-200 bg-slate-50 p-2 text-sm focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-xl border border-slate-100">
                        <table className="w-full text-right text-sm">
                          <thead className="bg-slate-50 text-slate-500 uppercase">
                            <tr>
                              <th className="p-3 font-medium">اسم المنتج</th>
                              <th className="p-3 font-medium">الكمية</th>
                              <th className="p-3 font-medium text-center">الإجراءات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {extractedData!.entries.map((entry) => (
                              <tr key={entry.id}>
                                <td className="p-3">
                                  <input 
                                    className="w-full border-none bg-transparent p-0 focus:ring-0" 
                                    value={entry.productName}
                                    onChange={(e) => updateEntry(entry.id, 'productName', e.target.value)}
                                  />
                                </td>
                                <td className="p-3">
                                  <input 
                                    className="w-full border-none bg-transparent p-0 focus:ring-0" 
                                    value={entry.quantity}
                                    onChange={(e) => updateEntry(entry.id, 'quantity', e.target.value)}
                                  />
                                </td>
                                <td className="p-3 text-center">
                                  <button onClick={() => removeEntry(entry.id)} className="text-slate-300 hover:text-red-500">
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <button 
                        onClick={addEntry}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-slate-500 transition-all hover:bg-slate-50"
                      >
                        <Plus size={18} />
                        <span>إضافة صنف جديد</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">سجل العمليات</h2>
                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                  {history.length} مستندات
                </span>
              </div>

              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl bg-white py-20 text-slate-400 shadow-sm border border-slate-100">
                  <HistoryIcon size={64} strokeWidth={1} />
                  <p className="mt-4">لا توجد سجلات سابقة</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {history.map((record) => (
                    <div key={record.id} className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md">
                      <div className="relative aspect-video">
                        <img src={record.imageUrl} alt={record.fileName} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        <div className="absolute bottom-3 right-3 text-white">
                          <p className="text-xs opacity-80">{new Date(record.timestamp).toLocaleDateString('ar-EG')}</p>
                          <p className="font-semibold">{record.data.documentType}</p>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="mb-4 space-y-1">
                          <p className="text-sm font-medium text-slate-800 truncate">{record.fileName}</p>
                          <p className="text-xs text-slate-500">تم استخراج {record.data.entries.length} أصناف</p>
                        </div>
                        <button 
                          onClick={() => {
                            setExtractedData(record.data);
                            setPreviewUrl(record.imageUrl);
                            setActiveTab('new');
                          }}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                        >
                          <FileText size={16} />
                          <span>فتح ومراجعة</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Success Indicator */}
      <AnimatePresence>
        {extractedData && activeTab === 'new' && !isAnalyzing && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-6 py-3 text-white shadow-2xl flex items-center gap-3 z-50 md:bottom-12"
          >
            <CheckCircle2 size={20} className="text-green-400" />
            <span className="text-sm font-medium">تم تحليل المستند بنجاح!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
