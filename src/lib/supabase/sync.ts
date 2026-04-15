import { getSupabase, isSupabaseConfigured } from "./client";
import { defaultProgress } from "@/data/defaults";
import type {
  UserProgress,
  CardHistoryEntry,
  DailyCaseHistoryEntry,
} from "@/types/user";
import type { ReviewCard } from "@/hooks/useReview";

const PROGRESS_KEY = "sd-progress";
const REVIEW_KEY = "sd-review";

// --- Push ---

export async function pushProgress(
  userId: string,
  progress: UserProgress
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  const { error } = await supabase.from("user_progress").upsert({
    user_id: userId,
    streak_current: progress.streakCurrent,
    streak_best: progress.streakBest,
    total_points: progress.totalPoints,
    cards_seen: progress.cardsSeen,
    cards_correct: progress.cardsCorrect,
    last_active_date: progress.lastActiveDate || null,
    daily_goal: progress.dailyGoal,
    today_cards_seen: progress.todayCardsSeen,
    xp: progress.xp,
    level: progress.level,
    unlocked_achievements: progress.unlockedAchievements,
    completed_challenge_ids: progress.completedChallengeIds,
    card_history: progress.cardHistory,
    daily_goal_streak: progress.dailyGoalStreak,
    daily_goal_streak_best: progress.dailyGoalStreakBest,
    perfect_blitz_count: progress.perfectBlitzCount,
    type_counts: progress.typeCounts,
    topics_answered: progress.topicsAnswered,
    daily_case_history: progress.dailyCaseHistory,
    recent_answers: progress.recentAnswers,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error("pushProgress:", error.message);
}

export async function pushReviewCards(
  userId: string,
  cards: ReviewCard[]
): Promise<void> {
  if (cards.length === 0 || !isSupabaseConfigured()) return;
  const supabase = getSupabase();
  const rows = cards.map((c) => ({
    user_id: userId,
    card_id: c.cardId,
    fsrs_state: c.fsrs,
    due: new Date(c.fsrs.due).toISOString(),
    last_review: c.fsrs.last_review
      ? new Date(c.fsrs.last_review).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("review_cards").upsert(rows);
  if (error) console.error("pushReviewCards:", error.message);
}

export async function logAnswer(
  userId: string,
  cardId: string,
  isCorrect: boolean
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  const { error } = await supabase.from("user_answers").insert({
    user_id: userId,
    card_id: cardId,
    is_correct: isCorrect,
  });
  if (error) console.error("logAnswer:", error.message);
}

// --- Pull ---

async function pullProgress(
  userId: string
): Promise<UserProgress | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  const defaults = getDefaultProgress();
  return {
    streakCurrent: data.streak_current ?? 0,
    streakBest: data.streak_best ?? 0,
    totalPoints: data.total_points ?? 0,
    cardsSeen: data.cards_seen ?? 0,
    cardsCorrect: data.cards_correct ?? 0,
    lastActiveDate: data.last_active_date || "",
    dailyGoal: data.daily_goal ?? defaults.dailyGoal,
    todayCardsSeen: data.today_cards_seen ?? 0,
    updatedAt: data.updated_at,
    xp: data.xp ?? 0,
    level: data.level ?? 1,
    unlockedAchievements: data.unlocked_achievements ?? {},
    completedChallengeIds: data.completed_challenge_ids ?? [],
    cardHistory: data.card_history ?? {},
    dailyGoalStreak: data.daily_goal_streak ?? 0,
    dailyGoalStreakBest: data.daily_goal_streak_best ?? 0,
    perfectBlitzCount: data.perfect_blitz_count ?? 0,
    typeCounts: data.type_counts ?? {},
    topicsAnswered: data.topics_answered ?? [],
    dailyCaseHistory: data.daily_case_history ?? {},
    recentAnswers: data.recent_answers ?? [],
  };
}

async function pullReviewCards(userId: string): Promise<ReviewCard[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("review_cards")
    .select("*")
    .eq("user_id", userId);
  if (error || !data) return [];
  return data.map((row) => ({
    cardId: row.card_id,
    fsrs: {
      ...row.fsrs_state,
      due: new Date(row.due),
      last_review: row.last_review ? new Date(row.last_review) : undefined,
    },
  }));
}

// --- Merge ---

function mergeCardHistory(
  a: Record<string, CardHistoryEntry>,
  b: Record<string, CardHistoryEntry>
): Record<string, CardHistoryEntry> {
  const out: Record<string, CardHistoryEntry> = { ...a };
  for (const [id, entry] of Object.entries(b)) {
    const existing = out[id];
    if (!existing) {
      out[id] = entry;
      continue;
    }
    // Per-card: take the freshest by lastSeen, but accumulate attempts/correct
    // as the maximum across both sides (each side is a monotonic counter).
    const freshest =
      (entry.lastSeen || "") >= (existing.lastSeen || "") ? entry : existing;
    out[id] = {
      attempts: Math.max(existing.attempts, entry.attempts),
      correct: Math.max(existing.correct, entry.correct),
      lastSeen: freshest.lastSeen,
      consecutiveFails: freshest.consecutiveFails,
    };
  }
  return out;
}

function mergeDailyCaseHistory(
  a: Record<string, DailyCaseHistoryEntry>,
  b: Record<string, DailyCaseHistoryEntry>
): Record<string, DailyCaseHistoryEntry> {
  // Keyed by date; a case is completed once per day, so last write wins on
  // completedAt (later timestamp beats earlier).
  const out: Record<string, DailyCaseHistoryEntry> = { ...a };
  for (const [date, entry] of Object.entries(b)) {
    const existing = out[date];
    if (!existing || (entry.completedAt || "") > (existing.completedAt || "")) {
      out[date] = entry;
    }
  }
  return out;
}

function mergeTypeCounts(
  a: Record<string, number>,
  b: Record<string, number>
): Record<string, number> {
  const out: Record<string, number> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    out[k] = Math.max(out[k] ?? 0, v);
  }
  return out;
}

function unionUnique<T>(a: T[], b: T[]): T[] {
  return Array.from(new Set([...(a ?? []), ...(b ?? [])]));
}

function mergeAchievements(
  a: Record<string, string>,
  b: Record<string, string>
): Record<string, string> {
  // Keep the earliest unlock timestamp on conflict — it's the true first-unlock.
  const out: Record<string, string> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (!(k in out) || v < out[k]) out[k] = v;
  }
  return out;
}

export function mergeProgress(
  local: UserProgress,
  remote: UserProgress
): UserProgress {
  const localDate = local.lastActiveDate || "";
  const remoteDate = remote.lastActiveDate || "";
  const useLocalStreak = localDate >= remoteDate;

  // streakCurrent/lastActiveDate/todayCardsSeen go together — they describe
  // the same "today" snapshot, so we pick one side as the source.
  const snapshot = useLocalStreak ? local : remote;

  return {
    streakCurrent: snapshot.streakCurrent,
    lastActiveDate: snapshot.lastActiveDate,
    todayCardsSeen: snapshot.todayCardsSeen,
    streakBest: Math.max(local.streakBest, remote.streakBest),
    totalPoints: Math.max(local.totalPoints, remote.totalPoints),
    cardsSeen: Math.max(local.cardsSeen, remote.cardsSeen),
    cardsCorrect: Math.max(local.cardsCorrect, remote.cardsCorrect),
    xp: Math.max(local.xp ?? 0, remote.xp ?? 0),
    level: Math.max(local.level ?? 1, remote.level ?? 1),
    dailyGoal: local.dailyGoal, // user setting: local device wins
    dailyGoalStreak: Math.max(
      local.dailyGoalStreak ?? 0,
      remote.dailyGoalStreak ?? 0
    ),
    dailyGoalStreakBest: Math.max(
      local.dailyGoalStreakBest ?? 0,
      remote.dailyGoalStreakBest ?? 0
    ),
    perfectBlitzCount: Math.max(
      local.perfectBlitzCount ?? 0,
      remote.perfectBlitzCount ?? 0
    ),
    unlockedAchievements: mergeAchievements(
      local.unlockedAchievements ?? {},
      remote.unlockedAchievements ?? {}
    ),
    completedChallengeIds: unionUnique(
      local.completedChallengeIds ?? [],
      remote.completedChallengeIds ?? []
    ),
    cardHistory: mergeCardHistory(
      local.cardHistory ?? {},
      remote.cardHistory ?? {}
    ),
    typeCounts: mergeTypeCounts(
      local.typeCounts ?? {},
      remote.typeCounts ?? {}
    ),
    topicsAnswered: unionUnique(
      local.topicsAnswered ?? [],
      remote.topicsAnswered ?? []
    ),
    dailyCaseHistory: mergeDailyCaseHistory(
      local.dailyCaseHistory ?? {},
      remote.dailyCaseHistory ?? {}
    ),
    recentAnswers: (local.recentAnswers?.length ?? 0) >= (remote.recentAnswers?.length ?? 0)
      ? local.recentAnswers ?? []
      : remote.recentAnswers ?? [],
    updatedAt: new Date().toISOString(),
  };
}

function mergeReviewCards(
  local: ReviewCard[],
  remote: ReviewCard[]
): ReviewCard[] {
  const map = new Map<string, ReviewCard>();

  for (const card of remote) {
    map.set(card.cardId, card);
  }

  for (const card of local) {
    const existing = map.get(card.cardId);
    if (!existing) {
      map.set(card.cardId, card);
    } else {
      const localReview = card.fsrs.last_review
        ? new Date(card.fsrs.last_review).getTime()
        : 0;
      const remoteReview = existing.fsrs.last_review
        ? new Date(existing.fsrs.last_review).getTime()
        : 0;
      if (localReview >= remoteReview) {
        map.set(card.cardId, card);
      }
    }
  }

  return Array.from(map.values());
}

// --- Full Sync ---

function loadLocalProgress(): UserProgress {
  try {
    const saved = localStorage.getItem(PROGRESS_KEY);
    if (!saved) return getDefaultProgress();
    return { ...getDefaultProgress(), ...JSON.parse(saved) } as UserProgress;
  } catch {
    return getDefaultProgress();
  }
}

function loadLocalReviewCards(): ReviewCard[] {
  try {
    const saved = localStorage.getItem(REVIEW_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved) as ReviewCard[];
    return parsed.map((rc) => ({
      ...rc,
      fsrs: {
        ...rc.fsrs,
        due: new Date(rc.fsrs.due),
        last_review: rc.fsrs.last_review
          ? new Date(rc.fsrs.last_review)
          : undefined,
      },
    }));
  } catch {
    return [];
  }
}

function getDefaultProgress(): UserProgress {
  return { ...defaultProgress };
}

export async function fullSync(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const [remoteProgress, remoteCards] = await Promise.all([
      pullProgress(userId),
      pullReviewCards(userId),
    ]);

    const localProgress = loadLocalProgress();
    const localCards = loadLocalReviewCards();

    const mergedProgress = remoteProgress
      ? mergeProgress(localProgress, remoteProgress)
      : { ...localProgress, updatedAt: new Date().toISOString() };

    const mergedCards = mergeReviewCards(localCards, remoteCards);

    localStorage.setItem(PROGRESS_KEY, JSON.stringify(mergedProgress));
    localStorage.setItem(REVIEW_KEY, JSON.stringify(mergedCards));

    await Promise.all([
      pushProgress(userId, mergedProgress),
      pushReviewCards(userId, mergedCards),
    ]);
  } catch (err) {
    console.error("fullSync:", err);
  }
}
