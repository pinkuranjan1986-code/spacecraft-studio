import { ArrowRight, ArrowUpRight, LayoutGrid, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { disclaimer, serviceAreas, whatsappUrl } from './config';
import type { StorageMode } from './storage';
import { cloudConfigError, supabase } from './storage';

import { ErrorBox, PageTitle } from './components/ui';
import Account from './pages/Account';
import Contact from './pages/Contact';
import Design from './pages/Design';
import Interiors from './pages/Interiors';
import Landing from './pages/Landing';
import Projects from './pages/Projects';
import ServicePage from './pages/ServicePage';
import Wizard from './pages/Wizard';
function App() {
  const [mode, setMode] = useState<StorageMode>('local'),
    [email, setEmail] = useState(''),
    [menu, setMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email || ''));
    const { data } = supabase.auth.onAuthStateChange((_e, session) =>
      setEmail(session?.user.email || ''),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
    const area = serviceAreas.find(
      (a) => location.pathname === `/services/${a.citySlug}/${a.slug}`,
    );
    document.title = area
      ? `${area.title} | Spacecraft Studio`
      : 'Spacecraft Studio | Thoughtful space concepts';
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description)
      description.content =
        area?.description ||
        'Explore editable draft building layouts, interior ideas and optional Vastu preference notes. Professional review required.';
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.append(canonical);
    }
    canonical.href = window.location.origin + location.pathname;
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.append(robots);
    }
    robots.content = ['/new', '/projects', '/design', '/account', '/contact'].some((p) =>
      location.pathname.startsWith(p),
    )
      ? 'noindex,nofollow'
      : 'index,follow';
  }, [location.pathname]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="nav-wrap">
          <Link className="brand" to="/" aria-label="Spacecraft Studio home">
            <span className="brand-mark">
              <LayoutGrid size={23} />
            </span>
            <span>
              spacecraft<span className="brand-sub">STUDIO</span>
            </span>
          </Link>
          <nav className={menu ? 'nav open' : 'nav'} aria-label="Main navigation">
            <NavLink to="/" end>
              Overview
            </NavLink>
            <NavLink to="/new">Create a concept</NavLink>
            <NavLink to="/interiors">Interiors</NavLink>
            <NavLink to="/projects">My projects</NavLink>
          </nav>
          <div className="nav-actions">
            <Link className="nav-start" to="/new">
              Start a project <ArrowUpRight size={16} />
            </Link>
            <button
              className="menu-toggle"
              aria-label={menu ? 'Close menu' : 'Open menu'}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <div className="storage-bar">
        <div>
          <span className="status-dot" />
          {mode === 'local'
            ? 'Local demo · projects stay in this browser'
            : `Cloud workspace · ${email || 'sign-in required'}`}
        </div>
        <div className="storage-actions">
          {supabase && (
            <>
              <label className="sr-only" htmlFor="mode">
                Storage mode
              </label>
              <select
                id="mode"
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value as StorageMode);
                  if (location.pathname.startsWith('/design/') || location.pathname === '/contact')
                    navigate('/projects');
                }}
              >
                <option value="local">Browser demo</option>
                <option value="cloud">Supabase cloud</option>
              </select>
              <Link to="/account">{email ? 'Account' : 'Sign in'}</Link>
            </>
          )}
          <span className="demo-badge">CONCEPT DESIGN</span>
        </div>
      </div>
      <main id="main">
        {cloudConfigError && (
          <div className="container">
            <ErrorBox message={cloudConfigError} />
          </div>
        )}
        <Routes key={`${mode}:${email}`}>
          <Route path="/" element={<Landing />} />
          <Route path="/new" element={<Wizard mode={mode} />} />
          <Route path="/design/:id" element={<Design mode={mode} />} />
          <Route path="/projects" element={<Projects mode={mode} />} />
          <Route path="/interiors" element={<Interiors />} />
          <Route path="/contact" element={<Contact mode={mode} />} />
          <Route path="/account" element={<Account email={email} />} />
          <Route path="/services/:city/:locality" element={<ServicePage />} />
          <Route
            path="*"
            element={
              <div className="container section">
                <PageTitle eyebrow="404" title="This space is still a blank canvas." />
                <Link className="btn" to="/">
                  Return home <ArrowRight size={16} />
                </Link>
              </div>
            }
          />
        </Routes>
      </main>
      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <div>
              <Link to="/" className="footer-brand">
                spacecraft <span>STUDIO</span>
              </Link>
              <p>Thoughtful beginnings. Better spaces.</p>
            </div>
            <div className="footer-links">
              <Link to="/projects">My projects</Link>
              <Link to="/contact">Request a consultation</Link>
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              )}
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Spacecraft Studio · Prototype</span>
            <span>{disclaimer}</span>
          </div>
        </div>
      </footer>
    </>
  );
}

export default App;
