import { z } from "zod";

const baseCardSchema = z.object({
  id: z.string().min(1),
  specialty: z.string().min(1),
  topic: z.string().min(1),
  sourceRef: z.string().optional(),
  keyFact: z.string().optional(),
  relatedCardIds: z.array(z.string()).optional(),
});

const clinicalCaseSchema = baseCardSchema.extend({
  type: z.literal("clinical_case"),
  scenario: z.string().min(1),
  question: z.string().min(1),
  options: z
    .array(
      z.object({
        text: z.string().min(1),
        isCorrect: z.boolean(),
        explanation: z.string().min(1),
      })
    )
    .min(2),
});

const mythOrFactSchema = baseCardSchema.extend({
  type: z.literal("myth_or_fact"),
  statement: z.string().min(1),
  isMyth: z.boolean(),
  explanation: z.string().min(1),
});

const buildSchemeSchema = baseCardSchema.extend({
  type: z.literal("build_scheme"),
  title: z.string().min(1),
  instruction: z.string().min(1),
  components: z
    .array(z.object({ text: z.string().min(1), isCorrect: z.boolean() }))
    .min(2),
  correctOrder: z.array(z.number()).optional(),
  successMessage: z.string().min(1),
});

const visualQuizSchema = baseCardSchema.extend({
  type: z.literal("visual_quiz"),
  imageUrl: z.string().min(1),
  question: z.string().min(1),
  options: z
    .array(z.object({ text: z.string().min(1), isCorrect: z.boolean() }))
    .min(2),
  explanation: z.string().min(1),
});

const blitzTestSchema = baseCardSchema.extend({
  type: z.literal("blitz_test"),
  title: z.string().min(1),
  timeLimit: z.number().positive(),
  questions: z
    .array(
      z.object({
        question: z.string().min(1),
        correctAnswer: z.boolean(),
        explanation: z.string().min(1),
      })
    )
    .min(2),
});

const fillBlankSchema = baseCardSchema.extend({
  type: z.literal("fill_blank"),
  textBefore: z.string().min(1),
  textAfter: z.string(),
  correctAnswer: z.string().min(1),
  acceptableAnswers: z.array(z.string()).min(1),
  hint: z.string().optional(),
  explanation: z.string().min(1),
});

const redFlagsSchema = baseCardSchema.extend({
  type: z.literal("red_flags"),
  scenario: z.string().min(1),
  options: z
    .array(z.object({ text: z.string().min(1), isDanger: z.boolean() }))
    .min(2),
  explanation: z.string().min(1),
});

export const cardSchema = z.discriminatedUnion("type", [
  clinicalCaseSchema,
  mythOrFactSchema,
  buildSchemeSchema,
  visualQuizSchema,
  blitzTestSchema,
  fillBlankSchema,
  redFlagsSchema,
]);
