import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { FileText, Clock, User } from "lucide-react";

export function ProtocolAuthoring() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
              Protocol Authoring
            </Badge>
            <h1>Clinical Investigation Protocol</h1>
          </div>
          <p className="text-muted-foreground">
            Develop and refine the clinical investigation protocol based on approved scope and requirements.
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Draft</CardTitle>
              <CardDescription>
                Version 0.3 - Last modified 20 minutes ago
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Protocol_v0.3_Draft.docx</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Dr. Michael Chen</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">In Progress</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Document Sections</CardTitle>
              <CardDescription>
                Protocol structure based on ISO 14155 requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-2 border-b">
                  <span>1. Introduction & Background</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700">Complete</Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span>2. Study Objectives</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700">Complete</Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span>3. Study Design & Endpoints</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">In Progress</Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span>4. Study Population</span>
                  <Badge variant="outline" className="bg-muted text-muted-foreground">Not Started</Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span>5. Procedures & Assessments</span>
                  <Badge variant="outline" className="bg-muted text-muted-foreground">Not Started</Badge>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span>6. Statistical Analysis Plan</span>
                  <Badge variant="outline" className="bg-muted text-muted-foreground">Not Started</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}