"use client";

import type { Card } from "@/types/card";
import ClinicalCase from "@/components/cards/ClinicalCase";
import MythOrFact from "@/components/cards/MythOrFact";
import BuildScheme from "@/components/cards/BuildScheme";
import BlitzTest from "@/components/cards/BlitzTest";
import FillBlank from "@/components/cards/FillBlank";
import RedFlags from "@/components/cards/RedFlags";
import VisualQuiz from "@/components/cards/VisualQuiz";

interface Props {
  card: Card;
  onAnswer: (isCorrect: boolean) => void;
}

export default function CardRenderer({ card, onAnswer }: Props) {
  switch (card.type) {
    case "clinical_case":
      return <ClinicalCase card={card} onAnswer={onAnswer} />;
    case "myth_or_fact":
      return <MythOrFact card={card} onAnswer={onAnswer} />;
    case "build_scheme":
      return <BuildScheme card={card} onAnswer={onAnswer} />;
    case "blitz_test":
      return <BlitzTest card={card} onAnswer={onAnswer} />;
    case "fill_blank":
      return <FillBlank card={card} onAnswer={onAnswer} />;
    case "red_flags":
      return <RedFlags card={card} onAnswer={onAnswer} />;
    case "visual_quiz":
      return <VisualQuiz card={card} onAnswer={onAnswer} />;
  }
}
