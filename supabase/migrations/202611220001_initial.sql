-- All customer records are private. Administrative content is managed by migrations.
create extension if not exists pgcrypto;
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
create table public.projects (id uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade, name text not null check(length(trim(name)) between 2 and 100), updated_at timestamptz not null default now());
create table public.project_versions (id uuid primary key,project_id uuid not null references public.projects(id) on delete cascade,owner_id uuid not null references auth.users(id) on delete cascade,created_at timestamptz not null,brief jsonb not null,layout jsonb not null,check(pg_column_size(brief)<100000),check(pg_column_size(layout)<200000));
create index on public.projects(owner_id);
create index on public.project_versions(project_id,created_at);
create table public.uploaded_files (id uuid primary key,project_id uuid not null references public.projects(id) on delete cascade,owner_id uuid not null references auth.users(id) on delete cascade,path text not null unique,name text not null check(length(name) between 1 and 255),mime_type text not null check(mime_type in ('image/jpeg','image/png')),size_bytes bigint not null check(size_bytes between 1 and 5242880),created_at timestamptz not null default now(),check(path like owner_id::text || '/' || project_id::text || '/%'));
create table public.leads (id uuid primary key,owner_id uuid not null references auth.users(id) on delete cascade,project_id uuid not null references public.projects(id) on delete cascade,name text not null check(length(trim(name)) between 2 and 100),email text not null check(length(email)<=254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),message text not null default '' check(length(message)<=2000),consent boolean not null check(consent),created_at timestamptz not null default now());
create index on public.leads(owner_id);
create table public.service_areas (id uuid primary key default gen_random_uuid(),city text not null check(length(city) between 2 and 100),locality text not null check(length(locality) between 2 and 100),city_slug text not null check(city_slug ~ '^[a-z0-9-]+$'),slug text not null check(slug ~ '^[a-z0-9-]+$'),title text not null check(length(title) between 2 and 160),description text not null check(length(description) between 10 and 500),illustrative boolean not null default true,published boolean not null default false,unique(city_slug,slug));
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_versions enable row level security;
alter table public.uploaded_files enable row level security;
alter table public.leads enable row level security;
alter table public.service_areas enable row level security;
revoke all on public.profiles,public.projects,public.project_versions,public.uploaded_files,public.leads,public.service_areas from anon,authenticated;
grant select on public.profiles,public.projects,public.project_versions,public.uploaded_files,public.leads to authenticated;
grant delete on public.projects,public.uploaded_files to authenticated;
grant insert on public.uploaded_files to authenticated;
grant select on public.service_areas to anon,authenticated;
create policy own_profile on public.profiles for select to authenticated using (id=(select auth.uid()));
create policy own_projects on public.projects for select to authenticated using (owner_id=(select auth.uid()));
create policy delete_own_project on public.projects for delete to authenticated using (owner_id=(select auth.uid()));
create policy own_versions on public.project_versions for select to authenticated using (owner_id=(select auth.uid()) and exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())));
create policy own_file_refs on public.uploaded_files for select to authenticated using (owner_id=(select auth.uid()) and exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())));
create policy add_file_refs on public.uploaded_files for insert to authenticated with check (owner_id=(select auth.uid()) and exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())) and path like auth.uid()::text || '/' || project_id::text || '/%');
create policy delete_file_refs on public.uploaded_files for delete to authenticated using(owner_id=(select auth.uid()) and exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())));
create policy own_leads on public.leads for select to authenticated using(owner_id=(select auth.uid()) and exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())));
create policy published_service_areas on public.service_areas for select to anon,authenticated using(published);

create function public.on_new_user() returns trigger language plpgsql security definer set search_path='' as $$ begin insert into public.profiles(id) values(new.id);return new;end;$$;
revoke all on function public.on_new_user() from public;
create trigger create_profile after insert on auth.users for each row execute function public.on_new_user();

-- Validation is shared by table constraints and the atomic save boundary. Unknown
-- keys are not interpreted. Payload sizes, allowed values and geometry are bounded.
create function public.valid_brief(b jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare s jsonb;f integer;
begin
 if jsonb_typeof(b)<>'object' or not (b ?& array['name','type','city','locality','width','depth','unit','shape','north','roads','floors','budget','constraints','spaces','vastu','ruleIds','roomType','style','envelopeConfirmed']) then return false;end if;
 if exists(select 1 from unnest(array['name','type','city','locality','unit','shape','north','constraints','vastu','roomType','style']) k where jsonb_typeof(b->k) is distinct from 'string') then return false;end if;
 if not (length(trim(b->>'name')) between 2 and 100 and length(trim(b->>'city')) between 2 and 100 and length(trim(b->>'locality')) between 2 and 100 and b->>'type'=any(array['home','office','warehouse','commercial','custom','interior']) and b->>'unit'=any(array['m','ft']) and b->>'shape'=any(array['rectangle','irregular']) and b->>'north'=any(array['north','east','south','west']) and b->>'vastu'=any(array['none','consider','prioritize']) and b->>'roomType'=any(array['living','bedroom','office','retail']) and b->>'style'=any(array['warm','minimal','earthy'])) then return false;end if;
 if jsonb_typeof(b->'width')<>'number' or jsonb_typeof(b->'depth')<>'number' or jsonb_typeof(b->'floors')<>'number' or jsonb_typeof(b->'budget')<>'number' or jsonb_typeof(b->'envelopeConfirmed')<>'boolean' then return false;end if;
 f:=(b->>'floors')::integer;
 if f<1 or f>5 or (b->>'floors')::numeric<>f or (b->>'width')::numeric<=0 or (b->>'width')::numeric>500 or (b->>'depth')::numeric<=0 or (b->>'depth')::numeric>500 or (b->>'budget')::numeric<0 or (b->>'budget')::numeric>10000000000 or length(b->>'constraints')>2000 then return false;end if;
 if b->>'type'='interior' and f<>1 then return false;end if;
 if b->>'shape'='irregular' and not (b->>'envelopeConfirmed')::boolean then return false;end if;
 if jsonb_typeof(b->'roads')<>'array' or jsonb_array_length(b->'roads') not between 1 and 4 or exists(select 1 from jsonb_array_elements_text(b->'roads') r where r<>all(array['north','east','south','west'])) then return false;end if;
 if jsonb_typeof(b->'ruleIds')<>'array' or jsonb_array_length(b->'ruleIds')>20 or exists(select 1 from jsonb_array_elements_text(b->'ruleIds') r where length(r)>80) then return false;end if;
 if jsonb_typeof(b->'spaces')<>'array' or jsonb_array_length(b->'spaces') not between 1 and 30 then return false;end if;
 if (select count(distinct item->>'id') from jsonb_array_elements(b->'spaces') item)<>jsonb_array_length(b->'spaces') then return false;end if;
 for s in select value from jsonb_array_elements(b->'spaces') loop
 if not(s ?& array['id','name','category','area','priority','floor','notes']) then return false;end if;
 if exists(select 1 from unnest(array['id','name','category','priority','notes']) k where jsonb_typeof(s->k) is distinct from 'string') then return false;end if;
 if length(s->>'id') not between 1 and 80 or length(trim(s->>'name')) not between 1 and 80 or length(s->>'notes')>500 or s->>'category'<>all(array['living','kitchen','bedroom','work','storage','loading','washroom','retail','custom']) or s->>'priority'<>all(array['essential','preferred']) or jsonb_typeof(s->'area')<>'number' or (s->>'area')::numeric not between 2 and 100000 or jsonb_typeof(s->'floor')<>'number' or (s->>'floor')::numeric<>(s->>'floor')::integer or (s->>'floor')::integer<0 or (s->>'floor')::integer>=f then return false;end if;
 end loop;
 return true;
 exception when others then return false;
end;$$;
create function public.valid_layout(l jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare r jsonb;
begin
 if jsonb_typeof(l) is distinct from 'object' or exists(select 1 from unnest(array['engineVersion','width','depth','floors']) k where jsonb_typeof(l->k) is distinct from 'number') then return false;end if;
 if not(l ?& array['engineVersion','width','depth','floors','rooms','assumptions','notes']) or (l->>'engineVersion')::integer<>1 or (l->>'width')::numeric<=0 or (l->>'depth')::numeric<=0 or (l->>'floors')::integer not between 1 and 5 or jsonb_typeof(l->'rooms')<>'array' or jsonb_array_length(l->'rooms') not between 1 and 40 or jsonb_typeof(l->'assumptions')<>'array' or jsonb_typeof(l->'notes')<>'array' then return false;end if;
 if (l->>'width')::numeric>500 or (l->>'depth')::numeric>500 or (l->>'floors')::numeric<>(l->>'floors')::integer or jsonb_array_length(l->'assumptions')>100 or jsonb_array_length(l->'notes')>20 then return false;end if;
 for r in select value from jsonb_array_elements(l->'rooms') loop
 if exists(select 1 from unnest(array['id','name','category','kind']) k where jsonb_typeof(r->k) is distinct from 'string') or exists(select 1 from unnest(array['floor','x','y','width','depth','requestedArea','allocatedArea']) k where jsonb_typeof(r->k) is distinct from 'number') or (r->>'floor')::numeric<>(r->>'floor')::integer then return false;end if;
 if abs((r->>'allocatedArea')::numeric-(r->>'width')::numeric*(r->>'depth')::numeric)>0.00001 then return false;end if;
 if not(r ?& array['id','name','category','floor','x','y','width','depth','requestedArea','allocatedArea','kind']) or length(r->>'name') not between 1 and 100 or r->>'kind'<>all(array['room','circulation','stairs']) or (r->>'floor')::integer<0 or (r->>'floor')::integer>=(l->>'floors')::integer or (r->>'x')::numeric<0 or (r->>'y')::numeric<0 or (r->>'width')::numeric<=0 or (r->>'depth')::numeric<=0 or (r->>'allocatedArea')::numeric<=0 or (r->>'requestedArea')::numeric<0 or (r->>'x')::numeric+(r->>'width')::numeric>(l->>'width')::numeric+0.000001 or (r->>'y')::numeric+(r->>'depth')::numeric>(l->>'depth')::numeric+0.000001 then return false;end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(l->'rooms') with ordinality a(v,i), jsonb_array_elements(l->'rooms') with ordinality b(v,i) where a.i<b.i and a.v->>'floor'=b.v->>'floor' and least((a.v->>'x')::numeric+(a.v->>'width')::numeric,(b.v->>'x')::numeric+(b.v->>'width')::numeric)-greatest((a.v->>'x')::numeric,(b.v->>'x')::numeric)>0.000001 and least((a.v->>'y')::numeric+(a.v->>'depth')::numeric,(b.v->>'y')::numeric+(b.v->>'depth')::numeric)-greatest((a.v->>'y')::numeric,(b.v->>'y')::numeric)>0.000001) then return false;end if;
 return true;
 exception when others then return false;
end;$$;
alter table public.project_versions add constraint brief_valid check(public.valid_brief(brief) is true),add constraint layout_valid check(public.valid_layout(layout) is true);

create function public.save_project(payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();pid uuid;v jsonb;existing_owner uuid;vid uuid;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501';end if;
 if pg_column_size(payload)>2000000 or jsonb_typeof(payload->'versions')<>'array' or jsonb_array_length(payload->'versions') not between 1 and 100 or length(trim(payload->>'name')) not between 2 and 100 then raise exception 'Invalid project payload' using errcode='22023';end if;
 pid:=(payload->>'id')::uuid;
 -- A transaction lock serializes competing saves for a project, including first save.
 perform pg_advisory_xact_lock(hashtextextended(pid::text,0));
 select owner_id into existing_owner from public.projects where id=pid;
 if payload->>'name' is null then raise exception 'Project name required' using errcode='22023';end if;
 if existing_owner is not null and existing_owner<>uid then raise exception 'Project access denied' using errcode='42501';end if;
 insert into public.projects(id,owner_id,name) values(pid,uid,payload->>'name') on conflict(id) do update set name=excluded.name,updated_at=now();
 for v in select value from jsonb_array_elements(payload->'versions') loop
 if jsonb_typeof(v->'createdAt') is distinct from 'string' then raise exception 'Version timestamp required' using errcode='22023';end if;
 if public.valid_brief(v->'brief') is not true or public.valid_layout(v->'layout') is not true then raise exception 'Invalid brief or layout' using errcode='22023';end if;
 if abs((v->'layout'->>'width')::numeric-(v->'brief'->>'width')::numeric*case when v->'brief'->>'unit'='ft' then 0.3048 else 1 end)>0.00001 or abs((v->'layout'->>'depth')::numeric-(v->'brief'->>'depth')::numeric*case when v->'brief'->>'unit'='ft' then 0.3048 else 1 end)>0.00001 or v->'layout'->>'floors'<>v->'brief'->>'floors' then raise exception 'Layout envelope does not match brief' using errcode='22023';end if;
 vid:=(v->>'id')::uuid;
 if exists(select 1 from public.project_versions where id=vid and (project_id<>pid or owner_id<>uid or brief<>(v->'brief') or layout<>(v->'layout'))) then raise exception 'Versions are immutable' using errcode='42501';end if;
 insert into public.project_versions(id,project_id,owner_id,created_at,brief,layout) values(vid,pid,uid,(v->>'createdAt')::timestamptz,v->'brief',v->'layout') on conflict(id) do nothing;
 end loop;
 if (select count(*) from public.project_versions where project_id=pid)>100 then raise exception 'Export and start a new project after 100 versions' using errcode='22023';end if;
 return pid;
end;$$;
create function public.submit_lead(payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();pid uuid:=(payload->>'projectId')::uuid;lid uuid:=(payload->>'id')::uuid;
begin
 if uid is null or not exists(select 1 from public.projects where id=pid and owner_id=uid) then raise exception 'Project access denied' using errcode='42501';end if;
 if payload->'consent' is distinct from 'true'::jsonb or pg_column_size(payload)>10000 then raise exception 'Explicit consent required' using errcode='22023';end if;
 insert into public.leads(id,owner_id,project_id,name,email,message,consent) values(lid,uid,pid,payload->>'name',payload->>'email',coalesce(payload->>'message',''),true);return lid;
end;$$;
revoke all on function public.save_project(jsonb),public.submit_lead(jsonb) from public,anon;
grant execute on function public.save_project(jsonb),public.submit_lead(jsonb) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('project-files','project-files',false,5242880,array['image/jpeg','image/png']);
-- Comparing text avoids unsafe UUID casts on arbitrary object names.
create policy read_private_plans on storage.objects for select to authenticated using(bucket_id='project-files' and (storage.foldername(storage.objects.name))[1]=auth.uid()::text and exists(select 1 from public.projects p where p.id::text=(storage.foldername(storage.objects.name))[2] and p.owner_id=auth.uid()));
create policy upload_private_plans on storage.objects for insert to authenticated with check(bucket_id='project-files' and (storage.foldername(storage.objects.name))[1]=auth.uid()::text and exists(select 1 from public.projects p where p.id::text=(storage.foldername(storage.objects.name))[2] and p.owner_id=auth.uid()));
create policy delete_private_plans on storage.objects for delete to authenticated using(bucket_id='project-files' and (storage.foldername(storage.objects.name))[1]=auth.uid()::text and exists(select 1 from public.projects p where p.id::text=(storage.foldername(storage.objects.name))[2] and p.owner_id=auth.uid()));
-- No UPDATE policies: object replacement and customer role changes are prohibited.
insert into public.service_areas(city,locality,city_slug,slug,title,description,illustrative,published) values
('Bengaluru','Whitefield','bengaluru','whitefield','Home & workspace concepts in Whitefield','Explore compact home layouts and flexible workspaces for a Whitefield project. Share your site dimensions and bring an editable concept to a qualified local reviewer.',true,true),
('Hyderabad','Gachibowli','hyderabad','gachibowli','Thoughtful space planning in Gachibowli','Start a Gachibowli office, home or retail brief with functional zones, interior directions and optional Vastu preference notes for professional discussion.',true,true);
