import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Plugin } from 'vite';

export const FAKE_API_PATH = '/fake-api';

export function fakeApi(): Plugin {
  return {
    name: 'cage15-fake-api',
    apply: 'serve',
    async configureServer(server) {
      // A computed URL keeps the server out of the bundled Vite config, so no other mode loads it.
      const serverModule = pathToFileURL(join(server.config.root, 'dev-api', 'server.ts')).href;
      const { openDatabase, createFakeApi } = await import(serverModule) as typeof import('./server.ts');
      const db = openDatabase(join(server.config.root, '.devex', 'fake-api.sqlite'));
      server.httpServer?.once('close', () => { db.close() });
      const handle = createFakeApi(db);
      server.middlewares.use(FAKE_API_PATH, (req, res) => {
        void handle(req, res);
      });
    }
  };
}
