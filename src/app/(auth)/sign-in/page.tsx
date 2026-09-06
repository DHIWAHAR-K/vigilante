import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { normalizeRedirectPath } from "@/lib/auth/redirects";
import { signInAction } from "../../auth/actions";

type SignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readSearchValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const redirectTo = normalizeRedirectPath(readSearchValue(params.redirectTo));
  const signUpHref = {
    pathname: "/sign-up",
    query: { redirectTo },
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="auth-title">
        <p className="wordmark">vigilante</p>
        <div className="auth-copy">
          <h1 id="auth-title">Sign in to Vigilante</h1>
          <p>Continue into your private research conversations.</p>
        </div>
        <AuthForm action={signInAction} mode="sign-in" redirectTo={redirectTo} />
        <p className="auth-switch">
          New here? <Link href={signUpHref}>Create an account</Link>
        </p>
      </section>
    </main>
  );
}
