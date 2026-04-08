import { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc,
  Timestamp,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./useAuth";
import type { Split } from "../types/split";
import { toast } from "react-toastify";

export const useSplits = () => {
  const { user } = useAuth();
  const [splits, setSplits] = useState<Split[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSplits([]);
      setLoading(false);
      return;
    }

    // Query splits where the current user is a participant OR the creator
    // For simplicity, we'll store all shared splits in a top-level collection
    // and filter by participants. In a real app, you might want more complex indexing.
    const q = query(
      collection(db, "splits"),
      where("participantIds", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const splitsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Split[];

      // Sort in-memory to avoid requiring a composite index
      splitsData.sort((a, b) => b.createdAt - a.createdAt);

      setSplits(splitsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching splits:", error);
      toast.error("Failed to load splits");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const createSplit = async (splitData: Omit<Split, "id" | "createdBy" | "createdAt" | "settled">) => {
    if (!user) throw new Error("User must be authenticated to create a split");

    try {
      // Extract participant IDs for easier querying
      const participantIds = splitData.participants
        .map(p => p.userId)
        .filter((id): id is string => !!id);
      
      // Ensure current user is in participants and participantIds
      if (!participantIds.includes(user.uid)) {
        participantIds.push(user.uid);
      }

      const newSplit: any = {
        ...splitData,
        createdBy: user.uid,
        createdAt: Date.now(),
        settled: false,
        participantIds // Used for Firestore filtering
      };

      const docRef = await addDoc(collection(db, "splits"), newSplit);
      
      // Auto-create personal expense for the current user
      const currentUserParticipant = splitData.participants.find(p => p.isCurrentUser);
      if (currentUserParticipant) {
        await addDoc(collection(db, "users", user.uid, "expenses"), {
          amount: currentUserParticipant.amount,
          category: splitData.category || "Other",
          note: `Split: ${splitData.title}`,
          date: new Date().toISOString().split('T')[0],
          month: new Date().toISOString().slice(0, 7),
          createdAt: serverTimestamp(),
          splitId: docRef.id
        });
      }

      toast.success("Split created successfully!");
      return docRef.id;
    } catch (error) {
      console.error("Error creating split:", error);
      toast.error("Failed to create split");
      throw error;
    }
  };

  const updateParticipantStatus = async (splitId: string, participantIndex: number, paid: boolean) => {
    try {
      const splitRef = doc(db, "splits", splitId);
      const split = splits.find(s => s.id === splitId);
      if (!split) return;

      const updatedParticipants = [...split.participants];
      updatedParticipants[participantIndex].paid = paid;

      // Check if all settled
      const settled = updatedParticipants.every(p => p.paid);

      await updateDoc(splitRef, {
        participants: updatedParticipants,
        settled
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const deleteSplit = async (splitId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "splits", splitId));
      toast.success("Split deleted");
    } catch (error) {
      console.error("Error deleting split:", error);
      toast.error("Failed to delete split");
    }
  };

  return {
    splits,
    loading,
    createSplit,
    updateParticipantStatus,
    deleteSplit
  };
};
