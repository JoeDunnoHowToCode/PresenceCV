import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deployRules() {
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountRaw) {
    console.log('⏭️  Skipping Firestore rules deployment: FIREBASE_SERVICE_ACCOUNT_KEY is not set.');
    return;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountRaw);
    if (serviceAccount.private_key) {
      let pk = serviceAccount.private_key.replace(/\\n/g, '\n').replace(/\r/g, '');
      if (!pk.includes('\n') || pk.split('\n').length < 3) {
        pk = pk.replace(/-----BEGIN PRIVATE KEY-----/g, '').replace(/-----END PRIVATE KEY-----/g, '').replace(/\s/g, '');
        let formattedBody = '';
        for (let i = 0; i < pk.length; i += 64) {
          formattedBody += pk.substring(i, i + 64) + '\n';
        }
        serviceAccount.private_key = '-----BEGIN PRIVATE KEY-----\n' + formattedBody + '-----END PRIVATE KEY-----\n';
      } else {
        serviceAccount.private_key = pk.trim() + '\n';
      }
    }
    
    const projectId = serviceAccount.project_id;
    if (!projectId) {
      throw new Error("Could not find project_id in service account JSON");
    }

    // Write the formatted service account to a temporary file
    const tempKeyPath = path.join(__dirname, '..', '.firebase-deploy-key.json');
    fs.writeFileSync(tempKeyPath, JSON.stringify(serviceAccount, null, 2));

    console.log(`🚀 Deploying Firestore rules to project: ${projectId}...`);
    
    // Set Google Application Credentials so Firebase CLI authenticates as the Service Account
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tempKeyPath;
    
    // Execute Firebase CLI to deploy rules
    execSync(`./node_modules/.bin/firebase deploy --only firestore:rules --project ${projectId} --non-interactive --force`, { 
      stdio: 'inherit',
      env: process.env 
    });

    console.log('✅ Firestore rules deployed successfully!');
    
    // Clean up
    if (fs.existsSync(tempKeyPath)) {
      fs.unlinkSync(tempKeyPath);
    }
    
  } catch (error) {
    console.error('❌ Failed to deploy Firestore rules:', error.message);
    // Don't throw to prevent failing the entire build, just log it.
  }
}

deployRules();
