import './globals.css';

export const metadata = {
  title: 'Magic English - Sehrli Ingliz Tili Platformasi',
  description: 'Professional video darslar bilan ingliz tilini sehrli tarzda o\'rganing. Premium online ta\'lim platformasi.',
  keywords: 'ingliz tili, english learning, video darslar, online ta\'lim',
  openGraph: {
    title: 'Magic English - Sehrli Ingliz Tili Platformasi',
    description: 'Professional video darslar bilan ingliz tilini sehrli tarzda o\'rganing.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="uz">
      <head>
        <meta name="theme-color" content="#0B0B0F" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
