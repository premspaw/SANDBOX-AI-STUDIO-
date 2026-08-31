import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface DropUpPortalProps {
  triggerRef: React.RefObject<HTMLButtonElement>;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}

export const DropUpPortal: React.FC<DropUpPortalProps> = ({ triggerRef, isOpen, onClose, children, width = 260 }) => {
  const [pos, setPos] = useState<{ bottom: string; left: string; width: string }>({ bottom: '0px', left: '0px', width: `${width}px` });

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      let left = rect.left;
      if (left + width > window.innerWidth - 10) {
        left = Math.max(10, window.innerWidth - width - 10);
      }
      setPos({
        bottom: `${window.innerHeight - rect.top + 8}px`,
        left: `${left}px`,
        width: `${width}px`
      });
    }
  }, [isOpen, triggerRef, width]);

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div
        style={{
          position: 'fixed',
          bottom: pos.bottom,
          left: pos.left,
          width: pos.width,
        }}
        className="z-[9999] bg-[#0e0e10] border border-[#1e1e24] rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl ring-1 ring-white/10 p-1"
      >
        {children}
      </div>
    </>,
    document.body
  );
};

export default DropUpPortal;
