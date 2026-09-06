"use client";

import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { flushSync, useFormStatus } from "react-dom";
import { ArrowUp, Globe2, Loader2, Plus, Search } from "lucide-react";

type ComposerFormProps = {
  action: (formData: FormData) => Promise<void>;
  conversationId?: string;
  initialDraft: string;
  initialWebEnabled: boolean;
};

function SendButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="send"
      type="submit"
      aria-label={pending ? "Sending message" : "Send message"}
      disabled={disabled || pending}
    >
      {pending ? (
        <Loader2 aria-hidden="true" className="spin" size={16} />
      ) : (
        <ArrowUp aria-hidden="true" size={18} />
      )}
    </button>
  );
}

export function ComposerForm({
  action,
  conversationId,
  initialDraft,
  initialWebEnabled,
}: ComposerFormProps) {
  const [draft, setDraft] = useState(initialDraft);
  const [isFinePointer, setIsFinePointer] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches,
  );
  const [webConsentAccepted, setWebConsentAccepted] = useState(false);
  const [webConsentOpen, setWebConsentOpen] = useState(false);
  const [webEnabled, setWebEnabled] = useState(initialWebEnabled);
  const consentDialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = draft.trim().length > 0;

  useEffect(() => {
    const query = window.matchMedia("(pointer: fine)");

    const handleChange = () => setIsFinePointer(query.matches);
    query.addEventListener("change", handleChange);

    return () => query.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const textareaElement = textarea;

    function resize() {
      const visibleHeight = window.visualViewport?.height ?? window.innerHeight;
      const cap = Math.max(56, Math.min(192, Math.floor(visibleHeight * 0.28)));

      textareaElement.style.height = "auto";
      textareaElement.style.height = `${Math.min(
        cap,
        Math.max(32, textareaElement.scrollHeight),
      )}px`;
      textareaElement.style.overflowY =
        textareaElement.scrollHeight > cap ? "auto" : "hidden";
    }

    resize();
    window.visualViewport?.addEventListener("resize", resize);
    window.addEventListener("resize", resize);

    return () => {
      window.visualViewport?.removeEventListener("resize", resize);
      window.removeEventListener("resize", resize);
    };
  }, [draft]);

  useEffect(() => {
    const dialog = consentDialogRef.current;

    if (!dialog) {
      return;
    }

    if (webConsentOpen && !dialog.open) {
      dialog.showModal();
    }

    if (!webConsentOpen && dialog.open) {
      dialog.close();
    }
  }, [webConsentOpen]);

  function submitWithConsent() {
    flushSync(() => setWebConsentAccepted(true));
    setWebConsentOpen(false);
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!canSend) {
      event.preventDefault();
      return;
    }

    if (webEnabled && !webConsentAccepted) {
      event.preventDefault();
      setWebConsentOpen(true);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing &&
      isFinePointer &&
      canSend
    ) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  return (
    <>
      <form
        action={action}
        className="composer"
        aria-label="Message composer"
        onSubmit={handleSubmit}
        ref={formRef}
      >
        <input name="conversationId" type="hidden" value={conversationId ?? ""} />
        <input name="webEnabled" type="hidden" value={webEnabled ? "true" : "false"} />
        <input
          name="webConsentAccepted"
          type="hidden"
          value={webConsentAccepted ? "true" : "false"}
        />
        <label className="sr-only" htmlFor="message">
          Message
        </label>
        <textarea
          id="message"
          name="content"
          onChange={event => {
            setDraft(event.target.value);
            setWebConsentAccepted(false);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          ref={textareaRef}
          rows={1}
          value={draft}
        />
        <div className="composer-controls">
          <button type="button" aria-label="Add sources">
            <Plus aria-hidden="true" size={18} />
          </button>
          <button
            className={webEnabled ? "active" : ""}
            type="button"
            aria-pressed={webEnabled}
            onClick={() => {
              setWebEnabled(enabled => !enabled);
              setWebConsentAccepted(false);
            }}
          >
            <Globe2 aria-hidden="true" size={16} />
            <span>Web</span>
          </button>
          <SendButton disabled={!canSend} />
        </div>
      </form>

      <dialog
        className="consent-dialog"
        ref={consentDialogRef}
        onClose={() => setWebConsentOpen(false)}
      >
        <form method="dialog" className="dialog-surface">
          <header>
            <Search aria-hidden="true" size={18} />
            <h2>Search the web?</h2>
          </header>
          <dl>
            <div>
              <dt>Query</dt>
              <dd>{draft.trim()}</dd>
            </div>
            <div>
              <dt>Destination</dt>
              <dd>Vigilante web retrieval adapter</dd>
            </div>
            <div>
              <dt>Included data</dt>
              <dd>Current prompt only. No attached local files or history.</dd>
            </div>
          </dl>
          <div className="dialog-actions">
            <button type="button" onClick={() => setWebConsentOpen(false)}>
              Cancel
            </button>
            <button type="button" onClick={submitWithConsent}>
              Search once
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
