import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react";
import { 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    type User, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    sendPasswordResetEmail,
    updateProfile
} from "firebase/auth";
import { auth } from "../firebase";

interface AuthContextType {
    user: User | null;
    realUser: User | null;
    loading: boolean;
    login: () => Promise<void>;
    loginWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDuress, setIsDuress] = useState(() => sessionStorage.getItem("app_duress") === "true");

    useEffect(() => {
        const handleDuress = () => setIsDuress(sessionStorage.getItem("app_duress") === "true");
        window.addEventListener("duress_changed", handleDuress);
        return () => window.removeEventListener("duress_changed", handleDuress);
    }, []);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const login = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        }
    };

    const loginWithEmail = async (email: string, password: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error("Email login failed", error);
            throw error;
        }
    };

    const signUpWithEmail = async (email: string, password: string, displayName: string) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName });
            setUser({ ...userCredential.user, displayName });
        } catch (error) {
            console.error("Email signup failed", error);
            throw error;
        }
    };

    const resetPassword = async (email: string) => {
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error) {
            console.error("Password reset failed", error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    const effectiveUser = useMemo(() => {
        if (!user) return null;
        if (isDuress) {
            const duressUser = Object.create(user);
            Object.defineProperty(duressUser, 'uid', {
                get: () => user.uid + "_duress",
                enumerable: true
            });
            return duressUser;
        }
        return user;
    }, [user, isDuress]);

    return (
        <AuthContext.Provider value={{ user: effectiveUser, realUser: user, loading, login, loginWithEmail, signUpWithEmail, resetPassword, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
