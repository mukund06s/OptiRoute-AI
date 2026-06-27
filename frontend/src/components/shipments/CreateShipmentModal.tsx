'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Loader2 } from 'lucide-react';
import { hubsApi, shipmentsApi } from '@/lib/api';

interface CreateShipmentModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateShipmentModal({ open, onClose }: CreateShipmentModalProps) {
  const queryClient = useQueryClient();
  const [originHubId, setOriginHubId] = useState('');
  const [destinationHubId, setDestinationHubId] = useState('');
  const [priority, setPriority] = useState('standard');
  const [weightKg, setWeightKg] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: hubsData, isLoading: hubsLoading } = useQuery({
    queryKey: ['hubs'],
    queryFn: hubsApi.list,
    enabled: open,
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      shipmentsApi.create({
        originHubId: Number(originHubId),
        destinationHubId: Number(destinationHubId),
        priority,
        weightKg: weightKg ? Number(weightKg) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      resetForm();
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const resetForm = () => {
    setOriginHubId('');
    setDestinationHubId('');
    setPriority('standard');
    setWeightKg('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!originHubId || !destinationHubId) {
      setError('Please select origin and destination hubs');
      return;
    }

    if (originHubId === destinationHubId) {
      setError('Origin and destination must be different');
      return;
    }

    createMutation.mutate();
  };

  if (!open) return null;

  const hubs = hubsData?.hubs ?? [];
  const inputClass =
    'w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/60 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-md rounded-xl bg-[#1E293B] border border-slate-700/60 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <Plus size={16} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-100">New Shipment</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {hubsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-blue-400" />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Origin Hub</label>
                <select
                  value={originHubId}
                  onChange={(e) => setOriginHubId(e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="">Select origin…</option>
                  {hubs.map((hub) => (
                    <option key={hub.id} value={hub.id}>
                      {hub.name} ({hub.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Destination Hub</label>
                <select
                  value={destinationHubId}
                  onChange={(e) => setDestinationHubId(e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="">Select destination…</option>
                  {hubs.map((hub) => (
                    <option key={hub.id} value={hub.id}>
                      {hub.name} ({hub.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className={inputClass}
                >
                  <option value="standard">Standard</option>
                  <option value="express">Express</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Weight (kg)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="Optional"
                  className={inputClass}
                />
              </div>
            </>
          )}

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || hubsLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Create Shipment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
