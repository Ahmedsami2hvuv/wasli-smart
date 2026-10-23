export const IRAQ_GOVERNORATES = [
  'بغداد',
  'البصرة',
  'نينوى',
  'أربيل',
  'النجف الأشرف',
  'كربلاء المقدسة',
  'كركوك',
  'الأنبار',
  'ذي قار',
  'بابل',
  'السليمانية',
  'دهوك',
  'ديالى',
  'ميسان',
  'الديوانية (القادسية)',
  'واسط',
  'صلاح الدين',
  'المثنى',
] as const;

export type IraqGovernorate = (typeof IRAQ_GOVERNORATES)[number];
