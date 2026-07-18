import React from 'react';
import { motion } from 'framer-motion';
import { LogOut, X } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  theme?: 'dark' | 'light';
}

export default function LogoutConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  theme = 'dark'
}: LogoutConfirmModalProps) {
  if (!isOpen) return null;

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className={`absolute inset-0 ${isDark ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/20 backdrop-blur-sm'}`}
      />

      {/* Modal Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`relative w-full max-w-sm rounded-2xl shadow-xl overflow-hidden border ${
          isDark 
            ? 'bg-white border-[#eceae4]' 
            : 'bg-white border-gray-100'
        }`}
      >
        <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
          <h2 className={`text-lg font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <LogOut className={`w-5 h-5 ${isDark ? 'text-accent' : 'text-gray-900'}`} />
            Confirm Logout
          </h2>
          <button 
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${
              isDark 
                ? 'text-text-secondary hover:text-white hover:bg-white/10' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 text-center">
          <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-4 ${
            isDark ? 'bg-white/10 text-accent' : 'bg-gray-100 text-gray-900'
          }`}>
            <LogOut className="w-6 h-6 ml-1" />
          </div>
          
          <h3 className={`text-xl font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Ready to leave?
          </h3>
          <p className={`text-sm mb-8 ${isDark ? 'text-text-secondary' : 'text-gray-600'}`}>
            You are about to log out of your account. You will need to log back in to access your resumes.
          </p>

          <div className="flex gap-3 w-full">
            <button
              onClick={onClose}
              className={`flex-1 py-2.5 rounded-xl transition-colors font-medium text-sm ${
                isDark
                  ? 'bg-white/5 hover:bg-white/10 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-2.5 rounded-xl transition-colors font-medium text-sm text-white ${
                isDark
                  ? 'bg-red-500/80 hover:bg-red-500'
                  : 'bg-gray-900 hover:bg-gray-800'
              }`}
            >
              Log Out
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
