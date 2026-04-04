import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { CheckCircle2, FileCheck, Shield } from "lucide-react";

export function ProtocolApproval() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              Protocol Approval
            </Badge>
            <h1>Protocol Final Approval</h1>
          </div>
          <p className="text-muted-foreground">
            Final approval signatures required before protocol submission to regulatory authorities.
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Approval Status</CardTitle>
              <CardDescription>
                Protocol v1.0 - Final version ready for approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center gap-3">
                    <Shield className="size-5 text-green-600" />
                    <div>
                      <div className="font-medium text-sm">Regulatory Affairs Director</div>
                      <div className="text-xs text-muted-foreground">Jennifer Martinez</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      <CheckCircle2 className="size-3 mr-1" />
                      Approved
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      45 minutes ago
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center gap-3">
                    <FileCheck className="size-5 text-green-600" />
                    <div>
                      <div className="font-medium text-sm">Quality Assurance Director</div>
                      <div className="text-xs text-muted-foreground">David Thompson</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      <CheckCircle2 className="size-3 mr-1" />
                      Approved
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      30 minutes ago
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Shield className="size-5 text-blue-600" />
                    <div>
                      <div className="font-medium text-sm">Medical Director</div>
                      <div className="text-xs text-muted-foreground">Dr. Patricia Stevens</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      In Review
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      Submitted 5 minutes ago
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <CardTitle className="text-green-900">Approval Checklist</CardTitle>
              <CardDescription className="text-green-700">
                All requirements verified before final approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="size-4" />
                  <span>All review comments addressed</span>
                </div>
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="size-4" />
                  <span>Regulatory compliance verified</span>
                </div>
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="size-4" />
                  <span>Quality standards met</span>
                </div>
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="size-4" />
                  <span>Version control completed</span>
                </div>
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="size-4" />
                  <span>Document signatures verified</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}