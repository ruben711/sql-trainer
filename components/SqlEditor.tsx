"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme";

const Monaco = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full grid place-items-center text-2xs text-fg-dim font-mono">
      editor laden…
    </div>
  ),
});

export default function SqlEditor({
  value,
  onChange,
  height = "100%",
  onRun,
}: {
  value: string;
  onChange: (v: string) => void;
  height?: number | string;
  onRun?: () => void;
}) {
  const onRunRef = useRef(onRun);
  useEffect(() => { onRunRef.current = onRun; }, [onRun]);
  const resolved = useTheme((s) => s.resolved);
  const [theme, setTheme] = useState<"vs-dark" | "vs">("vs-dark");
  useEffect(() => { setTheme(resolved === "light" ? "vs" : "vs-dark"); }, [resolved]);

  return (
    <div className="h-full w-full bg-sunken">
      <Monaco
        height={height}
        defaultLanguage="sql"
        theme={theme}
        value={value}
        onChange={(v) => onChange(v ?? "")}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: '"JetBrains Mono", "Cascadia Code", ui-monospace, Consolas, monospace',
          fontLigatures: true,
          scrollBeyondLastLine: false,
          tabSize: 2,
          wordWrap: "on",
          padding: { top: 10, bottom: 10 },
          renderLineHighlight: "all",
          automaticLayout: true,
          smoothScrolling: true,
          cursorBlinking: "smooth",
          lineNumbersMinChars: 3,
          glyphMargin: false,
          folding: false,
          scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
        }}
        onMount={(editor, monaco) => {
          editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunRef.current?.());
          editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
            editor.getAction("editor.action.commentLine")?.run();
          });
          editor.focus();
        }}
      />
    </div>
  );
}
