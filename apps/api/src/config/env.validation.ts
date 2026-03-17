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

const OPTIONAL_URL_ENV_VARS = ['APP_URL'] as const;

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

  if (
    isNonEmpty(env.ENCRYPTION_KEY_FALLBACKS) &&
    env.ENCRYPTION_KEY_FALLBACKS.split(',').some((key) => key.trim().length !== 32)
  ) {
    errors.push('Each ENCRYPTION_KEY_FALLBACKS entry must be exactly 32 characters');
  }

  if (!isUrl(env.FRONTEND_URL)) {
    errors.push('FRONTEND_URL must be a valid URL');
  }

  if (!isUrl(env.ADMIN_URL)) {
    errors.push('ADMIN_URL must be a valid URL');
  }

  OPTIONAL_URL_ENV_VARS.forEach((key) => {
    if (isNonEmpty(env[key]) && !isUrl(env[key])) {
      errors.push(`${key} must be a valid URL`);
    }
  });

  const hasCloudinaryConfig = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
    .some((key) => isNonEmpty(env[key]));
  if (
    hasCloudinaryConfig &&
    !['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].every((key) => isNonEmpty(env[key]))
  ) {
    errors.push('Cloudinary configuration requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET together');
  }

  const hasStripeConfig = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'].some((key) => isNonEmpty(env[key]));
  if (hasStripeConfig) {
    ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'].forEach((key) => {
      if (!isNonEmpty(env[key])) {
        errors.push(`${key} is required when Stripe is enabled`);
      }
    });

    [
      'STRIPE_PRICE_BIA_BASIC_MONTHLY',
      'STRIPE_PRICE_BIA_BASIC_ANNUAL',
      'STRIPE_PRICE_BIA_PLUS_MONTHLY',
      'STRIPE_PRICE_BIA_PLUS_ANNUAL',
    ].forEach((key) => {
      if (!isNonEmpty(env[key])) {
        errors.push(`${key} is required when Stripe is enabled`);
      }
    });
  }

  if (isNonEmpty(env.RESEND_API_KEY)) {
    if (!isNonEmpty(env.FROM_EMAIL)) {
      errors.push('FROM_EMAIL is required when RESEND_API_KEY is set');
    }
    if (!isNonEmpty(env.APP_URL)) {
      errors.push('APP_URL is required when RESEND_API_KEY is set');
    }
    if (!isNonEmpty(env.PARTNERSHIPS_EMAIL_TO)) {
      errors.push('PARTNERSHIPS_EMAIL_TO is required when RESEND_API_KEY is set');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n- ${errors.join('\n- ')}`);
  }

  return config;
}
