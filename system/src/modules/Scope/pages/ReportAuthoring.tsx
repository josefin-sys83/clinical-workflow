import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { FileText, TrendingUp, Activity } from "lucide-react";

export function ReportAuthoring() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
              Report Authoring
            </Badge>
            <h1>Clinical Study Report</h1>
          </div>
          <p className="text-muted-foreground">
            Develop comprehensive clinical study report based on completed investigation and data analysis.
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Progress</CardTitle>
              <CardDescription>
                CSR v0.2 - Last modified 15 minutes ago
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Activity className="size-8 text-blue-600" />
                  <div className="flex-1">
                    <div className="text-sm font-medium mb-1">Overall Completion</div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: "45%" }}></div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">45% complete</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Report Sections</CardTitle>
              <CardDescription>
                ICH E3 compliant clinical study report structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <div className="font-medium">1. Synopsis</div>
                    <div className="text-xs text-muted-foreground">Executive summary of study</div>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700">Complete</Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <div className="font-medium">2. Introduction & Objectives</div>
                    <div className="text-xs text-muted-foreground">Study rationale and aims</div>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700">Complete</Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <div className="font-medium">3. Study Design & Methods</div>
                    <div className="text-xs text-muted-foreground">Protocol summary</div>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700">Complete</Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <div className="font-medium">4. Study Population</div>
                    <div className="text-xs text-muted-foreground">Participant demographics</div>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700">Complete</Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <div className="font-medium">5. Efficacy Results</div>
                    <div className="text-xs text-muted-foreground">Primary and secondary endpoints</div>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">In Progress</Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <div className="font-medium">6. Safety Results</div>
                    <div className="text-xs text-muted-foreground">Adverse events analysis</div>
                  </div>
                  <Badge variant="outline" className="bg-muted text-muted-foreground">Not Started</Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <div className="font-medium">7. Discussion & Conclusions</div>
                    <div className="text-xs text-muted-foreground">Interpretation and implications</div>
                  </div>
                  <Badge variant="outline" className="bg-muted text-muted-foreground">Not Started</Badge>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium">8. References & Appendices</div>
                    <div className="text-xs text-muted-foreground">Supporting documentation</div>
                  </div>
                  <Badge variant="outline" className="bg-muted text-muted-foreground">Not Started</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Key Findings Summary</CardTitle>
              <CardDescription>
                Preliminary results for report authoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <TrendingUp className="size-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium mb-1">Primary Endpoint Met</div>
                    <div className="text-muted-foreground">
                      6-month survival with functional assessment achieved in 87% of participants (p &lt; 0.001)
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <FileText className="size-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium mb-1">Safety Profile</div>
                    <div className="text-muted-foreground">
                      No unexpected adverse device effects reported; safety profile consistent with pre-clinical data
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}