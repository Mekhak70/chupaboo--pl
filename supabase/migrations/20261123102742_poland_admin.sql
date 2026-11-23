-- Chupaboo Poland administration schema for a dedicated Supabase project.

create table public.catalog_products (
  id uuid default gen_random_uuid() not null,
  created_at timestamptz default now() not null,
  section text not null,
  name text not null,
  price numeric not null,
  image_path text not null,
  cake_size text,
  has_cream boolean default false not null,
  design_types text[] default '{}'::text[] not null,
  standard_text text default ''::text not null,
  is_active boolean default true not null,
  sort_order bigint default (floor((EXTRACT(epoch FROM clock_timestamp()) * (1000)::numeric)))::bigint not null,
  is_featured boolean default false not null,
  product_kind text default 'CAKE'::text not null,
  additional_image_paths text[] default '{}'::text[] not null,
  donut_three_price numeric default 10000 not null,
  donut_variants jsonb default '[]'::jsonb not null,
  ingredient_prices jsonb,
  constraint catalog_ingredient_prices_valid CHECK (((ingredient_prices IS NULL) OR ((section = 'cake'::text) AND (product_kind = 'CAKE'::text) AND (jsonb_typeof(ingredient_prices) = 'object'::text) AND (ingredient_prices ?& ARRAY['CHICKEN'::text, 'BEEF'::text, 'LAMB'::text, 'TURKEY'::text, 'SALMON'::text, 'POTATO'::text, 'CARROT'::text, 'BROCCOLI'::text, 'PUMPKIN'::text, 'PEPPER'::text, 'ZUCCHINI'::text, 'CAULIFLOWER'::text, 'SWEET_POTATO'::text, 'SPINACH'::text, 'RICE'::text, 'WHEAT'::text, 'OATS'::text, 'APPLE'::text, 'BANANA'::text, 'PEAR'::text, 'ELDERBERRY'::text, 'STRAWBERRY'::text, 'MANGO'::text, 'DAIRY'::text, 'PLANTBASEDMILK'::text, 'PLANTBASED'::text]) AND (NOT jsonb_path_exists(ingredient_prices, '$.*?((@.type() != "number" || @ < 0) || @ > 100000000)'::jsonpath))))),
  constraint catalog_product_gallery_check CHECK (((cardinality(additional_image_paths) <= 9) AND (array_position(additional_image_paths, NULL::text) IS NULL) AND (array_to_string(additional_image_paths, ','::text) !~ '(^|,)(?!catalog/)[^,]+'::text))),
  constraint catalog_products_cake_size_check CHECK ((cake_size = ANY (ARRAY['MINI'::text, 'MIDI'::text, 'STANDARD'::text]))),
  constraint catalog_products_donut_three_price_check CHECK ((donut_three_price >= (0)::numeric)),
  constraint catalog_products_donut_variants_check CHECK (((jsonb_typeof(donut_variants) = 'array'::text) AND (jsonb_array_length(donut_variants) <= 15))),
  constraint catalog_products_image_path_check CHECK ((image_path ~~ 'catalog/%'::text)),
  constraint catalog_products_name_check CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 200))),
  constraint catalog_products_pkey PRIMARY KEY (id),
  constraint catalog_products_price_check CHECK ((price >= (0)::numeric)),
  constraint catalog_products_product_kind_check CHECK (((product_kind = ANY (ARRAY['CAKE'::text, 'DONUT_BOX'::text])) AND ((product_kind <> 'DONUT_BOX'::text) OR (section = 'cake'::text)))),
  constraint catalog_products_section_check check (section = 'cake'),
  constraint valid_design_types CHECK ((design_types <@ ARRAY['STANDARD'::text, 'NAME_TEXT'::text, 'CUSTOM_PHOTO'::text, 'CUSTOM_DESIGN'::text])),
  constraint valid_section_fields check (cake_size is not null and cardinality(design_types) > 0)
);
alter table public.catalog_products enable row level security;
revoke all on public.catalog_products from public, anon, authenticated;
grant select, insert, update, delete on public.catalog_products to authenticated;
create policy admin_access on public.catalog_products for all to authenticated using (((select auth.jwt()) -> 'app_metadata' -> 'site_admin') = 'true'::jsonb) with check (((select auth.jwt()) -> 'app_metadata' -> 'site_admin') = 'true'::jsonb);
grant select on public.catalog_products to anon;
create policy active_content on public.catalog_products for select to anon, authenticated using (is_active);

create table public.homepage_content (
  id uuid default gen_random_uuid() not null,
  created_at timestamptz default now() not null,
  kind text not null,
  language text default 'hy'::text not null,
  title text not null,
  answer text default ''::text not null,
  icon text default 'HelpCircle'::text not null,
  desktop_path text,
  mobile_path text,
  is_active boolean default true not null,
  sort_order bigint default (floor((EXTRACT(epoch FROM clock_timestamp()) * (1000)::numeric)))::bigint not null,
  constraint homepage_content_answer_check CHECK ((char_length(answer) <= 10000)),
  constraint homepage_content_fields CHECK ((((kind = 'slide'::text) AND (desktop_path IS NOT NULL) AND (desktop_path ~~ 'homepage/%'::text) AND ((mobile_path IS NULL) OR (mobile_path ~~ 'homepage/%'::text))) OR ((kind = 'faq'::text) AND (char_length(TRIM(BOTH FROM answer)) > 0) AND (desktop_path IS NULL) AND (mobile_path IS NULL)))),
  constraint homepage_content_icon_check CHECK ((icon = ANY (ARRAY['HelpCircle'::text, 'Heart'::text, 'Truck'::text, 'Shield'::text, 'CakeSlice'::text, 'PawPrint'::text, 'CreditCard'::text, 'Clock'::text]))),
  constraint homepage_content_kind_check CHECK ((kind = ANY (ARRAY['slide'::text, 'faq'::text]))),
  constraint homepage_content_language_check CHECK ((language = ANY (ARRAY['hy'::text, 'ru'::text, 'en'::text, 'pl'::text]))),
  constraint homepage_content_pkey PRIMARY KEY (id),
  constraint homepage_content_title_check CHECK (((char_length(TRIM(BOTH FROM title)) >= 1) AND (char_length(TRIM(BOTH FROM title)) <= 300)))
);
alter table public.homepage_content enable row level security;
revoke all on public.homepage_content from public, anon, authenticated;
grant select, insert, update, delete on public.homepage_content to authenticated;
create policy admin_access on public.homepage_content for all to authenticated using (((select auth.jwt()) -> 'app_metadata' -> 'site_admin') = 'true'::jsonb) with check (((select auth.jwt()) -> 'app_metadata' -> 'site_admin') = 'true'::jsonb);
grant select on public.homepage_content to anon;
create policy active_content on public.homepage_content for select to anon, authenticated using (is_active);

create table public.finance_expenses (
  id uuid default gen_random_uuid() not null,
  person text not null,
  expense_date date default ((now() AT TIME ZONE 'Europe/Warsaw'::text))::date not null,
  expense_type text default 'operating'::text not null,
  description text not null,
  amount numeric not null,
  created_at timestamptz default now() not null,
  constraint finance_expenses_amount_check CHECK (((amount > (0)::numeric) AND (amount <= 9999999999.99))),
  constraint finance_expenses_description_check CHECK (((length(TRIM(BOTH FROM description)) >= 1) AND (length(TRIM(BOTH FROM description)) <= 500))),
  constraint finance_expenses_expense_type_check check (expense_type = 'operating'),
  constraint finance_expenses_person_check CHECK ((person = ANY (ARRAY['mkho'::text, 'diana'::text]))),
  constraint finance_expenses_pkey PRIMARY KEY (id)
);
alter table public.finance_expenses enable row level security;
revoke all on public.finance_expenses from public, anon, authenticated;
grant select, insert, update, delete on public.finance_expenses to authenticated;
create policy admin_access on public.finance_expenses for all to authenticated using (((select auth.jwt()) -> 'app_metadata' -> 'site_admin') = 'true'::jsonb) with check (((select auth.jwt()) -> 'app_metadata' -> 'site_admin') = 'true'::jsonb);

create table public.finance_orders (
  id uuid not null,
  created_at timestamptz default now() not null,
  business_date date default ((now() AT TIME ZONE 'Europe/Warsaw'::text))::date not null,
  sold_at timestamptz,
  status text default 'pending'::text not null,
  phone text not null,
  delivery_info jsonb not null,
  items jsonb not null,
  delivery_fee numeric not null,
  product_total numeric not null,
  request_payload jsonb not null,
  constraint finance_orders_check CHECK (((status <> 'sold'::text) OR (sold_at IS NOT NULL))),
  constraint finance_orders_delivery_fee_check CHECK ((delivery_fee >= (0)::numeric)),
  constraint finance_orders_items_check CHECK ((jsonb_typeof(items) = 'array'::text)),
  constraint finance_orders_pkey PRIMARY KEY (id),
  constraint finance_orders_product_total_check CHECK ((product_total >= (0)::numeric)),
  constraint finance_orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sold'::text, 'cancelled'::text])))
);
alter table public.finance_orders enable row level security;
revoke all on public.finance_orders from public, anon, authenticated;
grant select, insert, update on public.finance_orders to authenticated;
create policy admin_access on public.finance_orders for all to authenticated using (((select auth.jwt()) -> 'app_metadata' -> 'site_admin') = 'true'::jsonb) with check (((select auth.jwt()) -> 'app_metadata' -> 'site_admin') = 'true'::jsonb);

create index catalog_product_order on public.catalog_products (sort_order, created_at, id);
create index homepage_content_order on public.homepage_content (language, kind, sort_order, id);
create index finance_expense_date on public.finance_expenses (expense_date, id);
create index finance_order_date on public.finance_orders (business_date, id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog-images', 'catalog-images', true, 5242880, array['image/jpeg','image/png','image/webp']),
       ('homepage-images', 'homepage-images', true, 5242880, array['image/jpeg','image/png','image/webp']);
create policy poland_admin_images on storage.objects for all to authenticated
using (bucket_id in ('catalog-images', 'homepage-images') and (((select auth.jwt()) -> 'app_metadata' -> 'site_admin') = 'true'::jsonb))
with check (bucket_id in ('catalog-images', 'homepage-images') and (((select auth.jwt()) -> 'app_metadata' -> 'site_admin') = 'true'::jsonb));

CREATE OR REPLACE FUNCTION public.record_manual_finance_sale(p_id uuid, p_payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
declare
  sale_day date;
  sale_source text;
  order_month text;
  entry jsonb;
  normalized jsonb := '[]'::jsonb;
  original_payload jsonb;
  request_snapshot jsonb := jsonb_build_object('manual', true, 'payload', p_payload);
  category text;
  item_name text;
  item_id text;
  qty integer;
  unit_price numeric;
  fee numeric;
  total numeric := 0;
  saved public.finance_orders%rowtype;
begin
  if not coalesce((((select auth.jwt()) -> 'app_metadata' -> 'site_admin') = 'true'::jsonb), false) then
    raise exception 'Admin access required';
  end if;
  if p_id is null or jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'Invalid manual sale';
  end if;
  select request_payload into original_payload from public.finance_orders where id = p_id;
  if found then
    if original_payload is distinct from request_snapshot then raise exception 'Sale key reused with different data'; end if;
    return p_id;
  end if;
  if jsonb_typeof(p_payload->'items') is distinct from 'array' then raise exception 'Invalid items'; end if;
  if jsonb_array_length(p_payload->'items') > 100 then raise exception 'Too many items'; end if;
  if coalesce(p_payload->>'saleDate','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid sale date'; end if;
  sale_day := (p_payload->>'saleDate')::date;
  order_month := coalesce(nullif(p_payload->>'month',''), to_char(sale_day,'YYYY-MM'));
  if order_month !~ '^\d{4}-(0[1-9]|1[0-2])$' then raise exception 'Invalid month'; end if;
  sale_source := p_payload->>'source';
  if sale_source is null or sale_source not in ('instagram','phone','whatsapp','telegram','in_person','other') then
    raise exception 'Invalid sale source';
  end if;
  if length(coalesce(p_payload->>'phone','')) > 50 or length(coalesce(p_payload->>'notes','')) > 2000
    or length(coalesce(p_payload->>'address','')) > 500 or length(coalesce(p_payload->>'nationality','')) > 100 then
    raise exception 'Customer details too long';
  end if;
  fee := (p_payload->>'deliveryFee')::numeric;
  if fee is null or fee < 0 or fee > 9999999999.99 then raise exception 'Invalid delivery fee'; end if;
  fee := round(fee,2);
  if jsonb_array_length(p_payload->'items') = 0 and fee <= 0 then raise exception 'Add an item or a delivery amount'; end if;
  for entry in select value from jsonb_array_elements(p_payload->'items') loop
    category := entry->>'section';
    item_name := trim(coalesce(entry->>'name',''));
    item_id := nullif(entry->>'product_id','');
    if category is null or category <> 'cake' or length(item_name) not between 1 and 200
      or length(coalesce(item_id,'')) > 200 or length(coalesce(entry->>'notes','')) > 1000 then
      raise exception 'Invalid sale item';
    end if;
    if (entry->>'quantity') is null or (entry->>'quantity')::numeric <> trunc((entry->>'quantity')::numeric) then
      raise exception 'Quantity must be an integer';
    end if;
    qty := (entry->>'quantity')::integer;
    unit_price := (entry->>'unit_price')::numeric;
    if qty is null or qty not between 1 and 10000 or unit_price is null or unit_price < 0 or unit_price > 9999999999.99 then
      raise exception 'Invalid quantity or price';
    end if;
    unit_price := round(unit_price,2);
    total := total + unit_price * qty;
    if total > 999999999999.99 then raise exception 'Sale total too large'; end if;
    normalized := normalized || jsonb_build_array(jsonb_build_object(
      'product_id', coalesce(item_id,'manual-' || p_id::text || '-' || jsonb_array_length(normalized)::text),
      'name',item_name, 'section',category, 'quantity',qty, 'unit_price',unit_price,
      'unit_cost',null, 'options',jsonb_build_object('notes',coalesce(entry->>'notes','')),
      'ingredient',null, 'image',null
    ));
  end loop;
  insert into public.finance_orders
    (id,business_date,sold_at,status,phone,delivery_info,items,delivery_fee,product_total,request_payload)
  values
    (p_id,sale_day,now(),'sold',trim(coalesce(p_payload->>'phone','')),
     jsonb_build_object('deliveryDate',sale_day::text,'source',sale_source,'manual',true,'notes',coalesce(p_payload->>'notes',''),
       'month',order_month,'deliveryAddress',trim(coalesce(p_payload->>'address','')),
       'nationality',trim(coalesce(p_payload->>'nationality',''))),
     normalized,fee,total,request_snapshot)
  on conflict(id) do nothing;
  select * into saved from public.finance_orders where id=p_id;
  if saved.request_payload is distinct from request_snapshot then raise exception 'Sale key reused with different data'; end if;
  return p_id;
end;
$function$;
revoke all on function public.record_manual_finance_sale(p_id uuid, p_payload jsonb) from public, anon, authenticated;
grant execute on function public.record_manual_finance_sale(p_id uuid, p_payload jsonb) to authenticated;

CREATE OR REPLACE FUNCTION public.reorder_catalog_products(p_section text, p_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  actual_count integer;
  requested_count integer;
begin
  if not coalesce((((select auth.jwt()) -> 'app_metadata' -> 'site_admin') = 'true'::jsonb), false)
  then
    raise exception 'Միայն ադմինը կարող է փոխել հերթականությունը։';
  end if;

  if p_section is null
     or p_section <> 'cake'
  then
    raise exception 'Անվավեր բաժին։';
  end if;

  requested_count := cardinality(p_ids);

  if requested_count is null or requested_count = 0 then
    raise exception 'Ապրանքների ցանկը դատարկ է։';
  end if;

  if (
    select count(distinct item.id)
    from unnest(p_ids) as item(id)
  ) <> requested_count then
    raise exception 'Ցանկում կան կրկնվող կամ անվավեր ապրանքներ։';
  end if;

  -- Պահպանման ընթացքում կանխում ենք զուգահեռ փոփոխությունները։
  lock table public.catalog_products
  in share row exclusive mode;

  select count(*)
  into actual_count
  from public.catalog_products
  where section = p_section;

  if actual_count <> requested_count then
    raise exception 'Ապրանքների ցանկը փոխվել է։ Թարմացրու և փորձիր կրկին։';
  end if;

  if exists (
    select 1
    from unnest(p_ids) as item(id)
    where not exists (
      select 1
      from public.catalog_products as product
      where product.id = item.id
        and product.section = p_section
    )
  ) then
    raise exception 'Ցանկում կա այլ բաժնի կամ ջնջված ապրանք։';
  end if;

  update public.catalog_products as product
  set sort_order = ordered.position - 1
  from unnest(p_ids) with ordinality as ordered(id, position)
  where product.id = ordered.id
    and product.section = p_section;
end;
$function$;
revoke all on function public.reorder_catalog_products(p_section text, p_ids uuid[]) from public, anon, authenticated;
grant execute on function public.reorder_catalog_products(p_section text, p_ids uuid[]) to authenticated;

CREATE OR REPLACE FUNCTION public.reorder_homepage_content(p_kind text, p_language text, p_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare total integer; requested integer;
begin
  if not coalesce((((select auth.jwt()) -> 'app_metadata' -> 'site_admin') = 'true'::jsonb), false) then
    raise exception 'Միայն ադմինը կարող է փոխել հերթականությունը։';
  end if;
  if p_kind is null or p_kind not in ('slide', 'faq') or p_language is null or p_language not in ('hy', 'ru', 'en', 'pl') then
    raise exception 'Անվավեր բաժին կամ լեզու։';
  end if;
  requested := cardinality(p_ids);
  if requested is null or requested = 0 or requested <> (select count(distinct id) from unnest(p_ids) as ids(id)) then
    raise exception 'Անվավեր ցանկ։';
  end if;
  lock table public.homepage_content in share row exclusive mode;
  select count(*) into total from public.homepage_content where kind = p_kind and language = p_language;
  if total <> requested or exists (
    select 1 from unnest(p_ids) as ids(id) where not exists (
      select 1 from public.homepage_content c where c.id = ids.id and c.kind = p_kind and c.language = p_language
    )
  ) then
    raise exception 'Ցանկը փոխվել է։ Թարմացրու և փորձիր կրկին։';
  end if;
  update public.homepage_content c set sort_order = ordered.position - 1
  from unnest(p_ids) with ordinality as ordered(id, position) where c.id = ordered.id;
end;
$function$;
revoke all on function public.reorder_homepage_content(p_kind text, p_language text, p_ids uuid[]) from public, anon, authenticated;
grant execute on function public.reorder_homepage_content(p_kind text, p_language text, p_ids uuid[]) to authenticated;

CREATE OR REPLACE FUNCTION public.set_finance_order_status(p_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
begin
  if not coalesce((((select auth.jwt()) -> 'app_metadata' -> 'site_admin') = 'true'::jsonb), false) then raise exception 'Admin access required'; end if;
  if p_status not in ('sold','cancelled') or p_status is null then raise exception 'Invalid status'; end if;
  update public.finance_orders set status=p_status,
    sold_at=case when p_status='sold' then coalesce(sold_at,now()) else sold_at end,
    business_date=case when p_status='sold' then (coalesce(sold_at,now()) at time zone 'Europe/Warsaw')::date else business_date end
    where id=p_id;
  if not found then raise exception 'Order not found'; end if;
end $function$;
revoke all on function public.set_finance_order_status(p_id uuid, p_status text) from public, anon, authenticated;
grant execute on function public.set_finance_order_status(p_id uuid, p_status text) to authenticated;
