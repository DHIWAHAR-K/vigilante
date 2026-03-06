import { QueryInput } from '@/components/query/QueryInput';
import { BookOpen, GraduationCap, Calendar, HelpCircle } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col items-center min-h-full w-full relative bg-bg-base">
      <div className="flex-1 w-full max-w-[760px] flex flex-col justify-center items-center px-6 h-full pb-[12vh]">
        
        {/* Grounded Composer Section */}
        <div className="w-full flex flex-col gap-6">
          <div className="w-full">
            <QueryInput />
          </div>

          {/* Section Divider grounding the input and cards */}
          <div className="w-full border-t border-border-subtle pt-6 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
              <ActionCard 
                icon={<BookOpen className="w-4 h-4 text-text-muted" />}
                title="/flashcards"
                description="Make me flashcards about this page"
              />
              <ActionCard 
                icon={<GraduationCap className="w-4 h-4 text-text-muted" />}
                title="/evaluate"
                description="Assess whether I should take this course based on reviews"
              />
              <ActionCard 
                icon={<Calendar className="w-4 h-4 text-text-muted" />}
                title="/schedule"
                description="Go to my courses and add my class times to my calendar"
              />
              <ActionCard 
                icon={<HelpCircle className="w-4 h-4 text-text-muted" />}
                title="/quiz"
                description="Make me a quiz about this page"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function ActionCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <button className="flex flex-col text-left p-4 h-[110px] rounded-lg bg-bg-surface border border-border-subtle hover:bg-bg-elevated hover:border-border-strong transition-all group">
      <div className="flex items-center gap-2 mb-2 w-full">
        <div className="shrink-0 group-hover:text-accent transition-colors">{icon}</div>
        <span className="font-medium text-[13px] text-text-primary truncate tracking-wide group-hover:text-accent transition-colors">
          {title}
        </span>
      </div>
      <p className="text-[12px] text-text-secondary leading-relaxed line-clamp-2">
        {description}
      </p>
    </button>
  );
}
