import React, { useState } from 'react';
import { db, storage, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { analyzeClaim, AIAnalysisResult } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Image as ImageIcon, FileText, AlertCircle, Loader2, CheckCircle, DollarSign, Shield } from 'lucide-react';

export const ClaimSubmission: React.FC = () => {
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [fir, setFir] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files));
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setIsSubmitting(true);
    setError(null);
    setAiResult(null);

    try {
      // 1. Convert images to base64 for AI analysis
      const base64Images = await Promise.all(images.map(readFileAsBase64));
      
      // 2. Perform AI Analysis
      const analysis = await analyzeClaim(description, base64Images);
      setAiResult(analysis);

      // 3. Upload images to Storage
      const imageUrls = await Promise.all(images.map(async (img, i) => {
        const storageRef = ref(storage, `claims/${auth.currentUser?.uid}/${Date.now()}_${i}`);
        await uploadBytes(storageRef, img);
        return getDownloadURL(storageRef);
      }));

      // 4. Upload FIR if exists
      let firUrl = '';
      if (fir) {
        const firRef = ref(storage, `claims/${auth.currentUser?.uid}/fir_${Date.now()}`);
        await uploadBytes(firRef, fir);
        firUrl = await getDownloadURL(firRef);
      }

      // 5. Save Claim to Firestore
      await addDoc(collection(db, 'claims'), {
        policyholderId: auth.currentUser.uid,
        description,
        images: imageUrls,
        firUrl,
        aiAnalysis: {
          bertConsistency: analysis.bertConsistency,
          cnnDamageDetection: analysis.cnnDamageDetection,
          fraudScore: analysis.fraudScore
        },
        predictedAmount: analysis.predictedAmount,
        status: 'pending',
        createdAt: Timestamp.now()
      });

      setSuccess(true);
    } catch (err) {
      setError("Failed to submit claim. Please try again.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center p-12 bg-white rounded-3xl shadow-xl border border-green-100"
      >
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Claim Submitted Successfully!</h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Your claim has been received and is currently being reviewed by our AI system and an assessor.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all"
        >
          Back to Dashboard
        </button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Initiate New Claim</h2>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Accident Description</label>
            <textarea 
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened in detail..."
              className="w-full h-40 p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Damage Images</label>
              <div className="relative group">
                <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-2xl group-hover:border-blue-400 transition-all">
                  <div className="text-center">
                    <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">{images.length} images selected</p>
                  </div>
                </div>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">FIR Copy (Optional)</label>
              <div className="relative group">
                <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-2xl group-hover:border-blue-400 transition-all">
                  <div className="text-center">
                    <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">{fir ? fir.name : 'Upload FIR document'}</p>
                  </div>
                </div>
                <input 
                  type="file" 
                  accept=".pdf,image/*"
                  onChange={(e) => setFir(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {aiResult && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-blue-50 p-8 rounded-3xl border border-blue-100 space-y-6"
            >
              <div className="flex items-center gap-3 text-blue-800 font-bold text-lg">
                <Shield className="w-6 h-6" />
                AI Verification Report
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-4 rounded-2xl shadow-sm">
                  <div className="text-xs font-bold text-gray-400 uppercase mb-1">Fraud Score</div>
                  <div className={`text-2xl font-bold ${aiResult.fraudScore > 50 ? 'text-red-600' : 'text-green-600'}`}>
                    {aiResult.fraudScore}%
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm">
                  <div className="text-xs font-bold text-gray-400 uppercase mb-1">Predicted Amount</div>
                  <div className="text-2xl font-bold text-blue-600 flex items-center">
                    <DollarSign className="w-5 h-5" />
                    {aiResult.predictedAmount.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm">
                  <div className="text-xs font-bold text-gray-400 uppercase mb-1">Status</div>
                  <div className="text-2xl font-bold text-amber-600">Analyzing...</div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-blue-900 text-sm mb-1">BERT Analysis (Consistency)</h4>
                  <p className="text-sm text-blue-800/80 leading-relaxed">{aiResult.bertConsistency}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900 text-sm mb-1">CNN Analysis (Damage)</h4>
                  <p className="text-sm text-blue-800/80 leading-relaxed">{aiResult.cnnDamageDetection}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="p-4 text-sm text-red-700 bg-red-50 rounded-xl border border-red-100 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <button 
          type="submit"
          disabled={isSubmitting || !description}
          className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl shadow-blue-200 transition-all"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing with AI...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Submit Claim
            </>
          )}
        </button>
      </form>
    </div>
  );
};
