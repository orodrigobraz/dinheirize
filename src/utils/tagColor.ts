/**
 * Gera uma cor HSL única, visualmente vibrante e consistente para uma tag.
 *
 * Estratégia:
 * - Fazer o hash do nome da tag para um número estável.
 * - Multiplicar pelo ângulo de ouro (137.508°) para espalhar os matizes uniformemente por todo
 *   o espectro — isto garante que valores de hash próximos caiam em matizes muito diferentes,
 *   então duas tags diferentes quase nunca parecem iguais.
 * - Fixar saturação em 75% e luminosidade em 62% para cores vívidas que se destacam em fundos
 *   escuros sem serem ofuscantes.
 * - Pular a faixa verde-amarelo (55°–85°) que parece opaca em interfaces escuras.
 */

import type { Tag } from '../types/finance';

const GOLDEN_ANGLE = 137.508; // graus

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(hash, 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash >>> 0);
}

function remapHue(rawHue: number): number {
  const SKIP_START = 55;
  const SKIP_END = 85;
  const SKIP_WIDTH = SKIP_END - SKIP_START;

  const h = rawHue % 360;
  if (h < SKIP_START) return h;
  return SKIP_END + ((h - SKIP_START) * (360 - SKIP_END)) / (360 - SKIP_START - SKIP_WIDTH);
}

export function getTagColor(tagName: string, allTags?: Tag[]): string {
  const normalizedName = tagName.toLowerCase().trim();
  let index = -1;

  if (allTags && allTags.length > 0) {
    // Ordenar de forma estável por ID para manter exatamente a mesma sequência permanentemente.
    const sortedTags = [...allTags].sort((a, b) => a.id.localeCompare(b.id));
    index = sortedTags.findIndex(t => t.name.toLowerCase().trim() === normalizedName);
  }

  // Usar hash aleatório APENAS se a tag não for encontrada no contexto (ex: digitando uma nova)
  if (index === -1) {
    const hash = hashString(normalizedName);
    index = Math.abs(hash >>> 0) % 1000 + (allTags ? allTags.length : 0);
  }

  // O multiplicador do ângulo de ouro funciona perfeitamente quando o índice é sequencial 0, 1, 2...
  // Cada tag subsequente é espaçada 137.5 graus, prevenindo matematicamente qualquer agrupamento.
  const rawHue = (index * GOLDEN_ANGLE) % 360;
  const hue = remapHue(rawHue);

  const saturation = 80; // % — vívido mas não neon
  const lightness = 65;  // % — claro o suficiente para contraste em interface escura

  return `hsl(${hue.toFixed(1)}, ${saturation}%, ${lightness}%)`;
}
