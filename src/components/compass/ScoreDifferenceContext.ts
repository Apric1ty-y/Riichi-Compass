import { createContext } from "react";

export const ScoreDifferenceContext = createContext<{
  referenceIndex: number | null;
  setReferenceIndex: (index: number | null) => void;
}>({ referenceIndex: null, setReferenceIndex: () => {} });
