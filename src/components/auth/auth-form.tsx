"use client";

import { useActionState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { type AuthActionState, initialAuthActionState } from "@/app/auth/state";

type AuthFormProps = {
  action: (
    previousState: AuthActionState,
    formData: FormData,
  ) => Promise<AuthActionState>;
  mode: "sign-in" | "sign-up";
  redirectTo: string;
};

const copy = {
  "sign-in": {
    emailLabel: "Email",
    passwordLabel: "Password",
    passwordHelp: "Use the password for your Vigilante account.",
    submit: "Sign in",
    pending: "Signing in",
  },
  "sign-up": {
    emailLabel: "Email",
    passwordLabel: "Password",
    passwordHelp: "Use at least 8 characters.",
    submit: "Create account",
    pending: "Creating account",
  },
};

export function AuthForm({ action, mode, redirectTo }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialAuthActionState);
  const labels = copy[mode];

  return (
    <form action={formAction} className="auth-form">
      <input name="redirectTo" type="hidden" value={redirectTo} />
      <div className="field">
        <label htmlFor={`${mode}-email`}>{labels.emailLabel}</label>
        <input
          id={`${mode}-email`}
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          type="email"
        />
        {state.fieldErrors?.email ? (
          <p className="field-error">{state.fieldErrors.email[0]}</p>
        ) : null}
      </div>
      <div className="field">
        <label htmlFor={`${mode}-password`}>{labels.passwordLabel}</label>
        <input
          id={`${mode}-password`}
          name="password"
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          minLength={8}
          required
          type="password"
        />
        {state.fieldErrors?.password ? (
          <p className="field-error">{state.fieldErrors.password[0]}</p>
        ) : (
          <p className="field-help">{labels.passwordHelp}</p>
        )}
      </div>
      {state.message ? (
        <p className={`auth-alert ${state.status}`} role="status">
          {state.message}
        </p>
      ) : null}
      <button className="auth-submit" disabled={pending} type="submit">
        {pending ? (
          <Loader2 aria-hidden="true" className="spin" size={16} />
        ) : (
          <ArrowRight aria-hidden="true" size={16} />
        )}
        <span>{pending ? labels.pending : labels.submit}</span>
      </button>
    </form>
  );
}
