import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { VIDEO_TEMPLATES, VideoTemplate } from '../../utils/constants';
import { useWorkspace } from '../../store/WorkspaceContext';

export const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    resetWorkspace,
    setPrompt,
    setAspectRatio,
    setResolution,
    setStyle,
    setPacingDensity,
    setProjectTitle,
    addPromptTag,
  } = useWorkspace();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Social', 'Business', 'Podcast', 'Narrative'];

  const filteredTemplates = selectedCategory === 'All'
    ? VIDEO_TEMPLATES
    : VIDEO_TEMPLATES.filter((t) => t.category === selectedCategory);

  const handleApplyTemplate = (template: VideoTemplate) => {
    resetWorkspace();
    setProjectTitle(`${template.title} Project`);
    setPrompt(template.promptBoilerplate);
    setAspectRatio(template.aspectRatio);
    setResolution(template.resolution);
    setStyle(template.style);
    setPacingDensity(template.pacingDensity);

    template.tags.forEach((tag) => addPromptTag(tag));
    navigate('/workspace');
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-studio-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Video Editing Templates & Formulas
            </h2>
          </div>
          <p className="text-xs text-studio-muted mt-1">
            Pre-configured natural-language prompt formulas, framing targets, and pacing density curves.
          </p>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedCategory === cat
                ? 'bg-violet-600/20 text-violet-300 border border-violet-500/40 shadow-studio-sm'
                : 'bg-studio-surface text-studio-muted hover:text-studio-text hover:bg-studio-card border border-studio-border'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="group bg-studio-surface border border-studio-border hover:border-violet-500/50 rounded-xl p-5 flex flex-col justify-between space-y-4 transition-all duration-200 shadow-studio hover:shadow-studio-lg"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded bg-violet-600/10 text-violet-300 border border-violet-500/20">
                  {template.category}
                </span>

                <div className="flex items-center gap-2 text-xs font-mono text-studio-subtle">
                  <span>{template.aspectRatio}</span>
                  <span>•</span>
                  <span>{template.resolution}</span>
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold text-studio-text group-hover:text-white transition-colors">
                  {template.title}
                </h3>
                <p className="text-xs text-studio-muted mt-1 leading-relaxed">
                  {template.description}
                </p>
              </div>

              <div className="p-3 bg-studio-card rounded-lg border border-studio-border/60">
                <span className="text-[10px] uppercase font-mono text-studio-subtle block mb-1">
                  Preset Directive:
                </span>
                <p className="text-xs text-studio-muted italic line-clamp-3 font-sans">
                  "{template.promptBoilerplate}"
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {template.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded bg-studio-card text-studio-subtle border border-studio-border"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-studio-border">
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-between group-hover:bg-violet-600/20 group-hover:border-violet-500/50 group-hover:text-violet-200"
                onClick={() => handleApplyTemplate(template)}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Use Template in Workspace
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

