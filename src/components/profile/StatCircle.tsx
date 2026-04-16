import GradientRing from "@/components/ui/GradientRing";
import NumberTicker from "@/components/ui/NumberTicker";

export default function StatCircle({
  display,
  fill,
  label,
  suffix,
  size = "md",
}: {
  display: number;
  fill: number;
  label: string;
  suffix?: string;
  size?: "md" | "lg";
}) {
  const dim = size === "lg" ? 108 : 92;
  const thickness = size === "lg" ? 4 : 3.5;
  const numberClass =
    size === "lg"
      ? "text-2xl font-extralight tracking-tight leading-none"
      : "text-xl font-extralight tracking-tight leading-none";
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: dim, height: dim }}>
        <GradientRing value={fill} size={dim} thickness={thickness} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${numberClass} aurora-text`}>
            <NumberTicker value={display} />
            {suffix}
          </span>
        </div>
      </div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted mt-3 font-medium text-center">
        {label}
      </p>
    </div>
  );
}
