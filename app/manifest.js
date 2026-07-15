export default function manifest() {
  return {
    name: 'Gokulam360',
    short_name: 'Gokulam360',
    description: 'Sunday school management for spiritual education',
    start_url: '/',
    display: 'standalone',
    background_color: '#fff7ed',
    theme_color: '#ea580c',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
    ],
  };
}
