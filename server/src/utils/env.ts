import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: process.env.DOTENV_PATH || path.resolve(process.cwd(), '.env') });