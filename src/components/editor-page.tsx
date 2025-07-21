"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import CodeMirror, { type Extension } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Home, Copy, Wand2, Loader2, Play, Code } from 'lucide-react';
import { executeCode } from '@/ai/flows/code-execution';
import { getCodeSuggestion } from '@/ai/flows/code-suggestion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';


type Language = 'javascript' | 'python' | 'cpp';

const languageExamples: Record<Language, string> = {
  javascript: `// Welcome to your CodeSync session!
function greet(name) {
  console.log(\`Hello, \${name}!\`);
}

greet('World');
`,
  python: `# Welcome to your CodeSync session!
def greet(name):
  print(f"Hello, {name}!")

greet("World")
`,
  cpp: `// Welcome to your CodeSync session!
#include <iostream>
#include <string>

void greet(std::string name) {
  std::cout << "Hello, " << name << "!" << std::endl;
}

int main() {
  greet("World");
  return 0;
}
`,
};


interface EditorPageProps {
  roomId: string;
  onLeave: () => void;
}

export default function EditorPage({ roomId, onLeave }: EditorPageProps) {
  const [code, setCode] = useState<string>('// Loading code...');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [language, setLanguage] = useState<Language>('javascript');
  const [langExtension, setLangExtension] = useState<Extension>(() => javascript({ jsx: true }));
  const [isRunning, setIsRunning] = useState(false);
  const [runOutput, setRunOutput] = useState<string | null>(null);

  const { toast } = useToast();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const ignoreNextSnapshot = useRef(false);
  const isLocalChange = useRef(false);

  useEffect(() => {
    switch (language) {
      case 'python':
        setLangExtension(python());
        break;
      case 'cpp':
        setLangExtension(cpp());
        break;
      case 'javascript':
      default:
        setLangExtension(javascript({ jsx: true }));
        break;
    }
  }, [language]);

  const updateFirestore = useCallback(async (newCode: string, newLang?: Language) => {
    try {
      await setDoc(doc(db, 'rooms', roomId), { code: newCode, language: newLang || language }, { merge: true });
    } catch (error) {
      console.error('Error updating document:', error);
      toast({ title: 'Error', description: 'Failed to save changes.', variant: 'destructive' });
    }
  }, [roomId, toast, language]);

  const debouncedUpdate = useCallback((value: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        ignoreNextSnapshot.current = true;
        updateFirestore(value);
        setTimeout(() => {
          ignoreNextSnapshot.current = false;
        }, 100);
      }, 500);
  }, [updateFirestore])

  useEffect(() => {
    const docRef = doc(db, 'rooms', roomId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (ignoreNextSnapshot.current) {
        return;
      }
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const remoteCode = data.code;
        const remoteLang = data.language || 'javascript';
        
        setCode(remoteCode);
        
        if (remoteLang !== language) {
          setLanguage(remoteLang);
        }

      } else {
        toast({ title: 'Error', description: 'Session not found. Returning to home.', variant: 'destructive' });
        onLeave();
      }
    }, (error) => {
      console.error("Firestore snapshot error:", error);
      toast({ title: 'Error', description: 'Could not connect to session.', variant: 'destructive' });
      onLeave();
    });

    return () => {
      unsubscribe();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [roomId, onLeave, toast, language]);

  const onEditorChange = useCallback((value: string) => {
    setCode(value);
    debouncedUpdate(value);
  }, [debouncedUpdate]);

  const handleLanguageChange = (newLang: Language) => {
    const newCode = languageExamples[newLang];
    setLanguage(newLang);
    setCode(newCode);
    setRunOutput(null); // Clear output on language change
    ignoreNextSnapshot.current = true;
    updateFirestore(newCode, newLang);
    setTimeout(() => {
        ignoreNextSnapshot.current = false;
    }, 100);
  }
  
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    toast({
      title: 'Copied to Clipboard!',
      description: 'The Room ID is ready to be shared.',
    });
  };

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

  const handleRunCode = async () => {
    setIsRunning(true);
    setRunOutput(null);
    try {
        const result = await executeCode({ code, language });
        setRunOutput(result.output);
        toast({ title: 'Execution Simulated', description: `AI predicted the output for ${language}.` });
    } catch (error) {
        console.error("Error getting AI execution:", error);
        toast({ title: 'AI Error', description: 'Could not simulate execution.', variant: 'destructive' });
        setRunOutput('Error: Could not simulate code execution.');
    } finally {
        setIsRunning(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-auto shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-card/80 p-4 backdrop-blur-lg md:h-16 md:flex-nowrap">
        <div className="flex w-full items-center justify-between md:w-auto">
          <h1 className="text-xl font-bold text-primary flex items-center gap-2"><Code /> CodeSync</h1>
          <div className="md:hidden">
            <Button onClick={onLeave} variant="secondary" size="sm">
              <Home className="mr-2 h-4 w-4" />
              Leave
            </Button>
          </div>
        </div>

        <div className="flex w-full items-center justify-center rounded-md border bg-background px-3 py-1.5 md:w-auto md:justify-start">
          <span className="text-sm font-medium text-muted-foreground">Room:</span>
          <span className="ml-2 text-sm font-mono font-semibold">{roomId}</span>
          <Button variant="ghost" size="icon" className="ml-auto h-7 w-7" onClick={copyRoomId}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex w-full items-center justify-between gap-2 md:w-auto">
            <Select value={language} onValueChange={(value: Language) => handleLanguageChange(value)}>
                <SelectTrigger className="w-full md:w-[140px]">
                    <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="cpp">C++</SelectItem>
                </SelectContent>
            </Select>

          <Button onClick={handleAiSuggestion} variant="outline" disabled={isAiLoading || isRunning} className="flex-1 md:flex-none">
            {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            Suggest
          </Button>

          <Button onClick={handleRunCode} variant="secondary" disabled={isRunning} className="flex-1 md:flex-none">
              {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Run
          </Button>
          
          <div className="hidden md:block">
            <Button onClick={onLeave} variant="secondary">
              <Home className="mr-2 h-4 w-4" />
              Leave
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-auto flex flex-col">
        <div className="flex-1">
          <CodeMirror
            value={code}
            height={runOutput || isRunning ? "calc(100vh - 64px - 140px - 88px)" : "calc(100vh - 64px - 88px)"}
            extensions={[langExtension]}
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
        </div>
        {(isRunning || runOutput) && (
          <div className="h-[140px] p-4 border-t bg-card/80">
            <h3 className="text-lg font-semibold mb-2">Output</h3>
            {isRunning && (
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Executing code...</span>
                </div>
            )}
            {runOutput && (
                <Alert>
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Execution Result</AlertTitle>
                    <AlertDescription className="font-mono whitespace-pre-wrap">
                        {runOutput}
                    </AlertDescription>
                </Alert>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
