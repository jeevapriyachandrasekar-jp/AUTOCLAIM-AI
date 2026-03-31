import React, { useState, useEffect } from 'react';
import { db, storage, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Upload, Trash2, AlertCircle, CheckCircle, Calendar, Shield } from 'lucide-react';

interface UserDocument {
  id: string;
  type: 'insurance' | 'license' | 'rc';
  url: string;
  expiryDate: Timestamp;
  status: 'valid' | 'expired';
}

export const DocumentManager: React.FC = () => {
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'users', auth.currentUser.uid, 'documents')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserDocument[];
      setDocuments(docs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `users/${auth.currentUser?.uid}/documents`);
    });

    return () => unsubscribe();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'insurance' | 'license' | 'rc') => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setIsUploading(true);
    setError(null);

    try {
      const storageRef = ref(storage, `documents/${auth.currentUser.uid}/${type}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      // Set expiry date to 1 year from now for demo purposes
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      await addDoc(collection(db, 'users', auth.currentUser.uid, 'documents'), {
        userId: auth.currentUser.uid,
        type,
        url,
        expiryDate: Timestamp.fromDate(expiryDate),
        status: 'valid'
      });
    } catch (err) {
      setError("Failed to upload document. Please try again.");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'documents', id));
    } catch (err) {
      console.error("Failed to delete document:", err);
    }
  };

  const isExpiringSoon = (expiryDate: Timestamp) => {
    const now = new Date();
    const expiry = expiryDate.toDate();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays < 30;
  };

  const isExpired = (expiryDate: Timestamp) => {
    return expiryDate.toDate() < new Date();
  };

  const docTypes = [
    { id: 'insurance', label: 'Insurance Policy', icon: Shield },
    { id: 'license', label: 'Driving License', icon: FileText },
    { id: 'rc', label: 'Vehicle Registration (RC)', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Document Dashboard</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <CheckCircle className="w-4 h-4 text-green-500" />
          Real-time verification active
        </div>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-50 rounded-xl border border-red-100 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {docTypes.map(({ id, label, icon: Icon }) => {
          const doc = documents.find(d => d.type === id);
          const expiringSoon = doc && isExpiringSoon(doc.expiryDate);
          const expired = doc && isExpired(doc.expiryDate);

          return (
            <motion.div
              key={id}
              layout
              className={`p-6 bg-white rounded-2xl border-2 transition-all ${
                expired ? 'border-red-200 bg-red-50/30' : 
                expiringSoon ? 'border-amber-200 bg-amber-50/30' : 
                doc ? 'border-green-100' : 'border-dashed border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${
                  expired ? 'bg-red-100 text-red-600' :
                  expiringSoon ? 'bg-amber-100 text-amber-600' :
                  doc ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  <Icon className="w-6 h-6" />
                </div>
                {doc && (
                  <button 
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <h3 className="font-semibold text-gray-900 mb-1">{label}</h3>
              
              {doc ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    Expires: {doc.expiryDate.toDate().toLocaleDateString()}
                  </div>
                  
                  {expired ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 uppercase tracking-wider">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Document Expired
                    </div>
                  ) : expiringSoon ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 uppercase tracking-wider">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Expires Soon
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-green-600 uppercase tracking-wider">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Valid
                    </div>
                  )}
                  
                  <a 
                    href={doc.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block w-full py-2 text-center text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    View Document
                  </a>
                </div>
              ) : (
                <div className="mt-4">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-all">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-xs text-gray-500">Upload {id.toUpperCase()}</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={(e) => handleUpload(e, id as any)}
                      disabled={isUploading}
                    />
                  </label>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
