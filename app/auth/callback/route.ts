import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");

  let next = searchParams.get("next") ?? "/dashboard";

  // Security: only allow relative redirects
  if (!next.startsWith("/")) {
    next = "/dashboard";
  }

  if (code) {
    const supabase = await createClient();

    const { error } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost =
        request.headers.get("x-forwarded-host");

      const forwardedProto =
        request.headers.get("x-forwarded-proto") ?? "https";

      const isLocal =
        process.env.NODE_ENV === "development";

      // Local development
      if (isLocal) {
        return NextResponse.redirect(
          `${origin}${next}`
        );
      }

      // Production behind Vercel proxy
      if (forwardedHost) {
        return NextResponse.redirect(
          `${forwardedProto}://${forwardedHost}${next}`
        );
      }

      // Safe production fallback
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL;

      if (siteUrl) {
        return NextResponse.redirect(
          `${siteUrl}${next}`
        );
      }

      return NextResponse.redirect(
        `${origin}${next}`
      );
    }

    console.error(
      "OAuth code exchange error:",
      error
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    origin;

  return NextResponse.redirect(
    `${siteUrl}/login?error=oauth`
  );
}