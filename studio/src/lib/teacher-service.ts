
import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { Teacher, ClassInfo } from './types';

// Function to get teacher data
export const getTeacherData = async (teacherId: string): Promise<Teacher | null> => {
    try {
        const teacherRef = doc(db, 'teachers', teacherId);
        const teacherSnap = await getDoc(teacherRef);

        if (teacherSnap.exists()) {
            return teacherSnap.data() as Teacher;
        } else {
            console.log('No such document!');
            return null;
        }
    } catch (error) {
        console.error("Error fetching teacher data: ", error);
        return null;
    }
};

// Function to save (add or update) a class
export const saveClass = async (teacherId: string, classInfo: Omit<ClassInfo, 'performance'>): Promise<Teacher> => {
    const teacherRef = doc(db, 'teachers', teacherId);
    const teacherSnap = await getDoc(teacherRef);

    if (!teacherSnap.exists()) {
        throw new Error("Teacher not found");
    }

    const teacherData = teacherSnap.data() as Teacher;
    const existingClass = teacherData.classes.find(c => c.id === classInfo.id);

    if (existingClass) { // This is an update
        const updatedClass = { ...existingClass, ...classInfo };
        const updatedClasses = teacherData.classes.map(c => c.id === classInfo.id ? updatedClass : c);
        await updateDoc(teacherRef, { classes: updatedClasses });
    } else { // This is a new class
        const newClass: ClassInfo = {
            ...classInfo,
            id: `class_${Date.now()}`,
            performance: Math.floor(70 + Math.random() * 15), // Assign random performance
        };
        await updateDoc(teacherRef, {
            classes: arrayUnion(newClass)
        });
    }

    // Return the latest data from the DB
    const updatedSnap = await getDoc(teacherRef);
    return updatedSnap.data() as Teacher;
};


// Function to delete a class
export const deleteClass = async (teacherId: string, classId: string): Promise<Teacher> => {
    const teacherRef = doc(db, 'teachers', teacherId);
    const teacherSnap = await getDoc(teacherRef);

    if (!teacherSnap.exists()) {
        throw new Error("Teacher not found");
    }
    
    const teacherData = teacherSnap.data() as Teacher;
    const classToDelete = teacherData.classes.find(c => c.id === classId);

    if (!classToDelete) {
         throw new Error("Class not found");
    }

    await updateDoc(teacherRef, {
        classes: arrayRemove(classToDelete)
    });

    // Return the updated state from the DB
    const updatedSnap = await getDoc(teacherRef);
    return updatedSnap.data() as Teacher;
};

