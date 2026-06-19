/*
 * R210 B11 — ESLint flat config. recommended 전체를 켜지 않고(경고 폭증 방지)
 * 정책-핵심 규칙만 error/warn 로 enforce:
 *   - react-hooks/rules-of-hooks (error) · exhaustive-deps (warn)
 *   - no-use-before-define (error) — TDZ 영구 정책 자동 강제 (feedback_no_use_before_define, R54 회귀)
 *   - dark: 클래스 금지 (error) — 다크모드 영구 금지 정책 자동 강제 (feedback_no_dark_mode)
 * 향후 룰을 점진적으로 승격(typescript-eslint recommended 등).
 */
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      'dist/**', 'node_modules/**', 'client/public/**', 'data/**',
      'scripts/**', 'tests/**', 'server/**', '**/*.config.{js,ts}',
    ],
  },
  {
    files: ['client/src/**/*.{ts,tsx}'],
    extends: [tseslint.configs.base],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { parserOptions: { ecmaVersion: 'latest', sourceType: 'module' } },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-use-before-define': [
        'error',
        { functions: false, variables: true, classes: true, enums: true, typedefs: false, ignoreTypeReferences: true },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: 'Literal[value=/(^|\\s)dark:/]', message: '다크모드 영구 금지 — dark: 클래스 사용 불가 (memory/feedback_no_dark_mode).' },
        { selector: 'TemplateElement[value.raw=/(^|\\s)dark:/]', message: '다크모드 영구 금지 — dark: 클래스 사용 불가 (memory/feedback_no_dark_mode).' },
      ],
    },
  },
  {
    /* shadcn/ui 벤더 primitive 는 기본 dark: variant 를 포함하나 ThemeProvider 부재로 비활성(inert).
       정책은 '앱 코드에 새 dark: 추가 금지' — 벤더 primitive 는 dark: 룰에서 제외. */
    files: ['client/src/components/ui/**/*.{ts,tsx}'],
    rules: { 'no-restricted-syntax': 'off', '@typescript-eslint/no-use-before-define': 'off' },
  },
);
