export type MockClient = {
  id: string;
  name: string;
  subtitle: string;
  status: string;
  goal: string;
  experience: string;
  constraints: string;
  recoveryCapacity: string;
  targetState: string;
};

export const MOCK_CLIENTS: MockClient[] = [
  {
    id: "self",
    name: "Daniel Hendel",
    subtitle: "Self — Prototype Client",
    status: "Prototype Client",
    goal: "Muscle Gain / Health Optimization",
    experience: "Advanced",
    constraints: "Shoulder mobility monitored; no maximal loading on overhead press this phase.",
    recoveryCapacity: "Moderate — 7.2h avg sleep, readiness trending stable",
    targetState: "Level 4 upper-body strength, improved body composition, sustainable training rhythm",
  },
];

export function getMockClient(clientId: string): MockClient | undefined {
  return MOCK_CLIENTS.find((client) => client.id === clientId);
}
