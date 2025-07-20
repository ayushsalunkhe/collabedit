"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { signInAnonymously, onAuthStateChanged, type User } from "firebase/auth";
import HomePage from "@/components/home-page";
import EditorPage from "@/components/editor-page";
import { Loader2 } from "lucide-react";

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Handle anonymous authentication on component mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
      } else {
        // If not signed in, sign in anonymously.
        signInAnonymously(auth).catch((error) => {
          console.error("Anonymous sign-in failed:", error);
          // Still need to stop loading even if sign in fails.
          setLoading(false);
        });
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);
  
  // Logic to switch between views
  const handleEnterRoom = (id: string) => {
    window.history.pushState({ roomId: id }, '', `?room=${id}`);
    setRoomId(id);
  };

  const handleLeaveRoom = () => {
    window.history.pushState({ roomId: null }, '', '/');
    setRoomId(null);
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const room = searchParams.get('room');
    if (room) {
      setRoomId(room);
    }
  }, []);


  if (loading || !user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-foreground">Initializing CollabEdit...</p>
      </div>
    );
  }

  return (
    <main>
      {roomId ? (
        <EditorPage roomId={roomId} onLeave={handleLeaveRoom} />
      ) : (
        <HomePage onEnterRoom={handleEnterRoom} />
      )}
    </main>
  );
}
