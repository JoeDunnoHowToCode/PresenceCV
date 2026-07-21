import { writeFileSync, existsSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

function deployRules() {
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountRaw) {
    console.log('⏭️  Skipping Firestore rules deployment: FIREBASE_SERVICE_ACCOUNT_KEY is not set.');
    return;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountRaw);

    if (serviceAccount.private_key) {
      let pk = serviceAccount.private_key
        .replace(/\\n/g, '\n')
        .replace(/\r/g, '');

      // Remove BEGIN/END markers to isolate base64 body
      const beginMark = '-----BEGIN PRIVATE KEY-----';
      const endMark = '-----END PRIVATE KEY-----';
      const beginIdx = pk.indexOf(beginMark);
      const endIdx = pk.indexOf(endMark);
      if (beginIdx !== -1 && endIdx !== -1) {
        const body = pk.substring(beginIdx + beginMark.length, endIdx)
          .replace(/\s/g, ''); // strip all whitespace (newlines, spaces)
        // Re-chunk into 64-char lines
        let formatted = '';
        for (let i = 0; i < body.length; i += 64) {
          formatted += body.substring(i, i + 64) + '\n';
        }
        serviceAccount.private_key = beginMark + '\n' + formatted + endMark + '\n';
      }
    }

    const projectId = serviceAccount.project_id;
    if (!projectId) {
      throw new Error('Could not find project_id in service account JSON');
    }

    console.log(`🚀 Deploying Firestore rules to project: ${projectId}...`);

    const databaseId = process.env.FIREBASE_DATABASE_ID || '(default)';
    const tempCredsPath = resolve(__dirname, '..', '.firebase-ci-creds.json');
    writeFileSync(tempCredsPath, JSON.stringify(serviceAccount));

    try {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = tempCredsPath;

      execSync(
        `./node_modules/.bin/firebase deploy --only firestore:rules --project ${projectId} --database ${databaseId} --non-interactive --force`,
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
    process.exit(1);
  }
}

deployRules();