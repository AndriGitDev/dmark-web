import { proxyAccount } from "@/lib/account-proxy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  if (action !== "me" && action !== "workspace")
    return Response.json({ code: "INVALID_REQUEST" }, { status: 405 });
  return proxyAccount(request, action);
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  if (!["start", "workspace", "logout"].includes(action))
    return Response.json({ code: "INVALID_REQUEST" }, { status: 405 });
  return proxyAccount(request, action);
}
