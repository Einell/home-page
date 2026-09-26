import type { Photo } from "../settings";
import { localDay } from "../settings";
import type QiaomuHomePlugin from "../main";
import { WallpaperCache, curatedPhotos, localImage, nextCurated, randomFromUnsplash, reportUnsplashUse, sizedUrl, targetWidth } from "./wallpaper";

export interface ShownWallpaper {
  url: string;
  color?: string;
  /** Present for Unsplash photos, which must be credited. */
  photo?: Photo;
}

/** Owns which wallpaper is current, rotation, and the on-disk cache. Views ask it what to show. */
export class WallpaperService {
  readonly cache: WallpaperCache;
  private choosing: Promise<void> | null = null;
  private lastError = "";

  constructor(private plugin: QiaomuHomePlugin) {
    this.cache = new WallpaperCache(plugin.app, `${plugin.manifest.dir ?? `${plugin.app.vault.configDir}/plugins/${plugin.manifest.id}`}/wallpapers`);
  }

  canRotate(): boolean {
    const source = this.plugin.settings.wallpaper.source;
    return source === "curated" || source === "unsplash";
  }

  /** The reason the last Unsplash request failed, for the settings page. Empty when it worked. */
  error(): string { return this.lastError; }

  /** Called whenever a Home page opens: rotates the photo when the rotation rule says it is time. */
  async prepareForView(): Promise<void> {
    const wall = this.plugin.settings.wallpaper;
    if (!this.canRotate()) return;
    const due = !wall.current
      || (wall.source === "curated") !== wall.current.id.startsWith("curated:")
      || wall.rotation === "open"
      || wall.rotation === "daily" && wall.chosenOn !== localDay();
    if (due) await this.choose();
  }

  /** User asked for another photo. */
  async next(): Promise<void> {
    await this.choose();
  }

  private choose(): Promise<void> {
    // Several Home tabs opening together (startup, split) share one choice instead of each picking a photo.
    this.choosing ??= this.pick().finally(() => { this.choosing = null; });
    return this.choosing;
  }

  private async pick(): Promise<void> {
    const wall = this.plugin.settings.wallpaper;
    let photo: Photo | null = null;
    if (wall.source === "unsplash") {
      const key = this.accessKey();
      if (key) {
        try {
          photo = await randomFromUnsplash(key, wall.query);
          this.lastError = "";
          void reportUnsplashUse(photo, key);
        } catch (error) {
          this.lastError = error instanceof Error ? error.message : String(error);
        }
      } else this.lastError = "unsplash-no-key";
    }
    // Without a key, or when Unsplash is unreachable, the built-in gallery keeps Home beautiful.
    photo ??= nextCurated(wall.current?.id);
    wall.current = photo;
    wall.chosenOn = localDay();
    await this.plugin.saveSettings({ rerender: false });
    this.plugin.eachView((view) => void view.renderPhoto());
  }

  accessKey(): string {
    const id = this.plugin.settings.wallpaper.unsplashSecret;
    if (!id) return "";
    try { return this.plugin.app.secretStorage.getSecret(id) ?? ""; }
    catch { return ""; }
  }

  /** What a Home page in this window should display right now. Prefers the local copy; downloads one for next time. */
  async resolve(win: Window): Promise<ShownWallpaper | null> {
    const wall = this.plugin.settings.wallpaper;
    if (wall.source === "none") return null;
    if (wall.source === "local") {
      const url = wall.localPath ? localImage(this.plugin.app, wall.localPath) : null;
      return url ? { url } : null;
    }
    const photo = wall.current ?? curatedPhotos()[0];
    const width = targetWidth(win.screen?.width ?? 1920, win.devicePixelRatio || 1);
    const cached = await this.cache.cached(photo, width);
    if (!cached) void this.cache.fetch(photo, width);
    return { url: cached ?? sizedUrl(photo, width), photo, ...(photo.color ? { color: photo.color } : {}) };
  }
}
