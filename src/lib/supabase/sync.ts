import { getSupabase } from "./client";
import type { UserProgress } from "@/types/user";
import type { ReviewCard } from "@/hooks/useReview";

const PROGRESS_KEY = "gastro-ed-progress";
const REVIEW_KEY = "gastro-ed-review";

// --- Push ---

export async function pushProgress(
  userId: string,
  progress: UserProgress
): Promise<void> {
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
    updated_at: new Date().toISOString(),
  });
  if (error) console.error("pushProgress:", error.message);
}

export async function pushReviewCards(
  userId: string,
  cards: ReviewCard[]
): Promise<void> {
  if (cards.length === 0) return;
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
  return {
    ...getDefaultProgress(),
    streakCurrent: data.streak_current,
    streakBest: data.streak_best,
    totalPoints: data.total_points,
    cardsSeen: data.cards_seen,
    cardsCorrect: data.cards_correct,
    lastActiveDate: data.last_active_date || "",
    dailyGoal: data.daily_goal,
    todayCardsSeen: data.today_cards_seen,
    updatedAt: data.updated_at,
    xp: data.xp ?? data.total_points ?? 0,
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

function mergeProgress(
  local: UserProgress,
  remote: UserProgress
): UserProgress {
  const localDate = local.lastActiveDate || "";
  const remoteDate = remote.lastActiveDate || "";
  const useLocalStreak = localDate >= remoteDate;

  const winner = useLocalStreak ? local : remote;
  return {
    ...getDefaultProgress(),
    ...winner,
    streakBest: Math.max(local.streakBest, remote.streakBest),
    totalPoints: Math.max(local.totalPoints, remote.totalPoints),
    cardsSeen: Math.max(local.cardsSeen, remote.cardsSeen),
    cardsCorrect: Math.max(local.cardsCorrect, remote.cardsCorrect),
    xp: Math.max(local.xp || 0, remote.xp || 0),
    dailyGoal: local.dailyGoal,
    dailyGoalStreak: Math.max(local.dailyGoalStreak || 0, remote.dailyGoalStreak || 0),
    dailyGoalStreakBest: Math.max(local.dailyGoalStreakBest || 0, remote.dailyGoalStreakBest || 0),
    perfectBlitzCount: Math.max(local.perfectBlitzCount || 0, remote.perfectBlitzCount || 0),
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
    return JSON.parse(saved) as UserProgress;
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
  return {
    streakCurrent: 0,
    streakBest: 0,
    totalPoints: 0,
    cardsSeen: 0,
    cardsCorrect: 0,
    lastActiveDate: "",
    dailyGoal: 10,
    todayCardsSeen: 0,
    xp: 0,
    level: 1,
    unlockedAchievements: {},
    completedChallengeIds: [],
    cardHistory: {},
    dailyGoalStreak: 0,
    dailyGoalStreakBest: 0,
    perfectBlitzCount: 0,
    typeCounts: {},
    topicsAnswered: [],
  };
}

export async function fullSync(userId: string): Promise<void> {
  try {
    const [remoteProgress, remoteCards] = await Promise.all([
      pullProgress(userId),
      pullReviewCards(userId),
    ]);

    const localProgress = loadLocalProgress();
    const localCards = loadLocalReviewCards();

    // Merge progress
    const mergedProgress = remoteProgress
      ? mergeProgress(localProgress, remoteProgress)
      : { ...localProgress, updatedAt: new Date().toISOString() };

    // Merge review cards
    const mergedCards = mergeReviewCards(localCards, remoteCards);

    // Write to localStorage
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(mergedProgress));
    localStorage.setItem(REVIEW_KEY, JSON.stringify(mergedCards));

    // Push to Supabase
    await Promise.all([
      pushProgress(userId, mergedProgress),
      pushReviewCards(userId, mergedCards),
    ]);
  } catch (err) {
    console.error("fullSync:", err);
  }
}
