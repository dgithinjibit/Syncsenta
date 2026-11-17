import type { StrandInfo } from "../types";

// Helper to create standard 4 sub-strands per Mada (each 3 Vipindi)
function mada(name: string): StrandInfo {
  return {
    name,
    subStrands: [
      { name: "Kusikiliza na Kuzungumza", lessons: 3 },
      { name: "Kusoma", lessons: 3 },
      { name: "Kuandika", lessons: 3 },
      { name: "Sarufi", lessons: 3 },
    ],
  };
}

// ─── Grade 1 Kiswahili (Verified from KICD PDF: Gredi ya 1) ───
export const grade1Kiswahili: StrandInfo[] = [
  mada("1.0 Darasani"),
  mada("2.0 Familia"),
  mada("3.0 Tarakimu"),
  mada("4.0 Siku za Wiki"),
  mada("5.0 Mimi na Wenzangu"),
  mada("6.0 Mwili Wangu"),
  mada("7.0 Usafi wa Mwili"),
  mada("8.0 Vyakula Vyetu"),
  mada("9.0 Jikoni"),
  mada("10.0 Michezo"),
];

// ─── Grade 2 Kiswahili (Verified from KICD PDF: Gredi ya 2) ───
export const grade2Kiswahili: StrandInfo[] = [
  mada("1.0 Shuleni"),
  mada("2.0 Haki Zangu"),
  mada("3.0 Lishe Bora"),
  mada("4.0 Usafiri"),
  mada("5.0 Mnyama Nimpendaye"),
  mada("6.0 Ukoo"),
  {
    name: "7.0 Sebuleni",
    subStrands: [
      { name: "7.1 Maagizo – Maagizo ya hatua mbili", lessons: 3 },
      { name: "7.2 Kusoma kwa Ufahamu – Kifungu", lessons: 3 },
      { name: "7.3 Uhariri – Vipengele vya kuhariri", lessons: 3 },
      { name: "7.4 Ukanusho wa nafsi ya pili, umoja na wingi", lessons: 3 },
    ],
  },
  {
    name: "8.0 Usalama Wangu",
    subStrands: [
      { name: "8.1 Kusikiliza na Kuzungumza – Matamshi Bora (Sauti: /sh/, /th/)", lessons: 3 },
      { name: "8.2 Kusoma kwa ufasaha (Sauti: /sh/ na /th/)", lessons: 3 },
      { name: "8.3 Kuandika – Tahajia", lessons: 3 },
      { name: "8.4 Sarufi – Matumizi ya huu na hii", lessons: 3 },
    ],
  },
  {
    name: "9.0 Hospitalini",
    subStrands: [
      { name: "9.1 Kusikiliza na Kuzungumza – Mazungumzo ya papo kwa hapo", lessons: 3 },
      { name: "9.2 Kusoma kwa ufahamu – Kifungu", lessons: 3 },
      { name: "9.3 Kuandika – Kuandika Kifungu", lessons: 3 },
      { name: "9.4 Sarufi – Matumizi ya vizuri na vibaya, polepole na haraka", lessons: 3 },
    ],
  },
  {
    name: "10.0 Hali ya Anga",
    subStrands: [
      { name: "10.1 Kusikiliza na Kuzungumza – Matamshi Bora (Alfabeti ya Kiswahili)", lessons: 3 },
      { name: "10.2 Kusoma kwa ufasaha – Kusoma kifungu", lessons: 3 },
      { name: "10.3 Kuandika – Maneno Na Sentensi", lessons: 3 },
      { name: "10.4 Sarufi – Vinyume vya Vitendo", lessons: 3 },
    ],
  },
];

// ─── Grade 3 Kiswahili (Verified from KICD PDF: Gredi ya 3) ───
export const grade3Kiswahili: StrandInfo[] = [
  mada("1.0 Uzalendo"),
  mada("2.0 Shambani"),
  mada("3.0 Miezi ya Mwaka"),
  mada("4.0 Kazi Mbalimbali"),
  mada("5.0 Usalama"),
  mada("6.0 Usafi wa Mazingira"),
  mada("7.0 Dukani"),
  mada("8.0 Ndege Nimpendaye"),
  mada("9.0 Sokoni"),
  mada("10.0 Teknolojia"),
];
