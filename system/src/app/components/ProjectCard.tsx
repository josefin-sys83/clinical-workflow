import { ArrowRight } from 'lucide-react';
import { Button } from './ui/button';

interface ProjectCardProps {
  project: any;
  onViewProject: (projectId: string) => void;
}

export function ProjectCard({ project, onViewProject }: ProjectCardProps) {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{project.name}</h3>
          <div className="text-sm text-gray-500 mb-2">ID: {project.id}</div>
          {project.description && (
            <div className="text-sm text-gray-600">{project.description}</div>
          )}
          <div className="mt-2">
            <span className={`text-xs px-2 py-1 rounded font-medium ${
              project.status === 'completed' 
                ? 'bg-blue-50 text-blue-700' 
                : 'bg-green-50 text-green-700'
            }`}>
              {project.status === 'completed' ? 'Completed' : 'Active'}
            </span>
          </div>
        </div>
        <Button
          onClick={() => onViewProject(project.id)}
          className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 gap-2"
        >
          Go to project
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}