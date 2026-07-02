import React from 'react';
import * as LucideIcons from 'lucide-react';
import { motion } from 'framer-motion';

interface ThemePickerProps {
  themeColor: string;
  enableAnimation: boolean;
  updateThemeColor: (color: string) => void;
  toggleAnimation: () => void;
  THEME_COLORS: string[];
}

const ThemePicker = React.memo(({
  themeColor,
  enableAnimation,
  updateThemeColor,
  toggleAnimation,
  THEME_COLORS
}: ThemePickerProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      className="flex justify-center"
    >
      <div className="glass px-6 py-3 rounded-full flex items-center gap-4">
        <LucideIcons.Palette className="w-4 h-4 text-text-secondary" />
        <div className="flex gap-2">
          {THEME_COLORS.map(color => (
            <button
              key={color}
              onClick={() => updateThemeColor(color)}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${themeColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-110'}`}
              style={{ backgroundColor: color }}
            />
          ))}
          <input 
            type="color" 
            value={themeColor}
            onChange={(e) => updateThemeColor(e.target.value)}
            className="w-6 h-6 rounded-full overflow-hidden cursor-pointer border-0 p-0"
          />
        </div>
        <div className="w-px h-6 bg-white/10 mx-2" />
        <button
          onClick={toggleAnimation}
          className={`flex items-center gap-2 text-xs uppercase tracking-widest transition-colors ${enableAnimation ? 'text-accent' : 'text-text-secondary hover:text-white'}`}
          title="Toggle Background Animation"
        >
          {enableAnimation ? <LucideIcons.Sparkles className="w-4 h-4" /> : <LucideIcons.Sparkles className="w-4 h-4 opacity-50" />}
        </button>
      </div>
    </motion.div>
  );
});

export default ThemePicker;
