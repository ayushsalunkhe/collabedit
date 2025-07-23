import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'CollabEdit',
  description: 'Real-time collaborative code editor',
};

const Particles = () => {
  const particleCount = 50;
  return (
    <div className="particles">
      {Array.from({ length: particleCount }).map((_, i) => {
        const style = {
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 20}s`,
          animationDuration: `${10 + Math.random() * 10}s`,
        };
        return <div key={i} className="particle" style={style}></div>;
      })}
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <div className="background-container">
          <div className="gradient-bg"></div>
          <div className="grid-overlay"></div>
          <Particles />
        </div>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
