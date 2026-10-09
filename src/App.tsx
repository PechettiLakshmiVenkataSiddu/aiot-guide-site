import { useState, useEffect } from 'react';
import { SensoryProvider } from './context/SensoryContext';
import { Header } from './components/Header';
import { BottomNav, type TabType } from './components/BottomNav';
import { HomePage } from './pages/HomePage';
import { RoadmapPage } from './pages/RoadmapPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { AskPage } from './pages/AskPage';
import { ProgressPage } from './pages/ProgressPage';
import { DebugPage } from './pages/DebugPage';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isDebug, setIsDebug] = useState(() => {
    return typeof window !== 'undefined' && window.location.hash.toLowerCase() === '#debug';
  });
  const [projectsFilter, setProjectsFilter] = useState<'hardware' | 'sunday' | 'arch'>('hardware');
  const [askInitialQuery, setAskInitialQuery] = useState<string>('');
  const [scopedProject, setScopedProject] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    const handleHash = () => {
      setIsDebug(window.location.hash.toLowerCase() === '#debug');
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleNavigateToProjects = (filter: 'hardware' | 'sunday' | 'arch' = 'hardware') => {
    setProjectsFilter(filter);
    setActiveTab('projects');
  };

  const handleNavigateToRoadmap = () => {
    setActiveTab('roadmap');
  };

  const handleNavigateToAsk = (initialQuery: string = '') => {
    setAskInitialQuery(initialQuery);
    setScopedProject(null);
    setActiveTab('ask');
  };

  const handleAskProject = (projectId: string, projectTitle: string) => {
    setScopedProject({ id: projectId, title: projectTitle });
    setAskInitialQuery(`What are the key details and build steps for ${projectTitle}?`);
    setActiveTab('ask');
  };

  return (
    <SensoryProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
        {/* Sticky Header with Sensory Controls */}
        <Header />

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-md md:max-w-3xl lg:max-w-4xl mx-auto px-4 pt-4 pb-20">
          {isDebug ? (
            <DebugPage
              onBack={() => {
                window.location.hash = '';
                setIsDebug(false);
              }}
            />
          ) : (
            <>
              {activeTab === 'home' && (
                <HomePage
                  onNavigateToProjects={handleNavigateToProjects}
                  onNavigateToRoadmap={handleNavigateToRoadmap}
                  onNavigateToAsk={handleNavigateToAsk}
                />
              )}

              {activeTab === 'roadmap' && <RoadmapPage />}

              {activeTab === 'projects' && (
                <ProjectsPage
                  initialFilter={projectsFilter}
                  onAskProject={handleAskProject}
                />
              )}

              {activeTab === 'ask' && (
                <AskPage
                  initialQuery={askInitialQuery}
                  scopedProjectId={scopedProject?.id}
                  scopedProjectTitle={scopedProject?.title}
                  onClearScope={() => setScopedProject(null)}
                />
              )}

              {activeTab === 'progress' && <ProgressPage />}
            </>
          )}
        </main>

        {/* Fixed Mobile Bottom Navigation */}
        <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />
      </div>
    </SensoryProvider>
  );
}

export default App;
