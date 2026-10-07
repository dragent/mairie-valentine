import { JOB_LABELS, type GuildMember, type Job } from "@/lib/api";

export const CITIZEN_VALUE = "citoyen";

const MAYOR_JOBS: Job[] = ["secretaire", "adjoint"];

export const OFFICES: { job: Job | null; title: string; empty: string }[] = [
  { job: "maire", title: "Maire", empty: "La place de maire est vacante." },
  { job: "adjoint", title: "Maires adjoints", empty: "Aucun adjoint n'a encore été nommé." },
  { job: "secretaire", title: "Secrétaires", empty: "Aucun secrétaire n'est en poste." },
  { job: null, title: "Citoyens", empty: "Aucun autre habitant à nommer." },
];

export function memberName(member: Pick<GuildMember, "displayName" | "username">): string {
  return member.displayName ?? member.username;
}

export function canDismiss(member: GuildMember, viewerDiscordId: string | undefined, isMayor: boolean): boolean {
  if (member.discordId === viewerDiscordId) {
    return false;
  }

  if (member.job === "secretaire") {
    return true;
  }

  return isMayor && member.job === "adjoint";
}

export function isRowLocked(member: GuildMember, viewerDiscordId: string | undefined, isMayor: boolean): boolean {
  if (member.discordId === viewerDiscordId) {
    return true;
  }

  if (member.job === "maire") {
    return true;
  }

  return !isMayor && member.job === "adjoint";
}

export function officeChoices(
  member: GuildMember,
  viewerDiscordId: string | undefined,
  isMayor: boolean,
): { value: string; label: string }[] {
  if (isRowLocked(member, viewerDiscordId, isMayor)) {
    return [];
  }

  const alternatives = (isMayor ? MAYOR_JOBS : (["secretaire"] as Job[])).filter((job) => job !== member.job);

  if (member.job !== null && alternatives.length === 0) {
    return [];
  }

  const current =
    member.job === null
      ? [{ value: CITIZEN_VALUE, label: "Citoyen" }]
      : [{ value: member.job, label: JOB_LABELS[member.job] }];

  return [...current, ...alternatives.map((job) => ({ value: job, label: JOB_LABELS[job] }))];
}

export function filterMembers(members: GuildMember[], query: string): GuildMember[] {
  const needle = query.trim().toLowerCase();

  if (needle === "") {
    return members;
  }

  return members.filter((member) => `${memberName(member)} ${member.username}`.toLowerCase().includes(needle));
}

export function showMemberSearch(count: number): boolean {
  return count > 6;
}

export function staffLead(isMayor: boolean, registryOnly: boolean): string {
  if (registryOnly) {
    return isMayor
      ? "Parmi les citoyens déjà connus de la mairie, le maire nomme les adjoints et les secrétaires, les relève de leur charge sur-le-champ, ou cède sa place."
      : "Parmi les citoyens déjà connus de la mairie, le maire adjoint engage les secrétaires et peut les relever de leur charge sur-le-champ, sans qu'ils aient à accepter.";
  }

  return isMayor
    ? "Le maire de Valentine compose son administration : il nomme les adjoints et les secrétaires, les relève de leur charge sur-le-champ, ou cède sa place."
    : "Le maire adjoint engage les secrétaires de la mairie et peut les relever de leur charge sur-le-champ, sans qu'ils aient à accepter.";
}

export function cessionWarning(name: string, viewerHoldsTheSeat: boolean): string {
  return viewerHoldsTheSeat
    ? `Céder la place de maire à ${name} ? Vous redeviendrez citoyen.`
    : `Nommer ${name} maire ? La personne qui occupe actuellement la place la perd.`;
}

export function cessionHint(viewerHoldsTheSeat: boolean): string {
  return viewerHoldsTheSeat
    ? "La personne choisie reçoit la charge de maire. Vous retombez citoyen."
    : "La personne choisie reçoit la charge de maire. Celle qui l'occupe la perd.";
}

export function withLastVisits<T extends { discordId: string }>(
  members: T[],
  visits: { discordId: string; lastLoginAt?: string | null }[],
): (T & { lastLoginAt: string | null })[] {
  const byId = new Map(visits.map((visit) => [visit.discordId, visit.lastLoginAt ?? null]));

  return members.map((member) => ({
    ...member,
    lastLoginAt: byId.get(member.discordId) ?? null,
  }));
}

export function lastVisitText(iso: string | null, format: (value: string) => string): string {
  if (iso === null || iso === "") {
    return "N'a pas encore ouvert le portail";
  }

  return `Dernière visite : ${format(iso)}`;
}
