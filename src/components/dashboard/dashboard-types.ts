export type DashboardSection = 'overview' | 'decks' | 'settings';

export function sectionFromHash(hash: string): DashboardSection {
  const id = hash.replace(/^#/, '').toLowerCase();
  if (id === 'settings') return 'settings';
  if (id === 'decks') return 'decks';
  return 'overview';
}

export function hashForSection(section: DashboardSection): string {
  if (section === 'overview') return '';
  return `#${section}`;
}
