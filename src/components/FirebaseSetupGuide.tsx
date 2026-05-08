/**
 * FirebaseSetupGuide.tsx — Missing Configuration Error Screen
 *
 * A full-screen error UI displayed when required Firebase environment variables
 * are not configured. This component is rendered by App.tsx as a fallback
 * instead of the normal app when `isConfigValid` is false.
 *
 * Displays:
 * - Which environment variables are missing
 * - Step-by-step instructions for adding them (tailored for AI Studio)
 * - A "Check Again" button that reloads the page
 *
 * Props: None (stateless component)
 * Depends on: lucide-react (ShieldAlert, RefreshCw icons)
 */
import React from 'react';
import * as LucideIcons from 'lucide-react';

export default function FirebaseSetupGuide() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full glass p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6">
        <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mb-2">
          <LucideIcons.ShieldAlert className="w-8 h-8 text-red-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Configuration Required</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Firebase environment variables are missing. This application requires a database to function.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
            <h2 className="text-xs uppercase tracking-widest font-semibold text-accent/80">Missing Variables</h2>
            <ul className="text-xs font-mono text-accent space-y-1 opacity-90">
              <li>• VITE_FIREBASE_API_KEY</li>
              <li>• VITE_FIREBASE_PROJECT_ID</li>
              <li>• VITE_FIREBASE_APP_ID</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-medium">How to fix this:</h2>
            <ol className="text-xs text-slate-400 space-y-2 list-decimal list-inside">
              <li>Open <b>Settings</b> in AI Studio (bottom left).</li>
              <li>Go to <b>Environment Variables</b>.</li>
              <li>Add the keys listed above from your Firebase project.</li>
              <li>Refresh this preview window.</li>
            </ol>
          </div>
        </div>

        <button 
          onClick={() => window.location.reload()}
          className="w-full py-3 bg-white text-black rounded-xl font-semibold text-sm hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
        >
          <LucideIcons.RefreshCw className="w-4 h-4" />
          Check Again
        </button>
      </div>
    </div>
  );
}
