import { createHash, randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

export function requestId(): string {
  return randomUUID();
}

export function jsonError(
  code: string,
  message: string,
  status: number,
  id = requestId(),
): NextResponse {
  return NextResponse.json(
    { error: { code, message }, requestId: id },
    { status, headers: { "x-request-id": id } },
  );
}

export function jsonOk<T>(data: T, id = requestId()): NextResponse {
  return NextResponse.json(data, { headers: { "x-request-id": id } });
}

export function hashIp(value: string | null | undefined): string | null {
  const salt = process.env.IP_HASH_SALT?.trim();
  if (!salt || !value) return null;
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}
