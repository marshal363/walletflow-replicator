// Helper function to calculate notification priority
export function calculatePriority(
  base: "high" | "medium" | "low",
  modifiers: {
    actionRequired: boolean;
    timeConstraint: boolean;
    amount: number;
    role: "sender" | "recipient";
  }
): number {
  const basePriority = {
    high: 70,
    medium: 40,
    low: 10,
  }[base];

  const modifierValues = {
    actionRequired: 20,
    timeConstraint: 15,
    largeAmount: 10,
    recipientRole: 5,
  };

  return Math.min(
    100,
    basePriority +
      (modifiers.actionRequired ? modifierValues.actionRequired : 0) +
      (modifiers.timeConstraint ? modifierValues.timeConstraint : 0) +
      (modifiers.amount > 100000 ? modifierValues.largeAmount : 0) +
      (modifiers.role === "recipient" ? modifierValues.recipientRole : 0)
  );
} 