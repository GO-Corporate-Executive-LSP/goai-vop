export type ExecutiveBand = 'vp' | 'svp' | 'csuite' | 'elite';
export type Complexity = 'routine' | 'coordinated' | 'complex' | 'mission';
export type Exposure = 'low' | 'normal' | 'elevated' | 'active';
export type Automation = 'booking' | 'coordination' | 'proactive' | 'full';
export type Consequence = 'internal' | 'client' | 'keynote' | 'board' | 'transaction';
export type ChaosKey =
  | 'delay45'
  | 'cancelled'
  | 'tightConnection'
  | 'thunderstorm'
  | 'meetingEarlier'
  | 'traffic35'
  | 'hotelUnavailable'
  | 'destinationChange'
  | 'lastFlight';

export interface VopInputs {
  executiveBand: ExecutiveBand;
  travelers: number;
  totalLegs: number;
  flightSegments: number;
  groundLegs: number;
  connections: number;
  complexity: Complexity;
  criticality: number;
  arrivalBufferMinutes: number;
  providers: number;
  stakeholders: number;
  disruptionExposure: Exposure;
  disruptionProbability: number;
  recoveryMinutes: number;
  policyRequired: boolean;
  dutyOfCare: boolean;
  consequence: Consequence;
  annualTrips: number;
  executives: number;
  automation: Automation;
  platformFee: number;
  chaos: ChaosKey[];
}

export interface ValueComponents {
  attention: number;
  coordination: number;
  continuity: number;
  mission: number;
}

export interface StateResult {
  name: 'routine' | 'elevated' | 'disrupted';
  label: string;
  valueProtected: number;
  valueAtRisk: number;
  residualExposure: number;
}

export interface VopResult {
  modelVersion: string;
  hourlyValue: number;
  manualMinutes: number;
  goaiMinutes: number;
  timeReturnedMinutes: number;
  touchesRemoved: number;
  valueProtected: number;
  valueProtectedLow: number;
  valueProtectedHigh: number;
  valueAtRisk: number;
  residualExposure: number;
  vopMultiple: number;
  estimatedRoiPct: number;
  annualValueProtected: number;
  components: ValueComponents;
  states: StateResult[];
  confidence: 'Moderate' | 'High';
  explanation: string[];
}

export const DEFAULT_INPUTS: VopInputs = {
  executiveBand: 'csuite',
  travelers: 1,
  totalLegs: 8,
  flightSegments: 2,
  groundLegs: 6,
  connections: 0,
  complexity: 'complex',
  criticality: 78,
  arrivalBufferMinutes: 45,
  providers: 5,
  stakeholders: 3,
  disruptionExposure: 'normal',
  disruptionProbability: 0.15,
  recoveryMinutes: 90,
  policyRequired: true,
  dutyOfCare: false,
  consequence: 'client',
  annualTrips: 22,
  executives: 1,
  automation: 'full',
  platformFee: 75,
  chaos: [],
};

export const CHAOS_OPTIONS: { key: ChaosKey; label: string; detail: string }[] = [
  { key: 'delay45', label: 'Flight delayed 45 min', detail: 'Adds schedule compression and recovery coordination.' },
  { key: 'cancelled', label: 'Flight cancelled', detail: 'Forces active rebooking and downstream recoordination.' },
  { key: 'tightConnection', label: 'Connection below minimum', detail: 'Raises missed-connection and recovery exposure.' },
  { key: 'thunderstorm', label: 'Thunderstorm at arrival', detail: 'Raises airport disruption probability and ground uncertainty.' },
  { key: 'meetingEarlier', label: 'Meeting moved 30 min earlier', detail: 'Cuts protected arrival buffer and raises mission criticality.' },
  { key: 'traffic35', label: 'Ground traffic +35 min', detail: 'Adds downstream ground-mobility compression.' },
  { key: 'hotelUnavailable', label: 'Hotel unavailable', detail: 'Adds lodging recovery and transfer recoordination.' },
  { key: 'destinationChange', label: 'Executive changes destination', detail: 'Creates a full downstream itinerary rewrite.' },
  { key: 'lastFlight', label: 'Last flight of the day', detail: 'Raises consequence severity if recovery fails.' },
];

export const PRESETS: Record<string, Partial<VopInputs>> = {
  'Six-Leg Standard Business Trip': { executiveBand: 'csuite', totalLegs: 8, flightSegments: 2, groundLegs: 6, complexity: 'complex', criticality: 72, consequence: 'client', disruptionExposure: 'normal', chaos: [] },
  'The 8 AM Board Meeting': { executiveBand: 'elite', totalLegs: 8, flightSegments: 2, groundLegs: 6, criticality: 96, arrivalBufferMinutes: 35, consequence: 'board', disruptionExposure: 'elevated', chaos: ['lastFlight'] },
  'The Three-City Roadshow': { executiveBand: 'csuite', totalLegs: 13, flightSegments: 4, groundLegs: 8, connections: 1, complexity: 'mission', criticality: 88, providers: 7, stakeholders: 6, consequence: 'client', disruptionExposure: 'elevated', chaos: [] },
  'Last Flight Out': { executiveBand: 'svp', totalLegs: 7, flightSegments: 2, groundLegs: 5, criticality: 84, arrivalBufferMinutes: 30, consequence: 'client', disruptionExposure: 'elevated', chaos: ['lastFlight'] },
  'The CEO Keynote': { executiveBand: 'elite', totalLegs: 8, flightSegments: 2, groundLegs: 6, criticality: 100, consequence: 'keynote', disruptionExposure: 'normal', chaos: [] },
  'Investor Day': { executiveBand: 'elite', totalLegs: 9, flightSegments: 2, groundLegs: 7, criticality: 94, consequence: 'board', stakeholders: 8, disruptionExposure: 'elevated', chaos: [] },
  'M&A Diligence Trip': { executiveBand: 'elite', totalLegs: 10, flightSegments: 2, groundLegs: 8, complexity: 'mission', criticality: 98, dutyOfCare: true, consequence: 'transaction', stakeholders: 9, disruptionExposure: 'elevated', chaos: [] },
  'International Connection': { executiveBand: 'csuite', totalLegs: 10, flightSegments: 4, groundLegs: 6, connections: 2, complexity: 'mission', recoveryMinutes: 140, consequence: 'client', disruptionExposure: 'elevated', chaos: ['tightConnection'] },
  'Weather Disruption': { executiveBand: 'csuite', totalLegs: 8, flightSegments: 2, groundLegs: 6, criticality: 82, disruptionExposure: 'active', chaos: ['thunderstorm', 'delay45'] },
  'Executive Protection Movement': { executiveBand: 'elite', totalLegs: 9, flightSegments: 2, groundLegs: 7, complexity: 'mission', criticality: 95, dutyOfCare: true, consequence: 'transaction', providers: 6, stakeholders: 8, automation: 'full', chaos: [] },
};

export async function calculateVop(inputs: VopInputs): Promise<VopResult> {
  const response = await fetch('/.netlify/functions/vop', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(inputs),
  });
  if (!response.ok) throw new Error(`VOP calculation failed (${response.status})`);
  return response.json() as Promise<VopResult>;
}

export function encodeScenario(inputs: VopInputs): string {
  const compact = btoa(unescape(encodeURIComponent(JSON.stringify(inputs))));
  return `${window.location.origin}/creator?s=${encodeURIComponent(compact)}`;
}

export function decodeScenario(raw: string | null): VopInputs | null {
  if (!raw) return null;
  try {
    return { ...DEFAULT_INPUTS, ...JSON.parse(decodeURIComponent(escape(atob(raw)))) } as VopInputs;
  } catch {
    return null;
  }
}
