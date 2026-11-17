import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SchemeGeneratorDialog from "@/components/SchemeGeneratorDialog";
import ExamGeneratorDialog from "@/components/ExamGeneratorDialog";
import { BookOpen, CheckCircle, FileDown, Globe, LayoutDashboard, LogIn, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";

const features = [
  {
    icon: BookOpen,
    title: "CBC Compliant",
    desc: "Generates schemes aligned with KICD Kenya curriculum standards.",
  },
  {
    icon: Globe,
    title: "Kiswahili Support",
    desc: "Full Swahili language support for Kiswahili subject schemes.",
  },
  {
    icon: CheckCircle,
    title: "Lesson Plans",
    desc: "Generate detailed lesson plans from any scheme row with one click.",
  },
  {
    icon: FileDown,
    title: "PDF & DOCX Export",
    desc: "Export professional documents ready for official use.",
  },
];

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Accent bar */}
      <div className="h-1.5 w-full flex">
        <div className="flex-1 bg-kenya-green" />
        <div className="flex-1 bg-kenya-red" />
        <div className="flex-1 bg-kenya-gold" />
      </div>

      {/* Top nav */}
      <nav className="flex items-center justify-end gap-2 px-6 py-3 border-b border-border">
        {!loading && (
          user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <User className="w-4 h-4" />
                {user.user_metadata?.full_name || user.email}
              </span>
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5">
                <LogOut className="w-4 h-4" /> Sign Out
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate("/auth")} className="gap-1.5">
              <LogIn className="w-4 h-4" /> Sign In
            </Button>
          )
        )}
        <ThemeToggle />
      </nav>

      {/* Hero */}
      <header className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-xs font-medium text-secondary-foreground">
          🇰🇪 KICD CBC Curriculum Tool
        </div>
        <h1 className="font-serif text-5xl md:text-6xl font-bold tracking-tight text-foreground max-w-3xl leading-tight">
          Schemer
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-xl">
          Generate professional, CBC-compliant Schemes of Work and Lesson Plans in seconds. Built for Kenyan teachers, by educators.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <SchemeGeneratorDialog />
          <ExamGeneratorDialog />
        </div>
      </header>

      {/* Features */}
      <section className="bg-card border-t border-border px-6 py-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div key={f.title} className="text-center space-y-2">
              <div className="mx-auto w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">{f.title}</h3>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-muted-foreground border-t border-border">
        Schemer — CBC Scheme of Work & Lesson Plan Generator • Aligned with KICD Standards
      </footer>
    </div>
  );
};

export default Index;
