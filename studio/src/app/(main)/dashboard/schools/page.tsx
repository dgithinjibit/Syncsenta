
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SchoolsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Schools Management</CardTitle>
                <CardDescription>
                    This page will contain tools to view and manage all schools in the county. You will be able to drill down into individual school dashboards from here.
                </CardDescription>
            </CardHeader>
        </Card>
    );
}
