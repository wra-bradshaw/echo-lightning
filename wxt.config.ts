import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  imports: false,
  modules: ['@wxt-dev/module-react'],
  manifest: {
    action: { default_title: 'Enable Echo360 Lightning' },
    permissions: ['declarativeNetRequestWithHostAccess', 'scripting', 'storage', 'tabs'],
    host_permissions: ['*://*.echo360.net.au/*'],
    web_accessible_resources: [
      { resources: ['history-bridge.js', 'api-bridge.js', 'player-runtime.js'], matches: ['*://*.echo360.net.au/*'] },
    ],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
