import type { Card } from "@/types/card";
import { gastroCards } from "./gastroenterologiya";
import { kardiologiyaCards } from "./kardiologiya";
import { nevrologiyaCards } from "./nevrologiya";
import { hirurgiyaCards } from "./hirurgiya";
import { lechebnoeDeloCards } from "./lechebnoe-delo";
import { pediatriyaCards } from "./pediatriya";
import { endokrinologiyaCards } from "./endokrinologiya";
import { pulmonologiyaCards } from "./pulmonologiya";
import { revmatologiyaCards } from "./revmatologiya";
import { urologiyaCards } from "./urologiya";
import { dermatologiyaCards } from "./dermatologiya";
import { oftalmologiyaCards } from "./oftalmologiya";
import { lorCards } from "./otorinolaringologiya";
import { allergologiyaCards } from "./allergologiya";
import { ginekologiyaCards } from "./ginekologiya";
import { travmatologiyaCards } from "./travmatologiya";
import { stomatologiyaCards } from "./stomatologiya";
import { detskayanevrologiyaCards } from "./detskaya-nevrologiya";
import { dietologiyaCards } from "./dietologiya";
import { farmaciyaCards } from "./farmaciya";
import { medprofilaktikaCards } from "./medprofilaktika";
import { stomatologiyaSpecCards } from "./stomatologiya-spec";

export const demoCards: Card[] = [
  ...gastroCards,
  ...kardiologiyaCards,
  ...nevrologiyaCards,
  ...hirurgiyaCards,
  ...lechebnoeDeloCards,
  ...pediatriyaCards,
  ...endokrinologiyaCards,
  ...pulmonologiyaCards,
  ...revmatologiyaCards,
  ...urologiyaCards,
  ...dermatologiyaCards,
  ...oftalmologiyaCards,
  ...lorCards,
  ...allergologiyaCards,
  ...ginekologiyaCards,
  ...travmatologiyaCards,
  ...stomatologiyaCards,
  ...detskayanevrologiyaCards,
  ...dietologiyaCards,
  ...farmaciyaCards,
  ...medprofilaktikaCards,
  ...stomatologiyaSpecCards,
];
