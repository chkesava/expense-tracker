import { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  updateDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./useAuth";
import { toast } from "react-toastify";
import type { SharedVault } from "../types/vault";

export function useVaults() {
  const { user } = useAuth();
  const [vaults, setVaults] = useState<SharedVault[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      const id = requestAnimationFrame(() => {
        setVaults([]);
        setLoading(false);
      });
      return () => cancelAnimationFrame(id);
    }

    const q = query(
      collection(db, "vaults"),
      where("memberIds", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const vaultList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SharedVault[];
      setVaults(vaultList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching vaults:", error);
      toast.error("Failed to load shared vaults");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const createVault = async (vaultData: Omit<SharedVault, "id" | "ownerId" | "memberIds" | "createdAt">) => {
    if (!user) return;
    try {
      await addDoc(collection(db, "vaults"), {
        ...vaultData,
        ownerId: user.uid,
        memberIds: [user.uid],
        createdAt: serverTimestamp(),
      });
      toast.success("Vault created successfully");
    } catch (error) {
      console.error("Error creating vault:", error);
      toast.error("Failed to create vault");
    }
  };

  const inviteMember = async (vaultId: string, memberId: string) => {
    try {
      const vaultRef = doc(db, "vaults", vaultId);
      const vault = vaults.find(v => v.id === vaultId);
      if (!vault) return;
      
      if (vault.memberIds.includes(memberId)) {
        return toast.info("User already in vault");
      }

      await updateDoc(vaultRef, {
        memberIds: [...vault.memberIds, memberId]
      });
      toast.success("Member added to vault");
    } catch (error) {
      console.error("Error inviting member:", error);
      toast.error("Failed to add member");
    }
  };

  return { vaults, loading, createVault, inviteMember };
}
