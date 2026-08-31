import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-9 px-5">
      <div className="text-center">
        <Link href="/" className="display text-[19px] text-fg">
          Sprintfy
        </Link>
        <p className="mt-2 text-[13.5px] text-fg-mid">
          Pick up where your agent left off.
        </p>
      </div>
      {/* AuthForm reads a query parameter, and this page is statically
          rendered — without a boundary the build refuses it. */}
      <Suspense fallback={<div className="h-[19rem] w-full max-w-sm" />}>
        <AuthForm mode="login" />
      </Suspense>
    </main>
  );
}
