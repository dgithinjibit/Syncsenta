# **App Name**: EduCloud Kenya

## Core Features:

- Curriculum PDF Storage: Securely store curriculum PDFs in Cloud Storage with restricted access for teachers only.
- Student Assignment Uploads: Private storage for student assignments, organized by student and class, accessible only by the respective student and teacher.
- AI Report Storage: Store AI-generated reports with access control based on user roles: student, teacher, school head, and county officer.
- Offline Data Sync: Reliably synchronize offline data (attendance, lesson plans, cached AI responses) from client-side storage to Cloud Storage, handling low-bandwidth conditions and potential data conflicts.
- Role-Based Access Control: Implement role-based access control using Firebase Storage Security Rules for user roles: student, teacher, school_head, and county_officer. Rules enforce restrictions depending on directory and the file content. Uses Firebase Authentication tool to get the user role.
- Post-Upload Processing: Cloud Functions triggered post-upload for data integrity checks and any other data-sensitive operations.
- User Role Assignment: A page where users can be assigned roles

## Style Guidelines:

- Primary color: Deep teal (#008080), reflecting the depths of knowledge and trustworthiness.
- Background color: Very light grayish teal (#F0FFFF). This provides a clean, non-distracting backdrop, helping with focus and readability
- Accent color: Muted gold (#B8860B), evoking African heritage, education, and value.
- Body font: 'PT Sans', a humanist sans-serif that combines a modern look and a little warmth or personality; suitable for headlines or body text
- Headline font: 'Playfair', a modern sans-serif similar to Didot, geometric, high contrast thin-thick lines, with an elegant, fashionable, high-end feel; suitable for headlines or small amounts of text. Use 'PT Sans' for body text
- Use flat, minimalist icons in the muted gold accent color to represent file types, user roles, and actions. Icons should be culturally relevant where possible.
- A clean, card-based layout is used, optimized for responsiveness across devices (desktops, tablets, and phones) to ensure accessibility in diverse environments. Content is well-organized and easy to navigate.