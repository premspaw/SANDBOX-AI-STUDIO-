import React from 'react';
import { HelpCircle } from 'lucide-react';

export interface CardProps {
  title: string;
  icon?: any;
  action?: React.ReactNode;
  tooltip?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export const Card = ({
  title,
  icon: Icon,
  action,
  tooltip,
  children,
  className = '',
  contentClassName = 'p-4 gap-4'
}: CardProps) => (
  <div className={`bg-gray-900/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden flex flex-col shadow-2xl transition-all duration-300 hover:border-white/20 hover:bg-gray-800/60 group/card ${className}`}>
    <div
      className={`flex items-center flex-wrap gap-2 ${!title ? 'px-1 py-2' : 'px-2.5 py-3'} border-b border-white/5 bg-gradient-to-r from-white/[0.04] to-transparent ${!title ? '' : 'justify-between'}`}
      style={!title ? { display: 'grid', gridTemplateColumns: '1fr auto 1fr' } : undefined}
    >
      {title ? (
        <div className="flex items-center gap-3 text-white font-sans font-black text-[10.5px] uppercase tracking-[0.15em]">
          {Icon && <Icon size={17} className="text-[#c8f135] drop-shadow-[0_0_5px_rgba(200,241,53,0.3)]" />}
          <span className="flex items-center gap-2.5">
            {title}
            {tooltip && (
              <div className="group relative flex items-center">
                <HelpCircle size={15} className="text-[#555] group-hover:text-[#c8f135] transition-colors cursor-help" />
                <div className="absolute left-7 top-1/2 -translate-y-1/2 w-64 p-3 bg-black/95 backdrop-blur-xl border border-white/15 text-gray-300 text-[11px] font-medium leading-relaxed normal-case tracking-normal rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-2xl pointer-events-none ring-1 ring-white/10">
                  {tooltip}
                </div>
              </div>
            )}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-start">
          {Icon && <Icon size={17} className="text-[#c8f135] drop-shadow-[0_0_5px_rgba(200,241,53,0.3)]" />}
        </div>
      )}
      {action && <div className="flex items-center justify-center">{action}</div>}
      {!title && <div />}
    </div>
    <div className={`flex-1 flex flex-col ${contentClassName}`}>
      {children}
    </div>
  </div>
);
