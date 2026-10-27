import MiniSearch from "minisearch";
import type { ExerciseInfo } from "./exercises";
import type { ExerciseUsageByName } from "./exerciseUsage";

export const SEARCH_RESULT_LIMIT = 50;

/** Lowercase, trimmed, whitespace-collapsed form used for match tiers. */
export function normalizeExerciseName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export interface ExerciseSearchSource {
  index: MiniSearch<ExerciseInfo>;
  byId: Map<string, ExerciseInfo>;
}

export interface ExerciseSearchResult {
  exercise: ExerciseInfo;
  /** Final deterministic score: tier × 10 + text relevance + history. */
  score: number;
  /** 3 exact, 2 strong prefix/all-query-words, 1 partial word, 0 fuzzy/other. */
  matchTier: number;
  /** MiniSearch relevance normalized to 0..1 across this result set. */
  textScore: number;
  /** Frequency/recency signal, bounded to 0..HISTORY_BOOST_SCALE. */
  historyBoost: number;
}

const QUERY_TOKENS = (query: string): string[] =>
  query.trim().toLowerCase().split(/\s+/).filter(Boolean);

/**
 * Text-relevance tiers. Exact and whole-name prefix remain separate, but every
 * query word prefix is also a strong tier so e.g. a logged "Barbell Bench
 * Press - Medium Grip" competes in the same bucket as other "bench" matches
 * rather than being penalized for a longer name. Only comparable tiers compete
 * on personal history.
 */
function matchTier(exercise: ExerciseInfo, query: string): number {
  const name = normalizeExerciseName(exercise.name);
  if (name === query) return 3;
  if (name.startsWith(query)) return 2;

  const queryTokens = QUERY_TOKENS(query);
  const nameTokens = name.split(/\s+/).filter(Boolean);
  if (queryTokens.every((t) => nameTokens.some((n) => n.startsWith(t)))) return 2;
  if (queryTokens.some((t) => nameTokens.some((n) => n.startsWith(t)))) return 1;
  return 0;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENCY_WINDOW_DAYS = 90;
/** Additive history points; 5 cannot cross the 10-point text-tier gap. */
const HISTORY_BOOST_SCALE = 5;

function historyBoost(
  usage: ExerciseUsageByName,
  name: string,
  maxSessionCount: number,
  now: number,
): number {
  const use = usage.get(name);
  if (!use || use.sessionCount <= 0) return 0;
  const frequency =
    maxSessionCount > 0 ? Math.log1p(use.sessionCount) / Math.log1p(maxSessionCount) : 0;
  const ageDays = Math.max(0, (now - use.lastUsedAt) / DAY_MS);
  const recency = Math.exp(-ageDays / RECENCY_WINDOW_DAYS);
  return HISTORY_BOOST_SCALE * (0.8 * frequency + 0.2 * recency);
}

/**
 * Creates an on-device MiniSearch index over exercise names only. Rebuild on
 * catalog changes; usage is not part of the index and is applied per query.
 */
export function createExerciseSearch(exercises: readonly ExerciseInfo[]): ExerciseSearchSource {
  const index = new MiniSearch<ExerciseInfo>({
    fields: ["name"],
    idField: "id",
    searchOptions: {
      prefix: true,
      fuzzy: (term: string): number | false => (term.length >= 3 ? 0.2 : false),
      weights: { fuzzy: 0.5, prefix: 0.75 },
      combineWith: "AND",
    },
  });
  index.addAll([...exercises]);
  return {
    index,
    byId: new Map(exercises.map((e) => [e.id, e])),
  };
}

/**
 * Weighted exercise search: MiniSearch text relevance first, then a capped
 * history boost composed of usage frequency and recency. Strong text matches
 * can never fall below weaker ones because of history.
 */
export function searchExercises(
  source: ExerciseSearchSource,
  query: string,
  usage: ExerciseUsageByName,
  now: number = Date.now(),
  limit: number = SEARCH_RESULT_LIMIT,
): ExerciseSearchResult[] {
  const normalizedQuery = normalizeExerciseName(query);
  const rawResults = source.index.search(normalizedQuery);
  if (rawResults.length === 0) return [];

  const maxTextScore = Math.max(...rawResults.map((r) => r.score));
  let maxSessionCount = 0;
  for (const use of usage.values()) {
    maxSessionCount = Math.max(maxSessionCount, use.sessionCount);
  }

  const results: ExerciseSearchResult[] = [];
  for (const raw of rawResults) {
    const exercise = source.byId.get(String(raw.id));
    if (!exercise) continue;
    const tier = matchTier(exercise, normalizedQuery);
    const textScore = raw.score / maxTextScore;
    const boost = historyBoost(usage, exercise.name, maxSessionCount, now);
    results.push({
      exercise,
      score: tier * 10 + textScore + boost,
      matchTier: tier,
      textScore,
      historyBoost: boost,
    });
  }

  results.sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name));
  return results.slice(0, limit);
}
