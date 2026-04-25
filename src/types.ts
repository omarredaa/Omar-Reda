
export interface DocumentEntry {
  id: string;
  productName: string;
  quantity: string;
  unit: string;
  notes?: string;
}

export interface DocumentData {
  documentType: 'صرف' | 'استلام' | 'غير معروف';
  date: string;
  referenceNumber: string;
  entries: DocumentEntry[];
  rawText?: string;
}

export interface HistoryRecord {
  id: string;
  timestamp: string;
  fileName: string;
  data: DocumentData;
  imageUrl: string;
}
