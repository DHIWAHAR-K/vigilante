use regex::Regex;
use serde_json::Value;
use url::Url;

use crate::error::VResult;
use crate::models::desktop::{SearchResult, WebSource};
use crate::models::settings::SearchSettings;
use crate::services::scrapling_service;
use crate::storage::paths::StoragePaths;

pub async fn discover_urls(query: &str, settings: &SearchSettings) -> VResult<Vec<SearchResult>> {
    let direct_urls = extract_direct_urls(query);
    if !direct_urls.is_empty() {
        return Ok(direct_urls
            .into_iter()
            .enumerate()
            .map(|(index, url)| SearchResult {
                title: url.clone(),
                url,
                snippet: "Direct URL".into(),
                rank: (index + 1) as u32,
            })
            .collect());
    }

    if let Some(base_url) = settings.searxng_base_url.as_deref() {
        let results = searxng_search(query, base_url).await?;
        if !results.is_empty() {
            return Ok(results);
        }
    }

    duckduckgo_search(query).await
}

pub async fn fetch_sources(
    paths: &StoragePaths,
    results: &[SearchResult],
    max_sources: usize,
) -> VResult<Vec<WebSource>> {
    let mut sources = Vec::new();

    for result in results.iter().take(max_sources) {
        if let Ok(source) = scrapling_service::fetch_url(paths, &result.url).await {
            sources.push(source);
        }
    }

    Ok(sources)
}

fn extract_direct_urls(query: &str) -> Vec<String> {
    let regex = Regex::new(r#"https?://[^\s]+"#).expect("valid URL regex");
    regex
        .find_iter(query)
        .map(|capture| {
            capture
                .as_str()
                .trim_end_matches([')', ']', ',', '.'])
                .to_string()
        })
        .collect()
}

async fn searxng_search(query: &str, base_url: &str) -> VResult<Vec<SearchResult>> {
    let client = reqwest::Client::new();
    let response: Value = client
        .get(format!("{}/search", base_url.trim_end_matches('/')))
        .query(&[("q", query), ("format", "json"), ("language", "en-US")])
        .send()
        .await?
        .json()
        .await?;

    let mut results = Vec::new();
    if let Some(items) = response
        .get("web")
        .and_then(|web| web.get("results"))
        .and_then(|results| results.as_array())
    {
        for (index, item) in items.iter().enumerate() {
            let Some(url) = item.get("url").and_then(|value| value.as_str()) else {
                continue;
            };
            let title = item
                .get("title")
                .and_then(|value| value.as_str())
                .unwrap_or(url);
            let snippet = item
                .get("description")
                .and_then(|value| value.as_str())
                .unwrap_or_default();

            results.push(SearchResult {
                title: title.to_string(),
                url: url.to_string(),
                snippet: snippet.to_string(),
                rank: (index + 1) as u32,
            });
        }
    }

    Ok(results)
}

async fn duckduckgo_search(query: &str) -> VResult<Vec<SearchResult>> {
    let client = reqwest::Client::new();
    let html = client
        .get("https://html.duckduckgo.com/html/")
        .query(&[("q", query)])
        .send()
        .await?
        .text()
        .await?;

    let result_regex = Regex::new(
        r#"(?s)<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>.*?(?:<a[^>]*class="result__snippet"[^>]*>(.*?)</a>|<div[^>]*class="result__snippet"[^>]*>(.*?)</div>)"#,
    )
    .expect("valid duckduckgo regex");
    let tag_regex = Regex::new(r"<[^>]+>").expect("valid tag regex");

    let mut results = Vec::new();
    for (index, capture) in result_regex.captures_iter(&html).enumerate() {
        let Some(raw_url) = capture.get(1).map(|value| value.as_str()) else {
            continue;
        };
        let Some(url) = extract_duckduckgo_target(raw_url) else {
            continue;
        };
        let title_html = capture
            .get(2)
            .map(|value| value.as_str())
            .unwrap_or_default();
        let snippet_html = capture
            .get(3)
            .or_else(|| capture.get(4))
            .map(|value| value.as_str())
            .unwrap_or_default();

        results.push(SearchResult {
            title: decode_html_entities(&tag_regex.replace_all(title_html, "")),
            url,
            snippet: decode_html_entities(&tag_regex.replace_all(snippet_html, "")),
            rank: (index + 1) as u32,
        });
    }

    Ok(results)
}

fn extract_duckduckgo_target(raw_url: &str) -> Option<String> {
    let resolved = Url::parse(&format!("https://html.duckduckgo.com{raw_url}"))
        .or_else(|_| Url::parse(raw_url))
        .ok()?;

    if let Some(target) = resolved
        .query_pairs()
        .find_map(|(key, value)| (key == "uddg").then(|| value.to_string()))
    {
        return Some(target);
    }

    Some(resolved.to_string())
}

fn decode_html_entities(input: &str) -> String {
    input
        .replace("&amp;", "&")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&nbsp;", " ")
        .trim()
        .to_string()
}
