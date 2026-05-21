import { describe, it, expect } from "vitest";
import { safeNumber, statBonus, getFinalSkillValue, formatSigned } from "../../src/characterCalc";

describe("characterCalc helpers", () => {
    it("safeNumber fallback", () => {
        expect(safeNumber(undefined, 7)).toBe(7);
        expect(safeNumber("not-a-number" as any, 3)).toBe(3);
        expect(safeNumber(12, 3)).toBe(12);
    });

    it("statBonus basic", () => {
        expect(statBonus(5)).toBeTypeOf("number");
    });

    it("formatSigned", () => {
        expect(formatSigned(0)).toBe("+0");
        expect(formatSigned(5)).toBe("+5");
        expect(formatSigned(-3)).toBe("-3");
    });

    it("getFinalSkillValue combines base + bon + cls => fin", () => {
        const out = getFinalSkillValue({
            level: 1,
            cls: { levelBonuses: [] },     // így cls bónusz 0 lesz, stabil teszt
            primary: { AGI: 8 },
            skillId: "acrobatics",         // lehet bármi; keyStatOverride miatt determinisztikus
            base: 10,
            keyStatOverride: "AGI",
        });

        expect(out.base).toBe(10);
        expect(out.bon).toBeTypeOf("number");
        expect(out.cls).toBeTypeOf("number");
        expect(out.fin).toBe(out.base + out.bon + out.cls);
        expect(out.keyStat).toBe("AGI");
    });
});
