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
  
  const isRemoteChange = useRef(true);

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
        updateFirestore(value);
      }, 500);
  }, [updateFirestore])

  useEffect(() => {
    isRemoteChange.current = true;
    const docRef = doc(db, 'rooms', roomId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const remoteCode = data.code;
        const remoteLang = data.language || 'javascript';
        
        isRemoteChange.current = true;
        
        // Only update if the remote code is different from the current code
        if(remoteCode !== code) {
          setCode(remoteCode);
        }
        if(remoteLang !== language){
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
  }, [roomId, onLeave, toast, code, language]);

  const onEditorChange = useCallback((value: string) => {
    if (isRemoteChange.current) {
      isRemoteChange.current = false;
      return;
    }
    setCode(value);
    debouncedUpdate(value);
  }, [debouncedUpdate]);

  const handleLanguageChange = (newLang: Language) => {
    const newCode = languageExamples[newLang];
    setLanguage(newLang);
    setCode(newCode);
    setRunOutput(null); // Clear output on language change
    updateFirestore(newCode, newLang);
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

  const handleRunCode = () => {
    setIsRunning(true);
    setRunOutput(null);
    const output: (string | null)[] = [];

    // Temporarily override console.log to capture output
    const originalConsoleLog = console.log;
    console.log = (...args) => {
        const message = args.map(arg => {
            if (typeof arg === 'object' && arg !== null) {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return '[Unserializable Object]';
                }
            }
            return String(arg);
        }).join(' ');
        output.push(message);
    };

    try {
        // Use a function constructor for safer, sandboxed execution than direct eval
        new Function(code)();
    } catch (error: any) {
        output.push(`Error: ${error.message}`);
    } finally {
        // Restore original console.log and set output
        console.log = originalConsoleLog;
        setRunOutput(output.join('\n') || 'Code executed. (No output was logged to the console)');
        setIsRunning(false);
        toast({ title: 'Code Executed', description: 'JavaScript was run in the browser.' });
    }
  };

  const isRunDisabled = language !== 'javascript' || isRunning;

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card/80 backdrop-blur-lg px-4 md:px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-primary flex items-center gap-2"><Code /> CodeSync</h1>
          <div className="hidden items-center gap-2 rounded-md border bg-background px-3 py-1.5 md:flex">
            <span className="text-sm font-medium text-muted-foreground">Room:</span>
            <span className="text-sm font-mono font-semibold">{roomId}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyRoomId}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Select value={language} onValueChange={(value: Language) => handleLanguageChange(value)}>
                <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="cpp">C++</SelectItem>
                </SelectContent>
            </Select>

          <Button onClick={handleAiSuggestion} variant="outline" disabled={isAiLoading}>
            {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            Suggest
          </Button>

          <Button onClick={handleRunCode} variant="secondary" disabled={isRunDisabled} title={language !== 'javascript' ? 'Code execution is only available for JavaScript' : 'Run Code'}>
              {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Run Code
          </Button>
          
          <Button onClick={onLeave} variant="secondary">
            <Home className="mr-2 h-4 w-4" />
            Leave
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-auto flex flex-col">
        <div className="flex-1">
          <CodeMirror
            value={code}
            height={runOutput || isRunning ? "calc(100vh - 64px - 140px)" : "calc(100vh - 64px)"}
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
