import React, { useState, KeyboardEvent } from 'react';
import { Sparkles, Plus, X, Lightbulb, Trash2 } from 'lucide-react';
import { useWorkspace } from '../../store/WorkspaceContext';
import { QUICK_PROMPT_TAGS } from '../../utils/constants';

export const PromptEditor: React.FC = () => {
  const {
    prompt,
    setPrompt,
    promptTags,
    addPromptTag,
    removePromptTag,
  } = useWorkspace();

  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  const handleAddTagSubmit = () => {
    const trimmed = newTagInput.trim();
    if (trimmed) {
      addPromptTag(trimmed);
      setNewTagInput('');
      setIsAddingTag(false);
    }
  };

  const handleTagInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTagSubmit();
    } else if (e.key === 'Escape') {
      setIsAddingTag(false);
      setNewTagInput('');
    }
  };

  const wordCount = prompt.trim() ? prompt.trim().split(/\s+/).length : 0;

  return (
    <div className="bg-studio-surface border border-studio-border rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-violet-600/10 text-violet-400 border border-violet-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-studio-text">AI Editing Instructions</h3>
            <p className="text-xs text-studio-muted">
              Describe in natural language how the video should be paced, cut, and styled.
            </p>
          </div>
        </div>

        {prompt && (
          <button
            onClick={() => setPrompt('')}
            className="flex items-center gap-1 text-xs text-studio-subtle hover:text-rose-400 transition-colors"
            title="Clear prompt text"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Main Textarea */}
      <div className="relative">
        <textarea
          rows={5}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Cut all dead air and hesitations longer than 0.4 seconds. Keep high energy with punch-in zoom on funny moments. Add dynamic animated captions centered in the lower-third with highlighted active words..."
          className="w-full bg-studio-card border border-studio-border hover:border-studio-borderLight focus:border-violet-500/80 rounded-xl p-3.5 text-sm text-studio-text placeholder-studio-subtle resize-y focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all font-sans leading-relaxed"
        />

        {/* Word Counter */}
        <div className="flex items-center justify-between text-[11px] text-studio-subtle px-1 pt-1.5 font-mono">
          <span>Natural Language Directive</span>
          <span>{wordCount} words • {prompt.length} chars</span>
        </div>
      </div>

      {/* Active Instruction Chips (Editable & Removable) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-studio-muted">Active Requirements & Rules:</span>
          {!isAddingTag ? (
            <button
              onClick={() => setIsAddingTag(true)}
              className="text-violet-400 hover:text-violet-300 flex items-center gap-1 text-[11px] font-medium"
            >
              <Plus className="w-3 h-3" />
              <span>Add Custom Rule</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                placeholder="e.g. Blur background faces"
                className="bg-studio-card border border-violet-500/50 rounded px-2 py-0.5 text-xs text-studio-text placeholder-studio-subtle focus:outline-none w-44"
              />
              <button
                onClick={handleAddTagSubmit}
                className="text-xs text-violet-400 hover:text-violet-300 font-medium"
              >
                Add
              </button>
              <button
                onClick={() => setIsAddingTag(false)}
                className="text-xs text-studio-subtle hover:text-studio-muted"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {promptTags.map((tag: string) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-600/15 border border-violet-500/30 text-xs text-violet-200"
            >
              <span>{tag}</span>
              <button
                onClick={() => removePromptTag(tag)}
                className="text-violet-400 hover:text-violet-100 p-0.5 rounded transition-colors"
                title={`Remove rule "${tag}"`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {promptTags.length === 0 && (
            <p className="text-xs text-studio-subtle italic">No active rule chips selected.</p>
          )}
        </div>
      </div>

      {/* Suggested Quick Directives */}
      <div className="pt-2 border-t border-studio-border/60">
        <div className="flex items-center gap-1.5 text-xs text-studio-subtle mb-2">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          <span>Quick directives (click to add as rule):</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPT_TAGS.map((tag: string) => {
            const isAlreadyAdded = promptTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  if (!isAlreadyAdded) {
                    addPromptTag(tag);
                  }
                }}
                disabled={isAlreadyAdded}
                className={`text-[11px] px-2.5 py-1 rounded-md transition-all text-left ${
                  isAlreadyAdded
                    ? 'opacity-40 cursor-default bg-studio-card text-studio-subtle border border-transparent'
                    : 'bg-studio-card hover:bg-studio-cardHover text-studio-muted hover:text-studio-text border border-studio-border hover:border-studio-borderLight'
                }`}
              >
                + {tag}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
