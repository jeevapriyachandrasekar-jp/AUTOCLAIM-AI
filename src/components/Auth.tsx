import React from 'react';
import { auth, googleProvider, signInWithPopup, signOut, db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import { LogIn, LogOut, Car, ShieldCheck } from 'lucide-react';

interface AuthProps {
  onUserChange: (user: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onUserChange }) => {
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user exists in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create new user with default role 'policyholder'
        const newUser = {
          uid: user.uid,
          email: user.email,
          role: 'policyholder',
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: Timestamp.now()
        };
        await setDoc(userDocRef, newUser);
        onUserChange(newUser);
      } else {
        onUserChange(userDoc.data());
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onUserChange(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {auth.currentUser ? (
        <div className="flex items-center gap-3">
          <img 
            src={auth.currentUser.photoURL || ''} 
            alt="Profile" 
            className="w-8 h-8 rounded-full border border-gray-200"
            referrerPolicy="no-referrer"
          />
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      ) : (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogin}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
        >
          <LogIn className="w-4 h-4" />
          Sign in with Google
        </motion.button>
      )}
    </div>
  );
};
