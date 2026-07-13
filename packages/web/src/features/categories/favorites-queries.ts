import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth";
import {
  addFavoriteCategory,
  fetchFavorites,
  removeFavoriteCategory,
} from "@/features/categories/favorites-db";

export function useFavorites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: fetchFavorites,
    enabled: !!user,
  });
}

/** Favorite category ids as a Set, memoized over the current favorites list. */
export function useFavoriteCategoryIds(): Set<string> {
  const { data } = useFavorites();
  return useMemo(() => new Set<string>(data ?? []), [data]);
}

export function useAddFavorite() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) => addFavoriteCategory(categoryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites", user?.id] }),
  });
}

export function useRemoveFavorite() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) => removeFavoriteCategory(categoryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites", user?.id] }),
  });
}
