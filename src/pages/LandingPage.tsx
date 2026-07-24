/**
 * LandingPage.tsx — Marketing Homepage
 *
 * The public-facing landing page for PresenceCV, accessible at "/".
 * Designed with a warm cream-tone aesthetic (bg-[#f7f4ed]) contrasting
 * the dark glassmorphic editor.
 *
 * Sections:
 * 1. Navigation Bar: Logo, Features/Pricing links, Login/Logout buttons (responsive)
 * 2. Hero: Headline, subtitle, CTA button ("Start Building Now")
 * 3. Features Grid: 4 feature cards (AI, Live Share, PDF, Multi-Profile)
 * 4. Pricing: Free tier (current) and Pro tier (coming soon)
 * 5. Footer: Brand, links to Features/Privacy/Terms
 *
 * Auth Integration:
 * - "Start Building Now" and "Log In" trigger signInWithGoogle → navigate("/app")
 * - If already logged in, buttons redirect directly to /app
 *
 * Depends on: AuthContext (useAuth), react-router-dom, lucide-react, motion
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as LucideIcons from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LogoutConfirmModal from '../components/LogoutConfirmModal';

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const { user, signInWithGoogle, signOut } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = async () => {
    if (user) {
      navigate('/app');
    } else {
      try {
        await signInWithGoogle();
        navigate('/app');
      } catch (err) {
        console.error('Failed to sign in', err);
      }
    }
  };

  const handleLogin = async () => {
    if (user) {
      navigate('/app');
    } else {
      try {
        await signInWithGoogle();
        navigate('/app');
      } catch (err) {
        console.error('Failed to sign in', err);
      }
    }
  };

  const handleLogout = async () => {
    setIsLogoutModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f7f4ed] text-[#1c1c1c] font-sans" style={{ fontFamily: "'Camera Plain Variable', ui-sans-serif, system-ui" }}>
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-[#f7f4ed]/80 backdrop-blur-md border-b border-[#eceae4]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/favicon.png" className="w-6 h-6 rounded-full" style={{ mixBlendMode: 'multiply' }} alt="PresenceCV Logo" />
            <span className="text-xl font-semibold tracking-tight">PresenceCV</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[#5f5f5d] hover:text-[#1c1c1c] transition-colors text-sm font-medium">Features</a>
            <a href="#pricing" className="text-[#5f5f5d] hover:text-[#1c1c1c] transition-colors text-sm font-medium">Pricing</a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={handleLogin}
              className="text-[#1c1c1c] bg-transparent border border-[#1c1c1c]/40 rounded-md px-4 py-2 text-sm font-medium hover:opacity-80 transition-opacity"
            >
              {user ? 'Resume Editor' : 'Log In'}
            </button>
            {user && (
              <div className="flex items-center gap-3 pl-4 border-l border-[#eceae4]">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User avatar" className="w-8 h-8 rounded-full border border-[#eceae4]" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#1c1c1c]/10 flex items-center justify-center">
                    <LucideIcons.User className="w-4 h-4 text-[#1c1c1c]" />
                  </div>
                )}
                <button 
                  onClick={handleLogout}
                  className="bg-[#1c1c1c] text-[#fcfbf8] rounded-md px-4 py-2 text-sm font-medium hover:opacity-80 transition-opacity"
                  style={{ boxShadow: 'rgba(255,255,255,0.2) 0px 0.5px 0px 0px inset, rgba(0,0,0,0.2) 0px 0px 0px 0.5px inset, rgba(0,0,0,0.05) 0px 1px 2px 0px' }}
                >
                  Log Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile Toggle */}
          <button 
            className="md:hidden p-2 text-[#1c1c1c]"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <LucideIcons.X className="w-5 h-5" /> : <LucideIcons.Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-b border-[#eceae4] bg-[#f7f4ed] overflow-hidden"
            >
              <div className="flex flex-col p-6 gap-4">
                <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="text-[#5f5f5d] font-medium">Features</a>
                <a href="#pricing" onClick={() => setIsMobileMenuOpen(false)} className="text-[#5f5f5d] font-medium">Pricing</a>
                <hr className="border-[#eceae4]" />
                <button 
                  onClick={() => { setIsMobileMenuOpen(false); handleLogin(); }}
                  className="w-full text-center text-[#1c1c1c] bg-transparent border border-[#1c1c1c]/40 rounded-md px-4 py-2 text-sm font-medium hover:opacity-80"
                >
                  {user ? 'Resume Editor' : 'Log In'}
                </button>
                {user && (
                   <div className="flex flex-col gap-4 pt-4 mt-2 border-t border-[#eceae4]">
                     <div className="flex items-center justify-center gap-3">
                       {user.photoURL ? (
                         <img src={user.photoURL} alt="User avatar" className="w-8 h-8 rounded-full border border-[#eceae4]" />
                       ) : (
                         <div className="w-8 h-8 rounded-full bg-[#1c1c1c]/10 flex items-center justify-center">
                           <LucideIcons.User className="w-4 h-4 text-[#1c1c1c]" />
                         </div>
                       )}
                       <span className="text-sm font-medium text-[#1c1c1c]">{user.email || 'User'}</span>
                     </div>
                     <button 
                       onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                       className="w-full text-center bg-[#1c1c1c] text-[#fcfbf8] rounded-md px-4 py-2 text-sm font-medium hover:opacity-80"
                       style={{ boxShadow: 'rgba(255,255,255,0.2) 0px 0.5px 0px 0px inset, rgba(0,0,0,0.2) 0px 0px 0px 0.5px inset, rgba(0,0,0,0.05) 0px 1px 2px 0px' }}
                     >
                       Log Out
                     </button>
                   </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-40 md:pt-48 md:pb-56 px-6 max-w-[1200px] mx-auto text-center overflow-hidden">
        {/* Soft background gradient wash */}
        <div className="absolute inset-0 z-0 pointer-events-none flex justify-center items-center opacity-40 blur-3xl mix-blend-multiply">
          <div className="absolute bg-pink-300 w-96 h-96 rounded-full top-[10%] left-[10%] opacity-30 animate-pulse" />
          <div className="absolute bg-orange-300 w-96 h-96 rounded-full top-[20%] right-[15%] opacity-30 animate-pulse delay-700" />
          <div className="absolute bg-blue-300 w-80 h-80 rounded-full bottom-[10%] left-[30%] opacity-30 animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-center"
          >
            <h1 className="text-5xl md:text-[64px] lg:text-[80px] font-semibold leading-[1.05] tracking-[-2.5px] text-[#1c1c1c] mb-8 max-w-4xl">
              Your Resume <br className="hidden md:block" /> Your Presence
            </h1>
            <p className="text-[20px] md:text-[24px] text-[#5f5f5d] leading-[1.38] mb-12 max-w-2xl font-normal">
              Build stunning, shareable resumes powered by AI — in seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button 
                onClick={handleGetStarted}
                className="w-full sm:w-auto bg-[#1c1c1c] text-[#fcfbf8] rounded-md px-8 py-4 text-lg font-medium hover:opacity-80 transition-opacity"
                style={{ boxShadow: 'rgba(255,255,255,0.2) 0px 0.5px 0px 0px inset, rgba(0,0,0,0.2) 0px 0px 0px 0.5px inset, rgba(0,0,0,0.05) 0px 1px 2px 0px' }}
              >
                Start Building Now
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section - Blending into next section */}
      <section id="features" className="py-24 md:py-40 px-6 bg-gradient-to-b from-[#f7f4ed] to-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20 text-center">
            <h2 className="text-4xl md:text-[56px] font-semibold leading-[1.0] tracking-[-1.5px] mb-6">Why PresenceCV?</h2>
            <p className="text-[20px] text-[#5f5f5d]">Everything you need to showcase your best self.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white/60 backdrop-blur-sm border border-[#eceae4] p-10 rounded-3xl flex flex-col items-start transition-all hover:shadow-xl hover:-translate-y-2">
              <div className="p-4 bg-white rounded-2xl border border-[#eceae4] shadow-sm mb-8">
                <LucideIcons.Cloud className="w-7 h-7 text-[#1c1c1c]" />
              </div>
              <h3 className="text-[22px] font-semibold leading-[1.2] mb-4 text-[#1c1c1c]">Manage in One Account</h3>
              <p className="text-[17px] text-[#5f5f5d] leading-[1.6]">Log in from anywhere to instantly generate, manage, and present your resume across any device. Your professional presence, always accessible.</p>
            </div>
            
            <div className="bg-white/60 backdrop-blur-sm border border-[#eceae4] p-10 rounded-3xl flex flex-col items-start transition-all hover:shadow-xl hover:-translate-y-2">
              <div className="p-4 bg-white rounded-2xl border border-[#eceae4] shadow-sm mb-8">
                <LucideIcons.Share2 className="w-7 h-7 text-[#1c1c1c]" />
              </div>
              <h3 className="text-[22px] font-semibold leading-[1.2] mb-4 text-[#1c1c1c]">Live Share Link</h3>
              <p className="text-[17px] text-[#5f5f5d] leading-[1.6]">Found a typo after sending the link? No problem. Edits update in real-time, ensuring recruiters always see your perfect, up-to-date professional profile.</p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm border border-[#eceae4] p-10 rounded-3xl flex flex-col items-start transition-all hover:shadow-xl hover:-translate-y-2">
              <div className="p-4 bg-white rounded-2xl border border-[#eceae4] shadow-sm mb-8">
                <LucideIcons.FileText className="w-7 h-7 text-[#1c1c1c]" />
              </div>
              <h3 className="text-[22px] font-semibold leading-[1.2] mb-4 text-[#1c1c1c]">ATS-Optimized PDF</h3>
              <p className="text-[17px] text-[#5f5f5d] leading-[1.6]">Skip the confusing, overly-decorated layouts. We provide a single, clean format built to be easily read by recruiters and perfectly parsed by ATS scanners.</p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm border border-[#eceae4] p-10 rounded-3xl flex flex-col items-start transition-all hover:shadow-xl hover:-translate-y-2">
              <div className="p-4 bg-white rounded-2xl border border-[#eceae4] shadow-sm mb-8">
                <LucideIcons.Bot className="w-7 h-7 text-[#1c1c1c]" />
              </div>
              <h3 className="text-[22px] font-semibold leading-[1.2] mb-4 text-[#1c1c1c]">AI Job-Hunting Sidekick</h3>
              <p className="text-[17px] text-[#5f5f5d] leading-[1.6]"><span className="text-blue-500 font-semibold text-[11px] tracking-wider uppercase mr-2 border border-blue-200 bg-blue-50 px-1.5 py-0.5 rounded-sm">Coming Soon</span>AI that tailors your resume, matches JDs, writes cover letters, and fully automates applying to LinkedIn and other top job platforms.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - Pure White Background */}
      <section id="pricing" className="py-32 md:py-48 px-6 bg-white text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-[48px] font-semibold leading-[1.0] tracking-[-1.2px] mb-4">Early Access: Free for all</h2>
          <p className="text-[18px] text-[#5f5f5d] mb-16">Start building your resume immediately.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left max-w-3xl mx-auto">
            <div className="bg-[#f7f4ed] border border-[#eceae4] p-8 rounded-2xl flex flex-col">
              <h3 className="text-[24px] font-semibold mb-2">Free</h3>
              <p className="text-[#5f5f5d] mb-6">Everything you need to land an interview.</p>
              <div className="text-[36px] font-semibold tracking-tight mb-8">$0<span className="text-[18px] font-normal text-[#5f5f5d]">/mo</span></div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3"><LucideIcons.Check className="w-5 h-5 text-[#1c1c1c]" /> 3 Resume Profiles</li>
                <li className="flex items-center gap-3"><LucideIcons.Check className="w-5 h-5 text-[#1c1c1c]" /> Unlimited PDF Export</li>
                <li className="flex items-center gap-3"><LucideIcons.Check className="w-5 h-5 text-[#1c1c1c]" /> Unlimited live & snapshot link sharing</li>
                <li className="flex items-center gap-3 text-left"><LucideIcons.Check className="w-5 h-5 text-[#1c1c1c] shrink-0" /> <span>10 AI fully auto job appling / day <span className="text-xs font-semibold text-blue-500 block sm:inline">(Coming soon)</span></span></li>
              </ul>
              <button 
                onClick={handleGetStarted}
                className="w-full text-center text-[#1c1c1c] bg-transparent border border-[#1c1c1c]/40 rounded-md px-6 py-3 text-base font-medium hover:opacity-80"
              >
                Current Plan
              </button>
            </div>
            
            <div className="bg-[#1c1c1c] text-[#fcfbf8] p-8 rounded-2xl flex flex-col relative shadow-2xl">
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Coming Soon
              </div>
              <h3 className="text-[24px] font-semibold mb-2 text-[#fcfbf8]">Pro</h3>
              <p className="opacity-80 mb-6 text-[16px]">For power users and active job seekers.</p>
              <div className="text-[36px] font-semibold tracking-tight mb-8 text-[#fcfbf8]">$5<span className="text-[18px] font-normal opacity-80">/mo</span></div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3"><LucideIcons.Check className="w-5 h-5" /> Unlimited Profiles</li>
                <li className="flex items-center gap-3"><LucideIcons.Check className="w-5 h-5" /> Unlimited PDF Export</li>
                <li className="flex items-center gap-3"><LucideIcons.Check className="w-5 h-5" /> Unlimited live & snapshot link sharing</li>
                <li className="flex items-center gap-3 text-left"><LucideIcons.Check className="w-5 h-5 shrink-0" /> <span>50 AI schedule & customized fully auto job appling / day <span className="text-xs font-semibold text-blue-400 block sm:inline">(Coming soon)</span></span></li>
                <li className="flex items-center gap-3 text-left"><LucideIcons.Check className="w-5 h-5 shrink-0" /> <span>Latest AI-powered job hunting functions <span className="text-xs font-semibold text-blue-400 block sm:inline">(Coming soon)</span></span></li>
              </ul>
              <button className="w-full text-center bg-white text-[#1c1c1c] rounded-md px-6 py-3 text-base font-medium opacity-50 cursor-not-allowed">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-[#eceae4] px-6 text-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-2">
              <img src="/favicon.png" className="w-5 h-5 rounded-full" style={{ mixBlendMode: 'multiply' }} alt="PresenceCV Logo" />
              <span className="font-semibold text-[#1c1c1c]">PresenceCV</span>
              <span className="text-[#5f5f5d] ml-2">© 2026 PresenceCV</span>
            </div>
            <p className="text-[#5f5f5d] text-xs">Crafted with care by independent developer Joe.</p>
          </div>
          <div className="flex gap-6 text-[#5f5f5d]">
            <a href="#features" className="hover:text-[#1c1c1c] transition-colors">Features</a>
            <Link to="/privacy" className="hover:text-[#1c1c1c] transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-[#1c1c1c] transition-colors">Terms</Link>
          </div>
        </div>
      </footer>

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={async () => {
          setIsLogoutModalOpen(false);
          await signOut();
        }}
        theme="light"
      />
    </div>
  );
}
