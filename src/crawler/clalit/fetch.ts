export async function fetchClalitHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache"
    }
  });

  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} ${response.statusText} for ${url}`);
  }

  return response.text();
}
