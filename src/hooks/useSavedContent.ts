"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface SavedContentItem {
  id: string;
  content_type: string;
  specialty: string | null;
  topic: string;
  question_context: string | null;
  content_ru: string;
  image_url: string | null;
  metadata: Record<string, unknown>;
  is_favorite: boolean;
  created_at: string;
}

async function getToken(): Promise<string | null> {
  const { getSupabase } = await import("@/lib/supabase/client");
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}

export function useSavedContent(options?: {
  type?: string;
  topic?: string;
  specialty?: string;
  favoritesOnly?: boolean;
}) {
  const [items, setItems] = useState<SavedContentItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    const params = new URLSearchParams();
    if (options?.type) params.set("type", options.type);
    if (options?.topic) params.set("topic", options.topic);
    if (options?.specialty) params.set("specialty", options.specialty);
    if (options?.favoritesOnly) params.set("favorites", "true");

    try {
      const res = await fetch(`/api/medmind/content?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
      }
    } catch {
      // Network error
    }
    setLoading(false);
  }, [options?.type, options?.topic, options?.specialty, options?.favoritesOnly]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const saveContent = useCallback(
    async (content: {
      contentType: string;
      specialty?: string;
      topic: string;
      questionContext?: string;
      contentRu: string;
      imageUrl?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const token = await getToken();
      if (!token) return null;

      try {
        const res = await fetch("/api/medmind/content", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(content),
        });
        if (res.ok) {
          const data = await res.json();
          fetchItems(); // Refresh list
          return data.id;
        }
      } catch {
        // Network error
      }
      return null;
    },
    [fetchItems]
  );

  const toggleFavorite = useCallback(
    async (id: string, isFavorite: boolean) => {
      const token = await getToken();
      if (!token) return;

      try {
        await fetch("/api/medmind/content", {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id, isFavorite }),
        });
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, is_favorite: isFavorite } : item
          )
        );
      } catch {
        // Network error
      }
    },
    []
  );

  const deleteContent = useCallback(
    async (id: string) => {
      const token = await getToken();
      if (!token) return;

      try {
        await fetch(`/api/medmind/content?id=${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        setItems((prev) => prev.filter((item) => item.id !== id));
      } catch {
        // Network error
      }
    },
    []
  );

  return {
    items,
    loading,
    refresh: fetchItems,
    saveContent,
    toggleFavorite,
    deleteContent,
  };
}
