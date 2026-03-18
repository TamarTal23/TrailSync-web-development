import dotEnv from 'dotenv';
dotEnv.config({ path: '.env.test' });
process.env.NODE_ENV = 'test';
