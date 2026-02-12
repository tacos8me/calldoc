// ─── Auth barrel export ──────────────────────────────────────────────────────
export {
  getSession,
  getSessionFromCookies,
  createSession,
  destroySession,
  isSessionValid,
  touchSession,
  sessionOptions,
  SESSION_MAX_AGE,
  SESSION_IDLE_TIMEOUT,
  COOKIE_NAME,
  type SessionData,
  type CreateSessionInput,
} from './session';

export {
  getSamlStrategy,
  generateMetadata,
  isSamlConfigured,
  type SamlUser,
  type SamlAttributeMap,
  type GroupRoleMapping,
} from './saml';

export {
  getCurrentUser,
  requireAuth,
  requireRole,
  requirePermission,
  createAuthRedirect,
  DEFAULT_PERMISSIONS,
  type CurrentUser,
  type AuthResult,
  type RoleResult,
  type PermissionResult,
} from './middleware';
