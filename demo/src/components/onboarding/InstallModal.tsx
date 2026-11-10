"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeftRight, Check, Eye, Hash, Loader2, MessageSquare, Slash, Users } from "lucide-react";
import { channels, company } from "@/data/workspace";
import { ChillaAvatar } from "@/components/ui/Mascot";
import { Modal } from "@/components/ui/Modal";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";

const VIEW = [
  { icon: MessageSquare, text: "Messages in channels and conversations Chilla is added to" },
  { icon: Users, text: "Profiles of people in the workspace: names, titles and teams" },
];
const DO = [
  { icon: MessageSquare, text: "Send messages as @chilla" },
  { icon: ArrowLeftRight, text: "Send messages as you, only for nudges you approve" },
  { icon: Slash, text: "Add the /chilla command and shortcuts" },
];

// Simulated Slack OAuth: permissions → pick channels → installing.
export function InstallModal() {
  const { modal, setModal } = useWorkspace();
  return (
    <Modal open={modal === "install"} onClose={() => setModal(null)} title="Add Chilla to Slack" icon={<ChillaAvatar size={28} />}>
      {modal === "install" && <InstallFlow />}
    </Modal>
  );
}

function InstallFlow() {
  const router = useRouter();
  const { installChilla, setModal, profile } = useWorkspace();
  const [step, setStep] = useState<"consent" | "channels" | "installing">("consent");
  const [picked, setPicked] = useState<string[]>(["launch-q4", "payments-squad"]);

  if (step === "installing") {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <Loader2 size={32} className="animate-spin text-blue" />
        <p className="mt-3 font-bold">Installing Chilla in {company.name}…</p>
        <p className="text-sm text-muted">Reading public profiles so search works from minute one.</p>
      </div>
    );
  }

  if (step === "channels") {
    const toggle = (slug: string) => setPicked((p) => (p.includes(slug) ? p.filter((x) => x !== slug) : [...p, slug]));
    return (
      <div className="space-y-4">
        <div>
          <p className="text-lg font-extrabold">Where should Chilla hang out?</p>
          <p className="text-sm text-muted">It only replies when someone @mentions it or uses /chilla. You can add it to more channels later.</p>
        </div>
        <ul className="space-y-2">
          {channels.map((c) => {
            const on = picked.includes(c.slug);
            return (
              <li key={c.slug}>
                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-ink p-3 ${on ? "bg-blue-soft" : "bg-white hover:bg-belly"}`}>
                  <input type="checkbox" className="h-4 w-4 accent-blue" checked={on} onChange={() => toggle(c.slug)} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 font-bold"><Hash size={14} />{c.name}</span>
                    <span className="block truncate text-xs text-muted">{c.topic} · {c.members} members</span>
                  </span>
                  {c.slug === "launch-q4" && <span className="pill bg-yellow">Recommended</span>}
                </label>
              </li>
            );
          })}
        </ul>
        <div className="flex justify-between gap-2 border-t-2 border-dashed border-ear pt-4">
          <button className="btn btn-ghost" onClick={() => setStep("consent")}>Back</button>
          <button
            className="btn btn-blue"
            onClick={() => {
              setStep("installing");
              window.setTimeout(() => {
                installChilla(picked);
                setModal(null);
                router.push("/");
              }, 1300);
            }}
          >
            Add Chilla{picked.length ? ` to ${picked.length} channel${picked.length > 1 ? "s" : ""}` : ""}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border-2 border-ink bg-paper p-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg border-2 border-ink bg-ink text-lg font-black text-white">
          {company.name[0]}
        </span>
        <div className="min-w-0 text-sm">
          <p>
            <b>Chilla</b> is requesting permission to access the <b>{company.name}</b> Slack workspace
          </p>
          <p className="text-muted">Signed in as {profile.email}</p>
        </div>
      </div>
      <Section title="What will Chilla be able to view?" items={VIEW} />
      <Section title="What will Chilla be able to do?" items={DO} />
      <p className="flex items-start gap-2 rounded-lg bg-mint px-3 py-2 text-sm">
        <Eye size={15} className="mt-0.5 shrink-0" /> Chilla never reads private DMs between other people.
      </p>
      <div className="flex justify-end gap-2 border-t-2 border-dashed border-ear pt-4">
        <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
        <button className="btn btn-blue" onClick={() => setStep("channels")}>
          <Check size={15} /> Allow
        </button>
      </div>
    </div>
  );
}

function Section({ title, items }: { title: string; items: { icon: typeof Eye; text: string }[] }) {
  return (
    <div>
      <p className="mb-1.5 font-extrabold">{title}</p>
      <ul className="space-y-1.5">
        {items.map((x) => (
          <li key={x.text} className="flex items-start gap-2 text-sm">
            <x.icon size={15} className="mt-0.5 shrink-0 text-muted" /> {x.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
