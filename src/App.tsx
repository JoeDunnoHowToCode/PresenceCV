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
 *    - "/editor" → EditorPage (protected, requires Google login)
 *    - "/app", "/edit" → Redirects to "/editor"
 *
 * Consumed by: main.tsx (mounted into #root)
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import ViewerPage from './pages/ViewerPage';
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
            <Route path="/" element={<HomePage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            
            { /* Public Viewers (existing logic relies on queries like /view?id=...) */ }
            <Route path="/view" element={<ViewerPage />} />
            <Route path="/share/:id" element={<ViewerPage />} />
            <Route path="/print/:id" element={<ViewerPage />} />

            { /* Protected Editor Routes */ }
            <Route element={<ProtectedRoute />}>
               <Route path="/editor" element={<EditorPage />} />
               <Route path="/app" element={<Navigate to="/editor" replace />} />
               <Route path="/edit" element={<Navigate to="/editor" replace />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}
