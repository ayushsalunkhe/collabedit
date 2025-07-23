"use client";

import { useState, useRef, useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Code } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface HomePageProps {
  onEnterRoom: (roomId: string) => void;
}

export default function HomePage({ onEnterRoom }: HomePageProps) {
  const [roomId, setRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { left, top, width, height } = card.getBoundingClientRect();
      const x = e.clientX - left;
      const y = e.clientY - top;
      
      const rotateX = (y / height - 0.5) * -15; // Invert for natural feel
      const rotateY = (x / width - 0.5) * 15;
      
      card.style.setProperty('--x', `${x}px`);
      card.style.setProperty('--y', `${y}px`);
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
    };

    const handleMouseLeave = () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

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
    <div className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden">
      <div className="aurora-background" />
      <div
        ref={cardRef}
        style={{ '--x': '50%', '--y': '50%' } as React.CSSProperties}
        className={cn(
          "w-full max-w-md transform-gpu transition-transform duration-300 ease-out",
          "relative before:absolute before:inset-0 before:z-0 before:rounded-[inherit]",
          "before:bg-[radial-gradient(400px_circle_at_var(--x)_var(--y),_hsl(var(--primary)/0.2),_transparent_40%)]",
          "hover:before:opacity-100"
        )}
      >
        <Card className="w-full glass-card relative z-10 transition-all duration-300">
          <CardHeader className="text-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardTitle className="text-3xl md:text-4xl font-bold tracking-tight text-primary flex items-center justify-center gap-3">
              <Code className="h-8 w-8 md:h-10 md:w-10"/> CodeSync
            </CardTitle>
            <CardDescription className="pt-2 text-sm md:text-base">
              Real-time collaborative code editor. Instantly shareable, infinitely scalable.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <Button onClick={createNewSession} className="w-full font-semibold" disabled={isCreating || isJoining} size="lg" variant="default">
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create New Session
              </Button>
            </div>
            
            <div className="relative animate-fade-in" style={{ animationDelay: '0.6s' }}>
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card/0 px-2 text-muted-foreground backdrop-blur-sm">
                  Or join an existing session
                </span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
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
    </div>
  );
}