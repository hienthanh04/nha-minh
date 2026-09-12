"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { createMockData, currentUser, households, type DinnerPlan, type MemberId, type MockDuty, type MockFoodBatch } from "@/lib/mock-data";

type PrototypeState = ReturnType<typeof createMockData> & {
  houseworkAt: string | null;
  completeDuty: (id: string) => void;
  delegateDuty: (id: string, member: MemberId | null) => void;
  setDinnerPlan: (plan: DinnerPlan) => void;
  checkInDinner: () => void;
  checkInHousework: () => void;
  finishFood: () => void;
  receiveFood: () => void;
};

const PrototypeContext = createContext<PrototypeState | null>(null);

export function PrototypeProvider({ today, children }: { today: string; children: ReactNode }) {
  const [initial] = useState(() => createMockData(today));
  const [duties, setDuties] = useState<MockDuty[]>(initial.duties);
  const [dinnerPlans, setDinnerPlans] = useState(initial.dinnerPlans);
  const [dinnerCheckins, setDinnerCheckins] = useState(initial.dinnerCheckins);
  const [houseworkAt, setHouseworkAt] = useState<string | null>(null);
  const [foodBatches, setFoodBatches] = useState<MockFoodBatch[]>(initial.foodBatches);

  function completeDuty(id: string) {
    const timestamp = new Date().toISOString();
    setDuties((items) => items.map((duty) =>
      duty.id === id && !duty.completedAt && duty.date <= initial.kitchenDate &&
      (duty.delegatedTo ?? duty.assignedTo) === currentUser.id
        ? { ...duty, completedAt: timestamp, completedBy: currentUser.id } : duty,
    ));
  }

  function delegateDuty(id: string, member: MemberId | null) {
    if (member === currentUser.id) return;
    setDuties((items) => items.map((duty) =>
      duty.id === id && duty.assignedTo === currentUser.id && !duty.completedAt
        ? { ...duty, delegatedTo: member } : duty,
    ));
  }

  function setDinnerPlan(plan: DinnerPlan) {
    if (dinnerCheckins[currentUser.id]) return;
    setDinnerPlans((previous) => ({ ...previous, [currentUser.id]: plan }));
  }

  function checkInDinner() {
    if (dinnerPlans[currentUser.id] !== "eating") return;
    const timestamp = new Date().toISOString();
    setDinnerCheckins((previous) => ({ ...previous, [currentUser.id]: previous[currentUser.id] ?? timestamp }));
  }

  function finishFood() {
    const timestamp = new Date().toISOString();
    setFoodBatches((previous) => {
      const current = previous.at(-1)!;
      if (current.status !== "active") return previous;
      return [
        ...previous.slice(0, -1), { ...current, status: "finished", finishedAt: timestamp },
        { id: current.id + 1, householdIndex: (current.householdIndex + 1) % households.length, status: "waiting", startedAt: null, finishedAt: null },
      ];
    });
  }

  function receiveFood() {
    const timestamp = new Date().toISOString();
    setFoodBatches((previous) => previous.map((batch) => batch.status === "waiting"
      ? { ...batch, status: "active", startedAt: timestamp } : batch));
  }

  return <PrototypeContext.Provider value={{
    ...initial, duties, dinnerPlans, dinnerCheckins, houseworkAt, foodBatches,
    completeDuty, delegateDuty, setDinnerPlan, checkInDinner, finishFood, receiveFood,
    checkInHousework: () => setHouseworkAt((previous) => previous ?? new Date().toISOString()),
  }}>{children}</PrototypeContext.Provider>;
}

export function usePrototype() {
  const value = useContext(PrototypeContext);
  if (!value) throw new Error("PrototypeProvider is required");
  return value;
}
