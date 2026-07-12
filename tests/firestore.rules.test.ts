import { initializeTestEnvironment, assertFails, assertSucceeds, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

// SKIPPED: Requires Firebase Emulator (Java JRE). Run via GitHub Actions CI.
describe.skip('Firestore Security Rules', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'demo-presencecv',
      firestore: {
        rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  describe('sharedResumes', () => {
    it('allows creation if authenticated and payload is strictly valid', async () => {
      const db = testEnv.authenticatedContext('user_123').firestore();
      await assertSucceeds(setDoc(doc(db, 'sharedResumes/resume_1'), {
        profile: {},
        blocks: {},
        blockOrder: [],
        createdAt: 1234567890,
        themeColor: '#fff',
        enableAnimation: true
      }));
    });

    it('denies creation if payload has extra invalid keys', async () => {
      const db = testEnv.authenticatedContext('user_123').firestore();
      await assertFails(setDoc(doc(db, 'sharedResumes/resume_2'), {
        profile: {},
        blocks: {},
        blockOrder: [],
        createdAt: 1234567890,
        themeColor: '#fff',
        enableAnimation: true,
        maliciousKey: 'hacked'
      }));
    });

    it('denies creation if unauthenticated', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(setDoc(doc(db, 'sharedResumes/resume_3'), {
        profile: {},
        blocks: {},
        blockOrder: [],
        createdAt: 1234567890
      }));
    });
  });

  describe('liveResumes', () => {
    it('allows creation if authenticated and ownerUid matches', async () => {
      const db = testEnv.authenticatedContext('user_123').firestore();
      await assertSucceeds(setDoc(doc(db, 'liveResumes/resume_1'), {
        profile: {},
        blocks: {},
        blockOrder: [],
        ownerUid: 'user_123'
      }));
    });

    it('denies creation if spoofing ownerUid', async () => {
      const db = testEnv.authenticatedContext('user_123').firestore();
      await assertFails(setDoc(doc(db, 'liveResumes/resume_2'), {
        profile: {},
        blocks: {},
        blockOrder: [],
        ownerUid: 'hacker_999'
      }));
    });

    it('allows update if ownerUid matches auth.uid', async () => {
      // Setup
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'liveResumes/resume_3'), {
          ownerUid: 'user_123',
          profile: { name: 'Old' }
        });
      });

      const db = testEnv.authenticatedContext('user_123').firestore();
      await assertSucceeds(updateDoc(doc(db, 'liveResumes/resume_3'), {
        profile: { name: 'New' }
      }));
    });

    it('denies update if modifying ownerUid', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'liveResumes/resume_4'), {
          ownerUid: 'user_123'
        });
      });

      const db = testEnv.authenticatedContext('user_123').firestore();
      await assertFails(updateDoc(doc(db, 'liveResumes/resume_4'), {
        ownerUid: 'user_1234'
      }));
    });

    it('denies liveResumes creation when required fields are missing (hasAll guard)', async () => {
      const db = testEnv.authenticatedContext('user_123').firestore();

      // Missing `blocks` and `blockOrder` — hasAll(['profile','blocks','blockOrder']) must reject
      await assertFails(setDoc(doc(db, 'liveResumes/resume_5'), {
        profile: {},
        ownerUid: 'user_123'
      }));

      // Missing only `blockOrder` — still must reject
      await assertFails(setDoc(doc(db, 'liveResumes/resume_6'), {
        profile: {},
        blocks: {},
        ownerUid: 'user_123'
      }));

      // Missing only `profile` — still must reject
      await assertFails(setDoc(doc(db, 'liveResumes/resume_7'), {
        blocks: {},
        blockOrder: [],
        ownerUid: 'user_123'
      }));
    });
  });
});
