import './globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider } from './providers';
import { ThemeProvider } from '@/lib/theme-config';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Project Management App',
  description: 'A comprehensive project management application',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
