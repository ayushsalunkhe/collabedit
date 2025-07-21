
"use client";

import { useState, useEffect, useRef, FormEvent } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Message {
  id: string;
  text: string;
  uid: string;
  displayName: string;
  timestamp: any;
}

interface ChatPanelProps {
  roomId: string;
  displayName: string;
}

export default function ChatPanel({ roomId, displayName }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const messagesRef = collection(db, 'rooms', roomId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs: Message[] = [];
      querySnapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !auth.currentUser) return;

    const messagesRef = collection(db, 'rooms', roomId, 'messages');
    await addDoc(messagesRef, {
      text: newMessage,
      uid: auth.currentUser.uid,
      displayName: displayName,
      timestamp: serverTimestamp(),
    });

    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-full">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
            {messages.map((msg) => (
                <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${
                    msg.uid === auth.currentUser?.uid ? 'justify-end' : ''
                }`}
                >
                {msg.uid !== auth.currentUser?.uid && (
                    <Avatar className="w-8 h-8">
                        <AvatarFallback>{msg.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                )}
                <div
                    className={`flex flex-col gap-1 max-w-[320px] p-2 border rounded-lg ${
                    msg.uid === auth.currentUser?.uid
                        ? 'rounded-br-none bg-primary text-primary-foreground'
                        : 'rounded-bl-none bg-muted'
                    }`}
                >
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <span className="text-sm font-semibold">{msg.displayName}</span>
                    </div>
                    <p className="text-sm font-normal">{msg.text}</p>
                    <span className="text-xs self-end opacity-70">
                    {msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                {msg.uid === auth.currentUser?.uid && (
                    <Avatar className="w-8 h-8">
                        <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                )}
                </div>
            ))}
            </div>
        </ScrollArea>
        <div className="p-4 border-t">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1"
                autoComplete="off"
            />
            <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
                <span className="sr-only">Send message</span>
            </Button>
            </form>
        </div>
    </div>
  );
}
