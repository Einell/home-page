import { requestUrl, TFile, type App } from "obsidian";
import type { Photo } from "../settings";
import { CURATED } from "./curated";

const UTM = "utm_source=qiaomu_home&utm_medium=referral";
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "avif", "bmp"]);

function credit(url: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}${UTM}`;
}

export function curatedPhotos(): Photo[] {
  return CURATED.map(([id, path, author, username, color]) => ({
    id: `curated:${id}`,
    url: `https://images.unsplash.com/${path}`,
    author,
    authorUrl: credit(`https://unsplash.com/@${username}`),
    page: credit(`https://unsplash.com/photos/${id}`),
    color,
  }));
}

/** Picks a different photo from the list; random, but never the one on screen. */
export function nextCurated(currentId: string | undefined, random = Math.random): Photo {
  const photos = curatedPhotos();
  const pool = photos.length > 1 ? photos.filter((photo) => photo.id !== currentId) : photos;
  return pool[Math.floor(random() * pool.length) % pool.length];
}

/** Width to request: the screen in device pixels, rounded up to a 640px step so the cache key stays stable. */
export function targetWidth(screenWidth: number, pixelRatio: number): number {
  const needed = Math.min(2560, Math.max(1280, screenWidth * Math.min(pixelRatio, 2)));
  return Math.ceil(needed / 640) * 640;
}

export function sizedUrl(photo: Photo, width: number): string {
  const url = new URL(photo.url);
  url.searchParams.set("w", String(width));
  url.searchParams.set("q", "80");
  url.searchParams.set("fm", "jpg");
  url.searchParams.set("fit", "crop");
  return url.toString();
}

interface UnsplashRandom {
  id: string;
  color?: string;
  urls: { raw: string };
  links: { html: string; download_location: string };
  user: { name: string; links: { html: string } };
}

/** Fetches one random landscape photo through the official Unsplash API with the user's own Access Key. */
export async function randomFromUnsplash(accessKey: string, query: string): Promise<Photo> {
  const url = new URL("https://api.unsplash.com/photos/random");
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("content_filter", "high");
  if (query.trim()) url.searchParams.set("query", query.trim());
  const response = await requestUrl({ url: url.toString(), headers: { Authorization: `Client-ID ${accessKey}`, "Accept-Version": "v1" }, throw: false });
  if (response.status === 401 || response.status === 403) throw new Error("unsplash-auth");
  if (response.status === 404) throw new Error("unsplash-empty");
  if (response.status >= 400) throw new Error(`unsplash-${response.status}`);
  const photo = response.json as UnsplashRandom;
  if (!photo?.id || !photo.urls?.raw?.startsWith("https://")) throw new Error("unsplash-shape");
  return {
    id: `unsplash:${photo.id}`,
    url: photo.urls.raw,
    author: photo.user?.name ?? "",
    authorUrl: credit(photo.user?.links?.html ?? "https://unsplash.com"),
    page: credit(photo.links?.html ?? "https://unsplash.com"),
    ...(photo.color ? { color: photo.color } : {}),
    downloadLocation: photo.links?.download_location,
  };
}

/** The Unsplash API guidelines ask apps to report when a photo is used. Best effort; failure never blocks the page. */
export async function reportUnsplashUse(photo: Photo, accessKey: string): Promise<void> {
  if (!photo.downloadLocation?.startsWith("https://api.unsplash.com/")) return;
  try { await requestUrl({ url: photo.downloadLocation, headers: { Authorization: `Client-ID ${accessKey}` }, throw: false }); }
  catch { /* the photo is already shown; tracking is not critical */ }
}

export function localImage(app: App, path: string): string | null {
  const file = app.vault.getAbstractFileByPath(path);
  return file instanceof TFile && IMAGE_EXTENSIONS.has(file.extension.toLowerCase()) ? app.vault.getResourcePath(file) : null;
}

export function isImagePath(path: string): boolean {
  return IMAGE_EXTENSIONS.has(path.split(".").pop()?.toLowerCase() ?? "");
}

/**
 * Keeps the last few wallpapers on disk inside the plugin folder so Home opens instantly and offline.
 * The cache is rebuildable: any read or write failure falls back to the network URL.
 */
export class WallpaperCache {
  private pending = new Map<string, Promise<string | null>>();

  constructor(private app: App, private dir: string, private keep = 3) {}

  private fileFor(photo: Photo, width: number): string {
    return `${this.dir}/${photo.id.replace(/[^\w-]/g, "_")}-${width}.jpg`;
  }

  /** Resource URL of the cached image, or null when it is not on disk yet. */
  async cached(photo: Photo, width: number): Promise<string | null> {
    const path = this.fileFor(photo, width);
    try { return await this.app.vault.adapter.exists(path) ? this.app.vault.adapter.getResourcePath(path) : null; }
    catch { return null; }
  }

  /** Downloads the image once (concurrent callers share the request) and returns its local resource URL. */
  fetch(photo: Photo, width: number): Promise<string | null> {
    const path = this.fileFor(photo, width);
    const running = this.pending.get(path);
    if (running) return running;
    const task = (async () => {
      try {
        const response = await requestUrl({ url: sizedUrl(photo, width), throw: false });
        const type = response.headers["content-type"] ?? response.headers["Content-Type"] ?? "";
        if (response.status !== 200 || !type.startsWith("image/")) return null;
        const adapter = this.app.vault.adapter;
        if (!await adapter.exists(this.dir)) await adapter.mkdir(this.dir);
        await adapter.writeBinary(path, response.arrayBuffer);
        await this.prune(path);
        return adapter.getResourcePath(path);
      } catch {
        return null;
      } finally {
        this.pending.delete(path);
      }
    })();
    this.pending.set(path, task);
    return task;
  }

  private async prune(justWritten: string): Promise<void> {
    const adapter = this.app.vault.adapter;
    const listing = await adapter.list(this.dir);
    const files = await Promise.all(listing.files.filter((file) => file.endsWith(".jpg")).map(async (file) => ({ file, mtime: (await adapter.stat(file))?.mtime ?? 0 })));
    const stale = files.filter((entry) => entry.file !== justWritten).sort((a, b) => b.mtime - a.mtime).slice(this.keep - 1);
    for (const entry of stale) {
      try { await adapter.remove(entry.file); } catch { /* another window may have removed it */ }
    }
  }
}
