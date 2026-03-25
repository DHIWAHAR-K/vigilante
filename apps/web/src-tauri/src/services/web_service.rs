use regex::Regex;
use reqwest::header::{HeaderMap, HeaderValue};
use serde_json::Value;

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

    if let Some(api_key) = settings.brave_api_key.as_deref() {
        return brave_search(query, api_key).await;
    }

    Ok(Vec::new())
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
        .map(|capture| capture.as_str().trim_end_matches([')', ']', ',', '.']).to_string())
        .collect()
}

async fn brave_search(query: &str, api_key: &str) -> VResult<Vec<SearchResult>> {
    let mut headers = HeaderMap::new();
    headers.insert(
        "X-Subscription-Token",
        HeaderValue::from_str(api_key).expect("valid Brave API key header"),
    );
    headers.insert("Accept", HeaderValue::from_static("application/json"));

    let client = reqwest::Client::new();
    let response: Value = client
        .get("https://api.search.brave.com/res/v1/web/search")
        .headers(headers)
        .query(&[("q", query), ("count", "5")])
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
