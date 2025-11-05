import { AppSidebar } from "@/components/ui/app-sidebar";
import "./globals.css";
import { Sidebar, SidebarProvider } from "@/components/ui/sidebar";
import localFont from 'next/font/local';

const bukra = localFont({
  src: [
    {
      path: '../public/fonts/29LTBukra-ExtraLight.otf',
      weight: '200',
      style: 'normal',
    },
    {
      path: '../public/fonts/29LTBukra-Regular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/29LTBukra-Medium.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../public/fonts/29LTBukra-Bold.otf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-bukra',
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${bukra.variable} font-sans`}>
        <SidebarProvider>
          <AppSidebar />
          <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
        </SidebarProvider>
      </body>
    </html>
  );
}
