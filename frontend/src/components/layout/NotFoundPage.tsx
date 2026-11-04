import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Film } from 'lucide-react';
import { Button } from '../ui/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-studio-surface border border-studio-border flex items-center justify-center text-violet-400 shadow-studio">
        <Film className="w-7 h-7" />
      </div>

      <div className="space-y-1 max-w-sm">
        <h2 className="text-xl font-bold text-studio-text">Page Not Found</h2>
        <p className="text-xs text-studio-muted leading-relaxed">
          The requested studio workspace or page route does not exist. Check the navigation menu or return to the dashboard.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button
          variant="primary"
          size="md"
          onClick={() => navigate('/')}
          leftIcon={<Home className="w-4 h-4" />}
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
};

