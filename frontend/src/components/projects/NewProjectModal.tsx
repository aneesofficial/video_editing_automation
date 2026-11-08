import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useWorkspace } from '../../store/WorkspaceContext';
import { useProjects } from '../../store/ProjectContext';
import { AspectRatio, VideoResolution } from '../../types/video';
import { ASPECT_RATIOS } from '../../utils/constants';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { resetWorkspace, setProjectTitle, setAspectRatio, setResolution, setCurrentProjectId } = useWorkspace();
  const { saveProject, clients } = useProjects();

  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [selectedAspect, setSelectedAspect] = useState<AspectRatio>('16:9');
  const [selectedRes, setSelectedRes] = useState<VideoResolution>('1080p');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const finalTitle = title.trim() || 'Untitled Video Cut';
      const finalClient = clientName.trim() || 'General';

      resetWorkspace();
      setProjectTitle(finalTitle);
      setAspectRatio(selectedAspect);
      setResolution(selectedRes);

      const saved = await saveProject({
        title: finalTitle,
        clientName: finalClient,
        description: `Project for ${finalClient}`,
        status: 'draft',
        rawPrompt: '',
        tags: ['Cut all awkward silences > 0.4s'],
        preferences: {
          aspectRatio: selectedAspect,
          resolution: selectedRes,
          frameRate: '30fps',
          style: 'viral-fast',
          pacingDensity: 4,
          cutSilences: true,
          generateCaptions: true,
          autoColorGrade: false,
          addBackgroundMusic: false,
          musicMood: 'chill',
        },
      });

      setCurrentProjectId(saved.id);
      onClose();
      navigate(`/workspace/${saved.id}`);
    } catch (err) {
      console.error('Error creating project:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Video Project"
      description="Initialize a clean editing timeline and configure target compositions."
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleCreate} isLoading={isSubmitting}>
            Create Project
          </Button>
        </>
      }
    >
      <form onSubmit={handleCreate} className="space-y-4">
        <Input
          label="Project Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Q4 Executive Keynote Cut"
          autoFocus
        />

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-studio-muted">
            Client Name
          </label>
          <input
            list="client-options"
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Select existing client or type new name (e.g. Acme Corp)"
            className="w-full bg-studio-surface border border-studio-border focus:border-violet-500 rounded-lg px-3 py-2 text-sm text-white placeholder-studio-subtle focus:outline-none transition-colors"
          />
          <datalist id="client-options">
            {clients.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          <p className="text-[11px] text-studio-subtle">
            Folders on disk will be automatically created under backend/storage/clients/{clientName.trim() || 'General'}/
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-studio-muted">
            Target Composition
          </label>
          <div className="grid grid-cols-3 gap-2">
            {ASPECT_RATIOS.slice(0, 3).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedAspect(item.id)}
                className={`py-2 px-3 rounded-lg border text-center transition-all ${
                  selectedAspect === item.id
                    ? 'bg-violet-600/15 border-violet-500 text-white'
                    : 'bg-studio-surface border-studio-border text-studio-muted hover:text-studio-text'
                }`}
              >
                <div className="text-xs font-semibold">{item.label}</div>
                <div className="text-[10px] text-studio-subtle">{item.sublabel.split(' ')[0]}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-studio-muted">
            Master Resolution
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['1080p', '4K'] as const).map((res) => (
              <button
                key={res}
                type="button"
                onClick={() => setSelectedRes(res)}
                className={`py-2 px-3 rounded-lg border text-center text-xs font-medium transition-all ${
                  selectedRes === res
                    ? 'bg-violet-600/15 border-violet-500 text-violet-300'
                    : 'bg-studio-surface border-studio-border text-studio-muted hover:text-studio-text'
                }`}
              >
                {res === '1080p' ? '1080p Full HD' : '4K Ultra HD'}
              </button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
};
