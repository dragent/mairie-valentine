"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";

import { RequireRole } from "@/components/require-role";
import {
  ErrorBanner,
  Field,
  ResourceForm,
  ResourceTable,
  Select,
  WorkspaceHeading,
} from "@/components/resource-table";
import {
  ApiError,
  JOB_LABELS,
  ROLE_ELU,
  ROLE_MAIRE,
  fetchGuildMembers,
  fetchStaff,
  promoteMember,
  type GuildMember,
  type Job,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { describe } from "@/lib/use-resource";

const NO_JOB = "citoyen";
const MAYOR_JOBS: Job[] = ["secretaire", "adjoint"];

function memberName(member: GuildMember): string {
  return member.displayName ?? member.username;
}

export default function StaffPage() {
  const { token, user, reload, hasRole } = useAuth();
  const isMayor = hasRole(ROLE_MAIRE);
  const assignableJobs: Job[] = isMayor ? MAYOR_JOBS : ["secretaire"];
  const [members, setMembers] = useState<GuildMember[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [successorId, setSuccessorId] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (token === null) {
      return;
    }

    let cancelled = false;

    fetchGuildMembers(token)
      .then((loaded) => {
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
          fetchStaff(token)
            .then((staff) => {
              if (!cancelled) {
                setMembers(
                  staff.map((member) => ({
                    discordId: member.discordId,
                    username: member.username,
                    displayName: member.displayName ?? null,
                    avatarUrl: member.avatarUrl ?? null,
                    job: member.job ?? null,
                    jobLabel: member.jobLabel ?? null,
                  })),
                );
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
    const warning =
      user?.job === "maire"
        ? `Céder la place de maire à ${name} ? Vous redeviendrez citoyen.`
        : `Nommer ${name} maire ? La personne qui occupe actuellement la place la perd.`;

    if (!window.confirm(warning)) {
      return;
    }

    void changeJob(successor.discordId, "maire");
  }

  const candidates = members?.filter((member) => member.discordId !== user?.discordId) ?? [];

  function readOnlyLabel(member: GuildMember): string | null {
    const yourself = member.discordId === user?.discordId ? " (vous)" : "";

    if (member.job === "maire") {
      return `Maire${yourself}`;
    }

    if (!isMayor && member.job === "adjoint") {
      return `Maire adjoint${yourself}`;
    }

    return null;
  }

  return (
    <RequireRole role={ROLE_ELU}>
      <div className="space-y-8">
        <WorkspaceHeading
          title="Personnel"
          lead={
            isMayor
              ? "Nommez les maires adjoints et les secrétaires parmi les membres du Discord, ou cédez votre place. Le rôle Discord est mis à jour ; s'il refuse, rien n'est modifié."
              : "Recrutez les secrétaires parmi les membres du Discord. Le rôle Discord est mis à jour ; s'il refuse, rien n'est modifié."
          }
        />

        {notice && <p className="text-sm text-muted">{notice}</p>}

        <ErrorBanner message={error} />

        {members === null && error === null ? (
          <p className="text-muted">Chargement…</p>
        ) : (
        <ResourceTable
          headers={["Compte", "Identifiant Discord", "Fonction"]}
          isLoading={false}
          isEmpty={members === null || members.length === 0}
          emptyLabel="Aucun membre à afficher."
        >
          {members?.map((member) => {
            const label = readOnlyLabel(member);

            return (
            <tr key={member.discordId}>
              <td className="px-4 py-3">
                <span className="flex items-center gap-3">
                  {member.avatarUrl && (
                    <Image
                      src={member.avatarUrl}
                      alt=""
                      width={24}
                      height={24}
                      className="rounded-full border border-line"
                    />
                  )}
                  {memberName(member)}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted">{member.discordId}</td>
              <td className="px-4 py-3">
                {label !== null ? (
                  <span className="text-muted">{label}</span>
                ) : (
                  <Select
                    value={member.job ?? NO_JOB}
                    disabled={isBusy}
                    aria-label={`Fonction de ${memberName(member)}`}
                    onChange={(event) => {
                      const value = event.target.value;
                      void changeJob(member.discordId, value === NO_JOB ? null : (value as Job));
                    }}
                  >
                    <option value={NO_JOB}>Citoyen</option>
                    {assignableJobs.map((value) => (
                      <option key={value} value={value}>
                        {JOB_LABELS[value]}
                      </option>
                    ))}
                  </Select>
                )}
              </td>
            </tr>
            );
          })}
        </ResourceTable>
        )}

        {isMayor && candidates.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              {user?.job === "maire"
                ? "La personne choisie devient l'unique maire. Vous redeviendrez citoyen."
                : "La personne choisie devient l'unique maire. Celle qui occupe la place la perd."}
            </p>
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
