import { MODES, type Mode } from "./modes";

export type Difficulty = "easy" | "medium" | "hard";

export type Exercise = {
  id: string;
  chapter: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  prompt: string;
  solution: string;
  hints?: string[];
  orderMatters?: boolean;
  strictColumnNames?: boolean;
  /** Tabellen die voor deze oefening relevant zijn — worden in het schema-paneel gehighlight. */
  relatedTables?: string[];
};

export function getExercises(mode: Mode): Exercise[] {
  return MODES[mode].exercises;
}

export function getExercise(mode: Mode, id: string): Exercise | undefined {
  return getExercises(mode).find((e) => e.id === id);
}

export function chapters(mode: Mode): string[] {
  return Array.from(new Set(getExercises(mode).map((e) => e.chapter)));
}

export function byChapter(mode: Mode): Record<string, Exercise[]> {
  return getExercises(mode).reduce((acc, e) => {
    (acc[e.chapter] ||= []).push(e);
    return acc;
  }, {} as Record<string, Exercise[]>);
}

export function nextExercise(mode: Mode, id: string): Exercise | undefined {
  const xs = getExercises(mode);
  const i = xs.findIndex((e) => e.id === id);
  if (i < 0) return undefined;
  return xs[(i + 1) % xs.length];
}

export function randomSample(
  mode: Mode,
  n: number,
  opts?: { difficulties?: Difficulty[]; chapters?: string[] }
): Exercise[] {
  let pool = getExercises(mode).slice();
  if (opts?.difficulties?.length) pool = pool.filter((e) => opts.difficulties!.includes(e.difficulty));
  if (opts?.chapters?.length) pool = pool.filter((e) => opts.chapters!.includes(e.chapter));
  const out: Exercise[] = [];
  while (out.length < n && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}
