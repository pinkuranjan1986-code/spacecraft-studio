import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Lead, Project, UploadedFile } from './models';
import { leadSchema, projectSchema } from './models';
const url = import.meta.env.VITE_SUPABASE_URL,
  key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
function configureCloud() {
  if (!url && !key) return { client: null, error: '' };
  if (!url || !key)
    return {
      client: null,
      error:
        'Cloud configuration is incomplete. Set both public Supabase values, or leave both blank for demo mode.',
    };
  try {
    return { client: createClient(url, key), error: '' };
  } catch {
    return {
      client: null,
      error:
        'Cloud configuration is invalid. Check the public Supabase URL and key. The browser demo is still available.',
    };
  }
}
const cloud = configureCloud();
export const supabase = cloud.client;
export const cloudConfigError = cloud.error;
export type StorageMode = 'local' | 'cloud';
export interface ProjectRepository {
  list(): Promise<Project[]>;
  get(id: string): Promise<Project | null>;
  save(project: Project): Promise<void>;
  remove(id: string): Promise<void>;
  addLead(lead: Lead): Promise<void>;
}
const storeSchema = z.object({
  schemaVersion: z.literal(1),
  projects: z.array(projectSchema),
  leads: z.array(leadSchema),
});
const STORE = 'spacecraft-studio:v1';
export function readLocal(
  storage: Pick<Storage, 'getItem'> = localStorage,
): z.infer<typeof storeSchema> {
  const raw = storage.getItem(STORE);
  if (!raw) return { schemaVersion: 1, projects: [], leads: [] };
  try {
    return storeSchema.parse(JSON.parse(raw));
  } catch {
    throw new Error(
      'Browser project storage is unreadable. Export/back up the browser data before clearing the spacecraft-studio:v1 key. Existing data was not overwritten.',
    );
  }
}
function writeLocal(data: z.infer<typeof storeSchema>) {
  try {
    localStorage.setItem(STORE, JSON.stringify(storeSchema.parse(data)));
  } catch {
    throw new Error(
      'Browser storage is full or unavailable. Nothing was saved. Free browser storage and retry; keep this screen open to retain your current input.',
    );
  }
}
export const localRepository: ProjectRepository = {
  async list() {
    return readLocal().projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async get(id) {
    return readLocal().projects.find((p) => p.id === id) || null;
  },
  async save(project) {
    const data = readLocal();
    const checked = projectSchema.parse(project);
    data.projects = [checked, ...data.projects.filter((p) => p.id !== project.id)];
    writeLocal(data);
  },
  async remove(id) {
    const data = readLocal();
    data.projects = data.projects.filter((p) => p.id !== id);
    data.leads = data.leads.filter((l) => l.projectId !== id);
    writeLocal(data);
  },
  async addLead(lead) {
    const data = readLocal();
    if (!data.projects.some((p) => p.id === lead.projectId))
      throw new Error('Save the project before requesting a consultation.');
    data.leads.push(leadSchema.parse(lead));
    writeLocal(data);
  },
};
async function cloudClient() {
  if (!supabase) throw new Error('Cloud storage is not configured.');
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Sign in before using cloud storage.');
  return { client: supabase, user: data.user };
}
function cloudError(error: { message: string } | null) {
  if (error)
    throw new Error(`Cloud operation failed: ${error.message}. No local fallback was used.`);
}
async function loadCloud(): Promise<Project[]> {
  const { client } = await cloudClient();
  const { data, error } = await client
    .from('projects')
    .select('id,name,updated_at,project_versions(id,created_at,brief,layout)');
  cloudError(error);
  return (data || [])
    .map((p) =>
      projectSchema.parse({
        id: p.id,
        name: p.name,
        updatedAt: p.updated_at,
        versions: p.project_versions
          .map((v) => ({ id: v.id, createdAt: v.created_at, brief: v.brief, layout: v.layout }))
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      }),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export const cloudRepository: ProjectRepository = {
  list: loadCloud,
  async get(id) {
    return (await loadCloud()).find((p) => p.id === id) || null;
  },
  async save(project) {
    const { client } = await cloudClient();
    const checked = projectSchema.parse(project);
    const { error } = await client.rpc('save_project', { payload: checked });
    cloudError(error);
  },
  async remove(id) {
    const { client } = await cloudClient();
    const { data, error: readError } = await client
      .from('uploaded_files')
      .select('path')
      .eq('project_id', id);
    cloudError(readError);
    if (data?.length) {
      const { error } = await client.storage.from('project-files').remove(data.map((f) => f.path));
      cloudError(error);
    }
    const { error } = await client.from('projects').delete().eq('id', id);
    cloudError(error);
  },
  async addLead(lead) {
    const { client } = await cloudClient();
    const { error } = await client.rpc('submit_lead', { payload: leadSchema.parse(lead) });
    cloudError(error);
  },
};
export const repositoryFor = (mode: StorageMode) =>
  mode === 'cloud' ? cloudRepository : localRepository;
export async function uploadPlan(file: File, projectId: string): Promise<UploadedFile> {
  if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024)
    throw new Error('Choose a JPEG or PNG image no larger than 5 MB.');
  const { client, user } = await cloudClient();
  const id = crypto.randomUUID(),
    path = `${user.id}/${projectId}/${id}.${file.type === 'image/png' ? 'png' : 'jpg'}`;
  const { error } = await client.storage
    .from('project-files')
    .upload(path, file, { contentType: file.type });
  cloudError(error);
  const { error: refError } = await client.from('uploaded_files').insert({
    id,
    project_id: projectId,
    owner_id: user.id,
    path,
    name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
  });
  if (refError) {
    await client.storage.from('project-files').remove([path]);
    cloudError(refError);
  }
  return { id, projectId, path, name: file.name };
}
export async function listUploads(projectId: string) {
  const { client } = await cloudClient();
  const { data, error } = await client
    .from('uploaded_files')
    .select('id,path,name')
    .eq('project_id', projectId);
  cloudError(error);
  return data || [];
}
export async function openUpload(path: string) {
  const { client } = await cloudClient();
  const { data, error } = await client.storage.from('project-files').createSignedUrl(path, 60);
  cloudError(error);
  return data!.signedUrl;
}
