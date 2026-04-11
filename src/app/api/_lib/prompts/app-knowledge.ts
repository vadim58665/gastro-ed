/**
 * App knowledge block.
 * Tells the agent what the app contains and how it works.
 */

export interface AppStats {
  totalCards: number;
  totalSpecialties: number;
  totalAccreditationQuestions: number;
  userSpecialtyCardCount?: number;
  userSpecialtyTopics?: string[];
  userSpecialtyAccreditationBlocks?: number;
}

export function getAppKnowledge(stats: AppStats): string {
  const lines: string[] = [
    `## О приложении MedEd`,
    ``,
    `Платформа содержит ${stats.totalCards} обучающих карточек по ${stats.totalSpecialties} специальностям и ${stats.totalAccreditationQuestions} вопросов аккредитации.`,
  ];

  if (stats.userSpecialtyCardCount !== undefined) {
    lines.push(`По специальности ��ользователя: ${stats.userSpecialtyCardCount} карточек.`);
  }
  if (stats.userSpecialtyTopics && stats.userSpecialtyTopics.length > 0) {
    lines.push(`Доступные темы: ${stats.userSpecialtyTopics.join(", ")}.`);
  }
  if (stats.userSpecialtyAccreditationBlocks !== undefined) {
    lines.push(`Блоков аккредитации: ${stats.userSpecialtyAccreditationBlocks}.`);
  }

  lines.push(
    ``,
    `Разделы приложения:`,
    `- Лента - обучающие карточки с вертикальным свайпом`,
    `- Тесты - блоки аккредитации (100 вопросов, 7 режимов)`,
    `- Повторение - интервальное повторение (FSRS)`,
    `- Профиль - статистика, достижения, "Мои материалы"`,
    ``,
    `Типы карточек: клинический случай, миф/факт, составь схему, ��изуальный квиз, блиц-тест, заполни пропуск, красные флаги, соотнеси пары, расставь приоритеты, цепочка причин, расчёт дозы.`,
    ``,
    `Ты можешь ссылаться на конкретные карточки и темы приложения в своих рекомендациях.`,
  );

  return lines.join("\n");
}
