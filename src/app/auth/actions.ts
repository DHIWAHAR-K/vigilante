"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { AuthActionState } from "@/app/auth/state";
import { createConversationTurn } from "@/lib/conversations/repository";
import { normalizeRedirectPath } from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.string().trim().email("Use a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
  redirectTo: z.string().optional(),
});

const messageSchema = z.object({
  conversationId: z.string().uuid().optional().or(z.literal("")),
  content: z.string().trim().min(1).max(12000),
  webEnabled: z.enum(["true", "false"]).default("false"),
  webConsentAccepted: z.enum(["true", "false"]).default("false"),
});

function parseCredentials(formData: FormData) {
  return credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo"),
  });
}

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = parseCredentials(formData);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const redirectTo = normalizeRedirectPath(parsed.data.redirectTo);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      status: "error",
      message: error.message,
    };
  }

  revalidatePath("/app", "layout");
  redirect(redirectTo);
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = parseCredentials(formData);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const redirectTo = normalizeRedirectPath(parsed.data.redirectTo);
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: origin
      ? {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(
            redirectTo,
          )}`,
        }
      : undefined,
  });

  if (error) {
    return {
      status: "error",
      message: error.message,
    };
  }

  if (!data.session) {
    return {
      status: "success",
      message: "Check your email to confirm your account, then sign in.",
    };
  }

  revalidatePath("/app", "layout");
  redirect(redirectTo);
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/sign-in");
}

export async function sendMessageAction(formData: FormData) {
  const parsed = messageSchema.safeParse({
    conversationId: formData.get("conversationId") ?? "",
    content: formData.get("content"),
    webEnabled: formData.get("webEnabled") ?? "false",
    webConsentAccepted: formData.get("webConsentAccepted") ?? "false",
  });

  if (!parsed.success) {
    redirect("/app");
  }

  const webEnabled = parsed.data.webEnabled === "true";
  const webConsentAccepted = parsed.data.webConsentAccepted === "true";

  if (webEnabled && !webConsentAccepted) {
    redirect("/app");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?redirectTo=/app");
  }

  const conversationId = await createConversationTurn({
    content: parsed.data.content,
    conversationId: parsed.data.conversationId || undefined,
    supabase,
    userId: user.id,
    webConsentAccepted,
    webEnabled,
  });

  revalidatePath("/app", "page");
  redirect(`/app?conversation=${conversationId}`);
}
