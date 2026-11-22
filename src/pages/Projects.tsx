import {
  ArrowRight,
  ArrowUpRight,
  FolderOpen,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlanView } from '../PlanView';
import type { Project } from '../models';
import { projectSchema } from '../models';
import type { StorageMode } from '../storage';
import { repositoryFor } from '../storage';

import { Button, ErrorBox, Field, PageTitle } from '../components/ui';
export default function Projects({ mode }: { mode: StorageMode }) {
  const [projects, setProjects] = useState<Project[]>([]),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [renaming, setRenaming] = useState<string | null>(null),
    [newName, setNewName] = useState(''),
    [deleting, setDeleting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const load = useCallback(() => {
    setLoading(true);
    setError('');
    repositoryFor(mode)
      .list()
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [mode]);
  useEffect(load, [load]);
  async function rename(p: Project) {
    if (newName.trim().length < 2) {
      setError('Use a project name with at least two characters.');
      return;
    }
    try {
      await repositoryFor(mode).save({
        ...p,
        name: newName.trim(),
        updatedAt: new Date().toISOString(),
      });
      setRenaming(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function remove(id: string) {
    try {
      await repositoryFor(mode).remove(id);
      setDeleting(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="container section projects-page">
      <div className="design-heading">
        <PageTitle eyebrow="YOUR IDEAS, TAKING SHAPE" title="A home for your projects.">
          {mode === 'local'
            ? 'Saved only in this browser. Export JSON backups to keep a portable copy.'
            : 'Your private projects in Supabase. Browser demo projects are separate.'}
        </PageTitle>
        <Link to="/new" className="btn">
          <Plus size={17} /> New project
        </Link>
      </div>
      <ErrorBox message={error} />
      {loading ? (
        <div className="loading">
          <LoaderCircle className="spin" /> Loading projects…
        </div>
      ) : !projects.length ? (
        <div className="empty-state">
          <FolderOpen size={42} />
          <h2>Your next space starts here.</h2>
          <p>Create your first concept and it will appear in this workspace.</p>
          <Link to="/new" className="btn">
            Start a project <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((p) => {
            const v = p.versions[p.versions.length - 1];
            return (
              <article key={p.id} className="project-card">
                <Link to={`/design/${p.id}?mode=${mode}`}>
                  <div className="project-preview">
                    <PlanView brief={v.brief} layout={v.layout} decorative />
                  </div>
                </Link>
                <div className="project-card-body">
                  <span className="eyebrow">
                    {v.brief.type} · {p.versions.length} version(s)
                  </span>
                  {renaming === p.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        rename(p);
                      }}
                    >
                      <Field label="New project name">
                        <input
                          autoFocus
                          maxLength={100}
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                        />
                      </Field>
                      <div className="inline-actions">
                        <Button type="submit">Save name</Button>
                        <Button secondary onClick={() => setRenaming(null)}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <h3>
                      <Link to={`/design/${p.id}?mode=${mode}`}>{p.name}</Link>
                    </h3>
                  )}
                  <p>
                    {v.brief.locality}, {v.brief.city}
                  </p>
                  <div className="project-card-actions">
                    <small>{new Date(p.updatedAt).toLocaleDateString()}</small>
                    <button
                      aria-label={`Rename ${p.name}`}
                      className="icon-button"
                      onClick={() => {
                        setRenaming(p.id);
                        setNewName(p.name);
                      }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      aria-label={`Delete ${p.name}`}
                      className="icon-button"
                      onClick={() => setDeleting(p.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                    <Link
                      aria-label={`Open ${p.name}`}
                      to={`/design/${p.id}?mode=${mode}`}
                      className="icon-button"
                    >
                      <ArrowUpRight size={18} />
                    </Link>
                  </div>
                  {deleting === p.id && (
                    <div className="delete-confirm">
                      <p>
                        Delete this project, its versions and consultation records? This cannot be
                        undone.
                      </p>
                      <Button onClick={() => remove(p.id)}>Delete permanently</Button>
                      <Button secondary onClick={() => setDeleting(null)}>
                        Keep project
                      </Button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <div className="import-row">
        <input
          ref={fileRef}
          className="sr-only"
          aria-label="Import project JSON file"
          type="file"
          accept="application/json,.json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              if (file.size > 10 * 1024 * 1024)
                throw new Error('Choose a JSON backup under 10 MB.');
              const raw = JSON.parse(await file.text());
              const p = projectSchema.parse(raw.project);
              const now = new Date().toISOString();
              const imported = {
                ...p,
                id: crypto.randomUUID(),
                name: `${p.name.slice(0, 85)} (imported)`,
                updatedAt: now,
                versions: p.versions.map((v) => ({ ...v, id: crypto.randomUUID() })),
              };
              await repositoryFor(mode).save(imported);
              load();
            } catch (e) {
              setError(`Import failed: ${(e as Error).message}`);
            }
            e.target.value = '';
          }}
        />
        <Button secondary onClick={() => fileRef.current?.click()}>
          <Plus size={16} /> Import JSON backup
        </Button>
        <span className="fine-print">
          Import explicitly copies a backup into the selected{' '}
          {mode === 'local' ? 'browser' : 'cloud'} workspace.
        </span>
      </div>
    </div>
  );
}
