export type UserRole = "admin" | "client";

export interface User {
  id: number;
  email: string;
  role: UserRole;

  vip: boolean;

  fullName?: string | null;
  birthday?: string | null;
  skinType?: string | null;
  hairType?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
  avatarKey?: string | null;

  // Kept for compatibility with old code if still referenced somewhere.
  name?: string;
  token?: string;
}