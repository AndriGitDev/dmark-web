import { NextResponse } from "next/server";
import { adminTempCookieName, signAdminTempPassword } from "@/lib/admin-access";

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") || "");
  const token = signAdminTempPassword(password);
  const url = new URL("/admin", request.url);

  if (!token) {
    url.searchParams.set("login", "failed");
    return NextResponse.redirect(url, { status: 303 });
  }

  const response = NextResponse.redirect(url, { status: 303 });
  response.cookies.set(adminTempCookieName(), token, {
    httpOnly: true,
    maxAge: 15 * 60,
    path: "/",
    sameSite: "strict",
    secure: true,
  });
  return response;
}
