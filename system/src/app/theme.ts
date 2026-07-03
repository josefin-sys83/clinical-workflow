// Semantic color system — single source of truth for the whole app.
// Use these constants instead of raw Tailwind color classes.

export const theme = {
  // Active project / primary status badge
  status: {
    active:   'bg-blue-50 text-blue-700',
    neutral:  'bg-gray-100 text-gray-700',
    warning:  'bg-amber-50 text-amber-700',
    error:    'bg-rose-50 text-rose-800',
    notice:   'bg-orange-50 text-orange-800',
    ai:       'bg-purple-50 text-purple-700',
  },

  // Buttons
  button: {
    primary:   'bg-indigo-600 hover:bg-indigo-700 text-white',
    secondary: 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300',
    ghost:     'text-gray-600 hover:text-gray-900',
  },

  // Inline text colours (for use without a background)
  text: {
    active:   'text-blue-700',
    neutral:  'text-gray-700',
    muted:    'text-gray-500',
    warning:  'text-amber-700',
    error:    'text-rose-800',
    notice:   'text-orange-800',
    ai:       'text-purple-700',
  },

  // Border-only variants
  border: {
    active:  'border-blue-200',
    warning: 'border-amber-200',
    error:   'border-rose-200',
    notice:  'border-orange-200',
    ai:      'border-purple-200',
  },
} as const;

// Badge helper — returns full class string for a named semantic badge
export type BadgeVariant = keyof typeof theme.status;
export function badgeClasses(variant: BadgeVariant): string {
  return `${theme.status[variant]} text-xs font-medium px-2 py-0.5 rounded`;
}
