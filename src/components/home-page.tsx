"use client";

import { useState } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HomePageProps {
  onEnterRoom: (roomId: string) => void;
}

export default function HomePage({ onEnterRoom }: HomePageProps) {
  const [roomId, setRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();

  // Function to create a new session
  const createNewSession = async () => {
    setIsCreating(true);
    // Generate a reasonably unique room ID
    const newRoomId = Math.random().toString(36).substring(2, 9);
    try {
      // The initial code that appears in a new session
      const initialCode = `// Welcome to your new CodeSync session!
// Share the Room ID to invite collaborators.

function hello() {
  console.log('Welcome to CodeSync!');
}
`;
      // Create a new document in the 'rooms' collection
      await setDoc(doc(db, 'rooms', newRoomId), {
        code: initialCode,
      });
      onEnterRoom(newRoomId);
    } catch (error) {
      console.error("Error creating new session:", error);
      toast({
        title: "Error",
        description: "Could not create a new session. Please try again.",
        variant: "destructive",
      });
      setIsCreating(false);
    }
  };

  // Function to join an existing session
  const joinSession = async () => {
    if (roomId.trim() === '') {
      toast({
        title: "Invalid ID",
        description: "Please enter a Room ID.",
        variant: "destructive",
      });
      return;
    }
    setIsJoining(true);
    // Check if the room exists before joining
    const roomRef = doc(db, 'rooms', roomId.trim());
    const roomSnap = await getDoc(roomRef);

    if (roomSnap.exists()) {
      onEnterRoom(roomId.trim());
    } else {
      toast({
        title: "Not Found",
        description: "A session with that Room ID does not exist.",
        variant: "destructive",
      });
    }
    setIsJoining(false);
  };
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl animate-fade-in-up">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight text-primary">CodeSync</CardTitle>
          <CardDescription className="pt-2">
            The real-time collaborative code editor. Start a session or join one.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <Button onClick={createNewSession} className="w-full font-semibold" disabled={isCreating || isJoining} size="lg" variant="default">
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create New Session
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or join an existing session
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="text-center"
              onKeyUp={(e) => e.key === 'Enter' && joinSession()}
              disabled={isCreating || isJoining}
            />
            <Button onClick={joinSession} className="w-full" variant="secondary" disabled={isCreating || isJoining}>
              {isJoining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Join Session
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
