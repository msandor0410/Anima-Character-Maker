import { Link, useNavigate } from "react-router-dom";
import divider from "./img/divider.svg";
import icon from "./img/dice-d10.svg";
import "./style.css";
import { logout } from "./authService";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";

import {
    collection,
    deleteDoc,
    doc,
    limit,
    onSnapshot,
    orderBy,
    query,
    type Timestamp,
} from "firebase/firestore";

type CharacterRow = {
    id: string;
    name: string;
    archetype: string;
    level: number;
    updatedAt: string;
};

function formatDate(d: any): string {
    try {
        const date = typeof d?.toDate === "function" ? (d as Timestamp).toDate() : new Date(d);
        return date.toISOString().slice(0, 10);
    } catch {
        return "";
    }
}

export const DashboardPage = () => {
    const [userEmail, setUserEmail] = useState("");
    const [uid, setUid] = useState<string>("");
    const [characters, setCharacters] = useState<CharacterRow[]>([]);
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();

    const MAX_CHARACTERS = 5;

    useEffect(() => {
        return onAuthStateChanged(auth, (u) => {
            setUserEmail(u?.email ?? "");
            setUid(u?.uid ?? "");
        });
    }, []);

    useEffect(() => {
        if (!uid) return;

        setLoading(true);

        const q = query(
            collection(db, "users", uid, "characters"),
            orderBy("updatedAt", "desc"),
            limit(MAX_CHARACTERS)
        );

        const unsub = onSnapshot(
            q,
            (snap) => {
                const rows: CharacterRow[] = snap.docs.map((d) => {
                    const data = d.data() as any;

                    const className = String(data?.className ?? "").trim();
                    const archetype = String(data?.archetype ?? "").trim();

                    const archetypeLabel =
                        className && archetype
                            ? `${className} (${archetype})`
                            : "-";


                    return {
                        id: d.id,
                        name: data?.name ?? "Unnamed",
                        archetype: archetypeLabel,
                        level: Number(data?.level ?? 1),
                        updatedAt: formatDate(data?.updatedAt),
                    };
                });

                setCharacters(rows);
                setLoading(false);
            },
            () => setLoading(false)
        );

        return () => unsub();
    }, [uid]);

    const charCount = characters.length;
    const isLimitReached = charCount >= MAX_CHARACTERS;

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
        } catch (err: any) {
            alert(err?.message ?? "Logout failed");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this character?")) return;
        try {
            await deleteDoc(doc(db, "users", uid, "characters", id));
        } catch (e: any) {
            alert(e?.message ?? "Delete failed");
        }
    };

    return (
        <div className="login-page">
            <div className="header">
                <div className="container">
                    <div className="logo">
                        <div className="logomark">
                            <img className="icon" alt="Icon" src={icon} />
                        </div>
                        <div className="text-wrapper">Anima Character Maker</div>
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
                        <div className="div dashboard-card">
                            <div className="header-2">
                                <p className="p">Your Characters</p>
                                <p className="text-wrapper-2">
                                    Create a new character or continue editing an existing one.
                                </p>
                            </div>

                            <div className="dashboard-actions">
                                {isLimitReached ? (
                                    <button className="button-login button-inline is-disabled" type="button" disabled>
                                        <span className="text-wrapper-4">New Character</span>
                                    </button>
                                ) : (
                                    <Link className="button-login button-inline" to="/new-character">
                                        <span className="text-wrapper-4">New Character</span>
                                    </Link>
                                )}
                            </div>

                            <div className="table-wrap">
                                <table className="char-table">
                                    <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Class (Archetype)</th>
                                        <th>Level</th>
                                        <th>Last update</th>
                                        <th className="col-actions">Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="empty-cell">
                                                Loading...
                                            </td>
                                        </tr>
                                    ) : characters.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="empty-cell">
                                                No characters yet. Create your first one.
                                            </td>
                                        </tr>
                                    ) : (
                                        characters.map((c) => (
                                            <tr key={c.id}>
                                                <td>{c.name}</td>
                                                <td>{c.archetype}</td>
                                                <td>{c.level}</td>
                                                <td>{c.updatedAt}</td>
                                                <td className="col-actions">
                                                    <Link className="table-link" to={`/character/${c.id}/game`}>
                                                        Game
                                                    </Link>

                                                    <span className="sep">•</span>

                                                    <Link className="table-link" to={`/character/${c.id}`}>
                                                        Details
                                                    </Link>

                                                    <span className="sep">•</span>

                                                    <Link className="table-link" to={`/character/${c.id}/edit`}>
                                                        Edit
                                                    </Link>

                                                    <span className="sep">•</span>

                                                    <button
                                                        className="table-link danger"
                                                        type="button"
                                                        onClick={() => handleDelete(c.id)}
                                                    >
                                                        Delete
                                                    </button>
                                                </td>

                                            </tr>
                                        ))
                                    )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="table-footer">
                                <span className="char-counter">
                                    Characters: <strong>{charCount}/{MAX_CHARACTERS}</strong>
                                </span>

                                {isLimitReached && (
                                    <span className="limit-hint">
                                        Limit reached (max {MAX_CHARACTERS}). Delete one to create a new character.
                                </span>
                                )}
                            </div>

                            <button className="button-login button-inline" type="button" onClick={() => navigate("/encyclopedia")} >
                                <span className="text-wrapper-4">Encyclopedia</span>
                            </button>
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
};
