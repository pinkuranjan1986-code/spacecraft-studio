import { useEffect, useState } from 'react';
import type { Project } from './models';
import type { StorageMode } from './storage';
import { repositoryFor } from './storage';

export function useProject(id: string | undefined, mode: StorageMode) {
  const [project, setProject] = useState<Project | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setProject(null);
    repositoryFor(mode)
      .get(id || '')
      .then((p) => {
        if (active) {
          setProject(p);
          if (!p)
            setError(
              `Project not found in ${mode === 'local' ? 'this browser' : 'your cloud account'}. Check the storage selector.`,
            );
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, mode]);
  return { project, setProject, error, setError, loading };
}
