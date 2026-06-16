-- 0019_add_tier_limits_and_surcharge.sql
-- Añade límites horaria de ingreso y monto de recargo por excedente a ticket_tiers.
-- Registra si se aplicó y cobró un excedente en checkins.

alter table public.ticket_tiers
  add column if not exists entry_time_limit time,
  add column if not exists surcharge_amount numeric(12, 2) not null default 0.00 check (surcharge_amount >= 0);

alter table public.checkins
  add column if not exists surcharge_applied boolean not null default false,
  add column if not exists surcharge_paid numeric(12, 2) not null default 0.00 check (surcharge_paid >= 0);

-- Eliminar la firma antigua antes de recrearla con diferentes columnas de retorno
drop function if exists public.checkin_ticket(uuid);

-- Actualizar la función atómica de check-in para procesar excedentes.
create or replace function public.checkin_ticket(p_ticket_id uuid)
returns table (
  result text,
  used_at timestamptz,
  full_name text,
  tier_name text,
  surcharge_applied boolean,
  surcharge_amount numeric
)
language plpgsql
security invoker
as $$
declare
  v_ticket            public.tickets;
  v_event_status      public.event_status;
  v_event_at          timestamptz;
  v_entry_time_limit  time;
  v_surcharge_amount  numeric;
  v_deadline          timestamptz;
  v_surcharge_applied boolean := false;
  v_tier_name         text;
begin
  -- 1) Marcar el ticket como usado de manera atómica
  update public.tickets t
     set status = 'used', used_at = now()
   where t.id = p_ticket_id
     and t.status = 'valid'
     and exists (
       select 1 from public.events e
        where e.id = t.event_id and e.status <> 'cancelled'
     )
  returning t.* into v_ticket;

  -- 2) Si se actualizó correctamente el ticket, procesar las validaciones horarias y auditoría
  if found then
    -- Obtener la hora de inicio del evento y configuraciones del tier
    select e.event_at, tt.entry_time_limit, tt.surcharge_amount, tt.name
      into v_event_at, v_entry_time_limit, v_surcharge_amount, v_tier_name
      from public.events e
      join public.ticket_tiers tt on tt.event_id = e.id
     where e.id = v_ticket.event_id and tt.id = v_ticket.tier_id;

    -- Validar el límite horario de ingreso
    if v_entry_time_limit is not null then
      -- Calcular el timestamp límite ajustando al huso horario local (Colombia: America/Bogota, UTC-5)
      v_deadline := ((v_event_at at time zone 'America/Bogota')::date + v_entry_time_limit) at time zone 'America/Bogota';
      
      -- Si la hora límite de ingreso es menor a la hora de inicio del evento (ej. cruce de medianoche a la madrugada del día siguiente)
      if v_entry_time_limit < (v_event_at at time zone 'America/Bogota')::time then
        v_deadline := v_deadline + interval '1 day';
      end if;

      -- Verificar si el ingreso actual excede el límite
      if now() > v_deadline then
        v_surcharge_applied := true;
      end if;
    end if;

    -- Insertar el registro de auditoría con la información del recargo cobrado
    insert into public.checkins (company_id, ticket_id, scanned_by, result, surcharge_applied, surcharge_paid)
      values (
        v_ticket.company_id,
        v_ticket.id,
        auth.uid(),
        'admitted',
        v_surcharge_applied,
        case when v_surcharge_applied then v_surcharge_amount else 0.00 end
      );

    return query
      select 
        'admitted'::text,
        v_ticket.used_at,
        a.full_name,
        v_tier_name,
        v_surcharge_applied,
        case when v_surcharge_applied then v_surcharge_amount else 0.00 end
        from public.attendees a
       where a.id = v_ticket.attendee_id;
    return;
  end if;

  -- 3) Si no se actualizó el ticket, clasificar el motivo de rechazo
  select * into v_ticket from public.tickets where id = p_ticket_id;
  if not found then
    return query select 'invalid:not_found'::text, null::timestamptz, null::text, null::text, false, 0.00;
    return;
  end if;

  select e.status into v_event_status from public.events e where e.id = v_ticket.event_id;

  if v_ticket.status = 'used' then
    insert into public.checkins (company_id, ticket_id, scanned_by, result, surcharge_applied, surcharge_paid)
      values (v_ticket.company_id, v_ticket.id, auth.uid(), 'already_used', false, 0.00);
    return query select 'already_used'::text, v_ticket.used_at, null::text, null::text, false, 0.00;
  elsif v_event_status = 'cancelled' then
    insert into public.checkins (company_id, ticket_id, scanned_by, result, surcharge_applied, surcharge_paid)
      values (v_ticket.company_id, v_ticket.id, auth.uid(), 'invalid:event_cancelled', false, 0.00);
    return query select 'invalid:event_cancelled'::text, null::timestamptz, null::text, null::text, false, 0.00;
  else
    insert into public.checkins (company_id, ticket_id, scanned_by, result, surcharge_applied, surcharge_paid)
      values (v_ticket.company_id, v_ticket.id, auth.uid(), 'invalid:void', false, 0.00);
    return query select 'invalid:void'::text, null::timestamptz, null::text, null::text, false, 0.00;
  end if;
end;
$$;
