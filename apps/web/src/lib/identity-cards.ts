/** How many cards have been issued since the register was last closed. */
export function identityCardTally(count: number): string {
  if (count === 0) {
    return "Aucune carte n'a été délivrée depuis la dernière réunion des maires.";
  }

  if (count === 1) {
    return "Une carte a été délivrée depuis la dernière réunion des maires.";
  }

  return `${count} cartes ont été délivrées depuis la dernière réunion des maires.`;
}
