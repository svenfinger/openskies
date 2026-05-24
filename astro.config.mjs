// @ts-check
import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://openskies.photos',
  integrations: [react()],
  env: {
    schema: {
      SITE_OPERATOR_NAME: envField.string({
        context: 'server',
        access: 'secret',
      }),
      SITE_OPERATOR_EMAIL: envField.string({
        context: 'server',
        access: 'secret',
      }),
      SITE_ADDRESS_LINE_1: envField.string({
        context: 'server',
        access: 'secret',
      }),
      SITE_ADDRESS_LINE_2: envField.string({
        context: 'server',
        access: 'secret',
      }),
      SITE_ADDRESS_LINE_3: envField.string({
        context: 'server',
        access: 'secret',
      }),
    },
  },
});
