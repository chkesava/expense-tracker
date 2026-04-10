import { useState, useCallback } from "react";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit,
  or
} from "firebase/firestore";
import { db } from "../firebase";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  username?: string;
  upiId?: string;
}

export const useUsers = () => {
  const [loading, setLoading] = useState(false);

  const searchUsers = useCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) return [];
    
    setLoading(true);
    try {
      const term = searchTerm.toLowerCase();
      
      // Firestore doesn't support full-text search or 'contains' natively with high performance
      // For now, we search for exact match on email or username, or start-at for name
      // In production, you'd use Algolia or similar if you have many users
      const usersRef = collection(db, "users");
      
      const q = query(
        usersRef,
        or(
          where("email", "==", searchTerm),
          where("username", "==", searchTerm),
          where("displayName", ">=", searchTerm),
          where("displayName", "<=", searchTerm + "\uf8ff")
        ),
        limit(10)
      );

      const querySnapshot = await getDocs(q);
      const results: UserProfile[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        results.push({
          uid: doc.id,
          displayName: data.displayName || "Anonymous",
          email: data.email || "",
          photoURL: data.photoURL,
          username: data.username,
          upiId: data.upiId
        });
      });

      return results;
    } catch (error) {
      console.error("Error searching users:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { searchUsers, loading };
};
