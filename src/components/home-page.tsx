"use client";

import { useState } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Code } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HomePageProps {
  onEnterRoom: (roomId: string) => void;
}

export default function HomePage({ onEnterRoom }: HomePageProps) {
  const [roomId, setRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();

  const createNewSession = async () => {
    setIsCreating(true);
    const newRoomId = Math.random().toString(36).substring(2, 9);
    try {
      const initialCode = `// Welcome to your new CodeSync session!
// Share the Room ID to invite collaborators.
// You can change the language in the editor.

function greet(name) {
  console.log(\`Hello, \${name}!\`);
}

greet('World');`;
      await setDoc(doc(db, 'rooms', newRoomId), {
        code: initialCode,
        language: 'javascript',
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
    <div className="flex min-h-screen items-center justify-center bg-transparent p-4">
      <Card className="w-full max-w-md glass-card animate-fade-in-up">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl md:text-4xl font-bold tracking-tight text-primary flex items-center justify-center gap-3">
            <Code className="h-8 w-8 md:h-10 md:w-10"/> CodeSync
          </CardTitle>
          <CardDescription className="pt-2 text-sm md:text-base">
            Real-time collaborative code editor. Instantly shareable, infinitely scalable.
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
              <span className="bg-card/0 px-2 text-muted-foreground backdrop-blur-sm">
                Or join an existing session
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="text"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="text-center flex-grow bg-input/80"
              onKeyUp={(e) => e.key === 'Enter' && joinSession()}
              disabled={isCreating || isJoining}
            />
            <Button onClick={joinSession} className="w-full sm:w-auto" variant="secondary" disabled={isCreating || isJoining}>
              {isJoining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Join Session
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
