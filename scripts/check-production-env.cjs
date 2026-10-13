const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd(), false);
const problems = [];
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === 'huevivu_dev_secret_do_not_use_in_prod') problems.push('JWT_SECRET needs a private value of at least 32 characters');
if (process.env.ALLOW_LEGACY_DEMO_LOGIN === '1') problems.push('Disable ALLOW_LEGACY_DEMO_LOGIN before deployment');
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') problems.push('TLS verification must be enabled');
if (problems.length) { problems.forEach(problem => console.error('FAIL ' + problem)); process.exitCode = 1; }
else console.log('PASS production environment basics; no secret values printed. HTTPS, storage, access controls and monitoring still require VPS verification.');
