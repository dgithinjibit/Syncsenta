'use client';

import { useState } from 'react';
import {
  Building,
  Users,
  GraduationCap,
  BarChart3,
  Shield,
  Settings,
  AlertTriangle,
  CheckCircle,
  Globe,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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

const mockNationalAdmin = {
  id: 'national_admin_1',
  name: 'Dr. Catherine Muthoni',
  role: 'National Administrator',
  department: 'Ministry of Education',
};

const mockSystemStats = {
  totalSchools: 1247,
  totalStudents: 485672,
  totalTeachers: 18934,
  totalCounties: 47,
  systemUptime: 99.8,
  activeUsers: 12456,
  dataStorageUsed: 2.4,
  blockchainTransactions: 156789,
};

const mockCountyPerformance = [
  { id: 'county_1', name: 'Nairobi', schools: 156, students: 78432, teachers: 3245, averagePerformance: 87, enrollmentRate: 94, feeCollectionRate: 89 },
  { id: 'county_2', name: 'Kiambu', schools: 98, students: 45678, teachers: 1876, averagePerformance: 82, enrollmentRate: 91, feeCollectionRate: 85 },
  { id: 'county_3', name: 'Machakos', schools: 87, students: 38945, teachers: 1654, averagePerformance: 79, enrollmentRate: 88, feeCollectionRate: 78 },
  { id: 'county_4', name: 'Mombasa', schools: 76, students: 34567, teachers: 1432, averagePerformance: 85, enrollmentRate: 92, feeCollectionRate: 87 },
];

const mockSystemAlerts = [
  {
    id: 'alert_1',
    type: 'security',
    severity: 'high',
    title: 'Unusual Login Activity Detected',
    description: 'Multiple failed login attempts from IP 192.168.1.100',
    timestamp: '2026-04-28 14:30',
    status: 'active',
  },
  {
    id: 'alert_2',
    type: 'performance',
    severity: 'medium',
    title: 'Database Query Performance Degraded',
    description: 'Average query response time increased by 25%',
    timestamp: '2026-04-28 12:15',
    status: 'investigating',
  },
  {
    id: 'alert_3',
    type: 'blockchain',
    severity: 'low',
    title: 'Blockchain Sync Delay',
    description: 'Polygon network sync delayed by 2 minutes',
    timestamp: '2026-04-28 10:45',
    status: 'resolved',
  },
];

const mockUserManagement = [
  { id: 'user_1', name: 'John Kamau', role: 'CountyOfficer', county: 'Nairobi', status: 'active', lastLogin: '2026-04-28 09:30', approvalStatus: 'approved' },
  { id: 'user_2', name: 'Mary Wanjiku', role: 'SchoolHead', county: 'Kiambu', status: 'pending_approval', lastLogin: 'Never', approvalStatus: 'pending' },
  { id: 'user_3', name: 'Peter Ochieng', role: 'SchoolAdmin', county: 'Mombasa', status: 'active', lastLogin: '2026-04-27 16:45', approvalStatus: 'approved' },
];

const mockComplianceMetrics = {
  dataProtectionCompliance: 94,
  accessControlCompliance: 98,
  auditLogCompleteness: 99,
  encryptionCoverage: 100,
  backupSuccess: 97,
};

export default function NationalAdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  const systemStats = mockSystemStats;
  const countyPerformance = mockCountyPerformance;
  const systemAlerts = mockSystemAlerts;

  const activeAlerts = systemAlerts.filter((alert) => alert.status === 'active');
  const highSeverityAlerts = systemAlerts.filter((alert) => alert.severity === 'high');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground font-headline">
            Karibu, {mockNationalAdmin.name}
          </h1>
          <p className="text-muted-foreground">
            {mockNationalAdmin.role} • {mockNationalAdmin.department}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            System Report
          </Button>
          <Button className="gap-2">
            <Settings className="h-4 w-4" />
            System Settings
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.totalSchools.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across {systemStats.totalCounties} counties
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.totalStudents.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Active learners nationwide</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.systemUptime}%</div>
            <p className="text-xs text-muted-foreground">
              {systemStats.activeUsers.toLocaleString()} active users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              {highSeverityAlerts.length} high priority
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="counties">Counties</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  System Alerts
                </CardTitle>
                <CardDescription>Critical system notifications and alerts</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {systemAlerts.map((alert) => (
                      <div key={alert.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Badge
                            variant={
                              alert.severity === 'high'
                                ? 'destructive'
                                : alert.severity === 'medium'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {alert.severity} severity
                          </Badge>
                          <Badge
                            variant={
                              alert.status === 'active'
                                ? 'destructive'
                                : alert.status === 'investigating'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {alert.status}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-sm">{alert.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                        <p className="text-xs text-muted-foreground mt-2">{alert.timestamp}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Web4 Infrastructure
                </CardTitle>
                <CardDescription>Blockchain and decentralized storage status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Blockchain Transactions</span>
                    <span className="font-semibold">
                      {systemStats.blockchainTransactions.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>IPFS Storage Used</span>
                    <span className="font-semibold">{systemStats.dataStorageUsed} TB</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Polygon Network</span>
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Online
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">IPFS Gateway</span>
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Healthy
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">DID Registry</span>
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Synced
                    </Badge>
                  </div>
                </div>

                <Button variant="outline" className="w-full">
                  View Infrastructure Details
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="counties" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>County Performance Overview</CardTitle>
              <CardDescription>Educational metrics across all counties</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>County</TableHead>
                    <TableHead>Schools</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Teachers</TableHead>
                    <TableHead>Avg. Performance</TableHead>
                    <TableHead>Enrollment Rate</TableHead>
                    <TableHead>Fee Collection</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countyPerformance.map((county) => (
                    <TableRow key={county.id}>
                      <TableCell className="font-medium">{county.name}</TableCell>
                      <TableCell>{county.schools}</TableCell>
                      <TableCell>{county.students.toLocaleString()}</TableCell>
                      <TableCell>{county.teachers.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={county.averagePerformance} className="w-16" />
                          <span className="text-sm">{county.averagePerformance}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{county.enrollmentRate}%</TableCell>
                      <TableCell>{county.feeCollectionRate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage system users and approval workflows</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>County</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockUserManagement.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>{user.county}</TableCell>
                      <TableCell>
                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                          {user.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.lastLogin}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {user.approvalStatus === 'pending' && (
                            <>
                              <Button size="sm" variant="outline">
                                Approve
                              </Button>
                              <Button size="sm" variant="destructive">
                                Reject
                              </Button>
                            </>
                          )}
                          {user.approvalStatus === 'approved' && (
                            <Button size="sm" variant="outline">
                              Manage
                            </Button>
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

        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Performance</CardTitle>
                <CardDescription>Real-time system metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>System Uptime</span>
                    <span className="font-semibold">{systemStats.systemUptime}%</span>
                  </div>
                  <Progress value={systemStats.systemUptime} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Active Users</span>
                    <span className="font-semibold">
                      {systemStats.activeUsers.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={75} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Storage Usage</span>
                    <span className="font-semibold">
                      {systemStats.dataStorageUsed} TB / 10 TB
                    </span>
                  </div>
                  <Progress value={24} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Infrastructure Health</CardTitle>
                <CardDescription>Core system components status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database Cluster</span>
                  <Badge variant="default" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Healthy
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Redis Cache</span>
                  <Badge variant="default" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Optimal
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Load Balancer</span>
                  <Badge variant="default" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">CDN Network</span>
                  <Badge variant="secondary" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Degraded
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Compliance Dashboard
              </CardTitle>
              <CardDescription>
                Data protection and security compliance metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Data Protection Compliance</span>
                    <span className="font-semibold">
                      {mockComplianceMetrics.dataProtectionCompliance}%
                    </span>
                  </div>
                  <Progress value={mockComplianceMetrics.dataProtectionCompliance} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Access Control Compliance</span>
                    <span className="font-semibold">
                      {mockComplianceMetrics.accessControlCompliance}%
                    </span>
                  </div>
                  <Progress value={mockComplianceMetrics.accessControlCompliance} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Audit Log Completeness</span>
                    <span className="font-semibold">
                      {mockComplianceMetrics.auditLogCompleteness}%
                    </span>
                  </div>
                  <Progress value={mockComplianceMetrics.auditLogCompleteness} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Encryption Coverage</span>
                    <span className="font-semibold">
                      {mockComplianceMetrics.encryptionCoverage}%
                    </span>
                  </div>
                  <Progress value={mockComplianceMetrics.encryptionCoverage} />
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Compliance Summary</h4>
                <p className="text-sm text-muted-foreground">
                  System maintains high compliance standards with DPA 2019 requirements. All
                  critical metrics are above 90% threshold. Regular audits scheduled monthly.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
