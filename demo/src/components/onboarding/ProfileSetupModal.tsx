"use client";

import { useState } from "react";
import { Check, Plus, UserRoundPen, X } from "lucide-react";
import { departments } from "@/data/employees";
import { profileSuggestions } from "@/data/workspace";
import type { Department, Project, UserProfile } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";

const STEPS = ["From Slack", "What you work on", "Preview"];

// Three-step profile setup Chilla walks you through after install.
export function ProfileSetupModal() {
  const { modal, setModal } = useWorkspace();
  return (
    <Modal open={modal === "profile-setup"} onClose={() => setModal(null)} title="Set up your Chilla profile" icon={<UserRoundPen size={18} />}>
      {modal === "profile-setup" && <SetupFlow />}
    </Modal>
  );
}

function SetupFlow() {
  const { profile, onboarded, completeProfile, setModal, settings, setSettings, showToast } = useWorkspace();
  const [step, setStep] = useState(onboarded ? 1 : 0);
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [skillInput, setSkillInput] = useState("");
  const [newProject, setNewProject] = useState({ name: "", summary: "" });
  const set = <K extends keyof UserProfile>(k: K, v: UserProfile[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const hasProject = (name: string) => draft.projects.some((p) => p.name === name);
  const toggleProject = (p: Project) =>
    set("projects", hasProject(p.name) ? draft.projects.filter((x) => x.name !== p.name) : [...draft.projects, p]);
  const addSkill = (s: string) => {
    const v = s.trim();
    if (v && !draft.skills.includes(v)) set("skills", [...draft.skills, v]);
    setSkillInput("");
  };
  const addProject = () => {
    if (!newProject.name.trim()) return;
    set("projects", [
      ...draft.projects,
      { name: newProject.name.trim(), summary: newProject.summary.trim(), status: "current", role: draft.role, period: String(new Date().getFullYear()), tags: [] },
    ]);
    setNewProject({ name: "", summary: "" });
  };

  const ready = draft.projects.length > 0 && draft.skills.length > 0;

  return (
    <div className="space-y-5">
      <ol className="flex gap-1.5">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <span className={`block h-1.5 rounded-full border border-ink ${i <= step ? "bg-nose" : "bg-belly"}`} />
            <span className={`mt-1 block text-xs font-semibold ${i === step ? "" : "text-muted"}`}>{s}</span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            We pulled these from your Slack profile. Fix anything that&apos;s out of date.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name"><input className="input" value={draft.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Title"><input className="input" value={draft.role} onChange={(e) => set("role", e.target.value)} /></Field>
            <Field label="Department">
              <select className="input" value={draft.department} onChange={(e) => set("department", e.target.value as Department)}>
                {departments.map((d) => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Team"><input className="input" value={draft.team} onChange={(e) => set("team", e.target.value)} /></Field>
            <Field label="Location"><input className="input" value={draft.location} onChange={(e) => set("location", e.target.value)} /></Field>
            <Field label="Email"><input className="input bg-belly" value={draft.email} readOnly /></Field>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <p className="label">Projects</p>
            <p className="-mt-1 mb-2 flex items-center gap-1 text-xs text-muted">Chilla spotted these in channels and docs you&apos;re active in
            </p>
            <div className="space-y-2">
              {profileSuggestions.projects.map(({ source, ...p }) => {
                const on = hasProject(p.name);
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => toggleProject(p)}
                    className={`flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left ${on ? "border-ink bg-blue-soft" : "border-dashed border-fur bg-white hover:bg-belly"}`}
                  >
                    <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-[1.5px] border-ink ${on ? "bg-ink text-white" : "bg-white"}`}>
                      {on && <Check size={13} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold">
                        {p.name} <span className="text-xs font-semibold text-muted">· {p.status === "current" ? "Current" : p.period} · seen in {source}</span>
                      </span>
                      <span className="block text-sm text-muted">{p.summary}</span>
                    </span>
                  </button>
                );
              })}
              {draft.projects
                .filter((p) => !profileSuggestions.projects.some((s) => s.name === p.name))
                .map((p) => (
                  <div key={p.name} className="flex items-center gap-2 rounded-xl border-2 border-ink bg-blue-soft p-3 text-sm">
                    <b className="flex-1">{p.name}</b>
                    <button type="button" aria-label={`Remove ${p.name}`} onClick={() => toggleProject(p)}><X size={14} /></button>
                  </div>
                ))}
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
              <input className="input py-2 text-sm" placeholder="Another project" value={newProject.name} onChange={(e) => setNewProject((n) => ({ ...n, name: e.target.value }))} />
              <input className="input py-2 text-sm" placeholder="One line on what it is" value={newProject.summary} onChange={(e) => setNewProject((n) => ({ ...n, summary: e.target.value }))} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={addProject}><Plus size={14} /> Add</button>
            </div>
          </div>

          <div>
            <p className="label">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {draft.skills.map((s) => (
                <span key={s} className="chip bg-yellow">
                  {s}
                  <button type="button" aria-label={`Remove ${s}`} onClick={() => set("skills", draft.skills.filter((x) => x !== s))}><X size={12} /></button>
                </span>
              ))}
              {profileSuggestions.skills
                .filter((s) => !draft.skills.includes(s))
                .map((s) => (
                  <button key={s} type="button" className="chip border-dashed bg-white text-muted hover:bg-belly hover:text-ink" onClick={() => addSkill(s)}>
                    <Plus size={11} /> {s}
                  </button>
                ))}
            </div>
            <input
              className="input mt-2 py-2 text-sm"
              placeholder="Type a skill and press Enter"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(skillInput); } }}
            />
          </div>

          <Field label="Ask me about…">
            <div className="flex gap-2">
              <input className="input" value={draft.bestFor ?? ""} onChange={(e) => set("bestFor", e.target.value)} placeholder="e.g. corporate cards and approval flows" />
              {!draft.bestFor && (
                <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={() => set("bestFor", profileSuggestions.bestFor)}>Suggest
                </button>
              )}
            </div>
          </Field>
          <Field label="Short bio (optional)">
            <textarea className="input min-h-16" value={draft.bio} onChange={(e) => set("bio", e.target.value)} placeholder={profileSuggestions.bio} />
          </Field>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-muted">This is how you&apos;ll show up when someone asks Chilla about your area:</p>
          <article className="card-flat relative p-4 shadow-brutal">
            <span className="pill absolute -top-3 right-4 bg-yellow">Best match</span>
            <div className="flex items-start gap-3">
              <Avatar name={draft.name} status={settings.showAvailability ? "available" : undefined} />
              <div className="min-w-0 flex-1">
                <p className="font-bold">{draft.name}</p>
                <p className="truncate text-sm text-muted">{draft.role} · {draft.team}</p>
              </div>
            </div>
            <ul className="mt-3 space-y-1 pl-12 text-sm">
              {draft.projects.filter((p) => p.status === "current").slice(0, 1).map((p) => (
                <li key={p.name}>Currently <b>{p.role}</b> on <b>{p.name}</b>{p.summary && `: ${p.summary.charAt(0).toLowerCase()}${p.summary.slice(1)}`}</li>
              ))}
              {draft.bestFor && <li>Teammates go to them for {draft.bestFor}</li>}
            </ul>
            <div className="mt-2 flex flex-wrap gap-1 pl-12">
              {draft.skills.slice(0, 4).map((s) => <span key={s} className="chip text-[0.7rem]">{s}</span>)}
            </div>
          </article>
          <div className="divide-y divide-belly rounded-xl border-2 border-ink px-4">
            <Toggle label="Show me in Chilla recommendations" description="Colleagues can find you when they ask about your skills or projects." checked={settings.discoverable} onChange={(v) => setSettings({ ...settings, discoverable: v })} />
            <Toggle label="Show my availability" description="A green / busy / away dot from your calendar." checked={settings.showAvailability} onChange={(v) => setSettings({ ...settings, showAvailability: v })} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t-2 border-dashed border-ear pt-4">
        <button type="button" className="btn btn-ghost" onClick={() => (step ? setStep(step - 1) : setModal(null))}>
          {step ? "Back" : "Cancel"}
        </button>
        {step === 1 && !ready && <span className="hidden text-xs text-muted sm:block">Add a project and a skill</span>}
        {step < 2 ? (
          <button className="btn" disabled={step === 1 && !ready} onClick={() => setStep(step + 1)}>Next</button>
        ) : (
          <button
            className="btn btn-blue"
            onClick={() => {
              completeProfile(draft);
              setModal(null);
              showToast("Profile published ✓ You're in the directory now");
            }}
          >
            {onboarded ? "Save profile" : "Publish profile"}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
