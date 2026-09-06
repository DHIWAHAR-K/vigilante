import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { normalizeRedirectPath } from "@/lib/auth/redirects";
import { signUpAction } from "../../auth/actions";

type SignUpPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readSearchValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const redirectTo = normalizeRedirectPath(readSearchValue(params.redirectTo));
  const signInHref = {
    pathname: "/sign-in",
    query: { redirectTo },
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="auth-title">
        <p className="wordmark">vigilante</p>
        <div className="auth-copy">
          <h1 id="auth-title">Create your account</h1>
          <p>Start with authenticated, owner-scoped conversation storage.</p>
        </div>
        <AuthForm action={signUpAction} mode="sign-up" redirectTo={redirectTo} />
        <p className="auth-switch">
          Already have an account? <Link href={signInHref}>Sign in</Link>
        </p>
      </section>
    </main>
  );
}
