import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { CheckCircle2, AlertCircle, MessageSquare } from "lucide-react";

export function ReportReview() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              Report Review
            </Badge>
            <h1>CSR Review & Validation</h1>
          </div>
          <p className="text-muted-foreground">
            Comprehensive review of clinical study report for accuracy, completeness, and regulatory compliance.
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Review Status Overview</CardTitle>
              <CardDescription>
                CSR v0.8 - Submitted for review 50 minutes ago
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-700">3</div>
                  <div className="text-xs text-green-600 mt-1">Approved</div>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="text-2xl font-bold text-amber-700">2</div>
                  <div className="text-xs text-amber-600 mt-1">Comments</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg border border-border">
                  <div className="text-2xl font-bold text-muted-foreground">1</div>
                  <div className="text-xs text-muted-foreground mt-1">Pending</div>
                </div>
              </div>

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
                    <div className="font-medium text-sm">Clinical Review</div>
                    <div className="text-xs text-muted-foreground">Dr. Lisa Anderson</div>
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
                  <Badge variant="outline" className="bg-amber-50 text-amber-700">
                    <MessageSquare className="size-3 mr-1" />
                    1 Comment
                  </Badge>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <div className="font-medium text-sm">Quality Assurance Review</div>
                    <div className="text-xs text-muted-foreground">David Thompson</div>
                  </div>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700">
                    <MessageSquare className="size-3 mr-1" />
                    1 Comment
                  </Badge>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-sm">Safety Review</div>
                    <div className="text-xs text-muted-foreground">Dr. Patricia Stevens</div>
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
              <CardTitle>Active Comments</CardTitle>
              <CardDescription>
                2 comments require author response
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="border border-amber-200 rounded-lg p-4 bg-amber-50/50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-sm font-medium">Section 2.3 - Device Classification</div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 text-xs">
                      Open
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    Jennifer Martinez (Regulatory) - 22 minutes ago
                  </div>
                  <div className="text-sm">
                    Please clarify the device classification statement according to MDR 2017/745 Article 51. Current wording may be ambiguous for notified body review.
                  </div>
                </div>

                <div className="border border-amber-200 rounded-lg p-4 bg-amber-50/50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-sm font-medium">Section 5.4 - Protocol Deviations</div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 text-xs">
                      Open
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    David Thompson (QA) - 35 minutes ago
                  </div>
                  <div className="text-sm">
                    Add more detailed explanation of how major protocol deviations were handled and their impact on study conclusions. Reference the deviation log in appendix.
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