import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4">
      <Link href="/" className="text-[15px] font-medium tracking-tight text-ink">
        Spec<span className="text-agent">Flow</span>
      </Link>
      <AuthForm mode="login" />
    </main>
  );
}
