import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./style.css";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

import {
    SKILL_META,
    STAT_LABEL,
    STAT_KEYS,
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
    normalizeCombatBase,
    type CombatAbilityKey,
    pickMovementDistanceRow,
    normalizeSkillBase,
    safeNumber,
    statBonus,
    type PrimaryStats,
    type StatKey,
    type AdvantageDef,
    type DisadvantageDef,
    type SelectedChoice,
    resolveAdvantageCost,
    resolveDisadvantageGain,
    normalizeClassDef,
    normalizeSkillId
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

    rulesSnapshot?: {
        class?: any;
        race?: any;
        levelrulesRef?: string;
        skillsRef?: string;
        baseLifeRef?: string;
    };

    createdAt?: any;
    updatedAt?: any;
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

type LevelRulesNormalized = {
    dpByLevel: Record<string, number>;
    basePresenceByLevel: Record<string, number>;
    xpByLevel: Record<string, number>;
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

function extractArray<T>(docLike: any, field: string): T[] {
    if (Array.isArray(docLike)) return docLike as T[];
    if (Array.isArray(docLike?.[field])) return docLike[field] as T[];
    if (Array.isArray(docLike?.items)) return docLike.items as T[];
    return [];
}

function normalizeLifePointMultiples(src: any): number {
    // creator menti ide: combat.lifePoints.multiples
    const a = src?.combat?.lifePoints?.multiples;
    if (Number.isFinite(Number(a))) return Math.max(0, Math.floor(Number(a)));

    // régi fallbackok
    const b = src?.lifePointMultiples;
    if (Number.isFinite(Number(b))) return Math.max(0, Math.floor(Number(b)));

    const c = src?.lifePoints?.multiples;
    if (Number.isFinite(Number(c))) return Math.max(0, Math.floor(Number(c)));

    const d = src?.lp?.multiples;
    if (Number.isFinite(Number(d))) return Math.max(0, Math.floor(Number(d)));

    return 0;
}

function clamp(n: number, min?: number, max?: number) {
    if (typeof min === "number") n = Math.max(min, n);
    if (typeof max === "number") n = Math.min(max, n);
    return n;
}

function applyRacePrimaryMods(base: PrimaryStats, race?: any | null): PrimaryStats {
    const mods = race?.modifiers?.attributes;
    if (!mods) return base;

    const out: PrimaryStats = { ...base };
    for (const [k, v] of Object.entries(mods)) {
        const key = String(k).toUpperCase() as StatKey;
        if (key in out) {
            out[key] = clamp(safeNumber((out as any)[key], 0) + safeNumber(v as any, 0), 1, 20);
        }
    }
    return out;
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

export function CharacterDetailPage() {
    const [userEmail, setUserEmail] = useState("");
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [uid, setUid] = useState<string | null>(null);
    useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null)), []);

    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [data, setData] = useState<CharacterDoc | null>(null);

    const [movementCfg, setMovementCfg] = useState<MovementConfigDoc | null>(null);
    const [fatigueCfg, setFatigueCfg] = useState<FatigueConfigDoc | null>(null);
    const [baseLifeCfg, setBaseLifeCfg] = useState<BaseLifeConfig | null>(null);
    const [levelRules, setLevelRules] = useState<LevelRulesNormalized>({
        dpByLevel: {},
        basePresenceByLevel: {},
        xpByLevel: {},
    });

    const [advantages, setAdvantages] = useState<AdvantageDef[]>([]);
    const [disadvantages, setDisadvantages] = useState<DisadvantageDef[]>([]);

    useEffect(() => {
        return onAuthStateChanged(auth, (u) => {
            setUserEmail(u?.email ?? "");
            setUid(u?.uid ?? "");
        });
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
        } catch (err: any) {
            alert(err?.message ?? "Logout failed");
        }
    };

    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                setLoading(true);
                setErr(null);

                if (!uid) return;
                if (!id) {
                    setErr("Missing character id.");
                    return;
                }

                const ref = doc(db, "users", uid, "characters", id);

                const [charSnap, mvSnap, fatSnap, lifeSnap, lrSnap, advSnap, disSnap] = await Promise.all([
                    getDoc(ref),
                    getDoc(doc(db, "config", "movement")),
                    getDoc(doc(db, "config", "fatigue")),
                    getDoc(doc(db, "config", "baselife")),
                    getDoc(doc(db, "config", "levelrules")),
                    getDoc(doc(db, "config", "advantages")),
                    getDoc(doc(db, "config", "disadvantages")),
                ]);

                if (!alive) return;

                if (mvSnap.exists()) setMovementCfg(mvSnap.data() as MovementConfigDoc);
                if (fatSnap.exists()) setFatigueCfg(fatSnap.data() as FatigueConfigDoc);
                if (lifeSnap.exists()) setBaseLifeCfg(lifeSnap.data() as BaseLifeConfig);

                if (lrSnap.exists()) setLevelRules(normalizeLevelRules(lrSnap.data() as any));
                else setLevelRules({ dpByLevel: {}, basePresenceByLevel: {}, xpByLevel: {} });

                if (advSnap.exists()) {
                    const raw = advSnap.data() as AdvantagesConfigDoc | AdvantageDef[];
                    setAdvantages(extractArray<AdvantageDef>(raw as any, "advantages"));
                } else setAdvantages([]);

                if (disSnap.exists()) {
                    const raw = disSnap.data() as DisadvantagesConfigDoc | DisadvantageDef[];
                    setDisadvantages(extractArray<DisadvantageDef>(raw as any, "disadvantages"));
                } else setDisadvantages([]);

                if (!charSnap.exists()) {
                    setErr("Character not found (or no permission).");
                    setData(null);
                    return;
                }

                setData(charSnap.data() as CharacterDoc);
            } catch (e: any) {
                if (!alive) return;
                setErr(e?.message ?? "Failed to load character.");
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [uid, id]);

    const level = safeNumber(data?.level, 0);
    const clsSnapRaw = data?.rulesSnapshot?.class ?? null;

    const clsSnap = useMemo(() => {
        return clsSnapRaw ? normalizeClassDef(clsSnapRaw) : null;
    }, [clsSnapRaw]);

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

    const effectivePrimary = useMemo<PrimaryStats>(() => applyRacePrimaryMods(primaryNormalized, raceSnap), [primaryNormalized, raceSnap]);

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

    const combatBase = useMemo(() => normalizeCombatBase(data), [data]);
    const skillBaseRaw = useMemo(() => normalizeSkillBase(data), [data]);

    const skillBase = useMemo(() => {
        const out: Record<string, number> = {};
        for (const [k, v] of Object.entries(skillBaseRaw)) {
            const nk = normalizeSkillId(k);
            const val = Math.max(0, Math.floor(safeNumber(v, 0)));

            // ha collision lenne (pl. "notice" és "noti"), összeadjuk
            out[nk] = (out[nk] ?? 0) + val;
        }
        return out;
    }, [skillBaseRaw]);


    const init = useMemo(() => {
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

    const fatigue = useMemo(() => {
        const table23 = fatigueCfg?.fatigue?.exhaustion?.table23 ?? null;
        return getFinalFatigue({ primary: effectivePrimary, table23 });
    }, [effectivePrimary, fatigueCfg]);

    const lifePointMultiples = useMemo(() => normalizeLifePointMultiples(data), [data]);

    const lifePoints = useMemo(() => {
        if (!clsSnap) return null;
        return getFinalLifePoints({
            primary: effectivePrimary,
            level: Math.max(1, level),
            cls: clsSnap,
            multiples: lifePointMultiples,
            baseLifeConfig: baseLifeCfg,
        });
    }, [clsSnap, effectivePrimary, level, lifePointMultiples, baseLifeCfg]);

    const secondaryRows = useMemo(() => {
        const entries = Object.entries(skillBase).filter(([, v]) => Number(v) > 0);
        entries.sort((a, b) => (SKILL_META[a[0]]?.name ?? a[0]).localeCompare(SKILL_META[b[0]]?.name ?? b[0]));
        return entries;
    }, [skillBase]);

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
                                    <p className="p">Character</p>
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

    const currentXp = safeNumber(data.xp, 0);
    const xpForThisLevel = safeNumber(levelRules.xpByLevel[String(level)], 0);
    const xpNextLevel = safeNumber(levelRules.xpByLevel[String(level + 1)], 0);

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
                                    Level {data.level} • {data.className} {data.archetype ? `(${data.archetype})` : ""}
                                </p>
                            </div>

                            <div className="creator-section">
                                <div className="section-title">Summary</div>

                                <div className="mini">
                                    Race: <strong>{(raceSnap?.name as string) ?? data.raceId ?? "—"}</strong>
                                </div>

                                <div className="mini">
                                    XP: <strong>{currentXp}</strong>
                                    {xpNextLevel > 0 ? (
                                        <span style={{ opacity: 0.85 }}>
                                        {" "}
                                            • Next level at <strong>{xpNextLevel}</strong> ({Math.max(0, xpNextLevel - currentXp)} remaining)
                                        </span>
                                    ) : xpForThisLevel > 0 ? (
                                        <span style={{ opacity: 0.85 }}>
                                            {" "}
                                            • XP rule for this level: <strong>{xpForThisLevel}</strong>
                                        </span>
                                    ) : null}
                                </div>

                                <div className="mini">
                                    DP: total <strong>{safeNumber(data.dp?.total, 0)}</strong> • used <strong>{safeNumber(data.dp?.used, 0)}</strong> • remaining{" "}
                                    <strong>{safeNumber(data.dp?.remaining, 0)}</strong>
                                </div>

                                <div className="mini">
                                    Initiative (unarmed): <strong>{init?.final ?? 0}</strong>
                                </div>

                                <div className="mini">
                                    Movement: <strong>{movement.act}</strong>
                                    {movementRow ? (
                                        <span style={{ opacity: 0.85 }}>
                                            {" "}
                                            • Distance/turn{" "}
                                            <strong>
                                                {movementRow.distanceFeet}
                                                {typeof movementRow.distanceFeet === "number" ? " ft" : ""}
                                            </strong>
                                            {movementRow.require ? <span className="muted"> ({movementRow.require})</span> : null}
                                        </span>
                                    ) : null}
                                </div>

                                <div className="mini">
                                    Fatigue: <strong>{fatigue.current}</strong>
                                    <span style={{ opacity: 0.85 }}>
                                        {" "}
                                        • Base(CON) {fatigue.base} • Exhaustion Pen {formatSigned(fatigue.penalty)}
                                    </span>
                                </div>

                                {lifePoints ? (
                                    <div className="mini">
                                        Life Points: <strong>{lifePoints.fin}</strong>
                                        <span style={{ opacity: 0.85 }}>
                                            {" "}
                                            • Base {lifePoints.base} • Class {formatSigned(lifePoints.classBon)} • Multiples {formatSigned(lifePoints.multAdd)} (
                                            {lifePoints.multiples}×CON)
                                        </span>
                                    </div>
                                ) : (
                                    <div className="mini muted">Life Points: — (missing class snapshot and/or baselife config)</div>
                                )}

                                {resistances && (
                                    <div className="mini">
                                        Resistances:{" "}
                                        {buildResistanceEntries(resistances).map((r, idx) => (
                                            <span key={r.key}>
                                                {idx > 0 ? ", " : ""}
                                                {r.short} <strong>{r.value}</strong>
                                            </span>
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

                            {/* Primary stats */}
                            <div className="creator-section">
                                <div className="section-title">Primary Characteristics</div>

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

                            {/* Primary abilities */}
                            <div className="creator-section">
                                <div className="section-title">Primary Abilities</div>

                                <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                                    {/* Life Points */}
                                    <div className="skill-row primary-row" style={{ alignItems: "stretch" }}>
                                        <div className="skill-left">
                                            <div className="skill-name">Life Points</div>

                                            {lifePoints ? (
                                                <>
                                                    <div className="skill-sub">
                                                        Multiples <strong>{lifePoints.multiples}</strong>
                                                        <span className="muted"> • </span>
                                                        Cost <strong>{lifePoints.multipleCost} DP/multiple</strong>
                                                        <span className="muted"> • </span>
                                                        DP spent <strong>{lifePoints.spentDp}</strong>
                                                    </div>

                                                    <div className="skill-sub">
                                                        Base <strong>{lifePoints.base}</strong> + Class <strong>{formatSigned(lifePoints.classBon)}</strong> + Multiples{" "}
                                                        <strong>{formatSigned(lifePoints.multAdd)}</strong> = Final{" "}
                                                        <strong style={{ color: "var(--accent)" }}>{lifePoints.fin}</strong>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="mini muted">No class snapshot / baselife config yet.</div>
                                            )}
                                        </div>

                                        <div className="skill-controls">
                                            <div className="pill" style={{ justifyContent: "center", minWidth: 120 }}>
                                                <strong>{lifePoints?.fin ?? 0}</strong>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Wear Armor */}
                                    {(() => {
                                        const id = "wearArmor" as CombatAbilityKey;
                                        const base = Math.max(0, Math.floor(safeNumber((combatBase as any)[id], 0)));

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
                                            id,
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
                                    {(["attack", "block", "dodge"] as CombatAbilityKey[]).map((id) => {
                                        const base = Math.max(0, Math.floor(safeNumber((combatBase as any)[id], 0)));
                                        const title = id === "attack" ? "Attack" : id === "block" ? "Block" : "Dodge";

                                        if (!clsSnap) {
                                            return (
                                                <div key={id} className="skill-row primary-row" style={{ alignItems: "stretch" }}>
                                                    <div className="skill-left">
                                                        <div className="skill-name">{title}</div>
                                                        <div className="mini muted">Missing class snapshot.</div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        const res = getFinalPrimaryAbility({
                                            id,
                                            base,
                                            primary: effectivePrimary,
                                            level,
                                            cls: clsSnap,
                                            special: 0,
                                        });

                                        return (
                                            <div key={id} className="skill-row primary-row" style={{ alignItems: "stretch" }}>
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

                            {/* Secondary skills */}
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
