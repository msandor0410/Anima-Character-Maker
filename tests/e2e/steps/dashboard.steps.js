import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "playwright/test";

Given("a felhasználónak nincs karaktere", async function () {
});

When("megnyitja a dashboard oldalt", async function () {
    await this.page.goto(`${this.baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
    await this.page.getByText("Your Characters").waitFor();
});

Then('megjelenik a {string} üzenet', async function (msg) {
    await expect(this.page.getByText(msg)).toBeVisible();
});

Then('látható a {string} gomb', async function (label) {
    await expect(this.page.getByRole("link", { name: label })).toBeVisible();
});
