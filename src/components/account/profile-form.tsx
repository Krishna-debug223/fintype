"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

interface ProfileFormState {
  username: string;
  displayName: string;
  bio: string;
  isPublic: boolean;
  showOnLeaderboards: boolean;
}

const emptyProfile: ProfileFormState = {
  username: "",
  displayName: "",
  bio: "",
  isPublic: true,
  showOnLeaderboards: true,
};

export function ProfileForm() {
  const [form, setForm] = useState(emptyProfile);
  const [status, setStatus] = useState("Loading profile…");
  useEffect(() => {
    void fetch("/api/profile")
      .then((response) => response.json())
      .then((payload: { profile?: Partial<ProfileFormState> | null }) => {
        if (payload.profile) {
          setForm({
            username: payload.profile.username ?? "",
            displayName: payload.profile.displayName ?? "",
            bio: payload.profile.bio ?? "",
            isPublic: payload.profile.isPublic ?? true,
            showOnLeaderboards: payload.profile.showOnLeaderboards ?? true,
          });
        }
        setStatus("");
      })
      .catch(() => setStatus("Could not load your profile."));
  }, []);
  const update = <K extends keyof ProfileFormState>(
    key: K,
    value: ProfileFormState[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  return (
    <form
      className="mt-5 grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setStatus("Saving…");
        void fetch("/api/profile", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...form,
            displayName: form.displayName || null,
            bio: form.bio || null,
          }),
        })
          .then(async (response) => {
            if (!response.ok) {
              const payload = (await response.json().catch(() => null)) as {
                error?: { message?: string };
              } | null;
              throw new Error(
                payload?.error?.message ?? "Could not save profile.",
              );
            }
            setStatus("Saved");
          })
          .catch((error: unknown) =>
            setStatus(
              error instanceof Error
                ? error.message
                : "Could not save profile.",
            ),
          );
      }}
    >
      <label className="text-sm text-muted">
        Username
        <input
          className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
          maxLength={20}
          minLength={3}
          onChange={(event) => update("username", event.target.value)}
          pattern="[a-zA-Z0-9_]{3,20}"
          required
          value={form.username}
        />
      </label>
      <label className="text-sm text-muted">
        Display name
        <input
          className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
          maxLength={80}
          onChange={(event) => update("displayName", event.target.value)}
          value={form.displayName}
        />
      </label>
      <label className="text-sm text-muted">
        Bio
        <textarea
          className="mt-1 block min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
          maxLength={160}
          onChange={(event) => update("bio", event.target.value)}
          value={form.bio}
        />
      </label>
      <div className="grid gap-2 text-sm text-muted">
        <label className="flex items-center gap-2">
          <input
            checked={form.isPublic}
            onChange={(event) => update("isPublic", event.target.checked)}
            type="checkbox"
          />
          Show my public profile
        </label>
        <label className="flex items-center gap-2">
          <input
            checked={form.showOnLeaderboards}
            onChange={(event) =>
              update("showOnLeaderboards", event.target.checked)
            }
            type="checkbox"
          />
          Include me on leaderboards
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit">Save profile</Button>
        {status ? <span className="text-xs text-muted">{status}</span> : null}
      </div>
    </form>
  );
}
