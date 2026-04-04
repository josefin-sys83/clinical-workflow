import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Project } from '../types/project';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

interface ProjectsTableProps {
  projects: Project[];
  onProjectClick: (projectId: string) => void;
}

export function ProjectsTable({ projects, onProjectClick }: ProjectsTableProps) {
  const getStatusIcon = (status: Project['status']) => {
    switch (status) {
      case 'On Track':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'At Risk':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'Blocked':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'Awaiting Input':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'Complete':
        return <CheckCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadgeVariant = (status: Project['status']) => {
    switch (status) {
      case 'On Track':
        return 'default';
      case 'At Risk':
        return 'secondary';
      case 'Blocked':
        return 'destructive';
      case 'Awaiting Input':
        return 'outline';
      case 'Complete':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getRoleBadgeClass = (role: Project['myRole']) => {
    switch (role) {
      case 'Author':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'Reviewer':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
      case 'Approver':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'Principal Investigator':
        return 'bg-amber-100 text-amber-800 hover:bg-amber-100';
      case 'Observer':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project Name</TableHead>
            <TableHead>Device Name</TableHead>
            <TableHead>My Role</TableHead>
            <TableHead>Phase</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Open Blockers</TableHead>
            <TableHead>Primary Action</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id} className="hover:bg-gray-50">
              <TableCell>
                <button
                  onClick={() => onProjectClick(project.id)}
                  className="font-medium text-blue-600 hover:underline text-left"
                >
                  {project.name}
                </button>
              </TableCell>
              <TableCell>{project.deviceName}</TableCell>
              <TableCell>
                <Badge className={getRoleBadgeClass(project.myRole)}>
                  {project.myRole}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{project.phase}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getStatusIcon(project.status)}
                  <span className="text-sm">{project.status}</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                {project.blockers > 0 ? (
                  <Badge variant="destructive">{project.blockers}</Badge>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-gray-700">
                {project.primaryAction}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onProjectClick(project.id)}
                >
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
