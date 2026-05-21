import { describe, it, expect } from "vitest";
import { formatSigned } from "../../src/characterCalc";

describe("formatting", () => {
    it("formatSigned signs", () => {
        expect(formatSigned(12)).toBe("+12");
        expect(formatSigned(-1)).toBe("-1");
    });
});
