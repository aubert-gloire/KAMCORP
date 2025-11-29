import { ReactNode, useState, useEffect } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';
import { PageLoader } from './LoadingSpinner';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Public pages that don't need authentication
  const publicPages = ['/login', '/verify-2fa', '/'];
  const isPublicPage = publicPages.includes(router.pathname);

  // Redirect to login if not authenticated (except on public pages)
  // Must be called before any conditional returns
  useEffect(() => {
    if (!user && !isPublicPage && !loading) {
      router.replace('/login');
    }
  }, [user, isPublicPage, loading, router]);

  // Show loader while checking authentication
  if (loading) {
    return <PageLoader />;
  }

  // Show loader during redirect
  if (!user && !isPublicPage) {
    return <PageLoader />;
  }

  // Public pages don't need layout
  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="container mx-auto px-4 py-6 md:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
