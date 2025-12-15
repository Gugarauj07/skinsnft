import { NextResponse } from "next/server";

export function jsonOk(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function jsonError(code: string, message?: string, status = 400) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}


