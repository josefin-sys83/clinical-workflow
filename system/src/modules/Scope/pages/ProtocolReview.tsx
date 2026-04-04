import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { CheckCircle2, XCircle, MessageSquare } from "lucide-react";

export function ProtocolReview() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              Protocol Review
            </Badge>
            <h1>Protocol Review & Feedback</h1>
          </div>
          <p className="text-muted-foreground">
            Multi-stakeholder review of clinical investigation protocol for quality and compliance.
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Review Status</CardTitle>
              <CardDescription>
                Protocol v0.5 - Submitted for review 1 hour ago
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <div className="font-medium text-sm">Medical Writer Review</div>
                    <div className="text-xs text-muted-foreground">Dr. Michael Chen</div>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    <CheckCircle2 className="size-3 mr-1" />
                    Approved
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <div className="font-medium text-sm">Statistical Review</div>
                    <div className="text-xs text-muted-foreground">Dr. Robert Kim</div>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    <CheckCircle2 className="size-3 mr-1" />
                    Approved
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <div className="font-medium text-sm">Regulatory Review</div>
                    <div className="text-xs text-muted-foreground">Jennifer Martinez</div>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    <CheckCircle2 className="size-3 mr-1" />
                    Approved
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <div className="font-medium text-sm">Clinical Review</div>
                    <div className="text-xs text-muted-foreground">Dr. Lisa Anderson</div>
                  </div>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700">
                    <MessageSquare className="size-3 mr-1" />
                    2 Comments
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-sm">Quality Assurance Review</div>
                    <div className="text-xs text-muted-foreground">Thomas Berg</div>
                  </div>
                  <Badge variant="outline" className="bg-muted text-muted-foreground">
                    Pending
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Open Comments</CardTitle>
              <CardDescription>
                2 comments require response or revision
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-sm font-medium">Section 5.2 - Adverse Event Reporting</div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 text-xs">
                      Open
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    Dr. Lisa Anderson - 10 minutes ago
                  </div>
                  <div className="text-sm">
                    Please clarify the timeline for reporting serious adverse events to the ethics committee. Current text mentions "immediately" but should specify business hours vs. calendar hours.
                  </div>
                </div>
                <div className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-sm font-medium">Section 4.3 - Exclusion Criteria</div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 text-xs">
                      Open
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    Dr. Lisa Anderson - 25 minutes ago
                  </div>
                  <div className="text-sm">
                    Consider adding "previous participation in similar clinical investigation" as an exclusion criterion to avoid confounding variables.
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