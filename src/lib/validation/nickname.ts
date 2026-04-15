export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 20;
export const NICKNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export type NicknameValidation =
  | { ok: true; value: string }
  | { ok: false; error: string };

export function validateNickname(raw: string): NicknameValidation {
  const value = raw.trim().toLowerCase();
  if (value.length < NICKNAME_MIN) return { ok: false, error: `Минимум ${NICKNAME_MIN} символа` };
  if (value.length > NICKNAME_MAX) return { ok: false, error: `Максимум ${NICKNAME_MAX} символов` };
  if (!NICKNAME_PATTERN.test(value)) return { ok: false, error: "Только латиница, цифры и _" };
  return { ok: true, value };
}
