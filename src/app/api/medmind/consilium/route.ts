import Anthropic from "@anthropic-ai/sdk";
import { authenticateRequest, errorResponse } from "../../_lib/auth";
import { checkRateLimit, rateLimitResponse } from "../../_lib/rate-limit";
import { checkDailyCap, dailyCapResponse, logApiUsage } from "../../_lib/cost-tracker";
import { estimateCost } from "../../_lib/model-router";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (client) return client;
  client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return client;
}

const PATIENT_SYSTEM = `Ты играешь роль пациента на приёме у врача-гастроэнтеролога. Заболевание выбирай случайно из распространённых гастроэнтерологических патологий (ГЭРБ, язвенная болезнь, хронический гастрит, СРК, НЯК, болезнь Крона, холецистит, панкреатит, гепатит, целиакия, функциональная диспепсия и т.п.).

Правила поведения:
- Отвечай как обычный человек, без медицинских терминов. Используй бытовой язык.
- Не раскрывай диагноз. Врач должен поставить его сам.
- Отвечай только на то, что спрашивают. Лишней информации не давай.
- Будь последовательным: выбранное заболевание держи в голове всю беседу.
- Возраст, пол, образ жизни выбери и сохрани до конца приёма.
- Первое сообщение - короткая жалоба в 1-2 предложениях.
- Никаких emoji.
- Пиши только на русском языке.`;

const EVALUATION_SYSTEM = `Ты - экзаменатор на приёме врача-гастроэнтеролога. В сообщении указан предполагаемый пациентом диагноз. На основе истории диалога оцени работу врача и верни ТОЛЬКО JSON.

Формат ответа (строго JSON без markdown, без пояснений):
{
  "correct": true | false,
  "actualDiagnosis": "Настоящий диагноз пациента",
  "anamnesisScore": 0-10,
  "questionsScore": 0-10,
  "diagnosticsScore": 0-10,
  "missed": ["Список упущенных вопросов или обследований, 2-5 пунктов"],
  "advice": "Краткий совет врачу, 1-2 предложения"
}

Никаких других полей. Никаких обрамляющих символов.`;

const EXTRACT_SYSTEM = `Ты помощник, который извлекает клинические данные из диалога между врачом и пациентом. Верни ТОЛЬКО JSON (без markdown, без текста вокруг).

Формат:
{
  "symptoms": ["Симптом в формальной медицинской формулировке"],
  "anamnesis": ["Факт анамнеза: длительность, триггеры, сопутствующие, семейный анамнез, образ жизни"],
  "orders": ["Назначенные врачом обследования, анализы, препараты"]
}

Пустые массивы если ничего не упомянуто. Один пункт - один факт, без дублей. Формулируй медицински грамотно, но коротко.`;

type Turn = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  try {
    const { userId } = await authenticateRequest(req);

    const rl = checkRateLimit(userId, "chat");
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!);

    const withinCap = await checkDailyCap(userId);
    if (!withinCap) return dailyCapResponse();

    const body = await req.json();
    const { action, history, message } = body as {
      action: "patient" | "evaluate";
      history: Turn[];
      message: string;
    };

    if (!action || !Array.isArray(history) || typeof message !== "string") {
      return Response.json({ error: "invalid payload" }, { status: 400 });
    }

    if (action === "evaluate") {
      return handleEvaluate(userId, history, message);
    }
    return handlePatient(userId, history, message);
  } catch (err) {
    return errorResponse(err);
  }
}

async function handlePatient(userId: string, history: Turn[], message: string) {
  const messages: Turn[] = [...history.slice(-16), { role: "user", content: message }];
  const patientModel = "claude-sonnet-4-20250514";

  const encoder = new TextEncoder();
  let fullReply = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const patientStream = getClient().messages.stream({
          model: patientModel,
          max_tokens: 512,
          system: PATIENT_SYSTEM,
          messages,
        });

        for await (const event of patientStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            fullReply += event.delta.text;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
            );
          }
        }

        const patientIn = messages.reduce((s, m) => s + m.content.length / 4, 0);
        const patientOut = fullReply.length / 4;
        const patientCost = estimateCost(
          patientModel,
          Math.round(patientIn),
          Math.round(patientOut)
        );
        logApiUsage(
          userId,
          "chat",
          patientModel,
          Math.round(patientIn),
          Math.round(patientOut),
          patientCost
        ).catch(() => {});

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function handleEvaluate(userId: string, history: Turn[], diagnosis: string) {
  const evalModel = "claude-sonnet-4-20250514";
  const extractModel = "claude-haiku-4-5-20251001";
  const transcript = history
    .map((m) => `${m.role === "user" ? "Врач" : "Пациент"}: ${m.content}`)
    .join("\n\n");

  const userPayload = `Диалог приёма:\n\n${transcript}\n\n---\n\nДиагноз врача: ${diagnosis}\n\nОцени работу врача.`;

  const [evalRes, extractRes] = await Promise.all([
    getClient().messages.create({
      model: evalModel,
      max_tokens: 1024,
      system: EVALUATION_SYSTEM,
      messages: [{ role: "user", content: userPayload }],
    }),
    getClient().messages.create({
      model: extractModel,
      max_tokens: 512,
      system: EXTRACT_SYSTEM,
      messages: [{ role: "user", content: transcript }],
    }),
  ]);

  const raw = evalRes.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  const evalCost = estimateCost(evalModel, evalRes.usage.input_tokens, evalRes.usage.output_tokens);
  logApiUsage(
    userId,
    "chat",
    evalModel,
    evalRes.usage.input_tokens,
    evalRes.usage.output_tokens,
    evalCost
  ).catch(() => {});

  const extractText = extractRes.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  let extracted: { symptoms: string[]; anamnesis: string[]; orders: string[] } = {
    symptoms: [],
    anamnesis: [],
    orders: [],
  };
  try {
    const cleaned = extractText.replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(cleaned);
    extracted = {
      symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms.slice(0, 20).map(String) : [],
      anamnesis: Array.isArray(parsed.anamnesis) ? parsed.anamnesis.slice(0, 20).map(String) : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders.slice(0, 20).map(String) : [],
    };
  } catch {}

  const extractCost = estimateCost(
    extractModel,
    extractRes.usage.input_tokens,
    extractRes.usage.output_tokens
  );
  logApiUsage(
    userId,
    "chat",
    extractModel,
    extractRes.usage.input_tokens,
    extractRes.usage.output_tokens,
    extractCost
  ).catch(() => {});

  try {
    const cleaned = raw.replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(cleaned);
    return Response.json({
      correct: Boolean(parsed.correct),
      actualDiagnosis: String(parsed.actualDiagnosis ?? ""),
      anamnesisScore: clampScore(parsed.anamnesisScore),
      questionsScore: clampScore(parsed.questionsScore),
      diagnosticsScore: clampScore(parsed.diagnosticsScore),
      missed: Array.isArray(parsed.missed) ? parsed.missed.slice(0, 8).map(String) : [],
      advice: String(parsed.advice ?? ""),
      extracted,
    });
  } catch {
    return Response.json({
      correct: false,
      actualDiagnosis: "",
      anamnesisScore: 0,
      questionsScore: 0,
      diagnosticsScore: 0,
      missed: [],
      advice: raw.slice(0, 400),
      extracted,
    });
  }
}

function clampScore(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, Math.round(n)));
}
