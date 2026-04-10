"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuestionSearch, type SearchResult } from "@/hooks/useQuestionSearch";
import type { Card } from "@/types/card";
import type { TestQuestion } from "@/types/accreditation";

interface QuestionSearchProps {
  cards: Card[];
  testQuestions?: TestQuestion[];
  placeholder?: string;
}

export default function QuestionSearch({
  cards,
  testQuestions = [],
  placeholder = "Поиск по вопросам...",
}: QuestionSearchProps) {
  const { query, setQuery, results, clear } = useQuestionSearch(cards, testQuestions);
  const [isOpen, setIsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [debounced, setDebounced] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (debounced.trim().length >= 2) {
      setQuery(debounced);
    }
  }, [debounced, setQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (!query) setExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [query]);

  function handleOpen() {
    setExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function handleClose() {
    clear();
    setIsOpen(false);
    setExpanded(false);
  }

  function handleSelect(result: SearchResult) {
    setIsOpen(false);
    setExpanded(false);
    clear();
    if (result.type === "card") {
      router.push(`/feed?mode=all&topic=${encodeURIComponent(result.topic)}`);
    } else {
      router.push(`/tests?q=${encodeURIComponent(result.id)}`);
    }
  }

  function highlightMatch(text: string, q: string): React.ReactNode {
    if (!q || q.length < 2) return text;
    const lower = text.toLowerCase();
    const idx = lower.indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="bg-primary/20 text-primary font-medium">
          {text.slice(idx, idx + q.length)}
        </span>
        {text.slice(idx + q.length)}
      </>
    );
  }

  // Compact button mode
  if (!expanded) {
    return (
      <button
        onClick={handleOpen}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-surface border border-border/50 text-muted hover:text-foreground hover:border-border transition-all"
        aria-label="Поиск"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" strokeWidth="1.5" />
          <path d="m21 21-4.35-4.35" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    );
  }

  // Expanded search mode
  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="8" strokeWidth="1.5" />
          <path d="m21 21-4.35-4.35" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-9 pr-8 py-1.5 text-sm bg-surface border border-border/50 rounded-lg
                     placeholder:text-muted focus:outline-none focus:border-primary/50
                     transition-colors"
        />
        <button
          onClick={handleClose}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground p-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M18 6 6 18M6 6l12 12" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-surface border border-border/50 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {results.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => handleSelect(r)}
              className="w-full text-left px-4 py-3 hover:bg-surface-hover border-b border-border/20 last:border-0 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-widest text-muted font-medium">
                  {r.type === "card" ? "Лента" : "Тест"}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-primary/70">
                  {r.topic}
                </span>
              </div>
              <p className="text-sm text-foreground line-clamp-2">
                {highlightMatch(r.title, query)}
              </p>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-surface border border-border/50 rounded-lg shadow-lg p-4">
          <p className="text-sm text-muted text-center">Ничего не найдено</p>
        </div>
      )}
    </div>
  );
}
