import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleProjects } from './config';
import { layoutEngine } from './engine';
import type { Project } from './models';
import { leadSchema, projectSchema } from './models';
import { localRepository, readLocal } from './storage';
function project(): Project {
  const b = sampleProjects[0],
    now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: b.name,
    updatedAt: now,
    versions: [
      { id: crypto.randomUUID(), createdAt: now, brief: b, layout: layoutEngine.generate(b) },
    ],
  };
}
describe('project persistence and boundaries', () => {
  let values: Map<string, string>;
  beforeEach(() => {
    values = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => values.get(k) || null,
      setItem: (k: string, v: string) => values.set(k, v),
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  it('saves, reopens, renames and deletes project and related local lead', async () => {
    const p = project();
    await localRepository.save(p);
    expect(await localRepository.get(p.id)).toEqual(p);
    await localRepository.save({ ...p, name: 'Renamed home' });
    expect((await localRepository.list())[0].name).toBe('Renamed home');
    await localRepository.addLead({
      id: crypto.randomUUID(),
      projectId: p.id,
      name: 'Example person',
      email: 'example@example.com',
      message: '',
      consent: true,
      createdAt: new Date().toISOString(),
    });
    expect(readLocal().leads).toHaveLength(1);
    await localRepository.remove(p.id);
    expect(await localRepository.list()).toEqual([]);
    expect(readLocal().leads).toEqual([]);
  });
  it('retains existing bytes when a quota failure prevents a new save', async () => {
    const p = project();
    await localRepository.save(p);
    const before = values.get('spacecraft-studio:v1');
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => values.get(k) || null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });
    await expect(localRepository.save({ ...p, name: 'Not saved' })).rejects.toThrow(
      'Nothing was saved',
    );
    expect(values.get('spacecraft-studio:v1')).toBe(before);
  });
  it('does not overwrite corrupted project storage', async () => {
    values.set('spacecraft-studio:v1', 'corrupted');
    await expect(localRepository.save(project())).rejects.toThrow('not overwritten');
    expect(values.get('spacecraft-studio:v1')).toBe('corrupted');
  });
  it('rejects missing project references and invalid consent', async () => {
    const lead = {
      id: crypto.randomUUID(),
      projectId: crypto.randomUUID(),
      name: 'Example person',
      email: 'example@example.com',
      message: '',
      consent: true as const,
      createdAt: new Date().toISOString(),
    };
    await expect(localRepository.addLead(lead)).rejects.toThrow('Save the project');
    expect(leadSchema.safeParse({ ...lead, consent: false }).success).toBe(false);
  });
  it('accepts database ISO timestamps with an offset', () => {
    const p = project();
    p.updatedAt = '2026-11-22T12:00:00+00:00';
    p.versions[0].createdAt = p.updatedAt;
    expect(projectSchema.safeParse(p).success).toBe(true);
  });
  it('rejects overlapping imported geometry', () => {
    const p = project();
    p.versions[0].layout.rooms[0].x = 0;
    p.versions[0].layout.rooms[0].y = 0;
    expect(projectSchema.safeParse(p).success).toBe(false);
  });
});
