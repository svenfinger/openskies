import {
  SITE_ADDRESS_LINE_1,
  SITE_ADDRESS_LINE_2,
  SITE_ADDRESS_LINE_3,
  SITE_OPERATOR_EMAIL,
  SITE_OPERATOR_NAME,
} from 'astro:env/server';

/** Operator details for imprint / legal pages (from build-time env, not in git). */
export const siteOperator = {
  name: SITE_OPERATOR_NAME,
  email: SITE_OPERATOR_EMAIL,
  addressLines: [
    SITE_ADDRESS_LINE_1,
    SITE_ADDRESS_LINE_2,
    SITE_ADDRESS_LINE_3,
  ],
} as const;

export const siteUrl = 'https://openskies.photos';
