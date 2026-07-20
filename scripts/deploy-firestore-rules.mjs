import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { writeFileSync, existsSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

async function deployRules() {
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountRaw) {
    console.log('⏭️  Skipping Firestore rules deployment: FIREBASE_SERVICE_ACCOUNT_KEY is not set.');
    return;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountRaw);

    // Fix private key: convert literal \n to real newlines
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n').replace(/\r/g, '').trim() + '\n';
    }

    const projectId = serviceAccount.project_id;
    if (!projectId) {
      throw new Error('Could not find project_id in service account JSON');
    }

    console.log(`🚀 Deploying Firestore rules to project: ${projectId}...`);

    if (getApps().length === 0) {
      initializeApp({ credential: cert(serviceAccount) });
    }

    // Write minimal service account to temp file for firebase CLI auth
    const tempCredsPath = resolve(__dirname, '..', '.firebase-ci-creds.json');
    const cliCreds = {
      type: 'service_account',
      project_id: serviceAccount.project_id,
      private_key_id: serviceAccount.private_key_id,
      private_key: serviceAccount.private_key,
      client_email: serviceAccount.client_email,
      client_id: serviceAccount.client_id,
      auth_uri: serviceAccount.auth_uri,
      token_uri: serviceAccount.token_uri,
      auth_provider_x509_cert_url: serviceAccount.auth_provider_x509_cert_url,
      client_x509_cert_url: serviceAccount.client_x509_cert_url,
      universe_domain: serviceAccount.universe_domain || 'googleapis.com',
    };
    writeFileSync(tempCredsPath, JSON.stringify(cliCreds));

    try {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = tempCredsPath;

      execSync(
        `./node_modules/.bin/firebase deploy --only firestore:rules --project ${projectId} --non-interactive --force`,
        {
          stdio: 'inherit',
          env: process.env,
        }
      );

      console.log('✅ Firestore rules deployed successfully!');
    } finally {
      if (existsSync(tempCredsPath)) {
        unlinkSync(tempCredsPath);
      }
    }
  } catch (error) {
    console.error('❌ Failed to deploy Firestore rules:', error.message);
    process.exit(1); // Fail the workflow so it's visible
  }
}

deployRules();