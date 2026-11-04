import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { backendConfigSchema, BackendConfigValues } from './settingsSchemas';
import { useSettings } from '../../store/SettingsContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatDate } from '../../utils/formatters';
import { RefreshCw, Check } from 'lucide-react';

export const BackendConfigSection: React.FC = () => {
  const { settings, updateBackendConfig, testBackendConnection, isTestingConnection } = useSettings();
  const [saveSuccess, setSaveSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BackendConfigValues>({
    resolver: zodResolver(backendConfigSchema),
    defaultValues: {
      apiUrl: settings.backendConfig.apiUrl,
      apiKey: settings.backendConfig.apiKey,
    },
  });

  const onSubmit = (data: BackendConfigValues) => {
    updateBackendConfig(data);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const status = settings.backendConfig.status;

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className="p-4 bg-studio-card border border-studio-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-studio-text">Engine Endpoint Connectivity:</span>
            {status === 'connected' ? (
              <Badge variant="emerald" size="sm" dot>Connected</Badge>
            ) : status === 'checking' ? (
              <Badge variant="amber" size="sm" dot>Testing...</Badge>
            ) : (
              <Badge variant="neutral" size="sm" dot>Offline (Phase 2)</Badge>
            )}
          </div>
          <p className="text-xs text-studio-muted">
            {status === 'connected'
              ? 'Local video editing backend is online and communicating with NovaCut Studio.'
              : settings.backendConfig.errorMessage
              ? settings.backendConfig.errorMessage
              : 'Backend is offline or awaiting launch. Local editing and timeline preview operate offline.'}
          </p>
          {settings.backendConfig.lastCheckedAt && (
            <span className="text-[10px] font-mono text-studio-subtle block">
              Last probe: {formatDate(settings.backendConfig.lastCheckedAt)}
            </span>
          )}
        </div>

        <Button
          variant="primary"
          size="sm"
          isLoading={isTestingConnection}
          onClick={testBackendConnection}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin' : ''}`} />}
        >
          Test Connection
        </Button>
      </div>

      {/* Config Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Backend API Base URL"
          {...register('apiUrl')}
          error={errors.apiUrl?.message}
          helperText="Host endpoint exposing the Phase 2 FastAPI/Python automated video editing service."
        />

        <Input
          label="API Authentication Token (Optional)"
          type="password"
          {...register('apiKey')}
          error={errors.apiKey?.message}
          placeholder="novacut_live_****************"
          helperText="Bearer token for private GPU rendering clusters."
        />

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            leftIcon={saveSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : undefined}
          >
            {saveSuccess ? 'Endpoint Saved' : 'Save Endpoint'}
          </Button>
        </div>
      </form>
    </div>
  );
};
