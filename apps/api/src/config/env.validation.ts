const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'COOKIE_SECRET',
  'ENCRYPTION_KEY',
  'PASSWORD_PEPPER',
  'FRONTEND_URL',
  'ADMIN_URL',
] as const;

function isNonEmpty(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasMinLength(value: string | undefined, length: number) {
  return isNonEmpty(value) && value.length >= length;
}

function isUrl(value: string | undefined) {
  if (!isNonEmpty(value)) {
    return false;
  }

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function validateEnv(config: Record<string, unknown>) {
  const env = config as Record<string, string | undefined>;
  const errors: string[] = [];

  REQUIRED_ENV_VARS.forEach((key) => {
    if (!isNonEmpty(env[key])) {
      errors.push(`${key} is required`);
    }
  });

  if (env.NODE_ENV && !['development', 'test', 'production'].includes(env.NODE_ENV)) {
    errors.push('NODE_ENV must be one of development, test, or production');
  }

  if (!hasMinLength(env.JWT_SECRET, 32)) {
    errors.push('JWT_SECRET must be at least 32 characters');
  }

  if (!hasMinLength(env.JWT_REFRESH_SECRET, 32)) {
    errors.push('JWT_REFRESH_SECRET must be at least 32 characters');
  }

  if (!hasMinLength(env.COOKIE_SECRET, 32)) {
    errors.push('COOKIE_SECRET must be at least 32 characters');
  }

  if (!hasMinLength(env.PASSWORD_PEPPER, 32)) {
    errors.push('PASSWORD_PEPPER must be at least 32 characters');
  }

  if (isNonEmpty(env.ENCRYPTION_KEY) && env.ENCRYPTION_KEY.length !== 32) {
    errors.push('ENCRYPTION_KEY must be exactly 32 characters');
  }

  if (!isUrl(env.FRONTEND_URL)) {
    errors.push('FRONTEND_URL must be a valid URL');
  }

  if (!isUrl(env.ADMIN_URL)) {
    errors.push('ADMIN_URL must be a valid URL');
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n- ${errors.join('\n- ')}`);
  }

  return config;
}
