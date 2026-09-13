// The first/team path is the canonical source; consumers ship self-contained copies.
export const contractFiles = [
  {
    label: 'write input adapter',
    team: 'team-standards/plugins/team-standards/hooks/change-input.js',
    profile: 'project-coding-profiles/plugins/project-coding-profiles/hooks/change-input.js',
  },
  {
    label: 'Golden Fixtures',
    team: 'team-standards/plugins/team-standards/hooks/tests/fixtures/write-events.v1.json',
    profile: 'project-coding-profiles/plugins/project-coding-profiles/hooks/tests/fixtures/write-events.v1.json',
  },
  {
    label: 'contract integrity metadata',
    team: 'team-standards/plugins/team-standards/hooks/tests/fixtures/contract-integrity.json',
    profile: 'project-coding-profiles/plugins/project-coding-profiles/hooks/tests/fixtures/contract-integrity.json',
  },
  {
    label: 'privacy-safe hook metrics helper',
    team: 'team-standards/plugins/team-standards/hooks/hook-metrics.js',
    profile: 'project-coding-profiles/plugins/project-coding-profiles/hooks/hook-metrics.js',
  },
  {
    label: 'Hook Event v1 writer',
    team: 'team-standards/plugins/team-standards/hooks/event-log.js',
    profile: 'project-coding-profiles/plugins/project-coding-profiles/hooks/event-log.js',
  },
];

export const multiRepositoryContracts = [
  {
    label: 'plugin stale-version reminder',
    files: [
      'team-standards/plugins/team-standards/hooks/check-plugin-version-stale.js',
      'project-coding-profiles/plugins/project-coding-profiles/hooks/check-plugin-version-stale.js',
      'yoooni-daily-plugin/plugins/yoooni-daily-plugin/hooks/check-plugin-version-stale.js',
    ],
  },
  {
    label: 'Hook Event v1 schema',
    files: [
      'team-standards/plugins/team-standards/hooks/contracts/hook-event.v1.schema.json',
      'project-coding-profiles/plugins/project-coding-profiles/hooks/contracts/hook-event.v1.schema.json',
      'yoooni-daily-plugin/plugins/yoooni-daily-plugin/skills/yoooni-hook-report/contracts/hook-event.v1.schema.json',
    ],
  },
];
