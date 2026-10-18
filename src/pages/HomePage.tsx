/**
 * LandingPage.tsx — Marketing Homepage
 *
 * The public-facing landing page for PresenceCV, accessible at "/".
 * Designed with a warm cream-tone aesthetic (bg-[#f7f4ed]) matching
 * the warm glassmorphic editor.
 *
 * Sections:
 * 1. Navigation Bar: Logo, Features link, Login/Logout buttons (responsive)
 * 2. Hero: Headline, subtitle, CTA button ("Start Building Now")
 * 3. Features Grid: 4 feature cards (AI, Live Share, PDF, Multi-Profile)
 * 4. Footer: Brand, links to Features/Privacy/Terms
 *
 * Auth Integration:
 * - "Start Building Now" and "Log In" trigger signInWithGoogle → navigate("/editor")
 * - If already logged in, buttons redirect directly to /editor
 *
 * Depends on: AuthContext (useAuth), react-router-dom, lucide-react, motion
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import * as LucideIcons from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LogoutConfirmModal from '../components/LogoutConfirmModal';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function HomePage() {
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const { user, signInWithGoogle, signOut } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = async () => {
    if (user) {
      navigate('/editor');
    } else {
      try {
        await signInWithGoogle();
        navigate('/editor');
      } catch (err) {
        console.error('Failed to sign in', err);
      }
    }
  };

  const handleLogin = async () => {
    if (user) {
      navigate('/editor');
    } else {
      try {
        await signInWithGoogle();
        navigate('/editor');
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
            <a href="#features" className="text-[#5f5f5d] hover:text-[#1c1c1c] transition-colors text-sm font-medium">{t('home.nav.features')}</a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcher fullWidth={false} />
            <button 
              onClick={handleLogin}
              className="text-[#1c1c1c] bg-transparent border border-[#1c1c1c]/40 rounded-md px-4 py-2 text-sm font-medium hover:opacity-80 transition-opacity"
            >
              {user ? t('home.nav.resumeEditor') : t('home.nav.login')}
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
                  {t('common.logout')}
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
                <LanguageSwitcher fullWidth={false} />
                <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="text-[#5f5f5d] font-medium">{t('home.nav.features')}</a>
                <hr className="border-[#eceae4]" />
                <button 
                  onClick={() => { setIsMobileMenuOpen(false); handleLogin(); }}
                  className="w-full text-center text-[#1c1c1c] bg-transparent border border-[#1c1c1c]/40 rounded-md px-4 py-2 text-sm font-medium hover:opacity-80"
                >
                  {user ? t('home.nav.resumeEditor') : t('home.nav.login')}
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
                       <span className="text-sm font-medium text-[#1c1c1c]">{user.email || t('common.user')}</span>
                     </div>
                     <button 
                       onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                       className="w-full text-center bg-[#1c1c1c] text-[#fcfbf8] rounded-md px-4 py-2 text-sm font-medium hover:opacity-80"
                       style={{ boxShadow: 'rgba(255,255,255,0.2) 0px 0.5px 0px 0px inset, rgba(0,0,0,0.2) 0px 0px 0px 0.5px inset, rgba(0,0,0,0.05) 0px 1px 2px 0px' }}
                     >
                       {t('common.logout')}
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
              {t('home.hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button 
                onClick={handleGetStarted}
                className="w-full sm:w-auto bg-[#1c1c1c] text-[#fcfbf8] rounded-md px-8 py-4 text-lg font-medium hover:opacity-80 transition-opacity"
                style={{ boxShadow: 'rgba(255,255,255,0.2) 0px 0.5px 0px 0px inset, rgba(0,0,0,0.2) 0px 0px 0px 0.5px inset, rgba(0,0,0,0.05) 0px 1px 2px 0px' }}
              >
                {t('home.hero.ctaStart')}
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section - Blending into next section */}
      <section id="features" className="py-24 md:py-40 px-6 bg-gradient-to-b from-[#f7f4ed] to-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20 text-center">
            <h2 className="text-4xl md:text-[56px] font-semibold leading-[1.0] tracking-[-1.5px] mb-6">{t('home.features.whyTitle')}</h2>
            <p className="text-[20px] text-[#5f5f5d]">{t('home.features.heading')}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white/60 backdrop-blur-sm border border-[#eceae4] p-10 rounded-3xl flex flex-col items-start transition-all hover:shadow-xl hover:-translate-y-2">
              <div className="p-4 bg-white rounded-2xl border border-[#eceae4] shadow-sm mb-8">
                <LucideIcons.Cloud className="w-7 h-7 text-[#1c1c1c]" />
              </div>
              <h3 className="text-[22px] font-semibold leading-[1.2] mb-4 text-[#1c1c1c]">{t('home.features.manageTitle')}</h3>
              <p className="text-[17px] text-[#5f5f5d] leading-[1.6]">{t('home.features.manageDesc')}</p>
            </div>
            
            <div className="bg-white/60 backdrop-blur-sm border border-[#eceae4] p-10 rounded-3xl flex flex-col items-start transition-all hover:shadow-xl hover:-translate-y-2">
              <div className="p-4 bg-white rounded-2xl border border-[#eceae4] shadow-sm mb-8">
                <LucideIcons.Share2 className="w-7 h-7 text-[#1c1c1c]" />
              </div>
              <h3 className="text-[22px] font-semibold leading-[1.2] mb-4 text-[#1c1c1c]">{t('home.features.liveTitle')}</h3>
              <p className="text-[17px] text-[#5f5f5d] leading-[1.6]">{t('home.features.liveDesc')}</p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm border border-[#eceae4] p-10 rounded-3xl flex flex-col items-start transition-all hover:shadow-xl hover:-translate-y-2">
              <div className="p-4 bg-white rounded-2xl border border-[#eceae4] shadow-sm mb-8">
                <LucideIcons.FileText className="w-7 h-7 text-[#1c1c1c]" />
              </div>
              <h3 className="text-[22px] font-semibold leading-[1.2] mb-4 text-[#1c1c1c]">{t('home.features.pdfTitle')}</h3>
              <p className="text-[17px] text-[#5f5f5d] leading-[1.6]">{t('home.features.pdfDesc')}</p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm border border-[#eceae4] p-10 rounded-3xl flex flex-col items-start transition-all hover:shadow-xl hover:-translate-y-2">
              <div className="p-4 bg-white rounded-2xl border border-[#eceae4] shadow-sm mb-8">
                <LucideIcons.Bot className="w-7 h-7 text-[#1c1c1c]" />
              </div>
              <h3 className="text-[22px] font-semibold leading-[1.2] mb-4 text-[#1c1c1c]">{t('home.features.aiJobHuntingTitle')}</h3>
              <p className="text-[17px] text-[#5f5f5d] leading-[1.6]"><span className="text-blue-500 font-semibold text-[11px] tracking-wider uppercase mr-2 border border-blue-200 bg-blue-50 px-1.5 py-0.5 rounded-sm">{t('home.pricing.comingSoon')}</span>{t('home.features.aiJobHuntingDesc')}</p>
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
              <span className="text-[#5f5f5d] ml-2">{t('home.footer.copyright')}</span>
            </div>
            <p className="text-[#5f5f5d] text-xs">{t('home.footer.tagline')}</p>
          </div>
          <div className="flex gap-6 text-[#5f5f5d]">
            <a href="#features" className="hover:text-[#1c1c1c] transition-colors">{t('home.nav.features')}</a>
            <Link to="/privacy" className="hover:text-[#1c1c1c] transition-colors">{t('home.footer.privacy')}</Link>
            <Link to="/terms" className="hover:text-[#1c1c1c] transition-colors">{t('home.footer.terms')}</Link>
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
