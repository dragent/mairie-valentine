"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { RequireRole } from "@/components/require-role";
import {
  ErrorBanner,
  ResourceTable,
  Select,
  WorkspaceHeading,
} from "@/components/resource-table";
import {
  JOB_LABELS,
  ROLE_MAIRE,
  assignJob,
  fetchStaff,
  type Job,
  type StaffMember,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime } from "@/lib/dates";
import { describe } from "@/lib/use-resource";

const NO_JOB = "citoyen";

export default function StaffPage() {
  const { token, user } = useAuth();
  const [members, setMembers] = useState<StaffMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (token === null) {
      return;
    }

    let cancelled = false;

    fetchStaff(token)
      .then((loaded) => {
        if (!cancelled) {
          setMembers(loaded);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(describe(cause));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, revision]);

  async function promote(member: StaffMember, value: string) {
    if (token === null) {
      return;
    }

    setIsBusy(true);

    try {
      await assignJob(token, member.id, value === NO_JOB ? null : (value as Job));
      setError(null);
      setRevision((previous) => previous + 1);
    } catch (cause: unknown) {
      setError(describe(cause));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <RequireRole role={ROLE_MAIRE}>
      <div className="space-y-8">
        <WorkspaceHeading
          title="Personnel"
          lead="Attribution des fonctions. Le rôle Discord correspondant est accordé et l'ancien retiré ; si Discord refuse, rien n'est modifié."
        />

        <ErrorBanner message={error} />

        <ResourceTable
          headers={["Compte", "Identifiant Discord", "Dernière connexion", "Fonction"]}
          isLoading={members === null}
          isEmpty={members?.length === 0}
          emptyLabel="Aucun compte enregistré."
        >
          {members?.map((member) => (
            <tr key={member.id}>
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
                  {member.displayName ?? member.username}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted">{member.discordId}</td>
              <td className="px-4 py-3 whitespace-nowrap text-muted">
                {formatDateTime(member.lastLoginAt)}
              </td>
              <td className="px-4 py-3">
                {member.id === user?.id ? (
                  <span className="text-muted">{member.jobLabel ?? "Citoyen"} (vous)</span>
                ) : (
                  <Select
                    value={member.job ?? NO_JOB}
                    disabled={isBusy}
                    aria-label={`Fonction de ${member.displayName ?? member.username}`}
                    onChange={(event) => void promote(member, event.target.value)}
                  >
                    <option value={NO_JOB}>Citoyen</option>
                    {Object.entries(JOB_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                )}
              </td>
            </tr>
          ))}
        </ResourceTable>
      </div>
    </RequireRole>
  );
}
