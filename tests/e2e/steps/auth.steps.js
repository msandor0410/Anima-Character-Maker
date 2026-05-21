import { Given } from "@cucumber/cucumber";

Given("a teszt felhasználó be van jelentkezve", async function () {
    await this.page.goto(`${this.baseUrl}/login`, { waitUntil: "domcontentloaded" });

    await this.page.getByPlaceholder("Email").fill(this.email);
    await this.page.getByPlaceholder("Password").fill(this.password);
    await this.page.getByRole("button", { name: "Log In" }).click();
    await this.page.waitForURL("**/dashboard");
    await this.page.getByText("Your Characters").waitFor();
});
