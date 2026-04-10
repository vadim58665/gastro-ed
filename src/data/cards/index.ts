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
import { newKardioCards } from "./kardiologiya-new";
import { newNevroCards } from "./nevrologiya-new";
import { newHirCards } from "./hirurgiya-new";
import { newPulmoCards } from "./pulmonologiya-new";
import { newEndoCards } from "./endokrinologiya-new";
import { newLechCards } from "./lechebnoe-delo-new";
import { newLorCards } from "./otorinolaringologiya-new";
import { newOftCards } from "./oftalmologiya-new";
import { newStomCards } from "./stomatologiya-new";
import { newStomSpecCards } from "./stomatologiya-spec-new";
import { newTravCards } from "./travmatologiya-new";
import { newUroCards } from "./urologiya-new";
import { newGinCards } from "./ginekologiya-new";
import { newRevmaCards } from "./revmatologiya-new";

export const demoCards: Card[] = [
  ...gastroCards,
  ...kardiologiyaCards,
  ...newKardioCards,
  ...nevrologiyaCards,
  ...newNevroCards,
  ...hirurgiyaCards,
  ...newHirCards,
  ...lechebnoeDeloCards,
  ...newLechCards,
  ...pediatriyaCards,
  ...endokrinologiyaCards,
  ...newEndoCards,
  ...pulmonologiyaCards,
  ...newPulmoCards,
  ...revmatologiyaCards,
  ...newRevmaCards,
  ...urologiyaCards,
  ...newUroCards,
  ...dermatologiyaCards,
  ...oftalmologiyaCards,
  ...newOftCards,
  ...lorCards,
  ...newLorCards,
  ...allergologiyaCards,
  ...ginekologiyaCards,
  ...newGinCards,
  ...travmatologiyaCards,
  ...newTravCards,
  ...stomatologiyaCards,
  ...newStomCards,
  ...detskayanevrologiyaCards,
  ...dietologiyaCards,
  ...farmaciyaCards,
  ...medprofilaktikaCards,
  ...stomatologiyaSpecCards,
  ...newStomSpecCards,
];
