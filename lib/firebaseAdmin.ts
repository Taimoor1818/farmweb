import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

const db = admin.firestore();

export { db };
