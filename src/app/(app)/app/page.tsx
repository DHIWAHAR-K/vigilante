import { redirect } from "next/navigation";
import { sendMessageAction, signOutAction } from "@/app/auth/actions";
import { ConversationShell } from "@/components/conversation/conversation-shell";
import {
  loadConversationView,
  listConversationSummaries,
} from "@/lib/conversations/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AppPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readSearchValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AppPage({ searchParams }: AppPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?redirectTo=/app");
  }

  const params = await searchParams;
  const selectedConversationId = readSearchValue(params.conversation);
  const [summaries, conversation] = await Promise.all([
    listConversationSummaries(supabase, user.id),
    loadConversationView(supabase, user.id, selectedConversationId),
  ]);

  return (
    <ConversationShell
      conversation={conversation}
      sendMessageAction={sendMessageAction}
      summaries={summaries}
      userEmail={user.email ?? "Signed in"}
      signOutAction={signOutAction}
    />
  );
}
