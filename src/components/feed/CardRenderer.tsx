"use client";

import type { Card } from "@/types/card";
import type { CardHistoryEntry } from "@/types/user";
import ClinicalCase from "@/components/cards/ClinicalCase";
import MythOrFact from "@/components/cards/MythOrFact";
import BuildScheme from "@/components/cards/BuildScheme";
import BlitzTest from "@/components/cards/BlitzTest";
import FillBlank from "@/components/cards/FillBlank";
import RedFlags from "@/components/cards/RedFlags";
import VisualQuiz from "@/components/cards/VisualQuiz";
import MatchPairs from "@/components/cards/MatchPairs";
import PriorityRank from "@/components/cards/PriorityRank";
import CauseChain from "@/components/cards/CauseChain";
import DoseCalc from "@/components/cards/DoseCalc";
interface Props {
  card: Card;
  onAnswer: (isCorrect: boolean) => void;
  cardHistory?: CardHistoryEntry;
}

export default function CardRenderer({ card, onAnswer, cardHistory }: Props) {
  void cardHistory;
  let content: React.ReactNode;
  switch (card.type) {
    case "clinical_case":
      content = <ClinicalCase card={card} onAnswer={onAnswer} />;
      break;
    case "myth_or_fact":
      content = <MythOrFact card={card} onAnswer={onAnswer} />;
      break;
    case "build_scheme":
      content = <BuildScheme card={card} onAnswer={onAnswer} />;
      break;
    case "blitz_test":
      content = <BlitzTest card={card} onAnswer={onAnswer} />;
      break;
    case "fill_blank":
      content = <FillBlank card={card} onAnswer={onAnswer} />;
      break;
    case "red_flags":
      content = <RedFlags card={card} onAnswer={onAnswer} />;
      break;
    case "visual_quiz":
      content = <VisualQuiz card={card} onAnswer={onAnswer} />;
      break;
    case "match_pairs":
      content = <MatchPairs card={card} onAnswer={onAnswer} />;
      break;
    case "priority_rank":
      content = <PriorityRank card={card} onAnswer={onAnswer} />;
      break;
    case "cause_chain":
      content = <CauseChain card={card} onAnswer={onAnswer} />;
      break;
    case "dose_calc":
      content = <DoseCalc card={card} onAnswer={onAnswer} />;
      break;
  }

  return <>{content}</>;
}
