import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search, X, Save, Trash2, BookOpen } from "lucide-react";
import { cn } from "../lib/utils";
import { GlossaryEntry } from "../types";
import { apiFetch } from "../lib/api";

interface Props {
  adminKey: string;
  onError: (msg: string) => void;
}

const EMPTY: Partial<GlossaryEntry> = {
  term: "",
  definition: "",
  termI18n: { de: "" },
  definitionI18n: { de: "" },
  sourceNorm: "",
};

export default function GlossaryAdmin({ adminKey, onError }: Props) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [search, setSearch]   = useState("");
  const [editing, setEditing] = useState<Partial<GlossaryEntry> | null>(null);
  const [saving, setSaving]   = useState(false);

  // ── Laden ────────────────────────────────────────────────────────────────────

  const reload = () => {
    apiFetch<GlossaryEntry[]>("/api/glossary")
      .then(setEntries)
      .catch(err => onError(`${t("errors.save_glossary")}: ${err.message}`));
  };

  useEffect(() => { reload(); }, []);

  // ── Speichern ────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!editing?.term?.trim()) return;
    setSaving(true);
    try {
      const method = editing.id ? "PUT" : "POST";
      const url    = editing.id ? `/api/admin/glossary/${editing.id}` : "/api/admin/glossary";
      await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
        body: JSON.stringify({
          ...editing,
          termI18n:       { ...editing.termI18n, de: editing.term },
          definitionI18n: { ...editing.definitionI18n, de: editing.definition },
        }),
      });
      reload();
      setEditing(null);
    } catch (err: unknown) {
      onError(`${t("errors.save_glossary")}: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eintrag löschen?")) return;
    try {
      await apiFetch(`/api/admin/glossary/${id}`, {
        method: "DELETE",
        headers: { "X-Admin-Key": adminKey },
      });
      reload();
    } catch (err: unknown) {
      onError(`Löschen fehlgeschlagen: ${(err as Error).message}`);
    }
  };

  // ── Filter ───────────────────────────────────────────────────────────────────

  const filtered = entries.filter(e =>
    e.term.toLowerCase().includes(search.toLowerCase()) ||
    e.definition.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BookOpen size={16} className="text-blue-400" />
        <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">{t("glossary.admin_title")}</h3>
        <button
          onClick={() => setEditing({ ...EMPTY })}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold transition-colors"
        >
          <Plus size={12} /> {t("glossary.add_entry")}
        </button>
      </div>

      {/* Suche */}
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
        <Search size={14} className="text-white/30" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t("glossary.search_placeholder")}
          className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-white/20"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-white/30 hover:text-white/60">
            <X size={12} />
          </button>
        )}
      </div>

      {/* Liste */}
      <div className="space-y-2 max-h-80 overflow-auto">
        {filtered.length === 0 ? (
          <p className="text-center text-white/20 text-xs py-6">{t("glossary.no_entries")}</p>
        ) : (
          filtered.map(entry => (
            <div key={entry.id} className="flex items-start gap-3 p-3 bg-black/40 border border-white/10 rounded-2xl group">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{entry.term}</p>
                <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{entry.definition}</p>
                {entry.sourceNorm && (
                  <p className="text-[10px] font-mono text-white/20 mt-1">{entry.sourceNorm}</p>
                )}
              </div>
              <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditing({ ...entry })} className="p-1.5 hover:text-blue-400 text-white/30 transition-colors">
                  <Save size={13} />
                </button>
                <button onClick={() => handleDelete(entry.id)} className="p-1.5 hover:text-red-400 text-white/30 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#111] border border-white/10 rounded-3xl p-8 w-full max-w-lg space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">
                  {editing.id ? t("admin.edit") : t("glossary.add_entry")}
                </h3>
                <button onClick={() => setEditing(null)} className="text-white/30 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              {/* Term */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 block mb-1">{t("glossary.term")}</label>
                <input
                  value={editing.term ?? ""}
                  onChange={e => setEditing(prev => ({ ...prev, term: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Definition */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 block mb-1">{t("glossary.definition")}</label>
                <textarea
                  value={editing.definition ?? ""}
                  onChange={e => setEditing(prev => ({ ...prev, definition: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 h-24"
                />
              </div>

              {/* Norm-Referenz */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 block mb-1">{t("glossary.norm_ref")}</label>
                <input
                  value={editing.sourceNorm ?? ""}
                  onChange={e => setEditing(prev => ({ ...prev, sourceNorm: e.target.value }))}
                  placeholder="z. B. VSS 40 886, ASTRA 15009"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Mehrsprachig (Platzhalter für Phase 2) */}
              <p className="text-[10px] text-white/20 italic">
                Mehrsprachige Übersetzungen: Phase 2 (FR / EN / IT)
              </p>

              {/* Aktionen */}
              <div className="flex gap-3 pt-2 border-t border-white/10">
                <button
                  onClick={() => setEditing(null)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition-colors"
                >
                  {t("admin.cancel")}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editing.term?.trim()}
                  className={cn(
                    "ml-auto flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                    saving || !editing.term?.trim()
                      ? "bg-white/5 text-white/20 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-500 text-white",
                  )}
                >
                  <Save size={15} /> {saving ? "Speichere..." : t("glossary.save_entry")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
