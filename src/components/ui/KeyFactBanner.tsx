"use client";

interface Props {
  keyFact: string;
}

export default function KeyFactBanner({ keyFact }: Props) {
  return (
    <div className="mx-6 mb-2 px-3 py-2 rounded-lg border border-warning/20 bg-warning/5">
      <p className="text-xs text-muted font-medium mb-0.5">
        Помните:
      </p>
      <p className="text-sm text-foreground leading-snug">{keyFact}</p>
    </div>
  );
}
