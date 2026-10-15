/**
 * Maps the stable error keys produced by `src/services/auth.ts`
 * (`classifyAuthError`) to the translation keys rendered by the auth screens.
 *
 * Keeping this in the UI layer means the service stays free of translation
 * concerns while the pages can show a friendly, localised message.
 */
const AUTH_ERROR_KEYS: Record<string, string> = {
  'invalid-credentials': 'auth.errorInvalidCredentials',
  'email-in-use': 'auth.errorEmailInUse',
  'weak-password': 'auth.errorWeakPassword',
  'rate-limit': 'auth.errorRateLimit',
  'email-unconfirmed': 'auth.errorEmailUnconfirmed',
  'same-password': 'auth.errorSamePassword',
  'link-expired': 'auth.errorLinkExpired',
  network: 'auth.errorNetwork',
  'no-backend': 'auth.errorNetwork',
}

/** Returns the translation key for a service error key (falls back to generic). */
export function authErrorMessageKey(error: string): string {
  if (!error) return ''
  return AUTH_ERROR_KEYS[error] ?? 'auth.errorGeneric'
}
