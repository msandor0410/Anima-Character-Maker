import { BeforeAll, AfterAll, Before, After } from "@cucumber/cucumber";
import { chromium } from "playwright";
import admin from "firebase-admin";

process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
process.env.FIREBASE_PROJECT_ID ||= "demo-anima";

let browser;

function initAdmin() {
    if (admin.apps.length) return admin.app();
    return admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
}

async function getUidByEmail(email) {
    initAdmin();
    const u = await admin.auth().getUserByEmail(email);
    return u.uid;
}

async function clearCharacters(uid) {
    initAdmin();
    const db = admin.firestore();
    const col = db.collection("users").doc(uid).collection("characters");
    const snap = await col.get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
}

BeforeAll(async () => {
    browser = await chromium.launch({ headless: true });
});

AfterAll(async () => {
    await browser?.close();
});

Before(async function () {
    this.context = await browser.newContext();
    this.page = await this.context.newPage();

    const uid = await getUidByEmail(this.email);
    await clearCharacters(uid);
});

After(async function () {
    await this.context?.close();
});
