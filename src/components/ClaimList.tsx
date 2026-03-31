import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardList, CheckCircle, XCircle, Clock, DollarSign, MessageSquare, ChevronRight, Shield } from 'lucide-react';

interface Claim {
  id: string;
  policyholderId: string;
  description: string;
  images: string[];
  firUrl?: string;
  aiAnalysis: {
    bertConsistency: string;
    cnnDamageDetection: string;
    fraudScore: number;
  };
  predictedAmount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
  feedback?: string;
}

export const ClaimList: React.FC = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'claims'),
      where('policyholderId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Claim[];
      setClaims(docs.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'claims');
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My Claims</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4 text-amber-500" />
          Real-time updates active
        </div>
      </div>

      {claims.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-3xl border-2 border-dashed border-gray-100">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No claims submitted yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {claims.map((claim) => (
            <motion.div
              key={claim.id}
              layoutId={claim.id}
              onClick={() => setSelectedClaim(claim)}
              className="group p-6 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg ${
                  claim.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  claim.status === 'approved' ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {claim.status}
                </div>
                <span className="text-xs text-gray-400 font-medium">
                  {claim.createdAt.toDate().toLocaleDateString()}
                </span>
              </div>

              <h3 className="font-bold text-gray-900 mb-2 line-clamp-1">{claim.description}</h3>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-1.5 text-sm font-bold text-blue-600">
                  <DollarSign className="w-4 h-4" />
                  {claim.predictedAmount.toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Shield className="w-3.5 h-3.5" />
                  AI Verified
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-50 group-hover:border-blue-50">
                <span className="text-xs font-semibold text-gray-400 group-hover:text-blue-600 transition-colors">
                  View Details
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedClaim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">Claim Summary</h3>
                    <p className="text-sm text-gray-500">Submitted on {selectedClaim.createdAt.toDate().toLocaleString()}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedClaim(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Description</h4>
                    <p className="text-sm text-gray-700 leading-relaxed">{selectedClaim.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <h4 className="text-xs font-bold text-blue-900/60 uppercase mb-1">AI Prediction</h4>
                      <div className="text-xl font-black text-blue-600 flex items-center">
                        <DollarSign className="w-5 h-5" />
                        {selectedClaim.predictedAmount.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">Status</h4>
                      <div className={`text-xl font-black uppercase ${
                        selectedClaim.status === 'pending' ? 'text-amber-600' :
                        selectedClaim.status === 'approved' ? 'text-green-600' :
                        'text-red-600'
                      }`}>
                        {selectedClaim.status}
                      </div>
                    </div>
                  </div>

                  {selectedClaim.feedback && (
                    <div className={`p-4 rounded-2xl border ${
                      selectedClaim.status === 'approved' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
                    }`}>
                      <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Assessor Feedback
                      </h4>
                      <p className="text-sm text-gray-700 italic">"{selectedClaim.feedback}"</p>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setSelectedClaim(null)}
                  className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
