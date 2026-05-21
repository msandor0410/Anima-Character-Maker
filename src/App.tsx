import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "./firebase";
import { LoginPage } from "./LoginPage";
import { RegisterPage } from "./RegisterPage";
import { DashboardPage } from "./DashboardPage";
import { CharacterCreatorPage } from "./CharacterCreatorPage";
import { CharacterDetailPage } from "./CharacterDetailPage";
import {CharacterEditPage} from "./CharacterEditPage.tsx";
import {CharacterGamePage} from "./CharacterGamePage.tsx";
import {ProfilePage} from "./ProfilePage.tsx";
import {EncyclopediaPage} from "./EncyclopediaPage.tsx";

function useAuthUser() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        return onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });
    }, []);

    return { user, loading };
}

function RequireAuth({ children }: { children: ReactNode }) {
    const { user, loading } = useAuthUser();
    if (loading) return <div style={{ padding: 24 }}>Loading...</div>;
    return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
    const { user, loading } = useAuthUser();
    if (loading) return <div style={{ padding: 24 }}>Loading...</div>;
    return user ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/login"
                    element={
                        <RedirectIfAuthed>
                            <LoginPage />
                        </RedirectIfAuthed>
                    }
                />
                <Route
                    path="/register"
                    element={
                        <RedirectIfAuthed>
                            <RegisterPage />
                        </RedirectIfAuthed>
                    }
                />

                <Route
                    path="/dashboard"
                    element={
                        <RequireAuth>
                            <DashboardPage />
                        </RequireAuth>
                    }
                />

                <Route
                    path="/new-character"
                    element={
                        <RequireAuth>
                            <CharacterCreatorPage />
                        </RequireAuth>
                    }
                />

                <Route
                    path="/character/:id"
                    element={
                        <RequireAuth>
                            <CharacterDetailPage />
                        </RequireAuth>
                    }
                />

                <Route
                    path="/character/:id/edit"
                    element={
                        <RequireAuth>
                            <CharacterEditPage />
                        </RequireAuth>
                    }
                />

                <Route
                    path="/character/:id/game"
                    element={
                        <RequireAuth>
                            <CharacterGamePage />
                        </RequireAuth>
                    }
                />

                <Route
                    path="/profile"
                    element={
                        <RequireAuth>
                            <ProfilePage />
                        </RequireAuth>
                    }
                />

                <Route
                    path="/encyclopedia"
                    element={
                        <RequireAuth>
                            <EncyclopediaPage />
                        </RequireAuth>
                    }
                />

                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
