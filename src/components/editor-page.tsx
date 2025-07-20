"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Home, Copy, Wand2, Loader2 } from 'lucide-react';
import { getCodeSuggestion } from '@/ai/flows/code-suggestion';

interface EditorPageProps {
  roomId: string;
  onLeave: () => void;
}

export default function EditorPage({ roomId, onLeave }: EditorPageProps) {
  const [code, setCode] = useState<string>('// Loading code...');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const { toast } = useToast();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // A ref to track if the incoming change is from Firestore to prevent feedback loops.
  const isRemoteChange = useRef(true);

  // Debounced function to update Firestore.
  // This reduces the number of writes, saving costs and improving performance.
  const updateFirestore = useCallback(async (newCode: string) => {
    try {
      await setDoc(doc(db, 'rooms', roomId), { code: newCode });
    } catch (error) {
      console.error('Error updating document:', error);
      toast({ title: 'Error', description: 'Failed to save changes.', variant: 'destructive' });
    }
  }, [roomId, toast]);

  const debouncedUpdate = useCallback((newCode: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        updateFirestore(newCode);
      }, 500); // 500ms delay
  }, [updateFirestore])

  // This effect listens for real-time changes to the code in Firestore.
  useEffect(() => {
    isRemoteChange.current = true; // Assume first load is a remote change
    const docRef = doc(db, 'rooms', roomId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const remoteCode = docSnap.data().code;
        // Update local state only if the remote code is different
        // from the current state. This check is crucial to prevent loops.
        setCode(currentCode => {
            if (remoteCode !== currentCode) {
                isRemoteChange.current = true;
                return remoteCode;
            }
            return currentCode;
        });
      } else {
        toast({ title: 'Error', description: 'Session not found. Returning to home.', variant: 'destructive' });
        onLeave();
      }
    }, (error) => {
      console.error("Firestore snapshot error:", error);
      toast({ title: 'Error', description: 'Could not connect to session.', variant: 'destructive' });
      onLeave();
    });

    // Cleanup: unsubscribe from listener and clear any pending debounced updates.
    return () => {
      unsubscribe();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [roomId, onLeave, toast]);

  // This is called when the user types in the CodeMirror editor.
  const onEditorChange = useCallback((value: string) => {
    // If the change was triggered by a Firestore update, ignore it.
    if (isRemoteChange.current) {
      isRemoteChange.current = false;
      return;
    }
    setCode(value);
    debouncedUpdate(value);
  }, [debouncedUpdate]);

  // Function to copy the Room ID to the clipboard.
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    toast({
      title: 'Copied to Clipboard!',
      description: 'The Room ID is ready to be shared.',
    });
  };

  // Function to get and apply an AI code suggestion.
  const handleAiSuggestion = async () => {
    setIsAiLoading(true);
    try {
      const result = await getCodeSuggestion({ codeContext: code });
      if (result.suggestion) {
        const newCode = code + '\n' + result.suggestion;
        setCode(newCode);
        updateFirestore(newCode);
        toast({ title: 'AI Suggestion Applied', description: 'A new code snippet has been added.' });
      } else {
        toast({ title: 'AI Suggestion', description: 'No suggestion was available.' });
      }
    } catch (error) {
      console.error("Error getting AI suggestion:", error);
      toast({ title: 'AI Error', description: 'Could not retrieve a suggestion.', variant: 'destructive' });
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 md:px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-primary">CodeSync</h1>
          <div className="hidden items-center gap-2 rounded-md border bg-background px-3 py-1.5 md:flex">
            <span className="text-sm font-medium text-muted-foreground">Room:</span>
            <span className="text-sm font-mono font-semibold">{roomId}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyRoomId}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleAiSuggestion} variant="outline" disabled={isAiLoading}>
            {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            Suggest Code
          </Button>
          <Button onClick={onLeave} variant="secondary">
            <Home className="mr-2 h-4 w-4" />
            Leave
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        <CodeMirror
          value={code}
          height="calc(100vh - 64px)"
          extensions={[javascript({ jsx: true })]}
          theme={vscodeDark}
          onChange={onEditorChange}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            foldGutter: true,
            drawSelection: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: true,
          }}
        />
      </main>
    </div>
  );
}
