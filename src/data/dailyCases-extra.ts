import type { DailyCase } from "@/types/dailyCase";
import { batch1Cases } from "./dailyCases-batch1";
import { batch2Cases } from "./dailyCases-batch2";
import { batch3Cases } from "./dailyCases-batch3";
import { batch4Cases } from "./dailyCases-batch4";

export const extraDailyCases: DailyCase[] = [
  ...batch1Cases,
  ...batch2Cases,
  ...batch3Cases,
  ...batch4Cases,
];
