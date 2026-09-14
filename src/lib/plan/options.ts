import type { Condition, Equipment, Experience, Injury, Sex } from "./rules";

export const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: "male", label: "MALE" },
  { value: "female", label: "FEMALE" },
];

export const EXPERIENCE_OPTIONS: { value: Experience; label: string }[] = [
  { value: "beginner", label: "NEW" },
  { value: "intermediate", label: "1 TO 3 YRS" },
  { value: "advanced", label: "3 YRS +" },
];

export const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: "none", label: "NONE" },
  { value: "dumbbell", label: "DUMBBELLS" },
  { value: "gym", label: "GYM" },
  { value: "full", label: "FULL GYM" },
];

export const INJURY_OPTIONS: { value: Injury; label: string }[] = [
  { value: "knee", label: "KNEE" },
  { value: "shoulder", label: "SHOULDER" },
  { value: "lower_back", label: "LOWER BACK" },
  { value: "elbow", label: "ELBOW" },
];

/** Every condition the model or the refusal list knows. */
export const CONDITION_OPTIONS: { value: Condition; label: string }[] = [
  { value: "hypothyroid", label: "HYPOTHYROID" },
  { value: "pcos", label: "PCOS" },
  { value: "insulin_resistance", label: "INSULIN RESISTANCE" },
  { value: "hypertension", label: "HIGH BLOOD PRESSURE" },
  { value: "type1_diabetes", label: "TYPE 1 DIABETES" },
  { value: "ckd", label: "KIDNEY DISEASE" },
  { value: "pregnancy", label: "PREGNANT" },
  { value: "breastfeeding", label: "BREASTFEEDING" },
  { value: "eating_disorder_history", label: "EATING DISORDER HISTORY" },
  { value: "cancer_treatment", label: "CANCER TREATMENT" },
];

/** Male-only profiles never see these. */
export const FEMALE_ONLY_CONDITIONS = new Set<string>(["pcos", "pregnancy", "breastfeeding"]);
