import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, onSnapshot, updateDoc, doc, Timestamp, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardList, CheckCircle, XCircle, MessageSquare, DollarSign, User, Calendar, Shield, AlertTriangle, ExternalLink } from 'lucide-react';

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

export const AssessorDashboard: React.FC = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'claims'));
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

  const handleDecision = async (status: 'approved' | 'rejected') => {
    if (!selectedClaim || !auth.currentUser) return;
    
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'claims', selectedClaim.id), {
        status,
        feedback,
        assessorId: auth.currentUser.uid,
        updatedAt: Timestamp.now()
      });
      setSelectedClaim(null);
      setFeedback('');
    } catch (err) {
      console.error("Failed to update claim:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Claims List */}
      <div className="lg:col-span-4 space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
            <ClipboardList className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Incoming Claims</h2>
        </div>

        <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 scrollbar-hide">
          {claims.map((claim) => (
            <motion.button
              key={claim.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedClaim(claim)}
              className={`w-full p-5 text-left rounded-2xl border-2 transition-all ${
                selectedClaim?.id === claim.id 
                  ? 'border-blue-500 bg-blue-50/50 shadow-md' 
                  : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg ${
                  claim.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  claim.status === 'approved' ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {claim.status}
                </span>
                <span className="text-xs text-gray-400 font-medium">
                  {claim.createdAt.toDate().toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900 line-clamp-1 mb-2">
                {claim.description}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <DollarSign className="w-3.5 h-3.5" />
                Est: ${claim.predictedAmount.toLocaleString()}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Claim Details */}
      <div className="lg:col-span-8">
        <AnimatePresence mode="wait">
          {selectedClaim ? (
            <motion.div
              key={selectedClaim.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden"
            >
              <div className="p-8 space-y-8">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Claim Details</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4" />
                        ID: {selectedClaim.policyholderId.slice(0, 8)}...
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {selectedClaim.createdAt.toDate().toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-gray-400 uppercase mb-1">AI Predicted Amount</div>
                    <div className="text-3xl font-black text-blue-600 flex items-center justify-end">
                      <DollarSign className="w-6 h-6" />
                      {selectedClaim.predictedAmount.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-gray-400 uppercase mb-3">Accident Description</h4>
                      <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        {selectedClaim.description}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-gray-400 uppercase mb-3">Evidence Images</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedClaim.images.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="relative group aspect-video rounded-xl overflow-hidden border border-gray-100">
                            <img src={url} alt="Evidence" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <ExternalLink className="w-5 h-5 text-white" />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>

                    {selectedClaim.firUrl && (
                      <a 
                        href={selectedClaim.firUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Shield className="w-5 h-5 text-blue-600" />
                          <span className="font-semibold text-gray-700">FIR Document</span>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </a>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 space-y-6">
                      <div className="flex items-center gap-2 text-blue-800 font-bold">
                        <Shield className="w-5 h-5" />
                        AI Analysis Report
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm">
                        <div className="text-sm font-semibold text-gray-600">Fraud Probability</div>
                        <div className={`flex items-center gap-1.5 font-bold ${selectedClaim.aiAnalysis.fraudScore > 50 ? 'text-red-600' : 'text-green-600'}`}>
                          {selectedClaim.aiAnalysis.fraudScore > 50 && <AlertTriangle className="w-4 h-4" />}
                          {selectedClaim.aiAnalysis.fraudScore}%
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h5 className="text-xs font-bold text-blue-900/60 uppercase mb-1">BERT Consistency</h5>
                          <p className="text-xs text-blue-800 leading-relaxed">{selectedClaim.aiAnalysis.bertConsistency}</p>
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-blue-900/60 uppercase mb-1">CNN Damage Detection</h5>
                          <p className="text-xs text-blue-800 leading-relaxed">{selectedClaim.aiAnalysis.cnnDamageDetection}</p>
                        </div>
                      </div>
                    </div>

                    {selectedClaim.status === 'pending' && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-400 uppercase">Assessor Decision</h4>
                        <textarea 
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="Provide feedback for the decision..."
                          className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <button 
                            onClick={() => handleDecision('rejected')}
                            disabled={isProcessing}
                            className="flex items-center justify-center gap-2 py-3 bg-white border-2 border-red-100 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-all"
                          >
                            <XCircle className="w-5 h-5" />
                            Reject
                          </button>
                          <button 
                            onClick={() => handleDecision('approved')}
                            disabled={isProcessing}
                            className="flex items-center justify-center gap-2 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 transition-all"
                          >
                            <CheckCircle className="w-5 h-5" />
                            Approve
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedClaim.status !== 'pending' && (
                      <div className={`p-6 rounded-3xl border ${
                        selectedClaim.status === 'approved' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
                      }`}>
                        <div className="flex items-center gap-2 mb-4 font-bold">
                          {selectedClaim.status === 'approved' ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                          <span className={selectedClaim.status === 'approved' ? 'text-green-800' : 'text-red-800'}>
                            Decision: {selectedClaim.status.toUpperCase()}
                          </span>
                        </div>
                        {selectedClaim.feedback && (
                          <div className="flex gap-3">
                            <MessageSquare className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                            <p className="text-sm text-gray-600 italic">"{selectedClaim.feedback}"</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-12 border-2 border-dashed border-gray-100 rounded-3xl">
              <ClipboardList className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Select a claim to view details and make a decision</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
