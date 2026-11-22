import { ArrowRight, ArrowUpRight, MapPin } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PlanView } from '../PlanView';
import { makeBrief, sampleProjects, serviceAreas } from '../config';
import { layoutEngine } from '../engine';

import { Button, PageTitle } from '../components/ui';
import { draftKey } from '../drafts';
export default function ServicePage() {
  const { city, locality } = useParams();
  const area = serviceAreas.find((a) => a.citySlug === city && a.slug === locality);
  const navigate = useNavigate();
  if (!area)
    return (
      <div className="container section">
        <PageTitle eyebrow="SERVICE AREAS" title="This locality is not configured." />
        <Link to="/">Explore concepts</Link>
      </div>
    );
  return (
    <div className="container section service-page">
      <PageTitle
        eyebrow={`${area.locality.toUpperCase()} · ${area.city.toUpperCase()}`}
        title={area.title}
      >
        {area.description}
      </PageTitle>
      <div className="info-box">
        <MapPin />
        <p>
          This is an illustrative service-area page. Local designer availability is not confirmed.
          No business address or completed local project is represented.
        </p>
      </div>
      <div className="service-content">
        <div>
          <h2>A brief built around your locality.</h2>
          <p>
            Start with your plot dimensions, road direction and the spaces you need. Explore a
            building concept or interior palette, then ask a qualified professional familiar with{' '}
            {area.city} to check local development rules and site conditions.
          </p>
          <Button
            onClick={() => {
              localStorage.setItem(
                draftKey,
                JSON.stringify({ ...makeBrief(), city: area.city, locality: area.locality }),
              );
              navigate('/new');
            }}
          >
            Start a {area.locality} project <ArrowUpRight size={16} />
          </Button>
          <Link className="text-link" to="/contact">
            Request consultation information <ArrowRight size={15} />
          </Link>
        </div>
        <PlanView
          layout={layoutEngine.generate(sampleProjects[0])}
          brief={sampleProjects[0]}
          decorative
        />
      </div>
    </div>
  );
}
