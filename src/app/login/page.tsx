import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-9 px-5">
      <div className="text-center">
        <Link href="/" className="display text-[19px] text-fg">
          SpecFlow
        </Link>
        <p className="mt-2 text-[13.5px] text-fg-mid">
          Pick up where your agent left off.
        </p>
      </div>
      <AuthForm mode="login" />
    </main>
  );
}
