
export type Subject = {
  name: string;
  type: 'Core' | 'Optional';
};

export type Grade = {
  name: string;
  subjects: Subject[];
};

export type SubLevel = {
  name: string;
  grades: Grade[];
};

export type MajorLevel = {
  name: string;
  subLevels: SubLevel[];
};

export const curriculumStructure: MajorLevel[] = [
    {
        name: 'Early Years Education',
        subLevels: [
            {
                name: 'Pre-Primary',
                grades: [
                    {
                        name: 'PP1',
                        subjects: [
                            { name: 'Christian Religious Education', type: 'Core' },
                            { name: 'Creative Activities', type: 'Core' },
                            { name: 'Environmental Activities', type: 'Core' },
                            { name: 'Language Activities', type: 'Core' },
                            { name: 'Mathematical Activities', type: 'Core' },
                        ]
                    },
                    {
                        name: 'PP2',
                        subjects: [
                            { name: 'Christian Religious Education', type: 'Core' },
                            { name: 'Creative Activities', type: 'Core' },
                            { name: 'Environmental Activities', type: 'Core' },
                            { name: 'Language Activities', type: 'Core' },
                            { name: 'Mathematical Activities', type: 'Core' },
                        ]
                    }
                ]
            },
            {
                name: 'Lower Primary',
                grades: [
                    {
                        name: 'Grade 1',
                        subjects: [
                           { name: 'Creative Activities', type: 'Core' },
                           { name: 'English Language Activities', type: 'Core' },
                           { name: 'Indigenous Language Activities', type: 'Core' },
                           { name: 'Kiswahili Language Activities', type: 'Core' },
                           { name: 'Mathematical Activities', type: 'Core' },
                           { name: 'Environmental Activities', type: 'Core' },
                           { name: 'Christian Religious Education', type: 'Core' },
                        ]
                    },
                    {
                        name: 'Grade 2',
                        subjects: [
                           { name: 'Creative Activities', type: 'Core' },
                           { name: 'English Language Activities', type: 'Core' },
                           { name: 'Indigenous Language Activities', type: 'Core' },
                           { name: 'Kiswahili Language Activities', type: 'Core' },
                           { name: 'Mathematical Activities', type: 'Core' },
                           { name: 'Environmental Activities', type: 'Core' },
                           { name: 'Christian Religious Education', type: 'Core' },
                        ]
                    },
                     {
                        name: 'Grade 3',
                        subjects: [
                           { name: 'Creative Activities', type: 'Core' },
                           { name: 'English Language Activities', type: 'Core' },
                           { name: 'Indigenous Language Activities', type: 'Core' },
                           { name: 'Kiswahili Language Activities', type: 'Core' },
                           { name: 'Mathematical Activities', type: 'Core' },
                           { name: 'Environmental Activities', type: 'Core' },
                           { name: 'Christian Religious Education', type: 'Core' },
                        ]
                    }
                ]
            }
        ]
    },
    {
        name: 'Middle School',
        subLevels: [
            {
                name: 'Upper Primary',
                grades: [
                    {
                        name: 'Grade 4',
                        subjects: [
                            { name: 'English', type: 'Core' },
                            { name: 'Kiswahili', type: 'Core' },
                            { name: 'Mathematics', type: 'Core' },
                            { name: 'Science and Technology', type: 'Core' },
                            { name: 'Agriculture and Nutrition', type: 'Core' },
                            { name: 'Social Studies', type: 'Core' },
                            { name: 'Creative Arts', type: 'Core' },
                            { name: 'Religious Education', type: 'Core' },
                            { name: 'Physical and Health Education', type: 'Core' },
                        ]
                    },
                     {
                        name: 'Grade 5',
                        subjects: [
                            { name: 'English', type: 'Core' },
                            { name: 'Kiswahili', type: 'Core' },
                            { name: 'Mathematics', type: 'Core' },
                            { name: 'Science and Technology', type: 'Core' },
                            { name: 'Agriculture and Nutrition', type: 'Core' },
                            { name: 'Social Studies', type: 'Core' },
                            { name: 'Creative Arts', type: 'Core' },
                            { name: 'Religious Education', type: 'Core' },
                            { name: 'Physical and Health Education', type: 'Core' },
                        ]
                    },
                    {
                        name: 'Grade 6',
                        subjects: [
                            { name: 'English', type: 'Core' },
                            { name: 'Kiswahili', type: 'Core' },
                            { name: 'Mathematics', type: 'Core' },
                            { name: 'Science and Technology', type: 'Core' },
                            { name: 'Agriculture and Nutrition', type: 'Core' },
                            { name: 'Social Studies', type: 'Core' },
                            { name: 'Creative Arts', type: 'Core' },
                            { name: 'Religious Education', type: 'Core' },
                            { name: 'Physical and Health Education', type: 'Core' },
                        ]
                    }
                ]
            },
            {
                name: 'Junior Secondary',
                grades: [
                    {
                        name: 'Grade 7',
                        subjects: [
                            { name: 'English', type: 'Core' },
                            { name: 'Kiswahili', type: 'Core' },
                            { name: 'Mathematics', type: 'Core' },
                            { name: 'Integrated Science', type: 'Core' },
                            { name: 'Health Education', type: 'Core' },
                            { name: 'Pre-Technical and Pre-Career Education', type: 'Core' },
                            { name: 'Social Studies', type: 'Core' },
                            { name: 'Religious Education', type: 'Core' },
                            { name: 'Business Studies', type: 'Core' },
                            { name: 'Agriculture', type: 'Core' },
                            { name: 'Life Skills Education', type: 'Core' },
                            { name: 'Physical Education and Sports', type: 'Core' },
                            { name: 'Visual Arts', type: 'Optional' },
                            { name: 'Performing Arts', type: 'Optional' },
                            { name: 'Home Science', type: 'Optional' },
                            { name: 'Computer Science', type: 'Optional' },
                            { name: 'Foreign Languages', type: 'Optional' },
                        ]
                    },
                    {
                        name: 'Grade 8',
                        subjects: [
                             { name: 'English', type: 'Core' },
                            { name: 'Kiswahili', type: 'Core' },
                            { name: 'Mathematics', type: 'Core' },
                            { name: 'Integrated Science', type: 'Core' },
                            { name: 'Health Education', type: 'Core' },
                            { name: 'Pre-Technical and Pre-Career Education', type: 'Core' },
                            { name: 'Social Studies', type: 'Core' },
                            { name: 'Religious Education', type: 'Core' },
                            { name: 'Business Studies', type: 'Core' },
                            { name: 'Agriculture', type: 'Core' },
                            { name: 'Life Skills Education', type: 'Core' },
                            { name: 'Physical Education and Sports', type: 'Core' },
                            { name: 'Visual Arts', type: 'Optional' },
                            { name: 'Performing Arts', type: 'Optional' },
                            { name: 'Home Science', type: 'Optional' },
                            { name: 'Computer Science', type: 'Optional' },
                            { name: 'Foreign Languages', type: 'Optional' },
                        ]
                    },
                    {
                        name: 'Grade 9',
                        subjects: [
                             { name: 'English', type: 'Core' },
                            { name: 'Kiswahili', type: 'Core' },
                            { name: 'Mathematics', type: 'Core' },
                            { name: 'Integrated Science', type: 'Core' },
                            { name: 'Health Education', type: 'Core' },
                            { name: 'Pre-Technical and Pre-Career Education', type: 'Core' },
                            { name: 'Social Studies', type: 'Core' },
                            { name: 'Religious Education', type: 'Core' },
                            { name: 'Business Studies', type: 'Core' },
                            { name: 'Agriculture', type: 'Core' },
                            { name: 'Life Skills Education', type: 'Core' },
                            { name: 'Physical Education and Sports', type: 'Core' },
                            { name: 'Visual Arts', type: 'Optional' },
                            { name: 'Performing Arts', type: 'Optional' },
                            { name: 'Home Science', type: 'Optional' },
                            { name: 'Computer Science', type: 'Optional' },
                            { name: 'Foreign Languages', type: 'Optional' },
                        ]
                    }
                ]
            }
        ]
    }
];
