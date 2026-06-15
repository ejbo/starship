import { NextResponse, type NextRequest } from "next/server";

/** 把当前路径塞进请求头，供 root layout 判断是否走「覆盖层无外壳」分支（/overlay）。 */
export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
