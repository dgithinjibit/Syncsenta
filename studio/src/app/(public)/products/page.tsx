import { Bot, BrainCircuit, Users, TrendingUp, ShieldCheck, PenTool } from 'lucide-react';

const products = [
    {
        for: "Teachers",
        icon: PenTool,
        title: "AI Teaching Assistant",
        description: "Automate resource creation with our AI Co-pilot. Generate CBE-aligned Schemes of Work, Lesson Plans, and Worksheets in seconds.",
    },
    {
        for: "Students",
        icon: BrainCircuit,
        title: "Mwalimu AI Tutor",
        description: "A thinking partner that guides learning through questions, not just answers, fostering deep understanding and critical thinking.",
    },
    {
        for: "Administrators",
        icon: TrendingUp,
        title: "AI Operational Consultant",
        description: "Get data-driven insights for strategic decisions. Ask questions in plain language and receive analysis based on real-time school data.",
    }
];

export default function ProductsPage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto py-12">
        <div className="text-center">
            <h1 className="font-headline text-3xl md:text-4xl font-bold">A Unified Platform for Kenyan Education</h1>
            <p className="text-muted-foreground mt-2 text-lg">One integrated system for students, teachers, and school leaders.</p>
        </div>

        <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8 pt-8">
            {products.map((product) => {
                const Icon = product.icon;
                return (
                     <div key={product.title} className="flex flex-col text-center items-center p-4">
                        <div className="bg-primary/10 p-4 rounded-full mb-4">
                            <Icon className="w-10 h-10 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold">{product.title}</h3>
                        <p className="text-muted-foreground mt-1 text-sm">For {product.for}</p>
                        <p className="mt-4 text-muted-foreground max-w-xs">
                            {product.description}
                        </p>
                    </div>
                )
            })}
        </div>
    </div>
  );
}
