import React, { useState, useEffect } from 'react';
import { auth, db, onAuthStateChanged, handleFirestoreError, OperationType } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Auth } from './components/Auth';
import { DocumentManager } from './components/DocumentManager';
import { ClaimSubmission } from './components/ClaimSubmission';
import { ClaimList } from './components/ClaimList';
import { AssessorDashboard } from './components/AssessorDashboard';
import { motion, AnimatePresence } from 'motion/react';
import { Car, ShieldCheck, FileText, Send, LayoutDashboard, ClipboardList, AlertCircle, Loader2 } from 'lucide-react';

interface UserProfile {
  uid: string;
  email: string;
  role: 'policyholder' | 'assessor';
  displayName: string;
  photoURL: string;
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'claim' | 'history'>('dashboard');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser(userDoc.data() as UserProfile);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="text-gray-500 font-medium">Loading AutoClaim AI...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <nav className="p-6 flex items-center justify-between max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 text-white rounded-xl">
              <Car className="w-6 h-6" />
            </div>
            <span className="text-xl font-black tracking-tight text-gray-900">AutoClaim AI</span>
          </div>
          <Auth onUserChange={setUser} />
        </nav>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-bold">
                <ShieldCheck className="w-4 h-4" />
                Next-Gen Insurance Claims
              </div>
              <h1 className="text-6xl font-black text-gray-900 leading-[1.1] tracking-tight">
                Automated Claims, <br />
                <span className="text-blue-600">AI-Powered</span> Trust.
              </h1>
              <p className="text-xl text-gray-500 leading-relaxed">
                Experience the future of vehicle insurance. Instant verification, 
                automated document management, and AI-assisted fraud detection.
              </p>
              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <img 
                      key={i}
                      src={`https://picsum.photos/seed/user${i}/100/100`}
                      className="w-12 h-12 rounded-full border-4 border-white shadow-sm"
                      alt="User"
                    />
                  ))}
                </div>
                <div className="text-sm font-medium text-gray-500">
                  <span className="text-gray-900 font-bold">10,000+</span> claims processed <br />
                  with 99.9% accuracy
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-blue-100 rounded-[40px] blur-3xl opacity-30 animate-pulse" />
              <div className="relative bg-white p-8 rounded-[40px] shadow-2xl border border-gray-100 space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-400 uppercase">Status</div>
                      <div className="text-sm font-bold text-gray-900">Verified by AI</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-gray-400 uppercase">Fraud Score</div>
                    <div className="text-sm font-bold text-green-600">0.02%</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-100 rounded-full w-3/4" />
                  <div className="h-4 bg-gray-100 rounded-full w-full" />
                  <div className="h-4 bg-gray-100 rounded-full w-1/2" />
                </div>
                <div className="pt-4">
                  <Auth onUserChange={setUser} />
                </div>
              </div>
            </motion.div>
          </div>
        </main>

        <footer className="p-8 text-center text-sm text-gray-400 border-t border-gray-50">
          &copy; 2026 AutoClaim AI. All rights reserved.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-600 text-white rounded-xl">
                <Car className="w-6 h-6" />
              </div>
              <span className="text-xl font-black tracking-tight text-gray-900">AutoClaim AI</span>
            </div>

            {user.role === 'policyholder' && (
              <div className="hidden md:flex items-center gap-1">
                <NavButton 
                  active={activeTab === 'dashboard'} 
                  onClick={() => setActiveTab('dashboard')}
                  icon={<LayoutDashboard className="w-4 h-4" />}
                  label="Dashboard"
                />
                <NavButton 
                  active={activeTab === 'claim'} 
                  onClick={() => setActiveTab('claim')}
                  icon={<Send className="w-4 h-4" />}
                  label="New Claim"
                />
                <NavButton 
                  active={activeTab === 'history'} 
                  onClick={() => setActiveTab('history')}
                  icon={<ClipboardList className="w-4 h-4" />}
                  label="My Claims"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-bold text-gray-900">{user.displayName}</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">{user.role}</span>
            </div>
            <Auth onUserChange={setUser} />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 lg:p-12">
        <AnimatePresence mode="wait">
          {user.role === 'assessor' ? (
            <AssessorDashboard />
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <DocumentManager />}
              {activeTab === 'claim' && <ClaimSubmission />}
              {activeTab === 'history' && <ClaimList />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
        active 
          ? 'bg-blue-50 text-blue-600' 
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
