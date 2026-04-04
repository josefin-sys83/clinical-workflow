import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { CheckCircle2, Award, Lock, FileCheck } from "lucide-react";

export function ReportApproval() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              Report Approval
            </Badge>
            <h1>Final CSR Approval</h1>
          </div>
          <p className="text-muted-foreground">
            Final approval signatures for clinical study report before regulatory submission.
          </p>
        </div>

        <div className="space-y-6">
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-900">
                <Award className="size-5" />
                All Approvals Complete
              </CardTitle>
              <CardDescription className="text-green-700">
                CSR v1.0 ready for regulatory submission
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-green-200">
                  <div className="flex items-center gap-3">
                    <FileCheck className="size-5 text-green-700" />
                    <div>
                      <div className="font-medium text-sm text-green-900">Regulatory Affairs Director</div>
                      <div className="text-xs text-green-700">Jennifer Martinez</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                      <CheckCircle2 className="size-3 mr-1" />
                      Approved
                    </Badge>
                    <div className="text-xs text-green-700 mt-1">
                      35 minutes ago
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-green-200">
                  <div className="flex items-center gap-3">
                    <FileCheck className="size-5 text-green-700" />
                    <div>
                      <div className="font-medium text-sm text-green-900">Quality Assurance Director</div>
                      <div className="text-xs text-green-700">David Thompson</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                      <CheckCircle2 className="size-3 mr-1" />
                      Approved
                    </Badge>
                    <div className="text-xs text-green-700 mt-1">
                      18 minutes ago
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <FileCheck className="size-5 text-green-700" />
                    <div>
                      <div className="font-medium text-sm text-green-900">Medical Director</div>
                      <div className="text-xs text-green-700">Dr. Patricia Stevens</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                      <CheckCircle2 className="size-3 mr-1" />
                      Approved
                    </Badge>
                    <div className="text-xs text-green-700 mt-1">
                      3 minutes ago
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Document Information</CardTitle>
              <CardDescription>
                Approved clinical study report details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">Document Version</div>
                  <div className="font-medium">CSR v1.0 - Final</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Approval Date</div>
                  <div className="font-medium">{new Date().toLocaleDateString('sv-SE')}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Study Protocol</div>
                  <div className="font-medium">Protocol v1.0</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Document Status</div>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    <Lock className="size-3 mr-1" />
                    Locked
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pre-Submission Checklist</CardTitle>
              <CardDescription>
                All requirements verified before regulatory submission
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="size-4" />
                  <span>All review comments resolved</span>
                </div>
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="size-4" />
                  <span>Statistical analysis verified</span>
                </div>
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="size-4" />
                  <span>Safety data validated</span>
                </div>
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="size-4" />
                  <span>Regulatory compliance confirmed</span>
                </div>
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="size-4" />
                  <span>Quality standards met</span>
                </div>
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="size-4" />
                  <span>All approval signatures collected</span>
                </div>
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="size-4" />
                  <span>Document version locked</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Award className="size-5 text-blue-700" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-blue-900 mb-1">
                    Ready for Regulatory Submission
                  </h4>
                  <p className="text-sm text-blue-700 mb-4">
                    This clinical study report has received all required approvals and is ready for submission to regulatory authorities. The document is now locked and cannot be modified.
                  </p>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Prepare Submission Package
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}