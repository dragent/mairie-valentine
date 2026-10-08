"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";

import { RequireRole } from "@/components/require-role";
import { ErrorBanner, Field, ResourceForm, Select } from "@/components/resource-table";
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
import { formatDateTime } from "@/lib/dates";
import {
  CITIZEN_VALUE,
  OFFICES,
  canDismiss,
  cessionHint,
  cessionWarning,
  filterMembers,
  lastVisitText,
  memberName,
  officeChoices,
  registerRow,
  showMemberSearch,
  staffLead,
  withLastVisits,
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
  const [visits, setVisits] = useState<{ discordId: string; lastLoginAt?: string | null }[]>([]);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (token === null) {
      return;
    }

    let cancelled = false;
    let guildLoaded = false;

    const localStaff = fetchStaff(token).then((staff) => staff.map(registerRow));

    // The register is already in the database. Show it while Discord answers,
    // instead of waiting for a failure before starting the second request.
    localStaff
      .then((loaded) => {
        if (!cancelled) {
          setVisits(loaded.map((member) => ({ discordId: member.discordId, lastLoginAt: member.lastLoginAt })));
        }

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
  const listed = withLastVisits(filterMembers(members ?? [], query), visits);
  const needle = query.trim();
  const signatory = user?.displayName ?? user?.username;
  const signature = user?.jobLabel && signatory ? `${user.jobLabel} — ${signatory}` : signatory;
  const showCession = isMayor && candidates.length > 0;

  return (
    <RequireRole role={ROLE_ELU}>
      <section className="ledger-frame bg-surface px-8 py-8 sm:px-10">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <Image
            src="/sceau-mairie.png"
            alt=""
            width={112}
            height={112}
            className="size-28 shrink-0 object-contain"
          />
          <div className="space-y-3 text-center sm:text-left">
            <p className="text-xs tracking-[0.28em] text-gold-dark uppercase">Greffe municipal</p>
            <h1 className="font-display text-4xl text-heading">Personnel</h1>
            {signature && <p className="text-sm text-accent">{signature}</p>}
          </div>
        </div>

        <p className="mt-8 max-w-2xl text-center leading-relaxed sm:text-left">
          {staffLead(isMayor, notice !== null)}
        </p>

        <Ornament />

        {notice && <p className="mb-6 text-sm text-muted">{notice}</p>}

        <ErrorBanner message={error} />

        {members === null && error === null ? (
          <p className="text-muted">Chargement…</p>
        ) : members === null || members.length === 0 ? (
          <p className="text-sm text-muted">Aucun habitant à afficher.</p>
        ) : (
          <div
            className={
              showCession ? "grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]" : undefined
            }
          >
            <div className="space-y-10">
              {showMemberSearch(members.length) && (
                <label className="block max-w-sm space-y-2 text-sm">
                  <span className="text-xs tracking-wide text-muted">Rechercher un habitant</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="w-full rounded-md border border-line bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
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
                    <section key={office.title}>
                      <h2 className="font-display text-2xl text-heading">
                        {office.title}
                        {group.length > 1 && <span className="ml-2 font-sans text-sm text-muted">{group.length}</span>}
                      </h2>
                      {group.length === 0 ? (
                        <p className="mt-4 text-sm text-muted">{office.empty}</p>
                      ) : (
                        <ul className="mt-2 divide-y divide-line">
                          {group.map((member) => {
                            const name = memberName(member);
                            const isSelf = member.discordId === user?.discordId;
                            const choices = officeChoices(member, user?.discordId, isMayor);
                            const dismissible = canDismiss(member, user?.discordId, isMayor);

                            return (
                              <li
                                key={member.discordId}
                                className="flex flex-wrap items-center justify-between gap-4 py-5"
                              >
                                <span className="flex min-w-0 items-center gap-4">
                                  {member.avatarUrl ? (
                                    <Image
                                      src={member.avatarUrl}
                                      alt=""
                                      width={40}
                                      height={40}
                                      className="size-10 rounded-full border border-gold-dark object-cover"
                                    />
                                  ) : (
                                    <span className="flex size-10 items-center justify-center rounded-full border border-gold-dark font-display text-sm text-heading">
                                      {name.slice(0, 1).toUpperCase()}
                                    </span>
                                  )}
                                  <span className="min-w-0">
                                    <span className="block truncate font-display text-lg text-heading">{name}</span>
                                    <span className="block truncate text-xs text-muted">
                                      {lastVisitText(member.lastLoginAt, formatDateTime)}
                                    </span>
                                  </span>
                                </span>

                                {isSelf ? (
                                  <span className="text-xs tracking-[0.2em] text-gold-dark uppercase">Vous</span>
                                ) : choices.length === 0 && !dismissible ? null : (
                                  <span className="flex flex-wrap items-center gap-4">
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
                                        className="text-sm text-muted underline hover:text-foreground disabled:opacity-60"
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

            {showCession && (
              <aside className="h-full bg-background/35 px-6 py-6 lg:border-l lg:border-line lg:pl-8">
                <p className="text-sm leading-relaxed text-muted">{cessionHint(user?.job === "maire")}</p>
                <ResourceForm
                  className="mt-6 border-t border-line pt-8"
                  legend="Céder la place"
                  submitLabel="Céder la place"
                  isBusy={isBusy}
                  onSubmit={cede}
                >
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
              </aside>
            )}
          </div>
        )}
      </section>
    </RequireRole>
  );
}

function Ornament() {
  return (
    <div className="my-8 flex items-center gap-4" aria-hidden="true">
      <span className="h-px flex-1 bg-gold-dark/70" />
      <span className="size-1.5 rotate-45 bg-gold-dark" />
      <span className="h-px flex-1 bg-gold-dark/70" />
    </div>
  );
}
