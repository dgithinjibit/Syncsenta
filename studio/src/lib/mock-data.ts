
import type { User, CurriculumDoc, Assignment, Report, County, School, Teacher, Student, Communication, TeachingStaff, NonTeachingStaff, Transaction } from './types';

export const mockUsers: User[] = [
  { id: 'usr_1', name: 'Asha Juma', email: 'student@example.com', role: 'student', avatar: '/avatar-placeholder.svg', schoolId: 'sch_1' },
  { id: 'usr_2', name: 'Benson Kariuki', email: 'student2@example.com', role: 'student', avatar: '/avatar-placeholder.svg', schoolId: 'sch_1' },
  { id: 'usr_3', name: 'Ms. Chidinma Okoro', email: 'teacher@example.com', role: 'teacher', avatar: '/avatar-placeholder.svg', schoolId: 'sch_1' },
  { id: 'usr_4', name: 'Mr. David Mwangi', email: 'teacher2@example.com', role: 'teacher', avatar: '/avatar-placeholder.svg', schoolId: 'sch_2' },
  { id: 'usr_5', name: 'Dr. Evelyn Wanjala', email: 'head@example.com', role: 'school_head', avatar: '/avatar-placeholder.svg', schoolId: 'sch_1' },
  { id: 'usr_6', name: 'Mr. Felix Omondi', email: 'county@example.com', role: 'county_officer', avatar: '/avatar-placeholder.svg' },
];

const grade5Students: Student[] = [
    { id: 'stud_101', name: 'Asha Juma', chatTokens: 100 },
    { id: 'stud_102', name: 'Benson Kariuki', chatTokens: 100 },
    { id: 'stud_103', name: 'Charity Wanjiru', chatTokens: 100 },
    { id: 'stud_104', name: 'David Omondi', chatTokens: 100 },
    { id: 'stud_105', name: 'Esther Chebet', chatTokens: 100 },
];

const grade6Students: Student[] = [
    { id: 'stud_201', name: 'Asha Juma', chatTokens: 100 },
    { id: 'stud_202', name: 'George Kimani', chatTokens: 100 },
    { id: 'stud_203', name: 'Hellen Atieno', chatTokens: 100 },
    { id: 'stud_204', name: 'Isaac Njoroge', chatTokens: 100 },
];

const grade4Students: Student[] = [
    { id: 'stud_301', name: 'Asha Juma', chatTokens: 100 },
    { id: 'stud_302', name: 'John Smith', chatTokens: 100 },
    { id: 'stud_303', name: 'Kevin Otieno', chatTokens: 100 },
];


export const mockTeacher: Teacher = {
    id: 'usr_3',
    name: 'Okoro',
    classes: [
        { id: 'class_1', name: 'Grade 5 English', performance: 75, students: grade5Students, color: 'bg-blue-500' },
        { id: 'class_2', name: 'Grade 6 English', performance: 82, students: grade6Students, color: 'bg-green-500' },
        { id: 'class_3', name: 'Grade 4 Social Studies', performance: 78, students: grade4Students, color: 'bg-orange-500' },
    ],
    totalStudents: grade5Students.length + grade6Students.length + grade4Students.length,
};


export const mockCurriculumDocs: CurriculumDoc[] = [
  { id: 'doc_1', title: 'Mathematics Form 1 Syllabus', subject: 'Mathematics', grade: 'Form 1', url: '#' },
  { id: 'doc_2', title: 'English Form 1 Syllabus', subject: 'English', grade: 'Form 1', url: '#' },
  { id: 'doc_3', title: 'Kiswahili Form 2 Syllabus', subject: 'Kiswahili', grade: 'Form 2', url: '#' },
  { id: 'doc_4', title: 'Chemistry Form 3 Practical Guide', subject: 'Chemistry', grade: 'Form 3', url: '#' },
  { id: 'doc_5', title: 'History & Government Form 4 Notes', subject: 'History', grade: 'Form 4', url: '#' },
];

export const mockAssignments: Assignment[] = [
  { id: 'asg_1', studentName: 'Asha Juma', studentId: 'usr_1', className: 'Form 1', title: 'Algebra Homework', submittedAt: new Date('2023-10-26T10:00:00Z'), url: '#' },
  { id: 'asg_2', studentName: 'Benson Kariuki', studentId: 'usr_2', className: 'Form 1', title: 'Composition: My Family', submittedAt: new Date('2023-10-25T15:30:00Z'), url: '#' },
  { id: 'asg_3', studentName: 'Asha Juma', studentId: 'usr_1', className: 'Form 1', title: 'Poetry Analysis', submittedAt: new Date('2023-10-22T11:00:00Z'), url: '#' },
];

export const mockReports: Report[] = [
  {
    id: 'rep_1',
    title: 'Personal Progress Report - Q3 2023',
    description: 'Your academic performance and areas for improvement in Mathematics and English.',
    generatedFor: ['student'],
    createdAt: new Date('2023-10-20T09:00:00Z'),
  },
  {
    id: 'rep_2',
    title: 'Class Performance Analysis: Form 2 English',
    description: 'An overview of the recent assessment results for Form 2 English, highlighting common challenges.',
    generatedFor: ['teacher'],
    createdAt: new Date('2023-10-19T14:00:00Z'),
  },
    {
    id: 'rep_3',
    title: 'Teacher Engagement Report',
    description: 'Summary of curriculum resource downloads and assignment feedback rates for all teachers.',
    generatedFor: ['school_head'],
    createdAt: new Date('2023-10-18T11:00:00Z'),
  },
  {
    id: 'rep_4',
    title: 'County Education Metrics - Q3 2023',
    description: 'Aggregated data on student performance and resource utilization across all schools in the county.',
    generatedFor: ['county_officer'],
    createdAt: new Date('2023-10-17T16:00:00Z'),
  },
   {
    id: 'rep_5',
    title: 'School-wide Attendance Report',
    description: 'Weekly attendance data and trends across all classes.',
    generatedFor: ['teacher', 'school_head'],
    createdAt: new Date('2023-10-21T09:00:00Z'),
  },
];


export const mockCounties: County[] = [
    { id: 'county_1', name: 'Mombasa' },
    { id: 'county_2', name: 'Kwale' },
    { id: 'county_3', name: 'Kilifi' },
    { id: 'county_4', name: 'Tana River' },
    { id: 'county_5', name: 'Lamu' },
    { id: 'county_6', name: 'Taita-Taveta' },
    { id: 'county_7', name: 'Garissa' },
    { id: 'county_8', name: 'Wajir' },
    { id: 'county_9', name: 'Mandera' },
    { id: 'county_10', name: 'Marsabit' },
    { id: 'county_11', name: 'Isiolo' },
    { id: 'county_12', name: 'Meru' },
    { id: 'county_13', name: 'Tharaka-Nithi' },
    { id: 'county_14', name: 'Embu' },
    { id: 'county_15', name: 'Kitui' },
    { id: 'county_16', name: 'Machakos' },
    { id: 'county_17', name: 'Makueni' },
    { id: 'county_18', name: 'Nyandarua' },
    { id: 'county_19', name: 'Nyeri' },
    { id: 'county_20', 'name': 'Kirinyaga' },
    { id: 'county_21', name: 'Murang\'a' },
    { id: 'county_22', name: 'Kiambu' },
    { id: 'county_23', name: 'Turkana' },
    { id: 'county_24', name: 'West Pokot' },
    { id: 'county_25', name: 'Samburu' },
    { id: 'county_26', name: 'Trans Nzoia' },
    { id: 'county_27', name: 'Uasin Gishu' },
    { id: 'county_28', name: 'Elgeyo-Marakwet' },
    { id: 'county_29', name: 'Nandi' },
    { id: 'county_30', name: 'Baringo' },
    { id: 'county_31', name: 'Laikipia' },
    { id: 'county_32', name: 'Nakuru' },
    { id: 'county_33', name: 'Narok' },
    { id: 'county_34', name: 'Kajiado' },
    { id: 'county_35', name: 'Kericho' },
    { id: 'county_36', name: 'Bomet' },
    { id: 'county_37', name: 'Kakamega' },
    { id: 'county_38', name: 'Vihiga' },
    { id: 'county_39', name: 'Bungoma' },
    { id: 'county_40', name: 'Busia' },
    { id: 'county_41', name: 'Siaya' },
    { id: 'county_42', name: 'Kisumu' },
    { id: 'county_43', name: 'Homa Bay' },
    { id: 'county_44', name: 'Migori' },
    { id: 'county_45', name: 'Kisii' },
    { id: 'county_46', name: 'Nyamira' },
    { id: 'county_47', name: 'Nairobi City' },
];

export const mockSchools: School[] = [
    { id: 'sch_1', name: 'Moi Nyeri Complex Primary School', countyId: 'county_19', latitude: -0.4134, longitude: 36.9463 },
    { id: 'sch_2', name: 'Airstrip Primary School', countyId: 'county_19', latitude: -0.4455, longitude: 36.9587 },
    { id: 'sch_3', name: 'Aguthi Primary School', countyId: 'county_19', latitude: -0.4012, longitude: 36.8842 },
    { id: 'sch_4', name: 'Kiamwangi Primary School', countyId: 'county_19', latitude: -0.3789, longitude: 36.9811 },
    { id: 'sch_5', name: 'Ragati Primary School', countyId: 'county_19', latitude: -0.4633, longitude: 37.0544 },
    { id: 'sch_6', name: 'Nyeri Good Shepherd Academy', countyId: 'county_19', latitude: -0.4201, longitude: 36.9532 },
    { id: 'sch_7', name: 'Mount Kenya Academy', countyId: 'county_19', latitude: -0.3958, longitude: 37.0129 },
    { id: 'sch_8', name: 'Ngari Junior Academy', countyId: 'county_19', latitude: -0.4321, longitude: 36.9321 },
    { id: 'sch_9', name: 'Gachugu Academy', countyId: 'county_19', latitude: -0.3888, longitude: 36.9188 },
    { id: 'sch_10', name: 'Kiangengi Primary School', countyId: 'county_19', latitude: -0.4511, longitude: 36.9011 },
    { id: 'sch_11', name: 'Ngunguru Primary School', countyId: 'county_19', latitude: -0.4777, longitude: 36.9657 },
    { id: 'sch_12', name: 'Alliance High School', countyId: 'county_22', latitude: -1.2263, longitude: 36.7214 },
    { id: 'sch_13', name: 'Nairobi School', countyId: 'county_47', latitude: -1.2662, longitude: 36.7845 },
];

export const mockCommunications: Communication[] = [
    {
        id: 'comm_1',
        title: 'Urgent: Staff Meeting Tomorrow at 8 AM',
        content: 'Please be advised that there will be a mandatory all-staff meeting in the main hall tomorrow morning to discuss the upcoming term.',
        recipient: 'All Staff',
        date: new Date('2024-07-29T08:00:00Z'),
        acknowledged: false,
        sender: 'School Head',
    },
    {
        id: 'comm_2',
        title: 'Distribution of New Science Kits',
        content: 'The new science kits for Grade 6 have arrived. Please collect them from the main office by Friday.',
        recipient: 'Grade 6 Teachers',
        date: new Date('2024-07-28T11:30:00Z'),
        acknowledged: true,
        sender: 'School Head',
    },
    {
        id: 'comm_3',
        title: 'Reminder: Submit Term 2 Performance Reports',
        content: 'All class teachers are reminded to submit their end-of-term performance reports by end of day this Friday.',
        recipient: 'All Teachers',
        date: new Date('2024-07-27T15:00:00Z'),
        acknowledged: false,
        sender: 'School Head',
    }
];

export const initialTeachingStaff: TeachingStaff[] = [
    { id: 't-1', name: 'Ms. Chidinma Okoro', tscNo: 'TSC-12345', role: 'English/Literature', category: 'Teaching' },
    { id: 't-2', name: 'Mr. David Mwangi', tscNo: 'TSC-67890', role: 'Mathematics', category: 'Teaching' },
    { id: 't-3', name: 'Mrs. Fatuma Ali', tscNo: 'TSC-54321', role: 'Kiswahili/CRE', category: 'Teaching' },
     { id: 't-4', name: 'Mr. John Doe', tscNo: 'TSC-11223', role: 'Science', category: 'Teaching' },
    { id: 't-5', name: 'Ms. Jane Smith', tscNo: 'TSC-44556', role: 'Social Studies', category: 'Teaching' },
];

export const initialNonTeachingStaff: NonTeachingStaff[] = [
    { id: 'nt-1', name: 'Mr. James Ochieng', role: 'Bursar', category: 'Non-Teaching' },
    { id: 'nt-2', name: 'Mrs. Alice Wambui', role: 'Secretary', category: 'Non-Teaching' },
    { id: 'nt-3', name: 'Mr. Peter Kamau', role: 'Groundsman', category: 'Non-Teaching' },
];

export const mockTransactions: Transaction[] = [
  { id: 'txn_1', date: '2024-07-30', description: 'Purchase of PP1 Textbooks', amount: 15000, category: 'Instructional Materials', status: 'Completed' },
  { id: 'txn_2', date: '2024-07-28', description: 'School Bus Fuel', amount: 8000, category: 'Transport', status: 'Completed' },
  { id: 'txn_3', date: '2024-07-25', description: 'Catering Services - PTA Meeting', amount: 25000, category: 'Events', status: 'Completed' },
];

    