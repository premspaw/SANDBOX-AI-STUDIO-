import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownProps {
  label?: string;
  value: string;
  options: string[];
  onChange: (val: any) => void;
  icon?: any;
  className?: string;
  direction?: 'up' | 'down';
}

export const Dropdown = ({ label, value, options, onChange, icon: Icon, className = "", direction = "down" }: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState<{
    top?: string;
    bottom?: string;
    left: string;
    width: string;
  }>({ left: '0px', width: '0px' });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const toggleDropdown = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = Math.max(150, rect.width);
      let left = rect.left;
      if (left + menuWidth > window.innerWidth - 10) {
        left = window.innerWidth - menuWidth - 10;
      }
      if (left < 10) {
        left = 10;
      }

      if (direction === 'up') {
        setPos({
          bottom: `${window.innerHeight - rect.top + 8}px`,
          left: `${left}px`,
          width: `${menuWidth}px`
        });
      } else {
        setPos({
          top: `${rect.bottom + 8}px`,
          left: `${left}px`,
          width: `${menuWidth}px`
        });
      }
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleScroll = () => {
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  return (
    <div className={`relative flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-gray-500 font-mono text-[8.5px] font-bold uppercase tracking-[0.2em] pl-1">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          ref={triggerRef}
          onClick={toggleDropdown}
          className="w-full h-7 flex items-center justify-between bg-gray-900/40 backdrop-blur-xl border border-white/10 rounded-full px-1.5 md:px-3 text-white font-mono text-[8px] uppercase tracking-wider md:tracking-widest hover:border-white/30 hover:bg-gray-800/60 transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            {Icon && <Icon size={11} className="text-[#c8f135]" />}
            <span className="truncate font-medium">{value}</span>
          </div>
          <ChevronDown size={11} className={`text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div
              style={{
                position: 'fixed',
                top: pos.top,
                bottom: pos.bottom,
                left: pos.left,
                width: pos.width
              }}
              className="bg-black/95 border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden backdrop-blur-2xl ring-1 ring-white/5"
            >
              <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                {options.map((opt: string, optIdx: number) => (
                  <button
                    key={optIdx}
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-[8px] font-mono uppercase tracking-widest transition-all rounded-md hover:bg-[#c8f135]/10 hover:text-[#c8f135] cursor-pointer ${value === opt ? 'bg-[#c8f135]/5 text-[#c8f135] font-bold' : 'text-gray-400'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
