import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createConversationTitle } from "@/lib/conversations/title";

export type ConversationSummary = {
  id: string;
  title: string;
  draft: string;
  webEnabled: boolean;
  updatedAt: string;
};

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  status: "running" | "complete" | "stopped" | "error";
  content: string;
  position: number;
};

export type ConversationView = {
  id?: string;
  title?: string;
  draft: string;
  webEnabled: boolean;
  messages: ConversationMessage[];
};

type CreateConversationTurnInput = {
  content: string;
  conversationId?: string;
  supabase: SupabaseClient;
  userId: string;
  webConsentAccepted: boolean;
  webEnabled: boolean;
};

const uuidSchema = z.string().uuid();

function assertSupabaseOk(error: { message: string } | null, action: string) {
  if (error) {
    throw new Error(`${action}: ${error.message}`);
  }
}

function assertSupabaseData<T>(data: T | null, action: string): T {
  if (!data) {
    throw new Error(`${action}: no data returned`);
  }

  return data;
}

function mapSummary(row: {
  id: string;
  title: string;
  draft: string;
  web_enabled: boolean;
  updated_at: string;
}): ConversationSummary {
  return {
    id: row.id,
    title: row.title,
    draft: row.draft,
    webEnabled: row.web_enabled,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row: {
  id: string;
  role: ConversationMessage["role"];
  status: ConversationMessage["status"];
  content: string;
  position: number;
}): ConversationMessage {
  return {
    id: row.id,
    role: row.role,
    status: row.status,
    content: row.content,
    position: row.position,
  };
}

export async function listConversationSummaries(
  supabase: SupabaseClient,
  userId: string,
): Promise<ConversationSummary[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id,title,draft,web_enabled,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(40);

  assertSupabaseOk(error, "List conversations failed");

  return (data ?? []).map(mapSummary);
}

export async function loadConversationView(
  supabase: SupabaseClient,
  userId: string,
  requestedConversationId?: string,
): Promise<ConversationView> {
  const parsedConversationId = uuidSchema.safeParse(requestedConversationId);

  if (!parsedConversationId.success) {
    return {
      draft: "",
      webEnabled: false,
      messages: [],
    };
  }

  const conversationId = parsedConversationId.data;
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id,title,draft,web_enabled")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  assertSupabaseOk(conversationError, "Load conversation failed");

  if (!conversation) {
    return {
      draft: "",
      webEnabled: false,
      messages: [],
    };
  }

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("id,role,status,content,position")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .order("position", { ascending: true });

  assertSupabaseOk(messagesError, "Load messages failed");

  return {
    id: conversation.id,
    title: conversation.title,
    draft: conversation.draft,
    webEnabled: conversation.web_enabled,
    messages: (messages ?? []).map(mapMessage),
  };
}

export async function createConversationTurn({
  content,
  conversationId,
  supabase,
  userId,
  webConsentAccepted,
  webEnabled,
}: CreateConversationTurnInput): Promise<string> {
  const activeConversationId =
    conversationId ??
    (await createConversation({
      content,
      supabase,
      userId,
      webEnabled,
    }));
  const nextPosition = await getNextMessagePosition(
    supabase,
    userId,
    activeConversationId,
  );

  await updateConversationDraftState({
    conversationId: activeConversationId,
    supabase,
    userId,
    webEnabled,
  });

  await insertMessage({
    content,
    conversationId: activeConversationId,
    position: nextPosition,
    role: "user",
    supabase,
    userId,
  });
  const assistantMessageId = await insertMessage({
    content: webEnabled
      ? "Web consent was recorded. The retrieval adapter is not connected yet, so no external request was sent."
      : "Your message was saved. The AI response adapter is not connected yet.",
    conversationId: activeConversationId,
    position: nextPosition + 1,
    role: "assistant",
    supabase,
    userId,
  });
  const runId = await insertRun({
    assistantMessageId,
    content,
    conversationId: activeConversationId,
    mode: webEnabled ? "web" : "local",
    supabase,
    userId,
  });

  if (webEnabled && webConsentAccepted) {
    await insertWebConsent({
      content,
      conversationId: activeConversationId,
      runId,
      supabase,
      userId,
    });
  }

  return activeConversationId;
}

async function createConversation({
  content,
  supabase,
  userId,
  webEnabled,
}: {
  content: string;
  supabase: SupabaseClient;
  userId: string;
  webEnabled: boolean;
}) {
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      draft: "",
      title: createConversationTitle(content),
      user_id: userId,
      web_enabled: webEnabled,
    })
    .select("id")
    .single();

  assertSupabaseOk(error, "Create conversation failed");

  return assertSupabaseData(data, "Create conversation failed").id as string;
}

async function updateConversationDraftState({
  conversationId,
  supabase,
  userId,
  webEnabled,
}: {
  conversationId: string;
  supabase: SupabaseClient;
  userId: string;
  webEnabled: boolean;
}) {
  const { error } = await supabase
    .from("conversations")
    .update({
      draft: "",
      web_enabled: webEnabled,
    })
    .eq("id", conversationId)
    .eq("user_id", userId);

  assertSupabaseOk(error, "Update conversation failed");
}

async function getNextMessagePosition(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
) {
  const { data, error } = await supabase
    .from("messages")
    .select("position")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  assertSupabaseOk(error, "Load next message position failed");

  return typeof data?.position === "number" ? data.position + 1 : 0;
}

async function insertMessage({
  content,
  conversationId,
  position,
  role,
  supabase,
  userId,
}: {
  content: string;
  conversationId: string;
  position: number;
  role: ConversationMessage["role"];
  supabase: SupabaseClient;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      content,
      conversation_id: conversationId,
      position,
      role,
      status: "complete",
      user_id: userId,
    })
    .select("id")
    .single();

  assertSupabaseOk(error, "Create message failed");

  return assertSupabaseData(data, "Create message failed").id as string;
}

async function insertRun({
  assistantMessageId,
  content,
  conversationId,
  mode,
  supabase,
  userId,
}: {
  assistantMessageId: string;
  content: string;
  conversationId: string;
  mode: "local" | "web";
  supabase: SupabaseClient;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("runs")
    .insert({
      assistant_message_id: assistantMessageId,
      conversation_id: conversationId,
      mode,
      status: "complete",
      submitted_query: content,
      user_id: userId,
    })
    .select("id")
    .single();

  assertSupabaseOk(error, "Create run failed");

  return assertSupabaseData(data, "Create run failed").id as string;
}

async function insertWebConsent({
  content,
  conversationId,
  runId,
  supabase,
  userId,
}: {
  content: string;
  conversationId: string;
  runId: string;
  supabase: SupabaseClient;
  userId: string;
}) {
  const { error } = await supabase.from("web_consents").insert({
    conversation_id: conversationId,
    destination: "Vigilante web retrieval adapter",
    included_data: "Current prompt only. No attached local files or history.",
    query: content,
    run_id: runId,
    user_id: userId,
  });

  assertSupabaseOk(error, "Create web consent failed");
}
