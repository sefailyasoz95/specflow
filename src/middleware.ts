import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  /* Anything with a file extension is a static asset, never a route, so
     it must not go through the auth redirect. Listing image types alone
     was not enough: /sounds/arrive.mp3 and /evals.js were being answered
     with the sign-in page, which is why the audio never played and why
     the eval harness would not load for a signed-out visitor. No route in
     this app contains a dot. */
  matcher: ["/((?!_next/static|_next/image|.*\\.[^/]+$).*)"],
};
