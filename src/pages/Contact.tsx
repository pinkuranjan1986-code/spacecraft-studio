import { ArrowRight, ArrowUpRight, CheckCircle2, LoaderCircle, ShieldCheck } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { whatsappUrl } from '../config';
import { leadSchema } from '../models';
import type { StorageMode } from '../storage';
import { repositoryFor } from '../storage';

import { Button, ErrorBox, Field, PageTitle } from '../components/ui';
export default function Contact({ mode }: { mode: StorageMode }) {
  const location = useLocation(),
    params = new URLSearchParams(location.search),
    projectId = params.get('project') || '',
    selectedMode =
      params.get('mode') === 'cloud' ? 'cloud' : params.get('mode') === 'local' ? 'local' : mode;
  const [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [message, setMessage] = useState(''),
    [consent, setConsent] = useState(false),
    [error, setError] = useState(''),
    [done, setDone] = useState(false),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const lead = leadSchema.parse({
        id: crypto.randomUUID(),
        projectId,
        name,
        email,
        message,
        consent,
        createdAt: new Date().toISOString(),
      });
      await repositoryFor(selectedMode).addLead(lead);
      setDone(true);
    } catch (e) {
      setError(
        e instanceof Error && 'issues' in e
          ? 'Enter a valid name, email, saved project ID and contact consent.'
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container section contact-layout">
      <div>
        <PageTitle eyebrow="THE NEXT STEP, TOGETHER" title="Let’s talk about your space.">
          Bring a concept and your questions. Request professional review before moving toward
          construction.
        </PageTitle>
        <div className="contact-note">
          <ShieldCheck size={24} />
          <h3>Your details, with your consent.</h3>
          <p>
            We only ask for a name, email and project reference. No payment details are collected.
          </p>
        </div>
        {whatsappUrl && (
          <a className="btn-secondary" href={whatsappUrl} target="_blank" rel="noreferrer">
            Contact on WhatsApp <ArrowUpRight size={16} />
          </a>
        )}
      </div>
      <div className="panel">
        {done ? (
          <div className="success-state" role="status">
            <CheckCircle2 size={40} />
            <h2>
              {selectedMode === 'local'
                ? 'Demo request saved locally.'
                : 'Consultation request recorded.'}
            </h2>
            <p>
              {selectedMode === 'local'
                ? 'No designer was notified. This request exists only in this browser.'
                : 'The request is stored in Supabase for an operator to review. Automatic email delivery is not configured.'}
            </p>
            <Link className="btn" to="/projects">
              Back to projects <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h2>Request a consultation</h2>
            <p className="muted">
              {selectedMode === 'local'
                ? 'Demo form — browser storage only.'
                : 'Cloud request — sign-in required.'}
            </p>
            <ErrorBox message={error} />
            <Field label="Project ID" hint="Open a saved project and use its consultation action.">
              <input
                aria-label="Project ID"
                value={projectId}
                readOnly
                placeholder="Select a saved project first"
              />
            </Field>
            {!projectId && (
              <Link className="text-link" to="/projects">
                Choose a project <ArrowRight size={15} />
              </Link>
            )}
            <Field label="Your name">
              <input
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Email address">
              <input
                required
                type="email"
                maxLength={254}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="What would you like to discuss? (optional)">
              <textarea
                rows={4}
                maxLength={2000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </Field>
            <label className="consent">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                I consent to my contact details and this project being used to respond to my
                consultation request.
              </span>
            </label>
            <Button type="submit" disabled={busy || !projectId} className="full">
              {busy ? <LoaderCircle className="spin" size={17} /> : <ArrowUpRight size={17} />}{' '}
              {selectedMode === 'local' ? 'Save demo request' : 'Submit consultation request'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
