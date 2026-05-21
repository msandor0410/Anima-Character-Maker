import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./style.css";
import icon from "./img/dice-d10.svg";
import divider from "./img/divider.svg";
import { logout } from "./authService";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import {
    collection,
    getDocs,
    doc,
    getDoc,
    type DocumentData,
} from "firebase/firestore";

type Category = "race" | "class" | "advantage" | "disadvantage";

type EncyclopediaItem = {
    id: string;
    name: string;
    category: Category;

    // short preview on card
    subtitle?: string;
    preview?: string;

    // full detail
    details?: string; // long text, can contain bullets separated by \n
    extraLines?: string[]; // extra bullet-ish lines
    meta?: Record<string, any>;
};

type AdvantageDef = {
    id: string;
    name?: string;
    title?: string;
    costOptions?: number[];
    repeatable?: boolean;
    effectsText?: string[] | string;
    restrictionsText?: string[] | string;
    description?: string;
    desc?: string;
    [k: string]: any;
};

type DisadvantageDef = {
    id: string;
    name?: string;
    title?: string;
    benefitOptions?: number[];
    repeatable?: boolean;
    effectsText?: string[] | string;
    restrictionsText?: string[] | string;
    description?: string;
    desc?: string;
    [k: string]: any;
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

type RaceDoc = {
    id: string;
    name: string;
    modifiers?: any;
    bonuses?: any[];
    needs?: any;
    Flavor?: string;
    flavor?: string;
    [k: string]: any;
};

type ClassDoc = {
    id: string;
    name: string;
    archetype?: string;
    limits?: any;
    dpCosts?: any;
    levelBonuses?: any[];
    Flavor?: string;
    flavor?: string;
    [k: string]: any;
};

function asText(v: any): string {
    if (Array.isArray(v)) return v.map((x) => String(x ?? "")).filter(Boolean).join("\n");
    if (typeof v === "string") return v.trim();
    return "";
}

function firstNonEmpty(...vals: any[]): string {
    for (const v of vals) {
        const t = asText(v);
        if (t) return t;
    }
    return "";
}

function extractArray<T>(docLike: any, field: string): T[] {
    if (Array.isArray(docLike)) return docLike as T[];
    if (Array.isArray(docLike?.[field])) return docLike[field] as T[];
    if (Array.isArray(docLike?.items)) return docLike.items as T[];
    return [];
}

function clampStr(s: string, maxLen: number) {
    const t = (s ?? "").trim();
    if (t.length <= maxLen) return t;
    return t.slice(0, Math.max(0, maxLen - 1)).trimEnd() + "…";
}

function buildPreviewFromLongText(text: string) {
    const t = (text ?? "").replace(/\s+/g, " ").trim();
    return clampStr(t, 170);
}

function formatCategoryLabel(c: Category) {
    if (c === "race") return "Race";
    if (c === "class") return "Class";
    if (c === "advantage") return "Advantage";
    return "Disadvantage";
}

function normalizeRace(d: DocumentData, forcedId?: string): RaceDoc {
    const id = String(forcedId ?? d?.id ?? d?.raceId ?? "");
    return {
        id,
        name: String(d?.name ?? d?.title ?? id ?? "—"),
        modifiers: d?.modifiers ?? {},
        bonuses: Array.isArray(d?.bonuses) ? d.bonuses : [],
        needs: d?.needs ?? null,
        Flavor: d?.Flavor ?? d?.flavor ?? "",
        ...d,
    };
}

function normalizeClass(d: DocumentData, forcedId?: string): ClassDoc {
    const id = String(forcedId ?? d?.id ?? d?.classId ?? "");
    return {
        id,
        name: String(d?.name ?? d?.title ?? id ?? "—"),
        archetype: d?.archetype,
        limits: d?.limits ?? null,
        dpCosts: d?.dpCosts ?? null,
        levelBonuses: Array.isArray(d?.levelBonuses) ? d.levelBonuses : [],
        Flavor: d?.Flavor ?? d?.flavor ?? "",
        ...d,
    };
}

export function EncyclopediaPage() {
    const navigate = useNavigate();
    const [uid, setUid] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState("");

    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | Category>("all");
    const [openId, setOpenId] = useState<string | null>(null);

    const [items, setItems] = useState<EncyclopediaItem[]>([]);

    useEffect(() => {
        return onAuthStateChanged(auth, (u) => {
            setUid(u?.uid ?? null);
            setUserEmail(u?.email ?? "");
        });
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
        } catch (e: any) {
            alert(e?.message ?? "Logout failed");
        }
    };

    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                setLoading(true);
                setErr(null);

                if (!uid) return;

                const [advSnap, disSnap] = await Promise.all([
                    getDoc(doc(db, "config", "advantages")),
                    getDoc(doc(db, "config", "disadvantages")),
                ]);

                const advList: AdvantageDef[] = advSnap.exists()
                    ? extractArray<AdvantageDef>(advSnap.data() as AdvantagesConfigDoc, "advantages")
                    : [];

                const disList: DisadvantageDef[] = disSnap.exists()
                    ? extractArray<DisadvantageDef>(disSnap.data() as DisadvantagesConfigDoc, "disadvantages")
                    : [];

                let races: RaceDoc[] = [];
                let classes: ClassDoc[] = [];

                try {
                    const [raceDocs, classDocs] = await Promise.all([
                        getDocs(collection(db, "races")),
                        getDocs(collection(db, "classes")),
                    ]);

                    races = raceDocs.docs.map((d) => normalizeRace(d.data(), d.id)).filter((r) => r.id && r.name);
                    classes = classDocs.docs.map((d) => normalizeClass(d.data(), d.id)).filter((c) => c.id && c.name);
                } catch {
                    races = [];
                    classes = [];
                }

                const out: EncyclopediaItem[] = [];

                for (const a of advList) {
                    const name = String(a?.name ?? a?.title ?? a?.id ?? "—");
                    const costOptions = Array.isArray(a?.costOptions) ? a.costOptions : [];
                    const eff = firstNonEmpty(a?.effectsText, a?.description, a?.desc);
                    const res = firstNonEmpty(a?.restrictionsText);

                    const detailsParts: string[] = [];
                    if (eff) detailsParts.push(eff);
                    if (res) detailsParts.push(`Restrictions:\n${res}`);

                    out.push({
                        id: `adv:${String(a.id)}`,
                        name,
                        category: "advantage",
                        subtitle: costOptions.length ? `Cost options: ${costOptions.join(", ")} CP` : (a?.repeatable ? "Repeatable" : ""),
                        preview: buildPreviewFromLongText(eff || res || ""),
                        details: detailsParts.join("\n\n"),
                        meta: a as any,
                    });
                }

                for (const d of disList) {
                    const name = String(d?.name ?? d?.title ?? d?.id ?? "—");
                    const ben = Array.isArray(d?.benefitOptions) ? d.benefitOptions : [];
                    const eff = firstNonEmpty(d?.effectsText, d?.description, d?.desc);
                    const res = firstNonEmpty(d?.restrictionsText);

                    const detailsParts: string[] = [];
                    if (eff) detailsParts.push(eff);
                    if (res) detailsParts.push(`Restrictions:\n${res}`);

                    out.push({
                        id: `dis:${String(d.id)}`,
                        name,
                        category: "disadvantage",
                        subtitle: ben.length ? `Gain options: ${ben.join(", ")} CP` : (d?.repeatable ? "Repeatable" : ""),
                        preview: buildPreviewFromLongText(eff || res || ""),
                        details: detailsParts.join("\n\n"),
                        meta: d as any,
                    });
                }

                for (const r of races) {
                    const long = firstNonEmpty(r?.Flavor, r?.flavor);
                    const preview = buildPreviewFromLongText(long);

                    const extraLines: string[] = [];
                    if (r?.modifiers?.attributes && typeof r.modifiers.attributes === "object") {
                        const pairs = Object.entries(r.modifiers.attributes).map(([k, v]) => `${String(k).toUpperCase()}: ${Number(v) >= 0 ? "+" : ""}${v}`);
                        if (pairs.length) extraLines.push(`Attribute mods: ${pairs.join(" • ")}`);
                    }
                    if (r?.modifiers?.resistances && typeof r.modifiers.resistances === "object") {
                        const pairs = Object.entries(r.modifiers.resistances).map(([k, v]) => `${String(k)}: ${Number(v) >= 0 ? "+" : ""}${v}`);
                        if (pairs.length) extraLines.push(`Resistance mods: ${pairs.join(" • ")}`);
                    }

                    out.push({
                        id: `race:${r.id}`,
                        name: r.name,
                        category: "race",
                        subtitle: extraLines[0] ?? "",
                        preview,
                        details: long,
                        extraLines: extraLines.slice(1),
                        meta: r as any,
                    });
                }

                for (const c of classes) {
                    const long = firstNonEmpty(c?.Flavor, c?.flavor);
                    const preview = buildPreviewFromLongText(long);

                    const extraLines: string[] = [];
                    if (c?.archetype) extraLines.push(`Archetype: ${String(c.archetype)}`);
                    if (c?.limits && typeof c.limits === "object") {
                        const pairs = Object.entries(c.limits).map(([k, v]) => `${String(k)}: ${v}`);
                        if (pairs.length) extraLines.push(`Limits: ${pairs.join(" • ")}`);
                    }

                    out.push({
                        id: `class:${c.id}`,
                        name: c.name,
                        category: "class",
                        subtitle: extraLines[0] ?? "",
                        preview,
                        details: long,
                        extraLines: extraLines.slice(1),
                        meta: c as any,
                    });
                }

                const catOrder: Record<Category, number> = { race: 0, class: 1, advantage: 2, disadvantage: 3 };
                out.sort((a, b) => {
                    const ca = catOrder[a.category] ?? 99;
                    const cb = catOrder[b.category] ?? 99;
                    if (ca !== cb) return ca - cb;
                    return a.name.localeCompare(b.name);
                });

                if (!alive) return;
                setItems(out);
            } catch (e: any) {
                if (!alive) return;
                setErr(e?.message ?? "Failed to load encyclopedia.");
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [uid]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return items.filter((it) => {
            if (filter !== "all" && it.category !== filter) return false;
            if (!q) return true;
            return (
                it.name.toLowerCase().includes(q) ||
                (it.subtitle ?? "").toLowerCase().includes(q) ||
                (it.preview ?? "").toLowerCase().includes(q)
            );
        });
    }, [items, search, filter]);

    const counts = useMemo(() => {
        const base = { race: 0, class: 0, advantage: 0, disadvantage: 0 };
        for (const it of items) base[it.category] += 1;
        return base;
    }, [items]);

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
                <div style={{ padding: 24, color: "var(--text)" }}>Loading encyclopedia…</div>
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
                                    <p className="p">Encyclopedia</p>
                                    <p className="text-wrapper-2">{err}</p>
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
                <div className="basic-footer" />
            </div>
        );
    }

    return (
        <div className="login-page">
            <div className="header">
                <div className="container">
                    <div className="logo">
                        <div className="logomark">
                            <img className="icon" alt="Icon" src={icon} />
                        </div>
                        <div className="text-wrapper">
                            <a onClick={() => navigate("/dashboard")}>Anima Character Maker</a>
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
                                <p className="p">Encyclopedia</p>
                                <p className="text-wrapper-2" style={{ opacity: 0.9 }}>
                                    Browse & search: Races ({counts.race}) • Classes ({counts.class}) • Advantages ({counts.advantage}) • Disadvantages ({counts.disadvantage})
                                </p>
                            </div>

                            <div className="dashboard-actions" style={{ gap: 12 }}>
                                <button className="logout-link" type="button" onClick={() => navigate("/dashboard")}>
                                    Back
                                </button>
                            </div>

                            {/* Search */}
                            <div className="creator-section">
                                <div className="section-title">Search</div>

                                <div className="ency-controls">
                                    <div className="div-2" style={{ width: "100%" }}>
                                        <input
                                            className="input"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Search by name (or text)…"
                                        />
                                    </div>

                                    <div className="ency-filters">
                                        <button
                                            className={`ency-filter ${filter === "all" ? "is-active" : ""}`}
                                            type="button"
                                            onClick={() => setFilter("all")}
                                        >
                                            All
                                        </button>
                                        <button
                                            className={`ency-filter ${filter === "race" ? "is-active" : ""}`}
                                            type="button"
                                            onClick={() => setFilter("race")}
                                        >
                                            Races
                                        </button>
                                        <button
                                            className={`ency-filter ${filter === "class" ? "is-active" : ""}`}
                                            type="button"
                                            onClick={() => setFilter("class")}
                                        >
                                            Classes
                                        </button>
                                        <button
                                            className={`ency-filter ${filter === "advantage" ? "is-active" : ""}`}
                                            type="button"
                                            onClick={() => setFilter("advantage")}
                                        >
                                            Advantages
                                        </button>
                                        <button
                                            className={`ency-filter ${filter === "disadvantage" ? "is-active" : ""}`}
                                            type="button"
                                            onClick={() => setFilter("disadvantage")}
                                        >
                                            Disadvantages
                                        </button>
                                    </div>
                                </div>

                                <div className="mini" style={{ marginTop: 10 }}>
                                    Showing <strong>{filtered.length}</strong> / {items.length}
                                </div>
                            </div>

                            {/* Cards */}
                            <div className="creator-section">
                                <div className="section-title">Entries</div>

                                {filtered.length === 0 ? (
                                    <div className="mini">No results.</div>
                                ) : (
                                    <div className="ency-grid">
                                        {filtered.map((it) => {
                                            const isOpen = openId === it.id;
                                            return (
                                                <div
                                                    key={it.id}
                                                    className={`ency-card ${isOpen ? "is-open" : ""}`}
                                                    onClick={() => setOpenId(isOpen ? null : it.id)}
                                                    role="button"
                                                    tabIndex={0}
                                                >
                                                    <div className="ency-card-top">
                                                        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                                                            <div className="ency-title">
                                                                {it.name}
                                                                <span className="ency-tag">{formatCategoryLabel(it.category)}</span>
                                                            </div>

                                                            {it.subtitle ? <div className="mini" style={{ marginTop: 0 }}>{it.subtitle}</div> : null}

                                                            {it.preview ? (
                                                                <div className="ency-preview">
                                                                    {it.preview}
                                                                </div>
                                                            ) : (
                                                                <div className="ency-preview muted">No preview.</div>
                                                            )}
                                                        </div>

                                                        <div className="pill" style={{ justifyContent: "center", minWidth: 90 }}>
                                                            <strong>{isOpen ? "Hide" : "Open"}</strong>
                                                        </div>
                                                    </div>

                                                    {isOpen ? (
                                                        <div className="ency-details">
                                                            {it.details ? (
                                                                <pre className="ency-pre">{it.details}</pre>
                                                            ) : (
                                                                <div className="mini muted">No details.</div>
                                                            )}

                                                            {Array.isArray(it.extraLines) && it.extraLines.length > 0 ? (
                                                                <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                                                                    {it.extraLines.map((l, idx) => (
                                                                        <div key={idx} className="mini">{l}</div>
                                                                    ))}
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    ) : null}
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
