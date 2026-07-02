begin;

insert into public.market_events (
  event_key,
  game_day,
  source,
  headline,
  body,
  importance,
  category,
  is_accurate,
  is_rumor
)
values
  (
    'arc_gas_day4_supply_warning',
    4,
    'The CYN Times',
    'Oil supply warning pushes fuel markets higher',
    'Refinery issues and shipping delays raised concern that fuel supplies could tighten over the next several weeks. Energy names attracted buyers, while airlines and freight operators came under pressure from higher expected operating costs.',
    'High',
    'macro',
    true,
    false
  ),
  (
    'arc_gas_day6_pump_prices_climb',
    6,
    'Expedition',
    'Drivers face higher gas prices as travel demand grows',
    'Gas prices climbed across several regions as summer travel demand met tighter fuel supply. Travel shares weakened, delivery companies warned about route costs, and consumer names slipped as households prepared for higher weekly expenses.',
    'High',
    'macro',
    true,
    false
  ),
  (
    'arc_gas_day8_airline_pressure',
    8,
    'Expedition',
    'Fuel costs put pressure on travel companies',
    'Airlines warned that sustained fuel increases could force higher ticket prices or weaker margins. Investors marked down SkyBridge sharply while fuel-sensitive logistics firms stayed volatile.',
    'High',
    'macro',
    true,
    false
  ),
  (
    'arc_gas_day10_delivery_surcharges',
    10,
    'The CYN Times',
    'Delivery firms add fuel surcharges as gas prices rise',
    'Freight and delivery companies added temporary fuel surcharges to protect margins. The move may help profits later, but customers pushed back and retailers warned that shipping costs could weigh on demand.',
    'Medium',
    'operations',
    true,
    false
  ),
  (
    'arc_gas_day13_government_response',
    13,
    'The CYN Times',
    'Officials weigh emergency measures to cool gas prices',
    'Officials discussed emergency fuel reserves and temporary tax relief to slow the rise in gas prices. Energy stocks cooled as traders priced in policy pressure, while travel and consumer shares recovered part of their losses.',
    'High',
    'macro',
    true,
    false
  ),
  (
    'arc_gas_day16_prices_ease',
    16,
    'The CYN Times',
    'Gas prices begin to ease after weeks of pressure',
    'Fuel prices stabilized as supply improved and emergency measures reduced market anxiety. Travel and logistics shares rebounded, but energy names gave back some earlier gains as the spike faded.',
    'High',
    'macro',
    true,
    false
  )
on conflict (event_key) do update
set
  game_day = excluded.game_day,
  source = excluded.source,
  headline = excluded.headline,
  body = excluded.body,
  importance = excluded.importance,
  category = excluded.category,
  is_accurate = excluded.is_accurate,
  is_rumor = excluded.is_rumor,
  updated_at = now();

delete from public.event_stock_impacts
where event_id in (
  select id
  from public.market_events
  where event_key like 'arc_gas_day%'
);

with arc_impacts(event_key, symbol, expected_impact, actual_impact) as (
  values
    ('arc_gas_day4_supply_warning', 'GVE', 0.026000::numeric, 0.025000::numeric),
    ('arc_gas_day4_supply_warning', 'SLD', 0.019000::numeric, 0.018000::numeric),
    ('arc_gas_day4_supply_warning', 'SKY', -0.028000::numeric, -0.025000::numeric),
    ('arc_gas_day4_supply_warning', 'FRX', -0.017000::numeric, -0.015000::numeric),
    ('arc_gas_day6_pump_prices_climb', 'GVE', 0.037000::numeric, 0.035000::numeric),
    ('arc_gas_day6_pump_prices_climb', 'SLD', 0.027000::numeric, 0.025000::numeric),
    ('arc_gas_day6_pump_prices_climb', 'SKY', -0.049000::numeric, -0.045000::numeric),
    ('arc_gas_day6_pump_prices_climb', 'FRX', -0.034000::numeric, -0.030000::numeric),
    ('arc_gas_day6_pump_prices_climb', 'LUX', -0.020000::numeric, -0.018000::numeric),
    ('arc_gas_day6_pump_prices_climb', 'FDM', -0.009000::numeric, -0.008000::numeric),
    ('arc_gas_day6_pump_prices_climb', 'AGR', -0.007000::numeric, -0.006000::numeric),
    ('arc_gas_day8_airline_pressure', 'SKY', -0.069000::numeric, -0.065000::numeric),
    ('arc_gas_day8_airline_pressure', 'FRX', -0.028000::numeric, -0.025000::numeric),
    ('arc_gas_day8_airline_pressure', 'GVE', 0.022000::numeric, 0.020000::numeric),
    ('arc_gas_day10_delivery_surcharges', 'FRX', -0.031000::numeric, -0.028000::numeric),
    ('arc_gas_day10_delivery_surcharges', 'FDM', -0.016000::numeric, -0.014000::numeric),
    ('arc_gas_day10_delivery_surcharges', 'AGR', -0.014000::numeric, -0.012000::numeric),
    ('arc_gas_day10_delivery_surcharges', 'LUX', -0.023000::numeric, -0.020000::numeric),
    ('arc_gas_day13_government_response', 'GVE', -0.028000::numeric, -0.025000::numeric),
    ('arc_gas_day13_government_response', 'SLD', -0.020000::numeric, -0.018000::numeric),
    ('arc_gas_day13_government_response', 'SKY', 0.032000::numeric, 0.030000::numeric),
    ('arc_gas_day13_government_response', 'FRX', 0.020000::numeric, 0.018000::numeric),
    ('arc_gas_day13_government_response', 'LUX', 0.014000::numeric, 0.012000::numeric),
    ('arc_gas_day16_prices_ease', 'SKY', 0.048000::numeric, 0.045000::numeric),
    ('arc_gas_day16_prices_ease', 'FRX', 0.032000::numeric, 0.030000::numeric),
    ('arc_gas_day16_prices_ease', 'LUX', 0.020000::numeric, 0.018000::numeric),
    ('arc_gas_day16_prices_ease', 'FDM', 0.011000::numeric, 0.010000::numeric),
    ('arc_gas_day16_prices_ease', 'AGR', 0.011000::numeric, 0.010000::numeric),
    ('arc_gas_day16_prices_ease', 'GVE', -0.022000::numeric, -0.020000::numeric),
    ('arc_gas_day16_prices_ease', 'SLD', -0.014000::numeric, -0.012000::numeric)
)
insert into public.event_stock_impacts (
  event_id,
  stock_id,
  expected_impact,
  actual_impact
)
select
  events.id,
  stocks.id,
  arc_impacts.expected_impact,
  arc_impacts.actual_impact
from arc_impacts
join public.market_events as events on events.event_key = arc_impacts.event_key
join public.stocks as stocks on stocks.symbol = arc_impacts.symbol;

with arc_impacts(event_key, symbol, actual_impact) as (
  values
    ('arc_gas_day4_supply_warning', 'GVE', 0.025000::numeric),
    ('arc_gas_day4_supply_warning', 'SLD', 0.018000::numeric),
    ('arc_gas_day4_supply_warning', 'SKY', -0.025000::numeric),
    ('arc_gas_day4_supply_warning', 'FRX', -0.015000::numeric),
    ('arc_gas_day6_pump_prices_climb', 'GVE', 0.035000::numeric),
    ('arc_gas_day6_pump_prices_climb', 'SLD', 0.025000::numeric),
    ('arc_gas_day6_pump_prices_climb', 'SKY', -0.045000::numeric),
    ('arc_gas_day6_pump_prices_climb', 'FRX', -0.030000::numeric),
    ('arc_gas_day6_pump_prices_climb', 'LUX', -0.018000::numeric),
    ('arc_gas_day6_pump_prices_climb', 'FDM', -0.008000::numeric),
    ('arc_gas_day6_pump_prices_climb', 'AGR', -0.006000::numeric),
    ('arc_gas_day8_airline_pressure', 'SKY', -0.065000::numeric),
    ('arc_gas_day8_airline_pressure', 'FRX', -0.025000::numeric),
    ('arc_gas_day8_airline_pressure', 'GVE', 0.020000::numeric),
    ('arc_gas_day10_delivery_surcharges', 'FRX', -0.028000::numeric),
    ('arc_gas_day10_delivery_surcharges', 'FDM', -0.014000::numeric),
    ('arc_gas_day10_delivery_surcharges', 'AGR', -0.012000::numeric),
    ('arc_gas_day10_delivery_surcharges', 'LUX', -0.020000::numeric),
    ('arc_gas_day13_government_response', 'GVE', -0.025000::numeric),
    ('arc_gas_day13_government_response', 'SLD', -0.018000::numeric),
    ('arc_gas_day13_government_response', 'SKY', 0.030000::numeric),
    ('arc_gas_day13_government_response', 'FRX', 0.018000::numeric),
    ('arc_gas_day13_government_response', 'LUX', 0.012000::numeric),
    ('arc_gas_day16_prices_ease', 'SKY', 0.045000::numeric),
    ('arc_gas_day16_prices_ease', 'FRX', 0.030000::numeric),
    ('arc_gas_day16_prices_ease', 'LUX', 0.018000::numeric),
    ('arc_gas_day16_prices_ease', 'FDM', 0.010000::numeric),
    ('arc_gas_day16_prices_ease', 'AGR', 0.010000::numeric),
    ('arc_gas_day16_prices_ease', 'GVE', -0.020000::numeric),
    ('arc_gas_day16_prices_ease', 'SLD', -0.012000::numeric)
)
update public.stock_prices as prices
set
  close_price = round(prices.open_price * (1 + arc_impacts.actual_impact), 2),
  high_price = greatest(
    prices.high_price,
    round(prices.open_price * (1 + abs(arc_impacts.actual_impact) * 0.55), 2),
    round(prices.open_price * (1 + arc_impacts.actual_impact), 2)
  ),
  low_price = least(
    prices.low_price,
    round(prices.open_price * (1 - abs(arc_impacts.actual_impact) * 0.45), 2),
    round(prices.open_price * (1 + arc_impacts.actual_impact), 2)
  ),
  volume = round(prices.volume * (1 + abs(arc_impacts.actual_impact) * 8))::bigint,
  event_impact = arc_impacts.actual_impact
from arc_impacts
join public.market_events as events on events.event_key = arc_impacts.event_key
join public.stocks as stocks on stocks.symbol = arc_impacts.symbol
where prices.stock_id = stocks.id
  and prices.game_day = events.game_day;

commit;
