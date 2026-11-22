import { ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ProjectBrief } from '../models';

import { InteriorBoard, InteriorControls } from '../components/Interior';
import { PageTitle } from '../components/ui';
export default function Interiors() {
  const [room, setRoom] = useState<ProjectBrief['roomType']>('living'),
    [style, setStyle] = useState<ProjectBrief['style']>('warm');
  return (
    <div className="container section">
      <PageTitle eyebrow="A FEELING, BEFORE A FINISH" title="Find your interior direction.">
        Explore a palette, material ideas and the pieces that bring it together.
      </PageTitle>
      <div className="interiors-layout">
        <aside className="panel">
          <InteriorControls room={room} style={style} onRoom={setRoom} onStyle={setStyle} />
          <Link className="btn full" to="/new">
            Use in a project <ArrowUpRight size={16} />
          </Link>
          <p className="fine-print">Choose this direction in step 4 of your project brief.</p>
        </aside>
        <InteriorBoard room={room} style={style} />
      </div>
    </div>
  );
}
