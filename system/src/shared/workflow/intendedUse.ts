export const INTENDED_USE_OPTIONS = [
  { value: 'cardiovascular-support', label: 'Cardiovascular support' },
  { value: 'cardiac-rhythm', label: 'Cardiac rhythm management' },
  { value: 'orthopedic-reconstruction', label: 'Orthopedic reconstruction & joint replacement' },
  { value: 'trauma-fixation', label: 'Trauma & fixation' },
  { value: 'neurostimulation', label: 'Neurostimulation & neuromodulation' },
  { value: 'neurological-monitoring', label: 'Neurological monitoring & diagnostics' },
  { value: 'minimally-invasive', label: 'Minimally invasive / interventional procedures' },
  { value: 'surgical-instruments', label: 'Surgical instruments & systems' },
  { value: 'drug-delivery', label: 'Drug delivery systems' },
  { value: 'ivd', label: 'In vitro diagnostics (IVD)' },
  { value: 'physiological-monitoring', label: 'Physiological monitoring & diagnostics' },
  { value: 'samd', label: 'Software as a Medical Device (SaMD)' },
  { value: 'ai-enabled', label: 'AI-enabled medical device' },
  { value: 'ophthalmic', label: 'Ophthalmic devices' },
  { value: 'dental', label: 'Dental devices' },
  { value: 'respiratory', label: 'Respiratory & pulmonary support' },
  { value: 'other-custom', label: 'Other / Custom intended use' },
] as const;

const INTENDED_USE_VALUES = new Set<string>(
  INTENDED_USE_OPTIONS.map(option => option.value),
);


export function normalizeStoredIntendedUse(
  storedValue: unknown,
  storedCustomValue?: unknown,
): { intendedUse: string; customIntendedUse: string } {
  const intendedUse = typeof storedValue === 'string' ? storedValue.trim() : '';
  const customIntendedUse = typeof storedCustomValue === 'string'
    ? storedCustomValue.trim()
    : '';

  if (!intendedUse) {
    return { intendedUse: '', customIntendedUse: '' };
  }

  if (INTENDED_USE_VALUES.has(intendedUse)) {
    return {
      intendedUse,
      customIntendedUse: intendedUse === 'other-custom' ? customIntendedUse : '',
    };
  }

  //  before the dropdown existed, Project Setup stored the
  // the complete free-text description directly in `intendedUse`.
  return {
    intendedUse: 'other-custom',
    customIntendedUse: intendedUse,
  };
}

export function intendedUseLabel(value: string): string {
  return INTENDED_USE_OPTIONS.find(option => option.value === value)?.label ?? value;
}
