import { revalidateTag } from "next/cache";
import {
  clearPublicDataMemoryCache,
  PUBLIC_DATA_CACHE_TAGS
} from "@/lib/public-data-cache";

const allPublicDataCacheTags = Object.values(PUBLIC_DATA_CACHE_TAGS);

export function revalidatePublicDataCache(tags: string[] = allPublicDataCacheTags) {
  clearPublicDataMemoryCache();

  for (const tag of tags) {
    revalidateTag(tag);
  }
}
