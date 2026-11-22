import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Compass,
  Download,
  LoaderCircle,
  Mail,
  Minus,
  Pencil,
  Plus,
  Printer,
  Save,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { PlanView } from '../PlanView';
import { disclaimer, types } from '../config';
import { formatLength, layoutEngine } from '../engine';
import type { ProjectBrief, SpaceRequirement } from '../models';
import type { StorageMode } from '../storage';
import { listUploads, openUpload, repositoryFor, uploadPlan } from '../storage';

import { InteriorBoard } from '../components/Interior';
import { Button, Dialog, ErrorBox, Field, PageTitle } from '../components/ui';
import { useProject } from '../useProject';
export default function Design({ mode }: { mode: StorageMode }) {
  const { id } = useParams(),
    navigate = useNavigate(),
    location = useLocation();
  const actualMode = new URLSearchParams(location.search).get('mode') as StorageMode | null;
  const selectedMode = actualMode === 'cloud' || actualMode === 'local' ? actualMode : mode;
  const { project, setProject, error, setError, loading } = useProject(id, selectedMode);
  const [versionIndex, setVersionIndex] = useState(-1),
    [floor, setFloor] = useState(0),
    [zoom, setZoom] = useState(1),
    [tab, setTab] = useState('plan'),
    [editing, setEditing] = useState(false),
    [editBrief, setEditBrief] = useState<ProjectBrief | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState((location.state as { notice?: string } | null)?.notice || ''),
    [uploads, setUploads] = useState<{ id: string; path: string; name: string }[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const version = project?.versions[versionIndex < 0 ? project.versions.length - 1 : versionIndex];
  const refreshUploads = useCallback(() => {
    if (selectedMode === 'cloud' && id)
      listUploads(id)
        .then(setUploads)
        .catch((e) => setError(e.message));
  }, [id, selectedMode, setError]);
  useEffect(refreshUploads, [refreshUploads]);
  if (loading)
    return (
      <div className="container section loading">
        <LoaderCircle className="spin" /> Opening your concept…
      </div>
    );
  if (!project || !version)
    return (
      <div className="container section">
        <ErrorBox message={error} />
        <Link className="text-link" to="/projects">
          Back to projects <ArrowLeft size={15} />
        </Link>
      </div>
    );
  const { brief: b, layout } = version;
  async function regenerate() {
    if (!editBrief || !project) return;
    setBusy(true);
    setError('');
    try {
      const layout = layoutEngine.generate(editBrief),
        now = new Date().toISOString();
      const updated = {
        ...project,
        name: editBrief.name,
        updatedAt: now,
        versions: [
          ...project.versions,
          { id: crypto.randomUUID(), createdAt: now, brief: editBrief, layout },
        ],
      };
      await repositoryFor(selectedMode).save(updated);
      setProject(updated);
      setVersionIndex(-1);
      setFloor(0);
      setEditing(false);
      setNotice('Revised concept saved as a new version.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function download(kind: 'svg' | 'json') {
    if (!project || !version) return;
    const blob =
      kind === 'svg'
        ? new Blob([new XMLSerializer().serializeToString(svgRef.current!)], {
            type: 'image/svg+xml',
          })
        : new Blob(
            [
              JSON.stringify(
                { project, exportedAt: new Date().toISOString(), disclaimer },
                null,
                2,
              ),
            ],
            { type: 'application/json' },
          );
    const url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = `spacecraft-${project.id}.${kind}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="container section design-page">
      <div className="breadcrumbs">
        <Link to="/projects">My projects</Link>
        <ChevronRight size={13} />
        <span>Your concept</span>
      </div>
      <div className="design-heading">
        <PageTitle
          eyebrow={`${types.find((t) => t.id === b.type)?.label.toUpperCase()} · ${b.city.toUpperCase()}`}
          title={project.name}
        >
          {b.locality} · {formatLength(layout.width, b.unit)} × {formatLength(layout.depth, b.unit)}{' '}
          · {b.floors} floor(s)
        </PageTitle>
        <div className="design-actions">
          <Button secondary onClick={() => window.print()}>
            <Printer size={16} /> Print / PDF
          </Button>
          <Button secondary onClick={() => download('json')}>
            <Download size={16} /> JSON
          </Button>
        </div>
      </div>
      <ErrorBox message={error} />
      {notice && (
        <div className="success-box" role="status">
          <CheckCircle2 size={18} />
          {notice}
        </div>
      )}
      <div className="design-banner">
        <ShieldCheck size={19} />
        <span>{disclaimer}</span>
        <small>
          {selectedMode === 'local' ? 'Saved in this browser only' : 'Saved to your cloud account'}
        </small>
      </div>
      <div className="design-layout">
        <section className="design-main">
          <div className="tabs" role="tablist" aria-label="Concept view">
            {[
              ['plan', '2D concept'],
              ['interior', 'Interior direction'],
              ['notes', 'Design notes'],
            ].map(([key, label]) => (
              <button
                key={key}
                role="tab"
                id={`tab-${key}`}
                aria-controls={`panel-${key}`}
                aria-selected={tab === key}
                tabIndex={tab === key ? 0 : -1}
                onKeyDown={(event) => {
                  const keys = ['plan', 'interior', 'notes'];
                  const index = keys.indexOf(key);
                  const next =
                    event.key === 'ArrowRight'
                      ? (index + 1) % 3
                      : event.key === 'ArrowLeft'
                        ? (index + 2) % 3
                        : event.key === 'Home'
                          ? 0
                          : event.key === 'End'
                            ? 2
                            : -1;
                  if (next >= 0) {
                    event.preventDefault();
                    setTab(keys[next]);
                    document.getElementById(`tab-${keys[next]}`)?.focus();
                  }
                }}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            className={`plan-panel ${tab !== 'plan' ? 'hidden-print-plan' : ''}`}
            id="panel-plan"
            role="tabpanel"
            aria-labelledby="tab-plan"
            hidden={tab !== 'plan'}
          >
            <div className="plan-toolbar">
              <div className="floor-select">
                <label htmlFor="floor">Viewing</label>
                <select id="floor" value={floor} onChange={(e) => setFloor(Number(e.target.value))}>
                  {Array.from({ length: b.floors }, (_, f) => (
                    <option key={f} value={f}>
                      Floor {f + 1}
                    </option>
                  ))}
                </select>
              </div>
              <div className="zoom-controls">
                <button
                  className="icon-button"
                  aria-label="Zoom out plan"
                  disabled={zoom <= 1}
                  onClick={() => setZoom(Math.max(1, zoom - 0.25))}
                >
                  <Minus size={14} />
                </button>
                <span>{Math.round(zoom * 100)}%</span>
                <button
                  className="icon-button"
                  aria-label="Zoom in plan"
                  disabled={zoom >= 2.5}
                  onClick={() => setZoom(Math.min(2.5, zoom + 0.25))}
                >
                  <Plus size={14} />
                </button>
              </div>
              <Button secondary onClick={() => download('svg')}>
                <Download size={15} /> Export SVG
              </Button>
            </div>
            <div className="plan-viewport" tabIndex={0} aria-label="Scrollable concept plan">
              <div style={{ width: `${zoom * 100}%` }}>
                <PlanView ref={svgRef} layout={layout} brief={b} floor={floor} />
              </div>
            </div>
            <div className="plan-key">
              <span>
                <i className="key-living" /> Activity zones
              </span>
              <span>
                <i className="key-circulation" /> Reserved circulation
              </span>
              <span>Approximate dimensions · {b.unit}</span>
            </div>
          </div>
          <div
            id="panel-interior"
            role="tabpanel"
            aria-labelledby="tab-interior"
            hidden={tab !== 'interior'}
          >
            <InteriorBoard room={b.roomType} style={b.style} />
          </div>
          <div
            id="panel-notes"
            className="panel notes-panel"
            role="tabpanel"
            aria-labelledby="tab-notes"
            hidden={tab !== 'notes'}
          >
            <h2>Assumptions & limitations</h2>
            <ul>
              {layout.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <h3>Your recorded constraints</h3>
            <p>{b.constraints || 'No additional constraints entered.'}</p>
            {b.spaces
              .filter((s) => s.notes)
              .map((s) => (
                <p key={s.id}>
                  <strong>{s.name}:</strong> {s.notes}
                </p>
              ))}
            <h3>Vastu preference check</h3>
            {b.vastu === 'none' ? (
              <p>No preference selected. No checks were performed.</p>
            ) : layout.notes.length ? (
              layout.notes.map((n) => (
                <div className="vastu-note" key={n.ruleId}>
                  <span className={`note-status ${n.status}`}>{n.status}</span>
                  <strong>{n.label}</strong>
                  <p>{n.message}</p>
                </div>
              ))
            ) : (
              <p>No individual preferences selected. No checks were performed.</p>
            )}
            <p className="fine-print">
              Checks compare space centres to compass zones only. They do not assess entrances,
              openings, furniture orientation, or any complete Vastu system.
            </p>
          </div>
          <div className="allocation-table panel">
            <h3>Requested & allocated space</h3>
            <p className="muted">
              Allocated zones include no wall allowance. Values shown in {b.unit}².
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Space</th>
                    <th>Floor</th>
                    <th>Requested</th>
                    <th>Allocated</th>
                  </tr>
                </thead>
                <tbody>
                  {layout.rooms
                    .filter((r) => r.kind === 'room')
                    .map((r) => {
                      const divisor = b.unit === 'ft' ? 0.3048 ** 2 : 1;
                      return (
                        <tr key={r.id}>
                          <td>{r.name}</td>
                          <td>{r.floor + 1}</td>
                          <td>{(r.requestedArea / divisor).toFixed(1)}</td>
                          <td className={r.allocatedArea < r.requestedArea ? 'shortage' : ''}>
                            {(r.allocatedArea / divisor).toFixed(1)}
                            {r.allocatedArea < r.requestedArea ? ' ↓' : ''}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        <aside className="design-sidebar">
          <div className="panel">
            <span className="eyebrow">YOUR NEXT ITERATION</span>
            <h3>Good spaces evolve.</h3>
            <p className="muted">
              Adjust your rooms and requirements, then explore a fresh concept.
            </p>
            <Button
              className="full"
              onClick={() => {
                setEditBrief({ ...b, spaces: b.spaces.map((s) => ({ ...s })) });
                setEditing(true);
              }}
            >
              <Pencil size={16} /> Edit & regenerate
            </Button>
            <Button
              secondary
              className="full"
              onClick={() => navigate(`/contact?project=${project.id}&mode=${selectedMode}`)}
            >
              <Mail size={16} /> Request consultation
            </Button>
            <div className="divider" />
            <Field label="Concept version">
              <select
                value={versionIndex < 0 ? project.versions.length - 1 : versionIndex}
                onChange={(e) => {
                  setVersionIndex(Number(e.target.value));
                  setFloor(0);
                }}
              >
                {project.versions.map((v, i) => (
                  <option key={v.id} value={i}>
                    Version {i + 1} · {new Date(v.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </Field>
            <p className="fine-print">
              Project ID
              <br />
              <code>{project.id}</code>
            </p>
          </div>
          <div className="panel">
            <Compass size={24} />
            <h3>Preferences, considered.</h3>
            <p className="muted">
              {b.vastu === 'none'
                ? 'Vastu checks are off for this project.'
                : `${layout.notes.filter((n) => n.status === 'considered').length} of ${layout.notes.length} selected preferences considered in this partition.`}
            </p>
            <button className="text-link" onClick={() => setTab('notes')}>
              Read design notes <ArrowRight size={15} />
            </button>
          </div>
          {selectedMode === 'cloud' && (
            <div className="panel">
              <h3>Private references</h3>
              {uploads.map((f) => (
                <button
                  className="upload-link"
                  key={f.id}
                  onClick={async () => {
                    try {
                      window.open(await openUpload(f.path), '_blank', 'noopener,noreferrer');
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  {f.name} <ArrowUpRight size={14} />
                </button>
              ))}
              <Field label="Attach JPEG / PNG (up to 5 MB)">
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setError('');
                    try {
                      await uploadPlan(f, project.id);
                      refreshUploads();
                      setNotice('Reference uploaded privately.');
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                />
              </Field>
            </div>
          )}
        </aside>
      </div>
      <div className="print-floors">
        {Array.from({ length: b.floors }, (_, f) => (
          <section key={f}>
            <h2>Floor {f + 1}</h2>
            <PlanView layout={layout} brief={b} floor={f} />
          </section>
        ))}
      </div>
      <section className="print-notes">
        <h2>Concept assumptions</h2>
        <ul>
          {layout.assumptions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
        <p>{b.constraints}</p>
        <h3>Vastu preference notes</h3>
        <p>
          {b.vastu === 'none'
            ? 'No preferences selected.'
            : layout.notes.map((n) => `${n.label}: ${n.status}. ${n.message}`).join(' ')}
        </p>
      </section>
      {editing && editBrief && (
        <Dialog onClose={() => setEditing(false)}>
          <div className="modal-header">
            <h2 id="edit-title">Revise your concept</h2>
            <button
              className="icon-button"
              aria-label="Close editor"
              onClick={() => setEditing(false)}
            >
              <X />
            </button>
          </div>
          <ErrorBox message={error} />
          <p className="muted">
            Saving creates a new version; your previous concept remains available.
          </p>
          <Field label="Project name">
            <input
              value={editBrief.name}
              onChange={(e) => setEditBrief({ ...editBrief, name: e.target.value })}
            />
          </Field>
          {editBrief.spaces.map((s, i) => (
            <div className="edit-space" key={s.id}>
              <Field label={`Space ${i + 1} name`}>
                <input
                  value={s.name}
                  onChange={(e) =>
                    setEditBrief({
                      ...editBrief,
                      spaces: editBrief.spaces.map((r) =>
                        r.id === s.id ? { ...r, name: e.target.value } : r,
                      ),
                    })
                  }
                />
              </Field>
              <Field label={`Area (${editBrief.unit}²)`}>
                <input
                  type="number"
                  value={s.area || ''}
                  onChange={(e) =>
                    setEditBrief({
                      ...editBrief,
                      spaces: editBrief.spaces.map((r) =>
                        r.id === s.id ? { ...r, area: Number(e.target.value) } : r,
                      ),
                    })
                  }
                />
              </Field>
              <Field label="Requirement">
                <input
                  value={s.notes}
                  onChange={(e) =>
                    setEditBrief({
                      ...editBrief,
                      spaces: editBrief.spaces.map((r) =>
                        r.id === s.id ? { ...r, notes: e.target.value } : r,
                      ),
                    })
                  }
                />
              </Field>
              <Field label="Priority">
                <select
                  value={s.priority}
                  onChange={(e) =>
                    setEditBrief({
                      ...editBrief,
                      spaces: editBrief.spaces.map((r) =>
                        r.id === s.id
                          ? { ...r, priority: e.target.value as SpaceRequirement['priority'] }
                          : r,
                      ),
                    })
                  }
                >
                  <option value="essential">Essential</option>
                  <option value="preferred">Preferred</option>
                </select>
              </Field>
            </div>
          ))}
          <Field label="Overall constraints">
            <textarea
              value={editBrief.constraints}
              onChange={(e) => setEditBrief({ ...editBrief, constraints: e.target.value })}
            />
          </Field>
          <div className="wizard-bottom">
            <Button secondary onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={regenerate}>
              {busy ? <LoaderCircle size={16} className="spin" /> : <Save size={16} />} Save revised
              concept
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
