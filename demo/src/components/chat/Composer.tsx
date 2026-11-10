"use client";

import { AtSign, Bold, Code, Italic, Link2, List, Plus, SendHorizontal, Slash, Smile, Strikethrough } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { slashCommands, suggestedPrompts } from "@/data/workspace";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";

// Slack-style message box. Enter sends, Shift+Enter adds a new line,
// and typing "/" opens the /chilla command menu.
export function Composer({
  convId,
  placeholder,
  showSuggestions,
  prefix = "",
}: {
  convId: string;
  placeholder: string;
  showSuggestions?: boolean;
  /** Text auto-prepended to suggestion chips (e.g. "@chilla " in channels). */
  prefix?: string;
}) {
  const { sendMessage, typing, integrations, showToast } = useWorkspace();
  const [text, setText] = useState("");
  const [menuIndex, setMenuIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busy = !!typing[convId];

  // Show the command menu while the user is still typing the command itself.
  const typed = text.trimStart();
  const menu =
    integrations.slack && typed.startsWith("/") && !/^\/chilla \S+ /.test(typed)
      ? slashCommands.filter((c) => c.cmd.startsWith(typed.split(/\s+/).slice(0, 2).join(" ")) || typed === "/")
      : [];

  const send = (value = text) => {
    if (!value.trim() || busy) return;
    sendMessage(convId, value);
    setText("");
  };

  const pick = (cmd: string) => {
    setText(`${cmd} `);
    setMenuIndex(0);
    inputRef.current?.focus();
  };

  const wrap = (mark: string) => {
    const el = inputRef.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    setText(text.slice(0, a) + mark + text.slice(a, b) + mark + text.slice(b));
    el.focus();
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (menu.length) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setMenuIndex((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + menu.length) % menu.length);
        return;
      }
      if ((e.key === "Enter" || e.key === "Tab") && typed.split(/\s+/).length <= 2 && !typed.endsWith(" ")) {
        e.preventDefault();
        pick(menu[Math.min(menuIndex, menu.length - 1)].cmd);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="relative shrink-0 px-4 pt-2 pb-4 sm:px-5" data-tour="composer">
      {showSuggestions && (
        <div className="scroll-thin mb-2 flex gap-2 overflow-x-auto pb-1">
          {suggestedPrompts.map((p) => (
            <button key={p} className="chip shrink-0 bg-white hover:bg-blue-soft" onClick={() => send(prefix + p)} disabled={busy}>
              {p}
            </button>
          ))}
        </div>
      )}

      {menu.length > 0 && (
        <div className="card absolute right-4 bottom-full left-4 z-20 mb-1 overflow-hidden sm:right-5 sm:left-5" role="listbox" aria-label="Slash commands">
          <p className="border-b-[1.5px] border-ink bg-belly px-3 py-1.5 text-xs font-bold text-muted">Chilla commands</p>
          {menu.map((c, i) => (
            <button
              key={c.cmd}
              role="option"
              aria-selected={i === menuIndex}
              onMouseEnter={() => setMenuIndex(i)}
              onClick={() => pick(c.cmd)}
              className={`flex w-full items-baseline gap-2 px-3 py-2 text-left text-sm ${i === menuIndex ? "bg-blue text-white" : ""}`}
            >
              <b className="shrink-0">{c.cmd}</b>
              <span className={`shrink-0 ${i === menuIndex ? "text-white/80" : "text-muted"}`}>{c.args}</span>
              <span className={`ml-auto truncate text-xs ${i === menuIndex ? "text-white/90" : "text-muted"}`}>{c.desc}</span>
            </button>
          ))}
        </div>
      )}

      <div className="card-flat shadow-brutal-sm focus-within:outline-3 focus-within:outline-blue">
        <div className="flex items-center gap-0.5 border-b-[1.5px] border-belly px-2 pt-1.5 pb-1 text-muted">
          <Tool label="Bold" onClick={() => wrap("**")}><Bold size={15} /></Tool>
          <Tool label="Italic" onClick={() => wrap("_")}><Italic size={15} /></Tool>
          <Tool label="Strikethrough" onClick={() => wrap("~")}><Strikethrough size={15} /></Tool>
          <span className="mx-1 h-4 w-px bg-ear" />
          <Tool label="Link" onClick={() => showToast("Links aren't part of this demo")}><Link2 size={15} /></Tool>
          <Tool label="List" onClick={() => setText((t) => `${t}${t && !t.endsWith("\n") ? "\n" : ""}• `)}><List size={15} /></Tool>
          <Tool label="Code" onClick={() => wrap("`")}><Code size={15} /></Tool>
        </div>
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setMenuIndex(0);
          }}
          onKeyDown={onKey}
          rows={1}
          placeholder={placeholder}
          aria-label={placeholder}
          className="block max-h-40 min-h-10 w-full resize-none bg-transparent px-3 py-2 focus:outline-none"
        />
        <div className="flex items-center gap-0.5 px-2 pb-2 text-muted">
          <Tool label="Attach" onClick={() => showToast("Attachments aren't part of this demo")}><Plus size={16} /></Tool>
          <Tool label="Emoji" onClick={() => setText((t) => `${t}🙂`)}><Smile size={16} /></Tool>
          <Tool label="Mention someone" onClick={() => setText((t) => `${t}@`)}><AtSign size={16} /></Tool>
          {integrations.slack && (
            <Tool label="Chilla commands" onClick={() => { setText("/"); inputRef.current?.focus(); }}><Slash size={16} /></Tool>
          )}
          <button className="btn btn-blue ml-auto h-8 w-9 p-0" onClick={() => send()} disabled={!text.trim() || busy} aria-label="Send">
            <SendHorizontal size={15} />
          </button>
        </div>
      </div>
      <p className="mt-1.5 hidden text-xs text-muted sm:block">
        <b>Enter</b> to send · <b>Shift + Enter</b> for a new line{integrations.slack && <> · type <code className="rounded bg-blue-soft px-1">/</code> for Chilla commands</>}
      </p>
    </div>
  );
}

function Tool({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="rounded-md p-1.5 hover:bg-belly hover:text-ink">
      {children}
    </button>
  );
}
