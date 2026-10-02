import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { openDatabase } from './server.ts';

const database = join(import.meta.dirname, '..', '.devex', 'fake-api.sqlite');
rmSync(database, { force: true });
openDatabase(database).close();
console.log(`Fake API database reset and seeded: ${database}`);
