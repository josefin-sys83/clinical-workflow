import { useEffect, useMemo, useState } from 'react';
import { Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { listProjects, listCompletedProjects, createProject } from '@/shared/api/projects';
import { getMyActions, type RequiredAction } from '@/shared/api/me';
import { AIAssistant } from './AIAssistant';
import { ProjectCard } from './ProjectCard';
import { ActionsByProject } from './ActionsByProject';
import { Button } from './ui/button';
import { theme } from '@/app/theme';

type FilterMode = 'all' | 'signatures' | 'blockers' | 'review' | 'input-needed';

export function Dashboard() {
  const navigate = useNavigate();
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [projects, setProjects] = useState<any[]>([]);
  const [completedProjects, setCompletedProjects] = useState<any[]>([]);
  const [requiredActions, setRequiredActions] = useState<RequiredAction[]>([]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [p1, p2, actions] = await Promise.all([
          listProjects(),
          listCompletedProjects(),
          getMyActions(),
        ]);
        if (!isMounted) return;
        setProjects(p1);
        setCompletedProjects(p2);
        setRequiredActions(actions);
      } catch (e: any) {
        console.error('Failed to load dashboard', e);
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
    if (filterMode === 'all') return requiredActions;
    const typeMap: Record<FilterMode, string> = {
      all:           '',
      signatures:    'signature',
      blockers:      'blocker',
      review:        'review',
      'input-needed': 'input',
    };
    return requiredActions.filter(a => a.actionType === typeMap[filterMode]);
  }, [filterMode, requiredActions]);

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
              <Button onClick={handleNewProject} className={`gap-2 ${theme.button.primary}`}>
                <span className="text-lg leading-none">+</span>
                New Project
              </Button>
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
            <ActionsByProject items={filteredItems as any} projects={projects} onItemClick={handleItemClick} />
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