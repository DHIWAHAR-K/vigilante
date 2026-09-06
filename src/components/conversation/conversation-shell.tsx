import { LogOut, PanelLeftClose, Plus, Search } from "lucide-react";
import Link from "next/link";
import { ComposerForm } from "@/components/conversation/composer-form";
import type {
  ConversationSummary,
  ConversationView,
} from "@/lib/conversations/repository";

type ConversationShellProps = {
  conversation: ConversationView;
  sendMessageAction: (formData: FormData) => Promise<void>;
  summaries: ConversationSummary[];
  userEmail: string;
  signOutAction: () => Promise<void>;
};

export function ConversationShell({
  conversation,
  sendMessageAction,
  summaries,
  userEmail,
  signOutAction,
}: ConversationShellProps) {
  const isEmpty = conversation.messages.length === 0;

  return (
    <main className="app-shell" aria-label="Vigilante conversation">
      <header className="mobile-header">
        <button className="text-button" type="button">
          History
        </button>
        <span className="wordmark">vigilante</span>
        <Link className="icon-button" href="/app" aria-label="New conversation">
          <Plus aria-hidden="true" size={18} />
        </Link>
      </header>

      <aside className="history-sidebar" aria-label="Conversation history">
        <div className="sidebar-header">
          <span className="wordmark">vigilante</span>
          <div className="sidebar-actions">
            <button className="icon-button" type="button" aria-label="Search history">
              <Search aria-hidden="true" size={16} />
            </button>
            <button className="icon-button" type="button" aria-label="Hide sidebar">
              <PanelLeftClose aria-hidden="true" size={16} />
            </button>
          </div>
        </div>
        <Link className="sidebar-new" href="/app">
          <Plus aria-hidden="true" size={16} />
          <span>New</span>
        </Link>
        <h2>History</h2>
        <nav className="history-list" aria-label="Recent conversations">
          {summaries.length > 0 ? (
            summaries.map(item => (
              <Link
                aria-current={item.id === conversation.id ? "page" : undefined}
                className="history-row"
                href={`/app?conversation=${item.id}`}
                key={item.id}
                title={item.title}
              >
                <span>{item.title}</span>
              </Link>
            ))
          ) : (
            <p className="history-empty">No conversations yet.</p>
          )}
        </nav>
        <form action={signOutAction} className="sidebar-account">
          <span title={userEmail}>{userEmail}</span>
          <button className="icon-button" type="submit" aria-label="Sign out">
            <LogOut aria-hidden="true" size={16} />
          </button>
        </form>
      </aside>

      <section
        className={`conversation-shell signed-in ${isEmpty ? "empty" : ""}`}
        aria-label="Conversation"
      >
        <div className={`message-list ${isEmpty ? "empty" : ""}`} aria-label="Messages">
          {isEmpty ? (
            <div className="welcome">
              <h1>What do you want to know?</h1>
            </div>
          ) : (
            conversation.messages.map(message => (
              <article className={`message ${message.role}-message`} key={message.id}>
                {message.role === "assistant" ? (
                  <div className="assistant-label">
                    <span className="assistant-mark" aria-hidden="true">
                      v
                    </span>
                    <span>Vigilante</span>
                  </div>
                ) : null}
                <p>{message.content}</p>
                {message.status !== "complete" ? (
                  <p className="message-status">{message.status}</p>
                ) : null}
              </article>
            ))
          )}
        </div>

        <ComposerForm
          action={sendMessageAction}
          conversationId={conversation.id}
          initialDraft={conversation.draft}
          initialWebEnabled={conversation.webEnabled}
          key={`${conversation.id ?? "new"}-${conversation.messages.length}`}
        />
      </section>
    </main>
  );
}
