import { apiFetch } from "./clientApi";

// GET /users/me/favorites
export function getMyFavorites() {
  return apiFetch("/users/me/favorites", { method: "GET" });
}

// POST /users/me/favorites/{productUid}
export function addMyFavorite(productUid: number) {
  return apiFetch(`/users/me/favorites/${productUid}`, { method: "POST" });
}

// DELETE /users/me/favorites/{productUid}
export function removeMyFavorite(productUid: number) {
  return apiFetch(`/users/me/favorites/${productUid}`, { method: "DELETE" });
}
