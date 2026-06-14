export const ROLES = ["viewer", "editor", "publisher"] as const;
export type Role = (typeof ROLES)[number];

export type Action = "view" | "edit" | "publish";

const POLICY: Record<Role, ReadonlyArray<Action>> = {
  viewer: ["view"],
  editor: ["view", "edit"],
  publisher: ["view", "edit", "publish"],
};

export function can(role: Role | null | undefined, action: Action): boolean {
  if (!role) return false;
  return POLICY[role].includes(action);
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
