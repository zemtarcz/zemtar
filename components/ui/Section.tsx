import type { ReactNode } from "react";

type Tone = "void" | "panel" | "deep";

const tones: Record<Tone, string> = {
  void: "bg-void",
  panel: "bg-panel",
  deep: "bg-deep",
};

type Props = {
  id?: string;
  tone?: Tone;
  children: ReactNode;
  className?: string;
};

export function Section({ id, tone = "void", children, className = "" }: Props) {
  return (
    <section
      id={id}
      className={`${tones[tone]} border-t border-line py-16 md:py-20 ${className}`}
    >
      <div className="mx-auto max-w-6xl px-4 md:px-8">{children}</div>
    </section>
  );
}
