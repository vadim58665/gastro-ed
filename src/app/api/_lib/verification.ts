/**
 * Medical response verification agent.
 * Uses Haiku to double-check Sonnet's answers for accuracy.
 */

import Anthropic from "@anthropic-ai/sdk";
import { getVerifyPrompt } from "./prompts/actions/verify";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (client) return client;
  client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return client;
}

export interface VerificationResult {
  isAccurate: boolean;
  confidence: number;
  corrections: string[];
  issues: string[];
}

/**
 * Quick verification of a medical response.
 * Uses Haiku for speed and cost (~$0.001 per call).
 */
export async function verifyMedicalResponse(
  response: string,
  topic: string,
  specialty: string
): Promise<VerificationResult> {
  const system = getVerifyPrompt();

  const userPrompt = `Тема: ${topic}
Специальность: ${specialty}

Проверь следующий ответ на медицинскую точность:

${response.slice(0, 2000)}`;

  try {
    const result = await getClient().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = result.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        isAccurate: parsed.isAccurate ?? true,
        confidence: parsed.confidence ?? 0.5,
        corrections: parsed.corrections ?? [],
        issues: parsed.issues ?? [],
      };
    }
  } catch {
    // Verification failure should not block the response
  }

  // Default: assume accurate if verification fails
  return { isAccurate: true, confidence: 0.5, corrections: [], issues: [] };
}
