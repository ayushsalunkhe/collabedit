# **App Name**: CollabEdit

## Core Features:

- Session Management: Home page with options to create a new session or join an existing one using a room ID.
- CodeMirror Integration: Real-time collaborative code editor powered by CodeMirror, with JavaScript syntax highlighting.
- Real-time Sync: Real-time synchronization of code changes using Firebase Firestore.
- Debouncing: Debounce code updates to Firestore to prevent excessive writes and optimize performance.
- Anonymous Authentication: Use Firebase Anonymous Authentication to identify users without requiring credentials.
- Header/Navbar: Display a header with the application title, room ID, copy functionality, and navigation to the home page.
- AI Code Suggestions: Use generative AI tool to provide code suggestions based on the current code context. Suggest more relevant code snippets to users for improving overall code.

## Style Guidelines:

- Primary color: A vibrant blue (#29ABE2) to reflect collaboration and technology.
- Background color: Dark grey (#282C34) for a modern, distraction-free coding environment.
- Accent color: A warm orange (#FF9800) to highlight interactive elements and CTAs.
- Body and headline font: 'Inter', a grotesque-style sans-serif, for a modern, machined feel; well-suited to both headlines and body text.
- Use icons from lucide-react library for a consistent and modern look.
- Center the main content on the home page. Utilize flexbox and grid for a responsive layout on the editor page.
- Subtle animations for copy confirmation and view transitions for enhanced user feedback.