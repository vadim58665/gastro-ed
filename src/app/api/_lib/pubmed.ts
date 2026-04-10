const BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

export async function searchPubMed(
  query: string,
  maxResults = 3
): Promise<string[]> {
  const params = new URLSearchParams({
    db: "pubmed",
    term: query,
    retmax: String(maxResults),
    retmode: "json",
  });

  const res = await fetch(`${BASE}/esearch.fcgi?${params}`);
  if (!res.ok) return [];

  const data = await res.json();
  return data.esearchresult?.idlist ?? [];
}

export async function fetchAbstracts(
  pmids: string[]
): Promise<{ pmid: string; title: string; abstract: string }[]> {
  if (pmids.length === 0) return [];

  const params = new URLSearchParams({
    db: "pubmed",
    id: pmids.join(","),
    retmode: "json",
    rettype: "abstract",
  });

  const res = await fetch(`${BASE}/esummary.fcgi?${params}`);
  if (!res.ok) return [];

  const data = await res.json();
  const result: { pmid: string; title: string; abstract: string }[] = [];

  for (const pmid of pmids) {
    const item = data.result?.[pmid];
    if (item) {
      result.push({
        pmid,
        title: item.title ?? "",
        abstract: item.sorttitle ?? "",
      });
    }
  }

  return result;
}

export async function validateFact(
  claim: string,
  topic: string
): Promise<{ supported: boolean; refs: string[] }> {
  const query = `${topic} ${claim}`;
  const pmids = await searchPubMed(query, 3);
  return { supported: pmids.length > 0, refs: pmids };
}
