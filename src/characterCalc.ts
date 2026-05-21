export type StatKey = "STR" | "DEX" | "AGI" | "CON" | "INT" | "POW" | "WP" | "PER";
export type PrimaryStats = Record<StatKey, number>;

export const STAT_KEYS: StatKey[] = ["STR", "DEX", "AGI", "CON", "INT", "POW", "WP", "PER"];

export const STAT_LABEL: Record<StatKey, string> = {
    STR: "Strength",
    DEX: "Dexterity",
    AGI: "Agility",
    CON: "Constitution",
    INT: "Intelligence",
    POW: "Power",
    WP: "Willpower",
    PER: "Perception",
};

export type SkillMetaEntry = { name: string; keyStat: StatKey | string };

export const SKILL_META: Record<string, SkillMetaEntry> = {
    // athletics
    acro: { name: "Acrobatics", keyStat: "AGI" },
    ath: { name: "Athleticism", keyStat: "AGI" },
    cli: { name: "Climb", keyStat: "AGI" },
    jum: { name: "Jump", keyStat: "STR" },
    rid: { name: "Ride", keyStat: "AGI" },
    swi: { name: "Swim", keyStat: "AGI" },

    // vigor
    com: { name: "Composure", keyStat: "WP" },
    fea: { name: "Feats of Str.", keyStat: "STR" },
    wit: { name: "Withst. Pain", keyStat: "WP" },

    // perception
    noti: { name: "Notice", keyStat: "PER" },
    sea: { name: "Search", keyStat: "PER" },
    tra: { name: "Track", keyStat: "PER" },

    // intellectual
    ani: { name: "Animals", keyStat: "INT" },
    app: { name: "Appraisal", keyStat: "INT" },
    mem: { name: "Memorize", keyStat: "INT" },
    her: { name: "Herbal Lore", keyStat: "INT" },
    his: { name: "History", keyStat: "INT" },
    mapp: { name: "M. Appraisal", keyStat: "POW" },
    med: { name: "Medicine", keyStat: "INT" },
    nav: { name: "Navigation", keyStat: "INT" },
    occ: { name: "Occult", keyStat: "INT" },
    sci: { name: "Sciences", keyStat: "INT" },

    // social
    inti: { name: "Intimidate", keyStat: "WP" },
    lea: { name: "Leadership", keyStat: "POW" },
    pers: { name: "Persuasion", keyStat: "INT" },
    sty: { name: "Style", keyStat: "POW" },

    // subterfuge
    dis: { name: "Disguise", keyStat: "DEX" },
    hide: { name: "Hide", keyStat: "PER" },
    loc: { name: "Lock Picking", keyStat: "DEX" },
    poi: { name: "Poisons", keyStat: "INT" },
    thef: { name: "Theft", keyStat: "DEX" },
    ste: { name: "Stealth", keyStat: "AGI" },
    trap: { name: "Trap Lore", keyStat: "PER" },

    // creative
    art: { name: "Art", keyStat: "POW" },
    dan: { name: "Dance", keyStat: "AGI" },
    forg: { name: "Forging", keyStat: "DEX" },
    mus: { name: "Music", keyStat: "POW" },
    sl: { name: "Sl. of Hand", keyStat: "DEX" },
};

// --- Skill ID aliases (DB / book style -> internal IDs)
const SKILL_ID_ALIASES: Record<string, string> = {
    notice: "noti",
    search: "sea",
    stealth: "ste",
    theft: "thef",
    traplore: "trap",
    trapLore: "trap",
    sleightofhand: "sl",
    sleightOfHand: "sl",
    appraisal: "app",
    jump: "jum",
};

// returns internal skill id if possible, otherwise original
export function normalizeSkillId(id: string): string {
    const raw = String(id ?? "").trim();
    if (!raw) return raw;

    // exact hit
    if (SKILL_META[raw]) return raw;

    const low = raw.toLowerCase();

    // lowercase hit
    if (SKILL_META[low]) return low;

    // alias hit
    const ali = SKILL_ID_ALIASES[raw] ?? SKILL_ID_ALIASES[low];
    if (ali && SKILL_META[ali]) return ali;

    return raw;
}

// Normalize class doc so bonuses/reducedCosts work with internal skill ids
export function normalizeClassDef<T extends Record<string, any>>(cls: T): T {
    if (!cls || typeof cls !== "object") return cls;

    const out: any = JSON.parse(JSON.stringify(cls));

    // 1) dpCosts.reducedCosts.skills
    const rc = out?.dpCosts?.reducedCosts?.skills;
    if (rc && typeof rc === "object") {
        const next: Record<string, number> = {};
        for (const [k, v] of Object.entries(rc)) {
            const nk = normalizeSkillId(k);
            const cost = Number(v);
            if (!Number.isFinite(cost)) continue;

            // if collisions happen, keep the cheaper cost
            if (!(nk in next)) next[nk] = Math.floor(cost);
            else next[nk] = Math.min(next[nk], Math.floor(cost));
        }
        out.dpCosts.reducedCosts.skills = next;
    }

    // 2) levelBonuses.apply.skills
    const lbs = out?.levelBonuses;
    if (Array.isArray(lbs)) {
        for (const rule of lbs) {
            const skills = rule?.apply?.skills;
            if (!skills || typeof skills !== "object") continue;

            const next: any = {};
            for (const [k, v] of Object.entries(skills)) {
                const nk = normalizeSkillId(k);
                next[nk] = v;
            }
            rule.apply.skills = next;
        }
    }

    return out as T;
}

export function safeNumber(v: any, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

export function statBonus(statValue: number): number {
    const v = safeNumber(statValue, 0);
    return (v - 5) * 5;
}

export function formatSigned(n: number) {
    const v = safeNumber(n, 0);
    return v >= 0 ? `+${v}` : `${v}`;
}

export function characteristicModifier(statValue: number): number {
    const v = Math.max(1, Math.min(20, Math.floor(safeNumber(statValue, 5))));
    const table: number[] = [
        0, -30, -20, -10, -5, 0, 5, 5, 10, 10, 15, 15, 20, 20, 25, 25, 30, 30, 35, 35, 40,
    ];
    return table[v] ?? 0;
}

type LevelBonus = { every: number; apply?: any };

function getTimesApplied(level: number, every: number) {
    const lv = Math.max(0, Math.floor(safeNumber(level, 0)));
    const ev = Math.max(1, Math.floor(safeNumber(every, 1)));
    return Math.floor(lv / ev);
}

function sumFromLevelBonuses(cls: any, level: number, pick: (apply: any) => any): number {
    const lbs = cls?.levelBonuses;
    if (!Array.isArray(lbs)) return 0;

    let sum = 0;
    for (const rule of lbs as LevelBonus[]) {
        const every = safeNumber((rule as any)?.every, 1);
        const apply = (rule as any)?.apply;
        const val = pick(apply);
        const num = Number(val);
        if (!Number.isFinite(num) || num === 0) continue;

        const times = getTimesApplied(level, every);
        if (times <= 0) continue;
        sum += num * times;
    }
    return sum;
}

export function getClassSkillBonusPerLevel(cls: any, skillId: string): number {
    if (!cls) return 0;

    // 0) DB: levelBonuses where every=1 and apply.skills[skillId].base
    const lbs = cls?.levelBonuses;
    if (Array.isArray(lbs)) {
        let sum = 0;
        for (const rule of lbs as LevelBonus[]) {
            const every = safeNumber(rule?.every, 1);
            if (every !== 1) continue;
            const v = rule?.apply?.skills?.[skillId]?.base;
            const n = Number(v);
            if (Number.isFinite(n)) sum += n;
        }
        if (sum !== 0) return sum;
    }

    // fallbacks
    const a = cls?.bonuses?.skillsPerLevel?.[skillId];
    if (Number.isFinite(Number(a))) return Number(a);

    const b = cls?.bonuses?.skills?.[skillId]?.perLevel;
    if (Number.isFinite(Number(b))) return Number(b);

    const c = cls?.skillBonusesPerLevel?.[skillId];
    if (Number.isFinite(Number(c))) return Number(c);

    const d = cls?.skillPerLevelBonus?.[skillId];
    if (Number.isFinite(Number(d))) return Number(d);

    const e = cls?.classBonusPerLevel?.skills?.[skillId];
    if (Number.isFinite(Number(e))) return Number(e);

    return 0;
}

export function getSkillKeyStat(skillId: string): string {
    return SKILL_META[skillId]?.keyStat ?? "";
}

export function getAttrBonusFromPrimary(primary: Record<string, number>, keyStat: string): number {
    if (!keyStat) return 0;
    // Default 5 (=> 0 bonus)
    return statBonus(primary?.[keyStat] ?? 5);
}

export function getAttrBonusForSkill(primary: Record<string, number>, skillId: string): number {
    const keyStat = getSkillKeyStat(skillId);
    return getAttrBonusFromPrimary(primary, keyStat);
}

export function getClassBonusForSkill(level: number, cls: any, skillId: string): number {
    if (!cls) return 0;

    // DB: levelBonuses total
    const fromLbs = sumFromLevelBonuses(cls, level, (apply) => apply?.skills?.[skillId]?.base);
    if (fromLbs !== 0) return fromLbs;

    // Fallback: linear per-level (old schema)
    const perLevel = getClassSkillBonusPerLevel(cls, skillId);
    return safeNumber(level, 0) * perLevel;
}

export function getFinalSkillValue(args: {
    base: number;
    primary: Record<string, number>;
    level: number;
    cls: any;
    skillId: string;
    keyStatOverride?: string;
}) {
    const base = Math.max(0, Math.floor(safeNumber(args.base, 0)));
    const keyStat = args.keyStatOverride ?? getSkillKeyStat(args.skillId);
    const bon = getAttrBonusFromPrimary(args.primary, keyStat);
    const cls = getClassBonusForSkill(args.level, args.cls, args.skillId);
    const fin = base + bon + cls;

    return { base, bon, cls, fin, keyStat };
}

export function getClassInitiativeBonusAtLevel(level: number, cls: any): number {
    if (!cls) return 0;

    const fromLbs = sumFromLevelBonuses(cls, level, (apply) => apply?.points?.initClass);
    if (fromLbs !== 0) return fromLbs;

    const directPerLevel =
        cls?.bonuses?.initiativePerLevel ??
        cls?.initiativePerLevel ??
        cls?.points?.initClassPerLevel ??
        cls?.initClassPerLevel;

    if (Number.isFinite(Number(directPerLevel))) {
        return Math.max(0, Math.floor(safeNumber(level, 0))) * Number(directPerLevel);
    }

    const directAbs = cls?.points?.initClass ?? cls?.bonuses?.initClass;
    if (Number.isFinite(Number(directAbs))) return Number(directAbs);

    return 0;
}

export function getFinalInitiative(args: {
    primary: Record<string, number>;
    level: number;
    cls: any;

    base?: number; // default 20
    unarmed?: boolean; // default true
    armorPenalty?: number; // default 0
    weaponPenalty?: number; // default 0
}) {
    const base = safeNumber(args.base, 20);
    const unarmed = args.unarmed !== false; // default true

    const armorPenalty = safeNumber(args.armorPenalty, 0);
    const weaponPenalty = safeNumber(args.weaponPenalty, 0);

    const dex = safeNumber(args.primary?.DEX, 5);
    const agi = safeNumber(args.primary?.AGI, 5);

    const dexMod = characteristicModifier(dex);
    const agiMod = characteristicModifier(agi);

    const unarmedBonus = unarmed ? 20 : 0;
    const classBonus = getClassInitiativeBonusAtLevel(args.level, args.cls);

    const final = base + dexMod + agiMod - armorPenalty - weaponPenalty + unarmedBonus + classBonus;

    return { base, dexMod, agiMod, armorPenalty, weaponPenalty, unarmedBonus, classBonus, final };
}

export function normalizeSkillBase(src: any): Record<string, number> {
    const secondary = src?.secondary ?? src;

    const direct = (secondary?.skillBase ?? secondary?.skillDp ?? src?.skillBase ?? src?.skillDp) as any;
    if (direct && typeof direct === "object") return direct as Record<string, number>;

    const tpl = src?.skills;
    if (tpl && typeof tpl === "object") {
        const out: Record<string, number> = {};
        for (const [k, v] of Object.entries(tpl)) {
            const base = Number((v as any)?.base);
            if (Number.isFinite(base) && base !== 0) out[k] = base;
        }
        return out;
    }

    return {};
}

export function getBasePresenceByLevel(level: number): number {
    const lv = Math.max(1, Math.floor(safeNumber(level, 1)));
    if (lv <= 8) return 25 + lv * 5; // 1->30
    return 65 + (lv - 8) * 5;
}

export function getFinalPresence(args: {
    level: number;
    bonus?: number;
}) {
    const base = getBasePresenceByLevel(args.level);
    const bon = safeNumber(args.bonus, 0);
    const act = base + bon;
    return { base, bon, act };
}

export function getFinalResistances(args: {
    presence: number;
    primary: Record<string, number>;
    raceMods?: Record<string, number> | null;
}) {
    const p = safeNumber(args.presence, 0);
    const prim = args.primary ?? {};
    const rm = (args.raceMods ?? {}) as Record<string, any>;

    // characteristic modifiers used by "standard" Anima resistances
    const conMod = characteristicModifier(prim.CON ?? 5);
    const powMod = characteristicModifier(prim.POW ?? 5);
    const wpMod = characteristicModifier(prim.WP ?? 5);
    const perMod = characteristicModifier(prim.PER ?? 5);

    // Base set (always present)
    const out: Record<string, number> = {
        physical: p + conMod,
        disease: p + conMod,
        poison: p + conMod,
        magic: p + powMod,
        psychic: p + wpMod,
    };

    // Apply known keys directly
    out.physical += safeNumber(rm.physical, 0);
    out.disease += safeNumber(rm.disease, 0);
    out.poison += safeNumber(rm.poison, 0);
    out.magic += safeNumber(rm.magic, 0);
    out.psychic += safeNumber(rm.psychic, 0);

    const extraKeyToMod: Record<string, number> = {
        detection: perMod,
        dark: powMod,
    };

    for (const [kRaw, vRaw] of Object.entries(rm)) {
        const k = String(kRaw ?? "").trim();
        if (!k) continue;
        if (k in out) continue;

        const add = safeNumber(vRaw, 0);
        const mod = extraKeyToMod[k] ?? 0;
        out[k] = p + mod + add;
    }

    return out as {
        physical: number;
        disease: number;
        poison: number;
        magic: number;
        psychic: number;
        [k: string]: number;
    };
}

export type MovementTableRow = {
    mv: number;
    distanceFeet: number | string;
    require?: "Inhuman" | "Zen" | string;
};

export type FatiguePenaltyRow = {
    fatigue: number; // remaining fatigue points
    penalty: number; // negative modifier
};

function clampInt(n: number, min: number, max: number) {
    const v = Math.floor(safeNumber(n, min));
    return Math.max(min, Math.min(max, v));
}

export function getFinalMovement(args: {
    primary: Record<string, number>;
    athleticismFinal?: number;
    penalty?: number;
    allowInhuman?: boolean;
    allowZen?: boolean;
    humanMax?: number;
    max?: number;
}) {
    const agi = safeNumber(args.primary?.AGI, 5);
    const base = clampInt(agi, 1, 20);

    const athFin = Math.max(0, safeNumber(args.athleticismFinal, 0));
    const bon = Math.max(0, Math.floor(athFin / 40));

    const pen = Math.max(0, Math.floor(safeNumber(args.penalty, 0)));
    const raw = base + bon - pen;

    const humanMax = clampInt(args.humanMax ?? 10, 1, 20);
    const max = clampInt(args.max ?? 20, 1, 20);

    const cap = args.allowZen ? max : args.allowInhuman ? Math.min(max, 13) : Math.min(max, humanMax);

    const act = clampInt(raw, 1, cap);
    const capped = act !== Math.floor(raw);

    return { base, bon, pen, raw: Math.floor(raw), cap, capped, act };
}

export function pickMovementDistanceRow(mv: number, table21: MovementTableRow[] | undefined | null) {
    if (!Array.isArray(table21) || table21.length === 0) return null;
    const v = clampInt(mv, 1, 20);
    return table21.find((r) => clampInt((r as any)?.mv, 0, 999) === v) ?? null;
}

export function getFinalFatigue(args: {
    primary: Record<string, number>;
    current?: number;
    table23?: FatiguePenaltyRow[] | null;

    /** Race / advantage bonus to max fatigue (e.g. Jayan +1). */
    bonusMax?: number;
}) {
    const con = safeNumber(args.primary?.CON, 5);
    const bonusMax = Math.max(0, Math.floor(safeNumber(args.bonusMax, 0)));

    // In Anima, base fatigue is CON (value), plus optional bonuses.
    const base = Math.max(0, Math.floor(con)) + bonusMax;

    const current = Math.max(0, Math.floor(safeNumber(args.current, base)));

    let penalty = 0;
    if (current <= 4 && Array.isArray(args.table23)) {
        penalty = safeNumber(args.table23.find((r) => r?.fatigue === current)?.penalty, 0);
    }

    return { base, current, penalty, bonusMax };
}

export type CombatAbilityKey = "attack" | "block" | "dodge" | "wearArmor";

export function getClassCombatBonusAtLevel(level: number, cls: any, id: CombatAbilityKey): number {
    if (!cls) return 0;

    // DB: levelBonuses total
    const fromLbs = sumFromLevelBonuses(cls, level, (apply) => apply?.combat?.[id]?.base);
    if (fromLbs !== 0) return fromLbs;

    // Optional fallbacks
    const direct = cls?.bonuses?.combat?.[id] ?? cls?.combatBonuses?.[id] ?? cls?.combat?.[id];
    if (Number.isFinite(Number(direct))) return Number(direct);
    return 0;
}

export function normalizeCombatBase(src: any): Record<CombatAbilityKey, number> {
    // Prefer nested combat object: doc.combat.attack.base
    const c = src?.combat;
    const fromNested: Record<CombatAbilityKey, number> = {
        attack: safeNumber(c?.attack?.base, 0),
        block: safeNumber(c?.block?.base, 0),
        dodge: safeNumber(c?.dodge?.base, 0),
        wearArmor: safeNumber(c?.wearArmor?.base, 0),
    };

    if (fromNested.attack || fromNested.block || fromNested.dodge || fromNested.wearArmor) return fromNested;

    // Alt: flat combatBase {attack,block,dodge,wearArmor}
    const cb = src?.combatBase ?? src?.primaryAbilities;
    return {
        attack: safeNumber(cb?.attack, 0),
        block: safeNumber(cb?.block, 0),
        dodge: safeNumber(cb?.dodge, 0),
        wearArmor: safeNumber(cb?.wearArmor, 0),
    };
}

export function getFinalPrimaryAbility(args: {
    id: CombatAbilityKey;
    base: number;
    primary: Record<string, number>;
    level: number;
    cls: any;
    special?: number; // default 0
}) {
    const base = Math.max(0, Math.floor(safeNumber(args.base, 0)));
    const special = safeNumber(args.special, 0);

    const keyStat: StatKey = args.id === "dodge" ? "AGI" : args.id === "wearArmor" ? "STR" : "DEX";
    const statVal = safeNumber(args.primary?.[keyStat], 5);
    const statBon = statBonus(statVal);

    const classBon = getClassCombatBonusAtLevel(args.level, args.cls, args.id);
    const fin = base + statBon + special + classBon;

    return { id: args.id, keyStat, base, statBon, special, classBon, fin };
}

export type BaseLifeConfig = {
    baseLifePointsByConstitution: Record<string, number>;
};

function getBaseLpFromConfig(con: number, cfg: BaseLifeConfig | null | undefined): number {
    const c = Math.max(1, Math.floor(safeNumber(con, 5)));
    const fromCfg = cfg?.baseLifePointsByConstitution?.[String(c)];
    if (Number.isFinite(Number(fromCfg))) return Number(fromCfg);
    return 20 + c * 10;
}

export function getClassLifePointsBonusAtLevel(level: number, cls: any): number {
    if (!cls) return 0;
    return sumFromLevelBonuses(cls, level, (apply) => apply?.lp?.base);
}

export function getLifePointMultipleCost(cls: any, fallback = 20): number {
    const v = cls?.dpCosts?.lp?.multiples;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function getFinalLifePoints(args: {
    primary: Record<string, number>;
    level: number;
    cls: any;
    multiples: number;
    baseLifeConfig?: BaseLifeConfig | null;
}) {
    const con = Math.max(1, Math.floor(safeNumber(args.primary?.CON, 5)));
    const level = Math.max(1, Math.floor(safeNumber(args.level, 1)));
    const multiples = Math.max(0, Math.floor(safeNumber(args.multiples, 0)));

    const base = getBaseLpFromConfig(con, args.baseLifeConfig);
    const classBon = getClassLifePointsBonusAtLevel(level, args.cls);

    const multAdd = multiples * con;

    const multipleCost = getLifePointMultipleCost(args.cls, 20);
    const spentDp = multiples * multipleCost;

    const fin = base + classBon + multAdd;

    return { base, classBon, multAdd, multiples, multipleCost, spentDp, fin };
}

export type ValueMapping = Record<string, any>;

export type ChoiceParamDef = {
    id: string;
    label?: string;
    type: string; // "StatKey" | "SkillGroup" | "string" | "number" | ...
    allowed?: any[];
    min?: number;
    max?: number;
    mapping?: ValueMapping; // e.g. { "1": 50, "2": 100 }
};

export type AdvantageDef = {
    id: string;

    // display
    name?: string;
    title?: string;

    // DB-aligned
    costOptions?: number[];
    repeatable?: boolean;
    parameters?: ChoiceParamDef[];
    effectsText?: string[] | string;
    restrictionsText?: string[] | string;

    // legacy / alternate (tolerated)
    description?: string;
    desc?: string;
    cost?: number;
    cpCost?: number;
    points?: number;
    costOptionsLegacy?: number[];
    source?: string;

    // allow unknowns
    [k: string]: any;
};

export type DisadvantageDef = {
    id: string;

    // display
    name?: string;
    title?: string;

    // DB-aligned
    benefitOptions?: number[];
    repeatable?: boolean;
    parameters?: ChoiceParamDef[];
    effectsText?: string[] | string;
    restrictionsText?: string[] | string;

    // legacy / alternate (tolerated)
    description?: string;
    desc?: string;
    cp?: number;
    gain?: number;
    points?: number;
    source?: string;

    // allow unknowns
    [k: string]: any;
};

export type AdvantagePack = {
    version?: number;
    advMax?: number;
    advantages: AdvantageDef[];
};

export type DisadvantagePack = {
    version?: number;
    disadvMax?: number;
    disadvantages: DisadvantageDef[];
};

export type SelectedChoice = {
    id: string;
    option?: number;
    params?: Record<string, any>;
};

function asText(v: any): string {
    if (Array.isArray(v)) return v.map((x) => String(x ?? "")).filter(Boolean).join("\n");
    if (v == null) return "";
    return String(v);
}

export function getAdvantageLabel(a: AdvantageDef): string {
    return String(a?.name ?? a?.title ?? a?.id ?? "");
}

export function getDisadvantageLabel(d: DisadvantageDef): string {
    return String(d?.name ?? d?.title ?? d?.id ?? "");
}

export function getAdvantageEffectsText(a: AdvantageDef): string {
    return asText(a?.effectsText ?? a?.description ?? a?.desc);
}

export function getAdvantageRestrictionsText(a: AdvantageDef): string {
    return asText(a?.restrictionsText);
}

export function getDisadvantageEffectsText(d: DisadvantageDef): string {
    return asText(d?.effectsText ?? d?.description ?? d?.desc);
}

export function getDisadvantageRestrictionsText(d: DisadvantageDef): string {
    return asText(d?.restrictionsText);
}

export function getAdvantageParameters(a: AdvantageDef): ChoiceParamDef[] {
    return Array.isArray(a?.parameters) ? (a.parameters as ChoiceParamDef[]) : [];
}

export function getDisadvantageParameters(d: DisadvantageDef): ChoiceParamDef[] {
    return Array.isArray(d?.parameters) ? (d.parameters as ChoiceParamDef[]) : [];
}

export function getAdvantageCostOptions(a: AdvantageDef): number[] {
    const o =
        a?.costOptions ??
        (a as any)?.costOptionsLegacy ??
        (a as any)?.costs ??
        (a as any)?.options;

    if (Array.isArray(o)) return o.map((x) => Math.max(0, Math.floor(Number(x)))).filter((n) => Number.isFinite(n));
    return [];
}

export function getDisadvantageBenefitOptions(d: DisadvantageDef): number[] {
    const o = d?.benefitOptions ?? (d as any)?.benefits ?? (d as any)?.options;

    if (Array.isArray(o)) return o.map((x) => Math.max(0, Math.floor(Number(x)))).filter((n) => Number.isFinite(n));
    return [];
}

export function resolveAdvantageCost(a: AdvantageDef, selected?: SelectedChoice | null): number {
    const picked = Number(selected?.option);
    const opts = getAdvantageCostOptions(a);

    if (Number.isFinite(picked) && opts.includes(Math.floor(picked))) return Math.max(0, Math.floor(picked));
    if (opts.length > 0) return Math.max(0, Math.floor(opts[0]));
    const cost = Number((a as any)?.cost);
    if (Number.isFinite(cost)) return Math.max(0, Math.floor(cost));
    const cpCost = Number((a as any)?.cpCost);
    if (Number.isFinite(cpCost)) return Math.max(0, Math.floor(cpCost));
    const points = Number((a as any)?.points);
    if (Number.isFinite(points)) return Math.max(0, Math.floor(points));

    return 0;
}

export function resolveDisadvantageGain(d: DisadvantageDef, selected?: SelectedChoice | null): number {
    const picked = Number(selected?.option);
    const opts = getDisadvantageBenefitOptions(d);

    if (Number.isFinite(picked) && opts.includes(Math.floor(picked))) return Math.max(0, Math.floor(picked));
    if (opts.length > 0) return Math.max(0, Math.floor(opts[0]));
    const cp = Number((d as any)?.cp);
    if (Number.isFinite(cp)) return Math.max(0, Math.floor(cp));
    const gain = Number((d as any)?.gain);
    if (Number.isFinite(gain)) return Math.max(0, Math.floor(gain));
    const points = Number((d as any)?.points);
    if (Number.isFinite(points)) return Math.max(0, Math.floor(points));

    return 0;
}

export function buildAdvantageIndex(packOrList: AdvantagePack | AdvantageDef[] | null | undefined) {
    const list: AdvantageDef[] = Array.isArray(packOrList)
        ? (packOrList as AdvantageDef[])
        : Array.isArray((packOrList as any)?.advantages)
            ? ((packOrList as any).advantages as AdvantageDef[])
            : [];

    const index: Record<string, AdvantageDef> = {};
    for (const a of list) if (a?.id) index[String(a.id)] = a;
    return index;
}

export function buildDisadvantageIndex(packOrList: DisadvantagePack | DisadvantageDef[] | null | undefined) {
    const list: DisadvantageDef[] = Array.isArray(packOrList)
        ? (packOrList as DisadvantageDef[])
        : Array.isArray((packOrList as any)?.disadvantages)
            ? ((packOrList as any).disadvantages as DisadvantageDef[])
            : [];

    const index: Record<string, DisadvantageDef> = {};
    for (const d of list) if (d?.id) index[String(d.id)] = d;
    return index;
}

export type CreationPointsState = {
    baseTotal: number; // 3
    earnedCap: number; // 3

    earnedRaw: number; // sum(disadvantages chosen gains)
    earnedEffective: number; // min(cap, raw)

    totalAvailable: number; // base + earnedEffective
    spentOnAdvantages: number; // sum(advantages chosen costs)
    remainingTotal: number;

    // “tracked separately” view (base spent first)
    baseSpent: number;
    baseRemaining: number;
    earnedSpent: number;
    earnedRemaining: number;

    earnedOverflow: number; // raw - cap (if >0 => extra disadvantages give 0 CP)
};

function normSelectedList(input: Array<string | SelectedChoice> | null | undefined): SelectedChoice[] {
    const arr = Array.isArray(input) ? input : [];
    const out: SelectedChoice[] = [];
    for (const it of arr) {
        if (!it) continue;
        if (typeof it === "string") out.push({ id: it });
        else if (typeof (it as any)?.id === "string") out.push(it as SelectedChoice);
    }
    return out;
}

export function calcCreationPoints(args: {
    selectedAdvantages: Array<string | SelectedChoice>;
    selectedDisadvantages: Array<string | SelectedChoice>;
    advantageIndex: Record<string, AdvantageDef>;
    disadvantageIndex: Record<string, DisadvantageDef>;

    baseTotal?: number; // default 3
    earnedCap?: number; // default 3
}): CreationPointsState {
    const baseTotal = Math.max(0, Math.floor(safeNumber(args.baseTotal, 3)));
    const earnedCap = Math.max(0, Math.floor(safeNumber(args.earnedCap, 3)));

    const selDis = normSelectedList(args.selectedDisadvantages);
    const selAdv = normSelectedList(args.selectedAdvantages);

    let earnedRaw = 0;
    for (const s of selDis) {
        const d = args.disadvantageIndex?.[s.id];
        if (!d) continue;
        earnedRaw += resolveDisadvantageGain(d, s);
    }
    earnedRaw = Math.max(0, Math.floor(earnedRaw));
    const earnedEffective = Math.min(earnedCap, earnedRaw);

    let spentOnAdvantages = 0;
    for (const s of selAdv) {
        const a = args.advantageIndex?.[s.id];
        if (!a) continue;
        spentOnAdvantages += resolveAdvantageCost(a, s);
    }
    spentOnAdvantages = Math.max(0, Math.floor(spentOnAdvantages));

    const totalAvailable = baseTotal + earnedEffective;
    const remainingTotal = Math.max(0, totalAvailable - spentOnAdvantages);

    // Spend base first, then earned
    const baseSpent = Math.min(baseTotal, spentOnAdvantages);
    const earnedSpent = Math.max(0, spentOnAdvantages - baseSpent);

    const baseRemaining = Math.max(0, baseTotal - baseSpent);
    const earnedRemaining = Math.max(0, earnedEffective - earnedSpent);

    const earnedOverflow = Math.max(0, earnedRaw - earnedCap);

    return {
        baseTotal,
        earnedCap,
        earnedRaw,
        earnedEffective,
        totalAvailable,
        spentOnAdvantages,
        remainingTotal,
        baseSpent,
        baseRemaining,
        earnedSpent,
        earnedRemaining,
        earnedOverflow,
    };
}

export function canSelectAdvantage(args: {
    advantage: AdvantageDef;
    selectedOption?: number; // chosen cost
    currentState: CreationPointsState;
}): boolean {
    const cost = resolveAdvantageCost(args.advantage, { id: args.advantage.id, option: args.selectedOption });
    return args.currentState.remainingTotal >= cost;
}

export function disadvantageGivesCp(args: {
    disadvantage: DisadvantageDef;
    selectedOption?: number;
    currentState: CreationPointsState;
}): number {
    // how much CP it would *effectively* add, respecting earned cap
    const gain = resolveDisadvantageGain(args.disadvantage, { id: args.disadvantage.id, option: args.selectedOption });
    const before = Math.min(args.currentState.earnedCap, args.currentState.earnedRaw);
    const after = Math.min(args.currentState.earnedCap, args.currentState.earnedRaw + gain);
    return Math.max(0, after - before);
}

