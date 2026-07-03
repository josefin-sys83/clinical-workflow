import tsParser from '@typescript-eslint/parser';

// Raw Tailwind color classes that must come from theme.ts instead.
// Excludes variant-prefixed forms like hover:bg-blue-50, focus:bg-rose-50, etc.
const BANNED_BG = /(?<![:\w-])bg-(blue|purple|rose|orange|amber|indigo)-\d+\b/;

/** Walk a JS/JSX expression AST node and call check() on every string fragment. */
function walkExpr(expr, check) {
  if (!expr) return;
  switch (expr.type) {
    case 'Literal':
      if (typeof expr.value === 'string') check(expr.value, expr);
      break;
    case 'TemplateLiteral':
      expr.quasis.forEach(q => check(q.value.raw, q));
      break;
    case 'ConditionalExpression':
      walkExpr(expr.consequent, check);
      walkExpr(expr.alternate, check);
      break;
    case 'LogicalExpression':
    case 'BinaryExpression':
      walkExpr(expr.left, check);
      walkExpr(expr.right, check);
      break;
  }
}

const themeColorsPlugin = {
  rules: {
    'no-raw-colors': {
      meta: {
        type: 'suggestion',
        messages: {
          raw: "Use theme.* from @/app/theme instead of '{{match}}'. Raw Tailwind semantic colours are banned.",
        },
      },
      create(context) {
        function check(str, node) {
          const m = str.match(BANNED_BG);
          if (m) context.report({ node, messageId: 'raw', data: { match: m[0] } });
        }

        return {
          // className="..." and className={...}
          'JSXAttribute[name.name="className"]'(node) {
            if (!node.value) return;
            if (node.value.type === 'Literal') {
              check(String(node.value.value), node.value);
            } else if (node.value.type === 'JSXExpressionContainer') {
              walkExpr(node.value.expression, check);
            }
          },
          // String constants in object literals (e.g. ROLE_BADGE, STATUS_COLOURS)
          'Property > Literal'(node) {
            if (typeof node.value === 'string') check(node.value, node);
          },
        };
      },
    },
  },
};

export default [
  {
    files: ['src/**/*.tsx', 'src/**/*.ts'],
    ignores: ['src/**/*.d.ts', 'src/**/ui/**'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'theme-colors': themeColorsPlugin },
    rules: {
      'theme-colors/no-raw-colors': 'warn',
    },
  },
];
