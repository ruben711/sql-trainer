"use client";
import { useParams, useRouter } from "next/navigation";
import { getExercise, nextExercise } from "@/lib/exercises";
import { useMode } from "@/lib/modes";
import ExerciseRunner from "@/components/ExerciseRunner";
import Link from "next/link";

export default function ExerciseDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const mode = useMode((s) => s.mode);
  const ex = getExercise(mode, params.id);

  if (!ex) {
    return (
      <div className="p-4">
        <div className="pane p-4">
          <p className="text-sm">Oefening niet gevonden in deze modus.</p>
          <Link href="/exercises" className="btn-primary mt-3 inline-flex">← Terug naar overzicht</Link>
        </div>
      </div>
    );
  }

  const next = nextExercise(mode, ex.id);

  return (
    <div className="h-full flex flex-col">
      <div className="tabbar">
        <Link href="/exercises" className="tab">← Alle oefeningen</Link>
        <div className="tab tab-active font-mono">
          <span>{ex.id}</span>
          <span className="text-fg-dim normal-case">— {ex.title}</span>
        </div>
        {next && (
          <button onClick={() => router.push(`/exercises/${next.id}`)} className="tab ml-auto">
            Volgende <span className="font-mono text-fg-dim">{next.id}</span> →
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <ExerciseRunner exercise={ex} />
      </div>
    </div>
  );
}
