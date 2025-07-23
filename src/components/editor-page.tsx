
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
import { Home, Copy, Wand2, Loader2, Play, Code, MessageSquare, Bug } from 'lucide-react';
import { executeCode } from '@/ai/flows/code-execution';
import { getCodeSuggestion } from '@/ai/flows/code-suggestion';
import { debugCode, type DebugCodeOutput } from '@/ai/flows/debug-code';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import ChatPanel from './chat-panel';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


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
  const [isDebugging, setIsDebugging] = useState(false);
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [debugAnalysis, setDebugAnalysis] = useState<DebugCodeOutput | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const tempNameRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isLocalChange = useRef(false);

  // Computed state to check if the output is an error
  const isErrorOutput = runOutput && /error/i.test(runOutput);

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
    isLocalChange.current = true;
    try {
      await setDoc(doc(db, 'rooms', roomId), { code: newCode, language: newLang || language }, { merge: true });
    } catch (error) {
      console.error('Error updating document:', error);
      toast({ title: 'Error', description: 'Failed to save changes.', variant: 'destructive' });
    } finally {
        setTimeout(() => {
            isLocalChange.current = false;
        }, 100);
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
    const docRef = doc(db, 'rooms', roomId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (isLocalChange.current) {
        return;
      }
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const remoteCode = data.code;
        const remoteLang = data.language || 'javascript';
        
        setCode(prevCode => remoteCode !== prevCode ? remoteCode : prevCode);
        setLanguage(prevLang => remoteLang !== prevLang ? remoteLang : prevLang);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, onLeave, toast]);

  const onEditorChange = useCallback((value: string) => {
    isLocalChange.current = true;
    setCode(value);
    debouncedUpdate(value);
  }, [debouncedUpdate]);

  const handleLanguageChange = (newLang: Language) => {
    const newCode = languageExamples[newLang];
    setLanguage(newLang);
    setCode(newCode);
    setRunOutput(null); // Clear output on language change
    setDebugAnalysis(null);
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
    setDebugAnalysis(null);
    try {
      const result = await getCodeSuggestion({ codeContext: code });
      if (result.suggestion) {
        const newCode = code + '\n' + result.suggestion;
        onEditorChange(newCode);
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
    setDebugAnalysis(null);
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

  const handleDebugCode = async () => {
    if (!runOutput) return;
    setIsDebugging(true);
    try {
      const result = await debugCode({ code, language, errorMessage: runOutput });
      setDebugAnalysis(result);
      toast({ title: 'AI Debugger', description: 'Analysis complete.' });
    } catch (error) {
      console.error("Error getting AI debug analysis:", error);
      toast({ title: 'AI Error', description: 'Could not retrieve debug analysis.', variant: 'destructive' });
    } finally {
      setIsDebugging(false);
    }
  };

  const handleChatClick = () => {
    if (!displayName) {
      setIsNameDialogOpen(true);
    } else {
      setIsChatOpen(true);
    }
  };

  const handleSaveName = () => {
    const name = tempNameRef.current?.value.trim();
    if (name) {
      setDisplayName(name);
      setIsNameDialogOpen(false);
      setIsChatOpen(true);
      localStorage.setItem(`displayName-${roomId}`, name);
    } else {
      toast({
        title: "Name Required",
        description: "Please enter a name to join the chat.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const savedName = localStorage.getItem(`displayName-${roomId}`);
    if (savedName) {
      setDisplayName(savedName);
    }
  }, [roomId]);
  
  const bottomPanelHeight = runOutput || isRunning ? "h-[250px]" : "h-0";
  const editorHeight = `calc(100vh - 64px - ${runOutput || isRunning ? "250px" : "0px"})`;

  return (
    <>
      <AlertDialog open={isNameDialogOpen} onOpenChange={setIsNameDialogOpen}>
        <AlertDialogContent className="z-[9999]">
          <AlertDialogHeader>
            <AlertDialogTitle>What should we call you?</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a display name to use in the chat and voice channel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2 py-2">
             <Label htmlFor="name">Display Name</Label>
             <Input id="name" placeholder="Ada Lovelace" ref={tempNameRef} onKeyUp={(e) => e.key === 'Enter' && handleSaveName()} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveName}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex h-screen flex-col bg-background">
        <header className="flex h-auto shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-card/80 p-4 backdrop-blur-lg md:h-16 md:flex-nowrap">
          <div className="flex w-full items-center justify-between md:w-auto md:flex-1">
            <h1 className="text-xl font-bold text-primary flex items-center gap-2"><Code /> CodeSync</h1>
            <div className="md:hidden flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleChatClick}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Chat
                </Button>
              <Button onClick={onLeave} variant="secondary" size="sm">
                <Home className="mr-2 h-4 w-4" />
                Leave
              </Button>
            </div>
          </div>

          <div className="flex w-full items-center justify-center rounded-md border bg-background px-3 py-1.5 md:w-auto md:justify-start">
            <span className="text-sm font-medium text-muted-foreground">Room:</span>
            <span className="ml-2 text-sm font-mono font-semibold">{roomId}</span>
            <Button variant="ghost" size="icon" className="ml-2 h-7 w-7" onClick={copyRoomId}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex w-full items-center justify-end gap-2 md:w-auto md:flex-1">
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
            
            <div className="hidden md:flex items-center gap-2">
              <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" onClick={handleChatClick}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Chat
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px] p-0 flex flex-col">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle>Team Chat</SheetTitle>
                  </SheetHeader>
                  {displayName ? <ChatPanel roomId={roomId} displayName={displayName} /> : <div className="p-4 text-center text-muted-foreground">Please set a name to chat.</div>}
                </SheetContent>
              </Sheet>
              <Button onClick={onLeave} variant="secondary">
                <Home className="mr-2 h-4 w-4" />
                Leave
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto flex flex-col">
          <div className="flex-1" style={{height: editorHeight}}>
            <CodeMirror
              value={code}
              height="100%"
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
            <div className={`p-4 border-t bg-card/80 flex flex-col transition-all duration-300 ${bottomPanelHeight}`}>
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">Output</h3>
                    {isErrorOutput && (
                        <Button onClick={handleDebugCode} variant="destructive" size="sm" disabled={isDebugging}>
                            {isDebugging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bug className="mr-2 h-4 w-4" />}
                            Debug with AI
                        </Button>
                    )}
                </div>
              
              {isRunning && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Executing code...</span>
                  </div>
              )}
              <div className="flex-1 overflow-auto flex gap-4">
                {runOutput && (
                    <Alert variant={isErrorOutput ? 'destructive' : 'default'} className="flex-1 overflow-auto">
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>Execution Result</AlertTitle>
                        <AlertDescription className="font-mono whitespace-pre-wrap text-sm">
                            {runOutput}
                        </AlertDescription>
                    </Alert>
                )}
                {(isDebugging || debugAnalysis) && (
                    <div className="flex-1">
                        {isDebugging && (
                            <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Analyzing error...</span>
                            </div>
                        )}
                        {debugAnalysis && (
                            <Alert variant="default" className="flex-1 overflow-auto bg-background/50 h-full">
                                <Bug className="h-4 w-4" />
                                <AlertTitle>AI Debugger Analysis</AlertTitle>
                                <AlertDescription>
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-semibold mb-1">Explanation</h4>
                                            <p className="text-sm">{debugAnalysis.explanation}</p>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Suggested Fix</h4>
                                            <pre className="bg-muted p-2 rounded-md font-mono text-sm overflow-auto"><code>{debugAnalysis.suggestion}</code></pre>
                                        </div>
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
