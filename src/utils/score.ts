export function scoreOn20(validScore?: number): number {
    // If backend later returns /20 directly, just return it.
    // For now we “best effort” map: validScore seems like a level; you can adjust later.
    // Example: clamp 0..20
    if (typeof validScore !== "number") return 0;
    return Math.max(0, Math.min(20, Math.round(validScore * 20))); // TEMP mapping
  }
  
  export function starsFrom20(score20: number): number {
    // 0..20 => 0..5 stars
    return Math.round((score20 / 20) * 5);
  }
  