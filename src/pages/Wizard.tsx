import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Compass,
  LoaderCircle,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { disclaimer, makeBrief, types, vastuRules } from '../config';
import { layoutEngine } from '../engine';
import type { Project, ProjectBrief, ProjectVersion, SpaceRequirement } from '../models';
import { briefSchema, directions } from '../models';
import type { StorageMode } from '../storage';
import { repositoryFor, uploadPlan } from '../storage';

import { InteriorControls } from '../components/Interior';
import { icons } from '../components/icons';
import { Button, ErrorBox, Field, PageTitle } from '../components/ui';
import { draftKey, getDraft } from '../drafts';
export default function Wizard({ mode }: { mode: StorageMode }) {
  const navigate = useNavigate();
  const [b, setB] = useState<ProjectBrief>(getDraft),
    [step, setStep] = useState(0),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [draftError, setDraftError] = useState(''),
    [image, setImage] = useState<File | null>(null),
    [imageUrl, setImageUrl] = useState('');
  const patch = (value: Partial<ProjectBrief>) => setB((v) => ({ ...v, ...value }));
  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(b));
      setDraftError('');
    } catch {
      setDraftError(
        'Draft recovery is unavailable in this browser. Keep this tab open and export your concept after generating.',
      );
    }
  }, [b]);
  useEffect(() => {
    if (!image) {
      setImageUrl('');
      return;
    }
    const url = URL.createObjectURL(image);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);
  function validate() {
    const result = briefSchema.safeParse(b);
    const fields = [
      ['type'],
      [
        'name',
        'city',
        'locality',
        'width',
        'depth',
        'unit',
        'shape',
        'north',
        'roads',
        'floors',
        'budget',
        'envelopeConfirmed',
      ],
      ['spaces'],
      ['vastu', 'ruleIds', 'roomType', 'style'],
      [],
    ][step];
    const found: Record<string, string> = {};
    if (!result.success)
      for (const i of result.error.issues) {
        const key = i.path.join('.');
        if (step === 4 || fields.includes(String(i.path[0]))) found[key] = i.message;
      }
    setErrors(found);
    return Object.keys(found).length === 0;
  }
  async function next() {
    if (!validate()) return;
    if (step < 4) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const layout = layoutEngine.generate(b);
      const version: ProjectVersion = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        brief: b,
        layout,
      };
      const project: Project = {
        id: crypto.randomUUID(),
        name: b.name,
        updatedAt: version.createdAt,
        versions: [version],
      };
      await repositoryFor(mode).save(project);
      let uploadError = '';
      if (image && mode === 'cloud') {
        try {
          await uploadPlan(image, project.id);
        } catch (e) {
          uploadError = (e as Error).message;
        }
      }
      navigate(`/design/${project.id}?mode=${mode}`, {
        state: uploadError
          ? {
              notice: `Project saved, but the image upload failed: ${uploadError}. Retry from the results page.`,
            }
          : undefined,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function spacePatch(id: string, p: Partial<SpaceRequirement>) {
    patch({ spaces: b.spaces.map((s) => (s.id === id ? { ...s, ...p } : s)) });
  }
  const fieldError = (key: string) => errors[key];
  return (
    <div className="container section wizard-page">
      <PageTitle eyebrow="LET’S MAKE ROOM FOR YOUR IDEAS" title="A brief for your next big thing.">
        A few details now. A clearer direction next.
      </PageTitle>
      <div className="wizard-layout">
        <aside className="wizard-sidebar">
          <div className="wizard-steps">
            {[
              'Your project',
              'Site & location',
              'Spaces & needs',
              'Style & preferences',
              'Review & create',
            ].map((s, i) => (
              <div className={i === step ? 'current' : i < step ? 'complete' : ''} key={s}>
                <span>{i < step ? <Check size={15} /> : String(i + 1).padStart(2, '0')}</span>
                <div>
                  <small>STEP {i + 1}</small>
                  <strong>{s}</strong>
                </div>
              </div>
            ))}
          </div>
          <div className="sidebar-note">
            <ShieldCheck size={22} />
            <p>
              Your concept is a starting point. A qualified professional should review it before any
              construction.
            </p>
          </div>
        </aside>
        <div className="wizard-content panel">
          <div className="panel-heading">
            <span className="eyebrow">STEP {step + 1} OF 5</span>
            <span className="muted">{Math.round((step / 4) * 100)}% complete</span>
          </div>
          <div className="progress-track">
            <div style={{ width: `${(step + 1) * 20}%` }} />
          </div>
          <ErrorBox message={draftError} />
          <ErrorBox message={error} />
          {step === 0 && (
            <>
              <h2>What are you imagining?</h2>
              <p className="muted">Choose a starting point. You can tailor every space.</p>
              <div className="choice-grid">
                {types.map((t) => {
                  const Icon = icons[t.icon];
                  return (
                    <button
                      key={t.id}
                      className={`choice ${b.type === t.id ? 'selected' : ''}`}
                      aria-pressed={b.type === t.id}
                      onClick={() =>
                        setB({ ...makeBrief(t.id), city: b.city, locality: b.locality })
                      }
                    >
                      <Icon size={26} />
                      <strong>{t.label}</strong>
                      <span>{t.description}</span>
                      {b.type === t.id && <CheckCircle2 className="choice-check" size={18} />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <h2>Tell us about the site.</h2>
              <p className="muted">
                Use clear, approximate dimensions. No survey is required to explore.
              </p>
              <div className="form-grid">
                <Field label="Project name" error={fieldError('name')}>
                  <input value={b.name} onChange={(e) => patch({ name: e.target.value })} />
                </Field>
                <Field label="Measurement units">
                  <select
                    value={b.unit}
                    onChange={(e) => {
                      const unit = e.target.value as 'm' | 'ft',
                        factor = unit === 'ft' ? 1 / 0.3048 : 0.3048;
                      patch({
                        unit,
                        width: Number((b.width * factor).toFixed(3)),
                        depth: Number((b.depth * factor).toFixed(3)),
                        spaces: b.spaces.map((s) => ({
                          ...s,
                          area: Number((s.area * factor * factor).toFixed(2)),
                        })),
                      });
                    }}
                  >
                    <option value="m">Metres (m)</option>
                    <option value="ft">Feet (ft)</option>
                  </select>
                </Field>
                <Field label="City" error={fieldError('city')}>
                  <input
                    placeholder="e.g. Bengaluru"
                    value={b.city}
                    onChange={(e) => patch({ city: e.target.value })}
                  />
                </Field>
                <Field label="Locality" error={fieldError('locality')}>
                  <input
                    placeholder="e.g. Whitefield"
                    value={b.locality}
                    onChange={(e) => patch({ locality: e.target.value })}
                  />
                </Field>
                <Field label={`Envelope width (${b.unit})`} error={fieldError('width')}>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={b.width || ''}
                    onChange={(e) => patch({ width: Number(e.target.value) })}
                  />
                </Field>
                <Field label={`Envelope depth (${b.unit})`} error={fieldError('depth')}>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={b.depth || ''}
                    onChange={(e) => patch({ depth: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Plot / room shape">
                  <select
                    value={b.shape}
                    onChange={(e) => patch({ shape: e.target.value as ProjectBrief['shape'] })}
                  >
                    <option value="rectangle">Rectangular</option>
                    <option value="irregular">Irregular — rectangular approximation</option>
                  </select>
                </Field>
                <Field label="North points toward">
                  <select
                    value={b.north}
                    onChange={(e) => patch({ north: e.target.value as ProjectBrief['north'] })}
                  >
                    {directions.map((d, i) => (
                      <option key={d} value={d}>
                        {['Top', 'Right', 'Bottom', 'Left'][i]} of plan
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Number of floors" error={fieldError('floors')}>
                  <input
                    type="number"
                    min="1"
                    max={b.type === 'interior' ? 1 : 5}
                    value={b.floors}
                    onChange={(e) => patch({ floors: Number(e.target.value) })}
                  />
                </Field>
                <Field
                  label="Approximate budget (INR)"
                  hint="Optional. 0 means not decided; no cost estimate is generated."
                  error={fieldError('budget')}
                >
                  <input
                    type="number"
                    min="0"
                    value={b.budget}
                    onChange={(e) => patch({ budget: Number(e.target.value) })}
                  />
                </Field>
              </div>
              <fieldset>
                <legend>
                  Road sides <small>(compass directions)</small>
                </legend>
                <div className="chips">
                  {directions.map((d) => (
                    <label key={d} className="check-chip">
                      <input
                        type="checkbox"
                        checked={b.roads.includes(d)}
                        onChange={(e) =>
                          patch({
                            roads: e.target.checked
                              ? [...b.roads, d]
                              : b.roads.filter((r) => r !== d),
                          })
                        }
                      />
                      {d}
                    </label>
                  ))}
                </div>
                {fieldError('roads') && <p className="field-error">{fieldError('roads')}</p>}
              </fieldset>
              {b.shape === 'irregular' && (
                <label className="consent">
                  <input
                    type="checkbox"
                    checked={b.envelopeConfirmed}
                    onChange={(e) => patch({ envelopeConfirmed: e.target.checked })}
                  />
                  <span>
                    I confirm these dimensions describe a rectangle inside my plot. The app will not
                    check my actual boundary.
                    <small className="field-error">{fieldError('envelopeConfirmed')}</small>
                  </span>
                </label>
              )}
              <Field
                label="Reference plan or plot image"
                hint={
                  mode === 'local'
                    ? 'Local-only preview for this session. Images are not saved in browser storage or uploaded.'
                    : 'JPEG/PNG, up to 5 MB. Uploads privately after the cloud project is saved.'
                }
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (!['image/jpeg', 'image/png'].includes(f.type) || f.size > 5 * 1024 * 1024) {
                      setError('Choose a JPEG or PNG no larger than 5 MB.');
                      return;
                    }
                    setError('');
                    setImage(f);
                  }}
                />
              </Field>
              {imageUrl && (
                <div className="image-preview">
                  <img
                    src={imageUrl}
                    alt="Your reference, preview only; not used to calculate geometry"
                  />
                  <Button secondary onClick={() => setImage(null)}>
                    Remove image <X size={14} />
                  </Button>
                  <small>Reference only. Image geometry is not analyzed.</small>
                </div>
              )}
            </>
          )}
          {step === 2 && (
            <>
              <h2>Make space for what matters.</h2>
              <p className="muted">
                Requested areas are approximate. The engine distributes the available envelope
                proportionally, with circulation reserved.
              </p>
              <div className="room-list">
                {b.spaces.map((s, i) => (
                  <div className="room-editor" key={s.id}>
                    <div className="room-editor-top">
                      <span className="room-index">{String(i + 1).padStart(2, '0')}</span>
                      <Field label="Space name" error={fieldError(`spaces.${i}.name`)}>
                        <input
                          value={s.name}
                          onChange={(e) => spacePatch(s.id, { name: e.target.value })}
                        />
                      </Field>
                      <button
                        className="icon-button"
                        aria-label={`Remove ${s.name}`}
                        onClick={() => patch({ spaces: b.spaces.filter((r) => r.id !== s.id) })}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                    <div className="room-fields">
                      <Field label={`Area (${b.unit}²)`} error={fieldError(`spaces.${i}.area`)}>
                        <input
                          type="number"
                          min="2"
                          value={s.area || ''}
                          onChange={(e) => spacePatch(s.id, { area: Number(e.target.value) })}
                        />
                      </Field>
                      <Field label="Use">
                        <select
                          value={s.category}
                          onChange={(e) =>
                            spacePatch(s.id, {
                              category: e.target.value as SpaceRequirement['category'],
                            })
                          }
                        >
                          {[
                            'living',
                            'kitchen',
                            'bedroom',
                            'work',
                            'storage',
                            'loading',
                            'washroom',
                            'retail',
                            'custom',
                          ].map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Priority">
                        <select
                          value={s.priority}
                          onChange={(e) =>
                            spacePatch(s.id, {
                              priority: e.target.value as SpaceRequirement['priority'],
                            })
                          }
                        >
                          <option value="essential">Essential</option>
                          <option value="preferred">Preferred</option>
                        </select>
                      </Field>
                      <Field label="Floor">
                        <select
                          value={s.floor}
                          onChange={(e) => spacePatch(s.id, { floor: Number(e.target.value) })}
                        >
                          {Array.from({ length: b.floors }, (_, f) => (
                            <option key={f} value={f}>
                              Floor {f + 1}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <Field label="Space requirements (optional)">
                      <input
                        value={s.notes}
                        maxLength={500}
                        placeholder="e.g. Keep a clear access route"
                        onChange={(e) => spacePatch(s.id, { notes: e.target.value })}
                      />
                    </Field>
                  </div>
                ))}
              </div>
              <p className="field-error">{fieldError('spaces')}</p>
              <Button
                secondary
                onClick={() =>
                  patch({
                    spaces: [
                      ...b.spaces,
                      {
                        id: crypto.randomUUID(),
                        name: 'New space',
                        category: 'custom',
                        area: 12,
                        priority: 'preferred',
                        floor: 0,
                        notes: '',
                      },
                    ],
                  })
                }
              >
                <Plus size={16} /> Add a space
              </Button>
              <Field
                label="Special constraints (optional)"
                hint="Recorded for professional review; free-text requirements are not automatically enforced."
              >
                <textarea
                  value={b.constraints}
                  maxLength={2000}
                  rows={3}
                  placeholder="Accessibility, ventilation, existing columns, future expansion…"
                  onChange={(e) => patch({ constraints: e.target.value })}
                />
              </Field>
            </>
          )}
          {step === 3 && (
            <>
              <h2>A direction that feels like you.</h2>
              <InteriorControls
                room={b.roomType}
                style={b.style}
                onRoom={(roomType) => patch({ roomType })}
                onStyle={(style) => patch({ style })}
              />
              <div className="divider" />
              <div className="subheading">
                <Compass size={21} />
                <h3>
                  Vastu preferences <span className="optional">OPTIONAL</span>
                </h3>
              </div>
              <p className="muted">
                These configurable discussion preferences are not certification or a guarantee of
                compliance.
              </p>
              <Field label="How should we consider your preferences?">
                <select
                  value={b.vastu}
                  onChange={(e) => patch({ vastu: e.target.value as ProjectBrief['vastu'] })}
                >
                  <option value="none">No preference</option>
                  <option value="consider">Consider my selected preferences</option>
                  <option value="prioritize">Prioritize my selected preferences</option>
                </select>
              </Field>
              {b.vastu !== 'none' && (
                <div className="rule-list">
                  {vastuRules.map((r) => (
                    <label className="consent" key={r.id}>
                      <input
                        type="checkbox"
                        checked={b.ruleIds.includes(r.id)}
                        onChange={(e) =>
                          patch({
                            ruleIds: e.target.checked
                              ? [...b.ruleIds, r.id]
                              : b.ruleIds.filter((id) => id !== r.id),
                          })
                        }
                      />
                      <span>
                        <strong>{r.label}</strong>
                        <small>{r.description}</small>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}
          {step === 4 && (
            <>
              <h2>Ready for a first look?</h2>
              <p className="muted">
                This is a starting point for a conversation with your designer.
              </p>
              <div className="review-grid">
                <div>
                  <span>PROJECT</span>
                  <strong>{b.name}</strong>
                  <small>{types.find((t) => t.id === b.type)?.label}</small>
                </div>
                <div>
                  <span>LOCATION</span>
                  <strong>{b.locality}</strong>
                  <small>{b.city}</small>
                </div>
                <div>
                  <span>ENVELOPE</span>
                  <strong>
                    {b.width} × {b.depth} {b.unit}
                  </strong>
                  <small>
                    {b.floors} floor(s) · {b.shape}
                  </small>
                </div>
                <div>
                  <span>YOUR BRIEF</span>
                  <strong>{b.spaces.length} spaces</strong>
                  <small>
                    {b.vastu === 'none'
                      ? 'No Vastu preference'
                      : `${b.ruleIds.length} preference(s) selected`}
                  </small>
                </div>
              </div>
              <ul className="review-rooms">
                {b.spaces.map((s) => (
                  <li key={s.id}>
                    <span>
                      {s.name} <small>· Floor {s.floor + 1}</small>
                    </span>
                    <strong>
                      {s.area} {b.unit}²
                    </strong>
                  </li>
                ))}
              </ul>
              <div className="info-box">
                <ShieldCheck size={21} />
                <p>
                  {disclaimer} Layouts do not verify structural design, local codes, setbacks,
                  accessibility, fire safety or services. Requested areas may be resized to fit.
                </p>
              </div>
              <p className="storage-explainer">
                {mode === 'local'
                  ? 'Your project will be saved only in this browser. No account or API key is needed.'
                  : 'Your project will be saved to your signed-in Supabase account. Local projects are not transferred automatically.'}
              </p>
            </>
          )}
          {Object.keys(errors).length > 0 && (
            <div className="error-box">
              Please correct the highlighted fields.
              {step === 4 && (
                <ul>
                  {Object.entries(errors).map(([k, v]) => (
                    <li key={k}>
                      {k}: {v}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="wizard-bottom">
            <Button
              secondary
              disabled={step === 0 || busy}
              onClick={() => {
                setErrors({});
                setStep(step - 1);
              }}
            >
              <ArrowLeft size={16} /> Back
            </Button>
            <Button disabled={busy} onClick={next}>
              {busy ? (
                <LoaderCircle size={17} className="spin" />
              ) : step === 4 ? (
                'Create my concept'
              ) : (
                'Continue'
              )}
              {!busy && <ArrowRight size={16} />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
