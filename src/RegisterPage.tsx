import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import divider from "./img/divider.svg";
import icon from "./img/dice-d10.svg";
import "./style.css";
import vector31 from "./img/Vector 31.svg";
import vector32 from "./img/Vector 32.svg";
import Google from "./img/Google.svg";
import { registerWithEmail, loginWithGoogle } from "./authService";
import { useNavigate } from "react-router-dom";

export const RegisterPage = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [password2, setPassword2] = useState("");
    const [rememberMe, setRememberMe] = useState(false);

    const navigate = useNavigate();

    const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (password !== password2) {
            alert("A két jelszó nem egyezik.");
            return;
        }
        try {
            await registerWithEmail(email, password, rememberMe);
            navigate("/dashboard");
        } catch (err: any) {
            alert(err?.message ?? "Register failed");
        }
    };

    const handleGoogleRegister = async () => {
        try {
            await loginWithGoogle(rememberMe);
            navigate("/dashboard");
        } catch (err: any) {
            alert(err?.message ?? "Google register failed");
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

                <img className="divider" alt="Divider" src={divider} />
            </div>

            <div className="main-content-wrapper">
                <div className="main-content">
                    <div className="onboarding-sign-up">
                        <div className="div">
                            <div className="header-2">
                                <p className="p">Create your Anima Character Maker account</p>
                                <p className="text-wrapper-2">
                                    Sign up with your email and password or use your Google account.
                                </p>
                            </div>

                            <form className="form-section" onSubmit={handleRegister}>
                                <div className="div-2">
                                    <input
                                        className="input"
                                        type="email"
                                        name="email"
                                        autoComplete="email"
                                        placeholder="Email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="div-2">
                                    <input
                                        className="input"
                                        type="password"
                                        name="password"
                                        autoComplete="new-password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="div-2">
                                    <input
                                        className="input"
                                        type="password"
                                        name="password2"
                                        autoComplete="new-password"
                                        placeholder="Repeat password"
                                        value={password2}
                                        onChange={(e) => setPassword2(e.target.value)}
                                        required
                                    />
                                </div>

                                <button className="button-login" type="submit">
                                    <span className="text-wrapper-4">Sign Up</span>
                                </button>
                            </form>

                            <div className="divider-2">
                                <img className="vector" alt="Vector" src={vector32} />
                                <div className="text-wrapper-5">or continue with</div>
                                <img className="vector" alt="Vector" src={vector31} />
                            </div>

                            <button
                                className="button-google-login"
                                type="button"
                                onClick={handleGoogleRegister}
                            >
                <span className="google">
                  <img className="img" alt="Google" src={Google} />
                </span>
                                <span className="text-wrapper-6">Google</span>
                            </button>

                            <label className="checkbox-small">
                                <input
                                    className="checkbox"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                />
                                <span className="text-wrapper-7">Remember me</span>
                            </label>

                            <Link className="back-link" to="/login">
                                Already have an account? Log in.
                            </Link>
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
