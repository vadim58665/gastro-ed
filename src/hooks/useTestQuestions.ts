"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TestQuestion } from "@/types/accreditation";
import {
  getBlockQuestions as fetchBlockQuestions,
  getSpecialtyMeta as fetchSpecialtyMeta,
  listSpecialties as fetchSpecialties,
  rowToTestQuestion,
  shuffleWithSeed,
  type DbQuestion,
  type SpecialtyMeta,
} from "@/lib/accreditation-client";

/**
 * Загрузить список всех специальностей с счётчиками (один раз на вкладку).
 */
export function useSpecialties() {
  const [data, setData] = useState<SpecialtyMeta[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSpecialties()
      .then((list) => {
        if (!cancelled) setData(list);
      })
      .catch((e) => {
        if (!cancelled) setError(e as Error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, isLoading: data === null && !error, error };
}

/** Мета одной специальности (total_questions, block_count и т.п.). */
export function useSpecialtyMeta(specialtyId: string | null | undefined) {
  const [data, setData] = useState<SpecialtyMeta | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!specialtyId) {
      setData(null);
      return;
    }
    let cancelled = false;
    fetchSpecialtyMeta(specialtyId)
      .then((meta) => {
        if (!cancelled) setData(meta);
      })
      .catch((e) => {
        if (!cancelled) setError(e as Error);
      });
    return () => {
      cancelled = true;
    };
  }, [specialtyId]);

  return { data, isLoading: data === null && !error && !!specialtyId, error };
}

/**
 * 100 вопросов блока. Внутри блока перемешиваются Fisher–Yates'ом
 * с стабильным seed'ом на время mount — пользователь не теряет место
 * в списке при перерисовках.
 */
export function useBlockQuestions(
  specialtyId: string | null | undefined,
  blockNumber: number | null | undefined,
  options?: { shuffle?: boolean }
) {
  const shuffle = options?.shuffle !== false; // по умолчанию перемешиваем

  const [rows, setRows] = useState<DbQuestion[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const seedRef = useRef<number>(Math.floor(Math.random() * 2 ** 31));

  useEffect(() => {
    if (!specialtyId || !blockNumber) {
      setRows(null);
      return;
    }
    let cancelled = false;
    fetchBlockQuestions(specialtyId, blockNumber)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e as Error);
      });
    return () => {
      cancelled = true;
    };
  }, [specialtyId, blockNumber]);

  const questions: TestQuestion[] = useMemo(() => {
    if (!rows) return [];
    const mapped = rows.map(rowToTestQuestion);
    return shuffle ? shuffleWithSeed(mapped, seedRef.current) : mapped;
  }, [rows, shuffle]);

  return {
    data: questions,
    isLoading: rows === null && !error && !!specialtyId && !!blockNumber,
    error,
  };
}
