import React, { useState, useRef, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ThemePickerProps {
  themeColor: string;
  updateThemeColor: (color: string) => void;
  THEME_COLORS: string[];
}

const ThemePicker = React.memo(({
  themeColor,
  updateThemeColor,
  THEME_COLORS
}: ThemePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative z-[50] w-full" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="p-3 lg:px-5 lg:py-3 rounded-full flex items-center justify-center lg:justify-between gap-4 w-full bg-white/50 hover:bg-white transition-colors border border-[#eceae4] shadow-sm  group"
      >
        <div className="flex items-center gap-3">
          <LucideIcons.Palette className="w-4 h-4 text-accent shrink-0 lg:w-4 lg:h-4" />
          <span className="text-sm tracking-widest uppercase font-medium text-[#1c1c1c] hidden lg:block">Themes</span>
        </div>
        <LucideIcons.ChevronDown className={`w-4 h-4 text-[#5f5f5d] transition-transform shrink-0 hidden lg:block ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 mt-2 bg-white p-4 rounded-2xl flex flex-col gap-3 w-64 border border-[#eceae4] shadow-xl z-50"
          >
            <div className="grid grid-cols-4 gap-4 justify-items-center">
              {THEME_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => { updateThemeColor(color); setIsOpen(false); }}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${themeColor === color ? 'border-[#1c1c1c] scale-110 shadow-[0_0_10px_currentColor]' : 'border-transparent hover:scale-110 shadow-sm'}`}
                  style={{ backgroundColor: color, color: color }}
                  title={color}
                />
              ))}
              
              {/* Custom Color Picker */}
              <div className="relative w-8 h-8 rounded-full bg-[#f7f4ed] border border-[#eceae4] flex items-center justify-center hover:bg-[#eceae4] transition-colors cursor-pointer group shadow-sm">
                <LucideIcons.Pipette className="w-4 h-4 text-[#1c1c1c]" />
                <input 
                  type="color" 
                  value={themeColor}
                  onChange={(e) => updateThemeColor(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  title="Custom Color"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default ThemePicker;
