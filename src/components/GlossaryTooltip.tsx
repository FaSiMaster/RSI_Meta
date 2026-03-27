import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, X } from "lucide-react";
import { GlossaryEntry, SupportedLang } from "../types";
import { resolveI18n } from "../types";
import { cn } from "../lib/utils";

interface Props {
  term: string;
  entry: GlossaryEntry;
  lang?: SupportedLang;
  className?: string;
}

/**
 * Fachbegriff-Tooltip: klickbarer Text mit Glossar-Definition.
 * Schliesst sich beim Klick ausserhalb oder per X.
 */
export function GlossaryTooltip({ term, entry, lang = "de", className }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const definition = entry.definitionI18n
    ? resolveI18n(entry.definitionI18n, lang)
    : entry.definition;

  return (
    <span ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(prev => !prev)}
        className={cn(
          "border-b border-dotted border-blue-400/60 text-blue-400 hover:text-blue-300 hover:border-blue-300 transition-colors cursor-help",
          className,
        )}
      >
        {term}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-2 z-[300] w-72 bg-[#1a1a2e] border border-blue-500/30 rounded-2xl shadow-2xl p-4"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 text-blue-400">
                <BookOpen size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Glossar</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white/80">
                <X size={14} />
              </button>
            </div>
            <p className="font-bold text-white mb-1">{term}</p>
            <p className="text-sm text-white/70 leading-relaxed">{definition}</p>
            {entry.sourceNorm && (
              <p className="mt-2 text-[10px] text-white/30 font-mono">{entry.sourceNorm}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

// ── Hilfsfunktion: ersetzt bekannte Fachbegriffe im Text mit Tooltips ──────────

interface RichTextProps {
  text: string;
  glossary: GlossaryEntry[];
  lang?: SupportedLang;
  className?: string;
}

/**
 * Rendert Text und ersetzt bekannte Glossar-Begriffe durch klickbare Tooltips.
 * Case-insensitiv, nur ganzes Wort.
 */
export function RichText({ text, glossary, lang = "de", className }: RichTextProps) {
  if (glossary.length === 0) return <span className={className}>{text}</span>;

  // Erstelle Regex aus allen Glossar-Termen
  const terms = glossary.map(e => e.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`\\b(${terms.join("|")})\\b`, "gi");

  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const entry = glossary.find(e => e.term.toLowerCase() === match![0].toLowerCase());
    if (entry) {
      parts.push(
        <GlossaryTooltip key={match.index} term={match[0]} entry={entry} lang={lang} />,
      );
    } else {
      parts.push(match[0]);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));

  return <span className={className}>{parts}</span>;
}
