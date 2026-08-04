import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Paperclip, Sparkles, Image as ImageIcon } from 'lucide-react';

export interface MentionRoom {
  id: string;
  label: string;
  thumb?: string;
  type?: 'room' | 'realtor';
}

interface MentionTextareaProps {
  value: string;
  onChange: (val: string) => void;
  onPaste?: (val: string) => void;
  rooms: MentionRoom[];
  placeholder?: string;
  rows?: number;
  className?: string;
}

// Converts a room label into the mention token used in text, e.g. "Living Room" -> "LivingRoom"
export const roomToMentionToken = (label: string) => label.replace(/[^a-zA-Z0-9]/g, '');

// Detect attached references from text or JSON prompt
export const detectAttachedReferences = (text: string, rooms: MentionRoom[]): MentionRoom[] => {
  if (!text || !text.trim() || rooms.length === 0) return [];

  let textToScan = text;

  // Handle JSON prompts (e.g. { "prompt": "...", "room_references": [...] })
  if (text.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      textToScan = [
        parsed.prompt || '',
        parsed.dialogue || '',
        JSON.stringify(parsed.room_references || []),
        JSON.stringify(parsed.character_reference || [])
      ].join(' ');
    } catch (e) {
      // ignore json parse errors
    }
  }

  const matches = new Set<string>();
  const tokens = Array.from(textToScan.matchAll(/@([a-zA-Z0-9_\-]+)/g)).map(m => m[1].toLowerCase());

  rooms.forEach(room => {
    const token = roomToMentionToken(room.label).toLowerCase();
    const labelLower = room.label.toLowerCase();

    const isMatch = tokens.some(t => {
      if (t === token || t === room.id.toLowerCase()) return true;
      if (token.includes(t) || t.includes(token)) return true;
      if (labelLower.includes(t) || t.includes(labelLower)) return true;
      // Aliases
      if ((t === 'exterior' || t === 'front' || t === 'facade' || t === 'outdoor') && (room.id === 'front' || labelLower.includes('front'))) return true;
      if ((t === 'living' || t === 'hall' || t === 'lounge') && room.id === 'living') return true;
      if ((t === 'bed' || t === 'bedroom') && room.id.startsWith('bedroom')) return true;
      if ((t === 'bath' || t === 'washroom') && room.id === 'bathroom') return true;
      if ((t === 'lawn' || t === 'garden') && room.id === 'lawn') return true;
      if ((t === 'realtor' || t === 'host' || t === 'agent') && (room.id === 'realtor' || room.type === 'realtor')) return true;
      return false;
    });

    if (isMatch) {
      matches.add(room.id);
    }
  });

  return rooms.filter(r => matches.has(r.id));
};

export default function MentionTextarea({
  value, onChange, onPaste, rooms, placeholder, rows = 4, className = ''
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [query, setQuery] = useState('');
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    return rooms.filter(r =>
      roomToMentionToken(r.label).toLowerCase().includes(query.toLowerCase()) ||
      r.label.toLowerCase().includes(query.toLowerCase())
    );
  }, [rooms, query]);

  const attachedReferences = useMemo(() => {
    return detectAttachedReferences(value, rooms);
  }, [value, rooms]);

  const isJsonPrompt = useMemo(() => {
    if (!value || !value.trim().startsWith('{')) return false;
    try {
      const parsed = JSON.parse(value);
      return Boolean(parsed.prompt || parsed.dialogue || parsed.room_references);
    } catch (e) {
      return false;
    }
  }, [value]);

  const handleFormatJsonPrompt = () => {
    try {
      const parsed = JSON.parse(value);
      const visualPrompt = parsed.prompt || '';
      const dialogue = parsed.dialogue || '';

      let formatted = visualPrompt;
      if (dialogue) {
        formatted += `\n\nDialogue: "${dialogue}"`;
      }
      onChange(formatted);
    } catch (e) {}
  };

  const detectMention = useCallback((text: string, caret: number) => {
    const upToCaret = text.slice(0, caret);
    const match = upToCaret.match(/@([a-zA-Z0-9]*)$/);
    if (match) {
      setMentionStart(caret - match[0].length);
      setQuery(match[1]);
      setShowMenu(true);
      setActiveIndex(0);
    } else {
      setShowMenu(false);
      setMentionStart(null);
      setQuery('');
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    onChange(newVal);
    detectMention(newVal, e.target.selectionStart ?? newVal.length);
  };

  const handlePasteEvent = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText && onPaste) {
      onPaste(pastedText);
    }
  };

  const insertMention = (room: MentionRoom) => {
    if (mentionStart === null || !textareaRef.current) return;
    const caret = textareaRef.current.selectionStart ?? value.length;
    const token = roomToMentionToken(room.label);
    const before = value.slice(0, mentionStart);
    const after = value.slice(caret);
    const newVal = `${before}@${token} ${after}`;
    onChange(newVal);
    setShowMenu(false);
    setMentionStart(null);
    setQuery('');
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const newCaret = before.length + token.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCaret, newCaret);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMenu || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev: number) => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev: number) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertMention(filtered[activeIndex]);
    } else if (e.key === 'Escape') {
      setShowMenu(false);
    }
  };

  return (
    <div className="relative w-full flex flex-col gap-1.5">
      {/* Attached References Badge Bar */}
      {attachedReferences.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap px-2 py-1 bg-[#c8f135]/10 border border-[#c8f135]/30 rounded-lg text-[9px]">
          <span className="font-bold text-[#c8f135] flex items-center gap-1 shrink-0 uppercase tracking-wider">
            <Paperclip size={10} /> Auto-Attached References ({attachedReferences.length}):
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            {attachedReferences.map(ref => (
              <div
                key={ref.id}
                className="flex items-center gap-1 bg-black/60 border border-[#c8f135]/40 text-white/90 px-1.5 py-0.5 rounded-md text-[8.5px] font-medium"
              >
                {ref.thumb ? (
                  <img src={ref.thumb} className="w-3.5 h-3.5 rounded object-cover border border-white/20" alt="" />
                ) : (
                  <ImageIcon size={10} className="text-[#c8f135]" />
                )}
                <span>@{roomToMentionToken(ref.label)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* JSON Format Helper Button */}
      {isJsonPrompt && (
        <div className="flex items-center justify-between px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <span className="text-[9px] text-blue-300 font-mono flex items-center gap-1">
            <Sparkles size={10} /> JSON Prompt Detected
          </span>
          <button
            type="button"
            onClick={handleFormatJsonPrompt}
            className="text-[8.5px] font-bold text-blue-400 hover:text-blue-200 underline uppercase tracking-wider"
          >
            Extract Clean Text & Dialogue
          </button>
        </div>
      )}

      <div className="relative w-full">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onPaste={handlePasteEvent}
          onKeyDown={handleKeyDown}
          onClick={(e) => detectMention(value, (e.target as HTMLTextAreaElement).selectionStart ?? 0)}
          placeholder={placeholder}
          rows={rows}
          className={className}
        />
        {showMenu && filtered.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 z-50 w-56 max-h-48 overflow-y-auto bg-[#0e0e10]/95 backdrop-blur-md border border-[#c8f135]/30 rounded-xl shadow-xl py-1 custom-scrollbar">
            {filtered.map((room, idx) => (
              <button
                key={room.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertMention(room); }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors ${
                  idx === activeIndex ? 'bg-[#c8f135]/15' : 'hover:bg-white/5'
                }`}
              >
                {room.thumb ? (
                  <img src={room.thumb} className="w-6 h-6 rounded object-cover border border-white/10" alt="" />
                ) : (
                  <div className="w-6 h-6 rounded bg-white/10" />
                )}
                <span className="text-[10px] font-bold text-white/80">@{roomToMentionToken(room.label)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
