// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import { themes } from "prism-react-renderer";

const config: Config = {
  title: 'Knub',
  tagline: 'Modern TypeScript framework for creating Discord bots',
  url: 'https://knub.zeppelin.gg',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  favicon: 'img/favicon.png',

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      ({
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/Dragory/Knub/tree/master/docs/',

          lastVersion: 'current',
          versions: {
            current: {
              label: '31',
              path: '31',
            },
          },
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options),
    ],
  ],

  themeConfig:
    ({
      navbar: {
        title: 'Knub',
        logo: {
          alt: 'My Site Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'doc',
            docId: 'intro',
            position: 'left',
            label: 'Docs',
          },
          {
            href: 'https://github.com/Dragory/Knub',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [],
        copyright: `
          Copyright © 2017–${new Date().getFullYear()} Dragory<br>
          Icons by <a href="https://twemoji.twitter.com/">Twemoji</a>
        `,
      },
      prism: {
        theme: themes.github,
        darkTheme: themes.dracula,
      },
      mermaid: {
        options: {
          flowchart: {
            curve: 'linear',
          },
        },
      },
    } satisfies Preset.ThemeConfig),
};

export default config;
