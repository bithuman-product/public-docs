// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  site: 'https://docs.bithuman.ai',
  integrations: [
    starlight({
      title: 'bitHuman',
      description: 'Real-time avatar + voice platform. SDKs, REST API, integration guides.',
      logo: {
        light: './src/assets/bitHuman_light.webp',
        dark: './src/assets/bitHuman_dark.webp',
        replacesTitle: true,
      },
      favicon: '/favicon.png',
      customCss: ['./src/styles/custom.css'],
      social: [
        { icon: 'github',  label: 'GitHub',  href: 'https://github.com/bithuman-product/bithuman-sdk-public' },
        { icon: 'discord', label: 'Discord', href: 'https://discord.gg/ES953n7bPA' },
      ],
      sidebar: [
        {
          label: 'Get started',
          items: [
            { label: 'Introduction',    slug: 'introduction' },
            { label: 'Quickstart',      slug: 'getting-started/quickstart' },
            { label: 'Models',          slug: 'getting-started/models' },
            { label: 'Authentication',  slug: 'getting-started/authentication' },
            { label: 'Pricing',         slug: 'getting-started/pricing' },
          ],
        },
        { label: 'Guides',       items: [{ autogenerate: { directory: 'guides' } }] },
        { label: 'SDKs',         items: [{ autogenerate: { directory: 'sdks' } }] },
        { label: 'Examples',     items: [{ autogenerate: { directory: 'examples' } }] },
        { label: 'Integrations', items: [{ autogenerate: { directory: 'integrations' } }] },
        {
          label: 'API Reference',
          items: [
            { label: 'Overview', link: '/api/reference/' },
          ],
        },
        { label: 'Community',    items: [{ autogenerate: { directory: 'community' } }] },
        {
          label: 'Release notes',
          items: [
            { label: 'Changelog', slug: 'changelog' },
            { label: 'Roadmap',   slug: 'roadmap' },
          ],
        },
      ],
    }),
  ],
});
