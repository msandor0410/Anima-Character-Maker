import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./style.css";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";

import {
    SKILL_META,
    STAT_LABEL,
    STAT_KEYS,
    formatSigned,
    getFinalInitiative,
    getFinalFatigue,
    getFinalLifePoints,
    getFinalMovement,
    getFinalSkillValue,
    getClassSkillBonusPerLevel,
    normalizeClassDef,
    normalizeSkillBase,
    normalizeCombatBase,
    normalizeSkillId,
    safeNumber,
    statBonus,
    pickMovementDistanceRow,
    getFinalPrimaryAbility,
    getFinalResistances,
    getBasePresenceByLevel,
    type BaseLifeConfig,
    type CombatAbilityKey,
    type PrimaryStats,
    type StatKey,
    type AdvantageDef,
    type DisadvantageDef,
    type SelectedChoice,
    resolveAdvantageCost,
    resolveDisadvantageGain,
} from "./characterCalc";
import icon from "./img/dice-d10.svg";
import divider from "./img/divider.svg";
import {logout} from "./authService.ts";

type CharacterDoc = {
    name: string;
    level: number;
    classId?: string;
    className: string;
    archetype?: string;
    raceId?: string | null;

    xp?: number;

    // creator schema
    advantages?: SelectedChoice[];
    disadvantages?: SelectedChoice[];

    primary?: Partial<PrimaryStats>;
    secondary?: { skillBase?: Record<string, number> };

    combat?: {
        attack?: { base?: number; spent?: number };
        block?: { base?: number; spent?: number };
        dodge?: { base?: number; spent?: number };
        wearArmor?: { base?: number; spent?: number };
        lifePoints?: { multiples?: number };
    };

    dp?: {
        total?: number;
        usedPrimary?: number;
        usedSecondary?: number;
        used?: number;
        remaining?: number;
    };

    game?: {
        fatigueCurrent?: number;
        lifePointsCurrent?: number;
    };

    rulesSnapshot?: {
        class?: any;
        race?: any;
        levelrulesRef?: string;
        skillsRef?: string;
        baseLifeRef?: string;
    };

    updatedAt?: any;
};

type SkillsConfigDoc = {
    version?: number;
    skillGroups?: string[];
    skillToGroup?: Record<string, string>;
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

type LevelRulesBackend = {
    progressionByLevel?: Array<{
        level: number;
        dpMax: number;
        basePresence?: number;
        experienceNeeded?: number | null;
    }>;

    statIncreaseEvery?: number;
    characteristicIncreaseEvery?: number;
    primaryIncreaseEvery?: number;
    statIncreaseLevels?: number[];
    characteristicIncreaseLevels?: number[];

    maxLevel?: number;
};

type LevelRulesNormalized = {
    dpByLevel: Record<string, number>;
    xpByLevel: Record<string, number>;
    basePresenceByLevel: Record<string, number>;
    raw?: any;
};

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

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function normalizeLevelRules(raw: any): LevelRulesNormalized {
    const dpByLevel: Record<string, number> = {};
    const xpByLevel: Record<string, number> = {};
    const basePresenceByLevel: Record<string, number> = {};

    const prog = raw?.progressionByLevel;
    if (Array.isArray(prog)) {
        for (const row of prog) {
            const lvNum = row?.level;
            if (lvNum === null || lvNum === undefined) continue;
            const lv = String(lvNum);

            dpByLevel[lv] = safeNumber(row?.dpMax, 0);
            xpByLevel[lv] = safeNumber(row?.experienceNeeded, 0);
            basePresenceByLevel[lv] = safeNumber(row?.basePresence, 0);
        }
    }

    return { dpByLevel, xpByLevel, basePresenceByLevel, raw };
}

function applyRacePrimaryMods(base: PrimaryStats, race?: any | null): PrimaryStats {
    const mods = race?.modifiers?.attributes;
    if (!mods) return base;

    const out: PrimaryStats = { ...base };
    for (const [k, v] of Object.entries(mods)) {
        const key = String(k).toUpperCase() as StatKey;
        if (key in out) out[key] = clamp(safeNumber((out as any)[key], 0) + safeNumber(v as any, 0), 1, 20);
    }
    return out;
}

function normalizeLifePointMultiples(src: any): number {
    const a = src?.combat?.lifePoints?.multiples;
    if (Number.isFinite(Number(a))) return Math.max(0, Math.floor(Number(a)));
    const b = src?.lifePointMultiples;
    if (Number.isFinite(Number(b))) return Math.max(0, Math.floor(Number(b)));
    const c = src?.lifePoints?.multiples;
    if (Number.isFinite(Number(c))) return Math.max(0, Math.floor(Number(c)));
    const d = src?.lp?.multiples;
    if (Number.isFinite(Number(d))) return Math.max(0, Math.floor(Number(d)));
    return 0;
}

function extractArray<T>(docLike: any, field: string): T[] {
    if (Array.isArray(docLike)) return docLike as T[];
    if (Array.isArray(docLike?.[field])) return docLike[field] as T[];
    if (Array.isArray(docLike?.items)) return docLike.items as T[];
    return [];
}

function joinText(v: any): string {
    if (typeof v === "string") return v.trim();
    if (Array.isArray(v)) return v.map((x) => String(x ?? "").trim()).filter(Boolean).join(" • ");
    return "";
}

function getItemLabel(def: any): string {
    return String(def?.name ?? def?.title ?? def?.label ?? def?.id ?? "—");
}

function getItemDescription(def: any): string {
    const parts: string[] = [];
    const d1 = joinText(def?.description);
    if (d1) parts.push(d1);

    const d2 = joinText(def?.desc);
    if (d2) parts.push(d2);

    const d3 = joinText(def?.effectsText);
    if (d3) parts.push(d3);

    const d4 = joinText(def?.restrictionsText ?? def?.restrictions);
    if (d4) parts.push(d4);

    const d5 = joinText(def?.notes);
    if (d5) parts.push(d5);

    return parts.join(" • ");
}

type ResistancesFinal = ReturnType<typeof getFinalResistances>;

function buildResistanceEntries(res: ResistancesFinal): Array<{ key: string; short: string; label: string; value: number }> {
    const out: Array<{ key: string; short: string; label: string; value: number }> = [
        { key: "physical", short: "PhR", label: "Physical Resistance", value: res.physical },
        { key: "disease", short: "DR", label: "Disease Resistance", value: res.disease },
        { key: "poison", short: "VR", label: "Poison Resistance", value: res.poison },
        { key: "magic", short: "MR", label: "Magic Resistance", value: res.magic },
        { key: "psychic", short: "PsR", label: "Psychic Resistance", value: res.psychic },
    ];

    if (res.detection !== 0) out.push({ key: "detection", short: "DetR", label: "Detection Resistance", value: res.detection });
    if (res.dark !== 0) out.push({ key: "dark", short: "DaR", label: "Dark Resistance", value: res.dark });

    const other = res.other ?? {};
    for (const [k, v] of Object.entries(other)) {
        out.push({
            key: `other:${k}`,
            short: String(k),
            label: `${String(k)} Resistance`,
            value: Number(v),
        });
    }

    return out;
}

function NumberStepper(props: {
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
    disabled?: boolean;
}) {
    const { value, onChange, min, max, step = 1, placeholder, disabled } = props;

    const decDisabled = disabled || (typeof min === "number" ? value <= min : false);
    const incDisabled = disabled || (typeof max === "number" ? value >= max : false);

    return (
        <div className="stepper" aria-disabled={disabled ? "true" : "false"}>
            <button type="button" className="stepper-btn" onClick={() => onChange(clamp(value - step, min ?? -999999, max ?? 999999))} disabled={decDisabled}>
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
                        disabled={disabled}
                        onChange={(e) => {
                            if (disabled) return;
                            const n = Number(e.target.value);
                            if (!Number.isFinite(n)) return;
                            const vv = Math.floor(n);
                            const lo = typeof min === "number" ? min : -999999;
                            const hi = typeof max === "number" ? max : 999999;
                            onChange(clamp(vv, lo, hi));
                        }}
                    />
                </div>
            </div>

            <button type="button" className="stepper-btn" onClick={() => onChange(clamp(value + step, min ?? -999999, max ?? 999999))} disabled={incDisabled}>
                +
            </button>
        </div>
    );
}

export function CharacterGamePage() {
    const [userEmail, setUserEmail] = useState("");
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    // Auth
    const [uid, setUid] = useState<string | null>(null);
    useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null)), []);

    // Loading
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    // Data
    const [data, setData] = useState<CharacterDoc | null>(null);

    // Configs
    const [skillsCfg, setSkillsCfg] = useState<SkillsConfigDoc | null>(null);
    const [movementCfg, setMovementCfg] = useState<MovementConfigDoc | null>(null);
    const [fatigueCfg, setFatigueCfg] = useState<FatigueConfigDoc | null>(null);
    const [baseLifeCfg, setBaseLifeCfg] = useState<BaseLifeConfig | null>(null);
    const [levelRules, setLevelRules] = useState<LevelRulesNormalized>({ dpByLevel: {}, xpByLevel: {}, basePresenceByLevel: {} });

    // Advantages/Disadvantages configs
    const [advantages, setAdvantages] = useState<AdvantageDef[]>([]);
    const [disadvantages, setDisadvantages] = useState<DisadvantageDef[]>([]);

    // Game-state locals (edit -> auto-save)
    const [fatigueCurrent, setFatigueCurrent] = useState<number>(0);
    const [lifePointsCurrent, setLifePointsCurrent] = useState<number>(0);
    const [xpCurrent, setXpCurrent] = useState<number>(0);

    // Level-up mode
    const [levelUpMode, setLevelUpMode] = useState(false);

    // Level-up working copies
    const [luPrimary, setLuPrimary] = useState<PrimaryStats | null>(null);
    const [luCombatBase, setLuCombatBase] = useState<Record<CombatAbilityKey, number> | null>(null);
    const [luSkillBase, setLuSkillBase] = useState<Record<string, number> | null>(null);
    const [luLifePointMultiples, setLuLifePointMultiples] = useState<number>(0);

    const [luStatIncKey, setLuStatIncKey] = useState<StatKey | null>(null); // which stat was increased
    const [luStatIncUsed, setLuStatIncUsed] = useState(0); // 0/1

    useEffect(() => {
        return onAuthStateChanged(auth, (u) => {
            setUserEmail(u?.email ?? "");
            setUid(u?.uid ?? "");
        });
    }, []);

    useEffect(() => {
        let alive = true;
        let unsubChar: (() => void) | null = null;

        (async () => {
            try {
                setLoading(true);
                setErr(null);

                if (!uid) return;
                if (!id) {
                    setErr("Missing character id.");
                    return;
                }

                const charRef = doc(db, "users", uid, "characters", id);

                const [skillsSnap, mvSnap, fatSnap, lifeSnap, lrSnap, advSnap, disSnap] = await Promise.all([
                    getDoc(doc(db, "config", "skills")),
                    getDoc(doc(db, "config", "movement")),
                    getDoc(doc(db, "config", "fatigue")),
                    getDoc(doc(db, "config", "baselife")),
                    getDoc(doc(db, "config", "levelrules")),
                    getDoc(doc(db, "config", "advantages")),
                    getDoc(doc(db, "config", "disadvantages")),
                ]);

                if (!alive) return;

                if (skillsSnap.exists()) setSkillsCfg(skillsSnap.data() as SkillsConfigDoc);
                if (mvSnap.exists()) setMovementCfg(mvSnap.data() as MovementConfigDoc);
                if (fatSnap.exists()) setFatigueCfg(fatSnap.data() as FatigueConfigDoc);
                if (lifeSnap.exists()) setBaseLifeCfg(lifeSnap.data() as BaseLifeConfig);

                if (lrSnap.exists()) setLevelRules(normalizeLevelRules(lrSnap.data() as LevelRulesBackend));
                else setLevelRules({ dpByLevel: {}, xpByLevel: {}, basePresenceByLevel: {} });

                if (advSnap.exists()) {
                    const raw = advSnap.data() as AdvantagesConfigDoc | AdvantageDef[];
                    setAdvantages(extractArray<AdvantageDef>(raw as any, "advantages"));
                } else setAdvantages([]);

                if (disSnap.exists()) {
                    const raw = disSnap.data() as DisadvantagesConfigDoc | DisadvantageDef[];
                    setDisadvantages(extractArray<DisadvantageDef>(raw as any, "disadvantages"));
                } else setDisadvantages([]);

                // character live
                unsubChar = onSnapshot(
                    charRef,
                    (snap) => {
                        if (!snap.exists()) {
                            setErr("Character not found (or no permission).");
                            setData(null);
                            setLoading(false);
                            return;
                        }
                        const d = snap.data() as CharacterDoc;
                        setData(d);
                        setLoading(false);
                    },
                    (e) => {
                        setErr(e?.message ?? "Failed to load character.");
                        setLoading(false);
                    }
                );
            } catch (e: any) {
                if (!alive) return;
                setErr(e?.message ?? "Failed to load page.");
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        })();

        return () => {
            alive = false;
            if (unsubChar) unsubChar();
        };
    }, [uid, id]);

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
        } catch (err: any) {
            alert(err?.message ?? "Logout failed");
        }
    };

    const level = safeNumber(data?.level, 0);
    const clsSnapRaw = data?.rulesSnapshot?.class ?? null;
    const clsSnap = useMemo(() => (clsSnapRaw ? normalizeClassDef(clsSnapRaw) : null), [clsSnapRaw]);
    const raceSnap = data?.rulesSnapshot?.race ?? null;

    const primaryNormalized = useMemo<PrimaryStats>(() => {
        const p = (data?.primary ?? {}) as any;
        return {
            STR: safeNumber(p?.STR, 5),
            DEX: safeNumber(p?.DEX, 5),
            AGI: safeNumber(p?.AGI, 5),
            CON: safeNumber(p?.CON, 5),
            INT: safeNumber(p?.INT, 5),
            POW: safeNumber(p?.POW, 5),
            WP: safeNumber(p?.WP, 5),
            PER: safeNumber(p?.PER, 5),
        };
    }, [data]);

    const effectivePrimary = useMemo(() => applyRacePrimaryMods(primaryNormalized, raceSnap), [primaryNormalized, raceSnap]);

    const combatBase = useMemo(() => normalizeCombatBase(data), [data]);
    const skillBaseRaw = useMemo(() => normalizeSkillBase(data), [data]);

    const skillBase = useMemo(() => {
        const out: Record<string, number> = {};
        for (const [k, v] of Object.entries(skillBaseRaw)) {
            const nk = normalizeSkillId(k);
            const val = Math.max(0, Math.floor(safeNumber(v, 0)));
            out[nk] = (out[nk] ?? 0) + val;
        }
        return out;
    }, [skillBaseRaw]);

    const lifePointMultiples = useMemo(() => normalizeLifePointMultiples(data), [data]);

    const initCalc = useMemo(() => {
        if (!clsSnap) return null;
        return getFinalInitiative({
            primary: effectivePrimary,
            level,
            cls: clsSnap,
            unarmed: true,
            armorPenalty: 0,
            weaponPenalty: 0,
        });
    }, [effectivePrimary, level, clsSnap]);

    const fatigueCalc = useMemo(() => {
        const table23 = fatigueCfg?.fatigue?.exhaustion?.table23 ?? null;
        const raceFatigueBonus = safeNumber(raceSnap?.modifiers?.fatigue?.max, 0);

        const docCur = safeNumber((data as any)?.game?.fatigueCurrent, NaN);
        const cur = Number.isFinite(docCur) ? docCur : undefined;

        return getFinalFatigue({ primary: effectivePrimary, current: cur, table23, bonusMax: raceFatigueBonus });
    }, [effectivePrimary, fatigueCfg, raceSnap, data]);

    const lifePointsCalc = useMemo(() => {
        if (!clsSnap) return null;
        return getFinalLifePoints({
            primary: effectivePrimary,
            level: Math.max(1, level),
            cls: clsSnap,
            multiples: lifePointMultiples,
            baseLifeConfig: baseLifeCfg,
        });
    }, [clsSnap, effectivePrimary, level, lifePointMultiples, baseLifeCfg]);

    const athleticismFinal = useMemo(() => {
        if (!clsSnap) return 0;
        const base = Math.max(0, Math.floor(safeNumber((skillBase as any)?.ath, 0)));
        const { fin } = getFinalSkillValue({
            base,
            primary: effectivePrimary,
            level,
            cls: clsSnap,
            skillId: "ath",
            keyStatOverride: "AGI",
        });
        return fin;
    }, [clsSnap, skillBase, effectivePrimary, level]);

    const movement = useMemo(() => {
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
    }, [effectivePrimary, athleticismFinal, movementCfg]);

    const movementRow = useMemo(() => pickMovementDistanceRow(movement.act, movementCfg?.movement?.table21 ?? null), [movement, movementCfg]);

    const presence = useMemo(() => {
        const key = String(level);
        const baseFromCfg = safeNumber(levelRules.basePresenceByLevel?.[key], NaN);
        const base = Number.isFinite(baseFromCfg) ? baseFromCfg : getBasePresenceByLevel(Math.max(1, level));
        const bonus = 0;
        return { base, bonus, act: base + bonus };
    }, [level, levelRules]);

    const resistances = useMemo(() => {
        const raceRes = raceSnap?.modifiers?.resistances ?? {};
        return getFinalResistances({
            presence: presence.act,
            primary: effectivePrimary,
            raceMods: raceRes,
        });
    }, [presence, effectivePrimary, raceSnap]);

    const allSkillIds = useMemo(() => {
        const ids = Object.keys(skillsCfg?.skillToGroup ?? {});
        ids.sort((a, b) => (SKILL_META[a]?.name ?? a).localeCompare(SKILL_META[b]?.name ?? b));
        return ids;
    }, [skillsCfg]);

    const secondaryRows = useMemo(() => {
        const entries = Object.entries(skillBase).filter(([, v]) => Number(v) > 0);
        entries.sort((a, b) => (SKILL_META[a[0]]?.name ?? a[0]).localeCompare(SKILL_META[b[0]]?.name ?? b[0]));
        return entries;
    }, [skillBase]);

    const xpNextLevel = useMemo(() => {
        const key = String(level + 1);
        return safeNumber(levelRules.xpByLevel?.[key], 0);
    }, [levelRules, level]);

    const effectiveXpForLevelUp = useMemo(() => {
        return levelUpMode ? safeNumber(data?.xp, 0) : xpCurrent;
    }, [levelUpMode, data, xpCurrent]);

    const canLevelUp = useMemo(() => {
        const cur = safeNumber(effectiveXpForLevelUp, 0);
        if (level === 0) return cur > 0;
        return xpNextLevel > 0 && cur >= xpNextLevel;
    }, [effectiveXpForLevelUp, level, xpNextLevel]);



    const pendingPatchRef = useRef<Record<string, any>>({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        if (!data || levelUpMode) return;
        if (dirty) return; // <-- do NOT overwrite local edits while user has uncommitted changes

        setXpCurrent(safeNumber(data.xp, 0));

        const fDoc = safeNumber(data?.game?.fatigueCurrent, NaN);
        setFatigueCurrent(Number.isFinite(fDoc) ? clamp(Math.floor(fDoc), 0, Math.floor(fatigueCalc.base)) : Math.floor(fatigueCalc.current));

        const lpMax = safeNumber(lifePointsCalc?.fin, 0);
        const lpDoc = safeNumber(data?.game?.lifePointsCurrent, NaN);
        setLifePointsCurrent(Number.isFinite(lpDoc) ? clamp(Math.floor(lpDoc), 0, lpMax) : lpMax);
    }, [data, fatigueCalc.base, fatigueCalc.current, lifePointsCalc?.fin, levelUpMode, dirty]);

    function queuePatch(patch: Record<string, any>) {
        pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
        setDirty(true);
        setSaveError(null);
    }

    async function commitChanges() {
        if (!uid || !id) return;
        const p = pendingPatchRef.current;
        if (!dirty || Object.keys(p).length === 0) return;

        setSaving(true);
        setSaveError(null);

        try {
            const ref = doc(db, "users", uid, "characters", id);
            await updateDoc(ref, { ...p, updatedAt: serverTimestamp() });

            pendingPatchRef.current = {};
            setDirty(false);
        } catch (e: any) {
            console.error("Commit failed:", e);
            setSaveError(e?.message ?? "Commit failed");
        } finally {
            setSaving(false);
        }
    }

    function discardChangesAndReloadFromDoc() {
        // throw away local pending patch and re-sync locals from current snapshot
        pendingPatchRef.current = {};
        setDirty(false);
        setSaveError(null);

        // IMPORTANT: only do this if we have data
        if (!data) return;

        // XP
        setXpCurrent(safeNumber(data.xp, 0));

        // fatigue current default: calculated base
        const fDoc = safeNumber(data?.game?.fatigueCurrent, NaN);
        setFatigueCurrent(Number.isFinite(fDoc) ? clamp(Math.floor(fDoc), 0, Math.floor(fatigueCalc.base)) : Math.floor(fatigueCalc.current));

        // LP current default: max final
        const lpMax = safeNumber(lifePointsCalc?.fin, 0);
        const lpDoc = safeNumber(data?.game?.lifePointsCurrent, NaN);
        setLifePointsCurrent(Number.isFinite(lpDoc) ? clamp(Math.floor(lpDoc), 0, lpMax) : lpMax);
    }

    function setGameFatigue(next: number) {
        const max = Math.floor(fatigueCalc.base);
        const v = clamp(Math.floor(next), 0, max);
        setFatigueCurrent(v);
        queuePatch({ "game.fatigueCurrent": v });
    }

    function setGameLifePoints(next: number) {
        const max = Math.floor(safeNumber(lifePointsCalc?.fin, 0));
        const v = clamp(Math.floor(next), 0, max);
        setLifePointsCurrent(v);
        queuePatch({ "game.lifePointsCurrent": v });
    }

    function setGameXp(next: number) {
        const v = Math.max(0, Math.floor(next));
        setXpCurrent(v);
        queuePatch({ xp: v });
    }

    function getAllowedStatIncreaseForNextLevel(nextLevel: number): number {
        const raw = (levelRules as any)?.raw ?? {};

        const every =
            safeNumber(raw?.statIncreaseEvery, 0) ||
            safeNumber(raw?.characteristicIncreaseEvery, 0) ||
            safeNumber(raw?.primaryIncreaseEvery, 0);

        if (every > 0) {
            return nextLevel > 0 && nextLevel % every === 0 ? 1 : 0;
        }

        const levels =
            (Array.isArray(raw?.statIncreaseLevels) ? raw.statIncreaseLevels : null) ??
            (Array.isArray(raw?.characteristicIncreaseLevels) ? raw.characteristicIncreaseLevels : null);

        if (Array.isArray(levels)) {
            return levels.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n)).includes(nextLevel) ? 1 : 0;
        }

        return 0;
    }

    const luNextLevel = level + 1;

    const luTotals = useMemo(() => {
        const oldTotal = safeNumber(data?.dp?.total, 0);
        const oldUsedPrimary = safeNumber(data?.dp?.usedPrimary, 0);
        const oldUsedSecondary = safeNumber(data?.dp?.usedSecondary, 0);
        const oldUsed = safeNumber(data?.dp?.used, oldUsedPrimary + oldUsedSecondary);

        const newTotal = safeNumber(levelRules.dpByLevel?.[String(luNextLevel)], 0);
        const addedBudget = Math.max(0, newTotal - oldUsed);

        return { oldTotal, oldUsedPrimary, oldUsedSecondary, oldUsed, newTotal, addedBudget };
    }, [data, levelRules, luNextLevel]);

    function skillGroupOf(skillId: string): string {
        return (skillsCfg?.skillToGroup?.[skillId] ?? "special") as string;
    }

    function dpCostForSkill(skillId: string, cls: any): number {
        const reduced = cls?.dpCosts?.reducedCosts?.skills?.[skillId];
        if (typeof reduced === "number" && Number.isFinite(reduced)) return Math.floor(reduced);

        const group = skillGroupOf(skillId);
        const groupCost = cls?.dpCosts?.secondaryGroups?.[group];
        return safeNumber(groupCost, 2);
    }

    function dpCostForPrimaryAbility(id: CombatAbilityKey, cls: any): number {
        const v = cls?.dpCosts?.primary?.[id];
        return safeNumber(v, 2);
    }

    function lpMultipleCost(cls: any): number {
        const v = cls?.dpCosts?.lp?.multiples;
        const n = Number(v);
        return Number.isFinite(n) && n > 0 ? Math.floor(n) : 20;
    }

    const luDpState = useMemo(() => {
        if (!levelUpMode || !clsSnap || !luCombatBase || !luSkillBase) return null;

        const baseUsed = luTotals.oldUsed;

        let usedCombat = 0;
        for (const id of ["attack", "block", "dodge", "wearArmor"] as CombatAbilityKey[]) {
            const b = Math.max(0, Math.floor(safeNumber(luCombatBase[id], 0)));
            usedCombat += b * dpCostForPrimaryAbility(id, clsSnap);
        }

        let usedSecondary = 0;
        for (const [skillId, base] of Object.entries(luSkillBase)) {
            const b = Math.max(0, Math.floor(safeNumber(base, 0)));
            if (b <= 0) continue;
            usedSecondary += b * dpCostForSkill(skillId, clsSnap);
        }

        const mult = Math.max(0, Math.floor(safeNumber(luLifePointMultiples, 0)));
        const usedLp = mult * lpMultipleCost(clsSnap);

        const usedPrimary = usedCombat + usedLp;
        const usedTotal = usedPrimary + usedSecondary;

        const newSpent = Math.max(0, usedTotal - baseUsed);
        const remaining = Math.max(0, luTotals.addedBudget - newSpent);

        const combatCap = Math.floor(luTotals.newTotal * 0.5);
        const combatRemaining = Math.max(0, combatCap - usedCombat);

        return {
            usedCombat,
            usedSecondary,
            usedLp,
            usedPrimary,
            usedTotal,
            newSpent,
            remaining,
            combatCap,
            combatRemaining,
        };
    }, [levelUpMode, clsSnap, luCombatBase, luSkillBase, luLifePointMultiples, luTotals]);

    function startLevelUp() {
        if (!data) return;
        if (!clsSnap) return;

        setLevelUpMode(true);

        setLuPrimary({ ...primaryNormalized });
        setLuCombatBase({
            attack: Math.max(0, Math.floor(safeNumber((combatBase as any).attack, 0))),
            block: Math.max(0, Math.floor(safeNumber((combatBase as any).block, 0))),
            dodge: Math.max(0, Math.floor(safeNumber((combatBase as any).dodge, 0))),
            wearArmor: Math.max(0, Math.floor(safeNumber((combatBase as any).wearArmor, 0))),
        });

        const nextSkills: Record<string, number> = {};
        for (const sid of allSkillIds) {
            const cur = Math.max(0, Math.floor(safeNumber((skillBase as any)[sid], 0)));
            nextSkills[sid] = cur;
        }
        for (const [k, v] of Object.entries(skillBase)) {
            if (!(k in nextSkills)) nextSkills[k] = Math.max(0, Math.floor(safeNumber(v, 0)));
        }
        setLuSkillBase(nextSkills);

        setLuLifePointMultiples(lifePointMultiples);

        setLuStatIncUsed(0);
        setLuStatIncKey(null);
    }

    function cancelLevelUp() {
        setLevelUpMode(false);
        setLuPrimary(null);
        setLuCombatBase(null);
        setLuSkillBase(null);
        setLuLifePointMultiples(0);
        setLuStatIncKey(null);
        setLuStatIncUsed(0);
    }

    function luSetSkillBase(skillId: string, nextRaw: number) {
        if (!clsSnap || !luSkillBase || !luDpState) return;

        const prev = Math.max(0, Math.floor(safeNumber(luSkillBase[skillId], 0)));
        const next = Math.max(0, Math.floor(safeNumber(nextRaw, 0)));

        const baseline = Math.max(0, Math.floor(safeNumber((skillBase as any)[skillId], 0)));

        let target = next;
        if (target < baseline) target = baseline;

        if (target <= prev) {
            setLuSkillBase({ ...luSkillBase, [skillId]: target });
            return;
        }

        const cost = dpCostForSkill(skillId, clsSnap);
        const delta = target - prev;
        const canAdd = cost > 0 ? Math.floor(luDpState.remaining / cost) : delta;
        const add = Math.max(0, Math.min(delta, canAdd));
        setLuSkillBase({ ...luSkillBase, [skillId]: prev + add });
    }

    function luSetCombatBase(id: CombatAbilityKey, nextRaw: number) {
        if (!clsSnap || !luCombatBase || !luDpState) return;

        const prev = Math.max(0, Math.floor(safeNumber(luCombatBase[id], 0)));
        const next = Math.max(0, Math.floor(safeNumber(nextRaw, 0)));

        const baseline = Math.max(0, Math.floor(safeNumber((combatBase as any)[id], 0)));

        let target = next;
        if (target < baseline) target = baseline;

        if (target <= prev) {
            setLuCombatBase({ ...luCombatBase, [id]: target });
            return;
        }

        const cost = dpCostForPrimaryAbility(id, clsSnap);
        const delta = target - prev;

        const byTotal = cost > 0 ? Math.floor(luDpState.remaining / cost) : delta;
        const byCombat = cost > 0 ? Math.floor(luDpState.combatRemaining / cost) : delta;
        const canAdd = Math.max(0, Math.min(byTotal, byCombat));

        const add = Math.max(0, Math.min(delta, canAdd));
        setLuCombatBase({ ...luCombatBase, [id]: prev + add });
    }

    function luSetLifePointMultiples(nextRaw: number) {
        if (!clsSnap || !luDpState) return;

        const prev = Math.max(0, Math.floor(safeNumber(luLifePointMultiples, 0)));
        const next = Math.max(0, Math.floor(safeNumber(nextRaw, 0)));

        const baseline = lifePointMultiples;

        let target = next;
        if (target < baseline) target = baseline;

        if (target <= prev) {
            setLuLifePointMultiples(target);
            return;
        }

        const cost = lpMultipleCost(clsSnap);
        const delta = target - prev;
        const canAdd = cost > 0 ? Math.floor(luDpState.remaining / cost) : delta;
        const add = Math.max(0, Math.min(delta, canAdd));
        setLuLifePointMultiples(prev + add);
    }

    function luIncPrimaryStat(k: StatKey) {
        const allow = getAllowedStatIncreaseForNextLevel(luNextLevel);
        if (!luPrimary) return;
        if (allow <= 0) return;

        if (luStatIncUsed >= allow && luStatIncKey !== k) return;

        const cur = safeNumber((luPrimary as any)[k], 5);
        if (cur >= 20) return;

        let nextPrimary: PrimaryStats = { ...luPrimary };
        if (luStatIncKey && luStatIncKey !== k) {
            const prevVal = safeNumber((nextPrimary as any)[luStatIncKey], 5);
            nextPrimary[luStatIncKey] = clamp(prevVal - 1, 1, 20);
        }

        nextPrimary[k] = clamp(cur + 1, 1, 20);
        setLuPrimary(nextPrimary);
        setLuStatIncKey(k);
        setLuStatIncUsed(1);
    }

    function luDecPrimaryStat(k: StatKey) {
        if (!luPrimary) return;
        if (luStatIncKey !== k) return;

        const cur = safeNumber((luPrimary as any)[k], 5);
        const base = safeNumber((primaryNormalized as any)[k], 5);
        if (cur <= base) return;

        const next = { ...luPrimary, [k]: clamp(cur - 1, 1, 20) };
        setLuPrimary(next);
        setLuStatIncKey(null);
        setLuStatIncUsed(0);
    }

    async function finishLevelUp() {
        if (!uid || !id || !data || !clsSnap || !luPrimary || !luCombatBase || !luSkillBase) return;

        const allow = getAllowedStatIncreaseForNextLevel(luNextLevel);
        if (allow > 0 && luStatIncUsed < allow) return;

        const ref = doc(db, "users", uid, "characters", id);

        const usedCombat =
            Math.max(0, luCombatBase.attack) * dpCostForPrimaryAbility("attack", clsSnap) +
            Math.max(0, luCombatBase.block) * dpCostForPrimaryAbility("block", clsSnap) +
            Math.max(0, luCombatBase.dodge) * dpCostForPrimaryAbility("dodge", clsSnap) +
            Math.max(0, luCombatBase.wearArmor) * dpCostForPrimaryAbility("wearArmor", clsSnap);

        let usedSecondary = 0;
        for (const [sid, b] of Object.entries(luSkillBase)) {
            const bb = Math.max(0, Math.floor(safeNumber(b, 0)));
            if (bb <= 0) continue;
            usedSecondary += bb * dpCostForSkill(sid, clsSnap);
        }

        const usedLp = Math.max(0, Math.floor(luLifePointMultiples)) * lpMultipleCost(clsSnap);

        const usedPrimary = usedCombat + usedLp;
        const used = usedPrimary + usedSecondary;

        const newTotalDp = safeNumber(levelRules.dpByLevel?.[String(luNextLevel)], safeNumber(data.dp?.total, 0));
        const remaining = Math.max(0, newTotalDp - used);

        const compactSkills: Record<string, number> = {};
        for (const [sid, b] of Object.entries(luSkillBase)) {
            const bb = Math.max(0, Math.floor(safeNumber(b, 0)));
            if (bb > 0) compactSkills[sid] = bb;
        }

        try {
            await updateDoc(ref, {
                level: luNextLevel,

                primary: luPrimary,
                secondary: { skillBase: compactSkills },

                combat: {
                    ...(data.combat ?? {}),
                    attack: { ...(data.combat?.attack ?? {}), base: Math.max(0, Math.floor(luCombatBase.attack)) },
                    block: { ...(data.combat?.block ?? {}), base: Math.max(0, Math.floor(luCombatBase.block)) },
                    dodge: { ...(data.combat?.dodge ?? {}), base: Math.max(0, Math.floor(luCombatBase.dodge)) },
                    wearArmor: { ...(data.combat?.wearArmor ?? {}), base: Math.max(0, Math.floor(luCombatBase.wearArmor)) },
                    lifePoints: { ...(data.combat?.lifePoints ?? {}), multiples: Math.max(0, Math.floor(luLifePointMultiples)) },
                },

                dp: {
                    total: newTotalDp,
                    usedPrimary,
                    usedSecondary,
                    used,
                    remaining,
                },

                updatedAt: serverTimestamp(),
            });

            cancelLevelUp();
        } catch (e: any) {
            console.error(e);
            alert(e?.message ?? "Finish Level Up failed");
        }
    }

    const selectedAdvantages = useMemo<SelectedChoice[]>(
        () => (Array.isArray((data as any)?.advantages) ? ((data as any).advantages as SelectedChoice[]) : []),
        [data]
    );

    const selectedDisadvantages = useMemo<SelectedChoice[]>(
        () => (Array.isArray((data as any)?.disadvantages) ? ((data as any).disadvantages as SelectedChoice[]) : []),
        [data]
    );

    const advantageIndex = useMemo<Record<string, AdvantageDef>>(() => {
        const out: Record<string, AdvantageDef> = {};
        for (const a of advantages) out[a.id] = a;
        return out;
    }, [advantages]);

    const disadvantageIndex = useMemo<Record<string, DisadvantageDef>>(() => {
        const out: Record<string, DisadvantageDef> = {};
        for (const d of disadvantages) out[d.id] = d;
        return out;
    }, [disadvantages]);

    const cp = useMemo(() => {
        const baseTotal = 3;
        const earnedCap = 3;

        let spentOnAdvantages = 0;
        for (const sel of selectedAdvantages) {
            const def = advantageIndex[sel.id];
            spentOnAdvantages += def ? resolveAdvantageCost(def, sel ?? null) : 0;
        }

        let earnedRaw = 0;
        for (const sel of selectedDisadvantages) {
            const def = disadvantageIndex[sel.id];
            earnedRaw += def ? resolveDisadvantageGain(def, sel ?? null) : 0;
        }

        const earnedEffective = Math.min(earnedCap, Math.max(0, earnedRaw));
        const baseRemaining = Math.max(0, baseTotal - spentOnAdvantages);
        const earnedSpent = Math.max(0, spentOnAdvantages - baseTotal);
        const earnedRemaining = Math.max(0, earnedEffective - earnedSpent);

        const remainingTotal = baseRemaining + earnedRemaining;

        return {
            baseTotal,
            earnedCap,
            earnedEffective,
            spentOnAdvantages,
            baseRemaining,
            earnedRemaining,
            remainingTotal,
        };
    }, [selectedAdvantages, selectedDisadvantages, advantageIndex, disadvantageIndex]);

    if (!uid) {
        return (
            <div className="login-page">
                <div style={{ padding: 24, color: "var(--text)" }}>Please log in…</div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="login-page">
                <div style={{ padding: 24, color: "var(--text)" }}>Loading character…</div>
            </div>
        );
    }

    if (err) {
        return (
            <div className="login-page">
                <div className="main-content-wrapper">
                    <div className="main-content">
                        <div className="onboarding-sign-up">
                            <div className="div dashboard-card creator-card">
                                <div className="header-2">
                                    <p className="p">Character Game</p>
                                    <p className="text-wrapper-2">{err}</p>
                                </div>
                                <div className="dashboard-actions">
                                    <button className="logout-link" type="button" onClick={() => navigate("/dashboard")}>
                                        Back
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="basic-footer" />
            </div>
        );
    }

    if (!data) return null;

    const lpMax = safeNumber(lifePointsCalc?.fin, 0);
    const allowStatInc = getAllowedStatIncreaseForNextLevel(luNextLevel);
    const finishDisabled = allowStatInc > 0 && luStatIncUsed < allowStatInc;

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
                                <p className="p">{data.name}</p>
                                <p className="text-wrapper-2">
                                    {levelUpMode ? (
                                        <>
                                            <strong style={{ color: "var(--accent)" }}>LEVEL UP MODE</strong> • Target Level {luNextLevel}
                                        </>
                                    ) : (
                                        <>
                                            Level {data.level} • {data.className} {data.archetype ? `(${data.archetype})` : ""}
                                        </>
                                    )}
                                </p>
                            </div>

                            {/* COMMIT BAR */}
                            <div className="dashboard-actions" style={{ gap: 12, marginTop: 14, alignItems: "center" }}>
                                <button
                                    className="logout-link"
                                    type="button"
                                    onClick={commitChanges}
                                    disabled={!dirty || saving}
                                    title={!dirty ? "No local changes to commit." : "Write changes to Firestore."}
                                >
                                    {saving ? "Saving..." : "Commit"}
                                </button>

                                <button
                                    className="logout-link"
                                    type="button"
                                    onClick={discardChangesAndReloadFromDoc}
                                    disabled={!dirty || saving}
                                    title="Discard local edits and reload values from Firestore snapshot."
                                >
                                    Discard
                                </button>

                                {dirty ? (
                                    <span className="mini warn" style={{ margin: 0 }}>
                                                Unsaved local changes
                                            </span>
                                ) : saveError ? (
                                    <span className="mini warn" style={{ margin: 0 }}>
                                                {saveError}
                                            </span>
                                ) : null}
                            </div>

                            {/* PRIMARY */}
                            <div className="creator-section">
                                <div className="section-title">Primary Characteristics</div>

                                {levelUpMode ? (
                                    <>
                                        <div className="mini">
                                            DP (new level): total <strong>{luTotals.newTotal}</strong> • baseline used <strong>{luTotals.oldUsed}</strong> • budget to spend{" "}
                                            <strong>{luTotals.addedBudget}</strong>
                                            {luDpState ? (
                                                <>
                                                    {" "}
                                                    • spent now <strong>{luDpState.newSpent}</strong> • remaining <strong>{luDpState.remaining}</strong> • combat cap{" "}
                                                    <strong>{luDpState.combatCap}</strong>
                                                </>
                                            ) : null}
                                        </div>

                                        {allowStatInc > 0 ? (
                                            <div className="mini">
                                                Free characteristic increase: <strong>{luStatIncUsed}</strong>/<strong>{allowStatInc}</strong>{" "}
                                                <span className="muted">• You can increase exactly one stat by +1.</span>
                                            </div>
                                        ) : (
                                            <div className="mini muted">No free characteristic increase at this level (based on levelrules).</div>
                                        )}

                                        <div className="char-grid" style={{ marginTop: 12 }}>
                                            {STAT_KEYS.map((k) => {
                                                const baseV = safeNumber((primaryNormalized as any)[k], 5);
                                                const v = safeNumber((luPrimary as any)?.[k], baseV);

                                                const canInc = allowStatInc > 0 && (luStatIncUsed < allowStatInc || luStatIncKey === k) && v < 20;
                                                const canDec = luStatIncKey === k && v > baseV;

                                                return (
                                                    <div key={k} className="pill" style={{ justifyContent: "space-between", width: "100%" }}>
                            <span style={{ opacity: 0.9 }}>
                              {STAT_LABEL[k]} <span style={{ opacity: 0.7 }}>({k})</span>
                            </span>

                                                        <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
                              <span style={{ opacity: 0.85 }}>
                                Bon: <strong style={{ color: "var(--accent)" }}>{formatSigned(statBonus(v))}</strong>
                              </span>

                              <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                                <button className="stepper-btn" type="button" onClick={() => luDecPrimaryStat(k)} disabled={!canDec}>
                                  −
                                </button>
                                <strong style={{ minWidth: 18, textAlign: "center" }}>{v}</strong>
                                <button className="stepper-btn" type="button" onClick={() => luIncPrimaryStat(k)} disabled={!canInc}>
                                  +
                                </button>
                              </span>
                            </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="char-grid">
                                            {STAT_KEYS.map((k: StatKey) => {
                                                const baseV = safeNumber((primaryNormalized as any)[k], 5);
                                                const effV = safeNumber((effectivePrimary as any)[k], baseV);

                                                return (
                                                    <div key={k} className="pill" style={{ justifyContent: "space-between", width: "100%" }}>
                                                        <span style={{ opacity: 0.9 }}>
                                                            {STAT_LABEL[k]} <span style={{ opacity: 0.7 }}>({k})</span>
                                                        </span>

                                                        <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
                                                        <span style={{ display: "inline-flex", gap: 6, alignItems: "baseline" }}>
                                                            <strong>{effV}</strong>
                                                            {effV !== baseV ? <span className="muted">({baseV} base)</span> : null}
                                                        </span>

                                                            <span style={{ opacity: 0.85 }}>
                                                                Bon: <strong style={{ color: "var(--accent)" }}>{formatSigned(statBonus(effV))}</strong>
                                                            </span>
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* GAME BAR (Initiative removed from editing) */}
                                        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: 16 }}>
                                            {/* Fatigue */}
                                            <div className="skill-row primary-card" style={{ alignItems: "stretch" }}>
                                                <div className="skill-left">
                                                    <div className="skill-name">Fatigue</div>
                                                    <div className="skill-sub">
                                                        Current <strong>{fatigueCurrent}</strong> / Max <strong>{Math.floor(fatigueCalc.base)}</strong>
                                                        <span className="muted"> • </span>
                                                        Exhaustion Pen <strong>{formatSigned(fatigueCalc.penalty)}</strong>
                                                    </div>
                                                </div>
                                                <div className="skill-controls">
                                                    <NumberStepper value={fatigueCurrent} min={0} max={Math.floor(fatigueCalc.base)} onChange={setGameFatigue} />
                                                </div>
                                            </div>

                                            {/* XP */}
                                            <div className="skill-row primary-card" style={{ alignItems: "stretch" }}>
                                                <div className="skill-left">
                                                    <div className="skill-name">XP</div>
                                                    <div className="skill-sub">
                                                        Current <strong>{xpCurrent}</strong>
                                                        {xpNextLevel > 0 ? (
                                                            <>
                                                                <span className="muted"> • </span>
                                                                Next level at <strong>{xpNextLevel}</strong> ({Math.max(0, xpNextLevel - xpCurrent)} remaining)
                                                            </>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <div className="skill-controls">
                                                    <NumberStepper value={xpCurrent} min={0} step={1} onChange={setGameXp} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Life Points current editable */}
                                        <div style={{ marginTop: 16 }}>
                                            <div className="skill-row primary-card" style={{ alignItems: "stretch" }}>
                                                <div className="skill-left">
                                                    <div className="skill-name">Life Points</div>
                                                    <div className="skill-sub">
                                                        Current <strong>{lifePointsCurrent}</strong> / Max <strong>{lpMax}</strong>
                                                        {lifePointsCalc ? (
                                                            <>
                                                                <span className="muted"> • </span>
                                                                Base <strong>{lifePointsCalc.base}</strong> • Class <strong>{formatSigned(lifePointsCalc.classBon)}</strong> • Multiples{" "}
                                                                <strong>{formatSigned(lifePointsCalc.multAdd)}</strong>
                                                            </>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <div className="skill-controls">
                                                    <NumberStepper value={lifePointsCurrent} min={0} max={lpMax} onChange={setGameLifePoints} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Initiative (read-only) UNDER Life Points */}
                                        <div style={{ marginTop: 16 }}>
                                            <div className="skill-row primary-card" style={{ alignItems: "stretch" }}>
                                                <div className="skill-left">
                                                    <div className="skill-name">Initiative</div>
                                                    <div className="skill-sub">
                                                        Calculated <strong>{safeNumber(initCalc?.final, 0)}</strong>
                                                        <span className="muted"> • </span>
                                                        unarmed
                                                    </div>
                                                </div>
                                                <div className="skill-controls">
                                                    <div className="pill" style={{ justifyContent: "center", minWidth: 120 }}>
                                                        <strong>{safeNumber(initCalc?.final, 0)}</strong>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* quick context line (movement) */}
                                        <div className="mini" style={{ marginTop: 12 }}>
                                            Movement: <strong>{movement.act}</strong>
                                            {movementRow ? (
                                                <span style={{ opacity: 0.85 }}>
                                                    {" "}
                                                    • Distance/turn <strong>{movementRow.distanceFeet}</strong>
                                                    {typeof movementRow.distanceFeet === "number" ? " ft" : ""}
                                                    {movementRow.require ? <span className="muted"> ({movementRow.require})</span> : null}
                                                </span>
                                            ) : null}
                                        </div>

                                        {/* Level up entry */}
                                        {canLevelUp ? (
                                            <div className="dashboard-actions" style={{ gap: 12, marginTop: 14 }}>
                                                <button className="logout-link" type="button" onClick={startLevelUp}>
                                                    Start Level Up (to Level {luNextLevel})
                                                </button>
                                            </div>
                                        ) : null}
                                    </>
                                )}
                            </div>

                            {!levelUpMode ? (
                                <>
                                    {/* Primary abilities (display only) */}
                                    <div className="creator-section">
                                        <div className="section-title">Primary Abilities</div>

                                        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                                            {/* Life Points final (computed, display) */}
                                            <div className="skill-row primary-row" style={{ alignItems: "stretch" }}>
                                                <div className="skill-left">
                                                    <div className="skill-name">Life Points</div>

                                                    {lifePointsCalc ? (
                                                        <>
                                                            <div className="skill-sub">
                                                                Multiples <strong>{lifePointMultiples}</strong>
                                                                <span className="muted"> • </span>
                                                                (stored)
                                                            </div>

                                                            <div className="skill-sub">
                                                                Base <strong>{lifePointsCalc.base}</strong> + Class <strong>{formatSigned(lifePointsCalc.classBon)}</strong> + Multiples{" "}
                                                                <strong>{formatSigned(lifePointsCalc.multAdd)}</strong> = Final{" "}
                                                                <strong style={{ color: "var(--accent)" }}>{lifePointsCalc.fin}</strong>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="mini muted">No class snapshot / baselife config yet.</div>
                                                    )}
                                                </div>

                                                <div className="skill-controls">
                                                    <div className="pill" style={{ justifyContent: "center", minWidth: 120 }}>
                                                        <strong>{lifePointsCalc?.fin ?? 0}</strong>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Wear Armor */}
                                            {(() => {
                                                const id0 = "wearArmor" as CombatAbilityKey;
                                                const base = Math.max(0, Math.floor(safeNumber((combatBase as any)[id0], 0)));

                                                if (!clsSnap) {
                                                    return (
                                                        <div className="skill-row primary-row" style={{ alignItems: "stretch" }}>
                                                            <div className="skill-left">
                                                                <div className="skill-name">Wear Armor</div>
                                                                <div className="mini muted">Missing class snapshot.</div>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                const res = getFinalPrimaryAbility({
                                                    id: id0,
                                                    base,
                                                    primary: effectivePrimary,
                                                    level,
                                                    cls: clsSnap,
                                                    special: 0,
                                                });

                                                return (
                                                    <div className="skill-row primary-row" style={{ alignItems: "stretch" }}>
                                                        <div className="skill-left">
                                                            <div className="skill-name">
                                                                Wear Armor <span className="muted">{res.keyStat}</span>
                                                            </div>

                                                            <div className="skill-sub">
                                                                Base <strong>{res.base}</strong> + Stat <strong>{formatSigned(res.statBon)}</strong> + Special{" "}
                                                                <strong>{formatSigned(res.special)}</strong> + Class <strong>{formatSigned(res.classBon)}</strong> = Final{" "}
                                                                <strong style={{ color: "var(--accent)" }}>{res.fin}</strong>
                                                            </div>
                                                        </div>

                                                        <div className="skill-controls">
                                                            <div className="pill" style={{ justifyContent: "center", minWidth: 120 }}>
                                                                <strong>{res.fin}</strong>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* attack/block/dodge */}
                                        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(3, minmax(0, 1fr))", marginTop: 16 }}>
                                            {(["attack", "block", "dodge"] as CombatAbilityKey[]).map((id0) => {
                                                const base = Math.max(0, Math.floor(safeNumber((combatBase as any)[id0], 0)));
                                                const title = id0 === "attack" ? "Attack" : id0 === "block" ? "Block" : "Dodge";

                                                if (!clsSnap) {
                                                    return (
                                                        <div key={id0} className="skill-row primary-row" style={{ alignItems: "stretch" }}>
                                                            <div className="skill-left">
                                                                <div className="skill-name">{title}</div>
                                                                <div className="mini muted">Missing class snapshot.</div>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                const res = getFinalPrimaryAbility({
                                                    id: id0,
                                                    base,
                                                    primary: effectivePrimary,
                                                    level,
                                                    cls: clsSnap,
                                                    special: 0,
                                                });

                                                return (
                                                    <div key={id0} className="skill-row primary-row" style={{ alignItems: "stretch" }}>
                                                        <div className="skill-left">
                                                            <div className="skill-name">
                                                                {title} <span className="muted">{res.keyStat}</span>
                                                            </div>

                                                            <div className="skill-sub">
                                                                Base <strong>{res.base}</strong> + Stat <strong>{formatSigned(res.statBon)}</strong> + Special{" "}
                                                                <strong>{formatSigned(res.special)}</strong> + Class <strong>{formatSigned(res.classBon)}</strong> = Final{" "}
                                                                <strong style={{ color: "var(--accent)" }}>{res.fin}</strong>
                                                            </div>
                                                        </div>

                                                        <div className="skill-controls">
                                                            <div className="pill" style={{ justifyContent: "center", minWidth: 120 }}>
                                                                <strong>{res.fin}</strong>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Secondary abilities (display) */}
                                    <div className="creator-section">
                                        <div className="section-title">Secondary Abilities</div>

                                        {secondaryRows.length === 0 ? (
                                            <div className="mini">No Base points yet.</div>
                                        ) : (
                                            <div className="skills-grid">
                                                {secondaryRows.map(([skillId, v]) => {
                                                    const base = Math.max(0, Math.floor(safeNumber(v, 0)));
                                                    const perLevel = clsSnap ? getClassSkillBonusPerLevel(clsSnap, skillId) : 0;

                                                    const { bon, cls, fin, keyStat } = getFinalSkillValue({
                                                        base,
                                                        primary: effectivePrimary,
                                                        level,
                                                        cls: clsSnap,
                                                        skillId,
                                                        keyStatOverride: SKILL_META[skillId]?.keyStat,
                                                    });

                                                    return (
                                                        <div key={skillId} className="skill-row">
                                                            <div className="skill-left">
                                                                <div className="skill-name">
                                                                    {SKILL_META[skillId]?.name ?? skillId.toUpperCase()} <span className="muted">{keyStat || "—"}</span>
                                                                </div>

                                                                <div className="skill-sub">
                                                                    Bon <strong>{formatSigned(bon)}</strong>
                                                                    <span className="muted"> • </span>
                                                                    Class <strong>{perLevel ? `${formatSigned(perLevel)}/lvl` : "+0/lvl"}</strong>
                                                                </div>

                                                                <div className="skill-sub">
                                                                    Base <strong>{base}</strong> + Bon <strong>{formatSigned(bon)}</strong> + Class <strong>{formatSigned(cls)}</strong> = Final{" "}
                                                                    <strong style={{ color: "var(--accent)" }}>{fin}</strong>
                                                                </div>
                                                            </div>

                                                            <div className="skill-controls">
                                                                <div className="pill" style={{ justifyContent: "center", minWidth: 120 }}>
                                                                    <strong>{fin}</strong>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Presence + Resistances */}
                                    <div className="creator-section">
                                        <div className="section-title">Presence & Resistances</div>

                                        <div className="mini">
                                            Presence: <strong>{presence.act}</strong>
                                            <span style={{ opacity: 0.85 }}> • Base {presence.base}</span>
                                        </div>

                                        {resistances && (
                                            <div className="char-grid">
                                                {buildResistanceEntries(resistances).map((r) => (
                                                    <div key={r.key} className="pill" style={{ justifyContent: "space-between" }}>
                                                        <span>{r.label}</span>
                                                        <strong>{r.value}</strong>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Advantages / Disadvantages */}
                                    <div className="creator-section">
                                        <div className="section-title">Advantages & Disadvantages</div>

                                        <div className="mini">
                                            CP: Base <strong>{cp.baseTotal}</strong>{" "}
                                            <span className="muted">
                        (remaining <strong>{cp.baseRemaining}</strong>)
                      </span>{" "}
                                            • Earned <strong>{cp.earnedEffective}</strong>/<strong>{cp.earnedCap}</strong>{" "}
                                            <span className="muted">
                        (remaining <strong>{cp.earnedRemaining}</strong>)
                      </span>{" "}
                                            • Spent <strong>{cp.spentOnAdvantages}</strong> • Remaining <strong>{cp.remainingTotal}</strong>
                                        </div>

                                        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: 10 }}>
                                            {/* Advantages */}
                                            <div>
                                                <div className="mini" style={{ opacity: 0.9, marginBottom: 8 }}>
                                                    <strong>Advantages</strong>
                                                </div>

                                                {selectedAdvantages.length === 0 ? (
                                                    <div className="mini">No advantages selected.</div>
                                                ) : (
                                                    <div style={{ display: "grid", gap: 10 }}>
                                                        {selectedAdvantages.map((sel) => {
                                                            const def = advantageIndex[sel.id];
                                                            const label = getItemLabel(def ?? sel);
                                                            const cost = def ? resolveAdvantageCost(def, sel ?? null) : 0;

                                                            return (
                                                                <div key={sel.id} className="skill-row" style={{ flexDirection: "column", gap: 6 }}>
                                                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                                                                        <div className="skill-name" style={{ margin: 0 }}>
                                                                            {label}
                                                                        </div>

                                                                        <div className="pill" style={{ justifyContent: "center", minWidth: 90 }}>
                                                                            <strong>-{cost} CP</strong>
                                                                        </div>
                                                                    </div>

                                                                    <div className="skill-sub">
                                                                        {def ? getItemDescription(def) || <span className="muted">No description.</span> : <span className="muted">Missing config entry.</span>}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Disadvantages */}
                                            <div>
                                                <div className="mini" style={{ opacity: 0.9, marginBottom: 8 }}>
                                                    <strong>Disadvantages</strong>
                                                </div>

                                                {selectedDisadvantages.length === 0 ? (
                                                    <div className="mini">No disadvantages selected.</div>
                                                ) : (
                                                    <div style={{ display: "grid", gap: 10 }}>
                                                        {selectedDisadvantages.map((sel) => {
                                                            const def = disadvantageIndex[sel.id];
                                                            const label = getItemLabel(def ?? sel);
                                                            const gain = def ? resolveDisadvantageGain(def, sel ?? null) : 0;

                                                            return (
                                                                <div key={sel.id} className="skill-row" style={{ flexDirection: "column", gap: 6 }}>
                                                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                                                                        <div className="skill-name" style={{ margin: 0 }}>
                                                                            {label}
                                                                        </div>

                                                                        <div className="pill" style={{ justifyContent: "center", minWidth: 90 }}>
                                                                            <strong>+{gain} CP</strong>
                                                                        </div>
                                                                    </div>

                                                                    <div className="skill-sub">
                                                                        {def ? getItemDescription(def) || <span className="muted">No description.</span> : <span className="muted">Missing config entry.</span>}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : null}

                            {levelUpMode ? (
                                <>
                                    <div className="creator-section">
                                        <div className="section-title">Level Up • Spend DP</div>

                                        <div className="mini">
                                            You can allocate the new DP between <strong>Primary Abilities</strong> and <strong>Secondary Abilities</strong>. Old allocations are locked (you
                                            can’t go below the saved values).
                                        </div>

                                        <div className="mini">
                                            Remaining DP to spend: <strong>{luDpState?.remaining ?? 0}</strong>
                                            <span className="muted"> • </span>
                                            Combat cap remaining: <strong>{luDpState?.combatRemaining ?? 0}</strong>
                                        </div>

                                        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: 12 }}>
                                            <div className="skill-row primary-card" style={{ alignItems: "stretch" }}>
                                                <div className="skill-left">
                                                    <div className="skill-name">Life Points (Multiples)</div>
                                                    <div className="skill-sub">
                                                        Multiples <strong>{luLifePointMultiples}</strong>
                                                        <span className="muted"> • </span>
                                                        Cost <strong>{clsSnap ? lpMultipleCost(clsSnap) : 20} DP/multiple</strong>
                                                    </div>
                                                </div>
                                                <div className="skill-controls">
                                                    <NumberStepper value={luLifePointMultiples} min={lifePointMultiples} step={1} onChange={luSetLifePointMultiples} />
                                                </div>
                                            </div>

                                            <div className="skill-row primary-card" style={{ alignItems: "stretch" }}>
                                                <div className="skill-left">
                                                    <div className="skill-name">Wear Armor</div>
                                                    <div className="skill-sub">
                                                        Base <strong>{luCombatBase?.wearArmor ?? 0}</strong>
                                                        <span className="muted"> • </span>
                                                        Cost <strong>{clsSnap ? dpCostForPrimaryAbility("wearArmor", clsSnap) : 2} DP/base</strong>
                                                    </div>
                                                </div>
                                                <div className="skill-controls">
                                                    <NumberStepper
                                                        value={luCombatBase?.wearArmor ?? 0}
                                                        min={Math.max(0, Math.floor(safeNumber((combatBase as any).wearArmor, 0)))}
                                                        step={1}
                                                        onChange={(v) => luSetCombatBase("wearArmor", v)}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(3, minmax(0, 1fr))", marginTop: 16 }}>
                                            {(["attack", "block", "dodge"] as CombatAbilityKey[]).map((id0) => {
                                                const title = id0 === "attack" ? "Attack" : id0 === "block" ? "Block" : "Dodge";
                                                const baseline = Math.max(0, Math.floor(safeNumber((combatBase as any)[id0], 0)));
                                                const cur = Math.max(0, Math.floor(safeNumber((luCombatBase as any)?.[id0], 0)));
                                                const cost = clsSnap ? dpCostForPrimaryAbility(id0, clsSnap) : 2;

                                                return (
                                                    <div key={id0} className="skill-row primary-card" style={{ alignItems: "stretch" }}>
                                                        <div className="skill-left">
                                                            <div className="skill-name">{title}</div>
                                                            <div className="skill-sub">
                                                                Base <strong>{cur}</strong>
                                                                <span className="muted"> • </span>
                                                                Cost <strong>{cost} DP/base</strong>
                                                            </div>
                                                            <div className="skill-sub muted">Minimum is the saved value ({baseline}).</div>
                                                        </div>

                                                        <div className="skill-controls">
                                                            <NumberStepper value={cur} min={baseline} step={1} onChange={(v) => luSetCombatBase(id0, v)} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="creator-section">
                                        <div className="section-title">Secondary Abilities</div>

                                        <div className="mini">All secondary skills are shown during level-up, so you can invest into skills you previously had at 0.</div>

                                        <div className="skills-grid" style={{ marginTop: 12 }}>
                                            {allSkillIds.map((skillId) => {
                                                const baseline = Math.max(0, Math.floor(safeNumber((skillBase as any)[skillId], 0)));
                                                const cur = Math.max(0, Math.floor(safeNumber((luSkillBase as any)?.[skillId], 0)));
                                                const cost = clsSnap ? dpCostForSkill(skillId, clsSnap) : 2;

                                                const finPreview = clsSnap
                                                    ? getFinalSkillValue({
                                                        base: cur,
                                                        primary: applyRacePrimaryMods(luPrimary ?? primaryNormalized, raceSnap),
                                                        level: luNextLevel,
                                                        cls: clsSnap,
                                                        skillId,
                                                        keyStatOverride: SKILL_META[skillId]?.keyStat,
                                                    }).fin
                                                    : cur;

                                                const perLevel = clsSnap ? getClassSkillBonusPerLevel(clsSnap, skillId) : 0;

                                                return (
                                                    <div key={skillId} className="skill-row">
                                                        <div className="skill-left">
                                                            <div className="skill-name">
                                                                {SKILL_META[skillId]?.name ?? skillId.toUpperCase()} <span className="muted">{SKILL_META[skillId]?.keyStat ?? "—"}</span>
                                                            </div>

                                                            <div className="skill-sub">
                                                                Cost <strong>{cost} DP/base</strong>
                                                                <span className="muted"> • </span>
                                                                Class <strong>{perLevel ? `${formatSigned(perLevel)}/lvl` : "+0/lvl"}</strong>
                                                            </div>

                                                            <div className="skill-sub">
                                                                Base <strong>{cur}</strong> <span className="muted">(min {baseline})</span> • Preview Final @ Lv {luNextLevel}:{" "}
                                                                <strong style={{ color: "var(--accent)" }}>{finPreview}</strong>
                                                            </div>
                                                        </div>

                                                        <div className="skill-controls">
                                                            <NumberStepper value={cur} min={baseline} step={1} onChange={(v) => luSetSkillBase(skillId, v)} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="dashboard-actions" style={{ gap: 12, marginTop: 18 }}>
                                            <button className="logout-link" type="button" onClick={cancelLevelUp}>
                                                Cancel
                                            </button>

                                            <button className="logout-link" type="button" onClick={finishLevelUp} disabled={finishDisabled}>
                                                Finish Level Up
                                            </button>
                                        </div>

                                        {finishDisabled ? (
                                            <div className="mini warn" style={{ marginTop: 10 }}>
                                                You must apply the free characteristic increase (exactly one stat +1) before finishing.
                                            </div>
                                        ) : null}
                                    </div>
                                </>
                            ) : null}

                            {/* Footer nav */}
                            <div className="dashboard-actions" style={{ gap: 12 }}>
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
