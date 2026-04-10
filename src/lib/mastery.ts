import type { TopicAnalysis } from "@/types/medmind";

export type MasteryLevel = "student" | "resident" | "doctor" | "professor" | "academician";

export interface MasteryInfo {
  level: MasteryLevel;
  label: string;
  color: string;
}

const MASTERY_MAP: Record<MasteryLevel, MasteryInfo> = {
  student:      { level: "student",      label: "Студент",    color: "text-danger" },
  resident:     { level: "resident",     label: "Ординатор",  color: "text-warning" },
  doctor:       { level: "doctor",       label: "Врач",       color: "text-primary" },
  professor:    { level: "professor",    label: "Профессор",  color: "text-success" },
  academician:  { level: "academician",  label: "Академик",   color: "text-foreground" },
};

export function getMasteryLevel(analysis: TopicAnalysis): MasteryInfo {
  const { errorRate } = analysis;
  if (errorRate > 0.50) return MASTERY_MAP.student;
  if (errorRate > 0.30) return MASTERY_MAP.resident;
  if (errorRate > 0.15) return MASTERY_MAP.doctor;
  if (errorRate > 0.05) return MASTERY_MAP.professor;
  return MASTERY_MAP.academician;
}

export function getMasteryByName(level: MasteryLevel): MasteryInfo {
  return MASTERY_MAP[level];
}

export const ALL_MASTERY_LEVELS: MasteryInfo[] = [
  MASTERY_MAP.student,
  MASTERY_MAP.resident,
  MASTERY_MAP.doctor,
  MASTERY_MAP.professor,
  MASTERY_MAP.academician,
];
