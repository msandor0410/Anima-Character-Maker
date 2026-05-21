import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./style.css";
import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, doc, getDoc, getDocs, serverTimestamp, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";

import {
    SKILL_META,
    STAT_LABEL,
    formatSigned,
    getClassSkillBonusPerLevel,
    getFinalSkillValue,
    getFinalInitiative,
    getFinalFatigue,
    getFinalMovement,
    getFinalPrimaryAbility,
    getFinalLifePoints,
    getFinalResistances,
    getBasePresenceByLevel,
    type BaseLifeConfig,
    type CombatAbilityKey,
    pickMovementDistanceRow,
    safeNumber,
    statBonus,
    type PrimaryStats,
    type StatKey,
    type AdvantageDef,
    type DisadvantageDef,
    type SelectedChoice,
    calcCreationPoints,
    getAdvantageCostOptions,
    resolveAdvantageCost,
    getDisadvantageBenefitOptions,
    resolveDisadvantageGain,
    normalizeClassDef
} from "./characterCalc";
import icon from "./img/dice-d10.svg";
import divider from "./img/divider.svg";
import {logout} from "./authService.ts";

type AdvantagesConfigDoc = {
    version?: number;
    advMax?: number;
    advantages?: AdvantageDef[];
    items?: AdvantageDef[];
};

type DisadvantagesConfigDoc = {
    version?: number;
    disadvMax?: number;
    disadvantages?: DisadvantageDef[];
    items?: DisadvantageDef[];
};

function extractArray<T>(docLike: any, field: string): T[] {
    if (Array.isArray(docLike)) return docLike as T[];
    if (Array.isArray(docLike?.[field])) return docLike[field] as T[];
    if (Array.isArray(docLike?.items)) return docLike.items as T[];
    return [];
}


type SkillGroup =
    | "athletics"
    | "vigor"
    | "perception"
    | "intellectual"
    | "social"
    | "subterfuge"
    | "creative"
    | "special";

type SkillsConfigDoc = {
    version?: number;
    skillGroups?: SkillGroup[];
    skillToGroup?: Record<string, SkillGroup>;
};

type MovementConfigDoc = {
    version?: number;
    movement?: {
        caps?: { humanMax?: number; max?: number };
        table21?: Array<{ mv: number; distanceFeet: number | string; require?: string }>;
    };
};

type FatigueConfigDoc = {
    version?: number;
    fatigue?: {
        exhaustion?: {
            table23?: Array<{ fatigue: number; penalty: number }>;
        };
    };
};

type SkillRow = {
    id: string;
    name: string;
    group: SkillGroup;
    keyStat: string;
};

type RaceDef = {
    id: string;
    name: string;
    modifiers?: {
        attributes?: Partial<Record<StatKey, number>>;
        resistances?: Record<string, number>;
        fatigue?: { max?: number };
    };
};


type ClassDef = {
    id: string;
    name: string;
    archetype?: string;

    limits?: Record<string, number>;

    dpCosts?: {
        primary?: Record<string, number>;
        secondaryGroups?: Record<string, number>;
        reducedCosts?: { skills?: Record<string, number> };

        // LP multiple cost lives here in calc.ts: cls.dpCosts.lp.multiples
        lp?: { multiples?: number };
    };

    dpLimitPercent?: Partial<Record<string, number>>;
    primaryCosts?: Record<string, number>;

    bonuses?: any;
    levelBonuses?: any[]; // optional, DB schema
};

type LevelRulesBackend = {
    progressionByLevel?: Array<{
        level: number;
        dpMax: number;
        basePresence?: number;
        experienceNeeded?: number | null;
    }>;
    maxLevel?: number;
};

type LevelRulesNormalized = {
    dpByLevel: Record<string, number>;
    basePresenceByLevel: Record<string, number>;
    xpByLevel: Record<string, number>;
};


async function loadConfigDoc<T>(path: { col: string; id: string }) {
    const snap = await getDoc(doc(db, path.col, path.id));
    return snap.exists() ? (snap.data() as T) : null;
}

async function loadCollection<T>(colName: string) {
    const snaps = await getDocs(collection(db, colName));
    return snaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as T[];
}

function normalizeLevelRules(raw: any): LevelRulesNormalized {
    if (raw?.dpByLevel && raw?.basePresenceByLevel && raw?.xpByLevel) {
        return {
            dpByLevel: raw.dpByLevel ?? {},
            basePresenceByLevel: raw.basePresenceByLevel ?? {},
            xpByLevel: raw.xpByLevel ?? {},
        };
    }

    const dpByLevel: Record<string, number> = {};
    const basePresenceByLevel: Record<string, number> = {};
    const xpByLevel: Record<string, number> = {};

    const prog = raw?.progressionByLevel;
    if (Array.isArray(prog)) {
        for (const row of prog) {
            const lvNum = row?.level;
            if (lvNum === null || lvNum === undefined) continue;
            const lv = String(lvNum);

            dpByLevel[lv] = safeNumber(row?.dpMax, 0);
            basePresenceByLevel[lv] = safeNumber(row?.basePresence, 0);
            xpByLevel[lv] = safeNumber(row?.experienceNeeded, 0);
        }
    }

    return { dpByLevel, basePresenceByLevel, xpByLevel };
}


function groupTitle(g: SkillGroup): string {
    switch (g) {
        case "athletics":
            return "Athletics";
        case "vigor":
            return "Vigor";
        case "perception":
            return "Perception";
        case "intellectual":
            return "Intellectual";
        case "social":
            return "Social";
        case "subterfuge":
            return "Subterfuge";
        case "creative":
            return "Creative";
        default:
            return "Special";
    }
}

function toTitleish(id: string) {
    return id.toUpperCase();
}



function getItemLabel(def: any): string {
    return String(def?.name ?? def?.title ?? def?.label ?? def?.id ?? "—");
}

function joinText(v: any): string {
    if (typeof v === "string") return v.trim();
    if (Array.isArray(v)) return v.map((x) => String(x ?? "").trim()).filter(Boolean).join(" • ");
    return "";
}

function getItemDescription(def: any): string {
    const parts: string[] = [];
    const d1 = joinText(def?.description);
    if (d1) parts.push(d1);

    const d2 = joinText(def?.desc);
    if (d2) parts.push(d2);

    const d3 = joinText(def?.effectsText);
    if (d3) parts.push(d3);

    const d4 = joinText(def?.restrictions);
    if (d4) parts.push(d4);

    const d5 = joinText(def?.notes);
    if (d5) parts.push(d5);

    return parts.join(" • ");
}

function advantageCostRangeLabel(def: AdvantageDef): string {
    const opts = getAdvantageCostOptions(def);
    if (opts.length > 0) {
        const min = Math.min(...opts);
        const max = Math.max(...opts);
        return min === max ? String(min) : `${min}–${max}`;
    }
    return String(resolveAdvantageCost(def));
}

function disadvantageGainRangeLabel(def: DisadvantageDef): string {
    const opts = getDisadvantageBenefitOptions(def);
    if (opts.length > 0) {
        const min = Math.min(...opts);
        const max = Math.max(...opts);
        return min === max ? `+${min}` : `+${min}–+${max}`;
    }
    return `+${resolveDisadvantageGain(def)}`;
}

function clamp(n: number, min?: number, max?: number) {
    if (typeof min === "number") n = Math.max(min, n);
    if (typeof max === "number") n = Math.min(max, n);
    return n;
}

function NumberStepper(props: {
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
}) {
    const { value, onChange, min, max, step = 1, placeholder } = props;

    const decDisabled = typeof min === "number" ? value <= min : false;
    const incDisabled = typeof max === "number" ? value >= max : false;

    return (
        <div className="stepper">
            <button
                type="button"
                className="stepper-btn"
                onClick={() => onChange(clamp(value - step, min, max))}
                disabled={decDisabled}
                aria-label="Decrease"
            >
                −
            </button>

            <div className="stepper-inputwrap">
                <div className="div-2">
                    <input
                        className="input"
                        type="number"
                        value={value}
                        min={min}
                        max={max}
                        step={step}
                        placeholder={placeholder}
                        onChange={(e) => {
                            const n = Number(e.target.value);
                            if (!Number.isFinite(n)) return;
                            onChange(clamp(Math.floor(n), min, max));
                        }}
                    />
                </div>
            </div>

            <button
                type="button"
                className="stepper-btn"
                onClick={() => onChange(clamp(value + step, min, max))}
                disabled={incDisabled}
                aria-label="Increase"
            >
                +
            </button>
        </div>
    );
}

export function CharacterCreatorPage() {
    const [userEmail, setUserEmail] = useState("");

    const navigate = useNavigate();

    // Auth
    const [uid, setUid] = useState<string | null>(null);
    useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null)), []);

    // Config loading
    const [cfgLoading, setCfgLoading] = useState(true);
    const [cfgError, setCfgError] = useState<string | null>(null);

    const [races, setRaces] = useState<RaceDef[]>([]);
    const [classes, setClasses] = useState<ClassDef[]>([]);
    const [skills, setSkills] = useState<SkillRow[]>([]);

    // Advantages / Disadvantages
    const [advantages, setAdvantages] = useState<AdvantageDef[]>([]);
    const [disadvantages, setDisadvantages] = useState<DisadvantageDef[]>([]);

    const [advMax, setAdvMax] = useState<number>(0);
    const [disadvMax, setDisadvMax] = useState<number>(0);

    const [selectedAdvantages, setSelectedAdvantages] = useState<SelectedChoice[]>([]);

    const [selectedDisadvantages, setSelectedDisadvantages] = useState<SelectedChoice[]>([]);

    const selectedAdvantageIds = useMemo(() => selectedAdvantages.map((x) => x.id), [selectedAdvantages]);
    const selectedDisadvantageIds = useMemo(() => selectedDisadvantages.map((x) => x.id), [selectedDisadvantages]);

    const defaultGroupOrder: SkillGroup[] = [
        "athletics",
        "vigor",
        "perception",
        "intellectual",
        "social",
        "subterfuge",
        "creative",
    ];
    const [skillGroupOrder, setSkillGroupOrder] = useState<SkillGroup[]>(defaultGroupOrder);

    const [levelRules, setLevelRules] = useState<LevelRulesNormalized>({
        dpByLevel: {},
        basePresenceByLevel: {},
        xpByLevel: {},
    });


    const [movementCfg, setMovementCfg] = useState<MovementConfigDoc | null>(null);
    const [fatigueCfg, setFatigueCfg] = useState<FatigueConfigDoc | null>(null);
    const [baseLifeCfg, setBaseLifeCfg] = useState<BaseLifeConfig | null>(null);
    useEffect(() => {
        const unsub = onSnapshot(doc(db, "config", "baselife"), (snap) => {
            setBaseLifeCfg((snap.data() as BaseLifeConfig) ?? null);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        return onAuthStateChanged(auth, (u) => {
            setUserEmail(u?.email ?? "");
            setUid(u?.uid ?? "");
        });
    }, []);

    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                setCfgLoading(true);
                setCfgError(null);

                const [r, c, skillsDoc, lrDoc, mvDoc, fatDoc, advDoc, disDoc] = await Promise.all([
                    loadCollection<RaceDef>("races"),
                    loadCollection<ClassDef>("classes"),
                    loadConfigDoc<SkillsConfigDoc>({ col: "config", id: "skills" }),
                    loadConfigDoc<LevelRulesBackend>({ col: "config", id: "levelrules" }),
                    loadConfigDoc<MovementConfigDoc>({ col: "config", id: "movement" }),
                    loadConfigDoc<FatigueConfigDoc>({ col: "config", id: "fatigue" }),
                    loadConfigDoc<AdvantagesConfigDoc | AdvantageDef[]>({ col: "config", id: "advantages" }),
                    loadConfigDoc<DisadvantagesConfigDoc | DisadvantageDef[]>({ col: "config", id: "disadvantages" }),
                ]);

                if (!alive) return;

                setRaces(Array.isArray(r) ? (r as RaceDef[]) : []);
                setClasses(Array.isArray(c) ? c.map((x) => normalizeClassDef(x)) : []);
                setLevelRules(normalizeLevelRules(lrDoc));
                setMovementCfg(mvDoc);
                setFatigueCfg(fatDoc);
                setAdvantages(extractArray<AdvantageDef>(advDoc, "advantages"));
                setDisadvantages(extractArray<DisadvantageDef>(disDoc, "disadvantages"));
                setAdvMax(safeNumber((advDoc as any)?.advMax, 0));
                setDisadvMax(safeNumber((disDoc as any)?.disadvMax, 0));

                const order: SkillGroup[] =
                    Array.isArray(skillsDoc?.skillGroups) && skillsDoc!.skillGroups!.length > 0
                        ? (skillsDoc!.skillGroups as SkillGroup[])
                        : defaultGroupOrder;

                setSkillGroupOrder(order);

                const skillToGroup = skillsDoc?.skillToGroup ?? {};
                const rows: SkillRow[] = Object.keys(skillToGroup).map((id) => {
                    const group = skillToGroup[id] ?? "special";
                    const meta = SKILL_META[id];
                    return {
                        id,
                        group,
                        name: meta?.name ?? toTitleish(id),
                        keyStat: meta?.keyStat ?? "—",
                    };
                });

                const orderIndex = new Map<string, number>(order.map((g, i) => [g, i]));
                rows.sort((a, b) => {
                    const ai = orderIndex.get(a.group) ?? 999;
                    const bi = orderIndex.get(b.group) ?? 999;
                    if (ai !== bi) return ai - bi;
                    return a.name.localeCompare(b.name);
                });

                setSkills(rows);
            } catch (e: any) {
                if (!alive) return;
                setCfgError(e?.message ?? "Failed to load game config from Firestore.");
            } finally {
                if (!alive) return;
                setCfgLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
        } catch (err: any) {
            alert(err?.message ?? "Logout failed");
        }
    };

    // Gate fields
    const [name, setName] = useState("");
    const [level, setLevel] = useState<number | null>(null);
    const [classId, setClassId] = useState<string>("");
    const [raceId, setRaceId] = useState<string>("");

    // IMPORTANT: allow level 0
    const locked = level === null || classId.trim() === "";
    const selectedClass = useMemo(() => classes.find((c) => c.id === classId) ?? null, [classes, classId]);
    const selectedRace = useMemo(() => races.find((r) => r.id === raceId) ?? null, [races, raceId]);


    // Primary stats (typed)
    const [primary, setPrimary] = useState<PrimaryStats>({
        STR: 5,
        DEX: 5,
        AGI: 5,
        CON: 5,
        INT: 5,
        POW: 5,
        WP: 5,
        PER: 5,
    });

    function applyRacePrimaryMods(base: PrimaryStats, race?: RaceDef | null): PrimaryStats {
        if (!race?.modifiers?.attributes) return base;

        const out = { ...base };
        for (const [k, v] of Object.entries(race.modifiers.attributes)) {
            const key = k.toUpperCase() as StatKey;
            if (key in out) {
                out[key] = clamp(safeNumber(out[key]) + safeNumber(v), 1, 20);
            }
        }
        return out;
    }

    const effectivePrimary = useMemo(() => applyRacePrimaryMods(primary, selectedRace), [primary, selectedRace]);

    // Secondary skill BASE per skill
    const [skillBase, setSkillBase] = useState<Record<string, number>>({});

    // Combat ability BASE (includes wearArmor)
    const [combatBase, setCombatBase] = useState<Record<CombatAbilityKey, number>>({
        attack: 0,
        block: 0,
        dodge: 0,
        wearArmor: 0,
    });

    // Life points multiples (DP-ből)
    const [lifePointMultiples, setLifePointMultiples] = useState<number>(0);

    // DP totals
    const totalDp = useMemo(() => {
        if (locked) return 0;
        const key = String(level);
        return safeNumber(levelRules.dpByLevel?.[key], 0);
    }, [locked, level, levelRules]);

    // XP
    const baseXp = useMemo(() => {
        if (locked) return 0;
        const key = String(level);
        return safeNumber(levelRules.xpByLevel?.[key], 0);
    }, [locked, level, levelRules]);


    const init = useMemo(() => {
        if (locked || !selectedClass) return null;
        return getFinalInitiative({
            primary: effectivePrimary,
            level: safeNumber(level, 0),
            cls: selectedClass,
            unarmed: true,
            armorPenalty: 0,
            weaponPenalty: 0,
        });
    }, [locked, selectedClass, effectivePrimary, level]);

    const presence = useMemo(() => {
        if (locked) return null;
        const key = String(level);
        const baseFromCfg = safeNumber(levelRules.basePresenceByLevel?.[key], NaN);
        const base = Number.isFinite(baseFromCfg) ? baseFromCfg : getBasePresenceByLevel(safeNumber(level, 1));
        const bonus = 0;
        return { base, bonus, act: base + bonus };
    }, [locked, level, levelRules]);

    const resistances = useMemo(() => {
        if (!presence) return null;
        const raceRes = selectedRace?.modifiers?.resistances ?? {};
        return getFinalResistances({
            presence: presence.act,
            primary: effectivePrimary,
            raceMods: raceRes,
        });
    }, [presence, effectivePrimary, selectedRace]);

    const skillIndex = useMemo(() => {
        const map: Record<string, SkillRow> = {};
        for (const s of skills) map[s.id] = s;
        return map;
    }, [skills]);

    function dpCostForSkill(skillId: string): number {
        const reduced = selectedClass?.dpCosts?.reducedCosts?.skills?.[skillId];
        if (typeof reduced === "number" && Number.isFinite(reduced)) return reduced;

        const group = skillIndex[skillId]?.group ?? "special";
        const groupCost = selectedClass?.dpCosts?.secondaryGroups?.[group];
        return safeNumber(groupCost, 2);
    }

    function dpCostForPrimaryAbility(id: CombatAbilityKey): number {
        const v = selectedClass?.dpCosts?.primary?.[id];
        return safeNumber(v, 2);
    }

    const usedSecondaryDp = useMemo(() => {
        if (locked) return 0;
        let sum = 0;
        for (const [skillId, base] of Object.entries(skillBase)) {
            const b = Math.max(0, Math.floor(safeNumber(base, 0)));
            if (b <= 0) continue;
            sum += b * dpCostForSkill(skillId);
        }
        return sum;
    }, [locked, skillBase, selectedClass, skillIndex]); // eslint-disable-line react-hooks/exhaustive-deps

    // Combat cap: 50% of total DP
    const combatLimitDp = useMemo(() => {
        if (locked) return 0;
        return Math.floor(totalDp * 0.5);
    }, [locked, totalDp]);

    const usedCombatDp = useMemo(() => {
        if (locked) return 0;
        let sum = 0;
        for (const id of ["attack", "block", "dodge", "wearArmor"] as CombatAbilityKey[]) {
            const base = Math.max(0, Math.floor(safeNumber(combatBase[id], 0)));
            if (base <= 0) continue;
            sum += base * dpCostForPrimaryAbility(id);
        }
        return sum;
    }, [locked, combatBase, selectedClass]); // eslint-disable-line react-hooks/exhaustive-deps

    const lifePointsDp = useMemo(() => {
        if (locked || !selectedClass) return 0;
        const multiples = Math.max(0, Math.floor(safeNumber(lifePointMultiples, 0)));
        const lp = getFinalLifePoints({
            primary: effectivePrimary,
            level: safeNumber(level, 1),
            cls: selectedClass,
            multiples,
            baseLifeConfig: baseLifeCfg,
        });
        return safeNumber(lp.spentDp, 0);
    }, [locked, selectedClass, effectivePrimary, level, lifePointMultiples, baseLifeCfg]);

    const usedPrimaryDp = usedCombatDp + lifePointsDp;
    const usedDp = locked ? 0 : usedPrimaryDp + usedSecondaryDp;
    const remainingDp = locked ? 0 : Math.max(0, totalDp - usedDp);

    const athleticismFinal = useMemo(() => {
        if (locked || !selectedClass) return 0;
        const base = Math.max(0, Math.floor(safeNumber(skillBase?.ath, 0)));
        const { fin } = getFinalSkillValue({
            base,
            primary: effectivePrimary,
            level: safeNumber(level, 0),
            cls: selectedClass,
            skillId: "ath",
            keyStatOverride: "AGI",
        });
        return fin;
    }, [locked, selectedClass, effectivePrimary, level, skillBase]);

    const movement = useMemo(() => {
        if (locked) return null;
        const caps = movementCfg?.movement?.caps;
        return getFinalMovement({
            primary: effectivePrimary,
            athleticismFinal,
            penalty: 0,
            allowInhuman: false,
            allowZen: false,
            humanMax: safeNumber(caps?.humanMax, 10),
            max: safeNumber(caps?.max, 20),
        });
    }, [locked, effectivePrimary, athleticismFinal, movementCfg]);

    const movementRow = useMemo(() => {
        if (!movement) return null;
        return pickMovementDistanceRow(movement.act, movementCfg?.movement?.table21 ?? null);
    }, [movement, movementCfg]);

    const fatigue = useMemo(() => {
        if (locked) return null;
        const table23 = fatigueCfg?.fatigue?.exhaustion?.table23 ?? null;
        const raceFatigueBonus = safeNumber(selectedRace?.modifiers?.fatigue?.max, 0);
        return getFinalFatigue({ primary: effectivePrimary, table23, bonusMax: raceFatigueBonus });
    }, [locked, effectivePrimary, fatigueCfg]);

    function setPrimaryStat(key: StatKey, value: number) {
        setPrimary((p) => ({ ...p, [key]: value }));
    }

    function setSkillBaseValue(skillId: string, nextBaseRaw: number) {
        setSkillBase((prev) => {
            if (locked) return prev;

            const prevBase = Math.max(0, Math.floor(safeNumber(prev[skillId], 0)));
            const nextBase = Math.max(0, Math.floor(safeNumber(nextBaseRaw, 0)));

            if (nextBase <= prevBase) return { ...prev, [skillId]: nextBase };

            const cost = dpCostForSkill(skillId);
            const delta = nextBase - prevBase;

            const budgetLeft = Math.max(0, totalDp - usedPrimaryDp - usedSecondaryDp);
            const maxAdd = cost > 0 ? Math.floor(budgetLeft / cost) : delta;
            const allowedAdd = Math.max(0, Math.min(delta, maxAdd));

            return { ...prev, [skillId]: prevBase + allowedAdd };
        });
    }

    function setCombatBaseValue(id: CombatAbilityKey, nextBaseRaw: number) {
        setCombatBase((prev) => {
            if (locked) return prev;

            const prevBase = Math.max(0, Math.floor(safeNumber(prev[id], 0)));
            const nextBase = Math.max(0, Math.floor(safeNumber(nextBaseRaw, 0)));

            if (nextBase <= prevBase) return { ...prev, [id]: nextBase };

            const cost = dpCostForPrimaryAbility(id);
            const delta = nextBase - prevBase;

            const prevUsedCombat = (() => {
                let s = 0;
                for (const k of ["attack", "block", "dodge", "wearArmor"] as CombatAbilityKey[]) {
                    const b = Math.max(0, Math.floor(safeNumber(prev[k], 0)));
                    if (b <= 0) continue;
                    s += b * dpCostForPrimaryAbility(k);
                }
                return s;
            })();

            // total DP left must consider: secondary + lifePointsDp + prev combat
            const totalLeft = Math.max(0, totalDp - usedSecondaryDp - lifePointsDp - prevUsedCombat);
            const combatLeft = Math.max(0, combatLimitDp - prevUsedCombat);
            const budgetLeft = Math.min(totalLeft, combatLeft);

            const maxAdd = cost > 0 ? Math.floor(budgetLeft / cost) : delta;
            const allowedAdd = Math.max(0, Math.min(delta, maxAdd));

            return { ...prev, [id]: prevBase + allowedAdd };
        });
    }

    function toggleAdvantage(id: string, nextChecked: boolean) {
        const def = advantageIndex[id] ?? ({ id } as any);

        setSelectedAdvantages((prev) => {
            const has = prev.some((x) => x.id === id);

            if (!nextChecked) return has ? prev.filter((x) => x.id !== id) : prev;

            if (has) return prev;

            const opts = getAdvantageCostOptions(def);
            const option = opts.length > 0 ? opts[0] : undefined;

            const next = [...prev, { id, option }];

            const nextCp = calcCreationPoints({
                selectedAdvantages: next,
                selectedDisadvantages,
                advantageIndex,
                disadvantageIndex,
                baseTotal: 3,
                earnedCap: 3,
            });

            if (nextCp.spentOnAdvantages > nextCp.totalAvailable) return prev;

            return next;
        });
    }

    function setAdvantageOption(id: string, option: number) {
        setSelectedAdvantages((prev) => {
            const has = prev.some((x) => x.id === id);
            if (!has) return prev;

            const next = prev.map((x) => (x.id === id ? { ...x, option } : x));

            const nextCp = calcCreationPoints({
                selectedAdvantages: next,
                selectedDisadvantages,
                advantageIndex,
                disadvantageIndex,
                baseTotal: 3,
                earnedCap: 3,
            });

            if (nextCp.spentOnAdvantages > nextCp.totalAvailable) return prev;

            return next;
        });
    }

    function toggleDisadvantage(id: string, nextChecked: boolean) {
        const def = disadvantageIndex[id] ?? ({ id } as any);

        setSelectedDisadvantages((prev) => {
            const has = prev.some((x) => x.id === id);

            if (!nextChecked) return has ? prev.filter((x) => x.id !== id) : prev;

            if (has) return prev;

            const limit = disadvMax > 0 ? disadvMax : 3;
            if (prev.length >= limit) return prev;

            const opts = getDisadvantageBenefitOptions(def);
            const option = opts.length > 0 ? opts[0] : undefined;

            return [...prev, { id, option }];
        });
    }

    function setDisadvantageOption(id: string, option: number) {
        setSelectedDisadvantages((prev) => {
            const has = prev.some((x) => x.id === id);
            if (!has) return prev;
            return prev.map((x) => (x.id === id ? { ...x, option } : x));
        });
    }

    const skillsByGroup = useMemo(() => {
        const map: Record<string, SkillRow[]> = {};
        for (const s of skills) {
            const g = s.group ?? "special";
            if (!map[g]) map[g] = [];
            map[g].push(s);
        }
        return map;
    }, [skills]);

    const advantageIndex = useMemo(() => {
        const m: Record<string, AdvantageDef> = {};
        for (const a of advantages) m[a.id] = a;
        return m;
    }, [advantages]);

    const disadvantageIndex = useMemo(() => {
        const m: Record<string, DisadvantageDef> = {};
        for (const d of disadvantages) m[d.id] = d;
        return m;
    }, [disadvantages]);

    const cp = useMemo(() => {
        return calcCreationPoints({
            selectedAdvantages,
            selectedDisadvantages,
            advantageIndex,
            disadvantageIndex,
            baseTotal: 3,
            earnedCap: 3,
        });
    }, [selectedAdvantages, selectedDisadvantages, advantageIndex, disadvantageIndex]);

    const noMoreCpWarning =
        "Disadvantages can still be taken, but they will no longer grant Creation Points that can be used to acquire Advantages.";

    async function handleSave() {
        if (!uid) return alert("You are not logged in.");
        if (!name.trim()) return alert("Name is required.");
        if (locked || !selectedClass) return alert("Select Level and Class first.");

        const payload: any = {
            version: 4,
            name: name.trim(),

            level,
            classId,
            className: selectedClass.name,
            archetype: selectedClass.archetype ?? "",

            raceId: raceId || null,

            xp: baseXp,

            rulesSnapshot: {
                class: selectedClass,
                race: selectedRace ?? null,
                levelrulesRef: "config/levelrules",
                skillsRef: "config/skills",
                baseLifeRef: "config/baselife",
            },

            primary, // base primary (szerkesztett értékek)
            secondary: { skillBase },

            combat: {
                attack: { base: Math.max(0, Math.floor(safeNumber(combatBase.attack, 0))), spent: 0 },
                block: { base: Math.max(0, Math.floor(safeNumber(combatBase.block, 0))), spent: 0 },
                dodge: { base: Math.max(0, Math.floor(safeNumber(combatBase.dodge, 0))), spent: 0 },
                wearArmor: { base: Math.max(0, Math.floor(safeNumber(combatBase.wearArmor, 0))), spent: 0 },
                lifePoints: { multiples: Math.max(0, Math.floor(safeNumber(lifePointMultiples, 0))) },
            },

            dp: {
                total: totalDp,
                usedPrimary: usedPrimaryDp,
                usedSecondary: usedSecondaryDp,
                used: usedDp,
                remaining: remainingDp,
            },

            creationPoints: {
                baseTotal: cp.baseTotal,
                earnedCap: cp.earnedCap,
                earnedRaw: cp.earnedRaw,
                earnedEffective: cp.earnedEffective,
                spentOnAdvantages: cp.spentOnAdvantages,
                remainingTotal: cp.remainingTotal,
                baseSpent: cp.baseSpent,
                baseRemaining: cp.baseRemaining,
                earnedSpent: cp.earnedSpent,
                earnedRemaining: cp.earnedRemaining,
            },

            advantages: selectedAdvantages,
            disadvantages: selectedDisadvantages,

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        try {
            const ref = await addDoc(collection(db, "users", uid, "characters"), payload);
            navigate(`/character/${ref.id}`);
        } catch (err: any) {
            alert(err?.message ?? "Save failed");
            console.error(err);
        }
    }

    if (cfgLoading) return <div style={{ padding: 24, color: "var(--text)" }}>Loading game config...</div>;

    if (cfgError) {
        return (
            <div style={{ padding: 24, color: "var(--text)" }}>
                <div style={{ marginBottom: 12, fontWeight: 700 }}>Config error</div>
                <div style={{ opacity: 0.9 }}>{cfgError}</div>
                <div style={{ marginTop: 12, opacity: 0.85 }}>
                    Ellenőrizd, hogy létezik-e: <code>races</code>, <code>classes</code>, <code>config/skills</code>,{" "}
                    <code>config/levelrules</code>
                </div>
            </div>
        );
    }

    const levelOptions = Object.keys(levelRules.dpByLevel ?? {})
        .map((k) => Number(k))
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b);

    const statKeys = Object.keys(primary) as StatKey[];

    return (
        <div className="login-page">
            <div className="header">
                <div className="container">
                    <div className="logo">
                        <div className="logomark">
                            <img className="icon" alt="Icon" src={icon} />
                        </div>
                        <div className="text-wrapper">
                            <a onClick={() => navigate("/dashboard")}>
                                Anima Character Maker
                            </a>
                        </div>
                    </div>
                </div>

                <div className="header-right">
                    <button
                        className="profile-btn"
                        type="button"
                        title="Profile"
                        onClick={() => navigate("/profile")}
                    >
                        <span className="user-email">{userEmail}</span>
                    </button>

                    <button className="logout-link" type="button" onClick={handleLogout}>
                        Log out
                    </button>
                </div>

                <img className="divider" alt="Divider" src={divider} />
            </div>

            <div className="main-content-wrapper">
                <div className="main-content">
                    <div className="onboarding-sign-up">
                        <div className="div dashboard-card creator-card">
                            <div className="header-2">
                                <p className="p">Character Creator</p>
                                <p className="text-wrapper-2">
                                    Choose a Level + Class combination for calculating the Development Points (DP) and to unlock editing sections.
                                </p>
                            </div>

                            {/* Gate section */}
                            <div className="creator-section">
                                <div className="section-title">Basics</div>

                                <div className="row2">
                                    <div className="field">
                                        <div className="field-label">Name</div>
                                        <div className="div-2">
                                            <input
                                                className="input"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="Character name..."
                                            />
                                        </div>
                                    </div>

                                    <div className="field">
                                        <div className="field-label">Level</div>
                                        <select
                                            className="select"
                                            value={level ?? ""}
                                            onChange={(e) => setLevel(e.target.value !== "" ? Number(e.target.value) : null)}
                                        >
                                            <option value="">Select level...</option>
                                            {levelOptions.map((lv) => (
                                                <option key={lv} value={lv}>
                                                    {lv}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="field">
                                        <div className="field-label">Class</div>
                                        <select className="select" value={classId} onChange={(e) => setClassId(e.target.value)}>
                                            <option value="">Select class...</option>
                                            {classes.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name}
                                                    {c.archetype ? ` (${c.archetype})` : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="mini">
                                    DP Total: <strong>{totalDp}</strong> • Used: <strong>{usedDp}</strong> • Remaining:{" "}
                                    <strong>{remainingDp}</strong>
                                    <span style={{ opacity: 0.85 }}>
                                        {" "}
                                        • XP: <strong>{baseXp}</strong>
                                    </span>
                                </div>


                                {movement && (
                                    <div className="mini">
                                        Movement: <strong>{movement.act}</strong>
                                        <span style={{ opacity: 0.85 }}>
                                            {" "}
                                            • Base(AGI) {movement.base}
                                            {" "}
                                            • Ath +{movement.bon}
                                            {" "}
                                            • Pen -{movement.pen}
                                            {movement.capped ? (
                                                <>
                                                    {" "}
                                                    • Cap <strong>{movement.cap}</strong>
                                                </>
                                            ) : null}
                                            {movementRow ? (
                                                <>
                                                    {" "}
                                                    • Distance/turn{" "}
                                                    <strong>
                                                        {movementRow.distanceFeet}
                                                        {typeof movementRow.distanceFeet === "number" ? " ft" : ""}
                                                    </strong>
                                                    {movementRow.require ? (
                                                        <>
                                                            {" "}
                                                            <span className="muted">({movementRow.require})</span>
                                                        </>
                                                    ) : null}
                                                </>
                                            ) : null}
                                        </span>
                                    </div>
                                )}

                                {fatigue && (
                                    <div className="mini">
                                        Fatigue: <strong>{fatigue.current}</strong>
                                        <span style={{ opacity: 0.85 }}>
                                            {" "}
                                            • Base(CON) {fatigue.base}
                                            {fatigue.bonusMax > 0 ? (
                                                <>
                                                    {" "}
                                                    • Race +{fatigue.bonusMax}
                                                </>
                                            ) : null}
                                            {" "}
                                            • Exhaustion Pen {formatSigned(fatigue.penalty)}
                                        </span>
                                    </div>
                                )}


                                <div className="mini">
                                    Initiative (unarmed): <strong>{init?.final ?? 0}</strong>
                                    {init && (
                                        <span style={{ opacity: 0.85 }}>
                                            {" "}
                                            • Base {init.base}
                                            {" "}
                                            • DEX {formatSigned(init.dexMod)}
                                            {" "}
                                            • AGI {formatSigned(init.agiMod)}
                                            {" "}
                                            • Class {formatSigned(init.classBonus)}
                                            {" "}
                                            • Unarmed {formatSigned(init.unarmedBonus)}
                                        </span>
                                    )}

                                    {presence && (
                                        <div className="mini">
                                            Presence: <strong>{presence.act}</strong>
                                            <span style={{ opacity: 0.85 }}>
                                                {" "}• Base {presence.base}
                                            </span>
                                        </div>
                                    )}

                                    {resistances && (
                                        <div className="mini">
                                            Resistances:
                                            {" "}PhR <strong>{resistances.physical}</strong>,
                                            {" "}DR <strong>{resistances.disease}</strong>,
                                            {" "}VR <strong>{resistances.poison}</strong>,
                                            {" "}MR <strong>{resistances.magic}</strong>,
                                            {" "}PsR <strong>{resistances.psychic}</strong>

                                            {(() => {
                                                const known = new Set(["physical", "disease", "poison", "magic", "psychic"]);
                                                const label = (k: string) => {
                                                    const map: Record<string, string> = {
                                                        physical: "PhR",
                                                        disease: "DR",
                                                        poison: "VR",
                                                        magic: "MR",
                                                        psychic: "PsR",
                                                        detection: "DetR",
                                                        dark: "DarkR",
                                                    };
                                                    return map[k] ?? `${k.charAt(0).toUpperCase()}${k.slice(1)}R`;
                                                };

                                                const extras = Object.entries(resistances)
                                                    .filter(([k]) => !known.has(k))
                                                    .sort(([a], [b]) => a.localeCompare(b));

                                                if (extras.length === 0) return null;

                                                return (
                                                    <>
                                                        {extras.map(([k, v]) => (
                                                            <span key={k}>
                                                                {", "} {label(k)} <strong>{v}</strong>
                                                            </span>
                                                        ))}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}

                                </div>

                            </div>

                            {/* Locked section */}
                            <fieldset disabled={locked} style={{ border: "none", padding: 0, margin: 0 }}>
                                <div className="creator-grid">
                                    {/* Race + Selected */}
                                    <div className="creator-section">
                                        <div className="section-title">Race & Class</div>

                                        <div className="list-grid">
                                            <div className="field">
                                                <div className="field-label">Race (optional)</div>
                                                <select className="select" value={raceId} onChange={(e) => setRaceId(e.target.value)}>
                                                    <option value="">Select race...</option>
                                                    {races.map((r) => (
                                                        <option key={r.id} value={r.id}>
                                                            {r.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="field">
                                                <div className="field-label">Selected</div>
                                                <div className="pill">
                                                    <strong>{selectedClass?.name ?? "—"}</strong>
                                                    <span style={{ opacity: 0.8 }}>{selectedClass?.archetype ?? "—"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Primary stats */}
                                    <div className="creator-section">
                                        <div className="section-title">Primary Characteristics</div>

                                        <div className="char-grid">
                                            {statKeys.map((k) => (
                                                <div key={k} className="field">
                                                    <div className="field-label">
                                                        {STAT_LABEL[k] ?? k} <span style={{ opacity: 0.7 }}>({k})</span>{" "}
                                                        <span style={{ opacity: 0.75, marginLeft: 8 }}>
                                                            Bon:{" "}
                                                            <strong style={{ color: "var(--accent)" }}>
                                                                {formatSigned(statBonus(effectivePrimary[k] ?? 0))}
                                                            </strong>
                                                        </span>
                                                    </div>

                                                    <NumberStepper
                                                        value={primary[k]} // base értéket szerkesztesz
                                                        min={1}
                                                        max={20}
                                                        step={1}
                                                        onChange={(v) => setPrimaryStat(k, v)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Primary Abilities */}
                                    <div className="creator-section">
                                        <div className="section-title">Primary Abilities</div>

                                        <div className="mini">
                                            Combat DP cap: <strong>{combatLimitDp}</strong> • Used: <strong>{usedCombatDp}</strong>
                                            <span style={{ opacity: 0.85 }}>
                                                {" "}
                                                • Life Points DP: <strong>{lifePointsDp}</strong>
                                            </span>
                                        </div>

                                        {/* Life Points + Wear Armor */}
                                        <div
                                            style={{
                                                display: "grid",
                                                gap: 16,
                                                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                                                marginTop: 12,
                                            }}
                                        >
                                            {/* Life Points (no combat cap, but spends DP) */}
                                            {(() => {
                                                const multiples = Math.max(0, Math.floor(safeNumber(lifePointMultiples, 0)));

                                                const lp = selectedClass
                                                    ? getFinalLifePoints({
                                                        primary: effectivePrimary,
                                                        level: safeNumber(level, 1),
                                                        cls: selectedClass,
                                                        multiples,
                                                        baseLifeConfig: baseLifeCfg,
                                                    })
                                                    : null;

                                                return (
                                                    <div className="skill-row primary-card" style={{ alignItems: "stretch" }}>
                                                        <div className="skill-left">
                                                            <div className="skill-name">Life Points</div>

                                                            <div className="skill-sub">
                                                                N° multiple <strong>{multiples}</strong>
                                                                <span className="muted"> • </span>
                                                                Cost <strong>{lp?.multipleCost ?? 0} DP/multiple</strong>
                                                                <span className="muted"> • </span>
                                                                DP spent <strong>{lp?.spentDp ?? 0}</strong>
                                                            </div>

                                                            {lp && (
                                                                <div className="skill-sub">
                                                                    Base <strong>{lp.base}</strong> + Class{" "}
                                                                    <strong>{formatSigned(lp.classBon)}</strong> + Multiples{" "}
                                                                    <strong>{formatSigned(lp.multAdd)}</strong> = Final{" "}
                                                                    <strong style={{ color: "var(--accent)" }}>{lp.fin}</strong>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="skill-controls">
                                                            <NumberStepper value={multiples} min={0} step={1} onChange={(v) => setLifePointMultiples(v)} />
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Wear Armor (combat ability, counts in combat cap) */}
                                            {(() => {
                                                const id = "wearArmor" as CombatAbilityKey;
                                                const base = Math.max(0, Math.floor(safeNumber(combatBase[id], 0)));
                                                const cost = dpCostForPrimaryAbility(id);

                                                const res = selectedClass
                                                    ? getFinalPrimaryAbility({
                                                        id,
                                                        base,
                                                        primary: effectivePrimary,
                                                        level: safeNumber(level, 0),
                                                        cls: selectedClass,
                                                        special: 0,
                                                    })
                                                    : null;

                                                return (
                                                    <div className="skill-row primary-card" style={{ alignItems: "stretch" }}>
                                                        <div className="skill-left">
                                                            <div className="skill-name">
                                                                Wear Armor <span className="muted">{res?.keyStat ?? "STR"}</span>
                                                            </div>

                                                            <div className="skill-sub">
                                                                Cost <strong>{cost} DP/Base</strong>
                                                                <span className="muted"> • </span>
                                                                {res?.keyStat ?? "STR"} Bon <strong>{formatSigned(res?.statBon ?? 0)}</strong>
                                                                <span className="muted"> • </span>
                                                                Class <strong>{formatSigned(res?.classBon ?? 0)}</strong>
                                                            </div>

                                                            {res && (
                                                                <div className="skill-sub">
                                                                    Base <strong>{res.base}</strong> + Stat{" "}
                                                                    <strong>{formatSigned(res.statBon)}</strong> + Special{" "}
                                                                    <strong>{formatSigned(res.special)}</strong> + Class{" "}
                                                                    <strong>{formatSigned(res.classBon)}</strong> = Final{" "}
                                                                    <strong style={{ color: "var(--accent)" }}>{res.fin}</strong>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="skill-controls">
                                                            <NumberStepper value={base} min={0} step={1} onChange={(v) => setCombatBaseValue(id, v)} />
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Combat Abilities */}
                                        <div
                                            style={{
                                                display: "grid",
                                                gap: 16,
                                                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                                                marginTop: 16,
                                            }}
                                        >
                                            {(["attack", "block", "dodge"] as CombatAbilityKey[]).map((id) => {
                                                const base = Math.max(0, Math.floor(safeNumber(combatBase[id], 0)));
                                                const cost = dpCostForPrimaryAbility(id);

                                                const res = selectedClass
                                                    ? getFinalPrimaryAbility({
                                                        id,
                                                        base,
                                                        primary: effectivePrimary,
                                                        level: safeNumber(level, 0),
                                                        cls: selectedClass,
                                                        special: 0,
                                                    })
                                                    : null;

                                                const title = id === "attack" ? "Attack" : id === "block" ? "Block" : "Dodge";

                                                return (
                                                    <div key={id} className="skill-row primary-card" style={{ alignItems: "stretch" }}>
                                                        <div className="skill-left">
                                                            <div className="skill-name">
                                                                {title} <span className="muted">{res?.keyStat ?? ""}</span>
                                                            </div>

                                                            <div className="skill-sub">
                                                                Cost <strong>{cost} DP/Base</strong>
                                                                <span className="muted"> • </span>
                                                                {res?.keyStat ?? ""} Bon <strong>{formatSigned(res?.statBon ?? 0)}</strong>
                                                                <span className="muted"> • </span>
                                                                Class <strong>{formatSigned(res?.classBon ?? 0)}</strong>
                                                            </div>

                                                            {res && (
                                                                <div className="skill-sub">
                                                                    Base <strong>{res.base}</strong> + Stat{" "}
                                                                    <strong>{formatSigned(res.statBon)}</strong> + Special{" "}
                                                                    <strong>{formatSigned(res.special)}</strong> + Class{" "}
                                                                    <strong>{formatSigned(res.classBon)}</strong> = Final{" "}
                                                                    <strong style={{ color: "var(--accent)" }}>{res.fin}</strong>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="skill-controls">
                                                            <NumberStepper value={base} min={0} step={1} onChange={(v) => setCombatBaseValue(id, v)} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Secondary skills */}
                                    <div className="creator-section">
                                        <div className="section-title">Secondary Abilities (Base + DP cost)</div>
                                        <div className="mini">Here you can increase the Base value by 1 for the selected skills; the DP cost will be calculated and subtracted automatically.</div>
                                        <br></br>
                                        <div style={{ display: "grid", gap: 16 }}>
                                            {skillGroupOrder
                                                .filter((g) => (skillsByGroup[g]?.length ?? 0) > 0)
                                                .map((g) => (
                                                    <div key={g}>
                                                        <div className="section-title" style={{ marginBottom: 8 }}>
                                                            {groupTitle(g)}
                                                        </div>

                                                        <div className="skills-grid">
                                                            {skillsByGroup[g].map((s) => {
                                                                const base = Math.max(0, Math.floor(safeNumber(skillBase[s.id], 0)));
                                                                const perLevel = getClassSkillBonusPerLevel(selectedClass as any, s.id);
                                                                const cost = dpCostForSkill(s.id);

                                                                const { bon, cls, fin } = getFinalSkillValue({
                                                                    base,
                                                                    primary: effectivePrimary,
                                                                    level: safeNumber(level, 0),
                                                                    cls: selectedClass,
                                                                    skillId: s.id,
                                                                    keyStatOverride: s.keyStat,
                                                                });

                                                                return (
                                                                    <div key={s.id} className="skill-row">
                                                                        <div className="skill-left">
                                                                            <div className="skill-name">
                                                                                {s.name} <span className="muted">{s.keyStat}</span>
                                                                            </div>

                                                                            <div className="skill-sub">
                                                                                Bon <strong>{formatSigned(bon)}</strong>
                                                                                <span className="muted"> • </span>
                                                                                Class{" "}
                                                                                <strong>{perLevel ? `${formatSigned(perLevel)}/lvl` : "+0/lvl"}</strong>
                                                                                <span className="muted"> • </span>
                                                                                Cost <strong>{cost} DP/Base</strong>
                                                                            </div>

                                                                            <div className="skill-sub">
                                                                                Base <strong>{base}</strong> + Bon{" "}
                                                                                <strong>{formatSigned(bon)}</strong> + Class{" "}
                                                                                <strong>{formatSigned(cls)}</strong> = Final{" "}
                                                                                <strong style={{ color: "var(--accent)" }}>{fin}</strong>
                                                                            </div>
                                                                        </div>

                                                                        <div className="skill-controls">
                                                                            <NumberStepper value={base} min={0} step={1} onChange={(v) => setSkillBaseValue(s.id, v)} />
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>

                                    {/* Creation Points: Advantages / Disadvantages */}
                                    <div className="cp-panel">
                                        <div className="cp-header">
                                            <div className="section-title" style={{ marginBottom: 0 }}>
                                                Creation Points
                                            </div>
                                            <br></br>
                                            <div className="cp-counters">
                                                <div className="mini" style={{ marginTop: 0 }}>
                                                    Base CP: <strong>{cp.baseTotal}</strong>{" "}
                                                    <span className="muted">
                                                            (remaining <strong>{cp.baseRemaining}</strong>)
                                                        </span>
                                                </div>

                                                <div className="mini" style={{ marginTop: 0 }}>
                                                    Earned CP: <strong>{cp.earnedEffective}</strong>/<strong>{cp.earnedCap}</strong>{" "}
                                                    <span className="muted">
                                                            (remaining <strong>{cp.earnedRemaining}</strong>)
                                                        </span>
                                                </div>

                                                <div className="mini" style={{ marginTop: 0 }}>
                                                    Total CP available: <strong>{cp.totalAvailable}</strong>{" "}
                                                    <span className="muted">
                                                            (remaining <strong>{cp.remainingTotal}</strong>)
                                                        </span>
                                                </div>
                                            </div>
                                        </div>
                                        <br></br>
                                        {/* Show the required warning only when everything is maxed (6 spent and earned cap reached) */}
                                        {cp.remainingTotal === 0 && cp.earnedEffective === cp.earnedCap ? (
                                            <div className="mini warn" style={{ marginTop: 10 }}>
                                                {noMoreCpWarning}
                                            </div>
                                        ) : null}

                                        <div className="cp-grid">
                                            {/* Advantages */}
                                            <div className="cp-col">
                                                <div className="section-title" style={{ marginBottom: 8 }}>
                                                    Advantages
                                                    <span className="muted" style={{ marginLeft: 8 }}>({selectedAdvantageIds.length}{advMax > 0 ? `/${advMax}` : ""})</span>
                                                </div>

                                                <div style={{ display: "grid", gap: 10 }}>
                                                    {advantages
                                                        .slice()
                                                        .sort((a, b) => resolveAdvantageCost(a) - resolveAdvantageCost(b) || getItemLabel(a).localeCompare(getItemLabel(b)))
                                                        .map((a) => {
                                                            const id = a.id;
                                                            const checked = selectedAdvantageIds.includes(id);

                                                            const sel = selectedAdvantages.find((x) => x.id === id);
                                                            const opts = getAdvantageCostOptions(a);
                                                            const cost = resolveAdvantageCost(a, sel ?? null);

                                                            // Cannot add if not enough CP remaining
                                                            const minCost = resolveAdvantageCost(a);

                                                            // Cannot add if not enough CP remaining (based on min cost)
                                                            const disabled = !checked && minCost > cp.remainingTotal;

                                                            return (
                                                                <div key={id} className="skill-row cp-card">
                                                                    <div className="skill-left">
                                                                        <div className="skill-name">
                                                                            {getItemLabel(a)}
                                                                            <span className="muted"> • Cost {!checked && opts.length > 0 ? advantageCostRangeLabel(a) : String(cost)} CP</span>
                                                                        </div>
                                                                        {getItemDescription(a) ? (
                                                                            <div className="skill-sub">{getItemDescription(a)}</div>
                                                                        ) : (
                                                                            <div className="skill-sub muted">—</div>
                                                                        )}
                                                                    </div>

                                                                    <div className="skill-controls">
                                                                        <label className="checkbox-small" style={{ justifyContent: "flex-end", width: "100%" }}>
                                                                            <input
                                                                                type="checkbox"
                                                                                className="checkbox"
                                                                                checked={checked}
                                                                                disabled={disabled}
                                                                                onChange={(e) => toggleAdvantage(id, e.target.checked)}
                                                                            />
                                                                            <span className="text-wrapper-7">{checked ? "Selected" : "Select"}</span>
                                                                        </label>

                                                                        {checked && opts.length > 0 ? (
                                                                            <div style={{ marginTop: 8, width: "100%" }}>
                                                                                <div className="mini" style={{ marginTop: 0 }}>
                                                                                    Cost option
                                                                                </div>
                                                                                <select
                                                                                    className="select"
                                                                                    value={typeof sel?.option === "number" ? sel.option : opts[0]}
                                                                                    onChange={(e) => setAdvantageOption(id, Number(e.target.value))}
                                                                                >
                                                                                    {opts.map((o) => (
                                                                                        <option key={o} value={o}>
                                                                                            {o} CP
                                                                                        </option>
                                                                                    ))}
                                                                                </select>
                                                                            </div>
                                                                        ) : null}

                                                                        {!checked && disabled ? (
                                                                            <div className="mini error" style={{ marginTop: 6 }}>
                                                                                Not enough CP.
                                                                            </div>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            </div>

                                            {/* Disadvantages */}
                                            <div className="cp-col">
                                                <div className="section-title" style={{ marginBottom: 8 }}>
                                                    Disadvantages
                                                    <span className="muted" style={{ marginLeft: 8 }}>({selectedDisadvantageIds.length}{disadvMax > 0 ? `/${disadvMax}` : ""})</span>
                                                </div>

                                                <div style={{ display: "grid", gap: 10 }}>
                                                    {disadvantages
                                                        .slice()
                                                        .sort((a, b) => resolveDisadvantageGain(b) - resolveDisadvantageGain(a) || getItemLabel(a).localeCompare(getItemLabel(b)))
                                                        .map((d) => {
                                                            const id = d.id;
                                                            const checked = selectedDisadvantageIds.includes(id);

                                                            const sel = selectedDisadvantages.find((x) => x.id === id);
                                                            const opts = getDisadvantageBenefitOptions(d);
                                                            const gain = resolveDisadvantageGain(d, sel ?? null);


                                                            const limit = disadvMax > 0 ? disadvMax : 3;
                                                            const disableBecauseLimit = !checked && selectedDisadvantageIds.length >= limit;

                                                            // If earned CP cap reached, additional disadvantages grant 0 CP, but still selectable
                                                            const capReached = cp.earnedEffective >= cp.earnedCap;

                                                            return (
                                                                <div key={id} className="skill-row cp-card">
                                                                    <div className="skill-left">
                                                                        <div className="skill-name">
                                                                            {getItemLabel(d)}
                                                                            <span className="muted">
                                                                                    {" "}
                                                                                • Grants {checked || opts.length === 0 ? `+${gain}` : disadvantageGainRangeLabel(d)} CP{capReached ? " (cap applies)" : ""}
                                                                                </span>
                                                                        </div>
                                                                        {getItemDescription(d) ? (
                                                                            <div className="skill-sub">{getItemDescription(d)}</div>
                                                                        ) : (
                                                                            <div className="skill-sub muted">—</div>
                                                                        )}
                                                                    </div>

                                                                    <div className="skill-controls">
                                                                        <label className="checkbox-small" style={{ justifyContent: "flex-end", width: "100%" }}>
                                                                            <input
                                                                                type="checkbox"
                                                                                className="checkbox"
                                                                                checked={checked}
                                                                                disabled={disableBecauseLimit}
                                                                                onChange={(e) => toggleDisadvantage(id, e.target.checked)}
                                                                            />
                                                                            <span className="text-wrapper-7">{checked ? "Selected" : "Select"}</span>
                                                                        </label>

                                                                        {checked && opts.length > 0 ? (
                                                                            <div style={{ marginTop: 8, width: "100%" }}>
                                                                                <div className="mini" style={{ marginTop: 0 }}>
                                                                                    Benefit option
                                                                                </div>
                                                                                <select
                                                                                    className="select"
                                                                                    value={typeof sel?.option === "number" ? sel.option : opts[0]}
                                                                                    onChange={(e) => setDisadvantageOption(id, Number(e.target.value))}
                                                                                >
                                                                                    {opts.map((o) => (
                                                                                        <option key={o} value={o}>
                                                                                            +{o} CP
                                                                                        </option>
                                                                                    ))}
                                                                                </select>
                                                                            </div>
                                                                        ) : null}

                                                                        {!checked && disableBecauseLimit ? (
                                                                            <div className="mini error" style={{ marginTop: 6 }}>
                                                                                Maximum {disadvMax > 0 ? disadvMax : 3} disadvantages.
                                                                            </div>
                                                                        ) : null}

                                                                        {/* Optional small hint when cap is reached */}
                                                                        {capReached ? (
                                                                            <div className="mini" style={{ marginTop: 6 }}>
                                                                                Earned CP is capped at <strong>{cp.earnedCap}</strong>.
                                                                            </div>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="dashboard-actions" style={{ gap: 12 }}>
                                        <button className="button-login" type="button" onClick={handleSave}>
                                            <span className="text-wrapper-4">Save character</span>
                                        </button>
                                    </div>
                                </div>
                            </fieldset>
                            <div className="dashboard-actions" style={{ gap : 12}}>
                                <button className="logout-link" type="button" onClick={() => navigate("/dashboard")}>
                                    Back
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="app-footer">
                <div className="app-footer-inner">
                    <div className="footer-left">
                        <span className="footer-title">Anima Character Maker</span>
                        <span className="footer-dot">•</span>
                        <span className="footer-text">
                            Thesis project by <strong>Mikó Sándor</strong>
                        </span>
                    </div>

                    <div className="footer-right">
                        <span className="footer-pill">Free to use</span>
                        <span className="footer-text">
                            Data source: <em>Anima Beyond Fantasy – English Core Rulebook</em>
                        </span>
                        <span className="footer-text muted">
                            Fan-made tool. Not affiliated with the publisher.
                        </span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
