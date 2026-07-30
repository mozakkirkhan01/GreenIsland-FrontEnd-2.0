/**
 * Loads images pdfmake can embed (pdfmake requires a base64 data URL, not a
 * plain path — passing a URL string directly renders a blank box).
 *
 * COVER IMAGE — "determine automatically, no hardcoded filenames":
 * A browser has no filesystem access, so there is no way to "scan" the
 * assets folder at runtime. What IS achievable without inventing data is a
 * naming CONVENTION: slugify(DestinationName) -> assets/img/covers/{slug}.jpg.
 * If that file 404s, falls back to assets/img/covers/default.jpg. This means
 * whoever adds a new destination must name its cover image to match the
 * slug — that's a real constraint, not a limitation of this code.
 *
 * If you'd rather not depend on a filename convention at all, add a
 * CoverImageUrl (or CoverImageFileName) field to Destination /
 * TripInfoModel on the backend and change loadCoverImage to use that
 * directly instead of slugifying the name.
 */
export class PdfImageLoader {
  private readonly coverBasePath = 'assets/img/covers';
  private readonly logoPath = 'assets/img/logo.png';
  private cache = new Map<string, string | null>();

  async loadCoverImage(destinationName: string | null | undefined): Promise<string | null> {
    const slug = this.slugify(destinationName || '');
    const candidates = slug
      ? [`${this.coverBasePath}/${slug}.jpg`, `${this.coverBasePath}/${slug}.png`]
      : [];
    candidates.push(`${this.coverBasePath}/default.jpg`, `${this.coverBasePath}/default.png`);

    for (const path of candidates) {
      const dataUrl = await this.tryLoad(path);
      if (dataUrl) return dataUrl;
    }
    return null; // caller must handle a missing cover gracefully — never fabricate a placeholder photo
  }

  async loadLogo(): Promise<string | null> {
    return this.tryLoad(this.logoPath);
  }

  private async tryLoad(path: string): Promise<string | null> {
    if (this.cache.has(path)) return this.cache.get(path)!;
    try {
      const response = await fetch(path);
      if (!response.ok) {
        this.cache.set(path, null);
        return null;
      }
      const blob = await response.blob();
      const dataUrl = await this.blobToDataUrl(blob);
      this.cache.set(path, dataUrl);
      return dataUrl;
    } catch {
      this.cache.set(path, null);
      return null;
    }
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}