import { Check } from 'lucide-react';
import { interiorStyles } from '../config';
import type { ProjectBrief } from '../models';
import { Field } from './ui';
export function InteriorControls({
  room,
  style,
  onRoom,
  onStyle,
}: {
  room: ProjectBrief['roomType'];
  style: ProjectBrief['style'];
  onRoom: (r: ProjectBrief['roomType']) => void;
  onStyle: (s: ProjectBrief['style']) => void;
}) {
  return (
    <>
      <Field label="Room type">
        <select value={room} onChange={(e) => onRoom(e.target.value as ProjectBrief['roomType'])}>
          <option value="living">Living room</option>
          <option value="bedroom">Bedroom</option>
          <option value="office">Office</option>
          <option value="retail">Retail space</option>
        </select>
      </Field>
      <p className="field-label">Interior direction</p>
      <div className="style-options">
        {Object.entries(interiorStyles).map(([id, s]) => (
          <button
            key={id}
            className={style === id ? 'style-option selected' : 'style-option'}
            aria-pressed={style === id}
            onClick={() => onStyle(id as ProjectBrief['style'])}
          >
            <span className="mini-swatches">
              {s.palette.map((c) => (
                <span key={c.hex} style={{ background: c.hex }} />
              ))}
            </span>
            <strong>{s.name}</strong>
            {style === id && <Check size={15} />}
          </button>
        ))}
      </div>
    </>
  );
}
export function InteriorBoard({
  room,
  style,
}: {
  room: ProjectBrief['roomType'];
  style: ProjectBrief['style'];
}) {
  const s = interiorStyles[style];
  return (
    <div className="interior-board">
      <div className="interior-illustration" style={{ background: s.palette[0].hex }}>
        <svg
          viewBox="0 0 600 310"
          role="img"
          aria-label={`${s.name} mood illustration; not a measured furniture plan`}
        >
          <path d="M0 240H600V310H0Z" fill={s.palette[1].hex} />
          <path d="M75 30H215V176H75Z" fill="#faf9ef" />
          <path d="M145 30V176M75 100H215" stroke={s.palette[1].hex} strokeWidth="5" />
          <rect x="250" y="42" width="120" height="100" fill={s.palette[1].hex} />
          <path d="M264 125L300 64L358 125Z" fill={s.palette[2].hex} />
          <path
            d="M438 55V231M413 55H464L474 98H403Z"
            stroke={s.palette[3].hex}
            fill={s.palette[2].hex}
            strokeWidth="3"
          />
          <rect x="158" y="171" width="228" height="79" rx="15" fill={s.palette[2].hex} />
          <rect x="145" y="209" width="255" height="45" rx="8" fill={s.palette[3].hex} />
          <path d="M159 253V267M384 253V267" stroke={s.palette[3].hex} strokeWidth="7" />
          <rect x="203" y="178" width="62" height="43" rx="8" fill={s.palette[0].hex} />
          <ellipse cx="305" cy="278" rx="138" ry="21" fill={s.palette[0].hex} opacity=".65" />
          <ellipse cx="305" cy="261" rx="60" ry="17" fill={s.palette[1].hex} />
          <path d="M271 265L265 291M339 265L345 291" stroke={s.palette[3].hex} strokeWidth="4" />
          <path
            d="M83 224Q48 165 75 149Q96 167 83 224M83 224Q110 167 123 187Q127 208 83 224"
            fill={s.palette[2].hex}
          />
          <path d="M64 219H103L97 254H71Z" fill={s.palette[3].hex} />
        </svg>
        <span>MOOD ILLUSTRATION · NOT TO SCALE</span>
      </div>
      <div className="palette-row">
        {s.palette.map((c) => (
          <div key={c.hex}>
            <span style={{ background: c.hex }} />
            <strong>{c.name}</strong>
            <small>{c.hex}</small>
          </div>
        ))}
      </div>
      <div className="interior-details">
        <div>
          <h3>Surfaces & finishes</h3>
          <ul>
            {s.finishes.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Furniture direction</h3>
          <ul>
            {s.furniture[room].map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Lighting</h3>
          <p>{s.lighting}</p>
        </div>
      </div>
      <p className="fine-print">
        Illustrative mood guidance. Furniture clearances, accessibility, material suitability and
        electrical design need professional review.
      </p>
    </div>
  );
}
