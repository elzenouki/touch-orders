-- ⏰ مواعيد قفل التجار — للنسخة التجريبية (beta) من تطبيق المناديب الخارجيين
-- شغّل الملف ده مرة واحدة في Supabase: SQL Editor ← New query ← الصق كله ← Run
-- آمن تشغّله أكتر من مرة، ومش بيلمس أي جدول موجود.
--
-- • جدول جديد customer_close_times: لكل تاجر (بكوده) الساعة اللي بيقفل فيها.
-- • دالة close_times_api: التطبيق بيكلمها عشان يقرا المواعيد أو يحفظ ميعاد.
--   التأكد من المستخدم (إيميل + PIN) بيتم بنفس دالة التحميلات loads_api الموجودة —
--   فلازم يكون ملف loads.sql متشغّل قبل كده (وهو متشغّل لأن شاشة التحميلات شغالة).

create table if not exists public.customer_close_times (
  customer_code text primary key,
  close_time    time not null,
  updated_by    text,
  updated_at    timestamptz not null default now()
);

-- محدش يقدر يقرا أو يكتب في الجدول مباشرة — بس عن طريق الدالة تحت
alter table public.customer_close_times enable row level security;
revoke all on public.customer_close_times from anon, authenticated;

create or replace function public.close_times_api(auth jsonb, act text, args jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  chk jsonb;
  who text := lower(trim(coalesce(auth->>'email', '')));
  code text;
  t text;
begin
  -- التأكد إن الإيميل والـ PIN صح (بطلب خفيف لدالة التحميلات)
  begin
    execute format('select to_jsonb(public.loads_api(auth => %L, act => %L, args => %L))', auth::text, 'vehicles', '{}')
      into chk;
  exception when others then
    chk := null;
  end;
  if who = '' or chk is null or coalesce(chk->>'ok', '') <> 'true' then
    return jsonb_build_object('ok', false, 'error', 'سجّل دخول تاني');
  end if;

  if act = 'list' then
    return jsonb_build_object('ok', true, 'result', coalesce(
      (select jsonb_object_agg(customer_code, to_char(close_time, 'HH24:MI')) from public.customer_close_times), '{}'::jsonb));

  elsif act = 'set' then
    code := trim(coalesce(args->>'customer_code', ''));
    t := trim(coalesce(args->>'close_time', ''));
    if code = '' then
      return jsonb_build_object('ok', false, 'error', 'كود التاجر ناقص');
    end if;
    if t = '' then
      delete from public.customer_close_times where customer_code = code;
      return jsonb_build_object('ok', true, 'result', null);
    end if;
    if t !~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' then
      return jsonb_build_object('ok', false, 'error', 'الساعة مش مظبوطة');
    end if;
    insert into public.customer_close_times (customer_code, close_time, updated_by, updated_at)
    values (code, t::time, who, now())
    on conflict (customer_code) do update
      set close_time = excluded.close_time, updated_by = excluded.updated_by, updated_at = now();
    return jsonb_build_object('ok', true, 'result', t);
  end if;

  return jsonb_build_object('ok', false, 'error', 'طلب مش معروف');
end;
$$;

grant execute on function public.close_times_api(jsonb, text, jsonb) to anon, authenticated;
