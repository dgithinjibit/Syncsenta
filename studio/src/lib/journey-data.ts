
export type Step = 'start' | 'level' | 'sub-level' | 'grade' | 'subject';

export const levels = [
    { id: 'primary', name: 'Primary School' },
    { id: 'js', name: 'Junior School' },
];

export const subLevelsMap: { [key: string]: { id: string; name: string }[] } = {
    primary: [
        { id: 'lp', name: 'Lower Primary (Grades 1-3)' },
        { id: 'up', name: 'Upper Primary (Grades 4-6)' },
    ],
    js: [] // Junior School has no sub-levels, goes directly to grades
};

export const gradesMap: { [key: string]: { id: string; name: string }[] } = {
    lp: [
        { id: 'g1', name: 'Grade 1' },
        { id: 'g2', name: 'Grade 2' },
        { id: 'g3', name: 'Grade 3' },
    ],
    up: [
        { id: 'g4', name: 'Grade 4' },
        { id: 'g5', name: 'Grade 5' },
        { id: 'g6', name: 'Grade 6' },
    ],
    js: [
        { id: 'g7', name: 'Grade 7' },
        { id: 'g8', name: 'Grade 8' },
        { id: 'g9', name: 'Grade 9' },
    ],
};

type Subject = {
    name: string;
    icon: string;
};

export const recommendedSubjects: Subject[] = [
    { name: 'AI', icon: '/assets/ai.png' },
    { name: 'Blockchain', icon: '/assets/bc.png' },
    { name: 'Financial Literacy', icon: '/assets/finance.png' },
];

const commonSubjects: Subject[] = [
    { name: 'English', icon: '/assets/english-icon.png' },
    { name: 'Kiswahili', icon: '/assets/kisw.png' },
    { name: 'Mathematics', icon: '/assets/math.png' },
    { name: 'Social Studies', icon: '/assets/social.png' },
    { name: 'Creative Arts', icon: '/assets/creative_arts.png' },
    { name: 'Religious Education', icon: '/assets/cre.png' },
    { name: 'Environmental Activities', icon: '/assets/envr.png' },
    { name: 'Indigenous Language', icon: '/assets/indig.png' },
    { name: 'Kenyan Sign Language', icon: '/assets/ksl.png' },
];

// Lower Primary subjects (Grades 1-3)
const lowerPrimarySubjects: Subject[] = [
    { name: 'English Language Activities', icon: '/assets/english-icon.png' },
    { name: 'Kiswahili Language Activities', icon: '/assets/kisw.png' },
    { name: 'Mathematics Activities', icon: '/assets/math.png' },
    { name: 'Environmental Activities', icon: '/assets/envr.png' },
    { name: 'Creative Activities', icon: '/assets/creative_act.png' },
    { name: 'Religious Education', icon: '/assets/cre.png' },
    { name: 'Indigenous Language', icon: '/assets/indig.png' },
];

const pastoralInstruction: Subject = { name: 'Pastoral Instruction Programme', icon: '/assets/cre.png' };

export const subjectsMap: { [key: string]: Subject[] } = {
    g1: [...lowerPrimarySubjects],
    g2: [...lowerPrimarySubjects],
    g3: [...lowerPrimarySubjects],
    g4: [...commonSubjects],
    g5: [...commonSubjects],
    g6: [...commonSubjects],
    g7: [...commonSubjects, pastoralInstruction],
    g8: [...commonSubjects, pastoralInstruction],
    g9: [...commonSubjects, pastoralInstruction],
};
