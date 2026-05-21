import admin from "firebase-admin";

process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
process.env.FIREBASE_PROJECT_ID ||= "demo-anima";

const TEST_EMAIL = process.env.E2E_EMAIL || "e2e@example.com";
const TEST_PASSWORD = process.env.E2E_PASSWORD || "Password123!";

function initAdmin() {
    if (admin.apps.length) return admin.app();
    return admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
}

async function ensureUser(auth) {
    try {
        const u = await auth.getUserByEmail(TEST_EMAIL);
        return u;
    } catch {
        return await auth.createUser({
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
            emailVerified: true
        });
    }
}

async function deleteAllCharacters(db, uid) {
    const col = db.collection("users").doc(uid).collection("characters");
    const snap = await col.get();
    if (snap.empty) return;

    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
}

async function main() {
    initAdmin();
    const auth = admin.auth();
    const db = admin.firestore();

    const user = await ensureUser(auth);
    await deleteAllCharacters(db, user.uid);

    console.log(` E2E seed OK: ${TEST_EMAIL} (uid=${user.uid}), characters cleared`);
}

main().catch((e) => {
    console.error(" E2E seed failed:", e);
    process.exit(1);
});
