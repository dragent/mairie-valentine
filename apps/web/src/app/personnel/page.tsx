"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";

import { RequireRole } from "@/components/require-role";
import {
  ErrorBanner,
  Field,
  ResourceForm,
  Select,
  WorkspaceHeading,
} from "@/components/resource-table";
import {
  ApiError,
  ROLE_ELU,
  ROLE_MAIRE,
  fetchGuildMembers,
  fetchStaff,
  promoteMember,
  type GuildMember,
  type Job,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  CITIZEN_VALUE,
  OFFICES,
  canDismiss,
  cessionHint,
  cessionWarning,
  filterMembers,
  memberName,
  officeChoices,
  showMemberSearch,
  staffLead,
} from "@/lib/personnel";
import { describe } from "@/lib/use-resource";

export default function StaffPage() {
  const { token, user, reload, hasRole } = useAuth();
  const isMayor = hasRole(ROLE_MAIRE);
  const [members, setMembers] = useState<GuildMember[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [successorId, setSuccessorId] = useState("");
  const [query, setQuery] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (token === null) {
      return;
    }

    let cancelled = false;
    let guildLoaded = false;

    const localStaff = fetchStaff(token).then((staff) =>
      staff.map((member) => ({
        discordId: member.discordId,
        username: member.username,
        displayName: member.displayName ?? null,
        avatarUrl: member.avatarUrl ?? null,
        job: member.job ?? null,
        jobLabel: member.jobLabel ?? null,
      })),
    );

    // The register is already in the database. Show it while Discord answers,
    // instead of waiting for a failure before starting the second request.
    localStaff
      .then((loaded) => {
        if (!cancelled && !guildLoaded) {
          setMembers(loaded);
        }
      })
      .catch(() => {
        // Reported only if the guild list cannot replace it.
      });

    fetchGuildMembers(token)
      .then((loaded) => {
        guildLoaded = true;

        if (!cancelled) {
          setMembers(loaded);
          setNotice(null);
        }
      })
      .catch((cause: unknown) => {
        if (cancelled) {
          return;
        }

        if (cause instanceof ApiError && cause.status === 503) {
          localStaff
            .then((loaded) => {
              if (!cancelled) {
                setMembers(loaded);
                setNotice(cause.message);
              }
            })
            .catch((staffCause: unknown) => {
              if (!cancelled) {
                setError(describe(staffCause));
              }
            });

          return;
        }

        setError(describe(cause));
      });

    return () => {
      cancelled = true;
    };
  }, [token, revision]);

  async function changeJob(discordId: string, job: Job | null) {
    if (token === null) {
      return;
    }

    setIsBusy(true);

    try {
      await promoteMember(token, discordId, job);
      setError(null);
      setRevision((previous) => previous + 1);

      if (job === "maire") {
        await reload();
      }
    } catch (cause: unknown) {
      setError(describe(cause));
    } finally {
      setIsBusy(false);
    }
  }

  function cede(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const successor = members?.find((member) => member.discordId === successorId);

    if (!successor) {
      setError("Choisissez à qui céder la place de maire.");
      return;
    }

    const name = memberName(successor);

    if (!window.confirm(cessionWarning(name, user?.job === "maire"))) {
      return;
    }

    void changeJob(successor.discordId, "maire");
  }

  const candidates = members?.filter((member) => member.discordId !== user?.discordId) ?? [];
  const listed = filterMembers(members ?? [], query);
  const needle = query.trim();

  return (
    <RequireRole role={ROLE_ELU}>
      <div className="space-y-8">
        <WorkspaceHeading
          title="Personnel"
          lead={staffLead(isMayor, notice !== null)}
        />

        {notice && <p className="text-sm text-muted">{notice}</p>}

        <ErrorBanner message={error} />

        {members === null && error === null ? (
          <p className="text-muted">Chargement…</p>
        ) : members === null || members.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface p-6 text-sm text-muted">
            Aucun habitant à afficher.
          </p>
        ) : (
          <div className="space-y-8">
            {showMemberSearch(members.length) && (
              <label className="block space-y-1 text-sm">
                <span className="text-muted">Rechercher un habitant</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full rounded-md border border-line bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent sm:max-w-sm"
                />
              </label>
            )}

            {needle !== "" && listed.length === 0 ? (
              <p className="text-sm text-muted">Aucun habitant ne correspond à cette recherche.</p>
            ) : (
              OFFICES.map((office) => {
                const group = listed.filter((member) => member.job === office.job);

                if (needle !== "" && group.length === 0) {
                  return null;
                }

                return (
                  <section key={office.title} className="space-y-3">
                    <h2 className="font-display text-lg text-heading">
                      {office.title}
                      {group.length > 1 && <span className="ml-2 font-sans text-sm text-muted">{group.length}</span>}
                    </h2>
                    {group.length === 0 ? (
                      <p className="text-sm text-muted">{office.empty}</p>
                    ) : (
                      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
                        {group.map((member) => {
                          const name = memberName(member);
                          const isSelf = member.discordId === user?.discordId;
                          const choices = officeChoices(member, user?.discordId, isMayor);
                          const dismissible = canDismiss(member, user?.discordId, isMayor);

                          return (
                            <li
                              key={member.discordId}
                              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                            >
                              <span className="flex min-w-0 items-center gap-3">
                                {member.avatarUrl ? (
                                  <Image
                                    src={member.avatarUrl}
                                    alt=""
                                    width={32}
                                    height={32}
                                    className="size-8 rounded-full border border-line"
                                  />
                                ) : (
                                  <span className="flex size-8 items-center justify-center rounded-full border border-line text-xs text-muted">
                                    {name.slice(0, 1).toUpperCase()}
                                  </span>
                                )}
                                <span className="min-w-0">
                                  <span className="block truncate">{name}</span>
                                  {member.displayName !== null && member.displayName !== member.username && (
                                    <span className="block truncate text-xs text-muted">{member.username}</span>
                                  )}
                                </span>
                              </span>

                              {isSelf ? (
                                <span className="text-xs uppercase tracking-wide text-muted">Vous</span>
                              ) : choices.length === 0 && !dismissible ? null : (
                                <span className="flex flex-wrap items-center gap-3">
                                  {choices.length > 0 && (
                                    <span className="w-52">
                                      <Select
                                        value={member.job ?? CITIZEN_VALUE}
                                        disabled={isBusy}
                                        aria-label={`Fonction de ${name}`}
                                        onChange={(event) => {
                                          const value = event.target.value;
                                          void changeJob(
                                            member.discordId,
                                            value === CITIZEN_VALUE ? null : (value as Job),
                                          );
                                        }}
                                      >
                                        {choices.map((choice) => (
                                          <option key={choice.value} value={choice.value}>
                                            {choice.label}
                                          </option>
                                        ))}
                                      </Select>
                                    </span>
                                  )}
                                  {dismissible && (
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      aria-label={`Relever ${name} de sa charge`}
                                      className="rounded-md border border-line px-3 py-2 text-sm text-foreground hover:border-accent hover:text-heading disabled:opacity-60"
                                      onClick={() => void changeJob(member.discordId, null)}
                                    >
                                      Relever
                                    </button>
                                  )}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                );
              })
            )}
          </div>
        )}

        {isMayor && candidates.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted">{cessionHint(user?.job === "maire")}</p>
            <ResourceForm legend="Céder la place de maire" submitLabel="Céder la place" isBusy={isBusy} onSubmit={cede}>
              <Field label="Nouveau maire" wide>
                <Select
                  value={successorId}
                  required
                  onChange={(event) => setSuccessorId(event.target.value)}
                >
                  <option value="">Choisir un membre</option>
                  {candidates.map((member) => (
                    <option key={member.discordId} value={member.discordId}>
                      {memberName(member)}
                    </option>
                  ))}
                </Select>
              </Field>
            </ResourceForm>
          </div>
        )}
      </div>
    </RequireRole>
  );
}
