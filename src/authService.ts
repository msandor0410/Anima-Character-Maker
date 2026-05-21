import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    type UserCredential,
} from "firebase/auth";
import { auth } from "./firebase";

function pickPersistence(rememberMe: boolean) {
    return rememberMe ? browserLocalPersistence : browserSessionPersistence;
}

export async function loginWithEmail(
    email: string,
    password: string,
    rememberMe = false
): Promise<UserCredential> {
    await setPersistence(auth, pickPersistence(rememberMe));
    return signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(
    email: string,
    password: string,
    rememberMe = false
): Promise<UserCredential> {
    await setPersistence(auth, pickPersistence(rememberMe));
    return createUserWithEmailAndPassword(auth, email, password);
}

export async function loginWithGoogle(rememberMe = false): Promise<UserCredential> {
    await setPersistence(auth, pickPersistence(rememberMe));
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
}

export async function logout(): Promise<void> {
    await signOut(auth);
}
