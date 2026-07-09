import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Minhas Finanças',
    short_name: 'Finanças',
    description: 'Controle de finanças pessoais',
    start_url: '/',
    display: 'standalone',
    background_color: '#f3f5f4',
    theme_color: '#217a54',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
