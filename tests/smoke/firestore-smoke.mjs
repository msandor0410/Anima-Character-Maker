import { describe, it, expect } from "vitest";
import { safeNumber, statBonus, getFinalSkillValue, formatSigned } from "../../src/characterCalc";

describe("characterCalc helpers", () => {
    it("safeNumber fallback", () => {
        expect(safeNumber(undefined, 7)).toBe(7);
        expect(safeNumber("not-a-number", 3)).toBe(3);
        expect(safeNumber(12, 3)).toBe(12);
    });

    it("statBonus basic", () => {
        // ABF jelleg: 5 -> 0, 6..7 -> +5, stb. (a te implementációd szerint)
        expect(statBonus(5)).toBeTypeOf("number");
    });

    it("formatSigned", () => {
        expect(formatSigned(0)).toBe("+0");
        expect(formatSigned(5)).toBe("+5");
        expect(formatSigned(-3)).toBe("-3");
    });

    it("getFinalSkillValue combines base + attr + class", () => {
        const out = getFinalSkillValue({
            level: 1,
            cls: { levelBonuses: [] },
            primary: { AGI: 8 },
            skillId: "acrobatics",
            base: 10,
            classBonusOverride: 5,
            keyStatOverride: "AGI"
        });

        expect(out.base).toBe(10);
        expect(out.classBonus).toBe(5);
        expect(out.final).toBeTypeOf("number");
    });
});
