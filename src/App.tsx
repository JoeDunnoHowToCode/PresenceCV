/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * App.tsx — Root Application Component
 *
 * This is the top-level React component that orchestrates the entire application.
 *
 * Responsibilities:
 * 1. Firebase Configuration Guard: If Firebase env vars are missing, renders
 *    FirebaseSetupGuide instead of the main app (prevents runtime crashes).
 * 2. Authentication Provider: Wraps all routes in AuthProvider for global auth state.
 * 3. Client-Side Routing (react-router-dom v7):
 *    - "/" → LandingPage (public marketing page)
 *    - "/privacy", "/terms" → Static legal pages
 *    - "/view", "/share/:id", "/print/:id" → ViewPage (public resume viewer)
 *    - "/app" → EditPage (protected, requires Google login)
 *    - "/edit" → Redirects to "/app"
 *
 * Consumed by: main.tsx (mounted into #root)
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import EditPage from './pages/EditPage';
import ViewPage from './pages/ViewPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import { isConfigValid } from './lib/firebase';
import FirebaseSetupGuide from './components/FirebaseSetupGuide';
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div role="alert" className="p-8 flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-900">
      <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
      <pre className="text-red-500 bg-red-50 p-4 rounded-lg overflow-auto max-w-full text-sm">{error.message}</pre>
      <button onClick={resetErrorBoundary} className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
        Try again
      </button>
    </div>
  );
}

export default function App() {
  if (!isConfigValid) {
    return <FirebaseSetupGuide />;
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
          <Routes>
            { /* Public Landing Page */ }
            <Route path="/" element={<LandingPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            
            { /* Public Viewers (existing logic relies on queries like /view?id=...) */ }
            <Route path="/view" element={<ViewPage />} />
            <Route path="/share/:id" element={<ViewPage />} />
            <Route path="/print/:id" element={<ViewPage />} />

            { /* Protected Editor Routes */ }
            <Route element={<ProtectedRoute />}>
               <Route path="/app" element={<EditPage />} />
               <Route path="/edit" element={<Navigate to="/app" replace />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}
