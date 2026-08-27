import type { VopInputs, VopResult, ValueComponents } from '../../src/vop.js';

const COMP_MIDPOINT: Record<VopInputs['executiveBand'], number> = {
  vp: 250_000,
  svp: 400_000,
  csuite: 650_000,
  elite: 1_200_000,
};

const COMPLEXITY: Record<VopInputs['complexity'], number> = {
  routine: 0.88,
  coordinated: 1,
  complex: 1.14,
  mission: 1.3,
};

const EXPOSURE: Record<VopInputs['disruptionExposure'], number> = {
  low: 0.72,
  normal: 1,
  elevated: 1.42,
  active: 2.2,
};

const AUTOMATION: Record<VopInputs['automation'], number> = {
  booking: 0.32,
  coordination: 0.58,
  proactive: 0.78,
  full: 0.9,
};

const CONSEQUENCE: Record<VopInputs['consequence'], number> = {
  internal: 0.55,
  client: 0.85,
  keynote: 1.1,
  board: 1.2,
  transaction: 1.35,
};

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function withChaos(inputs: VopInputs) {
  let probability = inputs.disruptionProbability;
  let recovery = inputs.recoveryMinutes;
  let criticality = inputs.criticality;
  let buffer = inputs.arrivalBufferMinutes;
  let severity = 1;
  let extraTouches = 0;

  for (const key of inputs.chaos) {
    switch (key) {
      case 'delay45':
        recovery += 45;
        probability += 0.08;
        extraTouches += 3;
        severity += 0.18;
        break;
      case 'cancelled':
        recovery += 120;
        probability = Math.max(probability, 0.95);
        extraTouches += 8;
        severity += 0.72;
        break;
      case 'tightConnection':
        recovery += 60;
        probability += 0.12;
        extraTouches += 4;
        severity += 0.28;
        break;
      case 'thunderstorm':
        recovery += 40;
        probability += 0.14;
        extraTouches += 3;
        severity += 0.3;
        break;
      case 'meetingEarlier':
        criticality += 16;
        buffer -= 30;
        extraTouches += 2;
        severity += 0.2;
        break;
      case 'traffic35':
        recovery += 35;
        buffer -= 35;
        extraTouches += 2;
        severity += 0.16;
        break;
      case 'hotelUnavailable':
        recovery += 65;
        extraTouches += 5;
        severity += 0.3;
        break;
      case 'destinationChange':
        recovery += 95;
        extraTouches += 7;
        severity += 0.42;
        break;
      case 'lastFlight':
        probability += 0.08;
        recovery += 55;
        severity += 0.24;
        break;
    }
  }

  return {
    probability: clamp(probability, 0.02, 1),
    recovery: clamp(recovery, 20, 480),
    criticality: clamp(criticality, 0, 100),
    buffer: clamp(buffer, 0, 240),
    severity: clamp(severity, 1, 3.8),
    extraTouches,
  };
}

function solve(inputs: VopInputs, stateFactor = 1) {
  const hourly = COMP_MIDPOINT[inputs.executiveBand] / 2_000;
  const chaos = withChaos(inputs);
  const automation = AUTOMATION[inputs.automation];
  const complexity = COMPLEXITY[inputs.complexity];
  const exposure = EXPOSURE[inputs.disruptionExposure] * stateFactor;

  const manualMinutes =
    18 +
    inputs.flightSegments * 9 +
    inputs.groundLegs * 4 +
    Math.max(0, inputs.totalLegs - inputs.flightSegments - inputs.groundLegs) * 4 +
    inputs.connections * 7 +
    Math.max(0, inputs.providers - 2) * 3 +
    (inputs.policyRequired ? 8 : 0) +
    (inputs.dutyOfCare ? 8 : 0);

  const goaiMinutes = clamp(3 + (inputs.complexity === 'mission' ? 2 : 0), 3, 7);
  const timeReturned = Math.max(0, manualMinutes - goaiMinutes);
  const touches = Math.round(
    inputs.totalLegs * 1.35 + inputs.providers * 1.2 + inputs.stakeholders * 0.45 + chaos.extraTouches,
  );
  const touchesRemoved = Math.max(1, Math.round(touches * automation));

  const attention = (timeReturned / 60) * hourly * automation * complexity * inputs.travelers;

  const coordinationMinutes = touchesRemoved * 2.6;
  const coordinationRate = inputs.executiveBand === 'vp' ? 72 : 88;
  const coordination =
    (coordinationMinutes / 60) * coordinationRate * (0.9 + inputs.providers * 0.025) * inputs.travelers;

  const materialProbability = clamp(chaos.probability * exposure, 0.02, 1);
  const continuity =
    materialProbability *
    (chaos.recovery / 60) *
    hourly *
    automation *
    chaos.severity *
    (1 + inputs.connections * 0.08) *
    inputs.travelers;

  const criticality = chaos.criticality / 100;
  const bufferPressure = clamp((75 - chaos.buffer) / 75, 0, 1);
  const dependencyPressure = clamp((inputs.totalLegs + inputs.stakeholders * 0.6) / 14, 0.35, 1.5);
  const missionRaw =
    hourly *
    0.48 *
    criticality *
    CONSEQUENCE[inputs.consequence] *
    dependencyPressure *
    (0.55 + bufferPressure * 0.8) *
    automation *
    chaos.severity *
    inputs.travelers;

  // Mission consequences overlap with attention/continuity. Damp them rather than double-counting.
  const mission = Math.min(missionRaw, attention * 0.9 + continuity * 0.45);

  const components: ValueComponents = {
    attention: roundMoney(attention),
    coordination: roundMoney(coordination),
    continuity: roundMoney(continuity),
    mission: roundMoney(mission),
  };

  const rawProtected = attention + coordination + continuity + mission;
  const overlapNormalization = 1 / (1 + Math.max(0, chaos.severity - 1) * 0.08);
  const valueProtected = rawProtected * overlapNormalization;

  const unrecovered =
    (continuity + mission) * (1 - automation) +
    hourly * (chaos.recovery / 60) * materialProbability * 0.28;
  const valueAtRisk = valueProtected + unrecovered;

  return {
    hourly,
    manualMinutes,
    goaiMinutes,
    timeReturned,
    touchesRemoved,
    components,
    valueProtected,
    valueAtRisk,
    residualExposure: Math.max(0, valueAtRisk - valueProtected),
  };
}

export default async (request: Request) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST required' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  let inputs: VopInputs;
  try {
    inputs = (await request.json()) as VopInputs;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const base = solve(inputs, 1);
  const low = base.valueProtected * 0.88;
  const high = base.valueProtected * 1.12;
  const fee = Math.max(1, inputs.platformFee);
  const annual = base.valueProtected * Math.max(1, inputs.annualTrips) * Math.max(1, inputs.executives);

  const routine = solve({ ...inputs, disruptionExposure: 'low' }, 0.85);
  const elevated = solve({ ...inputs, disruptionExposure: 'elevated' }, 1.12);
  const disrupted = solve({ ...inputs, disruptionExposure: 'active' }, 1.35);

  const result: VopResult = {
    modelVersion: 'VOP-1.0.0',
    hourlyValue: roundMoney(base.hourly),
    manualMinutes: Math.round(base.manualMinutes),
    goaiMinutes: Math.round(base.goaiMinutes),
    timeReturnedMinutes: Math.round(base.timeReturned),
    touchesRemoved: base.touchesRemoved,
    valueProtected: roundMoney(base.valueProtected),
    valueProtectedLow: roundMoney(low),
    valueProtectedHigh: roundMoney(high),
    valueAtRisk: roundMoney(base.valueAtRisk),
    residualExposure: roundMoney(base.residualExposure),
    vopMultiple: Math.round((base.valueProtected / fee) * 10) / 10,
    estimatedRoiPct: Math.round(((base.valueProtected - fee) / fee) * 100),
    annualValueProtected: roundMoney(annual),
    components: base.components,
    states: [
      { name: 'routine', label: 'Routine', valueProtected: roundMoney(routine.valueProtected), valueAtRisk: roundMoney(routine.valueAtRisk), residualExposure: roundMoney(routine.residualExposure) },
      { name: 'elevated', label: 'Elevated', valueProtected: roundMoney(elevated.valueProtected), valueAtRisk: roundMoney(elevated.valueAtRisk), residualExposure: roundMoney(elevated.residualExposure) },
      { name: 'disrupted', label: 'Disrupted', valueProtected: roundMoney(disrupted.valueProtected), valueAtRisk: roundMoney(disrupted.valueAtRisk), residualExposure: roundMoney(disrupted.residualExposure) },
    ],
    confidence: inputs.chaos.length > 2 || inputs.complexity === 'mission' ? 'Moderate' : 'High',
    explanation: [
      `${Math.round(base.timeReturned)} minutes of modeled active coordination are returned versus fragmented handling.`,
      `${base.touchesRemoved} manual coordination touches are estimated to be removed at the selected automation level.`,
      `Continuity value reflects modeled material disruption exposure and ${withChaos(inputs).recovery} minutes of recovery burden.`,
      `Mission value is overlap-capped so schedule consequences are not simply added on top of the same time loss twice.`,
    ],
  };

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
};
