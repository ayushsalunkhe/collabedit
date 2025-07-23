
"use client";

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Participant {
  id: string;
  displayName: string;
}

interface ParticipantListProps {
  roomId: string;
}

export default function ParticipantList({ roomId }: ParticipantListProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    const participantsRef = collection(db, 'rooms', roomId, 'participants');
    
    // Query for participants seen in the last 60 seconds
    const recentParticipantsQuery = query(participantsRef, 
      where('lastSeen', '>', Timestamp.fromMillis(Date.now() - 60000))
    );

    const unsubscribe = onSnapshot(recentParticipantsQuery, (querySnapshot) => {
      const activeParticipants: Participant[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        activeParticipants.push({
          id: doc.id,
          displayName: data.displayName || 'Anonymous',
        });
      });
      setParticipants(activeParticipants);
    });

    return () => unsubscribe();
  }, [roomId]);

  if (participants.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex items-center -space-x-2 mr-4">
        {participants.map((p) => (
          <Tooltip key={p.id}>
            <TooltipTrigger>
              <Avatar className="w-7 h-7 border-2 border-background">
                <AvatarFallback className="text-xs">{p.displayName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>{p.displayName}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
