begin;

update public.market_events
set source = case event_key
  when 'day1-cai-ai-demand' then 'Tech Insider'
  when 'day1-itc-chip-orders' then 'Tech Insider'
  when 'day3-hlw-production-costs' then 'The CYN Times'
  else source
end
where event_key in (
  'day1-cai-ai-demand',
  'day1-itc-chip-orders',
  'day3-hlw-production-costs'
);

commit;
