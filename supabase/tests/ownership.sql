-- TAP-compatible SQL: run with `supabase test db` against a disposable local stack.
-- Transaction rollback leaves no fixtures or helper functions behind.
begin;
select '1..24' as tap;
create function public.test_assert(condition boolean,label text) returns text language plpgsql as $$
declare n integer:=coalesce(nullif(current_setting('tests.counter',true),''),'0')::integer+1;
begin
 perform set_config('tests.counter',n::text,true);
 if condition is not true then raise exception 'not ok % - %',n,label;end if;
 return format('ok %s - %s',n,label);
end;$$;
create function public.test_denied(query text,label text) returns text language plpgsql as $$
begin
 begin execute query;exception when insufficient_privilege or check_violation or invalid_parameter_value then return public.test_assert(true,label);end;
 return public.test_assert(false,label);
end;$$;
insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000001','a@example.test'),('00000000-0000-4000-8000-000000000002','b@example.test');
do $setup$begin perform set_config('tests.payload', $json${"id":"10000000-0000-4000-8000-000000000001","name":"Private concept","versions":[{"id":"20000000-0000-4000-8000-000000000001","createdAt":"2026-11-22T00:00:00Z","brief":{"name":"Private concept","type":"custom","city":"Pune","locality":"Wagholi","width":10,"depth":10,"unit":"m","shape":"rectangle","north":"north","roads":["south"],"floors":1,"budget":0,"constraints":"","spaces":[{"id":"main","name":"Main room","category":"custom","area":80,"priority":"essential","floor":0,"notes":""}],"vastu":"none","ruleIds":[],"roomType":"living","style":"warm","envelopeConfirmed":false},"layout":{"engineVersion":1,"width":10,"depth":10,"floors":1,"rooms":[{"id":"main","name":"Main room","category":"custom","floor":0,"x":0,"y":0,"width":10,"depth":10,"requestedArea":80,"allocatedArea":100,"kind":"room"}],"assumptions":[],"notes":[]}}]}$json$,true);end;$setup$;
set local role authenticated;
do $setup$begin perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);end;$setup$;
do $$begin perform public.save_project(current_setting('tests.payload')::jsonb);perform public.submit_lead('{"id":"30000000-0000-4000-8000-000000000001","projectId":"10000000-0000-4000-8000-000000000001","name":"Customer A","email":"a@example.test","message":"","consent":true}'::jsonb);end;$$;
insert into public.uploaded_files(id,project_id,owner_id,path,name,mime_type,size_bytes) values('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001/10000000-0000-4000-8000-000000000001/plan.png','plan.png','image/png',100);
insert into storage.objects(bucket_id,name) values('project-files','00000000-0000-4000-8000-000000000001/10000000-0000-4000-8000-000000000001/plan.png');
select public.test_assert((select count(*)=1 from public.projects),'owner sees project');
select public.test_assert((select count(*)=1 from public.project_versions),'owner sees version');
select public.test_assert((select count(*)=1 from public.leads),'owner sees consultation');
select public.test_assert((select count(*)=1 from public.uploaded_files),'owner sees file reference');
select public.test_assert((select count(*)=1 from storage.objects where bucket_id='project-files'),'owner sees storage object');
select public.test_denied($q$update public.project_versions set brief='{}'$q$,'versions cannot be edited directly');
select public.test_denied($q$update public.projects set owner_id='00000000-0000-4000-8000-000000000002'$q$,'owner cannot reassign project');
select public.test_denied($q$select public.submit_lead('{"id":"30000000-0000-4000-8000-000000000003","projectId":"10000000-0000-4000-8000-000000000001","name":"A test","email":"a@example.test","consent":false}')$q$,'lead requires explicit consent');
select public.test_denied($q$select public.save_project(jsonb_set(current_setting('tests.payload')::jsonb,'{versions,0,brief,width}','-1'))$q$,'database rejects invalid brief');
select public.test_denied($q$select public.save_project(jsonb_set(current_setting('tests.payload')::jsonb,'{versions,0,brief,city}','null'))$q$,'database rejects null text');
select public.test_assert((select count(*)=1 from public.project_versions),'failed save does not add a version');
select public.test_denied($q$select public.save_project(jsonb_set(current_setting('tests.payload')::jsonb,'{versions,0,brief,city}','"Delhi"'))$q$,'existing version contents are immutable');
do $setup$begin perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);end;$setup$;
select public.test_assert((select count(*)=0 from public.projects),'other customer cannot read project');
select public.test_assert((select count(*)=0 from public.project_versions),'other customer cannot read versions');
select public.test_assert((select count(*)=0 from public.leads),'other customer cannot read leads');
select public.test_assert((select count(*)=0 from public.uploaded_files),'other customer cannot read file references');
select public.test_assert((select count(*)=0 from storage.objects where bucket_id='project-files'),'other customer cannot read storage object');
select public.test_denied($q$select public.save_project(current_setting('tests.payload')::jsonb)$q$,'other customer cannot overwrite project');
select public.test_denied($q$select public.submit_lead('{"id":"30000000-0000-4000-8000-000000000002","projectId":"10000000-0000-4000-8000-000000000001","name":"Customer B","email":"b@example.test","consent":true}')$q$,'other customer cannot attach lead');
select public.test_denied($q$insert into storage.objects(bucket_id,name) values('project-files','00000000-0000-4000-8000-000000000002/10000000-0000-4000-8000-000000000001/evil.png')$q$,'other customer cannot upload into project');
select public.test_denied($q$insert into public.uploaded_files(id,project_id,owner_id,path,name,mime_type,size_bytes) values(gen_random_uuid(),'10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002/10000000-0000-4000-8000-000000000001/evil.png','evil.png','image/png',100)$q$,'other customer cannot attach file reference');
delete from public.projects where id='10000000-0000-4000-8000-000000000001';
do $setup$begin perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);end;$setup$;
select public.test_assert((select count(*)=1 from public.projects),'other customer deletion affected no rows');
set local role anon;
select public.test_denied($q$select * from public.projects$q$,'anonymous cannot read private projects');
select public.test_assert((select count(*)=2 from public.service_areas),'anonymous sees published sample service areas');
rollback;
