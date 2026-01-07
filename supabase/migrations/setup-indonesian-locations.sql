-- Setup Indonesian Location Tables (Provinces, Regencies, Districts)
-- Based on EMSIFA data structure for enhanced shipping functionality

-- 1) Enable extensions (one-time)
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- 2) Base reference tables (IDs match EMSIFA)
create table if not exists provinces (
  id int primary key,
  name text not null
);

create table if not exists regencies (
  id int primary key,
  province_id int not null references provinces(id) on delete cascade,
  name text not null
);

create table if not exists districts (
  id int primary key,
  regency_id int not null references regencies(id) on delete cascade,
  name text not null
);

-- 3) Flattened view (district + city)
create or replace view regions_flat as
select
  d.id  as district_id,
  d.name as district_name,
  r.id  as city_id,
  r.name as city_name,
  p.id as province_id,
  p.name as province_name,
  (d.name || ', ' || r.name) as qtext
from districts d
join regencies r on r.id = d.regency_id
join provinces p on p.id = r.province_id;

-- 4) Materialized view with normalized text (faster search & indexable)
drop materialized view if exists regions_search_mv;
create materialized view regions_search_mv as
select
  district_id,
  district_name,
  city_id,
  city_name,
  province_id,
  province_name,
  qtext,
  -- normalize: lowercase + unaccent + collapse spaces + strip non-alnum (keeps ascii/space)
  regexp_replace(
    unaccent(lower(qtext)),
    '[^a-z0-9 ]', '','g'
  ) as qtext_norm
from regions_flat;

-- 5) Indexes for speed
create index if not exists idx_regions_qtext_trgm
  on regions_search_mv using gin (qtext gin_trgm_ops);

create index if not exists idx_regions_qtextnorm_trgm
  on regions_search_mv using gin (qtext_norm gin_trgm_ops);

-- 6) Helper function to normalize text like the MV
create or replace function normalize_qtext(txt text)
returns text language sql immutable as $$
  select regexp_replace(unaccent(lower(txt)), '[^a-z0-9 ]', '', 'g');
$$;

-- 7) Search RPC returning ranked results
create or replace function api_regions_search(q text, lim int default 10)
returns table (
  district_id int,
  district_name text,
  city_id int,
  city_name text,
  province_id int,
  province_name text,
  qtext text,
  score double precision
)
language plpgsql security definer as $$
declare
  qn text := normalize_qtext(q);
  tokens text[];
begin
  tokens := string_to_array(regexp_replace(qn, '\s+', ' ', 'g'), ' ');

  return query
  select
    m.district_id, m.district_name,
    m.city_id, m.city_name,
    m.province_id, m.province_name,
    m.qtext,
    greatest(similarity(m.qtext_norm, qn), 0)::double precision as score
  from regions_search_mv m
  where
    -- all tokens must appear (simple AND)
    (select bool_and(m.qtext_norm like '%' || t || '%') from unnest(tokens) as t)
  order by score desc, m.qtext asc
  limit coalesce(lim, 10);
end $$;

-- 8) Row Level Security (RLS)
alter table provinces enable row level security;
alter table regencies enable row level security;
alter table districts enable row level security;

create policy "public read provinces" on provinces for select to anon using (true);
create policy "public read regencies" on regencies for select to anon using (true);
create policy "public read districts" on districts for select to anon using (true);

-- Allow calling via PostgREST: expose under /rest/v1/rpc/api_regions_search
revoke all on function api_regions_search(text, int) from public;
grant execute on function api_regions_search(text, int) to anon, authenticated;

-- Refresh function for materialized view
create or replace function refresh_regions_search()
returns void language plpgsql as $$
begin
  refresh materialized view concurrently regions_search_mv;
end $$;

grant execute on function refresh_regions_search() to authenticated;

COMMIT;