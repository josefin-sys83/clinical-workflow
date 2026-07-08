import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getProject } from '@/shared/api/projects';
import { Button } from './ui/button';

export function ProjectView() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [project, setProject] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const pRes = projectId ? await getProject(projectId) : null;
        if (!isMounted) return;
        setProject(pRes);
      } catch (e) {
        console.error('Failed to load project', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-600">Loading project…</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Project not found</h1>
          <Button onClick={() => navigate('/dashboard')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-[1440px] mx-auto px-8 py-4">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/dashboard')} variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{project.name}</h1>
              <p className="text-sm text-gray-600">{project.description}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-8 py-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Overview</h2>
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <div className="text-sm text-gray-500 mb-1">Project ID</div>
              <div className="text-gray-900 font-medium">{project.id}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Status</div>
              <span className={`text-xs px-2 py-1 rounded font-medium ${
                project.status === 'completed' ? 'bg-blue-50 text-blue-700' : 'bg-blue-50 text-blue-700'
              }`}>
                {project.status === 'completed' ? 'Completed' : 'Active'}
              </span>
            </div>
          </div>
          <div className="border-t pt-6">
            <p className="text-sm text-gray-600 mb-4 max-w-2xl">
              This project doesn't have any content yet. Clicking "Open workflow" starts the
              guided process for building out the clinical investigation: you'll first fill in
              the project's basic identity and assign the required team roles, then the
              synopsis and scope, before the protocol and report can be authored. Each phase
              unlocks the next once its requirements are met.
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 mb-5">
              {['Setup', 'Synopsis', 'Scope', 'Protocol', 'Report'].map((label, i, arr) => (
                <span key={label} className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-gray-100 rounded">{label}</span>
                  {i < arr.length - 1 && <span aria-hidden="true">→</span>}
                </span>
              ))}
            </div>
            <Button onClick={() => navigate(`/projects/${projectId}/workflow/project-setup`)}>
              Open workflow
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}