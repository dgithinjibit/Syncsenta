
// src/app/api/seed/route.ts
import { NextResponse } from 'next/server';
import { getFirestore, collection, doc, setDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';

export async function GET() {
  try {
    const auth = getAuth(app);
    const currentUser = auth.currentUser;

    // Check if user is authenticated
    if (!currentUser) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          message: 'Please log in first before seeding the database.' 
        },
        { status: 401 }
      );
    }

    const db = getFirestore(app);

    // Check if teacher profile already exists
    const existingTeacherQuery = query(
      collection(db, 'teachers'),
      where('email', '==', currentUser.email)
    );
    const existingTeacher = await getDocs(existingTeacherQuery);

    let teacherId = currentUser.uid;
    
    // Create or update teacher profile
    if (existingTeacher.empty) {
      await setDoc(doc(db, 'teachers', teacherId), {
        name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Teacher',
        email: currentUser.email,
        role: 'teacher',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      // Use existing teacher ID
      teacherId = existingTeacher.docs[0].id;
    }

    // Add a sample Kiswahili Scheme of Work to the library
    const sampleResourceRef = doc(collection(db, "teacherResources"));
    await setDoc(sampleResourceRef, {
        title: "Gredi ya 4 Kiswahili: Matamshi Bora",
        type: "Scheme of Work",
        createdAt: new Date().toISOString(),
        joinCode: "",
        content: `| Mada (Strand) | Mada Ndogo (Sub Strand) & Vipindi | Matokeo Maalum Yanayotarajiwa (Specific Learning Outcomes) | Shughuli za Ujifunzaji Zilizopendekezwa (Suggested Learning Experiences) | Swali Dadisi Lililopendekezwa (Key Inquiry Question(s)) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0 NYUMBANI** | **1.1.1 Matamshi Bora** (Vipindi 5) | - kutambua silabi zinazotokana na sauti p/b, t/d, k/g, ch/j katika maneno\\n- kutamka silabi zinazotokana na sauti zinazokaribiana kimatamshi\\n- kutamka vitanzandimi vinavyoundwa kwa silabi za sauti zinazokaribiana kimatamshi | - kutambua silabi za sauti lengwa (p/b, t/d, k/g, ch/j) kutokana na maneno kwenye vitabu\\n- kusikiliza silabi za sauti lengwa zikitamkwa na mwalimu au kifaa cha kidijitali\\n- kuunda vitanzandimi vyepesi vinavyotokana na vitate husika | Matamshi bora yana umuhimu gani katika mawasiliano? |`
    });

    // Check if classes already exist for this teacher
    const existingClassesQuery = query(
      collection(db, 'classes'),
      where('teacherId', '==', teacherId)
    );
    const existingClasses = await getDocs(existingClassesQuery);

    const classIds = [];

    if (existingClasses.empty) {
      // Create sample classes
      const classes = [
        {
          name: 'Mathematics 101',
          description: 'Introduction to Algebra and Geometry',
          subject: 'Mathematics',
          grade: '9th Grade'
        },
        {
          name: 'English Literature',
          description: 'Classic and Modern Literature Analysis',
          subject: 'English',
          grade: '10th Grade'
        },
        {
          name: 'Science Lab',
          description: 'Hands-on Physics and Chemistry',
          subject: 'Science',
          grade: '9th Grade'
        }
      ];

      for (const classData of classes) {
        const classRef = doc(collection(db, 'classes'));
        await setDoc(classRef, {
          ...classData,
          teacherId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        classIds.push(classRef.id);
      }
    } else {
      // Use existing class IDs
      existingClasses.docs.forEach(doc => classIds.push(doc.id));
    }

    // Check if students already exist
    const existingStudentsQuery = query(
      collection(db, 'students'),
      where('teacherId', '==', teacherId)
    );
    const existingStudents = await getDocs(existingStudentsQuery);

    if (existingStudents.empty && classIds.length > 0) {
      // Create sample students
      const students = [
        { name: 'Alice Johnson', email: 'alice.johnson@student.com', progress: 85, testsCompleted: 12 },
        { name: 'Bob Williams', email: 'bob.williams@student.com', progress: 72, testsCompleted: 10 },
        { name: 'Carol Davis', email: 'carol.davis@student.com', progress: 90, testsCompleted: 14 },
        { name: 'David Brown', email: 'david.brown@student.com', progress: 65, testsCompleted: 8 },
        { name: 'Emma Wilson', email: 'emma.wilson@student.com', progress: 78, testsCompleted: 11 },
        { name: 'Frank Miller', email: 'frank.miller@student.com', progress: 88, testsCompleted: 13 },
        { name: 'Grace Taylor', email: 'grace.taylor@student.com', progress: 92, testsCompleted: 15 },
        { name: 'Henry Anderson', email: 'henry.anderson@student.com', progress: 70, testsCompleted: 9 },
        { name: 'Iris Martinez', email: 'iris.martinez@student.com', progress: 83, testsCompleted: 12 },
        { name: 'Jack Thompson', email: 'jack.thompson@student.com', progress: 76, testsCompleted: 10 }
      ];

      // Distribute students across classes
      for (let i = 0; i < students.length; i++) {
        const studentRef = doc(collection(db, 'students'));
        const classId = classIds[i % classIds.length]; // Distribute evenly
        
        await setDoc(studentRef, {
          ...students[i],
          classId,
          teacherId,
          lastActive: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully!',
      data: {
        teacherId,
        classesCreated: classIds.length,
        note: 'Please refresh your dashboard to see the data.'
      }
    });

  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      {
        error: 'Seeding failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: 'Check your Firebase configuration and security rules.'
      },
      { status: 500 }
    );
  }
}
