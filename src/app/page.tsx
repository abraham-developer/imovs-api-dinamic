'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useCubearkStore } from '@/store/cubeark-store';
import { useAuthStore } from '@/store/auth-store';
import { WorkflowDashboard } from '@/components/cubeark/workflow-dashboard';
import { WorkflowEditor } from '@/components/cubeark/workflow-editor';
import { ExecutionViewer } from '@/components/cubeark/execution-viewer';
import { LoginPage } from '@/components/cubeark/login-page';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { currentView } = useCubearkStore();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [transitioning, setTransitioning] = useState(false);
  const prevAuthRef = useRef(isAuthenticated);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // When isAuthenticated changes from false→true, show a brief loading spinner
  // before rendering the dashboard to avoid Bad Gateway if API fails immediately
  useEffect(() => {
    const wasAuth = prevAuthRef.current;
    prevAuthRef.current = isAuthenticated;

    if (isAuthenticated && !wasAuth) {
      // Use requestAnimationFrame to avoid synchronous setState in effect
      const rafId = requestAnimationFrame(() => {
        setTransitioning(true);
      });
      const timer = setTimeout(() => setTransitioning(false), 500);
      return () => {
        cancelAnimationFrame(rafId);
        clearTimeout(timer);
      };
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Show loading spinner during transition
  if (transitioning) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
          <p className="text-sm text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      {currentView === 'dashboard' && <WorkflowDashboard />}
      {currentView === 'editor' && <WorkflowEditor />}
      {currentView === 'execution' && <ExecutionViewer />}
    </div>
  );
}
