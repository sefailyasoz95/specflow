import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-9 px-5">
      <div className="text-center">
        <Link href="/" className="display text-[19px] text-fg">
          Sprintfy
        </Link>
        <p className="mt-2 max-w-xs text-[13.5px] leading-relaxed text-fg-mid">
          One account, one workspace your agent can propose into.
        </p>
      </div>
      <AuthForm mode="signup" />
    </main>
  );
}
