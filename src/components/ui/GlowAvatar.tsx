"use client";

interface Props {
  initial: string;
  size?: number;
}

/**
 * Circular avatar with a rotating conic-gradient aura ring.
 */
export default function GlowAvatar({ initial, size = 88 }: Props) {
  return (
    <div
      className="glow-avatar"
      style={{ width: size, height: size }}
      aria-label="Avatar"
    >
      <div className="glow-avatar-ring" aria-hidden />
      <div className="glow-avatar-core">
        <span className="glow-avatar-initial">{initial}</span>
      </div>
    </div>
  );
}
