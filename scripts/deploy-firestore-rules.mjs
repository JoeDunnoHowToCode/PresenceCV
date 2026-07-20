import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
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

    // Fix private key formatting if needed
    if (serviceAccount.private_key) {
      let pk = serviceAccount.private_key.replace(/\\n/g, '\n').replace(/\r/g, '');
      if (!pk.includes('\n') || pk.split('\n').length < 3) {
        pk = pk
          .replace(/-----BEGIN PRIVATE KEY-----/g, '')
          .replace(/-----END PRIVATE KEY-----/g, '')
          .replace(/\s/g, '');
        let formattedBody = '';
        for (let i = 0; i < pk.length; i += 64) {
          formattedBody += pk.substring(i, i + 64) + '\n';
        }
        serviceAccount.private_key =
          '-----BEGIN PRIVATE KEY-----\n' + formattedBody + '-----END PRIVATE KEY-----\n';
      } else {
        serviceAccount.private_key = pk.trim() + '\n';
      }
    }

    const projectId = serviceAccount.project_id;
    if (!projectId) {
      throw new Error('Could not find project_id in service account JSON');
    }

    console.log(`🚀 Deploying Firestore rules to project: ${projectId}...`);

    // Initialize Firebase Admin (not strictly needed for CLI, but validates creds)
    if (getApps().length === 0) {
      initializeApp({ credential: cert(serviceAccount) });
    }

    // Write rules to a temp file for firebase CLI (rules file is small, safe to write)
    const rulesPath = resolve(__dirname, '..', 'firestore.rules');
    const rulesContent = readFileSync(rulesPath, 'utf8');

    // Use firebase CLI with credentials from env var (no temp key file needed)
    // Firebase CLI supports GOOGLE_APPLICATION_CREDENTIALS pointing to a file,
    // but we can also use `firebase deploy --token` with a CI token.
    // Simplest: use the service account via GOOGLE_APPLICATION_CREDENTIALS
    // by writing a minimal temp file that ONLY the CLI reads (deleted immediately).
    const tempCredsPath = resolve(__dirname, '..', '.firebase-ci-creds.json');
    // Only write the minimal fields needed for CLI auth
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
    // We still write a temp file but it's deleted synchronously after CLI exits
    // This is the standard pattern for firebase-tools CI usage
    require('fs').writeFileSync(tempCredsPath, JSON.stringify(cliCreds));

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
      // Ensure cleanup even on failure
      if (require('fs').existsSync(tempCredsPath)) {
        require('fs').unlinkSync(tempCredsPath);
      }
    }
  } catch (error) {
    console.error('❌ Failed to deploy Firestore rules:', error.message);
    process.exit(1); // Fail the workflow so it's visible
  }
}

deployRules();