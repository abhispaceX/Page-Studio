import type { Role } from "./roles";

/**
 * Seeded users for the mock auth flow. In production this would be replaced
 * with a real identity provider — the rest of the RBAC stack (cookie sign,
 * verify, getSession, middleware) is provider-agnostic and would not change.
 */
export interface SeededUser {
  username: string;
  role: Role;
  label: string;
}

export const SEEDED_USERS: SeededUser[] = [
  { username: "viewer", role: "viewer", label: "Viewer (read-only)" },
  { username: "editor", role: "editor", label: "Editor (edit drafts)" },
  { username: "publisher", role: "publisher", label: "Publisher (edit + publish)" },
];

export function findSeededUser(username: string): SeededUser | undefined {
  return SEEDED_USERS.find((u) => u.username === username);
}
