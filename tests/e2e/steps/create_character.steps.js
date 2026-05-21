import { When, Then } from "@cucumber/cucumber";
import { expect } from "playwright/test";

When("megnyitja az új karakter létrehozását", async function () {
    await this.page.goto(`${this.baseUrl}/new-character`, { waitUntil: "domcontentloaded" });
    await this.page.getByText("Character Creator").waitFor();
});

When('kitölti a nevet {string}', async function (name) {
    await this.page.getByPlaceholder("Character name...").fill(name);
});

When('kiválasztja a Level-t {string}', async function (lv) {
    // select "Level" - a selectnek nincs label-je, ezért a "Level" mező környezetében fogjuk
    const selects = this.page.locator("select.select");
    // sorrend: Level a 2. select a Basics row-ban (1: level, 2: class) -> stabilabb: option text
    await selects.nth(0).selectOption({ label: lv });
});

When('kiválasztja a Class-t {string}', async function (clsLabel) {
    const selects = this.page.locator("select.select");
    await selects.nth(1).selectOption({ label: clsLabel });
});

When('rákattint a {string} gombra', async function (btnText) {
    await this.page.getByRole("button", { name: btnText }).click();
});

Then("a karakter részletező oldal megnyílik", async function () {
    await this.page.waitForURL("**/character/**");
});

Then('a {string} név megjelenik a fejlécben', async function (name) {
    await expect(this.page.getByText(name).first()).toBeVisible();
});

Then('a dashboardon a {string} látható a listában', async function (name) {
    await this.page.goto(`${this.baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
    await expect(this.page.getByRole("cell", { name })).toBeVisible();
});
