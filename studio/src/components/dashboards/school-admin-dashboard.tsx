'use client';

import { useState } from 'react';
import {
  Users,
  UserPlus,
  DollarSign,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  GraduationCap,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const mockSchoolAdmin = {
  id: 'admin_1',
  name: 'Mary Njeri',
  school: 'Nairobi Primary School',
  role: 'School Administrator',
};

const mockSchoolStats = {
  totalStudents: 850,
  totalTeachers: 32,
  totalClasses: 24,
  enrollmentRate: 95,
  feeCollectionRate: 78,
  totalFeeBalance: 2450000,
  pendingApprovals: 8,
};

const mockRecentEnrollments = [
  {
    id: 'enroll_1',
    studentName: 'Peter Kamau',
    grade: 'Grade 3',
    parentName: 'Jane Kamau',
    parentPhone: '+254712345678',
    status: 'pending',
    submittedDate: '2026-04-28',
  },
  {
    id: 'enroll_2',
    studentName: 'Sarah Wanjiku',
    grade: 'Grade 1',
    parentName: 'Grace Wanjiku',
    parentPhone: '+254723456789',
    status: 'approved',
    submittedDate: '2026-04-27',
  },
  {
    id: 'enroll_3',
    studentName: 'David Ochieng',
    grade: 'Grade 5',
    parentName: 'John Ochieng',
    parentPhone: '+254734567890',
    status: 'pending',
    submittedDate: '2026-04-26',
  },
];

const mockStaffRoster = [
  {
    id: 'staff_1',
    name: 'Mr. Joseph Kiprotich',
    role: 'Mathematics Teacher',
    classes: ['Grade 5A', 'Grade 6B'],
    status: 'active',
    joinDate: '2024-01-15',
  },
  {
    id: 'staff_2',
    name: 'Ms. Alice Achieng',
    role: 'English Teacher',
    classes: ['Grade 4A', 'Grade 5B'],
    status: 'active',
    joinDate: '2023-08-20',
  },
  {
    id: 'staff_3',
    name: 'Mr. Samuel Mwangi',
    role: 'Science Teacher',
    classes: ['Grade 6A', 'Grade 7A'],
    status: 'pending_approval',
    joinDate: '2026-04-25',
  },
];

const mockFeeStructures = [
  { id: 'fee_1', grade: 'Grade 1-3', termFee: 15000, examFee: 2000, activityFee: 1500, total: 18500 },
  { id: 'fee_2', grade: 'Grade 4-6', termFee: 18000, examFee: 2500, activityFee: 2000, total: 22500 },
  { id: 'fee_3', grade: 'Grade 7-8', termFee: 22000, examFee: 3000, activityFee: 2500, total: 27500 },
];

const mockPendingApprovals = [
  {
    id: 'approval_1',
    type: 'Staff Registration',
    requestor: 'Samuel Mwangi',
    description: 'Science Teacher - Grade 6A, 7A',
    submittedDate: '2026-04-25',
    priority: 'high',
  },
  {
    id: 'approval_2',
    type: 'Fee Waiver',
    requestor: 'Grace Wanjiku (Parent)',
    description: 'Fee waiver request for Amina Wanjiku - Grade 6',
    submittedDate: '2026-04-24',
    priority: 'medium',
  },
  {
    id: 'approval_3',
    type: 'Transfer Request',
    requestor: 'John Ochieng (Parent)',
    description: 'Transfer David Ochieng from Grade 5A to 5B',
    submittedDate: '2026-04-23',
    priority: 'low',
  },
];

export default function SchoolAdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  const schoolStats = mockSchoolStats;
  const enrollments = mockRecentEnrollments;
  const staffRoster = mockStaffRoster;
  const pendingStaff = staffRoster.filter((s) => s.status === 'pending_approval');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground font-headline">
            Karibu, {mockSchoolAdmin.name}
          </h1>
          <p className="text-muted-foreground">
            {mockSchoolAdmin.role} • {mockSchoolAdmin.school}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            Generate Report
          </Button>
          <Button className="gap-2">
            <UserPlus className="h-4 w-4" />
            New Enrollment
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schoolStats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              {schoolStats.enrollmentRate}% enrollment rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teaching Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schoolStats.totalTeachers}</div>
            <p className="text-xs text-muted-foreground">
              {pendingStaff.length} pending approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fee Collection</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schoolStats.feeCollectionRate}%</div>
            <p className="text-xs text-muted-foreground">
              KSh {schoolStats.totalFeeBalance.toLocaleString()} outstanding
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schoolStats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">Require your attention</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
          <TabsTrigger value="staff">Staff Management</TabsTrigger>
          <TabsTrigger value="fees">Fee Management</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Pending Approvals
                </CardTitle>
                <CardDescription>Items requiring your immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {mockPendingApprovals.map((approval) => (
                      <div key={approval.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Badge
                            variant={
                              approval.priority === 'high'
                                ? 'destructive'
                                : approval.priority === 'medium'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {approval.priority} priority
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {approval.submittedDate}
                          </span>
                        </div>
                        <h4 className="font-semibold text-sm">{approval.type}</h4>
                        <p className="text-sm text-muted-foreground">{approval.requestor}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {approval.description}
                        </p>
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline">
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive">
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest school management activities</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className="p-2 bg-green-100 text-green-600 rounded-full">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">Enrollment Approved</h4>
                        <p className="text-xs text-muted-foreground">
                          Sarah Wanjiku enrolled in Grade 1
                        </p>
                        <p className="text-xs text-muted-foreground">2 hours ago</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">Fee Payment Received</h4>
                        <p className="text-xs text-muted-foreground">
                          KSh 22,500 from Grace Wanjiku
                        </p>
                        <p className="text-xs text-muted-foreground">4 hours ago</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className="p-2 bg-orange-100 text-orange-600 rounded-full">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">New Staff Application</h4>
                        <p className="text-xs text-muted-foreground">
                          Samuel Mwangi - Science Teacher
                        </p>
                        <p className="text-xs text-muted-foreground">1 day ago</p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="enrollments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Student Enrollments</CardTitle>
              <CardDescription>Manage student enrollment applications</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell className="font-medium">{enrollment.studentName}</TableCell>
                      <TableCell>{enrollment.grade}</TableCell>
                      <TableCell>{enrollment.parentName}</TableCell>
                      <TableCell>{enrollment.parentPhone}</TableCell>
                      <TableCell>
                        <Badge
                          variant={enrollment.status === 'approved' ? 'default' : 'secondary'}
                        >
                          {enrollment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{enrollment.submittedDate}</TableCell>
                      <TableCell>
                        {enrollment.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              Approve
                            </Button>
                            <Button size="sm" variant="destructive">
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Staff Roster</CardTitle>
              <CardDescription>Manage teaching and administrative staff</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Classes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffRoster.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell className="font-medium">{staff.name}</TableCell>
                      <TableCell>{staff.role}</TableCell>
                      <TableCell>{staff.classes.join(', ')}</TableCell>
                      <TableCell>
                        <Badge variant={staff.status === 'active' ? 'default' : 'secondary'}>
                          {staff.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{staff.joinDate}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            Edit
                          </Button>
                          {staff.status === 'pending_approval' && (
                            <Button size="sm">Approve</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Fee Structures</CardTitle>
              <CardDescription>Manage school fee structures by grade level</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grade Level</TableHead>
                    <TableHead>Term Fee</TableHead>
                    <TableHead>Exam Fee</TableHead>
                    <TableHead>Activity Fee</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockFeeStructures.map((fee) => (
                    <TableRow key={fee.id}>
                      <TableCell className="font-medium">{fee.grade}</TableCell>
                      <TableCell>KSh {fee.termFee.toLocaleString()}</TableCell>
                      <TableCell>KSh {fee.examFee.toLocaleString()}</TableCell>
                      <TableCell>KSh {fee.activityFee.toLocaleString()}</TableCell>
                      <TableCell className="font-semibold">
                        KSh {fee.total.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
