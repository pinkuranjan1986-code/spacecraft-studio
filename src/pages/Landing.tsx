import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Layers,
  Leaf,
  MapPin,
  MoveUpRight,
  ShieldCheck,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PlanView } from '../PlanView';
import { makeBrief, sampleProjects, serviceAreas, types } from '../config';
import { layoutEngine } from '../engine';
import type { ProjectBrief } from '../models';

import { icons } from '../components/icons';
import { draftKey } from '../drafts';
export default function Landing() {
  const navigate = useNavigate(),
    preview = sampleProjects[0],
    layout = layoutEngine.generate(preview);
  function sample(b: ProjectBrief) {
    localStorage.setItem(draftKey, JSON.stringify(b));
    navigate('/new');
  }
  return (
    <>
      <section className="hero container">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="tiny-line" /> EVERY GREAT SPACE STARTS WITH A THOUGHT
          </span>
          <h1>
            Your space.
            <br />
            Your possibilities.
            <br />
            <em>A thoughtful start.</em>
          </h1>
          <p>
            Turn the space you imagine into a concept you can explore. Building layouts and interior
            ideas, shaped around your life and your business.
          </p>
          <div className="hero-buttons">
            <Link className="btn" to="/new">
              Start your project <ArrowUpRight size={18} />
            </Link>
            <a className="text-link" href="#inspiration">
              Explore concepts <ArrowRight size={16} />
            </a>
          </div>
          <div className="hero-notes">
            <span>
              <CheckCircle2 size={15} /> No sign-up to explore
            </span>
            <span>
              <CheckCircle2 size={15} /> Free local demo
            </span>
          </div>
          <div className="hero-trust">
            <ShieldCheck size={19} />
            <span>Concept first. Professional review before construction.</span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="visual-top">
            <span>
              <span className="status-dot" /> CONCEPT EXPLORER
            </span>
            <span>01 / RESIDENTIAL</span>
          </div>
          <div className="visual-title">
            <div>
              <span className="eyebrow">A PLACE TO CALL YOUR OWN</span>
              <h2>The everyday home</h2>
            </div>
            <span className="circle-arrow">
              <ArrowUpRight size={22} />
            </span>
          </div>
          <div className="hero-plan">
            <PlanView layout={layout} brief={preview} decorative />
          </div>
          <div className="visual-bottom">
            <span>
              <Layers size={15} /> 2 bedrooms · 1 floor
            </span>
            <span>
              12 × 10 m <MoveUpRight size={14} />
            </span>
          </div>
          <div className="floating-note">
            <span className="note-icon">
              <Leaf size={19} />
            </span>
            <div>
              <strong>Designed around you</strong>
              <small>Your needs. Your preferences.</small>
            </div>
          </div>
        </div>
      </section>
      <section className="type-strip">
        <div className="container">
          <span className="eyebrow">ROOM FOR EVERY POSSIBILITY</span>
          <div className="type-links">
            {types.map((t) => {
              const Icon = icons[t.icon];
              return (
                <button key={t.id} onClick={() => sample(makeBrief(t.id))}>
                  <Icon size={21} />
                  <span>{t.label}</span>
                  <ArrowUpRight size={14} />
                </button>
              );
            })}
          </div>
        </div>
      </section>
      <section className="container section" id="inspiration">
        <div className="section-heading">
          <div>
            <span className="eyebrow">A LITTLE INSPIRATION</span>
            <h2>
              Different spaces. <em>Same thoughtful approach.</em>
            </h2>
          </div>
          <p>
            Start with a concept. Make it your own.
            <br />
            Every example below is an editable draft.
          </p>
        </div>
        <div className="sample-grid">
          {sampleProjects.map((b, i) => (
            <button className={`sample-card sample-${i}`} key={b.type} onClick={() => sample(b)}>
              <div className="sample-art">
                <PlanView layout={layoutEngine.generate(b)} brief={b} decorative />
                <span className="sample-tag">
                  {types.find((t) => t.id === b.type)?.label} concept
                </span>
              </div>
              <div className="sample-caption">
                <div>
                  <span className="eyebrow">
                    {i === 0
                      ? 'FOR EVERYDAY LIVING'
                      : i === 1
                        ? 'FOR FOCUSED WORK'
                        : 'FOR WHAT’S NEXT'}
                  </span>
                  <h3>{b.name}</h3>
                  <p>
                    {b.width} × {b.depth} m · Editable starter
                  </p>
                </div>
                <span className="circle-arrow">
                  <ArrowUpRight size={21} />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className="process-section">
        <div className="container process-layout">
          <div>
            <span className="eyebrow">FROM AN IDEA TO A DIRECTION</span>
            <h2>
              Less guesswork.
              <br />
              <em>More possibility.</em>
            </h2>
            <p>You bring the vision. We help you give it shape.</p>
            <Link className="text-link" to="/new">
              Let’s begin <ArrowRight size={17} />
            </Link>
          </div>
          <div className="process-steps">
            {[
              [
                '01',
                'Tell us about your space',
                'Share dimensions, the rooms you need, and what matters to you.',
              ],
              [
                '02',
                'Explore your concept',
                'Get an editable 2D draft, interior ideas and optional preference notes.',
              ],
              [
                '03',
                'Take the next step',
                'Save your ideas and request a professional design consultation.',
              ],
            ].map(([n, title, desc]) => (
              <div key={n}>
                <span className="step-no">{n}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="container section areas">
        <div>
          <span className="eyebrow">LOCAL PERSPECTIVE</span>
          <h2>A beginning, wherever you build.</h2>
          <p>Illustrative service pages — availability is not yet confirmed.</p>
        </div>
        <div className="area-links">
          {serviceAreas.map((a) => (
            <Link key={a.slug} to={`/services/${a.citySlug}/${a.slug}`}>
              <MapPin size={17} />
              <span>
                {a.locality}
                <small>{a.city}</small>
              </span>
              <ArrowUpRight size={17} />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
