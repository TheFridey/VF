export const CONTACT_EMAILS = {
  hello: 'hello@veteranfinder.co.uk',
  support: 'support@veteranfinder.co.uk',
  privacy: 'privacy@veteranfinder.co.uk',
  dpo: 'dpo@veteranfinder.co.uk',
  safety: 'safety@veteranfinder.co.uk',
  legal: 'legal@veteranfinder.co.uk',
  partnerships: 'partnerships@veteranfinder.co.uk',
} as const;

export function toMailto(email: string) {
  return `mailto:${email}`;
}
