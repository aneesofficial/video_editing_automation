import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { apiClient } from '../../services/apiClient';

interface SystemItem {
  name: string;
  ok: boolean;
  statusText: string;
  fixTip: string;
}

export const SystemCheckSection: React.FC = () => {
  const [items, setItems] = useState<SystemItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const runCheck = async () => {
    setIsLoading(true);
    try {
      const health = await apiClient.checkHealth();
      const raw = health.rawReport || {};

      const videoEngineOk = Boolean(
        raw.videoEngine?.connected ?? health.connected
      );

      const speechOk = Boolean(
        raw.speech?.connected ?? (raw.python?.status === 'ok')
      );

      const photoCutoutOk = Boolean(
        raw.photoCutout?.connected
      );

      const editServiceOk = Boolean(
        raw.editService?.connected
      );

      const footageServiceOk = Boolean(
        raw.footageService?.connected
      );

      const storageOk = Boolean(
        raw.storage?.connected !== false &&
        (raw.disk ? raw.disk.freeGb > 5 : true)
      );

      const musicCount = raw.music?.trackCount ?? raw.musicLibrary?.trackCount ?? 0;
      const musicOk = musicCount > 0;

      const checkedItems: SystemItem[] = [
        {
          name: 'Video engine',
          ok: videoEngineOk,
          statusText: videoEngineOk ? 'Operational' : 'Unavailable',
          fixTip: 'Verify video processing binary is accessible in environment path.',
        },
        {
          name: 'Speech',
          ok: speechOk,
          statusText: speechOk ? 'Operational' : 'Unavailable',
          fixTip: 'Verify speech processing module is active in worker environment.',
        },
        {
          name: 'Photo cut-out',
          ok: photoCutoutOk,
          statusText: photoCutoutOk ? 'Ready' : 'Model missing',
          fixTip: 'Place cut-out weights file into backend/storage/models directory.',
        },
        {
          name: 'Edit service',
          ok: editServiceOk,
          statusText: editServiceOk ? 'Connected' : 'Not configured',
          fixTip: 'Paste and save Edit service key in the Services tab.',
        },
        {
          name: 'Footage service',
          ok: footageServiceOk,
          statusText: footageServiceOk ? 'Connected' : 'Not configured',
          fixTip: 'Paste and save Footage service key in the Services tab.',
        },
        {
          name: 'Storage',
          ok: storageOk,
          statusText: storageOk
            ? `${raw.disk?.freeGb ?? 0} GB free`
            : 'Low disk space',
          fixTip: 'Clear temporary files in Storage and Backup tab.',
        },
        {
          name: 'Music',
          ok: musicOk,
          statusText: musicOk ? `${musicCount} tracks` : 'No tracks',
          fixTip: 'Upload audio files in the Music tab.',
        },
      ];

      setItems(checkedItems);
    } catch {
      setItems([
        {
          name: 'Video engine',
          ok: false,
          statusText: 'Check failed',
          fixTip: 'Ensure backend server is running.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runCheck();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#ECEDEF]">System Check</h3>
          <p className="text-xs text-[#8B909A] mt-0.5">
            Diagnostic status of workstation components.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={runCheck}
          isLoading={isLoading}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Check Now
        </Button>
      </div>

      <div className="divide-y divide-[#23262D] rounded border border-[#23262D] bg-[#121317]">
        {items.map((item) => (
          <div key={item.name} className="p-3.5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#ECEDEF]">{item.name}</span>
                <Badge variant={item.ok ? 'success' : 'danger'} size="sm" dot>
                  {item.statusText}
                </Badge>
              </div>
              {!item.ok && (
                <p className="text-[11px] text-[#8B909A] mt-1">{item.fixTip}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
