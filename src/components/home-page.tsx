"use client";

import { useState, useRef, useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Code, LogIn, PlusCircle } from 'lucide-react';
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
      
      const rotateX = (y / height - 0.5) * -15;
      const rotateY = (x / width - 0.5) * 15;
      
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
    };

    const handleMouseLeave = () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      card.style.removeProperty('--mouse-x');
      card.style.removeProperty('--mouse-y');
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
    <div className="flex min-h-screen items-center justify-center p-4 relative hero">
      <div
        ref={cardRef}
        className={cn(
          "w-full max-w-lg transform-gpu transition-transform duration-500 ease-out",
          "relative will-change-transform"
        )}
      >
        <Card className="w-full bg-glass-bg backdrop-blur-xl border border-glass-border rounded-[28px] shadow-2xl shadow-black/20 overflow-hidden"
              style={{
                '--mouse-x': '50%',
                '--mouse-y': '50%',
                animation: 'floatIn 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both'
              } as React.CSSProperties}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_var(--mouse-x)_var(--mouse-y),_hsl(var(--primary)/0.15),_transparent_40%)] transition-all duration-500 opacity-0 hover:opacity-100"></div>
          <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-primary to-accent"></div>
          
          <CardHeader className="text-center p-12" style={{ animation: 'fadeIn 1s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            <div className="flex justify-center items-center mb-4">
              <Code className="h-12 w-12 text-primary drop-shadow-[0_0_10px_hsl(var(--primary-glow))]"/>
            </div>
            <CardTitle className="text-5xl font-bold tracking-tight bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
              CodeSync
            </CardTitle>
            <CardDescription className="pt-2 text-lg text-muted-foreground font-light">
              Enter the future of collaboration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-10 pb-10">
            <div style={{ animation: 'fadeIn 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both' }}>
              <Button onClick={createNewSession} className="w-full font-semibold btn text-lg bg-gradient-to-r from-primary to-blue-500 hover:shadow-[0_8px_25px_hsl(var(--primary-glow))] hover:-translate-y-1" disabled={isCreating || isJoining} size="lg">
                {isCreating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5"/>}
                Create New Session
              </Button>
            </div>
            
            <div className="relative" style={{ animation: 'fadeIn 1s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both' }}>
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-glass-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-glass-bg px-2 text-muted-foreground backdrop-blur-sm rounded-full">
                  Or Join
                </span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2" style={{ animation: 'fadeIn 1s cubic-bezier(0.16, 1, 0.3, 1) 0.6s both' }}>
              <Input
                type="text"
                placeholder="Enter Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="text-center flex-grow bg-surface-2 border-surface-3 rounded-[12px] h-14 text-base focus:border-primary focus:shadow-[0_0_0_4px_hsl(var(--primary-glow))]"
                onKeyUp={(e) => e.key === 'Enter' && joinSession()}
                disabled={isCreating || isJoining}
              />
              <Button onClick={joinSession} className="w-full sm:w-auto btn bg-surface-2 border border-surface-3 hover:bg-primary hover:border-primary hover:text-white" disabled={isCreating || isJoining}>
                {isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                Join
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
