import { LogIn, LogOut } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { supabase } from '../storage';

import { Button, ErrorBox, Field, PageTitle } from '../components/ui';
export default function Account({ email: currentEmail }: { email: string }) {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [signup, setSignup] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError('');
    setNotice('');
    const { error } = signup
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError(error.message);
    else
      setNotice(
        signup
          ? 'Check your inbox if email confirmation is enabled. Local projects are not automatically transferred.'
          : 'Signed in. Select Supabase cloud in the top storage selector to use your cloud workspace.',
      );
  }
  return (
    <div className="container section narrow">
      <PageTitle eyebrow="OPTIONAL CLOUD WORKSPACE" title="Keep your ideas close." />
      {!supabase ? (
        <div className="info-box">
          <p>Cloud authentication is not configured. The local demo works without credentials.</p>
        </div>
      ) : (
        <div className="panel">
          <ErrorBox message={error} />
          {notice && <p className="success-box">{notice}</p>}
          {currentEmail ? (
            <>
              <p>Signed in as {currentEmail}</p>
              <Button
                secondary
                onClick={async () => {
                  const { error } = await supabase!.auth.signOut();
                  if (error) setError(error.message);
                }}
              >
                <LogOut size={16} /> Sign out
              </Button>
            </>
          ) : (
            <form onSubmit={submit}>
              <h2>{signup ? 'Create an account' : 'Welcome back'}</h2>
              <Field label="Email">
                <input
                  type="email"
                  required
                  value={email}
                  autoComplete="email"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  minLength={8}
                  required
                  autoComplete={signup ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Button type="submit" disabled={busy} className="full">
                <LogIn size={16} />
                {busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}
              </Button>
              <button
                type="button"
                className="text-link account-toggle"
                onClick={() => setSignup(!signup)}
              >
                {signup ? 'Already registered? Sign in' : 'New here? Create an account'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
