import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { Trophy, Lock, Hash } from "lucide-react";
import { cn } from "../lib/utils";
import { RankingEntry, Course, RankingScope } from "../types";
import { apiFetch } from "../lib/api";

type Tab = RankingScope;

interface Props {
  username: string;
  topics: { id: string; name: string }[];
  completedTopicIds: string[];   // Themen, die der User abgeschlossen hat
  activeCourseId?: string;       // Falls User an Kurs teilnimmt
  onBack: () => void;
}

interface TopicEntry extends RankingEntry {
  rank: number;
}

export default function Leaderboard({ username, topics, completedTopicIds, activeCourseId, onBack }: Props) {
  const { t } = useTranslation();
  const [tab, setTab]       = useState<Tab>("topic");
  const [topicId, setTopicId] = useState(topics[0]?.id ?? "");
  const [courseCode, setCourseCode] = useState("");
  const [courseId, setCourseId]   = useState(activeCourseId ?? "");
  const [entries, setEntries]     = useState<RankingEntry[]>([]);
  const [courses, setCourses]     = useState<Course[]>([]);
  const [loading, setLoading]     = useState(false);
  const [courseError, setCourseError] = useState("");

  const allTopicsComplete = topics.every(t => completedTopicIds.includes(t.id));

  // ── Rankings laden ───────────────────────────────────────────────────────────

  const loadRankings = (scope: RankingScope, scopeId: string) => {
    if (!scopeId) return;
    setLoading(true);
    apiFetch<RankingEntry[]>(`/api/rankings/${scope}/${scopeId}`)
      .then(data => { setEntries(data); setLoading(false); })
      .catch(() => { setEntries([]); setLoading(false); });
  };

  useEffect(() => {
    if (tab === "topic" && topicId)  loadRankings("topic", topicId);
    if (tab === "total")              loadRankings("total", "total");
    if (tab === "course" && courseId) loadRankings("course", courseId);
  }, [tab, topicId, courseId]);

  useEffect(() => {
    apiFetch<Course[]>("/api/courses")
      .then(setCourses)
      .catch(() => setCourses([]));
  }, []);

  const handleJoinCourse = () => {
    const found = courses.find(c => c.accessCode === courseCode.trim() && c.active);
    if (found) {
      setCourseId(found.id);
      setCourseError("");
      loadRankings("course", found.id);
    } else {
      setCourseError(t("ranking.course_not_found"));
    }
  };

  // ── Tabellen-Rendering ───────────────────────────────────────────────────────

  const sorted = [...entries].sort((a, b) => b.score - a.score).slice(0, 10);

  const placeIcon = (i: number) => {
    if (i === 0) return "🥇";
    if (i === 1) return "🥈";
    if (i === 2) return "🥉";
    return `#${i + 1}`;
  };

  return (
    <motion.div
      key="leaderboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-8 max-w-3xl mx-auto w-full"
    >
      {/* Titel */}
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-3xl font-bold flex items-center gap-3">
          <Trophy className="text-yellow-400" /> {t("ranking.title")}
        </h2>
        <button onClick={onBack} className="text-sm text-white/60 hover:text-white transition-colors">
          {t("ranking.back_to_dashboard")}
        </button>
      </div>

      {/* Tab-Navigation */}
      <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-2xl mb-6">
        {(["topic", "total", "course"] as Tab[]).map(t_ => (
          <button
            key={t_}
            onClick={() => {
              if (t_ === "total" && !allTopicsComplete) return;
              setTab(t_);
            }}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
              tab === t_ ? "bg-blue-600 text-white" : "text-white/40 hover:text-white/80",
              t_ === "total" && !allTopicsComplete && "cursor-not-allowed opacity-40",
            )}
          >
            {t_ === "total" && !allTopicsComplete && <Lock size={14} />}
            {t_ === "topic"  && t("ranking.tab_topic")}
            {t_ === "total"  && t("ranking.tab_total")}
            {t_ === "course" && t("ranking.tab_course")}
          </button>
        ))}
      </div>

      {/* Themenbereich-Auswahl */}
      {tab === "topic" && (
        <div className="flex flex-wrap gap-2 mb-4">
          {topics.map(tp => (
            <button
              key={tp.id}
              onClick={() => setTopicId(tp.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold border transition-all",
                topicId === tp.id
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-white/5 border-white/10 text-white/50 hover:border-white/30",
              )}
            >
              {tp.name}
            </button>
          ))}
        </div>
      )}

      {/* Gesamt gesperrt */}
      {tab === "total" && !allTopicsComplete && (
        <div className="p-6 bg-white/5 border border-white/10 rounded-3xl text-center text-white/40 text-sm">
          <Lock size={24} className="mx-auto mb-3 opacity-30" />
          {t("ranking.total_locked")}
        </div>
      )}

      {/* Kurs: Code eingeben */}
      {tab === "course" && !courseId && (
        <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4 mb-4">
          <div className="flex gap-3">
            <input
              value={courseCode}
              onChange={e => setCourseCode(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleJoinCourse()}
              placeholder={t("ranking.course_placeholder")}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 placeholder:text-white/20"
            />
            <button
              onClick={handleJoinCourse}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold transition-colors"
            >
              {t("ranking.course_join_btn")}
            </button>
          </div>
          {courseError && (
            <p className="text-red-400 text-xs">{courseError}</p>
          )}
        </div>
      )}

      {/* Aktiver Kurs-Name */}
      {tab === "course" && courseId && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-blue-400">
            {courses.find(c => c.id === courseId)?.name ?? courseId}
          </p>
          <button
            onClick={() => { setCourseId(""); setCourseCode(""); setEntries([]); }}
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Kurs wechseln
          </button>
        </div>
      )}

      {/* Tabelle */}
      {((tab === "topic" && topicId) || (tab === "total" && allTopicsComplete) || (tab === "course" && courseId)) && (
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="p-12 text-center text-white/30 text-sm">{t("ranking.no_entries")}</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-white/30">{t("ranking.col_rank")}</th>
                  <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-white/30">{t("ranking.col_name")}</th>
                  <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-white/30 text-center">{t("ranking.col_scenes")}</th>
                  <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-white/30 text-right">{t("ranking.col_score")}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((entry, idx) => (
                  <tr
                    key={idx}
                    className={cn(
                      "border-b border-white/5 transition-colors hover:bg-white/5",
                      entry.username === username ? "bg-blue-500/10" : "",
                    )}
                  >
                    <td className="px-5 py-4 font-mono text-lg">
                      {placeIcon(idx)}
                    </td>
                    <td className="px-5 py-4 font-bold">
                      {entry.username}
                      {entry.username === username && (
                        <span className="ml-2 text-[9px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">Du</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center text-white/50 text-sm">{entry.completedScenes}</td>
                    <td className="px-5 py-4 text-right font-black text-blue-400 tabular-nums">{entry.score.toLocaleString("de-CH")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </motion.div>
  );
}
