import React from 'react';
import { Film, Sparkles, Layers } from 'lucide-react';
import { Card } from '../../components/ui/Card';

export const OnboardingGuidance: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Import Raw Footage',
      description: 'Upload clips up to 2 GB with instant frame scrubbing, aspect framing, and format validation.',
      icon: Film,
    },
    {
      step: '02',
      title: 'Instruct with Natural Language',
      description: 'Specify cut rules: trim dead air, generate dynamic captions, or configure viral jump-cut density.',
      icon: Sparkles,
    },
    {
      step: '03',
      title: 'Assemble on Timeline',
      description: 'Inspect synchronized multi-track sequence layout, split clips at playheads, and review AI job payloads.',
      icon: Layers,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {steps.map((item) => (
        <Card key={item.step} variant="default" padding="md" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-lg bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <item.icon className="w-4 h-4" />
            </div>
            <span className="font-mono text-xs text-studio-subtle">{item.step}</span>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-studio-text">{item.title}</h4>
            <p className="text-xs text-studio-muted leading-relaxed mt-1">{item.description}</p>
          </div>
        </Card>
      ))}
    </div>
  );
};
