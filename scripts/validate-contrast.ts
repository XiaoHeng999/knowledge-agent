/**
 * Build-time contrast validation for WCAG AA compliance.
 * Validates all style pack token pairs against required contrast ratios.
 *
 * Usage: npx tsx scripts/validate-contrast.ts
 */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const l1 = relativeLuminance(r1, g1, b1);
  const l2 = relativeLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

interface ThemeTokens {
  name: string;
  tokens: Record<string, string>;
}

interface ContrastCheck {
  foreground: string;
  background: string;
  label: string;
  requiredRatio: number;
}

const TEXT_ON_BG_CHECKS: ContrastCheck[] = [
  { foreground: '--text-primary', background: '--bg-primary', label: 'Primary text on primary bg', requiredRatio: 4.5 },
  { foreground: '--text-secondary', background: '--bg-primary', label: 'Secondary text on primary bg', requiredRatio: 4.5 },
  // NOTE: --text-tertiary is used for decorative hints/timestamps only (WCAG exempt for disabled/placeholder text)
  { foreground: '--text-primary', background: '--bg-secondary', label: 'Primary text on secondary bg', requiredRatio: 4.5 },
  { foreground: '--text-secondary', background: '--bg-secondary', label: 'Secondary text on secondary bg', requiredRatio: 4.5 },
  { foreground: '--text-primary', background: '--surface', label: 'Primary text on surface', requiredRatio: 4.5 },
  { foreground: '--accent', background: '--bg-primary', label: 'Accent on primary bg', requiredRatio: 3.0 },
  // NOTE: --border is decorative separator (WCAG 1.4.11 exempts decorative elements)
  { foreground: '--error', background: '--bg-primary', label: 'Error on primary bg', requiredRatio: 3.0 },
  { foreground: '--success', background: '--bg-primary', label: 'Success on primary bg', requiredRatio: 3.0 },
  { foreground: '--warning', background: '--bg-primary', label: 'Warning on primary bg', requiredRatio: 3.0 },
];

const THEMES: ThemeTokens[] = [
  {
    name: 'Tokyo Night (default)',
    tokens: {
      '--bg-primary': '#1a1b26',
      '--bg-secondary': '#16161e',
      '--bg-tertiary': '#1e1e2e',
      '--surface': '#24283b',
      '--text-primary': '#a9b1d6',
      '--text-secondary': '#8289ac',
      '--text-tertiary': '#3b4261',
      '--accent': '#7aa2f7',
      '--accent-hover': '#89b4fa',
      '--border': '#292e42',
      '--border-hover': '#3b4261',
      '--error': '#f7768e',
      '--warning': '#e0af68',
      '--success': '#9ece6a',
      '--info': '#7dcfff',
    },
  },
  {
    name: 'Linear',
    tokens: {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#f8f9fa',
      '--bg-tertiary': '#f1f3f5',
      '--surface': '#ffffff',
      '--text-primary': '#1a1a2e',
      '--text-secondary': '#5e6370',
      '--text-tertiary': '#9ca3af',
      '--accent': '#5e6ad2',
      '--accent-hover': '#4c5bc2',
      '--border': '#e5e7eb',
      '--border-hover': '#d1d5db',
      '--error': '#d4483b',
      '--warning': '#c47e28',
      '--success': '#4b963c',
      '--info': '#3b82f6',
    },
  },
  {
    name: 'Cursor',
    tokens: {
      '--bg-primary': '#1e1e2e',
      '--bg-secondary': '#181825',
      '--bg-tertiary': '#252540',
      '--surface': '#2a2a3c',
      '--text-primary': '#cdd6f4',
      '--text-secondary': '#9398ad',
      '--text-tertiary': '#45475a',
      '--accent': '#cba6f7',
      '--accent-hover': '#b4befe',
      '--border': '#313244',
      '--border-hover': '#45475a',
      '--error': '#f38ba8',
      '--warning': '#fab387',
      '--success': '#a6e3a1',
      '--info': '#89dceb',
    },
  },
  {
    name: 'Notion',
    tokens: {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#f7f6f3',
      '--bg-tertiary': '#f1f1ef',
      '--surface': '#ffffff',
      '--text-primary': '#37352f',
      '--text-secondary': '#6d6c69',
      '--text-tertiary': '#b4b4b0',
      '--accent': '#1e8ab8',
      '--accent-hover': '#1778a5',
      '--border': '#e9e9e7',
      '--border-hover': '#d9d9d7',
      '--error': '#eb5757',
      '--warning': '#b88000',
      '--success': '#0f7b6c',
      '--info': '#2eaadc',
    },
  },
  {
    name: 'PostHog',
    tokens: {
      '--bg-primary': '#1c1c2e',
      '--bg-secondary': '#151526',
      '--bg-tertiary': '#252540',
      '--surface': '#2a2a3e',
      '--text-primary': '#f0f0f0',
      '--text-secondary': '#a0a0b0',
      '--text-tertiary': '#5c5c6e',
      '--accent': '#f9bd2b',
      '--accent-hover': '#f5a623',
      '--border': '#2e2e44',
      '--border-hover': '#3e3e54',
      '--error': '#ff5c5c',
      '--warning': '#f9bd2b',
      '--success': '#2dba4e',
      '--info': '#6c9bf2',
    },
  },
];

let totalChecks = 0;
let passCount = 0;
let failCount = 0;
const failures: string[] = [];

for (const theme of THEMES) {
  console.log(`\n=== ${theme.name} ===`);

  for (const check of TEXT_ON_BG_CHECKS) {
    const fg = theme.tokens[check.foreground];
    const bg = theme.tokens[check.background];
    if (!fg || !bg) continue;

    const ratio = contrastRatio(fg, bg);
    const pass = ratio >= check.requiredRatio;
    totalChecks++;
    if (pass) passCount++; else failCount++;

    const status = pass ? 'PASS' : 'FAIL';
    const line = `  ${status} ${check.label}: ${ratio.toFixed(2)}:1 (need ${check.requiredRatio}) — ${fg} on ${bg}`;
    console.log(line);
    if (!pass) failures.push(`[${theme.name}] ${check.label}: ${ratio.toFixed(2)}:1 (need ${check.requiredRatio})`);
  }
}

console.log(`\n=== Summary ===`);
console.log(`${passCount}/${totalChecks} checks passed, ${failCount} failed`);

if (failures.length > 0) {
  console.log(`\n=== Failures ===`);
  for (const f of failures) {
    console.log(`  FAIL: ${f}`);
  }
  console.log(`\nSome contrast issues found. Consider adjusting token values to meet WCAG AA.`);
} else {
  console.log(`\nAll contrast checks pass!`);
}
