import { apiFetch } from "./clientApi";

export type UpdateMeDto = {
  fullName?: string;
  birthday?: string;
  phoneNumber?:string
  address?: string;
  hairType?: string;
  skinType?: string;
  avatarUrl?: string;
  avatarKey?: string;
};

export async function updateMe(dto: UpdateMeDto) {
  return apiFetch("/users/me", {
    method: "PATCH",
    body: JSON.stringify(dto),
  });
}
