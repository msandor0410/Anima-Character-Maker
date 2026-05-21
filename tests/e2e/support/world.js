import { setWorldConstructor } from "@cucumber/cucumber";

export class World {
    constructor() {
        this.baseUrl = process.env.E2E_BASE_URL || "http://127.0.0.1:5173";
        this.browser = null;
        this.context = null;
        this.page = null;

        this.email = process.env.E2E_EMAIL || "e2e@example.com";
        this.password = process.env.E2E_PASSWORD || "Password123!";
    }
}

setWorldConstructor(World);
