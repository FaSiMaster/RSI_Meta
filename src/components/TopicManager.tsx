import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Archive, X, Save, GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import { Topic } from "../types";
import { apiFetch } from "../lib/api";

interface Props {
  topics: Topic[];
  adminKey: string;
  onTopicsChanged: (topics: Topic[]) => void;
  onError: (msg: string) => void;
}

const EMPTY_TOPIC: Partial<Topic> = {
  name: "",
  nameI18n: { de: "" },
  description: "",
  icon: "",
  parentTopicId: "",
  archived: false,
};

export default function TopicManager({ topics, adminKey, onTopicsChanged, onError }: Props) {
  const { t } = useTranslation();
  const [editing, setEditing]   = useState<Partial<Topic> | null>(null);
  const [saving, setSaving]     = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // ── Speichern ────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!editing?.name?.trim()) return;
    setSaving(true);
    try {
      const method = editing.id ? "PUT" : "POST";
      const url    = editing.id ? `/api/admin/topics/${editing.id}` : "/api/admin/topics";
      await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
        body: JSON.stringify({
          ...editing,
          nameI18n: { ...editing.nameI18n, de: editing.name },
        }),
      });
      const updated = await apiFetch<Topic[]>("/api/topics");
      onTopicsChanged(updated);
      setEditing(null);
    } catch (err: unknown) {
      onError(`${t("errors.save_topic")}: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (topic: Topic) => {
    if (!confirm(t("topicManager.archive_confirm"))) return;
    try {
      await apiFetch(`/api/admin/topics/${topic.id}/archive`, {
        method: "PATCH",
        headers: { "X-Admin-Key": adminKey },
      });
      const updated = await apiFetch<Topic[]>("/api/topics");
      onTopicsChanged(updated);
    } catch (err: unknown) {
      onError(`${t("errors.save_topic")}: ${(err as Error).message}`);
    }
  };

  // ── Hierarchie: Hauptthemen und Unterthemen ───────────────────────────────────

  const rootTopics = topics.filter(t => !t.parentTopicId);
  const subTopics  = (parentId: string) => topics.filter(t => t.parentTopicId === parentId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">
          {t("topicManager.title")}
        </h3>
        <button
          onClick={() => setEditing({ ...EMPTY_TOPIC })}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold transition-colors"
        >
          <Plus size={12} /> {t("topicManager.new_topic")}
        </button>
      </div>

      {/* Topic-Liste */}
      <div className="space-y-2">
        {rootTopics.map(topic => {
          const subs = subTopics(topic.id);
          const isOpen = expanded[topic.id];

          return (
            <div key={topic.id}>
              <div
                className={cn(
                  "flex items-center gap-3 p-3 rounded-2xl border transition-all",
                  topic.archived
                    ? "bg-white/2 border-white/5 opacity-40"
                    : "bg-black/40 border-white/10 hover:border-white/20",
                )}
              >
                <GripVertical size={14} className="text-white/20 cursor-grab shrink-0" aria-label={t("admin.drag_hint")} />

                {subs.length > 0 && (
                  <button onClick={() => setExpanded(prev => ({ ...prev, [topic.id]: !isOpen }))} className="text-white/30 hover:text-white/60">
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{topic.name}</p>
                  <p className="text-[10px] text-white/30 truncate">{topic.id}</p>
                </div>

                {topic.archived && (
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/20 bg-white/5 px-2 py-0.5 rounded-full">
                    {t("topicManager.archived_label")}
                  </span>
                )}

                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => setEditing({ ...topic })}
                    className="p-1.5 hover:text-blue-400 text-white/30 transition-colors"
                  >
                    <Save size={13} />
                  </button>
                  {!topic.archived && (
                    <button
                      onClick={() => handleArchive(topic)}
                      className="p-1.5 hover:text-orange-400 text-white/30 transition-colors"
                      title={t("admin.archive")}
                    >
                      <Archive size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Unterthemen */}
              <AnimatePresence>
                {isOpen && subs.map(sub => (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="ml-6 mt-1"
                  >
                    <div className="flex items-center gap-3 p-3 rounded-2xl border border-white/5 bg-white/2">
                      <div className="w-px h-4 bg-white/10 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{sub.name}</p>
                      </div>
                      <button
                        onClick={() => setEditing({ ...sub })}
                        className="p-1.5 hover:text-blue-400 text-white/20 transition-colors"
                      >
                        <Save size={12} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          );
        })}
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
              className="bg-[#111] border border-white/10 rounded-3xl p-8 w-full max-w-xl space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">
                  {editing.id ? t("admin.edit") : t("topicManager.new_topic")}
                </h3>
                <button onClick={() => setEditing(null)} className="text-white/30 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              {/* Mehrsprachige Namen */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">{t("topicManager.multilingual")}</p>
                {(["de", "fr", "en", "it"] as const).map(lang => (
                  <div key={lang}>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 block mb-1">
                      {t(`topicManager.name_${lang}`)}
                    </label>
                    <input
                      value={(editing.nameI18n?.[lang] ?? "") || (lang === "de" ? editing.name ?? "" : "")}
                      onChange={e => setEditing(prev => ({
                        ...prev,
                        nameI18n: { ...prev?.nameI18n, [lang]: e.target.value },
                        ...(lang === "de" ? { name: e.target.value } : {}),
                      }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>

              {/* Beschreibung */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 block mb-1">{t("topicManager.desc_de")}</label>
                <textarea
                  value={editing.description ?? ""}
                  onChange={e => setEditing(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Icon */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 block mb-1">{t("topicManager.topic_icon")}</label>
                  <input
                    value={editing.icon ?? ""}
                    onChange={e => setEditing(prev => ({ ...prev, icon: e.target.value }))}
                    placeholder="z. B. Car, Footprints"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Oberthema */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 block mb-1">{t("topicManager.topic_parent")}</label>
                  <select
                    value={editing.parentTopicId ?? ""}
                    onChange={e => setEditing(prev => ({ ...prev, parentTopicId: e.target.value || undefined }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">— Hauptthema —</option>
                    {topics.filter(t => !t.parentTopicId && t.id !== editing.id).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

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
                  disabled={saving || !editing.name?.trim()}
                  className={cn(
                    "ml-auto flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                    saving || !editing.name?.trim()
                      ? "bg-white/5 text-white/20 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-500 text-white",
                  )}
                >
                  <Save size={15} /> {saving ? "Speichere..." : t("admin.save_deficit").replace("Defizit", "Thema")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
