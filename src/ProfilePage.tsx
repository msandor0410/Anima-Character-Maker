import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
    deleteUser,
    onAuthStateChanged,
    type User,
} from "firebase/auth";
import {
    collection,
    deleteDoc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    type Timestamp,
} from "firebase/firestore";

import { auth, db } from "./firebase";
import { logout } from "./authService";
import icon from "./img/dice-d10.svg";
import divider from "./img/divider.svg";
import "./style.css";

const SUPPORT_EMAIL = "animabuilder@gmail.com";
const ACTIVITY_LIMIT = 12;

type CharacterRow = {
    id: string;
    name?: string;
    className?: string;
    archetype?: string;
    level?: number;
    createdAt?: any;
    updatedAt?: any;
};

function formatDate(d: any): string {
    try {
        const date =
            typeof d?.toDate === "function" ? (d as Timestamp).toDate() : new Date(d);
        if (Number.isNaN(date.getTime())) return "";
        return date.toISOString().slice(0, 10);
    } catch {
        return "";
    }
}

function dateMs(d: any): number {
    try {
        const date =
            typeof d?.toDate === "function" ? (d as Timestamp).toDate() : new Date(d);
        const t = date.getTime();
        return Number.isFinite(t) ? t : 0;
    } catch {
        return 0;
    }
}

export function ProfilePage() {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");


    const [chars, setChars] = useState<CharacterRow[]>([]);

    const isGoogleUser = useMemo(() => {
        return user?.providerData?.some((p) => p.providerId === "google.com") ?? false;
    }, [user]);

    useEffect(() => {
        return onAuthStateChanged(auth, (u) => {
            if (!u) {
                navigate("/login");
                return;
            }
            setUser(u);
        });
    }, [navigate]);

    useEffect(() => {
        if (!user?.uid) return;

        const q = query(
            collection(db, "users", user.uid, "characters"),
            orderBy("updatedAt", "desc"),
            limit(ACTIVITY_LIMIT)
        );

        return onSnapshot(
            q,
            (snap) => {
                const rows: CharacterRow[] = snap.docs.map((d) => ({
                    id: d.id,
                    ...(d.data() as any),
                }));
                setChars(rows);
            },
            () => setChars([])
        );
    }, [user?.uid]);

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
        } catch (err: any) {
            alert(err?.message ?? "Logout failed");
        }
    };

    const handlePasswordChange = async () => {
        if (!user?.email) return;

        if (!currentPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
            alert("Please fill in current password and enter the new password twice.");
            return;
        }

        if (newPassword !== confirmNewPassword) {
            alert("New passwords do not match.");
            return;
        }

        if (newPassword.trim().length < 6) {
            alert("New password must be at least 6 characters.");
            return;
        }

        try {
            const cred = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, cred);
            await updatePassword(user, newPassword);

            alert("Password updated successfully.");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmNewPassword("");
        } catch (err: any) {
            alert(err?.message ?? "Password change failed.");
        }
    };

    const handleDeleteAccount = async () => {
        if (!user) return;

        const ok = confirm(
            "This will permanently delete your account and ALL your characters. Are you sure?"
        );
        if (!ok) return;

        try {
            const charsRef = collection(db, "users", user.uid, "characters");
            const snap = await getDocs(charsRef);
            await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
            await deleteUser(user);
            await logout();
            navigate("/login");
        } catch (err: any) {
            alert(err?.message ?? "Account deletion failed.");
        }
    };

    const activity = useMemo(() => {
        // karakterekből képezünk "logot"
        const out = chars
            .map((c) => {
                const upd = c.updatedAt ?? null;
                const cre = c.createdAt ?? null;

                const updMs = dateMs(upd);
                const creMs = dateMs(cre);

                const isCreated = creMs && (!updMs || creMs === updMs);
                const date = formatDate(isCreated ? cre : upd);

                const name = String(c.name ?? "Unnamed character");
                const cls = String(c.className ?? "—");
                const arche = c.archetype ? ` (${c.archetype})` : "";
                const lv = Number.isFinite(Number(c.level)) ? ` • Level ${Number(c.level)}` : "";

                return {
                    key: c.id,
                    ts: Math.max(updMs, creMs),
                    line: isCreated
                        ? `Created: ${name} • ${cls}${arche}${lv}`
                        : `Updated: ${name} • ${cls}${arche}${lv}`,
                    date,
                    id: c.id,
                };
            })
            .sort((a, b) => b.ts - a.ts);

        return out;
    }, [chars]);

    if (!user) return null;

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
                        <span className="user-email">{user.email}</span>
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
                                <p className="p">Profile</p>
                                <p className="text-wrapper-2">{user.email}</p>
                            </div>

                            {/* Password */}
                            <div className="creator-section">
                                <div className="section-title">Security</div>

                                {isGoogleUser ? (
                                    <div className="mini warn">
                                        You are signed in with <strong>Google</strong>. Password change is not available here.
                                    </div>
                                ) : (
                                    <div className="form-section">
                                        <div className="div-2">
                                            <input
                                                className="input"
                                                type="password"
                                                placeholder="Current password"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                            />
                                        </div>

                                        <div className="div-2">
                                            <input
                                                className="input"
                                                type="password"
                                                placeholder="New password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                            />
                                        </div>

                                        <div className="div-2">
                                            <input
                                                className="input"
                                                type="password"
                                                placeholder="Confirm new password"
                                                value={confirmNewPassword}
                                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                            />
                                        </div>

                                        <button className="button-login" type="button" onClick={handlePasswordChange}>
                                            <span className="text-wrapper-4">Update Password</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Support */}
                            <div className="creator-section">
                                <div className="section-title">Support</div>

                                <div className="mini">
                                    If you need help, contact us at{" "}
                                    <a className="table-link" href={`mailto:${SUPPORT_EMAIL}`}>
                                        {SUPPORT_EMAIL}
                                    </a>
                                    .
                                </div>

                                <div className="mini">
                                    Processing your email may take up to <strong>48 hours</strong>.
                                </div>
                            </div>

                            {/* Activity Log */}
                            <div className="creator-section">
                                <div className="section-title">Profile Activity Log</div>

                                {activity.length === 0 ? (
                                    <div className="mini">No recent activity.</div>
                                ) : (
                                    <div style={{ display: "grid", gap: 10, width: "100%", marginTop: 10 }}>
                                        {activity.map((a) => (
                                            <div key={a.key} className="skill-row" style={{ gridTemplateColumns: "1fr", gap: 6 }}>
                                                <div className="skill-left">
                                                    <div className="skill-name" style={{ margin: 0 }}>
                                                        {a.line}
                                                    </div>
                                                    <div className="skill-sub">
                                                        Date: <strong style={{ color: "var(--accent)" }}>{a.date || "—"}</strong>
                                                        <span className="sep">•</span>
                                                        <button
                                                            className="table-link"
                                                            type="button"
                                                            onClick={() => navigate(`/character/${a.id}`)}
                                                        >
                                                            Open
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Danger */}
                            <div className="creator-section">
                                <div className="section-title" style={{ color: "var(--danger)" }}>
                                    Danger Zone
                                </div>

                                <div className="mini warn">
                                    Deleting your account will permanently remove your data.
                                </div>

                                <button
                                    className="logout-link"
                                    type="button"
                                    style={{ borderColor: "var(--danger)", color: "var(--danger)", marginTop: 10 }}
                                    onClick={handleDeleteAccount}
                                >
                                    Delete Account
                                </button>
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
