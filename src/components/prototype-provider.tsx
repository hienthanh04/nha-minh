"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { createMockData, households, type MockFoodBatch } from "@/lib/mock-data";

type PrototypeState = ReturnType<typeof createMockData> & {
  houseworkAt: string | null;
  checkInHousework: () => void;
  finishFood: () => void;
  receiveFood: () => void;
};

const PrototypeContext = createContext<PrototypeState | null>(null);

export function PrototypeProvider({ today, children }: { today: string; children: ReactNode }) {
  const [initial] = useState(() => createMockData(today));
  const [houseworkAt, setHouseworkAt] = useState<string | null>(null);
  const [foodBatches, setFoodBatches] = useState<MockFoodBatch[]>(initial.foodBatches);

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
    ...initial, houseworkAt, foodBatches,
    finishFood, receiveFood,
    checkInHousework: () => setHouseworkAt((previous) => previous ?? new Date().toISOString()),
  }}>{children}</PrototypeContext.Provider>;
}

export function usePrototype() {
  const value = useContext(PrototypeContext);
  if (!value) throw new Error("PrototypeProvider is required");
  return value;
}
