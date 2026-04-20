"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme, type CompanionKind, type CompanionVisibility } from "@/contexts/ThemeContext";

export type CharacterState = "idle" | "thinking" | "happy" | "sad" | "speaking" | "sleeping";

interface CharacterAvatarProps {
  state?: CharacterState;
  onClick?: () => void;
  size?: number;
  /** Override persisted companion selection (used for previews). */
  character?: CompanionKind;
}

interface Position {
  x: number; // percentage from left (0-100)
  y: number; // percentage from top (0-100)
}

export const DEFAULT_POSITION: Position = { x: 88, y: 70 };
export const STORAGE_KEY = "medmind-avatar-position";
const PADDING_PX = 8;

const GLOW_COLORS: Record<CompanionKind, string> = {
  orb: "radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--color-aurora-violet) 55%, transparent), color-mix(in srgb, var(--color-aurora-indigo) 30%, transparent) 50%, transparent 75%)",
  doctor: "radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--companion-accent) 50%, transparent), color-mix(in srgb, var(--color-aurora-indigo) 25%, transparent) 50%, transparent 75%)",
  mouse: "radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--companion-accent) 50%, transparent), color-mix(in srgb, var(--companion-mouse-fur-mid) 40%, transparent) 50%, transparent 75%)",
  owl: "radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--companion-accent) 55%, transparent), color-mix(in srgb, var(--color-aurora-violet) 30%, transparent) 50%, transparent 75%)",
};

/**
 * Living MedMind character that peeks out from behind the screen edge.
 * Supports 4 character kinds: orb, doctor, mouse, owl.
 * Draggable to any edge, persistent position.
 */
export default function CharacterAvatar({
  state = "idle",
  onClick,
  size = 76,
  character,
}: CharacterAvatarProps) {
  const { companion: companionFromCtx, companionVisibility } = useTheme();
  const companion: CompanionKind = character ?? companionFromCtx;

  const [position, setPosition] = useState<Position>(DEFAULT_POSITION);
  const [tilting, setTilting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; moved: boolean } | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migrate from old edge/offset format
        if (parsed.edge !== undefined) {
          const x = parsed.edge === "left" ? 12 : 88;
          const y = typeof parsed.offset === "number" ? parsed.offset : 70;
          setPosition({ x, y });
        } else if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          setPosition({ x: parsed.x, y: parsed.y });
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    } catch {}
  }, [position, mounted]);

  // Listen for external position changes (from ProfileSheet controls).
  useEffect(() => {
    const onReset = () => setPosition(DEFAULT_POSITION);
    window.addEventListener("medmind-avatar-reset", onReset);
    return () => {
      window.removeEventListener("medmind-avatar-reset", onReset);
    };
  }, []);

  // State-driven tilt — cosmetic only, never affects position.
  useEffect(() => {
    if (state === "thinking" || state === "speaking" || state === "happy") {
      setTilting(true);
    } else {
      const t = window.setTimeout(() => setTilting(false), 2000);
      return () => window.clearTimeout(t);
    }
  }, [state]);

  const positionStyle: React.CSSProperties = (() => {
    const isHalf = companionVisibility === "half";
    const halfShift = isHalf ? size * 0.5 : 0;
    // Determine nearest edge for half-hide direction
    const nearRight = position.x > 50;
    let left = `calc(${position.x}% - ${size / 2}px)`;
    if (isHalf) {
      left = nearRight
        ? `calc(${position.x}% - ${size / 2 - halfShift}px)`
        : `calc(${position.x}% - ${size / 2 + halfShift}px)`;
    }
    return {
      left,
      top: `calc(${position.y}% - ${size / 2}px)`,
    };
  })();

  const lookTilt = tilting ? 6 : 0;
  const tiltDeg = position.x > 50 ? -lookTilt : lookTilt;
  const bodyRotationStyle: React.CSSProperties = {
    transform: `rotate(${tiltDeg}deg)`,
    transition: "transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1)",
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (!dragRef.current.moved && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      dragRef.current.moved = true;
      setDragging(true);
    }
    if (dragRef.current.moved) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const half = size / 2;
      const minX = ((PADDING_PX + half) / w) * 100;
      const maxX = ((w - PADDING_PX - half) / w) * 100;
      const minY = ((PADDING_PX + half) / h) * 100;
      const maxY = ((h - PADDING_PX - half) / h) * 100;
      const x = Math.max(minX, Math.min(maxX, (e.clientX / w) * 100));
      const y = Math.max(minY, Math.min(maxY, (e.clientY / h) * 100));
      setPosition({ x, y });
    }
  };

  const finishDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    const wasMoving = dragRef.current?.moved ?? false;
    dragRef.current = null;
    setDragging(false);
    if (!wasMoving && onClick) onClick();
  };

  const isSleeping = state === "sleeping";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="MedMind компаньон — перетащите на любой край экрана"
      className={`fixed z-[55] touch-none select-none ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      } ${isSleeping ? "opacity-60" : "opacity-100"}`}
      style={{
        ...positionStyle,
        width: size,
        height: size,
        transition: dragging
          ? "none"
          : "left 500ms cubic-bezier(0.34, 1.56, 0.64, 1), top 500ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="relative w-full h-full" style={bodyRotationStyle}>
        <CharacterBody companion={companion} size={size} state={state} />
      </div>
    </div>
  );
}

/**
 * Self-contained renderer for a character body (including aura, accessories,
 * state indicators). Can be used standalone for previews/pickers.
 */
export function CharacterBody({
  companion,
  size,
  state,
}: {
  companion: CompanionKind;
  size: number;
  state: CharacterState;
}) {
  const isSleeping = state === "sleeping";
  return (
    <div className="relative w-full h-full">
      {/* Shared aura glow */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: GLOW_COLORS[companion],
          filter: "blur(18px)",
          transform: "scale(1.4)",
        }}
      />

      {companion === "orb" && <OrbBody size={size} state={state} />}
      {companion === "doctor" && <DoctorBody size={size} state={state} />}
      {companion === "mouse" && <MouseBody size={size} state={state} />}
      {companion === "owl" && <OwlBody size={size} state={state} />}

      {state === "thinking" && (
        <div
          className="absolute flex gap-1"
          style={{ top: "-18%", left: "50%", transform: "translateX(-50%)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
          <span
            className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: "0.15s" }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: "0.3s" }}
          />
        </div>
      )}

      {isSleeping && (
        <span
          className="absolute text-foreground/50 font-light animate-float"
          style={{ top: "-10%", right: "8%", fontSize: size * 0.22 }}
        >
          z
        </span>
      )}
    </div>
  );
}

// ====== Shared helpers ======

function mouthShapeFor(state: CharacterState): "smile" | "frown" | "neutral" | "sleep" {
  if (state === "happy" || state === "speaking") return "smile";
  if (state === "sad") return "frown";
  if (state === "sleeping") return "sleep";
  return "neutral";
}

function Mouth({
  shape,
  size,
  color = "white",
  scale = 1,
}: {
  shape: "smile" | "frown" | "neutral" | "sleep";
  size: number;
  color?: string;
  scale?: number;
}) {
  const w = size * 0.3 * scale;
  const h = size * 0.12 * scale;

  if (shape === "smile") {
    return (
      <svg width={w} height={h} viewBox="0 0 20 8" fill="none">
        <path
          d="M2 2 Q10 9 18 2"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.95"
        />
      </svg>
    );
  }
  if (shape === "frown") {
    return (
      <svg width={w} height={h} viewBox="0 0 20 8" fill="none">
        <path
          d="M2 7 Q10 0 18 7"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.85"
        />
      </svg>
    );
  }
  if (shape === "sleep") {
    return (
      <svg width={w * 0.8} height={h * 0.8} viewBox="0 0 20 10" fill="none">
        <ellipse cx="10" cy="5" rx="3" ry="2" stroke={color} strokeWidth="1.4" opacity="0.7" fill="none" />
      </svg>
    );
  }
  return (
    <svg width={w * 0.6} height={h * 0.4} viewBox="0 0 20 4" fill="none">
      <line x1="4" y1="2" x2="16" y2="2" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

/**
 * Generic eye — white scleras with black pupil. Blinks via character-eye CSS animation.
 */
function Eye({
  diameter,
  sleeping,
  sad,
  delay = "0s",
  eyeColor = "#1a1a2e",
  scleraColor = "white",
}: {
  diameter: number;
  sleeping: boolean;
  sad: boolean;
  delay?: string;
  eyeColor?: string;
  scleraColor?: string;
}) {
  if (sleeping) {
    return (
      <svg width={diameter} height={diameter * 0.5} viewBox="0 0 20 10" fill="none">
        <path
          d="M2 7 Q10 1 18 7"
          stroke={eyeColor}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.85"
        />
      </svg>
    );
  }
  return (
    <div
      className="character-eye relative rounded-full flex items-center justify-center"
      style={{
        width: diameter,
        height: diameter,
        backgroundColor: scleraColor,
        animationDelay: delay,
        transform: sad ? "translateY(2px)" : undefined,
      }}
    >
      <div
        className="rounded-full relative"
        style={{ width: "62%", height: "62%", backgroundColor: eyeColor }}
      >
        <div
          className="absolute rounded-full bg-white"
          style={{ width: "36%", height: "36%", top: "14%", left: "18%" }}
        />
      </div>
    </div>
  );
}

// ====== Character bodies ======

function OrbBody({ size, state }: { size: number; state: CharacterState }) {
  const isSleeping = state === "sleeping";
  return (
    <>
      <div
        className="character-body absolute inset-0 rounded-full overflow-hidden"
        style={{
          background:
            "linear-gradient(155deg, color-mix(in srgb, var(--color-aurora-indigo) 40%, white) 0%, var(--color-aurora-indigo) 35%, var(--color-aurora-violet) 70%, color-mix(in srgb, var(--color-aurora-violet) 50%, var(--color-ink)) 100%)",
          boxShadow:
            "0 14px 40px -12px color-mix(in srgb, var(--color-aurora-indigo) 55%, transparent), inset 0 3px 6px rgba(255,255,255,0.35), inset 0 -6px 12px rgba(0,0,0,0.25)",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <div
          aria-hidden
          className="absolute rounded-full"
          style={{
            top: "12%",
            left: "18%",
            width: "38%",
            height: "22%",
            background: "radial-gradient(ellipse, rgba(255,255,255,0.7), transparent 70%)",
            filter: "blur(2px)",
          }}
        />
      </div>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ paddingTop: "6%" }}
      >
        <div className="flex items-center" style={{ gap: `${size * 0.16}px` }}>
          <Eye diameter={size * 0.22} sleeping={isSleeping} sad={state === "sad"} />
          <Eye diameter={size * 0.22} sleeping={isSleeping} sad={state === "sad"} delay="0.2s" />
        </div>
        <div style={{ marginTop: `${size * 0.1}px` }}>
          <Mouth shape={mouthShapeFor(state)} size={size} />
        </div>
      </div>
    </>
  );
}

function DoctorBody({ size, state }: { size: number; state: CharacterState }) {
  const isSleeping = state === "sleeping";
  return (
    <>
      {/* Theme-aware head (skin / stone / silver) */}
      <div
        className="character-body absolute inset-0 rounded-full overflow-hidden"
        style={{
          background:
            "linear-gradient(155deg, var(--companion-doctor-skin-light) 0%, var(--companion-doctor-skin-mid) 40%, var(--companion-doctor-skin-deep) 100%)",
          boxShadow:
            "0 14px 40px -12px color-mix(in srgb, var(--companion-doctor-skin-deep) 45%, transparent), inset 0 3px 6px rgba(255,255,255,0.5), inset 0 -6px 12px rgba(0,0,0,0.2)",
          border: "1px solid rgba(255,255,255,0.25)",
        }}
      >
        {/* Cheek blush - aurora-pink */}
        <div
          aria-hidden
          className="absolute rounded-full"
          style={{
            bottom: "28%",
            left: "12%",
            width: "18%",
            height: "12%",
            background:
              "radial-gradient(ellipse, color-mix(in srgb, var(--companion-accent) 50%, transparent), transparent 70%)",
            filter: "blur(3px)",
          }}
        />
        <div
          aria-hidden
          className="absolute rounded-full"
          style={{
            bottom: "28%",
            right: "12%",
            width: "18%",
            height: "12%",
            background:
              "radial-gradient(ellipse, color-mix(in srgb, var(--companion-accent) 50%, transparent), transparent 70%)",
            filter: "blur(3px)",
          }}
        />
        {/* Gloss */}
        <div
          aria-hidden
          className="absolute rounded-full"
          style={{
            top: "14%",
            left: "22%",
            width: "30%",
            height: "16%",
            background: "radial-gradient(ellipse, rgba(255,255,255,0.65), transparent 70%)",
            filter: "blur(2px)",
          }}
        />
      </div>

      {/* Medical cap (overlay, above body) */}
      <svg
        className="absolute pointer-events-none"
        style={{ top: "-6%", left: "10%", width: "80%", height: "42%" }}
        viewBox="0 0 80 40"
        fill="none"
      >
        {/* Cap dome - theme-aware */}
        <path
          d="M8 30 Q8 4 40 4 Q72 4 72 30 L72 32 L8 32 Z"
          fill="var(--color-card)"
          stroke="var(--color-border)"
          strokeWidth="1"
        />
        {/* Aurora-pink cross */}
        <rect x="36" y="10" width="8" height="18" rx="1" fill="var(--companion-accent)" />
        <rect x="31" y="15" width="18" height="8" rx="1" fill="var(--companion-accent)" />
        {/* Cap shadow on forehead */}
        <rect x="8" y="30" width="64" height="3" fill="rgba(0,0,0,0.12)" />
      </svg>

      {/* Face */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ paddingTop: "22%" }}
      >
        <div className="flex items-center" style={{ gap: `${size * 0.14}px` }}>
          <Eye diameter={size * 0.2} sleeping={isSleeping} sad={state === "sad"} />
          <Eye diameter={size * 0.2} sleeping={isSleeping} sad={state === "sad"} delay="0.2s" />
        </div>
        <div style={{ marginTop: `${size * 0.07}px` }}>
          <Mouth
            shape={mouthShapeFor(state)}
            size={size}
            color="var(--companion-doctor-skin-deep)"
            scale={0.9}
          />
        </div>
      </div>
    </>
  );
}

function MouseBody({ size, state }: { size: number; state: CharacterState }) {
  const isSleeping = state === "sleeping";
  return (
    <>
      {/* Ears (behind body, poking out top) - theme-aware fur */}
      <div
        aria-hidden
        className="absolute rounded-full"
        style={{
          top: "-10%",
          left: "6%",
          width: "34%",
          height: "34%",
          background:
            "radial-gradient(circle at 40% 40%, var(--companion-mouse-fur-light), var(--companion-mouse-fur-mid) 70%)",
          boxShadow: "inset 0 -2px 3px rgba(0,0,0,0.18)",
        }}
      >
        <div
          className="absolute rounded-full"
          style={{
            top: "25%",
            left: "25%",
            width: "55%",
            height: "55%",
            background:
              "radial-gradient(circle at 40% 40%, color-mix(in srgb, var(--companion-accent) 45%, white), color-mix(in srgb, var(--companion-accent) 70%, white))",
          }}
        />
      </div>
      <div
        aria-hidden
        className="absolute rounded-full"
        style={{
          top: "-10%",
          right: "6%",
          width: "34%",
          height: "34%",
          background:
            "radial-gradient(circle at 40% 40%, var(--companion-mouse-fur-light), var(--companion-mouse-fur-mid) 70%)",
          boxShadow: "inset 0 -2px 3px rgba(0,0,0,0.18)",
        }}
      >
        <div
          className="absolute rounded-full"
          style={{
            top: "25%",
            left: "25%",
            width: "55%",
            height: "55%",
            background:
              "radial-gradient(circle at 40% 40%, color-mix(in srgb, var(--companion-accent) 45%, white), color-mix(in srgb, var(--companion-accent) 70%, white))",
          }}
        />
      </div>

      {/* Body - theme-aware fur */}
      <div
        className="character-body absolute inset-0 rounded-full overflow-hidden"
        style={{
          background:
            "linear-gradient(155deg, var(--companion-mouse-fur-light) 0%, color-mix(in srgb, var(--companion-mouse-fur-light) 70%, var(--companion-mouse-fur-mid)) 30%, var(--companion-mouse-fur-mid) 70%, var(--companion-mouse-fur-deep) 100%)",
          boxShadow:
            "0 14px 40px -12px color-mix(in srgb, var(--companion-mouse-fur-deep) 55%, transparent), inset 0 3px 6px rgba(255,255,255,0.45), inset 0 -6px 12px rgba(0,0,0,0.25)",
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        {/* Gloss */}
        <div
          aria-hidden
          className="absolute rounded-full"
          style={{
            top: "12%",
            left: "18%",
            width: "34%",
            height: "20%",
            background: "radial-gradient(ellipse, rgba(255,255,255,0.75), transparent 70%)",
            filter: "blur(2px)",
          }}
        />
      </div>

      {/* Face */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ paddingTop: "6%" }}
      >
        <div className="flex items-center" style={{ gap: `${size * 0.18}px` }}>
          <Eye diameter={size * 0.18} sleeping={isSleeping} sad={state === "sad"} />
          <Eye diameter={size * 0.18} sleeping={isSleeping} sad={state === "sad"} delay="0.2s" />
        </div>

        {/* Nose - aurora pink */}
        <div
          aria-hidden
          className="rounded-full"
          style={{
            marginTop: `${size * 0.07}px`,
            width: `${size * 0.11}px`,
            height: `${size * 0.09}px`,
            background:
              "radial-gradient(circle at 35% 35%, color-mix(in srgb, var(--companion-accent) 60%, white), var(--companion-accent))",
            boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
          }}
        />

        {/* Whiskers - aurora-violet blended with fur-deep */}
        <svg
          className="absolute"
          style={{ bottom: "24%", left: 0, width: "100%", height: "20%" }}
          viewBox="0 0 100 20"
          fill="none"
        >
          <line x1="10" y1="6" x2="36" y2="10" stroke="var(--companion-mouse-fur-deep)" strokeWidth="0.8" strokeLinecap="round" opacity="0.75" />
          <line x1="10" y1="14" x2="36" y2="12" stroke="var(--companion-mouse-fur-deep)" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
          <line x1="90" y1="6" x2="64" y2="10" stroke="var(--companion-mouse-fur-deep)" strokeWidth="0.8" strokeLinecap="round" opacity="0.75" />
          <line x1="90" y1="14" x2="64" y2="12" stroke="var(--companion-mouse-fur-deep)" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
        </svg>

        <div style={{ marginTop: `${size * 0.04}px` }}>
          <Mouth
            shape={mouthShapeFor(state)}
            size={size}
            color="var(--companion-mouse-fur-deep)"
            scale={0.7}
          />
        </div>
      </div>
    </>
  );
}

function OwlBody({ size, state }: { size: number; state: CharacterState }) {
  const isSleeping = state === "sleeping";
  return (
    <>
      {/* Ear tufts - theme-aware deep body color */}
      <div
        aria-hidden
        className="absolute"
        style={{
          top: "-8%",
          left: "14%",
          width: "18%",
          height: "24%",
          background:
            "linear-gradient(180deg, var(--companion-owl-body-deep) 0%, var(--companion-owl-body-mid) 100%)",
          clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
          transform: "rotate(-12deg)",
        }}
      />
      <div
        aria-hidden
        className="absolute"
        style={{
          top: "-8%",
          right: "14%",
          width: "18%",
          height: "24%",
          background:
            "linear-gradient(180deg, var(--companion-owl-body-deep) 0%, var(--companion-owl-body-mid) 100%)",
          clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
          transform: "rotate(12deg)",
        }}
      />

      {/* Body - theme-aware plumage */}
      <div
        className="character-body absolute inset-0 rounded-full overflow-hidden"
        style={{
          background:
            "linear-gradient(155deg, var(--companion-owl-body-light) 0%, var(--companion-owl-body-mid) 40%, var(--companion-owl-body-deep) 100%)",
          boxShadow:
            "0 14px 40px -12px color-mix(in srgb, var(--companion-owl-body-deep) 55%, transparent), inset 0 3px 6px rgba(255,255,255,0.25), inset 0 -6px 12px rgba(0,0,0,0.3)",
          border:
            "1px solid color-mix(in srgb, var(--companion-accent) 25%, transparent)",
        }}
      >
        {/* Theme-aware chest/belly - accent-blended cream */}
        <div
          aria-hidden
          className="absolute rounded-full"
          style={{
            bottom: "-10%",
            left: "15%",
            width: "70%",
            height: "60%",
            background:
              "radial-gradient(ellipse at center top, color-mix(in srgb, var(--companion-accent) 30%, var(--companion-owl-body-light)), color-mix(in srgb, var(--companion-accent) 50%, var(--companion-owl-body-mid)) 60%, transparent 85%)",
          }}
        />
        {/* Gloss */}
        <div
          aria-hidden
          className="absolute rounded-full"
          style={{
            top: "10%",
            left: "18%",
            width: "30%",
            height: "18%",
            background:
              "radial-gradient(ellipse, color-mix(in srgb, var(--companion-accent) 40%, white), transparent 70%)",
            filter: "blur(2px)",
          }}
        />
      </div>

      {/* Face */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ paddingTop: "4%" }}
      >
        {/* Large "eye discs" with inset eyes */}
        <div className="flex items-center" style={{ gap: `${size * 0.02}px` }}>
          {[0, 1].map((i) => (
            <div
              key={i}
              className="rounded-full flex items-center justify-center"
              style={{
                width: size * 0.34,
                height: size * 0.34,
                background:
                  "radial-gradient(circle at 35% 35%, color-mix(in srgb, var(--companion-accent) 25%, white), color-mix(in srgb, var(--companion-accent) 70%, var(--companion-owl-body-deep)) 70%, var(--companion-owl-body-deep) 100%)",
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)",
              }}
            >
              <Eye
                diameter={size * 0.2}
                sleeping={isSleeping}
                sad={state === "sad"}
                delay={i === 0 ? "0s" : "0.2s"}
                scleraColor="#1f2937"
                eyeColor="#fef3c7"
              />
            </div>
          ))}
        </div>

        {/* Beak - aurora pink→violet gradient */}
        <svg
          style={{ marginTop: `${size * 0.01}px`, width: size * 0.14, height: size * 0.12 }}
          viewBox="0 0 14 12"
          fill="none"
        >
          <path
            d="M7 0 L13 6 Q7 11 1 6 Z"
            fill="url(#beak-grad)"
            stroke="var(--companion-owl-body-deep)"
            strokeWidth="0.8"
          />
          <defs>
            <linearGradient id="beak-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--companion-accent)" />
              <stop offset="100%" stopColor="color-mix(in srgb, var(--companion-accent) 50%, var(--companion-owl-body-deep))" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </>
  );
}
