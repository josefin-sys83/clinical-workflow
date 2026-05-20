import { useEffect, useMemo, useState } from 'react';
import { User, Filter, Settings, LogOut, Bell, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { listProjects, listCompletedProjects, createProject } from '@/shared/api/projects';
import { AIAssistant } from './AIAssistant';
import { ProjectCard } from './ProjectCard';
import { ActionsByProject } from './ActionsByProject';
import { Button } from './ui/button';

type FilterMode = 'all' | 'signatures' | 'blockers' | 'review' | 'input-needed';

export function Dashboard() {
  const navigate = useNavigate();
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [completedProjects, setCompletedProjects] = useState<any[]>([]);
  const [openItems] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [p1, p2] = await Promise.all([
          listProjects(),
          listCompletedProjects(),
        ]);
        if (!isMounted) return;
        setProjects(p1);
        setCompletedProjects(p2);
      } catch (e: any) {
        console.error('Failed to load projects', e);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const handleProjectClick = (projectId: string) => {
    const lastPage = localStorage.getItem(`lastPage_${projectId}`);
    navigate(lastPage || `/projects/${projectId}`);
  };

  const handleItemClick = (link: string) => {
    navigate(link);
  };

  const handleNewProject = async () => {
    try {
      const project = await createProject({ name: 'New Project', deviceName: 'TBD' });
      navigate(`/projects/${project.id}/workflow/project-setup`);
    } catch (e: any) {
      console.error('Failed to create project', e);
    }
  };

  const filteredItems = useMemo(() => {
    return [...openItems];
  }, [filterMode, openItems, projects]);

  const getFilterLabel = () => {
    switch (filterMode) {
      case 'all': return 'All My Actions';
      case 'signatures': return 'Awaiting My Signature';
      case 'blockers': return 'Blocking Issues';
      case 'review': return 'Review Needed';
      case 'input-needed': return 'Input Needed';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-[1200px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">Clinical Investigation Platform</h1>
            <div className="flex items-center gap-3">
              <Button onClick={handleNewProject} className="gap-2 bg-blue-900 hover:bg-blue-950 text-white">
                <span className="text-lg leading-none">+</span>
                New Project
              </Button>
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center hover:bg-gray-700 transition-colors"
                >
                  <User className="h-4 w-4 text-white" />
                </button>
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                      <div className="py-1">
                        <button onClick={() => setShowUserMenu(false)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                          <Settings className="h-4 w-4 text-gray-500" /><span>Settings</span>
                        </button>
                        <button onClick={() => setShowUserMenu(false)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                          <Bell className="h-4 w-4 text-gray-500" /><span>Notifications</span>
                        </button>
                        <button onClick={() => setShowUserMenu(false)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                          <Shield className="h-4 w-4 text-gray-500" /><span>Compliance & Security</span>
                        </button>
                      </div>
                      <div className="border-t border-gray-200 pt-1">
                        <button onClick={() => { localStorage.removeItem('clinical_system_token'); window.location.href = '/login'; }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                          <LogOut className="h-4 w-4 text-gray-500" /><span>Log out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-8 py-8">
        <section className="mb-10">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-gray-900">My Required Actions</h2>
            <p className="text-sm text-gray-600 mt-1">Tasks that need my attention across all projects</p>
            <div className="flex items-center gap-2 mt-4">
              <Filter className="h-4 w-4 text-gray-400" />
              <div className="flex items-center gap-1">
                {(['all', 'signatures', 'blockers', 'review', 'input-needed'] as FilterMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setFilterMode(mode)}
                    className={`px-3 py-1.5 rounded text-sm transition-colors ${filterMode === mode ? 'bg-gray-200 text-gray-900 border border-gray-300 font-semibold' : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'}`}
                  >
                    {mode === 'all' ? 'All' : mode === 'input-needed' ? 'Input Needed' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {filteredItems.length > 0 ? (
            <ActionsByProject items={filteredItems} projects={projects} onItemClick={handleItemClick} />
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No {filterMode !== 'all' ? getFilterLabel()?.toLowerCase() : 'actions'} at this time</p>
            </div>
          )}
        </section>

        <section className="mb-8">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-gray-900">My Projects</h2>
            <p className="text-sm text-gray-600 mt-1">Projects where I have an active role</p>
          </div>
          <div className="space-y-4 mb-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} onViewProject={handleProjectClick} />
            ))}
          </div>
          {completedProjects.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-gray-700 mb-4">Completed Projects</h3>
              <div className="space-y-4">
                {completedProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} onViewProject={handleProjectClick} />
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      <AIAssistant />
    </div>
  );
}