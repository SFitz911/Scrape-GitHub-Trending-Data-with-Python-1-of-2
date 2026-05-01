import requests
from bs4 import BeautifulSoup
import json
import time
import argparse  # --- CHANGE A: New import for command-line argument parsing ---

TRENDING_URL = "https://github.com/trending"
API_BASE_URL = "https://api.github.com/repos"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

API_HEADERS = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "GitHub-Trending-Scraper",
}


# --- CHANGE B: Function now accepts a url parameter instead of using the global TRENDING_URL ---
def fetch_trending_page(url):
    """Fetch the GitHub Trending page HTML."""
    response = requests.get(url, headers=HEADERS)
    response.raise_for_status()
    return response.text


def parse_trending_repos(html):
    """Parse trending repositories from HTML."""
    soup = BeautifulSoup(html, "html.parser")
    repos = []

    for article in soup.find_all("article", class_="Box-row"):
        title_tag = article.find("h2").find("a")
        href = title_tag["href"].strip()
        name = href.strip("/")
        url = f"https://github.com{href}"

        desc_tag = article.find("p", class_="col-9")
        description = desc_tag.get_text(strip=True) if desc_tag else ""

        lang_tag = article.find("span", attrs={"itemprop": "programmingLanguage"})
        language = lang_tag.get_text(strip=True) if lang_tag else ""

        stars_tag = article.find("a", href=lambda h: h and "/stargazers" in h)
        stars_text = stars_tag.get_text(strip=True) if stars_tag else "0"
        stars = int(stars_text.replace(",", ""))

        forks_tag = article.find("a", href=lambda h: h and "/network/members" in h)
        forks_text = forks_tag.get_text(strip=True) if forks_tag else "0"
        forks = int(forks_text.replace(",", ""))

        today_tag = article.find("span", class_="d-inline-block float-sm-right")
        stars_today = 0
        if today_tag:
            today_text = today_tag.get_text(strip=True)
            stars_today = int(today_text.split()[0].replace(",", ""))

        repos.append({
            "name": name,
            "description": description,
            "language": language,
            "stars": stars,
            "forks": forks,
            "stars_today": stars_today,
            "url": url,
        })

    return repos


def enrich_with_api(repos):
    """Enrich repository data using the GitHub REST API."""
    enriched = []
    total = len(repos)

    for i, repo in enumerate(repos, 1):
        print(f"  Enriching {i}/{total}: {repo['name']}")
        api_url = f"{API_BASE_URL}/{repo['name']}"

        try:
            response = requests.get(api_url, headers=API_HEADERS)
            if response.status_code == 200:
                data = response.json()
                repo["issues"] = data.get("open_issues_count", 0)
                license_info = data.get("license")
                repo["license"] = license_info.get("spdx_id", "") if license_info else ""
                repo["created_at"] = data.get("created_at", "")
                repo["updated_at"] = data.get("updated_at", "")
            else:
                repo["issues"] = 0
                repo["license"] = ""
                repo["created_at"] = ""
                repo["updated_at"] = ""
                print(f"    API returned {response.status_code} for {repo['name']}")
        except requests.RequestException as e:
            repo["issues"] = 0
            repo["license"] = ""
            repo["created_at"] = ""
            repo["updated_at"] = ""
            print(f"    Error: {e}")

        enriched.append(repo)
        time.sleep(1)

    return enriched


def main():
    # --- CHANGE C: Parse command-line arguments for language and date range ---
    parser = argparse.ArgumentParser(description="Scrape GitHub Trending repos")
    parser.add_argument("--language", type=str, default="",
        help="Filter by language (e.g., python, javascript)")
    parser.add_argument("--date-range", type=str, default="daily",
        choices=["daily", "weekly", "monthly"],
        help="Trending time range")
    args = parser.parse_args()

    # --- CHANGE D: Build the trending URL dynamically from the flags ---
    url = TRENDING_URL
    if args.language:
        url += f"/{args.language}"
    url += f"?since={args.date_range}"

    print("Fetching GitHub Trending page...")
    html = fetch_trending_page(url)  # --- CHANGE B continued: Pass url instead of no arguments ---

    print("Parsing trending repositories...")
    repos = parse_trending_repos(html)
    print(f"Found {len(repos)} trending repositories.\n")

    print("Enriching with GitHub API data...")
    repos = enrich_with_api(repos)

    # --- CHANGE E: Dynamic filename so different scrapes don't overwrite each other ---
    lang_part = f"_{args.language}" if args.language else ""
    filename = f"raw_data{lang_part}_{args.date_range}.json"

    with open(filename, "w", encoding="utf-8") as f:
        json.dump(repos, f, indent=2, ensure_ascii=False)

    print(f"\nRaw data saved to {filename}")


if __name__ == "__main__":
    main()