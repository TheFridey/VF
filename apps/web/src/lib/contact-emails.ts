export const CONTACT_EMAILS = {
  hello: 'hello@veteranfinder.co.uk',
  support: 'support@veteranfinder.co.uk',
  privacy: 'privacy@veteranfinder.co.uk',
  dpo: 'privacy@veteranfinder.co.uk',
  safety: 'support@veteranfinder.co.uk',
  legal: 'privacy@veteranfinder.co.uk',
  partnerships: 'partnerships@veteranfinder.co.uk',
} as const;

export function toMailto(email: string) {
  return `mailto:${email}`;
}
