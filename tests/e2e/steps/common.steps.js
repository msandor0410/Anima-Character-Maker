import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "playwright/test";
import admin from "firebase-admin";

process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
process.env.FIREBASE_PROJECT_ID ||= "demo-anima";

function initAdmin() {
    if (admin.apps.length) return;
    admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
}

async function getUidByEmail(email) {
    initAdmin();
    const u = await admin.auth().getUserByEmail(email);
    return u.uid;
}

Given("a teszt felhasználó be van jelentkezve", async function () {
    await this.page.goto(`${this.baseUrl}${this.loginRoute}`, { waitUntil: "domcontentloaded" });

    await this.page.getByPlaceholder("Email").fill(this.email);
    await this.page.getByPlaceholder("Password").fill(this.password);

    await this.page.getByRole("button", { name: /log in|belépés/i }).click();
    await this.page.waitForURL(`**${this.dashboardRoute}`);
});

Given("a felhasználónak nincs karaktere", async function () {
    // hooks már törli, ez csak olvashatóság
});

Given("a felhasználó nincs bejelentkezve", async function () {
    await this.page.goto(`${this.baseUrl}${this.dashboardRoute}`, { waitUntil: "domcontentloaded" });
    // nincs action: a scenario fogja ellenőrizni a redirectet
});

When("megnyitja a karakterlista oldalt", async function () {
    await this.page.goto(`${this.baseUrl}${this.dashboardRoute}`, { waitUntil: "domcontentloaded" });
});

When("a felhasználó a /create-character oldalon van", async function () {
    await this.page.goto(`${this.baseUrl}${this.createRoute}`, { waitUntil: "domcontentloaded" });
});

When("megnyitja a /create-character oldalt", async function () {
    await this.page.goto(`${this.baseUrl}${this.createRoute}`, { waitUntil: "domcontentloaded" });
});

When("minden kötelező mezőt helyesen kitölt", async function () {
    // A placeholder: "Character name..."
    await this.page.getByPlaceholder(/character name/i).fill(this.createdName);

    // Kötelező: Level + Class (handleSave() szerint)
    const selects = this.page.locator("select");
    await selects.nth(0).selectOption({ index: 1 }); // Level: első valós opció
    await selects.nth(1).selectOption({ index: 1 }); // Class: első valós opció
});

When('üresen hagyja a "name" mezőt', async function () {
    const nameInput = this.page.getByPlaceholder(/character name/i);
    await nameInput.fill("");
});

When('rákattint a {string} gombra', async function (btn) {
    await this.page.getByRole("button", { name: new RegExp(btn, "i") }).click();
});

Then('megjelenik a {string} üzenet', async function (msg) {
    await expect(this.page.getByText(msg)).toBeVisible();
});

Then('egy {string} alert jelenik meg', async function (msg) {
    const dialog = await this.page.waitForEvent("dialog");
    expect(dialog.message()).toMatch(new RegExp(msg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    await dialog.accept();
});

Then('látható a {string} gomb', async function (label) {
    const re = new RegExp(label, "i");
    await expect(
        this.page.getByRole("button", { name: re }).or(this.page.getByRole("link", { name: re }))
    ).toBeVisible();
});

Then("a rendszer elmenti a karaktert Firestore-ba a users/<uid>/characters alá", async function () {
    initAdmin();
    const uid = await getUidByEmail(this.email);
    const db = admin.firestore();

    for (let i = 0; i < 20; i++) {
        const snap = await db.collection("users").doc(uid).collection("characters").get();
        const has = snap.docs.some((d) => String(d.data()?.name || "").includes(this.createdName));
        if (has) return;
        await new Promise((r) => setTimeout(r, 150));
    }

    throw new Error("Nem találtam létrejött karaktert Firestore Emulatorban.");
});

Then("az új karakter megjelenik a listában", async function () {
    await this.page.goto(`${this.baseUrl}${this.dashboardRoute}`, { waitUntil: "domcontentloaded" });
    await expect(this.page.getByText(this.createdName)).toBeVisible();
});

Then('megjelenik a {string} hibaüzenet', async function (msg) {
    await expect(this.page.getByText(msg)).toBeVisible();
});

Then("nem történik Firestore mentés", async function () {
    initAdmin();
    const uid = await getUidByEmail(this.email);
    const db = admin.firestore();

    const snap = await db.collection("users").doc(uid).collection("characters").get();
    if (!snap.empty) {
        throw new Error("Nem várt karakter dokumentum jött létre (validation fail mellett).");
    }
});

Then("a rendszer a login oldalra irányít", async function () {
    await expect(this.page).toHaveURL(new RegExp(`${this.loginRoute}$`));
});
