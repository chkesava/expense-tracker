import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./useAuth";
import { type UserRole } from "../types/user";

export function useUserRole() {
    const { user } = useAuth();
    const [role, setRole] = useState<UserRole>("USER");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setRole("USER");
            setLoading(false);
            return;
        }

        setLoading(true);
        const userRef = doc(db, "users", user.uid);

        // Subscribe to real-time updates
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Default to USER if role is missing or invalid
                const userRole = (data.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "USER") as UserRole;
                setRole(userRole);
            } else {
                // Doc doesn't exist yet? Default to USER
                setRole("USER");
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching user role:", error);
            setRole("USER");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    return { role, isAdmin: role === "SUPER_ADMIN", loading };
}
