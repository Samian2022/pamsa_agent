export type SearchHit = {
  title: string;
  url: string;
  snippet: string;
};

export async function webSearch(query: string): Promise<{
  answer?: string;
  results: SearchHit[];
  provider: string;
}> {
  if (process.env.TAVILY_API_KEY) {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: "advanced",
        max_results: 8,
        include_answer: true,
      }),
    });
    if (!response.ok) {
      throw new Error(`Tavily search failed (${response.status})`);
    }
    const data = (await response.json()) as {
      answer?: string;
      results?: { title?: string; url?: string; content?: string }[];
    };
    return {
      provider: "tavily",
      answer: data.answer,
      results: (data.results || []).map((item) => ({
        title: item.title || item.url || "Result",
        url: item.url || "",
        snippet: item.content || "",
      })),
    };
  }

  if (process.env.BRAVE_SEARCH_API_KEY) {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", "8");
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY,
      },
    });
    if (!response.ok) {
      throw new Error(`Brave search failed (${response.status})`);
    }
    const data = (await response.json()) as {
      web?: { results?: { title?: string; url?: string; description?: string }[] };
    };
    return {
      provider: "brave",
      results: (data.web?.results || []).map((item) => ({
        title: item.title || item.url || "Result",
        url: item.url || "",
        snippet: item.description || "",
      })),
    };
  }

  return {
    provider: "none",
    results: [],
    answer:
      "No search API key is configured. Ask the user for URLs or set TAVILY_API_KEY / BRAVE_SEARCH_API_KEY.",
  };
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchUrl(url: string) {
  const response = await fetch(url, {
    headers: { "User-Agent": "PAMSA-Agent/1.0 (team research)" },
    redirect: "follow",
  });
  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text();
  const text = contentType.includes("html") ? stripHtml(raw) : raw;
  return {
    url,
    status: response.status,
    text: text.slice(0, 12000),
    truncated: text.length > 12000,
  };
}
